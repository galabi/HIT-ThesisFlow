import client from './client.js';

export const assignmentsApi = {
  getForMilestone: (milestoneId) =>
    client.get(`/assignments/milestones/${milestoneId}`).then((r) => r.data),

  create: (data) => client.post('/assignments', data).then((r) => r.data),

  remove: (id) => client.delete(`/assignments/${id}`).then((r) => r.data),
};
