import { NextRequest } from 'next/server';
import { backendError, backendFetch } from '@/lib/backend';
import type { Citation } from '@/lib/types';

type IncomingMessage = { role: 'system' | 'user' | 'assistant'; content: string };
function valid(body: unknown): body is { model: string; messages: IncomingMessage[]; stream: boolean; max_tokens?: number; reasoning_effort?: string } {
  const value = body as Record<string, unknown>;
  return typeof value?.model === 'string' && Array.isArray(value.messages) && value.messages.length > 0 && value.messages.every((message) => typeof message?.content === 'string' && ['system', 'user', 'assistant'].includes(message?.role));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!valid(body)) return Response.json({ error: 'Invalid chat request.' }, { status: 400 });
  if (process.env.RAG_DEV_MOCKS === 'true') return mockStream();
  try {
    const upstream = await backendFetch(request, '/v1/chat/completions', { method: 'POST', body: JSON.stringify({ ...body, stream: true }), headers: { 'content-type': 'application/json', accept: 'text/event-stream' }, signal: request.signal });
    if (!upstream.ok || !upstream.body) return backendError(upstream);
    return new Response(upstream.body, { status: 200, headers: { 'content-type': upstream.headers.get('content-type') ?? 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-content-type-options': 'nosniff' } });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: 'Backend unavailable.' }, { status: 503 });
  }
}

function mockStream() {
  const sources: Citation[] = [{ id: 'source-policy', documentId: 'doc-vendor-policy', filename: 'Vendor Onboarding Policy.pdf', page: 4, relevance: 0.94, excerpt: 'Vendor approval requires a completed risk assessment and retained evidence of due diligence.' }];
  const frames = [
    { queue_position: 1 },
    { choices: [{ delta: { content: 'The vendor onboarding policy requires a completed risk assessment, clear ownership, and retained due-diligence evidence before approval.' } }] },
    { sources },
    { metrics: { promptTokens: 42, completionTokens: 24, durationMs: 780 } },
    '[DONE]',
  ];
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({ async start(controller) { for (const frame of frames) { controller.enqueue(encoder.encode(`data: ${typeof frame === 'string' ? frame : JSON.stringify(frame)}\n\n`)); await new Promise((resolve) => setTimeout(resolve, 90)); } controller.close(); } });
  return new Response(stream, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive' } });
}
