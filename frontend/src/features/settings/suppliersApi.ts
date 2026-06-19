import { api } from '@/services/api/client';

export type SupplierType =
  | 'INDUSTRIA'
  | 'LABORATORIO'
  | 'DISTRIBUIDOR'
  | 'FORNECEDOR'
  | 'OUTRO';

export interface Supplier {
  id: string;
  tradeName: string;
  legalName: string | null;
  cnpj: string | null;
  supplierType: SupplierType;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierQuery {
  search?: string;
  active?: string;
  supplierType?: SupplierType;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SupplierPayload {
  tradeName: string;
  legalName?: string;
  cnpj?: string;
  supplierType: SupplierType;
  notes?: string;
}

function cleanParams(query: object): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params[k] = v as string | number;
  }
  return params;
}

export async function listSuppliers(query: SupplierQuery): Promise<Paginated<Supplier>> {
  const { data } = await api.get<Paginated<Supplier>>('/suppliers', {
    params: cleanParams(query),
  });
  return data;
}

export async function createSupplier(payload: SupplierPayload): Promise<Supplier> {
  const { data } = await api.post<Supplier>('/suppliers', payload);
  return data;
}

export async function updateSupplier(id: string, payload: SupplierPayload): Promise<Supplier> {
  const { data } = await api.patch<Supplier>(`/suppliers/${id}`, payload);
  return data;
}

export async function setSupplierActive(
  id: string,
  isActive: boolean,
  reason?: string,
): Promise<Supplier> {
  const { data } = await api.patch<Supplier>(`/suppliers/${id}/active`, { isActive, reason });
  return data;
}

export const supplierTypeLabel: Record<SupplierType, string> = {
  INDUSTRIA: 'Indústria',
  LABORATORIO: 'Laboratório',
  DISTRIBUIDOR: 'Distribuidor',
  FORNECEDOR: 'Fornecedor',
  OUTRO: 'Outro',
};
