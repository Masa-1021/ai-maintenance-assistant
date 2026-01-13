// Equipment (設備マスタ)
export interface Equipment {
  id: string;
  equipmentId: string;
  equipmentName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEquipmentRequest {
  equipmentId: string;
  equipmentName: string;
}

export interface UpdateEquipmentRequest {
  equipmentId?: string;
  equipmentName?: string;
}

// Maintenance Record (メンテナンス記録)
export interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  symptom: string;
  cause: string;
  solution: string;
  pdfKey?: string;
  chatSessionId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecordRequest {
  equipmentId: string;
  symptom: string;
  cause: string;
  solution: string;
  pdfKey?: string;
  chatSessionId?: string;
}

export interface UpdateRecordRequest {
  symptom?: string;
  cause?: string;
  solution?: string;
}

export interface RecordFilter {
  equipmentId?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  limit?: number;
  nextToken?: string;
}

// Chat Session (チャットセッション)
export type ChatSessionStatus = 'active' | 'completed';

export interface ChatSession {
  id: string;
  userId: string;
  equipmentId: string;
  title: string;
  status: ChatSessionStatus;
  recordId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatSessionRequest {
  equipmentId: string;
  title?: string;
}

// Chat Message (チャットメッセージ)
export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  pdfKey?: string;
  createdAt: string;
}

export interface SendMessageRequest {
  content: string;
  pdfKey?: string;
}

// AI Extracted Info (AI抽出情報)
export interface ExtractedInfo {
  symptom: string | null;
  cause: string | null;
  solution: string | null;
  isComplete: boolean;
  missingFields: string[];
}

export interface SendMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  extractedInfo: ExtractedInfo;
}

// File (ファイル)
export interface UploadUrlResponse {
  uploadUrl: string;
  key: string;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
}

// API Response
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextToken?: string;
  count: number;
}

// Auth
export interface User {
  id: string;
  email: string;
}
