import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GET, probeEnabled } from '@/app/auth/probe/route';
import { SESSION_COOKIE } from '@/lib/auth/cookie';
import { resetIdentityDb } from '@/lib/auth/db';
import { createSession, inviteEmail, linkIdentity, openIdentityStore, revokeSession } from '@/lib/auth/store';

const temporaryDirs: string[] = [];
let savedPath: string | undefined;
let savedFlag: string | undefined;

function temporaryPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-probe-'));
  temporaryDirs.push(dir);
  return path.join(dir, 'identity.db');
}

const FUTURE_EXPIRY = { etDate: '2099-01-01', expiresAt: new Date(Date.now() + 3_600_000) };

function probeRequest(cookie?: string, query = ''): Request {
  return new Request(`https://tmitrader.com/auth/probe${query}`, {
    method: 'GET',
    headers: cookie ? { cookie } : {},
  });
}

/** A signed-in user with a live session, invited or not. */
function seedSession(email: string, invited: boolean): string {
  const seed = openIdentityStore(process.env.IDENTITY_DB_PATH as string);
  const { userId } = linkIdentity(seed, {
    provider: 'google',
    subject: `sub-${email}`,
    email,
    emailVerified: true,
  });
  if (invited) inviteEmail(seed, email, 'test');
  const { id } = createSession(seed, userId, FUTURE_EXPIRY);
  seed.close();
  return id;
}

beforeEach(() => {
  savedPath = process.env.IDENTITY_DB_PATH;
  savedFlag = process.env.AUTH_PROBE_ENABLED;
  process.env.IDENTITY_DB_PATH = temporaryPath();
  process.env.AUTH_PROBE_ENABLED = '1';
  resetIdentityDb();
});

afterEach(() => {
  resetIdentityDb();
  if (savedPath === undefined) delete process.env.IDENTITY_DB_PATH;
  else process.env.IDENTITY_DB_PATH = savedPath;
  if (savedFlag === undefined) delete process.env.AUTH_PROBE_ENABLED;
  else process.env.AUTH_PROBE_ENABLED = savedFlag;
  while (temporaryDirs.length) {
    const dir = temporaryDirs.pop();
    try {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows may hold the handle briefly. */
    }
  }
});

describe('GET /auth/probe: fails closed on the flag', () => {
  it('is 404 with an empty body when AUTH_PROBE_ENABLED is absent, even for an admitted session', async () => {
    const id = seedSession('in@example.com', true);
    delete process.env.AUTH_PROBE_ENABLED;
    const res = await GET(probeRequest(`${SESSION_COOKIE}=${id}`));
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('');
  });

  it('only the exact string "1" enables it', () => {
    for (const value of [undefined, '', '0', 'true', 'yes', ' 1', '1 ']) {
      expect(probeEnabled({ AUTH_PROBE_ENABLED: value })).toBe(false);
    }
    expect(probeEnabled({ AUTH_PROBE_ENABLED: '1' })).toBe(true);
  });

  it('reads the flag per request, so unsetting it closes the probe without a rebuild', async () => {
    expect((await GET(probeRequest())).status).toBe(200);
    process.env.AUTH_PROBE_ENABLED = '0';
    expect((await GET(probeRequest())).status).toBe(404);
  });
});

describe('GET /auth/probe: the three states, and nothing else leaves', () => {
  it('anonymous with no cookie (claim C)', async () => {
    const res = await GET(probeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ state: 'anonymous' });
  });

  it('admitted for a live session whose verified email is invited (claim A)', async () => {
    const id = seedSession('in@example.com', true);
    const res = await GET(probeRequest(`other=1; ${SESSION_COOKIE}=${id}`));
    expect(await res.json()).toEqual({ state: 'admitted' });
  });

  it('refused for a live session whose email is not invited (claim B)', async () => {
    const id = seedSession('out@example.com', false);
    const res = await GET(probeRequest(`${SESSION_COOKIE}=${id}`));
    expect(await res.json()).toEqual({ state: 'refused' });
  });

  it('anonymous for a revoked session and for an unknown id', async () => {
    const id = seedSession('in@example.com', true);
    const seed = openIdentityStore(process.env.IDENTITY_DB_PATH as string);
    revokeSession(seed, id);
    seed.close();
    expect(await (await GET(probeRequest(`${SESSION_COOKIE}=${id}`))).json()).toEqual({ state: 'anonymous' });
    expect(await (await GET(probeRequest(`${SESSION_COOKIE}=not-a-real-id`))).json()).toEqual({ state: 'anonymous' });
  });

  it('returns no identifier: the body is exactly one key, and the userId never appears', async () => {
    const id = seedSession('in@example.com', true);
    const body = await (await GET(probeRequest(`${SESSION_COOKIE}=${id}`))).text();
    expect(Object.keys(JSON.parse(body))).toEqual(['state']);
    expect(body).not.toMatch(/userId|user_id|@|\d/);
    expect(body).not.toContain(id);
  });

  it('takes no parameter: a session id in the query string is ignored (no session-id oracle)', async () => {
    const id = seedSession('in@example.com', true);
    const res = await GET(probeRequest(undefined, `?session=${id}&${SESSION_COOKIE}=${id}`));
    expect(await res.json()).toEqual({ state: 'anonymous' });
  });

  it('is never cached', async () => {
    expect((await GET(probeRequest())).headers.get('cache-control')).toBe('no-store');
  });
});

describe('GET /auth/probe: a store that cannot be read is 500, never a plausible state', () => {
  it('answers 500 with an empty body when the identity store cannot open', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-probe-'));
    temporaryDirs.push(dir);
    // A directory where the database file should be: openIdentityStore must fail.
    process.env.IDENTITY_DB_PATH = dir;
    resetIdentityDb();
    const res = await GET(probeRequest());
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('');
  });
});
