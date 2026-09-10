import { describe, expect, it } from 'vitest';

import {
  SCOPES,
  authorizeUrl,
  checkClaims,
  createFlow,
  decodeFlow,
  encodeFlow,
  readIdToken,
  secretsMatch,
} from '@/lib/auth/oauth';

const CLIENT_ID = 'client-123.apps.googleusercontent.com';

function token(claims: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `header.${payload}.signature`;
}

function validClaims(overrides: Record<string, unknown> = {}) {
  return {
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: 'google-subject-1',
    nonce: 'the-nonce',
    email: 'person@example.com',
    email_verified: true,
    ...overrides,
  };
}

describe('flow secrets', () => {
  /*
   * state travels in the URL and lands in query strings, logs and referrers.
   * A nonce derived from it would be predictable to anyone who saw it, and the
   * nonce's whole job is binding the token to this flow.
   */
  it('generates state and nonce independently', () => {
    const flow = createFlow();
    expect(flow.state).not.toBe(flow.nonce);
    expect(flow.state.length).toBeGreaterThan(20);
    expect(flow.nonce.length).toBeGreaterThan(20);
  });

  it('does not repeat across flows', () => {
    const a = createFlow();
    const b = createFlow();
    expect(a.state).not.toBe(b.state);
    expect(a.nonce).not.toBe(b.nonce);
  });

  it('round-trips through one cookie value', () => {
    const flow = createFlow();
    expect(decodeFlow(encodeFlow(flow))).toEqual(flow);
  });

  it('refuses a malformed or absent flow cookie', () => {
    expect(decodeFlow(undefined)).toBeNull();
    expect(decodeFlow('')).toBeNull();
    expect(decodeFlow('only-one-part')).toBeNull();
    expect(decodeFlow('a.b.c')).toBeNull();
    expect(decodeFlow('.nonce-only')).toBeNull();
  });
});

describe('the authorize URL', () => {
  it('asks for identity scopes only', () => {
    const url = new URL(authorizeUrl({ clientId: CLIENT_ID, redirectUri: 'https://x/cb', flow: createFlow() }));
    expect(url.searchParams.get('scope')).toBe(SCOPES.join(' '));
    expect(SCOPES).toEqual(['openid', 'email', 'profile']);
  });

  it('carries state and nonce and the exact redirect', () => {
    const flow = createFlow();
    const url = new URL(
      authorizeUrl({ clientId: CLIENT_ID, redirectUri: 'https://tmitrader.com/auth/callback/google', flow }),
    );
    expect(url.searchParams.get('state')).toBe(flow.state);
    expect(url.searchParams.get('nonce')).toBe(flow.nonce);
    expect(url.searchParams.get('redirect_uri')).toBe('https://tmitrader.com/auth/callback/google');
    expect(url.searchParams.get('response_type')).toBe('code');
  });
});

describe('ID token claims', () => {
  it('accepts a well-formed token from Google', () => {
    expect(checkClaims(readIdToken(token(validClaims())), { clientId: CLIENT_ID, nonce: 'the-nonce' }).ok).toBe(true);
  });

  it('accepts both issuer spellings Google uses', () => {
    for (const iss of ['https://accounts.google.com', 'accounts.google.com']) {
      expect(checkClaims(readIdToken(token(validClaims({ iss }))), { clientId: CLIENT_ID, nonce: 'the-nonce' }).ok).toBe(true);
    }
  });

  it('rejects a foreign issuer', () => {
    const check = checkClaims(readIdToken(token(validClaims({ iss: 'https://evil.example' }))), {
      clientId: CLIENT_ID,
      nonce: 'the-nonce',
    });
    expect(check.ok).toBe(false);
  });

  /*
   * A token minted for a different client is a real token from Google. Only the
   * audience check separates it from ours.
   */
  it('rejects a token issued for another client', () => {
    const check = checkClaims(readIdToken(token(validClaims({ aud: 'someone-else.apps.googleusercontent.com' }))), {
      clientId: CLIENT_ID,
      nonce: 'the-nonce',
    });
    expect(check.ok).toBe(false);
  });

  it('rejects an expired token', () => {
    const claims = validClaims({ exp: Math.floor(Date.now() / 1000) - 1 });
    expect(checkClaims(readIdToken(token(claims)), { clientId: CLIENT_ID, nonce: 'the-nonce' }).ok).toBe(false);
  });

  it('rejects a mismatched nonce', () => {
    const check = checkClaims(readIdToken(token(validClaims({ nonce: 'a-different-nonce' }))), {
      clientId: CLIENT_ID,
      nonce: 'the-nonce',
    });
    expect(check.ok).toBe(false);
  });

  /*
   * The check must not be satisfied by a missing field. Google omits the nonce
   * entirely when the authorize request did not carry one, so an absent nonce
   * has to fail rather than pass by default.
   */
  it('rejects a token with no nonce at all', () => {
    const claims = validClaims();
    delete (claims as Record<string, unknown>).nonce;
    expect(checkClaims(readIdToken(token(claims)), { clientId: CLIENT_ID, nonce: 'the-nonce' }).ok).toBe(false);
  });

  it('rejects a token with no subject', () => {
    const claims = validClaims();
    delete (claims as Record<string, unknown>).sub;
    expect(checkClaims(readIdToken(token(claims)), { clientId: CLIENT_ID, nonce: 'the-nonce' }).ok).toBe(false);
  });

  it('rejects an unreadable token rather than throwing', () => {
    expect(readIdToken('not-a-jwt')).toBeNull();
    expect(readIdToken('a.!!!not-base64!!!.c')).toBeNull();
    expect(checkClaims(null, { clientId: CLIENT_ID, nonce: 'the-nonce' }).ok).toBe(false);
  });
});

describe('state comparison', () => {
  it('matches an identical secret and rejects everything else', () => {
    expect(secretsMatch('abc123', 'abc123')).toBe(true);
    expect(secretsMatch('abc123', 'abc124')).toBe(false);
    expect(secretsMatch('abc123', 'abc1234')).toBe(false);
    expect(secretsMatch('', '')).toBe(false);
    expect(secretsMatch(undefined, 'abc')).toBe(false);
    expect(secretsMatch('abc', null)).toBe(false);
  });
});
