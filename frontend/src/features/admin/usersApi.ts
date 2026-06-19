import { api } from '@/services/api/client';
import type { UserRole } from '@/types';

export interface AdminUser {
  id: string;
  userNumber: number;
  name: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  userNumber: number;
  name: string;
  email?: string;
  password: string;
  role: UserRole;
  isActive: boolean;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
}

export async function listUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>('/users');
  return data;
}

export async function createUser(payload: CreateUserPayload): Promise<AdminUser> {
  const { data } = await api.post<AdminUser>('/users', payload);
  return data;
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<AdminUser> {
  const { data } = await api.put<AdminUser>(`/users/${id}`, payload);
  return data;
}

export async function setUserActive(
  id: string,
  isActive: boolean,
  reason?: string,
): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(`/users/${id}/active`, { isActive, reason });
  return data;
}

export async function resetUserPassword(
  id: string,
  password: string,
  reason: string,
): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(`/users/${id}/password`, { password, reason });
  return data;
}

export async function changeUserRole(
  id: string,
  role: UserRole,
  reason: string,
): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(`/users/${id}/role`, { role, reason });
  return data;
}
