import { NextRequest } from 'next/server';
import { backendError, backendFetch, requireIdentity } from '@/lib/backend';
import { mockDocuments } from '@/lib/mock-data';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

export async function GET(request: NextRequest) {
  try { await requireIdentity(request); } catch (error) { if (error instanceof Response) return error; }
  if (process.env.RAG_DEV_MOCKS === 'true') return Response.json({ data: mockDocuments });
  return Response.json({ error: 'Document listing endpoint is required: GET /v1/documents.' }, { status: 501 });
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return Response.json({ error: 'Select one file.' }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_UPLOAD_BYTES) return Response.json({ error: 'Only PDF, TXT, and DOCX files up to 25 MB are accepted.' }, { status: 400 });
    const upstream = await backendFetch(request, '/v1/documents', { method: 'POST', body: form });
    return upstream.ok ? new Response(upstream.body, { status: upstream.status, headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' } }) : backendError(upstream);
  } catch (error) { if (error instanceof Response) return error; return Response.json({ error: 'Upload failed because the backend is unavailable.' }, { status: 503 }); }
}
