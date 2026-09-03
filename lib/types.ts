export type Role = 'admin' | 'member' | 'viewer';

export interface Tenant {
  id: string;
  name: string;
}

export interface UserIdentity {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  tenant: Tenant;
}

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt: string;
  status?: 'waiting' | 'generating' | 'complete' | 'cancelled' | 'failed';
  sources?: Citation[];
  metrics?: GenerationMetrics;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface Citation {
  id: string;
  documentId: string;
  filename: string;
  page: number | null;
  relevance: number;
  excerpt: string;
  originalUrl?: string;
}

export interface GenerationMetrics {
  promptTokens?: number;
  completionTokens?: number;
  durationMs?: number;
  queuePosition?: number;
}

export type DocumentState = 'uploading' | 'ocr_processing' | 'embedding' | 'ready' | 'failed';

export interface KnowledgeDocument {
  id: string;
  filename: string;
  sizeBytes: number;
  status: DocumentState;
  uploadedAt: string;
  uploadedBy: string;
  error?: string;
  pages?: number;
  originalUrl?: string;
}

export interface ModelInfo {
  id: string;
  owned_by?: string;
}

/** A browser-safe description. Private URL and API key remain server-only. */
export interface ComputeServer {
  id: string;
  name: string;
  protocol?: 'ollama' | 'fastapi';
}

export interface ServerHealth {
  ok: boolean;
  status: 'online' | 'unavailable' | 'degraded';
  checkedAt: string;
  detail?: string;
}

export interface AdminMetrics {
  activeUsers: number;
  conversationsToday: number;
  documentsReady: number;
  averageLatencyMs: number;
}
