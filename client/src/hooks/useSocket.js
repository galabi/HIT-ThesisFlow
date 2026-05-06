import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store.js';
import { useNotificationStore } from '../store/notification.store.js';

export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const qc = useQueryClient();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!accessToken) return;

    socketRef.current = io('/', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socketRef.current.on('notification:new', (notification) => {
      addNotification(notification);
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [accessToken, addNotification, qc]);

  return socketRef.current;
}
