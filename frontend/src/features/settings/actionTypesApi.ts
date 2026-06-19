import { api } from '@/services/api/client';
import type { Paginated } from './suppliersApi';

export interface ActionType {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActionTypeQuery {
  search?: string;
  active?: string;
  page?: number;
  pageSize?: number;
}

export interface ActionTypePayload {
  name: string;
  description?: string;
}

function cleanParams(query: object): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params[k] = v as string | number;
  }
  return params;
}

export async function listActionTypes(query: ActionTypeQuery): Promise<Paginated<ActionType>> {
  const { data } = await api.get<Paginated<ActionType>>('/action-types', {
    params: cleanParams(query),
  });
  return data;
}

export async function createActionType(payload: ActionTypePayload): Promise<ActionType> {
  const { data } = await api.post<ActionType>('/action-types', payload);
  return data;
}

export async function updateActionType(
  id: string,
  payload: ActionTypePayload,
): Promise<ActionType> {
  const { data } = await api.patch<ActionType>(`/action-types/${id}`, payload);
  return data;
}

export async function setActionTypeActive(
  id: string,
  isActive: boolean,
  reason?: string,
): Promise<ActionType> {
  const { data } = await api.patch<ActionType>(`/action-types/${id}/active`, { isActive, reason });
  return data;
}
