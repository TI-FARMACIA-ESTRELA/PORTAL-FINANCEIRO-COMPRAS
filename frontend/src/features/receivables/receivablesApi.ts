import { api } from '@/services/api/client';

export type FinancialStatus = 'ABERTO' | 'PARCIAL' | 'QUITADO' | 'CANCELADO';
export type DueStatus = 'EM_DIA' | 'VENCE_HOJE' | 'VENCIDO' | 'SEM_VENCIMENTO';

export interface RelRef {
  id: string;
  tradeName?: string;
  name?: string;
  userNumber?: number;
}

export interface BuyerRef {
  id: string;
  userNumber: number;
  name: string;
}

export interface Receivable {
  id: string;
  negotiationDate: string;
  competenceMonth: string;
  expectedReceiptDate: string;
  supplier: { id: string; tradeName: string };
  actionType: { id: string; name: string };
  buyer: BuyerRef;
  amount: string;
  totalReceived: string;
  openBalance: string;
  financialStatus: FinancialStatus;
  dueStatus: DueStatus;
  daysOverdue: number | null;
  daysToDue: number | null;
  notes: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  canceledBy: BuyerRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReceivableSummary {
  totalOpen: string;
  totalOverdue: string;
  next30Days: string;
  pendingCount: number;
  overdueCount: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ReceivableQuery {
  negotiationFrom?: string;
  negotiationTo?: string;
  competenceMonth?: string;
  expectedFrom?: string;
  expectedTo?: string;
  supplierId?: string;
  actionTypeId?: string;
  financialStatus?: FinancialStatus;
  dueStatus?: DueStatus;
  buyerId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface ReceivablePayload {
  negotiationDate: string;
  competenceMonth: string;
  expectedReceiptDate: string;
  supplierId: string;
  actionTypeId: string;
  amount: number;
  notes?: string;
  buyerId?: string;
}

export interface ActiveOption {
  id: string;
  label: string;
}

function cleanParams(query: object): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params[k] = v as string | number;
  }
  return params;
}

export async function listReceivables(query: ReceivableQuery): Promise<Paginated<Receivable>> {
  const { data } = await api.get<Paginated<Receivable>>('/receivables', {
    params: cleanParams(query),
  });
  return data;
}

export async function getReceivablesSummary(query: ReceivableQuery): Promise<ReceivableSummary> {
  const { data } = await api.get<ReceivableSummary>('/receivables/summary', {
    params: cleanParams(query),
  });
  return data;
}

export async function createReceivable(payload: ReceivablePayload): Promise<Receivable> {
  const { data } = await api.post<Receivable>('/receivables', payload);
  return data;
}

export async function updateReceivable(
  id: string,
  payload: Partial<ReceivablePayload>,
): Promise<Receivable> {
  const { data } = await api.patch<Receivable>(`/receivables/${id}`, payload);
  return data;
}

export async function cancelReceivable(id: string, reason: string): Promise<Receivable> {
  const { data } = await api.patch<Receivable>(`/receivables/${id}/cancel`, { reason });
  return data;
}

export async function listActiveSuppliers(): Promise<ActiveOption[]> {
  const { data } = await api.get<{ id: string; tradeName: string }[]>('/suppliers/active');
  return data.map((s) => ({ id: s.id, label: s.tradeName }));
}

export async function listActiveActionTypes(): Promise<ActiveOption[]> {
  const { data } = await api.get<{ id: string; name: string }[]>('/action-types/active');
  return data.map((a) => ({ id: a.id, label: a.name }));
}
