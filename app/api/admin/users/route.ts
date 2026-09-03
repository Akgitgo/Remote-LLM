import { NextRequest } from 'next/server';
import { requireIdentity } from '@/lib/backend';
import { mockUsers } from '@/lib/mock-data';
export async function GET(request: NextRequest) { try { const user = await requireIdentity(request); if (user.role !== 'admin') return Response.json({ error: 'Administrator role required.' }, { status: 403 }); } catch (error) { if (error instanceof Response) return error; } if (process.env.RAG_DEV_MOCKS === 'true') return Response.json({ data: mockUsers }); return Response.json({ error: 'User management endpoint is required: GET /v1/admin/users.' }, { status: 501 }); }
