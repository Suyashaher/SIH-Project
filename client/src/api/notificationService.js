import API from './axios';

export const notificationService = {
  getMyNotifications: (page = 1) => API.get(`/notifications?page=${page}`),
  markAsRead: (id) => API.patch(`/notifications/${id}/read`),
  markAllAsRead: () => API.patch('/notifications/read-all'),
  getPreferences: () => API.get('/notifications/preferences'),
  updatePreferences: (data) => API.put('/notifications/preferences', data),
};
