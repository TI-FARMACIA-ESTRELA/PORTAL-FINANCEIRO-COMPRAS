import {
  ConfirmationStatus,
  FinancialStatus,
  NotificationSeverity,
  NotificationType,
  Prisma,
  Role,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { computeAccountTotals } from '../current-accounts/balance.helpers';
import { dateToIso } from '../receivables/receivable.helpers';

export const OPEN_STATUSES: FinancialStatus[] = [FinancialStatus.ABERTO, FinancialStatus.PARCIAL];

export const NotificationEntity = {
  RECEIVABLE: 'Receivable',
  RECEIPT: 'ReceivableReceipt',
  CURRENT_ACCOUNT: 'CurrentAccount',
  CURRENT_ACCOUNT_MOVEMENT: 'CurrentAccountMovement',
} as const;

export function startOfTodayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

export function money(v: Prisma.Decimal | string): string {
  const d = typeof v === 'string' ? v : v.toFixed(2);
  return `R$ ${d}`;
}

export interface NotificationScope {
  receivableWhere: Prisma.ReceivableWhereInput;
  accountWhere: Prisma.CurrentAccountWhereInput;
}

export function buildNotificationScope(user: AuthenticatedUser): NotificationScope {
  if (user.role === Role.COMPRADOR) {
    return {
      receivableWhere: { buyerId: user.id },
      accountWhere: {
        OR: [
          { ownerUserId: user.id },
          { shares: { some: { userId: user.id, canView: true } } },
        ],
      },
    };
  }
  return { receivableWhere: {}, accountWhere: {} };
}

const FORBIDDEN_METADATA_KEYS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'refreshToken',
  'accessToken',
  'authorization',
]);

export function sanitizeMetadata(
  meta?: Record<string, unknown> | null,
): Prisma.InputJsonValue | undefined {
  if (!meta) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (FORBIDDEN_METADATA_KEYS.has(key)) continue;
    clean[key] = value;
  }
  return clean as Prisma.InputJsonValue;
}

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  dedupKey?: string;
}

export const accountMovementSelect = {
  id: true,
  type: true,
  amount: true,
  isReversed: true,
  reversalOfMovementId: true,
  createdAt: true,
} as const;

export const accountWithMovementsSelect = {
  id: true,
  name: true,
  ownerUserId: true,
  supplier: { select: { tradeName: true } },
  shares: { select: { userId: true, canView: true } },
  movements: { select: accountMovementSelect },
} as const;

export function isNegativeAccount(
  movements: {
    id: string;
    type: import('@prisma/client').MovementType;
    amount: Prisma.Decimal;
    isReversed: boolean;
    reversalOfMovementId: string | null;
  }[],
): boolean {
  return computeAccountTotals(movements).balanceStatus === 'NEGATIVO';
}

export function pendingReceiptWhere(
  receivableWhere: Prisma.ReceivableWhereInput,
): Prisma.ReceivableReceiptWhereInput {
  return {
    reversalOfReceiptId: null,
    isReversed: false,
    confirmationStatus: ConfirmationStatus.PENDENTE_CONFIRMACAO,
    receivable: receivableWhere,
  };
}

export { dateToIso };
