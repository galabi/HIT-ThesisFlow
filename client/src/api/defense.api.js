import api from './client.js';

export const defenseApi = {
  getForMilestone: (milestoneId) =>
    api.get(`/schedule/defense/milestones/${milestoneId}`).then((r) => r.data),

  create: (data) => api.post('/schedule/defense', data).then((r) => r.data),

  update: (id, data) => api.patch(`/schedule/defense/${id}`, data).then((r) => r.data),

  remove: (id) => api.delete(`/schedule/defense/${id}`).then((r) => r.data),
};
