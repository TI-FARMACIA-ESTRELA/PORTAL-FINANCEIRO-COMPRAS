import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { NotificationDropdown } from '@/components';
import { formatDateTime } from '@/utils/format';
import { extractApiError } from '@/services/api/client';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationHref,
  refreshNotifications,
  type NotificationRecord,
} from './notificationsApi';

export function NotificationsBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const countQuery = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
  });

  const listQuery = useQuery({
    queryKey: ['notifications-list'],
    queryFn: () => listNotifications({ page: 1, pageSize: 15 }),
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
  };

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate,
    onError: (err) => toast.error(extractApiError(err)),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      invalidate();
      toast.success('Notificações marcadas como lidas');
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  const refreshMutation = useMutation({
    mutationFn: refreshNotifications,
    onSuccess: () => {
      invalidate();
      toast.success('Notificações atualizadas');
    },
    onError: (err) => toast.error(extractApiError(err)),
  });

  useEffect(() => {
    refreshNotifications()
      .then(() => invalidate())
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleItemClick = async (item: NotificationRecord) => {
    if (!item.read) {
      await markReadMutation.mutateAsync(item.id);
    }
    const href = notificationHref(item);
    if (href) navigate(href);
  };

  const items = (listQuery.data?.data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    message: item.message,
    createdAt: formatDateTime(item.createdAt),
    read: item.read,
    severity: item.severity,
    raw: item,
  }));

  return (
    <NotificationDropdown
      items={items}
      unreadCount={countQuery.data?.count ?? 0}
      loading={listQuery.isLoading || countQuery.isLoading}
      refreshing={refreshMutation.isPending}
      onMarkAsRead={(id) => {
        const item = listQuery.data?.data.find((n) => n.id === id);
        if (item) void handleItemClick(item);
      }}
      onMarkAllAsRead={() => markAllMutation.mutate()}
      onRefresh={() => refreshMutation.mutate()}
    />
  );
}
