import client from './client.js';

export const projectsApi = {
  list: () => client.get('/projects').then((r) => r.data),
  get: (id) => client.get(`/projects/${id}`).then((r) => r.data),
  getGradeSummary: (id) => client.get(`/projects/${id}/grade-summary`).then((r) => r.data),

  submitMilestone: (projectId, milestoneId, data) =>
    client.post(`/projects/${projectId}/milestones/${milestoneId}/submit`, data).then((r) => r.data),

  coordinatorApprove: (projectId, milestoneId) =>
    client
      .post(`/projects/${projectId}/milestones/${milestoneId}/coordinator-approve`)
      .then((r) => r.data),
};
