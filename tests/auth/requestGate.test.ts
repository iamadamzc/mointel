import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { SESSION_COOKIE } from '@/lib/auth/cookie';
import { apiRefusal, gateApiRequest, sessionIdFromCookieHeader } from '@/lib/auth/requestGate';
import {
  createSession,
  inviteEmail,
  linkIdentity,
  openIdentityStore,
  revokeEmail,
  type IdentityDatabase,
} from '@/lib/auth/store';

/*
 * The gate the board and its API pass through, on a REAL identity store. The
 * three states are the ones the probe read live on 2026-10-02 through nginx;
 * these pin that the request plumbing in front of `authenticate()` turns each
 * into the right status, and that no API route can ship without it.
 */

const opened: IdentityDatabase[] = [];
const dirs: string[] = [];

afterEach(() => {
  while (opened.length) opened.pop()?.close();
  while (dirs.length) {
    const dir = dirs.pop();
    try {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows may hold the handle briefly. */
    }
  }
});

function store(): IdentityDatabase {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-gate-'));
  dirs.push(dir);
  const db = openIdentityStore(path.join(dir, 'identity.db'));
  opened.push(db);
  return db;
}

const FUTURE = { etDate: '2099-01-01', expiresAt: new Date(Date.now() + 3_600_000) };

function sessionFor(db: IdentityDatabase, email: string, invited: boolean): string {
  const { userId } = linkIdentity(db, { provider: 'google', subject: `sub-${email}`, email, emailVerified: true });
  if (invited) inviteEmail(db, email, 'test');
  return createSession(db, userId, FUTURE).id;
}

function request(cookie?: string): Request {
  return new Request('https://tmitrader.com/api/dashboard', { headers: cookie ? { cookie } : {} });
}

describe('sessionIdFromCookieHeader', () => {
  it('reads only the session cookie, among others, and treats an empty value as none', () => {
    expect(sessionIdFromCookieHeader(null)).toBeNull();
    expect(sessionIdFromCookieHeader('')).toBeNull();
    expect(sessionIdFromCookieHeader(`a=1; ${SESSION_COOKIE}=abc; b=2`)).toBe('abc');
    expect(sessionIdFromCookieHeader(`${SESSION_COOKIE}=`)).toBeNull();
    expect(sessionIdFromCookieHeader(`x${SESSION_COOKIE}=abc`)).toBeNull();
    expect(sessionIdFromCookieHeader('mointel_oauth=flow')).toBeNull();
  });
});

describe('gateApiRequest on a real store', () => {
  it('anonymous: no cookie, or a session id the store does not know, is 401', () => {
    const db = store();
    expect(gateApiRequest(request(), db)?.status).toBe(401);
    expect(gateApiRequest(request(`${SESSION_COOKIE}=not-a-session`), db)?.status).toBe(401);
  });

  it('refused: a live session for an address not on the allowlist is 403', () => {
    const db = store();
    const id = sessionFor(db, 'stranger@example.com', false);
    expect(gateApiRequest(request(`${SESSION_COOKIE}=${id}`), db)?.status).toBe(403);
  });

  it('admitted: a live session for an invited address passes (null)', () => {
    const db = store();
    const id = sessionFor(db, 'adam@example.com', true);
    expect(gateApiRequest(request(`${SESSION_COOKIE}=${id}`), db)).toBeNull();
  });

  it('a revoke takes effect on the next request (his "immediate")', () => {
    const db = store();
    const id = sessionFor(db, 'adam@example.com', true);
    expect(gateApiRequest(request(`${SESSION_COOKIE}=${id}`), db)).toBeNull();
    revokeEmail(db, 'adam@example.com');
    // revokeEmail ends live sessions in the same transaction, so the cookie no
    // longer names a session at all: anonymous, not refused.
    expect(gateApiRequest(request(`${SESSION_COOKIE}=${id}`), db)?.status).toBe(401);
  });
});

describe('apiRefusal', () => {
  it('carries no detail that tells anonymous from refused, and is never cached', async () => {
    const anon = apiRefusal({ state: 'anonymous' });
    const refused = apiRefusal({ state: 'refused', userId: 1 });
    expect(await anon?.json()).toEqual(await refused?.json());
    expect(anon?.headers.get('Cache-Control')).toContain('no-store');
    expect(refused?.headers.get('Cache-Control')).toContain('no-store');
    expect(apiRefusal({ state: 'admitted', userId: 1 })).toBeNull();
  });
});

describe('no API route ships ungated', () => {
  const UNGATED = new Set([
    // Loopback-only at nginx; how Ops and deploy.sh check the box.
    'app/api/health/route.ts',
    // HELD: the market worker reads it over loopback with no cookie. Must be
    // gated, with an internal credential for the worker, BEFORE Basic Auth
    // comes off /api/. See the comment in the route.
    'app/api/dashboard/route.ts',
  ]);

  function routes(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return routes(full);
      return entry.name === 'route.ts' ? [full.split(path.sep).join('/')] : [];
    });
  }

  it('every handler in app/api/ except health calls the gate first', () => {
    const files = routes('app/api');
    expect(files.length).toBeGreaterThanOrEqual(7);
    for (const file of files) {
      if (UNGATED.has(file)) continue;
      // Normalised first: this PC checks out CRLF (core.autocrlf=true), and the
      // patterns below are written with a bare LF. Found by Ops's gate on a50f5948.
      const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
      const handlers = source.match(/export async function (GET|POST|PUT|PATCH|DELETE)\(request: Request\) \{\n/g) ?? [];
      const exported = source.match(/export (async )?function (GET|POST|PUT|PATCH|DELETE)\b/g) ?? [];
      expect(exported.length, `${file} exports a handler`).toBeGreaterThan(0);
      expect(handlers.length, `${file}: every handler takes the request`).toBe(exported.length);
      const gatedFirst =
        source.match(
          /export async function (GET|POST|PUT|PATCH|DELETE)\(request: Request\) \{\n  const refused = gateApiRequest\(request\);\n  if \(refused\) return refused;\n/g,
        ) ?? [];
      expect(gatedFirst.length, `${file}: the gate is the first statement of every handler`).toBe(exported.length);
    }
  });
});
