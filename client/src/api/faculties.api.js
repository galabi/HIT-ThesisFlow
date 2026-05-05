import client from './client.js';

export const facultiesApi = {
  list: () => client.get('/faculties').then((r) => r.data),
  get: (id) => client.get(`/faculties/${id}`).then((r) => r.data),
  update: (id, data) => client.patch(`/faculties/${id}`, data).then((r) => r.data),

  getMilestoneConfigs: (facultyId) =>
    client.get(`/faculties/${facultyId}/milestone-configs`).then((r) => r.data),
  createMilestoneConfig: (facultyId, data) =>
    client.post(`/faculties/${facultyId}/milestone-configs`, data).then((r) => r.data),
  updateMilestoneConfig: (facultyId, configId, data) =>
    client
      .patch(`/faculties/${facultyId}/milestone-configs/${configId}`, data)
      .then((r) => r.data),
  deleteMilestoneConfig: (facultyId, configId) =>
    client.delete(`/faculties/${facultyId}/milestone-configs/${configId}`),

  getWeights: (facultyId) =>
    client.get(`/faculties/${facultyId}/weights`).then((r) => r.data),
  updateWeights: (facultyId, weights) =>
    client.put(`/faculties/${facultyId}/weights`, weights).then((r) => r.data),
};
