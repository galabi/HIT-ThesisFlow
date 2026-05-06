import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';
import { useNotificationStore } from '../store/notification.store.js';

const fetchNotifications = ({ unread, page = 1, limit = 20 } = {}) =>
  api
    .get('/notifications', { params: { ...(unread ? { unread: 'true' } : {}), page, limit } })
    .then((r) => r.data);

export function useNotifications({ unread, page, limit } = {}) {
  return useQuery({
    queryKey: ['notifications', { unread, page, limit }],
    queryFn: () => fetchNotifications({ unread, page, limit }),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () =>
      api.get('/notifications', { params: { unread: 'true', limit: 1 } }).then((r) => r.data.total),
    staleTime: 60_000,
  });
}

// Call once from AppShell to seed the Zustand unreadCount from the API
export function useInitNotifications() {
  const { data: count } = useUnreadCount();
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  useEffect(() => {
    if (count !== undefined) setUnreadCount(count);
  }, [count, setUnreadCount]);
}

export function useMarkRead() {
  const qc = useQueryClient();
  const markRead = useNotificationStore((s) => s.markRead);
  return useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
    onSuccess: (_data, id) => {
      markRead(id);
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  return useMutation({
    mutationFn: () => api.post('/notifications/read-all').then((r) => r.data),
    onSuccess: () => {
      markAllRead();
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
