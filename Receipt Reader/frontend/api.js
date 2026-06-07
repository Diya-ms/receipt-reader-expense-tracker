// File: frontend/src/utils/api.js
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---- Auth ----
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// ---- Receipts ----
export const receiptsAPI = {
  upload: (formData) => api.post('/receipts/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getImage: (filename) => `${BASE_URL}/receipts/uploads/${filename}`,
};

// ---- Expenses ----
export const expensesAPI = {
  list: (params) => api.get('/expenses/', { params }),
  create: (data) => api.post('/expenses/', data),
  get: (id) => api.get(`/expenses/${id}`),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  bulkDelete: (ids) => api.post('/expenses/bulk-delete', { ids }),
};

// ---- Dashboard ----
export const dashboardAPI = {
  summary: () => api.get('/dashboard/summary'),
  byCategory: (days = 30) => api.get('/dashboard/by-category', { params: { days } }),
  monthlyTrend: (months = 12) => api.get('/dashboard/monthly-trend', { params: { months } }),
  weeklyTrend: () => api.get('/dashboard/weekly-trend'),
  recentExpenses: (limit = 10) => api.get('/dashboard/recent-expenses', { params: { limit } }),
};

// ---- Export ----
export const exportAPI = {
  csv: (params) => api.get('/export/csv', { params, responseType: 'blob' }),
  excel: (params) => api.get('/export/excel', { params, responseType: 'blob' }),
  pdf: (params) => api.get('/export/pdf', { params, responseType: 'blob' }),
};

// ---- Insights ----
export const insightsAPI = {
  prediction: () => api.get('/insights/prediction'),
  categoryPredictions: () => api.get('/insights/category-predictions'),
  budgetSuggestions: () => api.get('/insights/budget-suggestions'),
  summary: () => api.get('/insights/summary'),
};

export default api;
