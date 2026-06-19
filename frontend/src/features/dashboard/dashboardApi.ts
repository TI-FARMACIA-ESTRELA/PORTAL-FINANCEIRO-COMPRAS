import { api } from '@/services/api/client';
import type { BalanceStatus } from '@/features/current-accounts/currentAccountsApi';
import type { DueStatus, FinancialStatus } from '@/features/receivables/receivablesApi';

export interface DashboardQuery {
  buyerId?: string;
  competenceMonth?: string;
  dateFrom?: string;
  dateTo?: string;
  supplierId?: string;
  actionTypeId?: string;
}

export interface DashboardKpis {
  totalReceivableOpen: string;
  totalOverdue: string;
  receivedThisMonth: string;
  receivedThisYear: string;
  forecastNext30Days: string;
  pendingReceivablesCount: number;
  overdueReceivablesCount: number;
  pendingReceiptsConfirmationCount: number;
  currentAccountsBalance: string;
  positiveCurrentAccountsCount: number;
  zeroCurrentAccountsCount: number;
  negativeCurrentAccountsCount: number;
}

export interface MonthValue {
  month: string;
  received?: string;
  pending?: string;
  total?: string;
  launched?: string;
}

export interface NamedValue {
  supplierId?: string;
  supplierName?: string;
  actionTypeId?: string;
  actionTypeName?: string;
  methodId?: string;
  methodName?: string;
  openBalance?: string;
  total?: string;
  balance?: string;
}

export interface DashboardCharts {
  receivedVsPending: MonthValue[];
  topSuppliersOpen: NamedValue[];
  openByActionType: NamedValue[];
  receiptsByMethod: NamedValue[];
  monthlyReceiptEvolution: MonthValue[];
  currentAccountBalanceBySupplier: NamedValue[];
  valuesByCompetence: MonthValue[];
}

export interface BuyerRef {
  id: string;
  userNumber: number;
  name: string;
}

export interface ReceivableListItem {
  id: string;
  supplierName: string;
  actionTypeName: string;
  expectedReceiptDate: string;
  openBalance: string;
  financialStatus: FinancialStatus;
  dueStatus: DueStatus;
  buyer?: BuyerRef;
  link: string;
}

export interface ReceiptListItem {
  id: string;
  receiptDate: string;
  amount: string;
  methodName: string;
  supplierName: string;
  receivableId: string;
  buyer?: BuyerRef;
  link: string;
}

export interface MovementListItem {
  id: string;
  currentAccountId: string;
  accountName: string;
  supplierName: string;
  type: string;
  movementDate: string;
  amount: string;
  isReversed: boolean;
  receivableId: string | null;
  receivableReceiptId: string | null;
  owner?: BuyerRef;
  link: string;
}

export interface CurrentAccountListItem {
  id: string;
  name: string;
  supplierName: string;
  balance: string;
  balanceStatus: BalanceStatus;
  owner?: BuyerRef;
  link: string;
}

export interface DashboardLists {
  overdueReceivables: ReceivableListItem[];
  dueTodayReceivables: ReceivableListItem[];
  dueNext7DaysReceivables: ReceivableListItem[];
  dueNext30DaysReceivables: ReceivableListItem[];
  lastConfirmedReceipts: ReceiptListItem[];
  pendingConfirmationReceipts: ReceiptListItem[];
  lastCurrentAccountMovements: MovementListItem[];
  negativeCurrentAccounts: CurrentAccountListItem[];
}

export interface DashboardCurrentAccounts {
  featured: CurrentAccountListItem[];
}

export interface DashboardData {
  kpis: DashboardKpis;
  charts: DashboardCharts;
  lists: DashboardLists;
  currentAccounts: DashboardCurrentAccounts;
}

export async function getDashboard(query: DashboardQuery = {}): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/dashboard', { params: query });
  return data;
}
