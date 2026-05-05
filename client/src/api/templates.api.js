import client from './client.js';

export const templatesApi = {
  get: (configId) => client.get(`/templates/${configId}`).then((r) => r.data),
  save: (configId, data) => client.put(`/templates/${configId}`, data).then((r) => r.data),
  updateField: (configId, fieldId, data) =>
    client.patch(`/templates/${configId}/fields/${fieldId}`, data).then((r) => r.data),
};
