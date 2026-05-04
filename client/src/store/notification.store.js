import { create } from 'zustand';

export const useNotificationStore = create((set, get) => ({
  unreadCount: 0,
  recent: [],
  setUnreadCount: (count) => set({ unreadCount: count }),
  addNotification: (notification) =>
    set((state) => ({
      unreadCount: state.unreadCount + 1,
      recent: [notification, ...state.recent].slice(0, 10),
    })),
  markRead: (id) =>
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - 1),
      recent: state.recent.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    })),
  markAllRead: () =>
    set((state) => ({
      unreadCount: 0,
      recent: state.recent.map((n) => ({ ...n, isRead: true })),
    })),
}));
