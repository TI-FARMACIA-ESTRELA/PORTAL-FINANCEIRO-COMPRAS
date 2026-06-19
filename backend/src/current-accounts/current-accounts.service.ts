import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity, type ActorContext } from '../audit/audit.types';
import type { AuthenticatedUser } from '../auth/auth.types';
import { dateToIso } from '../receivables/receivable.helpers';
import {
  computeAccountTotals,
  signedValue,
  type MovementLike,
} from './balance.helpers';
import { CreateCurrentAccountDto } from './dto/create-current-account.dto';
import { UpdateCurrentAccountDto } from './dto/update-current-account.dto';
import { ShareCurrentAccountDto } from './dto/share-current-account.dto';
import {
  CreateEntryMovementDto,
  CreateExitMovementDto,
  CreateAdjustmentMovementDto,
} from './dto/create-movement.dto';
import { QueryCurrentAccountsDto } from './dto/query-current-accounts.dto';
import { QueryCurrentAccountMovementsDto } from './dto/query-movements.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { assertExportLimit } from '../reports/export.constants';

const accountInclude = {
  supplier: { select: { id: true, tradeName: true } },
  owner: { select: { id: true, userNumber: true, name: true } },
  shares: { include: { user: { select: { id: true, userNumber: true, name: true } } } },
  movements: {
    select: { id: true, type: true, amount: true, isReversed: true, reversalOfMovementId: true, createdAt: true },
  },
} satisfies Prisma.CurrentAccountInclude;

type AccountWithRelations = Prisma.CurrentAccountGetPayload<{ include: typeof accountInclude }>;

const movementInclude = {
  receiptMethod: { select: { id: true, name: true } },
  actionType: { select: { id: true, name: true } },
  creator: { select: { id: true, userNumber: true, name: true } },
  reverser: { select: { id: true, userNumber: true, name: true } },
  receivable: {
    select: {
      id: true,
      competenceMonth: true,
      supplier: { select: { id: true, tradeName: true } },
      actionType: { select: { id: true, name: true } },
    },
  },
  linkedReceipt: {
    select: {
      id: true,
      receiptDate: true,
      amount: true,
      confirmationStatus: true,
    },
  },
} satisfies Prisma.CurrentAccountMovementInclude;

type MovementWithRelations = Prisma.CurrentAccountMovementGetPayload<{ include: typeof movementInclude }>;

export interface AccessLevel {
  view: boolean;
  move: boolean;
  edit: boolean;
}

function parseDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}
function startOfTodayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

