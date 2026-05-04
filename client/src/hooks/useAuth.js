import { useAuthStore } from '../store/auth.store.js';
import { authApi } from '../api/auth.api.js';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const { user, accessToken, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    setAuth(data.user, data.accessToken);
    return data.user;
  };

  const logout = async () => {
    await authApi.logout().catch(() => {});
    clearAuth();
    navigate('/login');
  };

  return { user, accessToken, isAuthenticated: !!accessToken, login, logout };
}
