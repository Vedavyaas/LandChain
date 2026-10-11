export type Role =
  | 'ADMIN'
  | 'GOVERNMENT'
  | 'REGISTRAR'
  | 'OWNER'
  | 'BUYER'
  | 'BANK'
  | 'AUDITOR';

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: Role;
  organization?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  fullName: string;
  email: string;
  role: Role;
  organization?: string;
}
