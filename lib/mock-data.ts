import type { AdminMetrics, ComputeServer, KnowledgeDocument, ModelInfo, ServerHealth, UserIdentity } from './types';

export const mockDocuments: KnowledgeDocument[] = [
  { id: 'doc-vendor-policy', filename: 'Vendor Onboarding Policy.pdf', sizeBytes: 2_460_000, status: 'ready', uploadedAt: '2026-09-02T08:15:00Z', uploadedBy: 'Aarushi Gupta', pages: 14, originalUrl: 'https://example.invalid/documents/vendor-policy' },
  { id: 'doc-retention', filename: 'Records Retention Schedule.pdf', sizeBytes: 840_000, status: 'embedding', uploadedAt: '2026-09-02T09:10:00Z', uploadedBy: 'Aarushi Gupta', pages: 7 },
  { id: 'doc-risk', filename: 'Third-party Risk Standard.pdf', sizeBytes: 1_720_000, status: 'ocr_processing', uploadedAt: '2026-09-02T09:34:00Z', uploadedBy: 'Aarushi Gupta', pages: 11 },
];
export const mockModels: ModelInfo[] = [{ id: 'gemma3:4b-it-qat', owned_by: 'library' }, { id: 'gemma4:e2b-it-qat', owned_by: 'library' }];
export const mockServers: ComputeServer[] = [{ id: 'secondary-laptop', name: 'Secondary laptop · Gemma 3 4B', protocol: 'fastapi' }, { id: 'primary-laptop', name: 'Primary laptop · Ollama / Gemma', protocol: 'ollama' }];
export const mockHealth: ServerHealth = { ok: true, status: 'online', checkedAt: new Date().toISOString() };
export const mockMetrics: AdminMetrics = { activeUsers: 12, conversationsToday: 38, documentsReady: 47, averageLatencyMs: 1240 };
export const mockUsers: UserIdentity[] = [
  { id: 'u-1', email: 'aarushi@example.com', displayName: 'Aarushi Gupta', role: 'admin', tenant: { id: 'mccia-demo', name: 'MCCIA Demo' } },
  { id: 'u-2', email: 'research@example.com', displayName: 'Research Team', role: 'member', tenant: { id: 'mccia-demo', name: 'MCCIA Demo' } },
];
