import axios from 'axios';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  AuditLog,
  Property,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  PropertyDocument,
  DocumentType,
  VerifyDocumentResponse,
} from '../types';

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

export const propertyApi = {
  getAll: (query?: string, status?: string) =>
    api.get<Property[]>('/api/properties', { params: { query, status } }).then((r) => r.data),

  getById: (propertyId: string) =>
    api.get<Property>(`/api/properties/${propertyId}`).then((r) => r.data),

  getOwners: () =>
    api.get<User[]>('/api/properties/owners').then((r) => r.data),

  create: (data: CreatePropertyRequest) =>
    api.post<Property>('/api/properties', data).then((r) => r.data),

  update: (propertyId: string, data: UpdatePropertyRequest) =>
    api.put<Property>(`/api/properties/${propertyId}`, data).then((r) => r.data),
};

export const documentApi = {
  getByProperty: (propertyId: string) =>
    api.get<PropertyDocument[]>(`/api/properties/${propertyId}/documents`).then((r) => r.data),

  getInfo: (documentId: string) =>
    api.get<PropertyDocument>(`/api/documents/${documentId}/info`).then((r) => r.data),

  downloadUrl: (documentId: string) =>
    `http://localhost:8080/api/documents/${documentId}`,

  upload: (propertyId: string, file: File, documentType?: DocumentType) => {
    const formData = new FormData();
    formData.append('file', file);
    if (documentType) formData.append('documentType', documentType);
    return api.post<PropertyDocument>(
      `/api/properties/${propertyId}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then((r) => r.data);
  },

  verify: (documentId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<VerifyDocumentResponse>(
      `/api/documents/${documentId}/verify`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then((r) => r.data);
  },
};

export default api;
