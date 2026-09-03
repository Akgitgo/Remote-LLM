import { NextRequest } from 'next/server';
import { backendError, backendFetch } from '@/lib/backend';
import { mockModels } from '@/lib/mock-data';
export async function GET(request: NextRequest) { if (process.env.RAG_DEV_MOCKS === 'true') return Response.json({ data: mockModels }); try { const upstream = await backendFetch(request, '/v1/models'); if (!upstream.ok) return backendError(upstream); return new Response(upstream.body, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }); } catch (error) { if (error instanceof Response) return error; return Response.json({ error: 'Backend unavailable.' }, { status: 503 }); } }
