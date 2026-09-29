import API from './axios';

export const adminService = {
  getOfficers: () => API.get('/admin/officers'),
  createOfficer: (data) => API.post('/admin/create-officer', data),
  updateOfficer: (id, data) => API.put(`/admin/officers/${id}`, data),
  toggleOfficerStatus: (id) => API.patch(`/admin/officers/${id}/toggle-status`),
  updateOfficerSchemes: (id, schemeIds) => API.put(`/admin/officers/${id}/schemes`, { schemeIds }),
  
  // Reuse existing scheme controller logic via admin routes
  getSchemes: () => API.get('/admin/schemes'),
  getApplications: (schemeId) => API.get('/admin/applications', { params: { schemeId } }),
  getAiInsights: () => API.get('/admin/ai-insights'),
  triggerRecalibration: () => API.post('/admin/ai-recalibrate'),
  getProcessingAnalytics: () => API.get('/admin/processing-analytics'),
  recalculateBenchmarks: () => API.post('/admin/recalculate-benchmarks'),
  
  // Dashboard & Analytics
  getDashboardOverview: (schemeId) => API.get('/admin/dashboard/overview', { params: schemeId ? { schemeId } : {} }),
  getDashboardByScheme: () => API.get('/admin/dashboard/by-scheme'),
  getVerificationStats: () => API.get('/admin/dashboard/verification-stats'),
  getDeficiencyStats: () => API.get('/admin/dashboard/deficiency-stats'),
  getSelectionStats: () => API.get('/admin/dashboard/selection-stats'),
  getOfficerStats: () => API.get('/admin/dashboard/officer-stats'),
  getOfficerLeaderboard: (period) => API.get('/admin/leaderboard', { params: { period } }),
  getFellowshipStats: () => API.get('/admin/dashboard/fellowship-stats'),
  exportData: (type, schemeId) => API.get('/admin/dashboard/export', {
    params: { type, ...(schemeId ? { schemeId } : {}) },
    responseType: 'blob',
  }),
};
