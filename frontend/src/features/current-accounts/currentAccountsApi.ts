import { api } from '@/services/api/client';

export type BalanceStatus = 'POSITIVO' | 'ZERADO' | 'NEGATIVO';
export type MovementType =
  | 'ENTRADA'
  | 'SAIDA'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'ESTORNO';

export interface UserRef {
  id: string;
  userNumber: number;
  name: string;
}

export interface UserOption extends UserRef {
  role: 'ADMIN' | 'COMPRADOR' | 'DIRETORIA';
}

export interface AccessLevel {
  view: boolean;
  move: boolean;
  edit: boolean;
}

export interface ShareEntry {
  id: string;
  user: UserRef;
  canView: boolean;
  canMove: boolean;
  canEdit: boolean;
}

export interface CurrentAccount {
  id: string;
  name: string;
  supplier: { id: string; tradeName: string };
  owner: UserRef;
  notes: string | null;
  isActive: boolean;
  balance: string;
  totalEntries: string;
  totalExits: string;
  totalPositiveAdjustments: string;
  totalNegativeAdjustments: string;
  balanceStatus: BalanceStatus;
  movementsCount: number;
  lastMovementAt: string | null;
  shares: ShareEntry[];
  access: AccessLevel;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentAccountMovement {
  id: string;
  type: MovementType;
  sign: '+' | '-' | '';
  movementDate: string;
  amount: string;
  receiptMethod: { id: string; name: string } | null;
  actionType: { id: string; name: string } | null;
  description: string | null;
  notes: string | null;
  isReversed: boolean;
  reversedAt: string | null;
  reverseReason: string | null;
  reversedBy: UserRef | null;
  reversalOfMovementId: string | null;
  receivableId: string | null;
  receivableReceiptId: string | null;
  origin: 'RECEIPT' | null;
  receivableLink: {
    id: string;
    competenceMonth: string;
    supplier: { id: string; tradeName: string };
    actionType: { id: string; name: string };
  } | null;
  receiptLink: {
    id: string;
    receiptDate: string;
    amount: string;
    confirmationStatus: string;
  } | null;
  createdBy: UserRef;
  balanceAfter: string | null;
  createdAt: string;
}

export interface CurrentAccountSummary {
  totalBalance: string;
  totalEntries: string;
  totalExits: string;
  accountsCount: number;
  positiveCount: number;
  zeroCount: number;
  negativeCount: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CurrentAccountQuery {
  supplierId?: string;
  ownerUserId?: string;
  balanceStatus?: BalanceStatus;
  active?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

export interface MovementQuery {
  from?: string;
  to?: string;
  type?: MovementType;
  receiptMethodId?: string;
  actionTypeId?: string;
  userId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface CreateAccountPayload {
  supplierId: string;
  name: string;
  ownerUserId?: string;
  notes?: string;
}

export interface UpdateAccountPayload {
  name?: string;
  notes?: string;
  ownerUserId?: string;
}

export interface SharePayload {
  userId: string;
  canView?: boolean;
  canMove?: boolean;
  canEdit?: boolean;
}

export interface EntryPayload {
  movementDate: string;
  amount: number;
  receiptMethodId: string;
  description?: string;
  notes?: string;
}

export interface ExitPayload {
  movementDate: string;
  amount: number;
  actionTypeId: string;
  description?: string;
  notes?: string;
}

export interface AdjustmentPayload {
  movementDate: string;
  amount: number;
  direction: 'POSITIVO' | 'NEGATIVO';
  reason: string;
  description?: string;
  notes?: string;
}

function cleanParams(query: object): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params[k] = v as string | number;
  }
  return params;
}

export async function listCurrentAccounts(query: CurrentAccountQuery): Promise<Paginated<CurrentAccount>> {
  const { data } = await api.get<Paginated<CurrentAccount>>('/current-accounts', {
    params: cleanParams(query),
  });
  return data;
}

export async function getCurrentAccountsSummary(query: CurrentAccountQuery): Promise<CurrentAccountSummary> {
  const { data } = await api.get<CurrentAccountSummary>('/current-accounts/summary', {
    params: cleanParams(query),
  });
  return data;
}

export async function getCurrentAccount(id: string): Promise<CurrentAccount> {
  const { data } = await api.get<CurrentAccount>(`/current-accounts/${id}`);
  return data;
}

export async function listCurrentAccountUserOptions(): Promise<UserOption[]> {
  const { data } = await api.get<UserOption[]>('/current-accounts/options/users');
  return data;
}

export async function createCurrentAccount(payload: CreateAccountPayload): Promise<CurrentAccount> {
  const { data } = await api.post<CurrentAccount>('/current-accounts', payload);
  return data;
}

export async function updateCurrentAccount(id: string, payload: UpdateAccountPayload): Promise<CurrentAccount> {
  const { data } = await api.patch<CurrentAccount>(`/current-accounts/${id}`, payload);
  return data;
}

export async function setCurrentAccountActive(
  id: string,
  isActive: boolean,
  reason?: string,
): Promise<CurrentAccount> {
  const { data } = await api.patch<CurrentAccount>(`/current-accounts/${id}/active`, { isActive, reason });
  return data;
}

export async function shareCurrentAccount(id: string, payload: SharePayload): Promise<CurrentAccount> {
  const { data } = await api.patch<CurrentAccount>(`/current-accounts/${id}/share`, payload);
  return data;
}

export async function listCurrentAccountMovements(
  id: string,
  query: MovementQuery,
): Promise<Paginated<CurrentAccountMovement>> {
  const { data } = await api.get<Paginated<CurrentAccountMovement>>(`/current-accounts/${id}/movements`, {
    params: cleanParams(query),
  });
  return data;
}

export async function createEntryMovement(id: string, payload: EntryPayload): Promise<CurrentAccount> {
  const { data } = await api.post<CurrentAccount>(`/current-accounts/${id}/movements/entry`, payload);
  return data;
}

export async function createExitMovement(id: string, payload: ExitPayload): Promise<CurrentAccount> {
  const { data } = await api.post<CurrentAccount>(`/current-accounts/${id}/movements/exit`, payload);
  return data;
}

export async function createAdjustmentMovement(id: string, payload: AdjustmentPayload): Promise<CurrentAccount> {
  const { data } = await api.post<CurrentAccount>(`/current-accounts/${id}/movements/adjustment`, payload);
  return data;
}

export async function reverseMovement(id: string, movementId: string, reason: string): Promise<CurrentAccount> {
  const { data } = await api.patch<CurrentAccount>(
    `/current-accounts/${id}/movements/${movementId}/reverse`,
    { reason },
  );
  return data;
}
