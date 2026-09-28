import API from './axios';

export const fellowshipAdminService = {
  getAll: (params) => API.get('/admin/fellowships', { params }),
  getById: (id) => API.get(`/admin/fellowships/${id}`),
  updateStatus: (id, data) => API.patch(`/admin/fellowships/${id}/status`, data),
  getDisbursements: (id) => API.get(`/admin/fellowships/${id}/disbursements`),
  processDisbursement: (id, data) => API.patch(`/admin/disbursements/${id}/process`, data),
  holdDisbursement: (id, data) => API.patch(`/admin/disbursements/${id}/hold`, data),
  checkOverdue: () => API.post('/admin/check-overdue'),
  addDocRequirement: (id, data) => API.post(`/admin/fellowships/${id}/document-requirements`, data),
  getDocRequirements: (id) => API.get(`/admin/fellowships/${id}/document-requirements`),
  reviewDocument: (id, data) => API.patch(`/admin/fellowship-documents/${id}/review`, data),
  sendMessage: (id, data) => API.post(`/admin/fellowships/${id}/communicate`, data),
};

export const fellowshipApplicantService = {
  getMyFellowship: () => API.get('/applicant/my-fellowship'),
  getDocRequirements: (id) => API.get(`/applicant/fellowships/${id}/document-requirements`),
  submitDocument: (fellowshipId, reqId, formData) => API.post(
    `/applicant/fellowships/${fellowshipId}/documents/${reqId}/submit`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  ),
  getCommunications: (id) => API.get(`/applicant/fellowships/${id}/communications`),
};
