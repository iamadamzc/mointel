import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GET } from '@/app/auth/start/google/route';
import { OAUTH_FLOW_COOKIE } from '@/lib/auth/config';
import { decodeFlow } from '@/lib/auth/oauth';

const ENV_KEYS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'OAUTH_REDIRECT_URI',
  'AUTH_COOKIE_INSECURE',
] as const;

const REDIRECT_URI = 'https://tmitrader.com/auth/callback/google';

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  process.env.GOOGLE_CLIENT_ID = 'client-123';
  process.env.GOOGLE_CLIENT_SECRET = 'secret-abc';
  process.env.OAUTH_REDIRECT_URI = REDIRECT_URI;
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

/** The flow cookie's value, or null if it was not set. */
function flowCookieValue(res: Response): string | null {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = new RegExp(`${OAUTH_FLOW_COOKIE}=([^;]*)`).exec(setCookie);
  return match ? match[1] : null;
}

describe('GET /auth/start/google', () => {
  it('302s to Google with the registered redirect and identity-only scopes', async () => {
    const res = await GET();
    expect(res.status).toBe(302);

    const location = res.headers.get('location');
    expect(location).not.toBeNull();
    const url = new URL(location as string);
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('client-123');
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')?.split(' ').sort()).toEqual(['email', 'openid', 'profile']);
  });

  it('is not cached', async () => {
    const res = await GET();
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('sets a Lax, HttpOnly, ten-minute flow cookie', async () => {
    const res = await GET();
    const setCookie = res.headers.get('set-cookie') as string;
    expect(setCookie).toContain(`${OAUTH_FLOW_COOKIE}=`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain('Max-Age=600');
    expect(setCookie).not.toContain('Strict');
  });

  /*
   * THE BINDING PROPERTY. The state/nonce in the cookie and the state/nonce in
   * the redirect must be the SAME flow — that equality is the whole of what the
   * callback checks. A start that set a cookie for a different flow than it sent
   * to Google is a sign-in that can never complete, and no other assertion here
   * would catch it.
   */
  it('binds the cookie to the URL: same state and nonce', async () => {
    const res = await GET();
    const url = new URL(res.headers.get('location') as string);
    const cookieFlow = decodeFlow(flowCookieValue(res));
    expect(cookieFlow).not.toBeNull();
    expect(cookieFlow?.state).toBe(url.searchParams.get('state'));
    expect(cookieFlow?.nonce).toBe(url.searchParams.get('nonce'));
  });

  it('mints a fresh flow each time', async () => {
    const first = new URL((await GET()).headers.get('location') as string);
    const second = new URL((await GET()).headers.get('location') as string);
    expect(first.searchParams.get('state')).not.toBe(second.searchParams.get('state'));
    expect(first.searchParams.get('nonce')).not.toBe(second.searchParams.get('nonce'));
  });

  it('is our fault (500) with no cookie when unconfigured', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const res = await GET();
    expect(res.status).toBe(500);
    expect(flowCookieValue(res)).toBeNull();
  });
});
