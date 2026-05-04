import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store.js';

export function RoleGuard({ roles, children }) {
  const user = useAuthStore((s) => s.user);

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
