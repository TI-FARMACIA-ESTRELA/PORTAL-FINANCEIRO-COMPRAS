import { api } from '@/services/api/client';

export type NotificationType =
  | 'RECEIVABLE_OVERDUE'
  | 'RECEIVABLE_DUE_TODAY'
  | 'RECEIVABLE_DUE_SOON'
  | 'RECEIPT_PENDING_CONFIRMATION'
  | 'RECEIPT_REGISTERED'
  | 'RECEIPT_CONFIRMED'
  | 'RECEIPT_REVERSED'
  | 'CURRENT_ACCOUNT_NEGATIVE'
  | 'CURRENT_ACCOUNT_SHARED'
  | 'CURRENT_ACCOUNT_SHARED_MOVEMENT'
  | 'CURRENT_ACCOUNT_MOVEMENT_REVERSED';

export type NotificationSeverity = 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  severity: NotificationSeverity;
  metadata: Record<string, unknown> | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationQuery {
  unreadOnly?: boolean;
  type?: NotificationType;
  severity?: NotificationSeverity;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface NotificationListResponse {
  data: NotificationRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listNotifications(
  query: NotificationQuery = {},
): Promise<NotificationListResponse> {
  const params = {
    ...query,
    unreadOnly: query.unreadOnly ? 'true' : undefined,
  };
  const { data } = await api.get<NotificationListResponse>('/notifications', { params });
  return data;
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const { data } = await api.get<{ count: number }>('/notifications/unread-count');
  return data;
}

export async function refreshNotifications(): Promise<NotificationListResponse> {
  const { data } = await api.post<NotificationListResponse>('/notifications/refresh');
  return data;
}

export async function markNotificationRead(id: string): Promise<NotificationRecord> {
  const { data } = await api.patch<NotificationRecord>(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const { data } = await api.patch<{ updated: number }>('/notifications/read-all');
  return data;
}

/** Resolve rota de navegação a partir do vínculo da notificação. */
export function notificationHref(item: NotificationRecord): string | null {
  if (item.entityType === 'Receivable') return '/lancamentos';
  if (item.entityType === 'ReceivableReceipt') return '/recebimentos';
  if (item.entityType === 'CurrentAccount' && item.entityId) {
    return `/conta-corrente/${item.entityId}`;
  }
  if (item.entityType === 'CurrentAccountMovement') {
    const accountId = item.metadata?.currentAccountId;
    if (typeof accountId === 'string') return `/conta-corrente/${accountId}`;
  }
  return null;
}
