import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { TopBar } from './TopBar.jsx';
import { useSocket } from '../../hooks/useSocket.js';
import { useInitNotifications } from '../../hooks/useNotifications.js';

export function AppShell() {
  useSocket();
  useInitNotifications();

  return (
    <div className="flex h-screen overflow-hidden" dir="rtl">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6 bg-muted/30">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
