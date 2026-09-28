import API from './axios';

export const officerService = {
  getMySchemes: () => API.get('/officer/my-schemes'),
  getApplications: (params) => API.get('/officer/applications', { params }),
  getApplicationById: (id) => API.get(`/officer/applications/${id}`),
  claimApplication: (id) => API.post(`/officer/applications/${id}/claim`),
  overrideDocument: (docId, data) => API.patch(`/officer/documents/${docId}/override`, data),
  checkEligibility: (id) => API.get(`/officer/applications/${id}/eligibility-check`),
  raiseDeficiency: (id, data) => API.post(`/officer/applications/${id}/deficiencies`, data),
  getDeficiencies: (id) => API.get(`/officer/applications/${id}/deficiencies`),
  updateStatus: (id, data) => API.patch(`/officer/applications/${id}/status`, data),
  saveRemarks: (id, remarks) => API.patch(`/officer/applications/${id}/remarks`, { remarks }),
  completeScrutiny: (id, remarks) => API.post(`/officer/applications/${id}/complete-scrutiny`, { remarks }),
};
