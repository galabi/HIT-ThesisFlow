import client from './client.js';

export const defenseApi = {
  getForMilestone: (milestoneId) =>
    client.get(`/schedule/defense/milestones/${milestoneId}`).then((r) => r.data),

  create: (data) => client.post('/schedule/defense', data).then((r) => r.data),

  update: (id, data) => client.patch(`/schedule/defense/${id}`, data).then((r) => r.data),

  remove: (id) => client.delete(`/schedule/defense/${id}`).then((r) => r.data),
};
