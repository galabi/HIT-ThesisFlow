import client from './client.js';

export const authApi = {
  login: (data) => client.post('/auth/login', data).then((r) => r.data),
  register: (data) => client.post('/auth/register', data).then((r) => r.data),
  logout: () => client.post('/auth/logout'),
  me: () => client.get('/auth/me').then((r) => r.data),
};
