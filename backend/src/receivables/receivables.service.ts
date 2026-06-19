import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfirmationStatus, FinancialStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity, type ActorContext } from '../audit/audit.types';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateReceivableDto } from './dto/create-receivable.dto';
import { UpdateReceivableDto } from './dto/update-receivable.dto';
import { QueryReceivablesDto } from './dto/query-receivables.dto';
import {
  computeDaysOverdue,
  computeDaysToDue,
  computeDueStatus,
  dateToIso,
  type DueStatus,
} from './receivable.helpers';
import { openBalanceOf } from '../receipts/balance.helpers';
import { assertExportLimit, MAX_EXPORT_ROWS } from '../reports/export.constants';

const receivableInclude = {
  supplier: { select: { id: true, tradeName: true, isActive: true } },
  actionType: { select: { id: true, name: true, isActive: true } },
  buyer: { select: { id: true, userNumber: true, name: true } },
  canceler: { select: { id: true, userNumber: true, name: true } },
  // Apenas recebimentos confirmados entram no saldo (Fase 6).
  receipts: {
    where: { confirmationStatus: ConfirmationStatus.CONFIRMADO },
    select: { amount: true },
  },
} satisfies Prisma.ReceivableInclude;

type ReceivableWithRelations = Prisma.ReceivableGetPayload<{ include: typeof receivableInclude }>;

const OPEN_STATUSES: FinancialStatus[] = [FinancialStatus.ABERTO, FinancialStatus.PARCIAL];