@Injectable()
export class CurrentAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------- controle de acesso ----------
  private accessLevel(account: AccountWithRelations, user: AuthenticatedUser): AccessLevel {
    if (user.role === Role.ADMIN) return { view: true, move: true, edit: true };
    if (user.role === Role.DIRETORIA) return { view: true, move: false, edit: false };
    // COMPRADOR
    if (account.ownerUserId === user.id) return { view: true, move: true, edit: true };
    const share = account.shares.find((s) => s.userId === user.id);
    if (!share) return { view: false, move: false, edit: false };
    return { view: share.canView, move: share.canMove, edit: share.canEdit };
  }

  private async loadAccount(id: string): Promise<AccountWithRelations> {
    const acc = await this.prisma.currentAccount.findUnique({ where: { id }, include: accountInclude });
    if (!acc) throw new NotFoundException('Conta corrente não encontrada.');
    return acc;
  }

  /** Carrega a conta garantindo visibilidade (404 se o usuário não pode ver). */
  private async loadForView(id: string, user: AuthenticatedUser): Promise<AccountWithRelations> {
    const acc = await this.loadAccount(id);
    if (!this.accessLevel(acc, user).view) {
      throw new NotFoundException('Conta corrente não encontrada.');
    }
    return acc;
  }

  // ---------- serialização ----------
  private serializeAccount(acc: AccountWithRelations, user: AuthenticatedUser) {
    const totals = computeAccountTotals(acc.movements);
    const lastMovementAt = acc.movements.reduce<Date | null>((latest, m) => {
      return !latest || m.createdAt > latest ? m.createdAt : latest;
    }, null);

    return {
      id: acc.id,
      name: acc.name,
      supplier: { id: acc.supplier.id, tradeName: acc.supplier.tradeName },
      owner: { id: acc.owner.id, userNumber: acc.owner.userNumber, name: acc.owner.name },
      notes: acc.notes,
      isActive: acc.isActive,
      ...totals,
      movementsCount: acc.movements.length,
      lastMovementAt: lastMovementAt ? lastMovementAt.toISOString() : null,
      shares: acc.shares.map((s) => ({
        id: s.id,
        user: { id: s.user.id, userNumber: s.user.userNumber, name: s.user.name },
        canView: s.canView,
        canMove: s.canMove,
        canEdit: s.canEdit,
      })),
      access: this.accessLevel(acc, user),
      createdAt: acc.createdAt.toISOString(),
      updatedAt: acc.updatedAt.toISOString(),
    };
  }

  private accountSnapshot(acc: AccountWithRelations) {
    return {
      name: acc.name,
      supplierId: acc.supplierId,
      ownerUserId: acc.ownerUserId,
      notes: acc.notes,
      isActive: acc.isActive,
    };
  }

  // ---------- validações ----------
  private async ensureSupplierActive(id: string) {
    const s = await this.prisma.supplier.findUnique({ where: { id } });
    if (!s) throw new BadRequestException('Fornecedor não encontrado.');
    if (!s.isActive) throw new BadRequestException('O fornecedor selecionado está inativo.');
  }
  private async ensureUserActive(id: string, label: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new BadRequestException(`${label} não encontrado.`);
    if (!u.isActive) throw new BadRequestException(`${label} está inativo.`);
  }
  private async ensureReceiptMethodActive(id: string) {
    const m = await this.prisma.receiptMethod.findUnique({ where: { id } });
    if (!m) throw new BadRequestException('Forma de recebimento não encontrada.');
    if (!m.isActive) throw new BadRequestException('A forma de recebimento está inativa.');
  }
  private async ensureActionTypeActive(id: string) {
    const a = await this.prisma.actionType.findUnique({ where: { id } });
    if (!a) throw new BadRequestException('Descrição de ação não encontrada.');
    if (!a.isActive) throw new BadRequestException('A descrição de ação está inativa.');
  }

  // ---------- listagem / filtros ----------
  private buildWhere(query: QueryCurrentAccountsDto, user: AuthenticatedUser): Prisma.CurrentAccountWhereInput {
    const and: Prisma.CurrentAccountWhereInput[] = [];

    if (user.role === Role.COMPRADOR) {
      and.push({
        OR: [
          { ownerUserId: user.id },
          { shares: { some: { userId: user.id, canView: true } } },
        ],
      });
    } else if (query.ownerUserId) {
      and.push({ ownerUserId: query.ownerUserId });
    }

    if (query.supplierId) and.push({ supplierId: query.supplierId });
    if (query.active === 'true') and.push({ isActive: true });
    if (query.active === 'false') and.push({ isActive: false });

    if (query.search) {
      const s = query.search;
      and.push({
        OR: [
          { name: { contains: s, mode: 'insensitive' } },
          { supplier: { tradeName: { contains: s, mode: 'insensitive' } } },
          { owner: { name: { contains: s, mode: 'insensitive' } } },
        ],
      });
    }

    return and.length > 0 ? { AND: and } : {};
  }

  async list(query: QueryCurrentAccountsDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const where = this.buildWhere(query, user);

    const accounts = await this.prisma.currentAccount.findMany({ where, include: accountInclude });
    let serialized = accounts.map((a) => this.serializeAccount(a, user));

    if (query.balanceStatus) {
      serialized = serialized.filter((a) => a.balanceStatus === query.balanceStatus);
    }

    const dir = query.sortDir ?? (query.sortBy === 'name' ? 'asc' : 'desc');
    const sortBy = query.sortBy ?? 'createdAt';
    serialized.sort((a, b) => {
      const cmp =
        sortBy === 'name'
          ? a.name.localeCompare(b.name, 'pt-BR')
          : a.createdAt.localeCompare(b.createdAt);
      return dir === 'asc' ? cmp : -cmp;
    });

    const total = serialized.length;
    const start = (page - 1) * pageSize;
    return {
      data: serialized.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async exportAll(query: QueryCurrentAccountsDto, user: AuthenticatedUser) {
    const where = this.buildWhere(query, user);
    const accounts = await this.prisma.currentAccount.findMany({ where, include: accountInclude });
    let serialized = accounts.map((a) => this.serializeAccount(a, user));
    if (query.balanceStatus) {
      serialized = serialized.filter((a) => a.balanceStatus === query.balanceStatus);
    }
    assertExportLimit(serialized.length, 'contas correntes');
    const dir = query.sortDir ?? (query.sortBy === 'name' ? 'asc' : 'desc');
    const sortBy = query.sortBy ?? 'createdAt';
    serialized.sort((a, b) => {
      const cmp =
        sortBy === 'name'
          ? a.name.localeCompare(b.name, 'pt-BR')
          : a.createdAt.localeCompare(b.createdAt);
      return dir === 'asc' ? cmp : -cmp;
    });
    return serialized;
  }

  async summary(query: QueryCurrentAccountsDto, user: AuthenticatedUser) {
    const where = this.buildWhere(query, user);
    const accounts = await this.prisma.currentAccount.findMany({ where, include: accountInclude });

    let totalBalance = new Prisma.Decimal(0);
    let totalEntries = new Prisma.Decimal(0);
    let totalExits = new Prisma.Decimal(0);
    let positive = 0;
    let zero = 0;
    let negative = 0;

    for (const acc of accounts) {
      const t = computeAccountTotals(acc.movements);
      totalBalance = totalBalance.plus(t.balance);
      totalEntries = totalEntries.plus(t.totalEntries);
      totalExits = totalExits.plus(t.totalExits);
      if (t.balanceStatus === 'POSITIVO') positive++;
      else if (t.balanceStatus === 'NEGATIVO') negative++;
      else zero++;
    }

    return {
      totalBalance: totalBalance.toFixed(2),
      totalEntries: totalEntries.toFixed(2),
      totalExits: totalExits.toFixed(2),
      accountsCount: accounts.length,
      positiveCount: positive,
      zeroCount: zero,
      negativeCount: negative,
    };
  }

  async findById(id: string, user: AuthenticatedUser) {
    return this.serializeAccount(await this.loadForView(id, user), user);
  }

  /** Usuários ativos para seleção de dono/compartilhamento (campos mínimos). */
  async listUserOptions() {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, userNumber: true, name: true, role: true },
      orderBy: { userNumber: 'asc' },
    });
    return users;
  }

  /** Contas correntes elegíveis para crédito via recebimento (mesmo fornecedor + can_move). */
  async listForReceipt(supplierId: string, user: AuthenticatedUser) {
    if (!supplierId) throw new BadRequestException('Fornecedor é obrigatório.');

    const where: Prisma.CurrentAccountWhereInput = { supplierId, isActive: true };
    if (user.role === Role.COMPRADOR) {
      where.OR = [
        { ownerUserId: user.id },
        { shares: { some: { userId: user.id, canMove: true } } },
      ];
    }

    const accounts = await this.prisma.currentAccount.findMany({
      where,
      select: {
        id: true,
        name: true,
        supplier: { select: { id: true, tradeName: true } },
        movements: {
          select: {
            id: true,
            type: true,
            amount: true,
            isReversed: true,
            reversalOfMovementId: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return accounts.map((acc) => {
      const totals = computeAccountTotals(acc.movements);
      return {
        id: acc.id,
        name: acc.name,
        supplier: acc.supplier,
        balance: totals.balance,
        balanceStatus: totals.balanceStatus,
      };
    });
  }

  // ---------- extrato ----------
  private serializeMovement(m: MovementWithRelations, byId: Map<string, MovementLike>, balanceAfter?: Prisma.Decimal) {
    const sv = signedValue(m, byId);
    const sign = sv.greaterThan(0) ? '+' : sv.lessThan(0) ? '-' : '';
    return {
      id: m.id,
      type: m.type,
      sign,
      movementDate: dateToIso(m.movementDate),
      amount: m.amount.toFixed(2),
      receiptMethod: m.receiptMethod ? { id: m.receiptMethod.id, name: m.receiptMethod.name } : null,
      actionType: m.actionType ? { id: m.actionType.id, name: m.actionType.name } : null,
      description: m.description,
      notes: m.notes,
      isReversed: m.isReversed,
      reversedAt: m.reversedAt ? m.reversedAt.toISOString() : null,
      reverseReason: m.reverseReason,
      reversedBy: m.reverser
        ? { id: m.reverser.id, userNumber: m.reverser.userNumber, name: m.reverser.name }
        : null,
      reversalOfMovementId: m.reversalOfMovementId,
      receivableId: m.receivableId,
      receivableReceiptId: m.receivableReceiptId,
      origin: m.receivableReceiptId ? ('RECEIPT' as const) : null,
      receivableLink: m.receivable
        ? {
            id: m.receivable.id,
            competenceMonth: m.receivable.competenceMonth,
            supplier: m.receivable.supplier,
            actionType: m.receivable.actionType,
          }
        : null,
      receiptLink: m.linkedReceipt
        ? {
            id: m.linkedReceipt.id,
            receiptDate: dateToIso(m.linkedReceipt.receiptDate),
            amount: m.linkedReceipt.amount.toFixed(2),
            confirmationStatus: m.linkedReceipt.confirmationStatus,
          }
        : null,
      createdBy: { id: m.creator.id, userNumber: m.creator.userNumber, name: m.creator.name },
      balanceAfter: balanceAfter ? balanceAfter.toFixed(2) : null,
      createdAt: m.createdAt.toISOString(),
    };
  }

  async listMovements(id: string, query: QueryCurrentAccountMovementsDto, user: AuthenticatedUser) {
    await this.loadForView(id, user);

    // Todas as movimentações em ordem cronológica para o saldo corrente acumulado.
    const all = await this.prisma.currentAccountMovement.findMany({
      where: { currentAccountId: id },
      include: movementInclude,
      orderBy: [{ movementDate: 'asc' }, { createdAt: 'asc' }],
    });
    const byId = new Map<string, MovementLike>(all.map((m) => [m.id, m]));
    const balanceAfter = new Map<string, Prisma.Decimal>();
    let running = new Prisma.Decimal(0);
    for (const m of all) {
      running = running.plus(signedValue(m, byId));
      balanceAfter.set(m.id, running);
    }

    // Filtros (em memória, mantendo o saldo corrente já calculado).
    let rows = all;
    if (query.from) rows = rows.filter((m) => m.movementDate >= parseDateOnly(query.from!));
    if (query.to) rows = rows.filter((m) => m.movementDate <= parseDateOnly(query.to!));
    if (query.type) rows = rows.filter((m) => m.type === query.type);
    if (query.receiptMethodId) rows = rows.filter((m) => m.receiptMethodId === query.receiptMethodId);
    if (query.actionTypeId) rows = rows.filter((m) => m.actionTypeId === query.actionTypeId);
    if (query.userId) rows = rows.filter((m) => m.createdBy === query.userId);
    if (query.search) {
      const s = query.search.toLowerCase();
      rows = rows.filter(
        (m) =>
          (m.description ?? '').toLowerCase().includes(s) ||
          (m.notes ?? '').toLowerCase().includes(s) ||
          m.creator.name.toLowerCase().includes(s) ||
          (m.receivable?.supplier.tradeName ?? '').toLowerCase().includes(s),
      );
    }

    // Ordenação (padrão: mais recentes primeiro).
    const sortBy = query.sortBy ?? 'movementDate';
    const dir = query.sortDir ?? 'desc';
    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'amount') cmp = a.amount.comparedTo(b.amount);
      else if (sortBy === 'type') cmp = a.type.localeCompare(b.type);
      else if (sortBy === 'createdAt') cmp = a.createdAt.getTime() - b.createdAt.getTime();
      else cmp = a.movementDate.getTime() - b.movementDate.getTime() || a.createdAt.getTime() - b.createdAt.getTime();
      return dir === 'asc' ? cmp : -cmp;
    });

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const total = rows.length;
    const slice = rows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

    return {
      data: slice.map((m) => this.serializeMovement(m, byId, balanceAfter.get(m.id))),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async exportAllMovements(id: string, query: QueryCurrentAccountMovementsDto, user: AuthenticatedUser) {
    await this.loadForView(id, user);
    const all = await this.prisma.currentAccountMovement.findMany({
      where: { currentAccountId: id },
      include: movementInclude,
      orderBy: [{ movementDate: 'asc' }, { createdAt: 'asc' }],
    });
    const byId = new Map<string, MovementLike>(all.map((m) => [m.id, m]));
    const balanceAfter = new Map<string, Prisma.Decimal>();
    let running = new Prisma.Decimal(0);
    for (const m of all) {
      running = running.plus(signedValue(m, byId));
      balanceAfter.set(m.id, running);
    }

    let rows = all;
    if (query.from) rows = rows.filter((m) => m.movementDate >= parseDateOnly(query.from!));
    if (query.to) rows = rows.filter((m) => m.movementDate <= parseDateOnly(query.to!));
    if (query.type) rows = rows.filter((m) => m.type === query.type);
    if (query.receiptMethodId) rows = rows.filter((m) => m.receiptMethodId === query.receiptMethodId);
    if (query.actionTypeId) rows = rows.filter((m) => m.actionTypeId === query.actionTypeId);
    if (query.userId) rows = rows.filter((m) => m.createdBy === query.userId);
    if (query.search) {
      const s = query.search.toLowerCase();
      rows = rows.filter(
        (m) =>
          (m.description ?? '').toLowerCase().includes(s) ||
          (m.notes ?? '').toLowerCase().includes(s) ||
          m.creator.name.toLowerCase().includes(s) ||
          (m.receivable?.supplier.tradeName ?? '').toLowerCase().includes(s),
      );
    }

    const sortBy = query.sortBy ?? 'movementDate';
    const dir = query.sortDir ?? 'desc';
    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'amount') cmp = a.amount.comparedTo(b.amount);
      else if (sortBy === 'type') cmp = a.type.localeCompare(b.type);
      else if (sortBy === 'createdAt') cmp = a.createdAt.getTime() - b.createdAt.getTime();
      else cmp = a.movementDate.getTime() - b.movementDate.getTime() || a.createdAt.getTime() - b.createdAt.getTime();
      return dir === 'asc' ? cmp : -cmp;
    });

    assertExportLimit(rows.length, 'movimentações');
    return rows.map((m) => this.serializeMovement(m, byId, balanceAfter.get(m.id)));
  }

  // ---------- contas: escrita ----------
  async create(dto: CreateCurrentAccountDto, user: AuthenticatedUser, actor: ActorContext) {
    const ownerUserId = user.role === Role.COMPRADOR ? user.id : dto.ownerUserId ?? user.id;
    await this.ensureSupplierActive(dto.supplierId);
    await this.ensureUserActive(ownerUserId, 'Comprador responsável');

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.currentAccount.create({
        data: {
          supplierId: dto.supplierId,
          name: dto.name.trim(),
          ownerUserId,
          notes: dto.notes?.trim() || null,
          createdBy: user.id,
        },
        include: accountInclude,
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.CURRENT_ACCOUNT_CREATED,
          entityType: AuditEntity.CURRENT_ACCOUNT,
          entityId: row.id,
          newValues: this.accountSnapshot(row),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return row;
    });

    return this.serializeAccount(created, user);
  }

  async update(id: string, dto: UpdateCurrentAccountDto, user: AuthenticatedUser, actor: ActorContext) {
    const current = await this.loadForView(id, user);
    const access = this.accessLevel(current, user);
    if (!access.edit) throw new ForbiddenException('Você não pode editar esta conta corrente.');
    if (user.role !== Role.ADMIN && !current.isActive) {
      throw new BadRequestException('Não é possível editar uma conta inativa.');
    }

    let ownerUserId = current.ownerUserId;
    if (dto.ownerUserId && dto.ownerUserId !== current.ownerUserId) {
      if (user.role !== Role.ADMIN) {
        throw new ForbiddenException('Apenas o administrador pode alterar o dono da conta.');
      }
      await this.ensureUserActive(dto.ownerUserId, 'Comprador responsável');
      ownerUserId = dto.ownerUserId;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.currentAccount.update({
        where: { id },
        data: {
          name: dto.name?.trim() ?? current.name,
          notes: dto.notes !== undefined ? dto.notes?.trim() || null : current.notes,
          ownerUserId,
          updatedBy: user.id,
        },
        include: accountInclude,
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.CURRENT_ACCOUNT_UPDATED,
          entityType: AuditEntity.CURRENT_ACCOUNT,
          entityId: id,
          oldValues: this.accountSnapshot(current),
          newValues: this.accountSnapshot(row),
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return row;
    });

    return this.serializeAccount(updated, user);
  }

  async setActive(id: string, isActive: boolean, reason: string | undefined, user: AuthenticatedUser, actor: ActorContext) {
    const current = await this.loadForView(id, user);
    // Ativar/inativar: ADMIN ou dono da conta.
    if (user.role !== Role.ADMIN && current.ownerUserId !== user.id) {
      throw new ForbiddenException('Você não pode alterar o status desta conta.');
    }
    if (current.isActive === isActive) {
      return this.serializeAccount(current, user);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.currentAccount.update({
        where: { id },
        data: { isActive, updatedBy: user.id },
        include: accountInclude,
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: isActive
            ? AuditAction.CURRENT_ACCOUNT_ACTIVATED
            : AuditAction.CURRENT_ACCOUNT_DEACTIVATED,
          entityType: AuditEntity.CURRENT_ACCOUNT,
          entityId: id,
          oldValues: { isActive: current.isActive },
          newValues: { isActive },
          reason: reason ?? null,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
      return row;
    });

    return this.serializeAccount(updated, user);
  }

  async share(id: string, dto: ShareCurrentAccountDto, user: AuthenticatedUser, actor: ActorContext) {
    const current = await this.loadForView(id, user);
    // Compartilhar: ADMIN ou dono.
    if (user.role !== Role.ADMIN && current.ownerUserId !== user.id) {
      throw new ForbiddenException('Você não pode compartilhar esta conta.');
    }
    if (dto.userId === current.ownerUserId) {
      throw new BadRequestException('O dono da conta não precisa ser compartilhado.');
    }
    await this.ensureUserActive(dto.userId, 'Usuário');

    const canView = dto.canView ?? true;
    const canMove = dto.canMove ?? false;
    const canEdit = dto.canEdit ?? false;

    await this.prisma.$transaction(async (tx) => {
      await tx.currentAccountUser.upsert({
        where: { currentAccountId_userId: { currentAccountId: id, userId: dto.userId } },
        create: { currentAccountId: id, userId: dto.userId, canView, canMove, canEdit },
        update: { canView, canMove, canEdit },
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.CURRENT_ACCOUNT_SHARED,
          entityType: AuditEntity.CURRENT_ACCOUNT_USER,
          entityId: id,
          newValues: { userId: dto.userId, canView, canMove, canEdit },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
    });

    await this.notifications.onAccountShared({
      accountId: id,
      accountName: current.name,
      supplierName: current.supplier.tradeName,
      sharedUserId: dto.userId,
      actorUserId: user.id,
    });

    return this.serializeAccount(await this.loadAccount(id), user);
  }
  private async ensureCanMove(id: string, user: AuthenticatedUser): Promise<AccountWithRelations> {
    const acc = await this.loadForView(id, user);
    if (!this.accessLevel(acc, user).move) {
      throw new ForbiddenException('Você não pode movimentar esta conta corrente.');
    }
    if (!acc.isActive) throw new BadRequestException('Não é possível movimentar uma conta inativa.');
    return acc;
  }

  private async createMovement(
    accountId: string,
    data: Omit<Prisma.CurrentAccountMovementUncheckedCreateInput, 'currentAccountId' | 'createdBy'>,
    action: string,
    reason: string | null,
    user: AuthenticatedUser,
    actor: ActorContext,
  ) {
    let movementId = '';
    const acc = await this.loadForView(accountId, user);

    await this.prisma.$transaction(async (tx) => {
      const row = await tx.currentAccountMovement.create({
        data: { ...data, currentAccountId: accountId, createdBy: user.id },
      });
      movementId = row.id;
      await this.audit.log(
        {
          userId: actor.userId,
          action,
          entityType: AuditEntity.CURRENT_ACCOUNT_MOVEMENT,
          entityId: row.id,
          newValues: {
            currentAccountId: accountId,
            type: row.type,
            amount: row.amount.toFixed(2),
            movementDate: dateToIso(row.movementDate),
            receiptMethodId: row.receiptMethodId,
            actionTypeId: row.actionTypeId,
            description: row.description,
          },
          reason,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
    });

    const shareUserIds = acc.shares.filter((s) => s.canView).map((s) => s.userId);
    await this.notifications.onSharedAccountMovement({
      accountId: acc.id,
      accountName: acc.name,
      supplierName: acc.supplier.tradeName,
      ownerUserId: acc.ownerUserId,
      movementId,
      movementType: String(data.type),
      amount: data.amount as Prisma.Decimal,
      actorUserId: user.id,
      shareUserIds,
    });

    return this.serializeAccount(await this.loadAccount(accountId), user);
  }

  async createEntry(id: string, dto: CreateEntryMovementDto, user: AuthenticatedUser, actor: ActorContext) {
    await this.ensureCanMove(id, user);
    await this.ensureReceiptMethodActive(dto.receiptMethodId);
    return this.createMovement(
      id,
      {
        type: MovementType.ENTRADA,
        movementDate: parseDateOnly(dto.movementDate),
        amount: new Prisma.Decimal(dto.amount),
        receiptMethodId: dto.receiptMethodId,
        description: dto.description?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
      AuditAction.CURRENT_ACCOUNT_ENTRY_CREATED,
      null,
      user,
      actor,
    );
  }

  async createExit(id: string, dto: CreateExitMovementDto, user: AuthenticatedUser, actor: ActorContext) {
    await this.ensureCanMove(id, user);
    await this.ensureActionTypeActive(dto.actionTypeId);
    return this.createMovement(
      id,
      {
        type: MovementType.SAIDA,
        movementDate: parseDateOnly(dto.movementDate),
        amount: new Prisma.Decimal(dto.amount),
        actionTypeId: dto.actionTypeId,
        description: dto.description?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
      AuditAction.CURRENT_ACCOUNT_EXIT_CREATED,
      null,
      user,
      actor,
    );
  }

  // Ajuste: somente ADMIN (garantido no controller). Exige motivo.
  async createAdjustment(id: string, dto: CreateAdjustmentMovementDto, user: AuthenticatedUser, actor: ActorContext) {
    const acc = await this.loadForView(id, user);
    if (!acc.isActive) throw new BadRequestException('Não é possível movimentar uma conta inativa.');
    const type = dto.direction === 'POSITIVO' ? MovementType.AJUSTE_POSITIVO : MovementType.AJUSTE_NEGATIVO;
    return this.createMovement(
      id,
      {
        type,
        movementDate: parseDateOnly(dto.movementDate),
        amount: new Prisma.Decimal(dto.amount),
        description: dto.description?.trim() || 'Ajuste manual',
        notes: dto.notes?.trim() || `Motivo do ajuste: ${dto.reason}`,
      },
      AuditAction.CURRENT_ACCOUNT_ADJUSTMENT_CREATED,
      dto.reason,
      user,
      actor,
    );
  }

  // Estorno: somente ADMIN (garantido no controller). Lógico, com movimento espelho.
  async reverseMovement(id: string, movementId: string, reason: string, user: AuthenticatedUser, actor: ActorContext) {
    const acc = await this.loadForView(id, user);
    const movement = await this.prisma.currentAccountMovement.findUnique({ where: { id: movementId } });
    if (!movement || movement.currentAccountId !== acc.id) {
      throw new NotFoundException('Movimentação não encontrada.');
    }
    if (movement.isReversed) throw new BadRequestException('Movimentação já estornada.');
    if (movement.type === MovementType.ESTORNO) {
      throw new BadRequestException('Não é possível estornar um movimento de estorno.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.currentAccountMovement.update({
        where: { id: movementId },
        data: {
          isReversed: true,
          reversedAt: new Date(),
          reversedBy: user.id,
          reverseReason: reason,
        },
      });
      await tx.currentAccountMovement.create({
        data: {
          currentAccountId: acc.id,
          type: MovementType.ESTORNO,
          movementDate: startOfTodayUtc(),
          amount: movement.amount,
          description: `Estorno da movimentação ${movement.id}`,
          notes: reason,
          reversalOfMovementId: movement.id,
          createdBy: user.id,
        },
      });
      await this.audit.log(
        {
          userId: actor.userId,
          action: AuditAction.CURRENT_ACCOUNT_MOVEMENT_REVERSED,
          entityType: AuditEntity.CURRENT_ACCOUNT_MOVEMENT,
          entityId: movementId,
          oldValues: { type: movement.type, amount: movement.amount.toFixed(2), isReversed: false },
          newValues: { isReversed: true },
          reason,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        },
        tx,
      );
    });

    const shareUserIds = acc.shares.filter((s) => s.canView).map((s) => s.userId);
    await this.notifications.onMovementReversed({
      accountId: acc.id,
      accountName: acc.name,
      supplierName: acc.supplier.tradeName,
      ownerUserId: acc.ownerUserId,
      movementId,
      amount: movement.amount,
      actorUserId: user.id,
      shareUserIds,
    });

    return this.serializeAccount(await this.loadAccount(id), user);
  }
}
