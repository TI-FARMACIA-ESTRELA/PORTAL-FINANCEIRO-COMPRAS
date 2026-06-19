import { ConfirmationStatus, FinancialStatus, Prisma, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { QueryDashboardDto } from './dto/query-dashboard.dto';

export const OPEN_STATUSES: FinancialStatus[] = [FinancialStatus.ABERTO, FinancialStatus.PARCIAL];

export function parseDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

export function startOfTodayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

/** Recebimentos que contam como recebidos oficiais. */
export function validConfirmedReceiptWhere(
  receivableWhere: Prisma.ReceivableWhereInput,
): Prisma.ReceivableReceiptWhereInput {
  return {
    confirmationStatus: ConfirmationStatus.CONFIRMADO,
    isReversed: false,
    reversalOfReceiptId: null,
    receivable: receivableWhere,
  };
}

export interface DashboardScope {
  receivableWhere: Prisma.ReceivableWhereInput;
  accountWhere: Prisma.CurrentAccountWhereInput;
  showBuyer: boolean;
}

export function buildDashboardScope(
  query: QueryDashboardDto,
  user: AuthenticatedUser,
): DashboardScope {
  const receivableWhere: Prisma.ReceivableWhereInput = {};
  const accountAnd: Prisma.CurrentAccountWhereInput[] = [];

  if (user.role === Role.COMPRADOR) {
    receivableWhere.buyerId = user.id;
    accountAnd.push({
      OR: [
        { ownerUserId: user.id },
        { shares: { some: { userId: user.id, canView: true } } },
      ],
    });
  } else if (query.buyerId) {
    receivableWhere.buyerId = query.buyerId;
    accountAnd.push({ ownerUserId: query.buyerId });
  }

  if (query.competenceMonth) receivableWhere.competenceMonth = query.competenceMonth;
  if (query.supplierId) {
    receivableWhere.supplierId = query.supplierId;
    accountAnd.push({ supplierId: query.supplierId });
  }
  if (query.actionTypeId) receivableWhere.actionTypeId = query.actionTypeId;

  if (query.dateFrom || query.dateTo) {
    receivableWhere.expectedReceiptDate = {};
    if (query.dateFrom) receivableWhere.expectedReceiptDate.gte = parseDateOnly(query.dateFrom);
    if (query.dateTo) receivableWhere.expectedReceiptDate.lte = parseDateOnly(query.dateTo);
  }

  const accountWhere = accountAnd.length > 0 ? { AND: accountAnd } : {};
  const showBuyer = user.role === Role.ADMIN || user.role === Role.DIRETORIA;

  return { receivableWhere, accountWhere, showBuyer };
}

/** Gera os últimos N meses (AAAA-MM) incluindo o mês atual. */
export function lastMonths(count: number, from = new Date()): string[] {
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(from.getFullYear(), from.getMonth() - i, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    months.push(`${y}-${m}`);
  }
  return months;
}
