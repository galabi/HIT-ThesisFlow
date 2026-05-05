import client from './client.js';

export const proposalsApi = {
  list: (params) => client.get('/proposals', { params }).then((r) => r.data),
  get: (id) => client.get(`/proposals/${id}`).then((r) => r.data),
  create: (data) => client.post('/proposals', data).then((r) => r.data),
  update: (id, data) => client.patch(`/proposals/${id}`, data).then((r) => r.data),
  delete: (id) => client.delete(`/proposals/${id}`),
  publish: (id) => client.post(`/proposals/${id}/publish`).then((r) => r.data),
  close: (id) => client.post(`/proposals/${id}/close`).then((r) => r.data),

  // Student
  getMyApplications: () => client.get('/proposals/my-applications').then((r) => r.data),
  getMyApplication: (proposalId) =>
    client.get(`/proposals/${proposalId}/my-application`).then((r) => r.data),
  apply: (proposalId, data) =>
    client.post(`/proposals/${proposalId}/applications`, data).then((r) => r.data),

  // Supervisor
  getInbox: (params) =>
    client.get('/proposals/applications/inbox', { params }).then((r) => r.data),
  getApplications: (proposalId) =>
    client.get(`/proposals/${proposalId}/applications`).then((r) => r.data),
  approveApplication: (proposalId, appId) =>
    client.post(`/proposals/${proposalId}/applications/${appId}/approve`).then((r) => r.data),
  rejectApplication: (proposalId, appId) =>
    client.post(`/proposals/${proposalId}/applications/${appId}/reject`),
  requestMeeting: (proposalId, appId, data) =>
    client.post(`/proposals/${proposalId}/applications/${appId}/request-meeting`, data),
};
