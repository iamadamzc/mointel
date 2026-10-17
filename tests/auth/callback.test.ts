import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { completeCallback, type CallbackDeps } from '@/lib/auth/callback';
import { OAUTH_FLOW_COOKIE } from '@/lib/auth/config';
import { SESSION_COOKIE } from '@/lib/auth/cookie';
import { linkIdentity, openIdentityStore, resolveSession, type IdentityDatabase } from '@/lib/auth/store';

const CLIENT_ID = 'client-123';
const STATE = 'state-xyz';
const NONCE = 'nonce-abc';
const CONFIG = {
  clientId: CLIENT_ID,
  clientSecret: 'secret',
  redirectUri: 'https://tmitrader.com/auth/callback/google',
};

const dirs: string[] = [];
let db: IdentityDatabase;

function tempDb(): IdentityDatabase {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-callback-'));
  dirs.push(dir);
  return openIdentityStore(path.join(dir, 'identity.db'));
}

function seg(o: unknown): string {
  return Buffer.from(JSON.stringify(o)).toString('base64url');
}

function idToken(payload: Record<string, unknown>): string {
  return `${seg({ alg: 'RS256', typ: 'JWT' })}.${seg(payload)}.signature`;
}

function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    exp: Math.floor(Date.now() / 1000) + 3600,
    nonce: NONCE,
    sub: 'sub-1',
    email: 'Adam@Example.com',
    email_verified: true,
    ...overrides,
  };
}

function fetchReturning(body: unknown): typeof fetch {
  return (async () => ({ json: async () => body })) as unknown as typeof fetch;
}

function fetchThrowing(): typeof fetch {
  return (async () => {
    throw new Error('network');
  }) as unknown as typeof fetch;
}

function deps(overrides: Partial<CallbackDeps> = {}): CallbackDeps {
  return {
    url: new URL(`https://tmitrader.com/auth/callback/google?code=abc&state=${STATE}`),
    cookieHeader: `${OAUTH_FLOW_COOKIE}=${STATE}.${NONCE}`,
    config: CONFIG,
    db,
    fetchImpl: fetchReturning({ id_token: idToken(validPayload()) }),
    ...overrides,
  };
}

function cookieNamed(setCookies: string[], name: string): string | null {
  return setCookies.find((c) => c.startsWith(`${name}=`)) ?? null;
}

function clearsFlowCookie(setCookies: string[]): boolean {
  const c = cookieNamed(setCookies, OAUTH_FLOW_COOKIE);
  return c !== null && c.includes('Max-Age=0');
}

beforeEach(() => {
  db = tempDb();
});

afterEach(() => {
  try {
    db.close();
  } catch {
    /* already closed */
  }
  while (dirs.length) {
    const dir = dirs.pop();
    try {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows may hold the handle briefly. */
    }
  }
});

