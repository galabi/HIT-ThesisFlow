import axios from 'axios';
import { useAuthStore } from '../store/auth.store.js';

const client = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!refreshing) {
        refreshing = client
          .post('/auth/refresh')
          .then((res) => {
            useAuthStore.getState().setAuth(res.data.user, res.data.accessToken);
            refreshing = null;
          })
          .catch(() => {
            useAuthStore.getState().clearAuth();
            refreshing = null;
            window.location.href = '/login';
          });
      }
      await refreshing;
      const newToken = useAuthStore.getState().accessToken;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return client(original);
      }
    }
    return Promise.reject(err);
  }
);

export default client;
