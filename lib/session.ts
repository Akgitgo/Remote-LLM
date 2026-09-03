import type { Role, UserIdentity } from './types';

const COOKIE = 'mccia_session';
const encoder = new TextEncoder();

type SessionPayload = Pick<UserIdentity, 'id' | 'email' | 'displayName' | 'role' | 'tenant'> & { exp: number };

function secret(): string { return process.env.RAG_SESSION_SECRET ?? ''; }
function base64url(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''); }
function decodeBase64url(value: string): Uint8Array { const b64 = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4); return Uint8Array.from(atob(b64), (char) => char.charCodeAt(0)); }

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

export async function issueSession(identity: Omit<UserIdentity, never>): Promise<string> {
  if (!secret()) throw new Error('RAG_SESSION_SECRET is required.');
  const payload: SessionPayload = { ...identity, exp: Date.now() + 8 * 60 * 60 * 1000 };
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  return `${body}.${await sign(body)}`;
}

export async function readSession(token: string | undefined): Promise<UserIdentity | null> {
  if (!token || !secret()) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature || signature !== await sign(body)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64url(body))) as SessionPayload;
    if (payload.exp < Date.now() || !['admin', 'member', 'viewer'].includes(payload.role)) return null;
    return { id: payload.id, email: payload.email, displayName: payload.displayName, role: payload.role as Role, tenant: payload.tenant };
  } catch { return null; }
}

export const sessionCookieName = COOKIE;
