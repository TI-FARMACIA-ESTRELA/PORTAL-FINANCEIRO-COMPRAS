import { api } from '@/services/api/client';
import type { Paginated } from './suppliersApi';

export interface ReceiptMethod {
  id: string;
  name: string;
  description: string | null;
  isCurrentAccountCredit: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptMethodQuery {
  search?: string;
  active?: string;
  page?: number;
  pageSize?: number;
}

export interface ReceiptMethodPayload {
  name: string;
  description?: string;
  isCurrentAccountCredit: boolean;
}

function cleanParams(query: object): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params[k] = v as string | number;
  }
  return params;
}

export async function listReceiptMethods(
  query: ReceiptMethodQuery,
): Promise<Paginated<ReceiptMethod>> {
  const { data } = await api.get<Paginated<ReceiptMethod>>('/receipt-methods', {
    params: cleanParams(query),
  });
  return data;
}

export async function createReceiptMethod(
  payload: ReceiptMethodPayload,
): Promise<ReceiptMethod> {
  const { data } = await api.post<ReceiptMethod>('/receipt-methods', payload);
  return data;
}

export async function updateReceiptMethod(
  id: string,
  payload: ReceiptMethodPayload,
): Promise<ReceiptMethod> {
  const { data } = await api.patch<ReceiptMethod>(`/receipt-methods/${id}`, payload);
  return data;
}

export async function setReceiptMethodActive(
  id: string,
  isActive: boolean,
  reason?: string,
): Promise<ReceiptMethod> {
  const { data } = await api.patch<ReceiptMethod>(`/receipt-methods/${id}/active`, {
    isActive,
    reason,
  });
  return data;
}
