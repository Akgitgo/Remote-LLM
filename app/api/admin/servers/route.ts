import { NextRequest } from 'next/server';
import { publicServers, requireIdentity } from '@/lib/backend';
import { upsertRuntimeNode } from '@/lib/runtime-nodes';

type Body = { name?: string; url?: string; apiKey?: string; protocol?: 'ollama' | 'fastapi' };

export async function GET(request: NextRequest) {
  try { const user = await requireIdentity(request); if (user.role !== 'admin') return Response.json({ error: 'Administrator role required.' }, { status: 403 }); return Response.json({ data: publicServers() }); } catch (error) { if (error instanceof Response) return error; return Response.json({ error: 'Unable to load compute servers.' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireIdentity(request);
    if (user.role !== 'admin') return Response.json({ error: 'Administrator role required.' }, { status: 403 });
    const body = await request.json() as Body;
    const name = body.name?.trim(); const suppliedKey = body.apiKey?.trim(); const protocol = body.protocol;
    if (!name || (protocol !== 'ollama' && protocol !== 'fastapi')) return Response.json({ error: 'Server name and protocol are required.' }, { status: 400 });
    if (suppliedKey?.includes('://') || suppliedKey?.startsWith('postgres')) return Response.json({ error: 'This looks like a database connection string, not a server API key. Rotate that database credential and enter a dedicated FastAPI API key instead.' }, { status: 400 });
    let apiKey: string;
    if (protocol === 'ollama') apiKey = 'tailnet-authenticated-ollama';
    else {
      if (!suppliedKey) return Response.json({ error: 'Enter the dedicated FastAPI RAG API key. Do not enter a database connection string.' }, { status: 400 });
      apiKey = suppliedKey;
    }
    const url = validateNodeUrl(body.url);
    if (!url) return Response.json({ error: 'Use a Tailscale HTTPS hostname ending in .ts.net.' }, { status: 400 });
    const id = `remote-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-|-$/g, '')}`;
    const modelsUrl = new URL('/v1/models', url);
    let probe: Response;
    try {
      probe = await fetch(modelsUrl, { headers: { authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10_000), cache: 'no-store' });
    } catch {
      return Response.json({ error: `Cannot reach ${url.hostname}/v1/models. On Aarushi's laptop, check Tailscale is connected, run \"tailscale serve status\", and verify the local server is running.` }, { status: 502 });
    }
    if (probe.status === 401 || probe.status === 403) return Response.json({ error: 'The remote server was reached but rejected the FastAPI RAG API key.' }, { status: 502 });
    if (probe.status === 404) return Response.json({ error: 'The remote server was reached, but /v1/models was not found. Tailscale Serve must proxy the FastAPI service root, not the frontend or another port.' }, { status: 502 });
    if (!probe.ok) return Response.json({ error: `The remote server returned ${probe.status} from /v1/models. Check the FastAPI service and its API key.` }, { status: 502 });
    upsertRuntimeNode({ id, name, url: url.toString().replace(/\/$/, ''), apiKey, protocol });
    return Response.json({ ok: true, server: publicServers().find((server) => server.id === id) });
  } catch (error) { if (error instanceof Response) return error; return Response.json({ error: error instanceof Error ? error.message : 'Could not connect to the compute server.' }, { status: 500 }); }
}

function validateNodeUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname.endsWith('.ts.net') ? url : null; } catch { return null; }
}
