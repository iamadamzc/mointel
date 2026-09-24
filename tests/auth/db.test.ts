import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { getIdentityDb, resetIdentityDb } from '@/lib/auth/db';
import { listInvitedEmails } from '@/lib/auth/store';

const temporaryDirs: string[] = [];

function temporaryPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-identity-db-'));
  temporaryDirs.push(dir);
  return path.join(dir, 'identity.db');
}

afterEach(() => {
  resetIdentityDb();
  while (temporaryDirs.length) {
    const dir = temporaryDirs.pop();
    try {
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows may hold the handle briefly. */
    }
  }
});

describe('getIdentityDb', () => {
  it('opens a usable store (schema applied)', () => {
    const db = getIdentityDb(temporaryPath());
    expect(listInvitedEmails(db)).toEqual([]);
  });

  it('returns the same handle for the same path', () => {
    const p = temporaryPath();
    expect(getIdentityDb(p)).toBe(getIdentityDb(p));
  });

  it('opens a fresh handle for a different path', () => {
    expect(getIdentityDb(temporaryPath())).not.toBe(getIdentityDb(temporaryPath()));
  });

  it('reopens after a reset', () => {
    const p = temporaryPath();
    const first = getIdentityDb(p);
    resetIdentityDb();
    expect(getIdentityDb(p)).not.toBe(first);
  });
});
