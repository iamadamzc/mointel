/**
 * A cached, process-wide handle to the identity store for the APP runtime.
 *
 * WEB glue. The `/auth/*` handlers and the gate each need one long-lived handle
 * rather than opening the store on every request. Mirrors the market read
 * model's `globalThis` cache (`lib/market/readModel.ts`) so a dev-server hot
 * reload reuses one connection instead of leaking a new one each time.
 *
 * Unlike the market cache this is READ-WRITE: sign-in writes a session, sign-out
 * and revocation update one. `openIdentityStore` already sets WAL, a busy
 * timeout and foreign keys, and refuses to open inside a release directory — so
 * with `IDENTITY_DB_PATH` unset in production this throws loudly rather than
 * writing accounts somewhere `prune.sh` will delete them.
 *
 * The admin script (`scripts/allowlist.ts`) opens its own short-lived handle;
 * this cache is for the long-running web process only.
 */

import { DEFAULT_IDENTITY_PATH, openIdentityStore, type IdentityDatabase } from '@/lib/auth/store';

const globalStore = globalThis as typeof globalThis & {
  __mointelIdentityDb?: { db: IdentityDatabase; path: string };
};

export function getIdentityDb(
  // Resolved per call, not at import: `DEFAULT_IDENTITY_PATH` captures the env at
  // module load, but the accessor should honour `IDENTITY_DB_PATH` as it is when
  // it actually opens the store. In production the env is set before the process
  // starts, so this only matters to a test that sets it after import.
  path: string = process.env.IDENTITY_DB_PATH ?? DEFAULT_IDENTITY_PATH,
): IdentityDatabase {
  const cached = globalStore.__mointelIdentityDb;
  if (cached && cached.path === path) return cached.db;

  const db = openIdentityStore(path);
  globalStore.__mointelIdentityDb = { db, path };
  return db;
}

/** Drops the cached handle. For tests and for a future store re-creation. */
export function resetIdentityDb(): void {
  try {
    globalStore.__mointelIdentityDb?.db.close();
  } catch {
    /* already closed */
  }
  globalStore.__mointelIdentityDb = undefined;
}
