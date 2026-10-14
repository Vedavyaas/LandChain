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
  blockchainTxId?: string;
  blockchainBlockNumber?: number;
  createdAt: string;
  documentCount?: number;
  documents?: PropertyDocument[];
}

export interface CreatePropertyRequest {
  propertyId?: string;
  surveyNumber: string;
  address: string;
  village: string;
  taluk: string;
  district: string;
  area: string;
  propertyType: string;
  ownerUsername?: string;
}

export interface BlockchainHistoryRecord {
  txId: string;
  blockNumber: number;
  timestamp: string;
  propertyId: string;
  action: string;
  previousOwner?: string;
  newOwner?: string;
  status: string;
  actor: string;
  actorMsp: string;
  details: string;
}

export interface BlockchainTransaction {
  txId: string;
  blockNumber: number;
  timestamp: string;
  channelName: string;
  chaincodeName: string;
  functionName: string;
  creatorMspId: string;
  creator: string;
  payloadJson: string;
  validationCode: string;
  blockHash: string;
  previousBlockHash?: string;
}

export interface BlockchainBlock {
  blockNumber: number;
  blockHash: string;
  previousBlockHash: string;
  timestamp: string;
  transactionCount: number;
  transactions: BlockchainTransaction[];
  channelName: string;
  dataHash?: string;
}

export interface BlockchainOverview {
  blockHeight: number;
  totalTransactions: number;
  lastBlockHash: string;
  genesisBlockHash: string;
  channelName: string;
  chaincodeName: string;
  networkAvailable: boolean;
  totalProperties: number;
  totalDocuments: number;
  totalTransfers: number;
}

export interface BlockchainTransferRecord {
  transferId: string;
  propertyId: string;
  currentOwner: string;
  newOwner: string;
  deedDocumentId?: string;
  deedSha256Hash?: string;
  status:
    | 'INITIATED'
    | 'PENDING_BUYER_ACCEPTANCE'
    | 'PENDING_OWNER_ACCEPTANCE'
    | 'PENDING_REGISTRAR'
    | 'APPROVED'
    | 'REJECTED'
    | 'CANCELLED';
  initiatedBy: string;
  initiatedAt: string;
  ownerAccepted?: boolean;
  ownerAcceptedAt?: string;
  buyerAccepted?: boolean;
  buyerAcceptedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  cancellationReason?: string;
  remarks?: string;
  txId: string;
  blockNumber: number;
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
  | 'CONVEYANCE_DEED'
  | 'MUTATION_CERTIFICATE'
  | 'ENCUMBRANCE_CERTIFICATE'
  | 'TAX_CLEARANCE'
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
  blockchainTxId?: string;
  blockchainBlockNumber?: number;
  uploadedAt: string;
}

export interface VerifyDocumentResponse {
  documentId: string;
  originalFileName: string;
  documentType: DocumentType;
  storedHash: string;
  uploadedHash: string;
  blockchainHash?: string;
  blockchainVerified?: boolean;
  blockchainTxId?: string;
  matches: boolean;
  status?: 'MATCH' | 'MISMATCH';
  message: string;
  verifiedAt: string;
}

export interface BuyRequest {
  id: number;
  requestId: string;
  propertyId: string;
  buyerUsername: string;
  offeredPrice: number;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}
