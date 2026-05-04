import { Bell } from 'lucide-react';
import { useNotificationStore } from '../../store/notification.store.js';
import { Link } from 'react-router-dom';

export function NotificationBell() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <Link to="/notifications" className="relative p-2 rounded-md hover:bg-muted transition-colors">
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white font-bold">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
