import { api } from '@/services/api/client';
import type { UserRole } from '@/types';

export interface AuditLogUser {
  id: string;
  userNumber: number;
  name: string;
  role: UserRole;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: AuditLogUser | null;
}

export interface AuditQuery {
  userId?: string;
  userNumber?: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditListResponse {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listAuditLogs(query: AuditQuery): Promise<AuditListResponse> {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params[key] = value as string | number;
    }
  }
  const { data } = await api.get<AuditListResponse>('/audit-logs', { params });
  return data;
}
