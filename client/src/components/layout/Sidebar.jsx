import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { useUIStore } from '../../store/ui.store.js';
import { useAuthStore } from '../../store/auth.store.js';
import { Role } from '@hit/shared';

const navItems = [
  { label: 'לוח בקרה', href: '/dashboard', icon: LayoutDashboard, roles: null },
  { label: 'הצעות פרויקטים', href: '/proposals', icon: FileText, roles: null },
  { label: 'תיבת מועמדויות', href: '/proposals/inbox', icon: FolderKanban, roles: [Role.SUPERVISOR] },
  { label: 'פרויקטים', href: '/projects', icon: FolderKanban, roles: null },
  { label: 'התראות', href: '/notifications', icon: Bell, roles: null },
  {
    label: 'הגדרות פקולטה',
    href: '/admin/faculty',
    icon: Settings,
    roles: [Role.PROJECT_COORDINATOR, Role.FACULTY_SECRETARY],
  },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  const visible = navItems.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-white border-l border-border transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!sidebarCollapsed && (
          <span className="font-bold text-primary text-sm">HIT ThesisFlow</span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-muted transition-colors mr-auto"
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {visible.map((item) => {
          const active = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon size={18} className="shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
