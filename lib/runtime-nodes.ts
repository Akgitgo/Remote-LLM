/**
 * Development-only, process-memory node registry. Secrets never cross back to
 * the browser. It intentionally resets on restart; production must use a
 * server-side encrypted store or deployment secret manager.
 */
export type RuntimeNode = {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  protocol: 'ollama' | 'fastapi';
};

const runtime = globalThis as typeof globalThis & { __mcciaRuntimeNodes?: Map<string, RuntimeNode> };
const store = runtime.__mcciaRuntimeNodes ?? new Map<string, RuntimeNode>();
runtime.__mcciaRuntimeNodes = store;

export function runtimeNodes(): RuntimeNode[] { return [...store.values()]; }
export function upsertRuntimeNode(node: RuntimeNode): void { store.set(node.id, node); }