/** Data UTC-meia-noite correspondente ao dia de calendário local de hoje. */
function startOfToday(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}
function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}
function parseDateOnly(value: string): Date {
  // Aceita 'YYYY-MM-DD' (ou ISO) e fixa em meia-noite UTC para comparar com @db.Date.
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function auditSnapshot(r: ReceivableWithRelations) {
  return {
    negotiationDate: dateToIso(r.negotiationDate),
    competenceMonth: r.competenceMonth,
    expectedReceiptDate: dateToIso(r.expectedReceiptDate),
    supplierId: r.supplierId,
    actionTypeId: r.actionTypeId,
    buyerId: r.buyerId,
    amount: r.amount.toFixed(2),
    notes: r.notes,
    financialStatus: r.financialStatus,
  };
}

@Injectable()
export class ReceivablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------- serialização ----------
  private serialize(r: ReceivableWithRelations) {
    const dueStatus: DueStatus = computeDueStatus(r.expectedReceiptDate, r.financialStatus);
    const totalReceived = r.receipts.reduce(
      (acc, x) => acc.plus(x.amount),
      new Prisma.Decimal(0),
    );
    const openBalance =
      r.financialStatus === FinancialStatus.CANCELADO
        ? new Prisma.Decimal(0)
        : openBalanceOf(r.amount, totalReceived);
    return {
      id: r.id,
      negotiationDate: dateToIso(r.negotiationDate),
      competenceMonth: r.competenceMonth,
      expectedReceiptDate: dateToIso(r.expectedReceiptDate),
      supplier: { id: r.supplier.id, tradeName: r.supplier.tradeName },
      actionType: { id: r.actionType.id, name: r.actionType.name },
      buyer: { id: r.buyer.id, userNumber: r.buyer.userNumber, name: r.buyer.name },
      amount: r.amount.toFixed(2),
      totalReceived: totalReceived.toFixed(2),
      openBalance: openBalance.toFixed(2),
      financialStatus: r.financialStatus,
      dueStatus,
      daysOverdue: computeDaysOverdue(r.expectedReceiptDate, dueStatus),
      daysToDue: computeDaysToDue(r.expectedReceiptDate, dueStatus),
      notes: r.notes,
      canceledAt: r.canceledAt ? r.canceledAt.toISOString() : null,
      cancelReason: r.cancelReason,
      canceledBy: r.canceler
        ? { id: r.canceler.id, userNumber: r.canceler.userNumber, name: r.canceler.name }
        : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  // ---------- montagem de filtros ----------
  private baseWhere(query: QueryReceivablesDto, user: AuthenticatedUser): Prisma.ReceivableWhereInput {
    const where: Prisma.ReceivableWhereInput = {};

    // Escopo de visibilidade: COMPRADOR só enxerga os próprios lançamentos.
    if (user.role === Role.COMPRADOR) {
      where.buyerId = user.id;
    } else if (query.buyerId) {
      where.buyerId = query.buyerId;
    }

    if (query.competenceMonth) where.competenceMonth = query.competenceMonth;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.actionTypeId) where.actionTypeId = query.actionTypeId;

    if (query.negotiationFrom || query.negotiationTo) {
      where.negotiationDate = {};
      if (query.negotiationFrom) where.negotiationDate.gte = parseDateOnly(query.negotiationFrom);
      if (query.negotiationTo) where.negotiationDate.lte = parseDateOnly(query.negotiationTo);
    }
    if (query.expectedFrom || query.expectedTo) {
      where.expectedReceiptDate = {};
      if (query.expectedFrom) where.expectedReceiptDate.gte = parseDateOnly(query.expectedFrom);
      if (query.expectedTo) where.expectedReceiptDate.lte = parseDateOnly(query.expectedTo);
    }

    if (query.search) {
      const s = query.search;
      where.OR = [
        { supplier: { tradeName: { contains: s, mode: 'insensitive' } } },
        { actionType: { name: { contains: s, mode: 'insensitive' } } },
        { notes: { contains: s, mode: 'insensitive' } },
        { buyer: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  /** Aplica financial_status e due_status (calculado) ao where da listagem. */
  private listWhere(query: QueryReceivablesDto, user: AuthenticatedUser): Prisma.ReceivableWhereInput {
    const where = this.baseWhere(query, user);
    const and: Prisma.ReceivableWhereInput[] = [];

    if (query.financialStatus) and.push({ financialStatus: query.financialStatus });

    if (query.dueStatus) {
      const today = startOfToday();
      const tomorrow = addDays(today, 1);
      if (query.dueStatus === 'SEM_VENCIMENTO') {
        and.push({ financialStatus: { in: [FinancialStatus.CANCELADO, FinancialStatus.QUITADO] } });
      } else {
        and.push({ financialStatus: { in: OPEN_STATUSES } });
        if (query.dueStatus === 'VENCIDO') and.push({ expectedReceiptDate: { lt: today } });
        else if (query.dueStatus === 'VENCE_HOJE')
          and.push({ expectedReceiptDate: { gte: today, lt: tomorrow } });
        else if (query.dueStatus === 'EM_DIA') and.push({ expectedReceiptDate: { gte: tomorrow } });
      }
    }

    if (and.length > 0) where.AND = and;
    return where;
  }

  // ---------- consultas ----------
  async list(query: QueryReceivablesDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.listWhere(query, user);

    const orderBy: Prisma.ReceivableOrderByWithRelationInput = {
      [query.sortBy ?? 'createdAt']: query.sortDir ?? 'desc',
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.receivable.count({ where }),
      this.prisma.receivable.findMany({
        where,
        include: receivableInclude,
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

  /** Exportação: mesmos filtros da listagem, sem paginação. */
  async exportAll(query: QueryReceivablesDto, user: AuthenticatedUser) {
    const where = this.listWhere(query, user);
    const total = await this.prisma.receivable.count({ where });
    assertExportLimit(total, 'lançamentos');
    const exportInclude = {
      ...receivableInclude,
      supplier: { select: { id: true, tradeName: true, isActive: true, supplierType: true } },
    };
    const rows = await this.prisma.receivable.findMany({
      where,
      include: exportInclude,
      orderBy: { [query.sortBy ?? 'createdAt']: query.sortDir ?? 'desc' },
    });
    return rows.map((r) => ({
      ...this.serialize(r as ReceivableWithRelations),
      supplierType: r.supplier.supplierType,
    }));
  }

  async summary(query: QueryReceivablesDto, user: AuthenticatedUser) {
    // KPIs ignoram filtros de status (têm semântica própria), mas respeitam
    // o escopo do usuário e os demais filtros aplicados.
    const base = this.baseWhere(query, user);
    const today = startOfToday();
    const in30 = addDays(today, 30);

    const pending: Prisma.ReceivableWhereInput = { AND: [base, { financialStatus: { in: OPEN_STATUSES } }] };
    const overdue: Prisma.ReceivableWhereInput = {
      AND: [base, { financialStatus: { in: OPEN_STATUSES } }, { expectedReceiptDate: { lt: today } }],
    };
    const next30: Prisma.ReceivableWhereInput = {
      AND: [
        base,
        { financialStatus: { in: OPEN_STATUSES } },
        { expectedReceiptDate: { gte: today, lte: in30 } },
      ],
    };

    // Saldo em aberto = soma dos valores - soma dos recebimentos confirmados.
    const openBalanceSum = async (recvWhere: Prisma.ReceivableWhereInput): Promise<string> => {
      const [amt, rec] = await Promise.all([
        this.prisma.receivable.aggregate({ where: recvWhere, _sum: { amount: true } }),
        this.prisma.receivableReceipt.aggregate({
          where: { confirmationStatus: ConfirmationStatus.CONFIRMADO, receivable: recvWhere },
          _sum: { amount: true },
        }),
      ]);
      const open = (amt._sum.amount ?? new Prisma.Decimal(0)).minus(
        rec._sum.amount ?? new Prisma.Decimal(0),
      );
      return (open.isNegative() ? new Prisma.Decimal(0) : open).toFixed(2);
    };

    const [totalOpen, totalOverdue, next30Days, pendingCount, overdueCount] = await Promise.all([
      openBalanceSum(pending),
      openBalanceSum(overdue),
      openBalanceSum(next30),
      this.prisma.receivable.count({ where: pending }),
      this.prisma.receivable.count({ where: overdue }),
    ]);

    return { totalOpen, totalOverdue, next30Days, pendingCount, overdueCount };
  }

  private async getOwnedOr404(id: string, user: AuthenticatedUser): Promise<ReceivableWithRelations> {
    const r = await this.prisma.receivable.findUnique({ where: { id }, include: receivableInclude });
    if (!r) throw new NotFoundException('Lançamento não encontrado.');
    // COMPRADOR não pode acessar lançamento de outro (evita enumeração: 404).
    if (user.role === Role.COMPRADOR && r.buyerId !== user.id) {
      throw new NotFoundException('Lançamento não encontrado.');
    }
    return r;
  }

  async findById(id: string, user: AuthenticatedUser) {
    return this.serialize(await this.getOwnedOr404(id, user));
  }

  // ---------- validações de relacionamentos ----------
  private async ensureSupplierActive(id: string) {
    const s = await this.prisma.supplier.findUnique({ where: { id } });
    if (!s) throw new BadRequestException('Fornecedor não encontrado.');
    if (!s.isActive) throw new BadRequestException('O fornecedor selecionado está inativo.');
  }
  private async ensureActionTypeActive(id: string) {
    const a = await this.prisma.actionType.findUnique({ where: { id } });
    if (!a) throw new BadRequestException('Descrição de ação não encontrada.');
    if (!a.isActive) throw new BadRequestException('A descrição de ação selecionada está inativa.');
  }
  private async ensureBuyer(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new BadRequestException('Comprador responsável não encontrado.');
    if (!u.isActive) throw new BadRequestException('O comprador responsável está inativo.');
  }

  // ---------- escrita ----------
  async create(dto: CreateReceivableDto, user: AuthenticatedUser, actor: ActorContext) {
    // COMPRADOR sempre lança para si; ADMIN pode escolher o comprador.
    const buyerId = user.role === Role.COMPRADOR ? user.id : dto.buyerId ?? user.id;

    await this.ensureSupplierActive(dto.supplierId);
    await this.ensureActionTypeActive(dto.actionTypeId);
    if (buyerId !== user.id) await this.ensureBuyer(buyerId);

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.receivable.create({
        data: {
          negotiationDate: parseDateOnly(dto.negotiationDate),
          competenceMonth: dto.competenceMonth,
          expectedReceiptDate: parseDateOnly(dto.expectedReceiptDate),
          supplierId: dto.supplierId,
          actionTypeId: dto.actionTypeId,
          buyerId,
          amount: new Prisma.Decimal(dto.amount),
          notes: dto.notes?.trim() || null,
          financialStatus: FinancialStatus.ABERTO,
          createdBy: user.id,
        },
        include: receivableInclude,
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.RECEIVABLE_CREATED,
          entityType: AuditEntity.RECEIVABLE,
          entityId: row.id,
          newValues: auditSnapshot(row),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return row;
    });

    return this.serialize(created);
  }

  async update(id: string, dto: UpdateReceivableDto, user: AuthenticatedUser, actor: ActorContext) {
    const current = await this.getOwnedOr404(id, user);

    if (current.financialStatus === FinancialStatus.CANCELADO) {
      throw new BadRequestException('Não é possível editar um lançamento cancelado.');
    }
    // Preparação para a Fase 6: lançamentos quitados não poderão ser editados.
    if (current.financialStatus === FinancialStatus.QUITADO) {
      throw new BadRequestException('Não é possível editar um lançamento quitado.');
    }

    if (dto.supplierId && dto.supplierId !== current.supplierId) {
      await this.ensureSupplierActive(dto.supplierId);
    }
    if (dto.actionTypeId && dto.actionTypeId !== current.actionTypeId) {
      await this.ensureActionTypeActive(dto.actionTypeId);
    }

    // Apenas ADMIN pode reatribuir o comprador.
    let buyerId = current.buyerId;
    if (dto.buyerId && dto.buyerId !== current.buyerId) {
      if (user.role !== Role.ADMIN) {
        throw new ForbiddenException('Apenas o administrador pode alterar o comprador.');
      }
      await this.ensureBuyer(dto.buyerId);
      buyerId = dto.buyerId;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.receivable.update({
        where: { id },
        data: {
          negotiationDate: dto.negotiationDate
            ? parseDateOnly(dto.negotiationDate)
            : current.negotiationDate,
          competenceMonth: dto.competenceMonth ?? current.competenceMonth,
          expectedReceiptDate: dto.expectedReceiptDate
            ? parseDateOnly(dto.expectedReceiptDate)
            : current.expectedReceiptDate,
          supplierId: dto.supplierId ?? current.supplierId,
          actionTypeId: dto.actionTypeId ?? current.actionTypeId,
          buyerId,
          amount: dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : current.amount,
          notes: dto.notes !== undefined ? dto.notes?.trim() || null : current.notes,
          updatedBy: user.id,
        },
        include: receivableInclude,
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.RECEIVABLE_UPDATED,
          entityType: AuditEntity.RECEIVABLE,
          entityId: id,
          oldValues: auditSnapshot(current),
          newValues: auditSnapshot(row),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return row;
    });

    return this.serialize(updated);
  }

  async cancel(id: string, reason: string, user: AuthenticatedUser, actor: ActorContext) {
    const current = await this.getOwnedOr404(id, user);
    if (current.financialStatus === FinancialStatus.CANCELADO) {
      throw new BadRequestException('Lançamento já está cancelado.');
    }

    const canceled = await this.prisma.$transaction(async (tx) => {
      const row = await tx.receivable.update({
        where: { id },
        data: {
          financialStatus: FinancialStatus.CANCELADO,
          canceledAt: new Date(),
          canceledBy: user.id,
          cancelReason: reason,
        },
        include: receivableInclude,
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.RECEIVABLE_CANCELED,
          entityType: AuditEntity.RECEIVABLE,
          entityId: id,
          oldValues: { financialStatus: current.financialStatus },
          newValues: { financialStatus: row.financialStatus },
          reason,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return row;
    });

    return this.serialize(canceled);
  }
}
