import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  INTERNAL_TOKEN_ENV,
  INTERNAL_TOKEN_HEADER,
  hasInternalCredential,
  internalCredentialHeaders,
} from '@/lib/auth/internalCredential';
import { gateApiRequest, gateInternalOrApiRequest } from '@/lib/auth/requestGate';
import { openIdentityStore, type IdentityDatabase } from '@/lib/auth/store';

/*
 * The box's internal credential. Every refusal below has a sibling that
 * admits, so a credential that admitted nobody (or everybody) cannot pass.
 */

const SECRET = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
const ENV = { [INTERNAL_TOKEN_ENV]: SECRET };

function req(header?: string): Request {
  return new Request('http://127.0.0.1:3000/api/dashboard', {
    headers: header === undefined ? {} : { [INTERNAL_TOKEN_HEADER]: header },
  });
}

describe('hasInternalCredential', () => {
  it('admits the right secret (the positive control)', () => {
    expect(hasInternalCredential(req(SECRET), ENV)).toBe(true);
  });

  it('refuses a wrong secret, a near miss, and a different length', () => {
    expect(hasInternalCredential(req('x'.repeat(SECRET.length)), ENV)).toBe(false);
    expect(hasInternalCredential(req(SECRET.slice(0, -1) + '1'), ENV)).toBe(false);
    expect(hasInternalCredential(req(SECRET + 'a'), ENV)).toBe(false);
    expect(hasInternalCredential(req(SECRET.slice(0, 10)), ENV)).toBe(false);
  });

  it('refuses a request with no header, or an empty one', () => {
    expect(hasInternalCredential(req(), ENV)).toBe(false);
    expect(hasInternalCredential(req(''), ENV)).toBe(false);
  });

  it('FAILS CLOSED when no secret is configured: a missing variable plus a missing header is not a match', () => {
    expect(hasInternalCredential(req(), {})).toBe(false);
    expect(hasInternalCredential(req(''), {})).toBe(false);
    expect(hasInternalCredential(req(), { [INTERNAL_TOKEN_ENV]: '' })).toBe(false);
    expect(hasInternalCredential(req(''), { [INTERNAL_TOKEN_ENV]: '   ' })).toBe(false);
    // A header with NO secret configured is a refusal, not an exception.
    expect(hasInternalCredential(req('anything'), {})).toBe(false);
    expect(hasInternalCredential(req(SECRET), {})).toBe(false);
  });

  it('refuses a configured secret that is too short, even when the header equals it', () => {
    expect(hasInternalCredential(req('short'), { [INTERNAL_TOKEN_ENV]: 'short' })).toBe(false);
  });
});

describe('internalCredentialHeaders', () => {
  it('carries the secret when configured, and nothing when not', () => {
    expect(internalCredentialHeaders(ENV)).toEqual({ [INTERNAL_TOKEN_HEADER]: SECRET });
    expect(internalCredentialHeaders({})).toEqual({});
    expect(internalCredentialHeaders({ [INTERNAL_TOKEN_ENV]: 'short' })).toEqual({});
  });

  it('round-trips: what a worker sends is what the route accepts', () => {
    const headers = internalCredentialHeaders(ENV);
    const request = new Request('http://127.0.0.1:3000/api/dashboard', { headers });
    expect(hasInternalCredential(request, ENV)).toBe(true);
  });
});

describe('the gates', () => {
  const dirs: string[] = [];
  const opened: IdentityDatabase[] = [];
  afterEach(() => {
    while (opened.length) opened.pop()?.close();
    while (dirs.length) {
      try {
        fs.rmSync(dirs.pop()!, { recursive: true, force: true });
      } catch {
        /* Windows may hold the handle briefly. */
      }
    }
  });
  function store(): IdentityDatabase {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-internal-'));
    dirs.push(dir);
    const db = openIdentityStore(path.join(dir, 'identity.db'));
    opened.push(db);
    return db;
  }

  it('the dashboard gate admits the credential with no session, and the plain gate does not', () => {
    const db = store();
    expect(gateInternalOrApiRequest(req(SECRET), db, undefined, ENV)).toBeNull();
    // The same request on every other route's gate: refused as anonymous, WITH
    // the secret configured in this process's own env (the plain gate reads
    // process.env, so a gate that honoured it would admit here). The credential
    // opens ONE route, not the API.
    vi.stubEnv(INTERNAL_TOKEN_ENV, SECRET);
    try {
      expect(hasInternalCredential(req(SECRET))).toBe(true);
      expect(gateApiRequest(req(SECRET), db)?.status).toBe(401);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('the dashboard gate still refuses an anonymous request without the credential', () => {
    const db = store();
    expect(gateInternalOrApiRequest(req(), db, undefined, ENV)?.status).toBe(401);
    expect(gateInternalOrApiRequest(req('wrong'), db, undefined, ENV)?.status).toBe(401);
    expect(gateInternalOrApiRequest(req(), db, undefined, {})?.status).toBe(401);
  });
});
