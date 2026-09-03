import { NextRequest } from 'next/server';
import { readSession, sessionCookieName } from './session';
import { runtimeNodes } from './runtime-nodes';

type PrivateComputeServer = { id: string; name: string; url: string; apiKey: string; protocol?: 'ollama' | 'fastapi' };

export async function requireIdentity(request: NextRequest) {
  const identity = await readSession(request.cookies.get(sessionCookieName)?.value);
  if (!identity) throw new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: { 'content-type': 'application/json' } });
  return identity;
}

function configuredServers(): PrivateComputeServer[] {
  const configured = process.env.RAG_BACKEND_SERVERS;
  if (configured) {
    try {
      const values = JSON.parse(configured) as unknown;
      if (Array.isArray(values) && values.every((value) => typeof value === 'object' && value !== null && typeof (value as PrivateComputeServer).id === 'string' && typeof (value as PrivateComputeServer).name === 'string' && typeof (value as PrivateComputeServer).url === 'string' && typeof (value as PrivateComputeServer).apiKey === 'string' && ((value as PrivateComputeServer).protocol === undefined || ['ollama', 'fastapi'].includes((value as PrivateComputeServer).protocol ?? '')))) return [...values as PrivateComputeServer[], ...runtimeNodes()];
    } catch { throw new Error('RAG_BACKEND_SERVERS must contain valid JSON.'); }
  }
  const url = process.env.RAG_BACKEND_URL;
  const apiKey = process.env.RAG_BACKEND_API_KEY;
  if (!url || !apiKey) throw new Error('Configure RAG_BACKEND_SERVERS or RAG_BACKEND_URL and RAG_BACKEND_API_KEY.');
  return [{ id: 'default', name: 'Default compute server', url, apiKey, protocol: process.env.RAG_BACKEND_PROTOCOL === 'ollama' ? 'ollama' : 'fastapi' }, ...runtimeNodes()];
}

export function publicServers() { return configuredServers().map(({ id, name, protocol = 'fastapi' }) => ({ id, name, protocol })); }

function selectedServer(request: NextRequest): PrivateComputeServer {
  const selectedId = request.headers.get('x-rag-server-id') ?? configuredServers()[0]?.id;
  const server = configuredServers().find((item) => item.id === selectedId);
  if (!server) throw new Response(JSON.stringify({ error: 'Selected compute server is not available.' }), { status: 400, headers: { 'content-type': 'application/json' } });
  return server;
}

export function selectedServerProtocol(request: NextRequest): 'ollama' | 'fastapi' {
  return selectedServer(request).protocol ?? 'fastapi';
}

export function backendUrl(path: string, server: PrivateComputeServer): URL {
  const base = server.url;
  return new URL(path, base.endsWith('/') ? base : `${base}/`);
}

export async function backendFetch(request: NextRequest, path: string, init: RequestInit = {}): Promise<Response> {
  const identity = await requireIdentity(request);
  const server = selectedServer(request);
  return fetch(backendUrl(path, server), {
    ...init,
    headers: {
      authorization: `Bearer ${server.apiKey}`,
      'x-user-id': identity.id,
      'x-tenant-id': identity.tenant.id,
      'x-user-role': identity.role,
      'x-request-id': crypto.randomUUID(),
      ...Object.fromEntries(new Headers(init.headers).entries()),
    },
    cache: 'no-store',
  });
}

export function backendError(response: Response): Response {
  return new Response(JSON.stringify({ error: response.status === 503 ? 'Backend unavailable.' : 'The request could not be completed.' }), { status: response.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
