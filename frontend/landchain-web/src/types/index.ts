export type Role =
  | 'ADMIN'
  | 'GOVERNMENT'
  | 'REGISTRAR'
  | 'OWNER'
  | 'BANK'
  | 'AUDITOR';

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: Role;
  organization?: string;
  enabled?: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  eventType: string;
  actor: string;
  target: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
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

/* ── Property Types (Step 2) ──────────────────────────────────────────────── */
export type PropertyStatus =
  | 'ACTIVE'
  | 'PENDING_TRANSFER'
  | 'FROZEN'
  | 'MORTGAGED';

export interface Property {
  id: number;
  propertyId: string;
  surveyNumber: string;
  address: string;
  village: string;
  taluk: string;
  district: string;
  area: string;
  propertyType: string;
  ownerUsername?: string;
  status: PropertyStatus;
  createdAt: string;
  documentCount?: number;
  documents?: PropertyDocument[];
}

export interface CreatePropertyRequest {
  surveyNumber: string;
  address: string;
  village: string;
  taluk: string;
  district: string;
  area: string;
  propertyType: string;
  ownerUsername?: string;
}

export interface UpdatePropertyRequest {
  surveyNumber?: string;
  address?: string;
  village?: string;
  taluk?: string;
  district?: string;
  area?: string;
  propertyType?: string;
  ownerUsername?: string;
  status?: PropertyStatus;
}

/* ── Document Types (Step 2) ──────────────────────────────────────────────── */
export type DocumentType =
  | 'SALE_DEED'
  | 'REGISTRATION_DOCUMENT'
  | 'TAX_DOCUMENT'
  | 'OTHER';

export interface PropertyDocument {
  id: number;
  documentId: string;
  propertyId: string;
  documentType: DocumentType;
  originalFileName: string;
  sha256Hash: string;
  uploadedAt: string;
}

export interface VerifyDocumentResponse {
  documentId: string;
  originalFileName: string;
  documentType: DocumentType;
  storedHash: string;
  uploadedHash: string;
  matches: boolean;
  status?: 'MATCH' | 'MISMATCH';
  message: string;
  verifiedAt: string;
}
