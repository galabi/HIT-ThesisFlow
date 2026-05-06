import client from './client.js';

export const gradesApi = {
  submit: (milestoneId, data) =>
    client.post(`/grades/milestones/${milestoneId}`, data).then((r) => r.data),
  getAll: (milestoneId) =>
    client.get(`/grades/milestones/${milestoneId}`).then((r) => r.data),
  getMine: (milestoneId) =>
    client.get(`/grades/milestones/${milestoneId}/my`).then((r) => r.data),
};
