import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { RetryAnalysis } from '@/components/RetryAnalysis';
import { SESSION_COOKIE } from '@/lib/auth/cookie';
import { gateOwnerRequest, isOwnerAdmission, OWNER_EMAIL_ENV } from '@/lib/auth/requestGate';
import {
  createSession,
  inviteEmail,
  linkIdentity,
  openIdentityStore,
  recordEntryAcceptance,
  revokeEmail,
  type IdentityDatabase,
} from '@/lib/auth/store';
import { DeskModeProvider, type DeskMode } from '@/lib/hooks/useDeskMode';
import { ENTRY_GATE_VERSION } from '@/lib/legal/entryGate';

/*
 * His ruling, 2026-10-05T18:51:26Z: "disable retry research for users. leave
 * that for just me". On a REAL identity store: the owner is ADMITTED to the
 * owner gate (the positive control: a gate that refuses everyone passes every
 * negative test), every other admitted user is REFUSED with 403, and the desk
 * offers the button to the owner alone.
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-owner-'));
  dirs.push(dir);
  const db = openIdentityStore(path.join(dir, 'identity.db'));
  opened.push(db);
  return db;
}

const FUTURE = { etDate: '2099-01-01', expiresAt: new Date(Date.now() + 3_600_000) };
const OWNER = 'owner@example.com';
const ENV = { [OWNER_EMAIL_ENV]: OWNER };

function sessionFor(
  db: IdentityDatabase,
  email: string,
  {
    invited = true,
    verified = true,
    accepted = true,
  }: { invited?: boolean; verified?: boolean; accepted?: boolean } = {},
): string {
  const { userId } = linkIdentity(db, { provider: 'google', subject: `sub-${email}`, email, emailVerified: verified });
  if (invited) inviteEmail(db, email, 'test');
  const id = createSession(db, userId, FUTURE).id;
  if (accepted) recordEntryAcceptance(db, userId, ENTRY_GATE_VERSION, id);
  return id;
}

function retry(sessionId?: string): Request {
  return new Request('https://tmitrader.com/api/research/retry', {
    method: 'POST',
    headers: sessionId ? { cookie: `${SESSION_COOKIE}=${sessionId}` } : {},
  });
}

describe('gateOwnerRequest: retry research is the owner\'s alone', () => {
  it('ADMITS the owner (positive control)', () => {
    const db = store();
    expect(gateOwnerRequest(retry(sessionFor(db, OWNER)), db, undefined, ENV)).toBeNull();
  });

  it('REFUSES an invited, admitted user who is not the owner, with 403 and no-store', async () => {
    const db = store();
    const response = gateOwnerRequest(retry(sessionFor(db, 'tester@example.com')), db, undefined, ENV);
    expect(response?.status).toBe(403);
    expect(response?.headers.get('Cache-Control')).toContain('no-store');
    expect(await response?.json()).toEqual({ error: 'not permitted' });
  });

  it('keeps the ordinary gate in front: anonymous 401, uninvited 403', () => {
    const db = store();
    expect(gateOwnerRequest(retry(), db, undefined, ENV)?.status).toBe(401);
    expect(gateOwnerRequest(retry(sessionFor(db, 'stranger@example.com', { invited: false })), db, undefined, ENV)?.status).toBe(403);
  });

  it('the owner address must be admitted: not invited is 403, a revoked invitation ends the session (401)', () => {
    const db = store();
    expect(gateOwnerRequest(retry(sessionFor(db, OWNER, { invited: false })), db, undefined, ENV)?.status).toBe(403);
    const db2 = store();
    const id = sessionFor(db2, OWNER);
    revokeEmail(db2, OWNER);
    expect(gateOwnerRequest(retry(id), db2, undefined, ENV)?.status).toBe(401);
  });

  it('an UNVERIFIED identity at the owner address is not the owner', () => {
    const db = store();
    // Invited via a second, verified identity so the user is admitted; the
    // owner address itself is held only unverified.
    // linkIdentity always creates a new user for a new subject, so the second
    // identity is attached to the same user directly.
    const { userId } = linkIdentity(db, { provider: 'google', subject: 'sub-a', email: 'tester@example.com', emailVerified: true });
    const at = new Date().toISOString();
    db.prepare(
      `INSERT INTO identities (user_id, provider, subject, email, email_verified, created_at, last_seen_at)
       VALUES (?, 'google', 'sub-b', ?, 0, ?, ?)`,
    ).run(userId, OWNER, at, at);
    inviteEmail(db, 'tester@example.com', 'test');
    // Control: the same user WITH the owner address verified is the owner.
    const control = store();
    const { userId: controlUser } = linkIdentity(control, { provider: 'google', subject: 'sub-a', email: 'tester@example.com', emailVerified: true });
    control.prepare(
      `INSERT INTO identities (user_id, provider, subject, email, email_verified, created_at, last_seen_at)
       VALUES (?, 'google', 'sub-b', ?, 1, ?, ?)`,
    ).run(controlUser, OWNER, at, at);
    inviteEmail(control, 'tester@example.com', 'test');
    recordEntryAcceptance(control, controlUser, ENTRY_GATE_VERSION, null);
    expect(gateOwnerRequest(retry(createSession(control, controlUser, FUTURE).id), control, undefined, ENV)).toBeNull();
    // Accepted too, so the 403 below can only come from the unverified address.
    recordEntryAcceptance(db, userId, ENTRY_GATE_VERSION, null);
    const id = createSession(db, userId, FUTURE).id;
    expect(gateOwnerRequest(retry(id), db, undefined, ENV)?.status).toBe(403);
  });

  it('FAILS CLOSED: with the variable unset or blank, nobody is the owner, him included', () => {
    const db = store();
    const id = sessionFor(db, OWNER);
    expect(gateOwnerRequest(retry(id), db, undefined, {})?.status).toBe(403);
    expect(gateOwnerRequest(retry(id), db, undefined, { [OWNER_EMAIL_ENV]: '   ' })?.status).toBe(403);
  });

  it('matches the address the way the allowlist does: case and surrounding space fold', () => {
    const db = store();
    const id = sessionFor(db, OWNER);
    expect(gateOwnerRequest(retry(id), db, undefined, { [OWNER_EMAIL_ENV]: '  Owner@Example.COM ' })).toBeNull();
  });

  it('the owner must accept the entry gate too: unaccepted is 403 "not accepted"', async () => {
    const db = store();
    const response = gateOwnerRequest(retry(sessionFor(db, OWNER, { accepted: false })), db, undefined, ENV);
    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual({ error: 'not accepted' });
  });

  it('isOwnerAdmission is false for anything but an admitted owner', () => {
    const db = store();
    expect(isOwnerAdmission({ state: 'anonymous' }, db, ENV)).toBe(false);
    expect(isOwnerAdmission({ state: 'refused', userId: 1 }, db, ENV)).toBe(false);
  });
});

describe('the Retry control is offered to the owner alone', () => {
  const BASE: DeskMode = { apiBase: '/api', readOnly: false, expiresAt: null, canRetryResearch: false };
  const render = (mode: DeskMode | null) =>
    renderToStaticMarkup(
      mode
        ? createElement(
            DeskModeProvider,
            // children arrives as the third argument; the cast satisfies the
            // provider's props type, which declares children as required.
            { mode } as ComponentProps<typeof DeskModeProvider>,
            createElement(RetryAnalysis, { ticker: 'ABCD' }),
          )
        : createElement(RetryAnalysis, { ticker: 'ABCD' }),
    );

  it('shows for the owner (positive control)', () => {
    expect(render({ ...BASE, canRetryResearch: true })).toContain('Retry analysis');
  });

  it('offers no button to every other viewer, a reviewer, or a desk that never said who is looking, and says so plainly', () => {
    const LINE = 'It runs again if new information about it arrives.';
    for (const html of [
      render(BASE),
      render({ ...BASE, readOnly: true, canRetryResearch: true }),
      render(null),
    ]) {
      expect(html).not.toContain('<button');
      expect(html).not.toContain('Retry analysis');
      expect(html).toContain(LINE);
    }
    expect(render({ ...BASE, canRetryResearch: true })).not.toContain(LINE);
  });
});
