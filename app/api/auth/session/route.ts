import { NextRequest, NextResponse } from 'next/server';
import { issueSession, readSession, sessionCookieName } from '@/lib/session';

const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 8 };

export async function GET(request: NextRequest) {
  const user = await readSession(request.cookies.get(sessionCookieName)?.value);
  return NextResponse.json({ user });
}

export async function POST(request: NextRequest) {
  if (process.env.RAG_DEV_AUTH !== 'true') return NextResponse.json({ error: 'An identity-provider session exchange is required in production.' }, { status: 501 });
  const body = await request.json().catch(() => null) as { email?: string; displayName?: string; tenantId?: string } | null;
  if (!body?.email || !/^\S+@\S+\.\S+$/.test(body.email)) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  const token = await issueSession({ id: `dev-${body.email}`, email: body.email, displayName: body.displayName?.trim() || body.email.split('@')[0], role: 'admin', tenant: { id: body.tenantId?.trim() || 'mccia-demo', name: 'MCCIA Demo' } });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, token, cookieOptions);
  return response;
}

export function DELETE() { const response = NextResponse.json({ ok: true }); response.cookies.set(sessionCookieName, '', { ...cookieOptions, maxAge: 0 }); return response; }
