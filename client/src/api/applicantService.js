import API from './axios';

export const applicantSchemeService = {
  getActiveSchemes: () => API.get('/schemes'),
  getSchemeDetails: (id) => API.get(`/schemes/${id}/details`),
  checkEligibility: (id, answers) => API.post(`/schemes/${id}/check-eligibility`, answers),
};

export const applicationService = {
  create: (schemeId) => API.post('/applications', { schemeId }),
  getAll: () => API.get('/applications'),
  getById: (id) => API.get(`/applications/${id}`),
  saveFields: (id, fieldValues) => API.put(`/applications/${id}/fields`, { fieldValues }),
  submit: (id) => API.post(`/applications/${id}/submit`),
  uploadDocument: (appId, formData) => API.post(`/applications/${appId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteDocument: (appId, docId) => API.delete(`/applications/${appId}/documents/${docId}`),
  predictEta: (id) => API.post(`/applications/${id}/predict-eta`),
};
