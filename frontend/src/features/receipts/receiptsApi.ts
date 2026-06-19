import { api } from '@/services/api/client';

export type ReceiptType = 'INTEGRAL' | 'PARCIAL';
export type DestinationType = 'BAIXA_SIMPLES' | 'CREDITO_CONTA_CORRENTE';
export type ConfirmationStatus = 'PENDENTE_CONFIRMACAO' | 'CONFIRMADO' | 'ESTORNADO' | 'CANCELADO';
export type FinancialStatus = 'ABERTO' | 'PARCIAL' | 'QUITADO' | 'CANCELADO';

export interface UserRef {
  id: string;
  userNumber: number;
  name: string;
}

export interface ReceiptMethodOption {
  id: string;
  name: string;
  description?: string | null;
  isCurrentAccountCredit: boolean;
  isActive: boolean;
}

export interface ReceiptReceivable {
  id: string;
  competenceMonth: string;
  expectedReceiptDate: string;
  financialStatus: FinancialStatus;
  amount: string;
  totalReceived: string;
  openBalance: string;
  supplier: { id: string; tradeName: string };
  actionType: { id: string; name: string };
  buyer: UserRef;
  notes: string | null;
}

export interface Receipt {
  id: string;
  receiptDate: string;
  amount: string;
  receiptType: ReceiptType;
  destinationType: DestinationType;
  confirmationStatus: ConfirmationStatus;
  confirmedAt: string | null;
  confirmedBy: UserRef | null;
  notes: string | null;
  isReversed: boolean;
  reversedAt: string | null;
  reverseReason: string | null;
  reversedBy: UserRef | null;
  reversalOfReceiptId: string | null;
  currentAccountId: string | null;
  currentAccountMovementId: string | null;
  currentAccount: {
    id: string;
    name: string;
    supplier: { id: string; tradeName: string };
  } | null;
  receiptMethod: { id: string; name: string; isCurrentAccountCredit: boolean };
  receivable: ReceiptReceivable;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentAccountForReceiptOption {
  id: string;
  name: string;
  supplier: { id: string; tradeName: string };
  balance: string;
  balanceStatus: 'POSITIVO' | 'ZERADO' | 'NEGATIVO';
}

export interface ReceiptSummary {
  receivedMonth: string;
  receivedYear: string;
  receiptsCount: number;
  pendingConfirmation: number;
  partialOpen: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ReceiptQuery {
  receiptFrom?: string;
  receiptTo?: string;
  supplierId?: string;
  actionTypeId?: string;
  receiptMethodId?: string;
  receiptType?: ReceiptType;
  confirmationStatus?: ConfirmationStatus;
  receivableStatus?: FinancialStatus;
  competenceMonth?: string;
  buyerId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface CreateReceiptPayload {
  receivableId: string;
  receiptDate: string;
  receiptMethodId: string;
  amount: number;
  receiptType: ReceiptType;
  currentAccountId?: string;
  notes?: string;
}

export interface UpdateReceiptPayload {
  receiptDate?: string;
  receiptMethodId?: string;
  amount?: number;
  receiptType?: ReceiptType;
  currentAccountId?: string;
  notes?: string;
  reason: string;
}

function cleanParams(query: object): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params[k] = v as string | number;
  }
  return params;
}

export async function listReceipts(query: ReceiptQuery): Promise<Paginated<Receipt>> {
  const { data } = await api.get<Paginated<Receipt>>('/receipts', { params: cleanParams(query) });
  return data;
}

export async function getReceiptsSummary(query: ReceiptQuery): Promise<ReceiptSummary> {
  const { data } = await api.get<ReceiptSummary>('/receipts/summary', { params: cleanParams(query) });
  return data;
}

export async function getReceipt(id: string): Promise<Receipt> {
  const { data } = await api.get<Receipt>(`/receipts/${id}`);
  return data;
}

export async function createReceipt(payload: CreateReceiptPayload): Promise<Receipt> {
  const { data } = await api.post<Receipt>('/receipts', payload);
  return data;
}

export async function updateReceipt(id: string, payload: UpdateReceiptPayload): Promise<Receipt> {
  const { data } = await api.patch<Receipt>(`/receipts/${id}`, payload);
  return data;
}

export async function confirmReceipt(id: string): Promise<Receipt> {
  const { data } = await api.patch<Receipt>(`/receipts/${id}/confirm`, {});
  return data;
}

export async function reverseReceipt(id: string, reason: string): Promise<Receipt> {
  const { data } = await api.patch<Receipt>(`/receipts/${id}/reverse`, { reason });
  return data;
}

export async function listActiveReceiptMethods(): Promise<ReceiptMethodOption[]> {
  const { data } = await api.get<ReceiptMethodOption[]>('/receipt-methods/active');
  return data;
}

export async function listAccountsForReceipt(supplierId: string): Promise<CurrentAccountForReceiptOption[]> {
  const { data } = await api.get<CurrentAccountForReceiptOption[]>('/current-accounts/options/for-receipt', {
    params: { supplierId },
  });
  return data;
}
