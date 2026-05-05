import client from './client.js';

export const documentsApi = {
  presign: (data) => client.post('/documents/presign', data).then((r) => r.data),
  confirm: (data) => client.post('/documents/confirm', data).then((r) => r.data),
  download: (id) => client.get(`/documents/${id}/download`).then((r) => r.data),
};
