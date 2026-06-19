import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ConfirmationStatus,
  NotificationSeverity,
  NotificationType,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { computeAccountTotals } from '../current-accounts/balance.helpers';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import {
  OPEN_STATUSES,
  NotificationEntity,
  addDays,
  buildNotificationScope,
  dateToIso,
  isNegativeAccount,
  money,
  pendingReceiptWhere,
  sanitizeMetadata,
  startOfTodayUtc,
  accountWithMovementsSelect,
  type CreateNotificationParams,
} from './notification.helpers';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(n: {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    entityType: string | null;
    entityId: string | null;
    severity: NotificationSeverity;
    metadata: Prisma.JsonValue | null;
    readAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      entityType: n.entityType,
      entityId: n.entityId,
      severity: n.severity,
      metadata: n.metadata,
      read: n.readAt !== null,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    };
  }

  async createNotification(params: CreateNotificationParams) {
    const data = {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      severity: params.severity,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      metadata: sanitizeMetadata(params.metadata),
      dedupKey: params.dedupKey ?? null,
    };

    if (params.dedupKey) {
      const existing = await this.prisma.notification.findUnique({
        where: { userId_dedupKey: { userId: params.userId, dedupKey: params.dedupKey } },
      });
      if (existing) {
        return this.prisma.notification.update({
          where: { id: existing.id },
          data: {
            title: params.title,
            message: params.message,
            severity: params.severity,
            entityType: params.entityType ?? null,
            entityId: params.entityId ?? null,
            metadata: sanitizeMetadata(params.metadata),
          },
        });
      }
    }

    return this.prisma.notification.create({ data });
  }

  async createForUsers(userIds: string[], params: Omit<CreateNotificationParams, 'userId'>) {
    const unique = [...new Set(userIds.filter(Boolean))];
    await Promise.all(unique.map((userId) => this.createNotification({ ...params, userId })));
  }

  async listUserNotifications(query: QueryNotificationsDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.NotificationWhereInput = { userId: user.id };

    if (query.unreadOnly === 'true') where.readAt = null;
    if (query.type) where.type = query.type;
    if (query.severity) where.severity = query.severity;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(`${query.dateTo.slice(0, 10)}T23:59:59.999Z`);
    }
    if (query.search) {
      const s = query.search;
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { message: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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

  async getUnreadCount(user: AuthenticatedUser) {
    const count = await this.prisma.notification.count({
      where: { userId: user.id, readAt: null },
    });
    return { count };
  }

  async markAsRead(id: string, user: AuthenticatedUser) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n || n.userId !== user.id) {
      throw new NotFoundException('Notificação não encontrada.');
    }
    if (n.readAt) return this.serialize(n);
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return this.serialize(updated);
  }

  async markAllAsRead(user: AuthenticatedUser) {
    const result = await this.prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async refreshForUser(user: AuthenticatedUser) {
    await this.generateRuleBasedNotificationsForUser(user);
    return this.listUserNotifications({ page: 1, pageSize: 20 }, user);
  }

  private async activeUserIdsByRoles(roles: Role[]): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { role: { in: roles }, isActive: true },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  async generateRuleBasedNotificationsForUser(user: AuthenticatedUser) {
    const scope = buildNotificationScope(user);
    const today = startOfTodayUtc();
    const tomorrow = addDays(today, 1);
    const in7 = addDays(today, 7);
    const openBase = { AND: [scope.receivableWhere, { financialStatus: { in: OPEN_STATUSES } }] };

    const [overdue, dueToday, dueSoon, pendingReceipts, accounts] = await Promise.all([
      this.prisma.receivable.findMany({
        where: { AND: [openBase, { expectedReceiptDate: { lt: today } }] },
        select: {
          id: true,
          expectedReceiptDate: true,
          amount: true,
          supplier: { select: { tradeName: true } },
        },
        take: 50,
      }),
      this.prisma.receivable.findMany({
        where: { AND: [openBase, { expectedReceiptDate: { gte: today, lt: tomorrow } }] },
        select: {
          id: true,
          expectedReceiptDate: true,
          amount: true,
          supplier: { select: { tradeName: true } },
        },
        take: 50,
      }),
      this.prisma.receivable.findMany({
        where: { AND: [openBase, { expectedReceiptDate: { gte: tomorrow, lte: in7 } }] },
        select: {
          id: true,
          expectedReceiptDate: true,
          amount: true,
          supplier: { select: { tradeName: true } },
        },
        take: 50,
      }),
      this.prisma.receivableReceipt.findMany({
        where: pendingReceiptWhere(scope.receivableWhere),
        select: {
          id: true,
          amount: true,
          receivable: { select: { supplier: { select: { tradeName: true } } } },
        },
        take: 50,
      }),
      this.prisma.currentAccount.findMany({
        where: { ...scope.accountWhere, isActive: true },
        select: accountWithMovementsSelect,
        take: 50,
      }),
    ]);

    for (const r of overdue) {
      await this.createNotification({
        userId: user.id,
        type: NotificationType.RECEIVABLE_OVERDUE,
        title: 'Lançamento vencido',
        message: `${r.supplier.tradeName} — previsão ${dateToIso(r.expectedReceiptDate)} (${money(r.amount)})`,
        severity: NotificationSeverity.DANGER,
        entityType: NotificationEntity.RECEIVABLE,
        entityId: r.id,
        dedupKey: `RECEIVABLE_OVERDUE:${r.id}`,
        metadata: { expectedReceiptDate: dateToIso(r.expectedReceiptDate) },
      });
    }

    for (const r of dueToday) {
      await this.createNotification({
        userId: user.id,
        type: NotificationType.RECEIVABLE_DUE_TODAY,
        title: 'Lançamento vence hoje',
        message: `${r.supplier.tradeName} — ${money(r.amount)}`,
        severity: NotificationSeverity.WARNING,
        entityType: NotificationEntity.RECEIVABLE,
        entityId: r.id,
        dedupKey: `RECEIVABLE_DUE_TODAY:${r.id}`,
      });
    }

    for (const r of dueSoon) {
      await this.createNotification({
        userId: user.id,
        type: NotificationType.RECEIVABLE_DUE_SOON,
        title: 'Lançamento vence em breve',
        message: `${r.supplier.tradeName} — previsão ${dateToIso(r.expectedReceiptDate)} (${money(r.amount)})`,
        severity: NotificationSeverity.INFO,
        entityType: NotificationEntity.RECEIVABLE,
        entityId: r.id,
        dedupKey: `RECEIVABLE_DUE_SOON:${r.id}`,
        metadata: { expectedReceiptDate: dateToIso(r.expectedReceiptDate) },
      });
    }

    for (const rec of pendingReceipts) {
      await this.createNotification({
        userId: user.id,
        type: NotificationType.RECEIPT_PENDING_CONFIRMATION,
        title: 'Recebimento pendente de confirmação',
        message: `${rec.receivable.supplier.tradeName} — ${money(rec.amount)}`,
        severity: NotificationSeverity.WARNING,
        entityType: NotificationEntity.RECEIPT,
        entityId: rec.id,
        dedupKey: `RECEIPT_PENDING_CONFIRMATION:${rec.id}`,
      });
    }

    for (const acc of accounts) {
      if (!isNegativeAccount(acc.movements)) continue;
      const totals = computeAccountTotals(acc.movements);
      await this.createNotification({
        userId: user.id,
        type: NotificationType.CURRENT_ACCOUNT_NEGATIVE,
        title: 'Conta corrente negativa',
        message: `${acc.name} (${acc.supplier.tradeName}) — saldo ${money(totals.balance)}`,
        severity: NotificationSeverity.DANGER,
        entityType: NotificationEntity.CURRENT_ACCOUNT,
        entityId: acc.id,
        dedupKey: `CURRENT_ACCOUNT_NEGATIVE:${acc.id}`,
        metadata: { balance: totals.balance },
      });
    }
  }

  async onReceiptCreated(
    receipt: {
      id: string;
      amount: Prisma.Decimal;
      confirmationStatus: ConfirmationStatus;
      receivable: { buyerId: string; supplier: { tradeName: string } };
    },
    actorUserId: string,
  ) {
    if (receipt.receivable.buyerId !== actorUserId) {
      await this.createNotification({
        userId: receipt.receivable.buyerId,
        type: NotificationType.RECEIPT_REGISTERED,
        title: 'Recebimento registrado',
        message: `${receipt.receivable.supplier.tradeName} — ${money(receipt.amount)}`,
        severity: NotificationSeverity.INFO,
        entityType: NotificationEntity.RECEIPT,
        entityId: receipt.id,
        dedupKey: `RECEIPT_REGISTERED:${receipt.id}`,
      });
    }

    if (receipt.confirmationStatus === ConfirmationStatus.PENDENTE_CONFIRMACAO) {
      const adminIds = await this.activeUserIdsByRoles([Role.ADMIN]);
      await this.createForUsers(
        adminIds.filter((id) => id !== actorUserId),
        {
          type: NotificationType.RECEIPT_PENDING_CONFIRMATION,
          title: 'Recebimento aguardando confirmação',
          message: `${receipt.receivable.supplier.tradeName} — ${money(receipt.amount)}`,
          severity: NotificationSeverity.WARNING,
          entityType: NotificationEntity.RECEIPT,
          entityId: receipt.id,
          dedupKey: `RECEIPT_PENDING_CONFIRMATION:${receipt.id}`,
        },
      );
    }
  }

  async onReceiptConfirmed(
    receipt: {
      id: string;
      amount: Prisma.Decimal;
      receivable: { buyerId: string; supplier: { tradeName: string } };
    },
    actorUserId: string,
  ) {
    if (receipt.receivable.buyerId === actorUserId) return;
    await this.createNotification({
      userId: receipt.receivable.buyerId,
      type: NotificationType.RECEIPT_CONFIRMED,
      title: 'Recebimento confirmado',
      message: `${receipt.receivable.supplier.tradeName} — ${money(receipt.amount)}`,
      severity: NotificationSeverity.SUCCESS,
      entityType: NotificationEntity.RECEIPT,
      entityId: receipt.id,
      dedupKey: `RECEIPT_CONFIRMED:${receipt.id}`,
    });
  }

  async onReceiptReversed(
    receipt: {
      id: string;
      amount: Prisma.Decimal;
      receivable: { buyerId: string; supplier: { tradeName: string } };
    },
    actorUserId: string,
  ) {
    const targets = new Set<string>();
    if (receipt.receivable.buyerId !== actorUserId) targets.add(receipt.receivable.buyerId);
    const elevated = await this.activeUserIdsByRoles([Role.ADMIN, Role.DIRETORIA]);
    for (const id of elevated) {
      if (id !== actorUserId) targets.add(id);
    }
    await this.createForUsers([...targets], {
      type: NotificationType.RECEIPT_REVERSED,
      title: 'Recebimento estornado',
      message: `${receipt.receivable.supplier.tradeName} — ${money(receipt.amount)}`,
      severity: NotificationSeverity.DANGER,
      entityType: NotificationEntity.RECEIPT,
      entityId: receipt.id,
      dedupKey: `RECEIPT_REVERSED:${receipt.id}`,
    });
  }

  async onAccountShared(params: {
    accountId: string;
    accountName: string;
    supplierName: string;
    sharedUserId: string;
    actorUserId: string;
  }) {
    if (params.sharedUserId === params.actorUserId) return;
    await this.createNotification({
      userId: params.sharedUserId,
      type: NotificationType.CURRENT_ACCOUNT_SHARED,
      title: 'Conta corrente compartilhada',
      message: `Você recebeu acesso à conta "${params.accountName}" (${params.supplierName}).`,
      severity: NotificationSeverity.INFO,
      entityType: NotificationEntity.CURRENT_ACCOUNT,
      entityId: params.accountId,
      dedupKey: `CURRENT_ACCOUNT_SHARED:${params.accountId}:${params.sharedUserId}`,
    });
  }

  async onSharedAccountMovement(params: {
    accountId: string;
    accountName: string;
    supplierName: string;
    ownerUserId: string;
    movementId: string;
    movementType: string;
    amount: Prisma.Decimal;
    actorUserId: string;
    shareUserIds: string[];
  }) {
    const isShared =
      params.shareUserIds.length > 0 || params.ownerUserId !== params.actorUserId;
    if (!isShared) return;

    const targets = new Set<string>();
    if (params.ownerUserId !== params.actorUserId) targets.add(params.ownerUserId);
    for (const uid of params.shareUserIds) {
      if (uid !== params.actorUserId) targets.add(uid);
    }
    if (targets.size === 0) return;

    await this.createForUsers([...targets], {
      type: NotificationType.CURRENT_ACCOUNT_SHARED_MOVEMENT,
      title: 'Movimentação em conta compartilhada',
      message: `${params.movementType} de ${money(params.amount)} em "${params.accountName}" (${params.supplierName}).`,
      severity: NotificationSeverity.INFO,
      entityType: NotificationEntity.CURRENT_ACCOUNT_MOVEMENT,
      entityId: params.movementId,
      dedupKey: `CURRENT_ACCOUNT_SHARED_MOVEMENT:${params.movementId}`,
      metadata: { currentAccountId: params.accountId },
    });
  }

  async onMovementReversed(params: {
    accountId: string;
    accountName: string;
    supplierName: string;
    ownerUserId: string;
    movementId: string;
    amount: Prisma.Decimal;
    actorUserId: string;
    shareUserIds: string[];
  }) {
    const targets = new Set<string>();
    if (params.ownerUserId !== params.actorUserId) targets.add(params.ownerUserId);
    for (const uid of params.shareUserIds) {
      if (uid !== params.actorUserId) targets.add(uid);
    }
    const elevated = await this.activeUserIdsByRoles([Role.ADMIN, Role.DIRETORIA]);
    for (const id of elevated) {
      if (id !== params.actorUserId) targets.add(id);
    }

    await this.createForUsers([...targets], {
      type: NotificationType.CURRENT_ACCOUNT_MOVEMENT_REVERSED,
      title: 'Movimentação de conta estornada',
      message: `Estorno de ${money(params.amount)} em "${params.accountName}" (${params.supplierName}).`,
      severity: NotificationSeverity.WARNING,
      entityType: NotificationEntity.CURRENT_ACCOUNT_MOVEMENT,
      entityId: params.movementId,
      dedupKey: `CURRENT_ACCOUNT_MOVEMENT_REVERSED:${params.movementId}`,
      metadata: { currentAccountId: params.accountId },
    });
  }
}
