import { NextRequest } from 'next/server';
import { publicServers, requireIdentity } from '@/lib/backend';
import { mockServers } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  try { await requireIdentity(request); } catch (error) { if (error instanceof Response) return error; }
  if (process.env.RAG_DEV_MOCKS === 'true') return Response.json({ data: mockServers });
  try { return Response.json({ data: publicServers() }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Compute server configuration is invalid.' }, { status: 500 }); }
}
