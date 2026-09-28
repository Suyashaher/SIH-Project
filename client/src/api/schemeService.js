import API from './axios';

export const schemeService = {
  // Schemes CRUD
  createScheme: (data) => API.post('/admin/schemes', data),
  getAllSchemes: () => API.get('/admin/schemes'),
  getSchemeById: (id) => API.get(`/admin/schemes/${id}`),
  updateScheme: (id, data) => API.put(`/admin/schemes/${id}`, data),
  toggleStatus: (id) => API.patch(`/admin/schemes/${id}/toggle-status`),

  // Eligibility Rules
  addRule: (schemeId, data) => API.post(`/admin/schemes/${schemeId}/rules`, data),
  getRules: (schemeId) => API.get(`/admin/schemes/${schemeId}/rules`),
  updateRule: (ruleId, data) => API.put(`/admin/rules/${ruleId}`, data),
  deleteRule: (ruleId) => API.delete(`/admin/rules/${ruleId}`),

  // Document Requirements
  addDocument: (schemeId, data) => API.post(`/admin/schemes/${schemeId}/documents`, data),
  getDocuments: (schemeId) => API.get(`/admin/schemes/${schemeId}/documents`),
  updateDocument: (docId, data) => API.put(`/admin/documents/${docId}`, data),
  deleteDocument: (docId) => API.delete(`/admin/documents/${docId}`),

  // Application Fields
  addField: (schemeId, data) => API.post(`/admin/schemes/${schemeId}/fields`, data),
  getFields: (schemeId) => API.get(`/admin/schemes/${schemeId}/fields`),
  updateField: (fieldId, data) => API.put(`/admin/fields/${fieldId}`, data),
  deleteField: (fieldId) => API.delete(`/admin/fields/${fieldId}`),
  reorderFields: (schemeId, fieldOrders) => API.put(`/admin/schemes/${schemeId}/fields/reorder`, { fieldOrders }),

  // Selection Criteria
  addSelectionCriteria: (schemeId, data) => API.post(`/admin/schemes/${schemeId}/selection-criteria`, data),
  getSelectionCriteria: (schemeId) => API.get(`/admin/schemes/${schemeId}/selection-criteria`),
  updateSelectionCriteria: (criteriaId, data) => API.put(`/admin/selection-criteria/${criteriaId}`, data),
  deleteSelectionCriteria: (criteriaId) => API.delete(`/admin/selection-criteria/${criteriaId}`),
  updateTotalSeats: (schemeId, totalSeats) => API.put(`/admin/schemes/${schemeId}/total-seats`, { totalSeats }),

  // Selection Management
  calculateRankings: (schemeId) => API.post(`/selection/schemes/${schemeId}/calculate-rankings`),
  getSelectionList: (schemeId) => API.get(`/selection/schemes/${schemeId}/selection-list`),
  decideApplication: (applicationId, data) => API.post(`/selection/applications/${applicationId}/decide`, data),
  bulkDecide: (schemeId, data) => API.post(`/selection/schemes/${schemeId}/bulk-decide`, data),
};
