/**
 * Request plumbing shared by the email-link routes: turning a FlowResponse into
 * a Response, the origin the email's link uses, and the IP key.
 */

import crypto from 'node:crypto';

import type { FlowResponse } from '@/lib/auth/emailFlow';
import { hashIp } from '@/lib/auth/emailLink';

export function respondFlow(result: FlowResponse): Response {
  const headers = new Headers();
  for (const cookie of result.setCookies) headers.append('Set-Cookie', cookie);
  headers.set('Cache-Control', 'no-store');
  headers.set('Referrer-Policy', 'no-referrer');
  if (result.location) {
    headers.set('Location', result.location);
    return new Response(null, { status: result.status, headers });
  }
  headers.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(result.html ?? '', { status: result.status, headers });
}

/**
 * The origin the emailed link points at. The deployment's own address, taken
 * from OAUTH_REDIRECT_URI (already set for Google sign-in), never from the
 * request's Host header: a forged Host would otherwise put someone else's
 * domain into a sign-in email.
 */
export function linkOrigin(env: Record<string, string | undefined> = process.env): string | null {
  const redirect = env.OAUTH_REDIRECT_URI?.trim();
  if (!redirect) return null;
  try {
    return new URL(redirect).origin;
  } catch {
    return null;
  }
}

/**
 * The key for the IP hash: derived from the box's MOINTEL_INTERNAL_TOKEN so no
 * new secret is carried. Without it (a dev machine), a per-process random key:
 * the per-IP limit still works within a process, and nothing reversible is kept.
 */
const fallbackKey = crypto.randomBytes(32).toString('hex');
export function ipKey(env: Record<string, string | undefined> = process.env): string {
  const token = env.MOINTEL_INTERNAL_TOKEN?.trim();
  return token ? crypto.createHmac('sha256', token).update('email-link-ip-key').digest('hex') : fallbackKey;
}

/** nginx sets X-Real-IP to $remote_addr on every proxied request, overwriting any value a client sent. */
export function requestIpHash(request: Request, env: Record<string, string | undefined> = process.env): string {
  const ip = request.headers.get('x-real-ip')?.trim() || 'unknown';
  return hashIp(ip, ipKey(env));
}

export async function formField(request: Request, name: string): Promise<string | null> {
  try {
    const form = await request.formData();
    const value = form.get(name);
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}
