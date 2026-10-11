import axios from 'axios';
import type { AuthResponse, LoginRequest, RegisterRequest, User, AuditLog } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('lc_token');
      localStorage.removeItem('lc_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/api/auth/register', data).then((r) => r.data),

  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/api/auth/login', data).then((r) => r.data),

  me: () =>
    api.get<User>('/api/auth/me').then((r) => r.data),
};

export const adminApi = {
  getUsers: () =>
    api.get<User[]>('/api/admin/users').then((r) => r.data),

  toggleUserStatus: (id: number) =>
    api.patch<User>(`/api/admin/users/${id}/toggle-status`).then((r) => r.data),

  getLogs: () =>
    api.get<AuditLog[]>('/api/admin/logs').then((r) => r.data),
};

export default api;
