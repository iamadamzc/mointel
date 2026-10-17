import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { sessionExpiry } from '@/lib/auth/expiry';
import { MARKET_DAYS } from '@/tests/auth/marketDays';
import { createSession, linkIdentity, openIdentityStore, type IdentityDatabase } from '@/lib/auth/store';

const temporaryDirs: string[] = [];

export function temporaryStore(): IdentityDatabase {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-billing-'));
  temporaryDirs.push(dir);
  return openIdentityStore(path.join(dir, 'identity.db'));
}

export function cleanupStores(): void {
  while (temporaryDirs.length) {
    const dir = temporaryDirs.pop();
    try {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows may hold the handle briefly. */
    }
  }
}

/** A Google user with a verified address. */
export function verifiedUser(db: IdentityDatabase, email = 'buyer@example.com', subject = 'sub-buyer'): number {
  return linkIdentity(db, { provider: 'google', subject, email, emailVerified: true }).userId;
}

/** A session issued at `now`, returning its id and the stored row's expiry. */
export function signIn(db: IdentityDatabase, userId: number, now: Date) {
  const issued = createSession(db, userId, sessionExpiry(now, MARKET_DAYS), now);
  return issued.id;
}

export function sessionExpiries(db: IdentityDatabase, userId: number): string[] {
  return (
    db.prepare('SELECT expires_at AS e FROM sessions WHERE user_id = ? ORDER BY created_at').all(userId) as {
      e: string;
    }[]
  ).map((row) => row.e);
}

/** Monday 2026-10-19, 10:00 ET (EDT, UTC-4). A trading day. */
export const MON_10_ET = new Date('2026-10-19T14:00:00.000Z');
/** 20:00 ET that Monday: the paid day's end. */
export const MON_CLOSE = '2026-10-20T00:00:00.000Z';
