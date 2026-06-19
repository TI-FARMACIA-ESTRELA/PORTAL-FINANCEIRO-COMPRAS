import { api } from '@/services/api/client';
import type { AuthUser } from '@/types';

export interface LoginPayload {
  userNumber: number;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function meRequest(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}

export async function refreshRequest(): Promise<{ accessToken: string; user: AuthUser }> {
  const { data } = await api.post<{ accessToken: string; user: AuthUser }>('/auth/refresh');
  return data;
}

export async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout');
}