describe('completeCallback', () => {
  it('valid auth: 303 to /desk, sets a resolvable session, clears the flow cookie', async () => {
    const res = await completeCallback(deps());
    expect(res.status).toBe(303);
    expect(res.location).toBe('/desk');
    expect(clearsFlowCookie(res.setCookies)).toBe(true);

    const sessionCookie = cookieNamed(res.setCookies, 'mointel_session');
    expect(sessionCookie).not.toBeNull();
    const id = (sessionCookie as string).slice(
      'mointel_session='.length,
      (sessionCookie as string).indexOf(';'),
    );
    expect(resolveSession(db, id)).not.toBeNull();
  });

  it('issues a session even for an UNINVITED user — admission is the gate’s (D2)', async () => {
    // No invitation exists in this db. The callback must still succeed.
    const res = await completeCallback(deps());
    expect(res.status).toBe(303);
    expect(cookieNamed(res.setCookies, 'mointel_session')).not.toBeNull();
  });

  it('cancelled at Google: 303 to /signin, no session, flow cleared', async () => {
    const res = await completeCallback(
      deps({ url: new URL('https://tmitrader.com/auth/callback/google?error=access_denied') }),
    );
    expect(res.status).toBe(303);
    expect(res.location).toBe('/signin?e=cancelled');
    expect(cookieNamed(res.setCookies, 'mointel_session')).toBeNull();
    expect(clearsFlowCookie(res.setCookies)).toBe(true);
  });

  it('state mismatch: 400, no session', async () => {
    const res = await completeCallback(deps({ cookieHeader: `${OAUTH_FLOW_COOKIE}=other.${NONCE}` }));
    expect(res.status).toBe(400);
    expect(cookieNamed(res.setCookies, 'mointel_session')).toBeNull();
  });

  it('missing code: 400', async () => {
    const res = await completeCallback(
      deps({ url: new URL(`https://tmitrader.com/auth/callback/google?state=${STATE}`) }),
    );
    expect(res.status).toBe(400);
  });

  it('missing flow cookie: 400', async () => {
    const res = await completeCallback(deps({ cookieHeader: null }));
    expect(res.status).toBe(400);
  });

  it('token endpoint not answering: 503', async () => {
    const res = await completeCallback(deps({ fetchImpl: fetchThrowing() }));
    expect(res.status).toBe(503);
  });

  it('Google refused the exchange (token error): 400', async () => {
    const res = await completeCallback(deps({ fetchImpl: fetchReturning({ error: 'invalid_grant' }) }));
    expect(res.status).toBe(400);
  });

  it('no id_token in the response: 400', async () => {
    const res = await completeCallback(deps({ fetchImpl: fetchReturning({}) }));
    expect(res.status).toBe(400);
  });

  it('nonce mismatch (replay across flows): 400', async () => {
    const res = await completeCallback(
      deps({ fetchImpl: fetchReturning({ id_token: idToken(validPayload({ nonce: 'wrong' })) }) }),
    );
    expect(res.status).toBe(400);
  });

  it('expired token: 400', async () => {
    const res = await completeCallback(
      deps({
        fetchImpl: fetchReturning({
          id_token: idToken(validPayload({ exp: Math.floor(Date.now() / 1000) - 60 })),
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('wrong audience: 400', async () => {
    const res = await completeCallback(
      deps({ fetchImpl: fetchReturning({ id_token: idToken(validPayload({ aud: 'someone-else' })) }) }),
    );
    expect(res.status).toBe(400);
  });

  /*
   * THE PUBLISHED PROMISE. The privacy policy says the flow cookie is discarded
   * when sign-in finishes, "whether that sign-in succeeded or not." Every outcome
   * above must clear it — asserted here across all of them so a future branch
   * that forgets is caught.
   */
  it('clears the flow cookie on EVERY outcome', async () => {
    const outcomes: CallbackDeps[] = [
      deps(),
      deps({ url: new URL('https://tmitrader.com/auth/callback/google?error=access_denied') }),
      deps({ cookieHeader: `${OAUTH_FLOW_COOKIE}=other.${NONCE}` }),
      deps({ url: new URL(`https://tmitrader.com/auth/callback/google?state=${STATE}`) }),
      deps({ cookieHeader: null }),
      deps({ fetchImpl: fetchThrowing() }),
      deps({ fetchImpl: fetchReturning({ error: 'invalid_grant' }) }),
      deps({ fetchImpl: fetchReturning({ id_token: idToken(validPayload({ nonce: 'wrong' })) }) }),
    ];
    for (const d of outcomes) {
      const res = await completeCallback(d);
      expect(clearsFlowCookie(res.setCookies)).toBe(true);
    }
  });
});

describe('completeCallback: his one-account rule (uuid 4264b641), direction B', () => {
  function signedInUser(setCookies: string[]): number | null {
    const c = setCookies.find((x) => x.startsWith(`${SESSION_COOKIE}=`));
    if (!c) return null;
    const id = c.slice(SESSION_COOKIE.length + 1).split(';')[0];
    return resolveSession(db, id)?.userId ?? null;
  }

  it('a verified Google sign-in joins the user who first came in by email link', async () => {
    const emailUser = linkIdentity(db, { provider: 'email', subject: 'adam@example.com', email: 'adam@example.com', emailVerified: true });
    const result = await completeCallback(deps());
    expect(result.status).toBe(303);
    expect(signedInUser(result.setCookies)).toBe(emailUser.userId);
    const google = db.prepare("SELECT user_id AS userId FROM identities WHERE provider = 'google'").get() as { userId: number };
    expect(google.userId).toBe(emailUser.userId);
  });

  it('a Google sign-in with email_verified false never joins', async () => {
    const emailUser = linkIdentity(db, { provider: 'email', subject: 'adam@example.com', email: 'adam@example.com', emailVerified: true });
    const result = await completeCallback(
      deps({ fetchImpl: fetchReturning({ id_token: idToken(validPayload({ email_verified: false })) }) }),
    );
    expect(result.status).toBe(303);
    expect(signedInUser(result.setCookies)).not.toBe(emailUser.userId);
  });

  it('two users already holding the address: refused with 409, no session, never merged', async () => {
    linkIdentity(db, { provider: 'email', subject: 'adam@example.com', email: 'adam@example.com', emailVerified: true });
    linkIdentity(db, { provider: 'google', subject: 'other-sub', email: 'adam@example.com', emailVerified: true });
    const result = await completeCallback(deps());
    expect(result.status).toBe(409);
    expect(cookieNamed(result.setCookies, SESSION_COOKIE)).toBeNull();
    expect(clearsFlowCookie(result.setCookies)).toBe(true);
    const users = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
    expect(users.n).toBe(2);
  });

  it('a returning Google subject keeps its own user (no join on a known identity)', async () => {
    const first = await completeCallback(deps());
    const again = await completeCallback(deps());
    expect(signedInUser(again.setCookies)).toBe(signedInUser(first.setCookies));
  });
});
