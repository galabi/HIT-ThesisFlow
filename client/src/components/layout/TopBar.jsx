import { useAuth } from '../../hooks/useAuth.js';
import { NotificationBell } from '../notifications/NotificationBell.jsx';
import { LogOut, User } from 'lucide-react';

const roleLabels = {
  STUDENT: 'סטודנט',
  SUPERVISOR: 'מנחה',
  EXAMINER: 'בוחן',
  PROJECT_COORDINATOR: 'רכז פרויקטים',
  FACULTY_SECRETARY: 'מזכירות פקולטה',
};

export function TopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-border shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User size={16} />
          <span>
            {user?.firstName} {user?.lastName}
          </span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
            {roleLabels[user?.role] || user?.role}
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut size={16} />
          <span>יציאה</span>
        </button>
      </div>
    </header>
  );
}
