import api from './client.js';

export const assignmentsApi = {
  getForMilestone: (milestoneId) =>
    api.get(`/assignments/milestones/${milestoneId}`).then((r) => r.data),

  create: (data) => api.post('/assignments', data).then((r) => r.data),

  remove: (id) => api.delete(`/assignments/${id}`).then((r) => r.data),
};
