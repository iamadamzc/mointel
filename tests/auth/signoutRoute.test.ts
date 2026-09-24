import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { POST } from '@/app/auth/signout/route';
import { SESSION_COOKIE } from '@/lib/auth/cookie';
import { resetIdentityDb } from '@/lib/auth/db';
import { createSession, linkIdentity, openIdentityStore, resolveSession } from '@/lib/auth/store';

const temporaryDirs: string[] = [];
let savedPath: string | undefined;

function temporaryPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-signout-'));
  temporaryDirs.push(dir);
  return path.join(dir, 'identity.db');
}

const FUTURE_EXPIRY = { etDate: '2099-01-01', expiresAt: new Date(Date.now() + 3_600_000) };

function signoutRequest(cookie?: string): Request {
  return new Request('https://tmitrader.com/auth/signout', {
    method: 'POST',
    headers: cookie ? { cookie } : {},
  });
}

function clearsSessionCookie(res: Response): boolean {
  const setCookie = res.headers.get('set-cookie') ?? '';
  return setCookie.includes(`${SESSION_COOKIE}=`) && setCookie.includes('Max-Age=0');
}

beforeEach(() => {
  savedPath = process.env.IDENTITY_DB_PATH;
  process.env.IDENTITY_DB_PATH = temporaryPath();
  resetIdentityDb();
});

afterEach(() => {
  resetIdentityDb();
  if (savedPath === undefined) delete process.env.IDENTITY_DB_PATH;
  else process.env.IDENTITY_DB_PATH = savedPath;
  while (temporaryDirs.length) {
    const dir = temporaryDirs.pop();
    try {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows may hold the handle briefly. */
    }
  }
});

describe('POST /auth/signout', () => {
  it('revokes the live session and clears the cookie', async () => {
    // Seed a real session through a separate connection to the same file.
    const seed = openIdentityStore(process.env.IDENTITY_DB_PATH as string);
    const { userId } = linkIdentity(seed, {
      provider: 'google',
      subject: 'sub-1',
      email: 'a@b.com',
      emailVerified: true,
    });
    const { id } = createSession(seed, userId, FUTURE_EXPIRY);
    expect(resolveSession(seed, id)).not.toBeNull();

    const res = await POST(signoutRequest(`${SESSION_COOKIE}=${id}`));

    expect(res.status).toBe(200);
    expect(clearsSessionCookie(res)).toBe(true);
    // The handler's own connection revoked the row; the seed connection sees it.
    expect(resolveSession(seed, id)).toBeNull();
  });

  it('is idempotent with no session cookie: 200 and still clears', async () => {
    const res = await POST(signoutRequest());
    expect(res.status).toBe(200);
    expect(clearsSessionCookie(res)).toBe(true);
  });

  it('is not cached', async () => {
    const res = await POST(signoutRequest());
    expect(res.headers.get('cache-control')).toContain('no-store');
  });
});
