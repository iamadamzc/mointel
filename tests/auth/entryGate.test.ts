import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { POST as accept } from '@/app/auth/accept/route';
import { SESSION_COOKIE } from '@/lib/auth/cookie';
import { getIdentityDb, resetIdentityDb } from '@/lib/auth/db';
import { authenticate } from '@/lib/auth/gate';
import {
  createSession,
  hasAcceptedEntry,
  inviteEmail,
  linkIdentity,
  recordEntryAcceptance,
  type IdentityDatabase,
} from '@/lib/auth/store';
import { ENTRY_GATE, ENTRY_GATE_VERSION } from '@/lib/legal/entryGate';

/*
 * THE ENTRY GATE (Commercial 12b, placement docs/web/2026-10-05-entry-gate-placement.md).
 * The text is checked against the ADOPTED terms, and the accept route runs on a
 * REAL identity store: the current version ADMITS (positive control), a stale or
 * missing one writes nothing.
 */

// ---------------------------------------------------------------- the text

/** terms.md section 7 as a reader sees it: no bold markers, one space between words. */
function termsSection7(): string {
  const terms = fs.readFileSync('docs/legal/terms.md', 'utf8').replace(/\r\n/g, '\n');
  const start = terms.indexOf('## 7. ');
  const end = terms.indexOf('\n## 8. ', start);
  return terms.slice(start, end).replace(/\*\*/g, '').replace(/\s+/g, ' ');
}

function sentences(paragraph: string): string[] {
  return paragraph.split(/(?<=\.)\s+/).filter((s) => s.length > 0);
}

describe('the entry gate text is the adopted terms, verbatim', () => {
  it('finds section 7 (control: the check can see the source)', () => {
    expect(termsSection7()).toContain('Nothing here is advice');
    expect(termsSection7().length).toBeGreaterThan(200);
  });

  it('every sentence of both paragraphs is in terms.md section 7', () => {
    const section = termsSection7();
    const all = ENTRY_GATE.paragraphs.flatMap(sentences);
    expect(all.length).toBe(6);
    for (const sentence of all) expect(section, sentence).toContain(sentence);
  });

  it("leaves out section 7's last sentence, per 12b", () => {
    expect(termsSection7()).toContain('Past movement in any security');
    expect(JSON.stringify(ENTRY_GATE)).not.toContain('Past movement');
  });

  it('has no em dash in any encoding', () => {
    const source = fs.readFileSync('lib/legal/entryGate.ts', 'utf8');
    expect(source).not.toContain('—');
    expect(source).not.toMatch(/&mdash;|&#8212;|&#x2014;/i);
  });

  it('carries a 16-hex version derived from the text', () => {
    expect(ENTRY_GATE_VERSION).toMatch(/^[0-9a-f]{16}$/);
  });
});

// ---------------------------------------------------------------- the route

const dirs: string[] = [];
let savedPath: string | undefined;
const FUTURE = { etDate: '2099-01-01', expiresAt: new Date(Date.now() + 3_600_000) };

beforeEach(() => {
  savedPath = process.env.IDENTITY_DB_PATH;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-accept-'));
  dirs.push(dir);
  process.env.IDENTITY_DB_PATH = path.join(dir, 'identity.db');
  resetIdentityDb();
});

afterEach(() => {
  resetIdentityDb();
  if (savedPath === undefined) delete process.env.IDENTITY_DB_PATH;
  else process.env.IDENTITY_DB_PATH = savedPath;
  while (dirs.length) {
    const dir = dirs.pop();
    try {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows may hold the handle briefly. */
    }
  }
});

function user(db: IdentityDatabase, email: string, invited = true): { userId: number; id: string } {
  const { userId } = linkIdentity(db, { provider: 'google', subject: `sub-${email}`, email, emailVerified: true });
  if (invited) inviteEmail(db, email, 'test');
  return { userId, id: createSession(db, userId, FUTURE).id };
}

function post(sessionId: string | null, version?: string): Request {
  const body = new URLSearchParams();
  if (version !== undefined) body.set('version', version);
  return new Request('https://tmitrader.com/auth/accept', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...(sessionId ? { cookie: `${SESSION_COOKIE}=${sessionId}` } : {}),
    },
    body,
  });
}

const rows = (db: IdentityDatabase) =>
  (db.prepare('SELECT COUNT(*) AS n FROM entry_acceptances').get() as { n: number }).n;

describe('POST /auth/accept on a real store', () => {
  it('ACCEPTS the current version: one row, 303 /desk, and the gate then admits (positive control)', async () => {
    const db = getIdentityDb();
    const { userId, id } = user(db, 'tester@example.com');
    expect(authenticate(db, id).state).toBe('unaccepted');

    const res = await accept(post(id, ENTRY_GATE_VERSION));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/desk');
    expect(rows(db)).toBe(1);
    expect(hasAcceptedEntry(db, userId, ENTRY_GATE_VERSION)).toBe(true);
    expect(authenticate(db, id)).toEqual({ state: 'admitted', userId });
  });

  it('a STALE or missing version writes nothing and returns to /enter', async () => {
    const db = getIdentityDb();
    const { id } = user(db, 'tester@example.com');
    for (const version of ['0000000000000000', '', undefined]) {
      const res = await accept(post(id, version));
      expect(res.status).toBe(303);
      expect(res.headers.get('location')).toBe('/enter');
    }
    expect(rows(db)).toBe(0);
  });

  it('anonymous goes to /signin; uninvited and already-accepted go to /desk; none writes', async () => {
    const db = getIdentityDb();
    const anon = await accept(post(null, ENTRY_GATE_VERSION));
    expect(anon.headers.get('location')).toBe('/signin');

    const stranger = user(db, 'stranger@example.com', false);
    expect((await accept(post(stranger.id, ENTRY_GATE_VERSION))).headers.get('location')).toBe('/desk');

    const done = user(db, 'done@example.com');
    recordEntryAcceptance(db, done.userId, ENTRY_GATE_VERSION, done.id);
    expect((await accept(post(done.id, ENTRY_GATE_VERSION))).headers.get('location')).toBe('/desk');

    expect(rows(db)).toBe(1); // only the seeded one
  });

  it('is never cached', async () => {
    const res = await accept(post(null, ENTRY_GATE_VERSION));
    expect(res.headers.get('cache-control')).toContain('no-store');
  });
});
