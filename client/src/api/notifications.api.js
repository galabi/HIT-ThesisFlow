import client from './client.js';

export const notificationsApi = {
  list: (params) => client.get('/notifications', { params }).then((r) => r.data),
  markRead: (id) => client.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => client.post('/notifications/read-all').then((r) => r.data),
  delete: (id) => client.delete(`/notifications/${id}`),
};
