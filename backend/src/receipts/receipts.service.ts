import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConfirmationStatus,
  DestinationType,
  FinancialStatus,
  Prisma,
  ReceiptType,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity, type ActorContext } from '../audit/audit.types';
import type { AuthenticatedUser } from '../auth/auth.types';
import { dateToIso } from '../receivables/receivable.helpers';
import { determineFinancialStatus, openBalanceOf } from './balance.helpers';
import {
  createCurrentAccountEntryFromReceipt,
  ensureNoDoubleIntegration,
  reverseCurrentAccountMovementFromReceipt,
  validateCurrentAccountForReceipt,
} from './receipt-current-account.integration';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { QueryReceiptsDto } from './dto/query-receipts.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { assertExportLimit } from '../reports/export.constants';

const receiptInclude = {
  receiptMethod: { select: { id: true, name: true, isCurrentAccountCredit: true } },
  confirmer: { select: { id: true, userNumber: true, name: true } },
  reverser: { select: { id: true, userNumber: true, name: true } },
  currentAccount: {
    select: { id: true, name: true, supplier: { select: { id: true, tradeName: true } } },
  },
  receivable: {
    select: {
      id: true,
      competenceMonth: true,
      expectedReceiptDate: true,
      financialStatus: true,
      amount: true,
      notes: true,
      buyerId: true,
      supplier: { select: { id: true, tradeName: true } },
      actionType: { select: { id: true, name: true } },
      buyer: { select: { id: true, userNumber: true, name: true } },
      receipts: {
        where: { confirmationStatus: ConfirmationStatus.CONFIRMADO },
        select: { amount: true },
      },
    },
  },
} satisfies Prisma.ReceivableReceiptInclude;

type ReceiptWithRelations = Prisma.ReceivableReceiptGetPayload<{ include: typeof receiptInclude }>;

const INTEGRATED_EDIT_MSG =
  'Recebimento confirmado e vinculado à conta corrente deve ser estornado e relançado para alteração de valor ou conta.';

function parseDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}
function startOfTodayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}
function money(v: Prisma.Decimal): string {
  return `R$ ${v.toFixed(2)}`;
}

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  private get autoConfirm(): boolean {
    return this.config.get<string>('RECEIPTS_AUTO_CONFIRM') === 'true';
  }

  // ---------- serialização ----------
  private serialize(r: ReceiptWithRelations) {
    const recv = r.receivable;
    const totalReceived = recv.receipts.reduce(
      (acc, x) => acc.plus(x.amount),
      new Prisma.Decimal(0),
    );
    const openBalance =
      recv.financialStatus === FinancialStatus.CANCELADO
        ? new Prisma.Decimal(0)
        : openBalanceOf(recv.amount, totalReceived);

    return {
      id: r.id,
      receiptDate: dateToIso(r.receiptDate),
      amount: r.amount.toFixed(2),
      receiptType: r.receiptType,
      destinationType: r.destinationType,
      confirmationStatus: r.confirmationStatus,
      confirmedAt: r.confirmedAt ? r.confirmedAt.toISOString() : null,
      confirmedBy: r.confirmer
        ? { id: r.confirmer.id, userNumber: r.confirmer.userNumber, name: r.confirmer.name }
        : null,
      notes: r.notes,
      isReversed: r.isReversed,
      reversedAt: r.reversedAt ? r.reversedAt.toISOString() : null,
      reverseReason: r.reverseReason,
      reversedBy: r.reverser
        ? { id: r.reverser.id, userNumber: r.reverser.userNumber, name: r.reverser.name }
        : null,
      reversalOfReceiptId: r.reversalOfReceiptId,
      currentAccountId: r.currentAccountId,
      currentAccountMovementId: r.currentAccountMovementId,
      currentAccount: r.currentAccount
        ? {
            id: r.currentAccount.id,
            name: r.currentAccount.name,
            supplier: {
              id: r.currentAccount.supplier.id,
              tradeName: r.currentAccount.supplier.tradeName,
            },
          }
        : null,
      receiptMethod: {
        id: r.receiptMethod.id,
        name: r.receiptMethod.name,
        isCurrentAccountCredit: r.receiptMethod.isCurrentAccountCredit,
      },
      receivable: {
        id: recv.id,
        competenceMonth: recv.competenceMonth,
        expectedReceiptDate: dateToIso(recv.expectedReceiptDate),
        financialStatus: recv.financialStatus,
        amount: recv.amount.toFixed(2),
        totalReceived: totalReceived.toFixed(2),
        openBalance: openBalance.toFixed(2),
        supplier: { id: recv.supplier.id, tradeName: recv.supplier.tradeName },
        actionType: { id: recv.actionType.id, name: recv.actionType.name },
        buyer: { id: recv.buyer.id, userNumber: recv.buyer.userNumber, name: recv.buyer.name },
        notes: recv.notes,
      },
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private auditSnapshot(r: ReceiptWithRelations) {
    return {
      receivableId: r.receivableId,
      receiptDate: dateToIso(r.receiptDate),
      receiptMethodId: r.receiptMethodId,
      amount: r.amount.toFixed(2),
      receiptType: r.receiptType,
      destinationType: r.destinationType,
      confirmationStatus: r.confirmationStatus,
      currentAccountId: r.currentAccountId,
      currentAccountMovementId: r.currentAccountMovementId,
      notes: r.notes,
      isReversed: r.isReversed,
    };
  }

  // ---------- filtros ----------
  /** Escopo de visibilidade do lançamento aplicado ao recebimento. */
  private receivableScope(query: QueryReceiptsDto, user: AuthenticatedUser): Prisma.ReceivableWhereInput {
    const recv: Prisma.ReceivableWhereInput = {};
    if (user.role === Role.COMPRADOR) recv.buyerId = user.id;
    else if (query.buyerId) recv.buyerId = query.buyerId;
    if (query.supplierId) recv.supplierId = query.supplierId;
    if (query.actionTypeId) recv.actionTypeId = query.actionTypeId;
    if (query.competenceMonth) recv.competenceMonth = query.competenceMonth;
    if (query.receivableStatus) recv.financialStatus = query.receivableStatus;
    return recv;
  }

  private listWhere(query: QueryReceiptsDto, user: AuthenticatedUser): Prisma.ReceivableReceiptWhereInput {
    // Registros espelho de estorno (reversalOfReceiptId != null) não aparecem na
    // listagem: o recebimento original já reflete o status ESTORNADO.
    const where: Prisma.ReceivableReceiptWhereInput = { reversalOfReceiptId: null };

    where.receivable = this.receivableScope(query, user);

    if (query.receiptMethodId) where.receiptMethodId = query.receiptMethodId;
    if (query.receiptType) where.receiptType = query.receiptType;
    if (query.confirmationStatus) where.confirmationStatus = query.confirmationStatus;

    if (query.receiptFrom || query.receiptTo) {
      where.receiptDate = {};
      if (query.receiptFrom) where.receiptDate.gte = parseDateOnly(query.receiptFrom);
      if (query.receiptTo) where.receiptDate.lte = parseDateOnly(query.receiptTo);
    }

    if (query.search) {
      const s = query.search;
      where.OR = [
        { notes: { contains: s, mode: 'insensitive' } },
        { receivable: { notes: { contains: s, mode: 'insensitive' } } },
        { receivable: { supplier: { tradeName: { contains: s, mode: 'insensitive' } } } },
        { receivable: { actionType: { name: { contains: s, mode: 'insensitive' } } } },
        { receivable: { buyer: { name: { contains: s, mode: 'insensitive' } } } },
      ];
    }

    return where;
  }

  // ---------- consultas ----------
  async list(query: QueryReceiptsDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.listWhere(query, user);

    const orderBy: Prisma.ReceivableReceiptOrderByWithRelationInput = {
      [query.sortBy ?? 'receiptDate']: query.sortDir ?? 'desc',
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.receivableReceipt.count({ where }),
      this.prisma.receivableReceipt.findMany({
        where,
        include: receiptInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map((r) => this.serialize(r)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async exportAll(query: QueryReceiptsDto, user: AuthenticatedUser) {
    const where = this.listWhere(query, user);
    const total = await this.prisma.receivableReceipt.count({ where });
    assertExportLimit(total, 'recebimentos');
    const rows = await this.prisma.receivableReceipt.findMany({
      where,
      include: receiptInclude,
      orderBy: { [query.sortBy ?? 'receiptDate']: query.sortDir ?? 'desc' },
    });
    return rows.map((r) => this.serialize(r));
  }

  async summary(query: QueryReceiptsDto, user: AuthenticatedUser) {
    const scope = this.receivableScope(query, user);
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const nextMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
    const yearStart = new Date(Date.UTC(now.getFullYear(), 0, 1));
    const nextYear = new Date(Date.UTC(now.getFullYear() + 1, 0, 1));

    const confirmedBase: Prisma.ReceivableReceiptWhereInput = {
      confirmationStatus: ConfirmationStatus.CONFIRMADO,
      receivable: scope,
    };

    // Valor parcial em aberto: lançamentos PARCIAL → soma(valor) - soma(confirmados).
    const partialScope: Prisma.ReceivableWhereInput = {
      AND: [scope, { financialStatus: FinancialStatus.PARCIAL }],
    };

    const [monthAgg, yearAgg, count, pending, partialAmt, partialRec] = await Promise.all([
      this.prisma.receivableReceipt.aggregate({
        where: { ...confirmedBase, receiptDate: { gte: monthStart, lt: nextMonth } },
        _sum: { amount: true },
      }),
      this.prisma.receivableReceipt.aggregate({
        where: { ...confirmedBase, receiptDate: { gte: yearStart, lt: nextYear } },
        _sum: { amount: true },
      }),
      this.prisma.receivableReceipt.count({
        where: { reversalOfReceiptId: null, receivable: scope },
      }),
      this.prisma.receivableReceipt.count({
        where: {
          reversalOfReceiptId: null,
          confirmationStatus: ConfirmationStatus.PENDENTE_CONFIRMACAO,
          receivable: scope,
        },
      }),
      this.prisma.receivable.aggregate({ where: partialScope, _sum: { amount: true } }),
      this.prisma.receivableReceipt.aggregate({
        where: { confirmationStatus: ConfirmationStatus.CONFIRMADO, receivable: partialScope },
        _sum: { amount: true },
      }),
    ]);

    const partialOpen = (partialAmt._sum.amount ?? new Prisma.Decimal(0)).minus(
      partialRec._sum.amount ?? new Prisma.Decimal(0),
    );

    return {
      receivedMonth: (monthAgg._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      receivedYear: (yearAgg._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      receiptsCount: count,
      pendingConfirmation: pending,
      partialOpen: (partialOpen.isNegative() ? new Prisma.Decimal(0) : partialOpen).toFixed(2),
    };
  }

  private async loadForRead(id: string, user: AuthenticatedUser): Promise<ReceiptWithRelations> {
    const r = await this.prisma.receivableReceipt.findUnique({ where: { id }, include: receiptInclude });
    if (!r) throw new NotFoundException('Recebimento não encontrado.');
    if (user.role === Role.COMPRADOR && r.receivable.buyerId !== user.id) {
      throw new NotFoundException('Recebimento não encontrado.');
    }
    return r;
  }

  async findById(id: string, user: AuthenticatedUser) {
    return this.serialize(await this.loadForRead(id, user));
  }

  private async reload(id: string) {
    const r = await this.prisma.receivableReceipt.findUniqueOrThrow({
      where: { id },
      include: receiptInclude,
    });
    return this.serialize(r);
  }

  /** Recalcula e persiste o financial_status do lançamento. Retorna a mudança, se houver. */
  private async recalcReceivable(
    tx: Prisma.TransactionClient,
    receivableId: string,
  ): Promise<{ old: FinancialStatus; next: FinancialStatus } | null> {
    const recv = await tx.receivable.findUnique({
      where: { id: receivableId },
      select: { amount: true, financialStatus: true },
    });
    if (!recv || recv.financialStatus === FinancialStatus.CANCELADO) return null;

    const agg = await tx.receivableReceipt.aggregate({
      where: { receivableId, confirmationStatus: ConfirmationStatus.CONFIRMADO },
      _sum: { amount: true },
    });
    const total = agg._sum.amount ?? new Prisma.Decimal(0);
    const next = determineFinancialStatus(recv.amount, total, false);

    if (next !== recv.financialStatus) {
      await tx.receivable.update({ where: { id: receivableId }, data: { financialStatus: next } });
      return { old: recv.financialStatus, next };
    }
    return null;
  }

  private async logStatusChange(
    tx: Prisma.TransactionClient,
    receivableId: string,
    change: { old: FinancialStatus; next: FinancialStatus } | null,
    actor: ActorContext,
  ) {
    if (!change) return;
    await this.audit.log(
      {
        userId: actor.userId,
        action: AuditAction.RECEIVABLE_UPDATED,
        entityType: AuditEntity.RECEIVABLE,
        entityId: receivableId,
        oldValues: { financialStatus: change.old },
        newValues: { financialStatus: change.next },
        reason: 'Status recalculado por recebimento.',
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      },
      tx,
    );
  }

  // ---------- criação ----------
  /** Define destino a partir da forma de recebimento e do DTO. */
  private resolveDestination(
    method: { isCurrentAccountCredit: boolean },
    dto: CreateReceiptDto,
  ): { destinationType: DestinationType; currentAccountId: string | null } {
    const destinationType = method.isCurrentAccountCredit
      ? DestinationType.CREDITO_CONTA_CORRENTE
      : DestinationType.BAIXA_SIMPLES;

    if (destinationType === DestinationType.BAIXA_SIMPLES) {
      if (dto.currentAccountId) {
        throw new BadRequestException('Conta corrente não se aplica a baixa simples.');
      }
      return { destinationType, currentAccountId: null };
    }

    if (!dto.currentAccountId) {
      throw new BadRequestException('Selecione a conta corrente para crédito em conta corrente.');
    }
    return { destinationType, currentAccountId: dto.currentAccountId };
  }

  async create(dto: CreateReceiptDto, user: AuthenticatedUser, actor: ActorContext) {
    const recv = await this.prisma.receivable.findUnique({
      where: { id: dto.receivableId },
      select: {
        id: true,
        buyerId: true,
        supplierId: true,
        amount: true,
        financialStatus: true,
        receipts: {
          where: { confirmationStatus: ConfirmationStatus.CONFIRMADO },
          select: { amount: true },
        },
      },
    });
    if (!recv) throw new NotFoundException('Lançamento não encontrado.');
    if (user.role === Role.COMPRADOR && recv.buyerId !== user.id) {
      throw new NotFoundException('Lançamento não encontrado.');
    }
    if (recv.financialStatus === FinancialStatus.CANCELADO) {
      throw new BadRequestException('Não é possível receber um lançamento cancelado.');
    }
    if (recv.financialStatus === FinancialStatus.QUITADO) {
      throw new BadRequestException('Este lançamento já está quitado.');
    }

    const method = await this.prisma.receiptMethod.findUnique({ where: { id: dto.receiptMethodId } });
    if (!method) throw new BadRequestException('Forma de recebimento não encontrada.');
    if (!method.isActive) throw new BadRequestException('A forma de recebimento está inativa.');

    const { destinationType, currentAccountId } = this.resolveDestination(method, dto);

    if (destinationType === DestinationType.CREDITO_CONTA_CORRENTE && currentAccountId) {
      await validateCurrentAccountForReceipt(this.prisma, currentAccountId, recv.supplierId, user);
    }

    const confirmedSum = recv.receipts.reduce((a, x) => a.plus(x.amount), new Prisma.Decimal(0));
    const openBalance = openBalanceOf(recv.amount, confirmedSum);
    const amount = new Prisma.Decimal(dto.amount);

    if (amount.greaterThan(openBalance)) {
      throw new BadRequestException(
        `O valor não pode ser maior que o saldo em aberto (${money(openBalance)}).`,
      );
    }
    if (dto.receiptType === ReceiptType.INTEGRAL && !amount.equals(openBalance)) {
      throw new BadRequestException(
        `Recebimento integral deve ser igual ao saldo em aberto (${money(openBalance)}).`,
      );
    }

    const willConfirm = this.autoConfirm;
    const now = new Date();
    const receiptDate = parseDateOnly(dto.receiptDate);

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.receivableReceipt.create({
        data: {
          receivableId: recv.id,
          receiptDate,
          receiptMethodId: method.id,
          amount,
          receiptType: dto.receiptType,
          destinationType,
          currentAccountId,
          confirmationStatus: willConfirm
            ? ConfirmationStatus.CONFIRMADO
            : ConfirmationStatus.PENDENTE_CONFIRMACAO,
          confirmedAt: willConfirm ? now : null,
          confirmedBy: willConfirm ? user.id : null,
          notes: dto.notes?.trim() || null,
          createdBy: user.id,
        },
        include: receiptInclude,
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.RECEIPT_CREATED,
          entityType: AuditEntity.RECEIPT,
          entityId: row.id,
          newValues: this.auditSnapshot(row),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );

      if (willConfirm) {
        if (destinationType === DestinationType.CREDITO_CONTA_CORRENTE && currentAccountId) {
          await createCurrentAccountEntryFromReceipt(
            tx,
            this.audit,
            {
              receiptId: row.id,
              receivableId: recv.id,
              currentAccountId,
              amount,
              receiptDate,
              receiptMethodId: method.id,
              notes: row.notes,
              createdBy: user.id,
            },
            actor,
          );
        }
        const change = await this.recalcReceivable(tx, recv.id);
        await this.logStatusChange(tx, recv.id, change, actor);
      }

      return row;
    });

    await this.notifications.onReceiptCreated(
      {
        id: created.id,
        amount: created.amount,
        confirmationStatus: created.confirmationStatus,
        receivable: {
          buyerId: created.receivable.buyerId,
          supplier: { tradeName: created.receivable.supplier.tradeName },
        },
      },
      user.id,
    );

    return this.reload(created.id);
  }

  // ---------- confirmação (ADMIN) ----------
  async confirm(id: string, user: AuthenticatedUser, actor: ActorContext) {
    const r = await this.prisma.receivableReceipt.findUnique({ where: { id }, include: receiptInclude });
    if (!r) throw new NotFoundException('Recebimento não encontrado.');

    if (r.confirmationStatus === ConfirmationStatus.CONFIRMADO) {
      throw new BadRequestException('Recebimento já confirmado.');
    }
    if (r.isReversed || r.confirmationStatus === ConfirmationStatus.ESTORNADO) {
      throw new BadRequestException('Não é possível confirmar um recebimento estornado.');
    }
    if (r.confirmationStatus === ConfirmationStatus.CANCELADO) {
      throw new BadRequestException('Não é possível confirmar um recebimento cancelado.');
    }
    if (r.reversalOfReceiptId) {
      throw new BadRequestException('Registro de estorno não pode ser confirmado.');
    }
    if (r.receivable.financialStatus === FinancialStatus.CANCELADO) {
      throw new BadRequestException('O lançamento está cancelado.');
    }

    const confirmedAgg = await this.prisma.receivableReceipt.aggregate({
      where: { receivableId: r.receivableId, confirmationStatus: ConfirmationStatus.CONFIRMADO },
      _sum: { amount: true },
    });
    const confirmedSum = confirmedAgg._sum.amount ?? new Prisma.Decimal(0);
    if (confirmedSum.plus(r.amount).greaterThan(r.receivable.amount)) {
      const open = openBalanceOf(r.receivable.amount, confirmedSum);
      throw new BadRequestException(
        `Confirmar excederia o saldo em aberto do lançamento (${money(open)}).`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const row = await tx.receivableReceipt.update({
        where: { id },
        data: {
          confirmationStatus: ConfirmationStatus.CONFIRMADO,
          confirmedAt: new Date(),
          confirmedBy: user.id,
        },
        include: receiptInclude,
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.RECEIPT_CONFIRMED,
          entityType: AuditEntity.RECEIPT,
          entityId: id,
          oldValues: { confirmationStatus: r.confirmationStatus },
          newValues: { confirmationStatus: row.confirmationStatus },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );

      if (r.destinationType === DestinationType.CREDITO_CONTA_CORRENTE) {
        if (!r.currentAccountId) {
          throw new BadRequestException('Recebimento sem conta corrente vinculada.');
        }
        ensureNoDoubleIntegration(r);
        const acc = await validateCurrentAccountForReceipt(
          this.prisma,
          r.currentAccountId,
          r.receivable.supplier.id,
          user,
        );
        if (!acc.isActive) {
          throw new BadRequestException('A conta corrente está inativa.');
        }
        await createCurrentAccountEntryFromReceipt(
          tx,
          this.audit,
          {
            receiptId: id,
            receivableId: r.receivableId,
            currentAccountId: r.currentAccountId,
            amount: r.amount,
            receiptDate: r.receiptDate,
            receiptMethodId: r.receiptMethodId,
            notes: r.notes,
            createdBy: user.id,
          },
          actor,
        );
      }

      const change = await this.recalcReceivable(tx, r.receivableId);
      await this.logStatusChange(tx, r.receivableId, change, actor);
    });

    const confirmed = await this.prisma.receivableReceipt.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        amount: true,
        receivable: { select: { buyerId: true, supplier: { select: { tradeName: true } } } },
      },
    });
    await this.notifications.onReceiptConfirmed(confirmed, user.id);

    return this.reload(id);
  }

  // ---------- edição ----------
  async update(id: string, dto: UpdateReceiptDto, user: AuthenticatedUser, actor: ActorContext) {
    const current = await this.loadForRead(id, user);

    if (current.isReversed || current.confirmationStatus === ConfirmationStatus.ESTORNADO) {
      throw new BadRequestException('Não é possível editar um recebimento estornado.');
    }
    if (current.confirmationStatus === ConfirmationStatus.CANCELADO) {
      throw new BadRequestException('Não é possível editar um recebimento cancelado.');
    }
    if (current.reversalOfReceiptId) {
      throw new BadRequestException('Não é possível editar um registro de estorno.');
    }
    if (current.receivable.financialStatus === FinancialStatus.CANCELADO) {
      throw new BadRequestException('O lançamento está cancelado.');
    }

    const isCredit = current.destinationType === DestinationType.CREDITO_CONTA_CORRENTE;
    const isConfirmedIntegrated =
      isCredit &&
      current.confirmationStatus === ConfirmationStatus.CONFIRMADO &&
      !!current.currentAccountMovementId;

    if (isConfirmedIntegrated) {
      const changingSensitive =
        dto.receiptDate !== undefined ||
        dto.receiptMethodId !== undefined ||
        dto.amount !== undefined ||
        dto.receiptType !== undefined ||
        dto.currentAccountId !== undefined;
      if (changingSensitive) {
        throw new BadRequestException(INTEGRATED_EDIT_MSG);
      }
    }

    let methodId = current.receiptMethodId;
    let destinationType = current.destinationType;
    let currentAccountId = current.currentAccountId;

    if (dto.receiptMethodId && dto.receiptMethodId !== current.receiptMethodId) {
      if (isConfirmedIntegrated) throw new BadRequestException(INTEGRATED_EDIT_MSG);
      const method = await this.prisma.receiptMethod.findUnique({ where: { id: dto.receiptMethodId } });
      if (!method) throw new BadRequestException('Forma de recebimento não encontrada.');
      if (!method.isActive) throw new BadRequestException('A forma de recebimento está inativa.');
      methodId = method.id;
      destinationType = method.isCurrentAccountCredit
        ? DestinationType.CREDITO_CONTA_CORRENTE
        : DestinationType.BAIXA_SIMPLES;
      if (destinationType === DestinationType.BAIXA_SIMPLES) {
        currentAccountId = null;
      } else if (!dto.currentAccountId && !current.currentAccountId) {
        throw new BadRequestException('Selecione a conta corrente para crédito em conta corrente.');
      }
    }

    if (dto.currentAccountId !== undefined) {
      if (isConfirmedIntegrated) throw new BadRequestException(INTEGRATED_EDIT_MSG);
      if (destinationType === DestinationType.BAIXA_SIMPLES && dto.currentAccountId) {
        throw new BadRequestException('Conta corrente não se aplica a baixa simples.');
      }
      if (destinationType === DestinationType.CREDITO_CONTA_CORRENTE) {
        if (!dto.currentAccountId) {
          throw new BadRequestException('Selecione a conta corrente para crédito em conta corrente.');
        }
        await validateCurrentAccountForReceipt(
          this.prisma,
          dto.currentAccountId,
          current.receivable.supplier.id,
          user,
        );
        currentAccountId = dto.currentAccountId;
      }
    }

    if (destinationType === DestinationType.CREDITO_CONTA_CORRENTE && !currentAccountId) {
      throw new BadRequestException('Selecione a conta corrente para crédito em conta corrente.');
    }

    const otherConfirmed = await this.prisma.receivableReceipt.aggregate({
      where: {
        receivableId: current.receivableId,
        confirmationStatus: ConfirmationStatus.CONFIRMADO,
        id: { not: id },
      },
      _sum: { amount: true },
    });
    const available = openBalanceOf(
      new Prisma.Decimal(current.receivable.amount),
      otherConfirmed._sum.amount ?? new Prisma.Decimal(0),
    );

    const newAmount =
      dto.amount !== undefined && !isConfirmedIntegrated
        ? new Prisma.Decimal(dto.amount)
        : new Prisma.Decimal(current.amount);
    const newType =
      dto.receiptType !== undefined && !isConfirmedIntegrated
        ? dto.receiptType
        : current.receiptType;

    if (!isConfirmedIntegrated) {
      if (newAmount.greaterThan(available)) {
        throw new BadRequestException(
          `O valor não pode ultrapassar o saldo disponível do lançamento (${money(available)}).`,
        );
      }
      if (newType === ReceiptType.INTEGRAL && !newAmount.equals(available)) {
        throw new BadRequestException(
          `Recebimento integral deve ser igual ao saldo disponível (${money(available)}).`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const row = await tx.receivableReceipt.update({
        where: { id },
        data: {
          receiptDate:
            dto.receiptDate && !isConfirmedIntegrated
              ? parseDateOnly(dto.receiptDate)
              : current.receiptDate,
          receiptMethodId: isConfirmedIntegrated ? current.receiptMethodId : methodId,
          amount: isConfirmedIntegrated ? current.amount : newAmount,
          receiptType: isConfirmedIntegrated ? current.receiptType : newType,
          destinationType: isConfirmedIntegrated ? current.destinationType : destinationType,
          currentAccountId: isConfirmedIntegrated ? current.currentAccountId : currentAccountId,
          notes: dto.notes !== undefined ? dto.notes?.trim() || null : current.notes,
          updatedBy: user.id,
        },
        include: receiptInclude,
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.RECEIPT_UPDATED,
          entityType: AuditEntity.RECEIPT,
          entityId: id,
          oldValues: this.auditSnapshot(current),
          newValues: this.auditSnapshot(row),
          reason: dto.reason,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      if (current.confirmationStatus === ConfirmationStatus.CONFIRMADO && !isConfirmedIntegrated) {
        const change = await this.recalcReceivable(tx, current.receivableId);
        await this.logStatusChange(tx, current.receivableId, change, actor);
      }
    });

    return this.reload(id);
  }

  // ---------- estorno (ADMIN) ----------
  async reverse(id: string, reason: string, user: AuthenticatedUser, actor: ActorContext) {
    const current = await this.prisma.receivableReceipt.findUnique({
      where: { id },
      include: receiptInclude,
    });
    if (!current) throw new NotFoundException('Recebimento não encontrado.');

    if (current.isReversed || current.confirmationStatus === ConfirmationStatus.ESTORNADO) {
      throw new BadRequestException('Recebimento já estornado.');
    }
    if (current.reversalOfReceiptId) {
      throw new BadRequestException('Não é possível estornar um registro de estorno.');
    }
    if (current.confirmationStatus === ConfirmationStatus.CANCELADO) {
      throw new BadRequestException('Não é possível estornar um recebimento cancelado.');
    }
    if (current.receivable.financialStatus === FinancialStatus.CANCELADO) {
      throw new BadRequestException('O lançamento está cancelado.');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const reversed = await tx.receivableReceipt.update({
        where: { id },
        data: {
          isReversed: true,
          reversedAt: now,
          reversedBy: user.id,
          reverseReason: reason,
          confirmationStatus: ConfirmationStatus.ESTORNADO,
        },
        include: receiptInclude,
      });
      await tx.receivableReceipt.create({
        data: {
          receivableId: current.receivableId,
          receiptDate: startOfTodayUtc(),
          receiptMethodId: current.receiptMethodId,
          amount: current.amount,
          receiptType: current.receiptType,
          destinationType: current.destinationType,
          currentAccountId: current.currentAccountId,
          confirmationStatus: ConfirmationStatus.ESTORNADO,
          isReversed: false,
          reversalOfReceiptId: current.id,
          notes: `Estorno do recebimento ${current.id}. Motivo: ${reason}`,
          createdBy: user.id,
        },
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.RECEIPT_REVERSED,
          entityType: AuditEntity.RECEIPT,
          entityId: id,
          oldValues: { confirmationStatus: current.confirmationStatus, isReversed: current.isReversed },
          newValues: { confirmationStatus: reversed.confirmationStatus, isReversed: reversed.isReversed },
          reason,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );

      // Estorno integrado: reverte movimentação da conta corrente se existir.
      if (
        current.destinationType === DestinationType.CREDITO_CONTA_CORRENTE &&
        current.currentAccountMovementId &&
        current.currentAccountId
      ) {
        await reverseCurrentAccountMovementFromReceipt(
          tx,
          this.audit,
          {
            movementId: current.currentAccountMovementId,
            currentAccountId: current.currentAccountId,
            reversedBy: user.id,
            reverseReason: reason,
          },
          actor,
        );
      }

      const change = await this.recalcReceivable(tx, current.receivableId);
      await this.logStatusChange(tx, current.receivableId, change, actor);
    });

    await this.notifications.onReceiptReversed(
      {
        id: current.id,
        amount: current.amount,
        receivable: {
          buyerId: current.receivable.buyerId,
          supplier: { tradeName: current.receivable.supplier.tradeName },
        },
      },
      user.id,
    );

    return this.reload(id);
  }
}
