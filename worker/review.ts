/**
 * `npm run review:create` / `review:list` / `review:revoke` / `review:revoke-all`
 *
 * Operator commands for temporary read-only inspection links.
 *
 * The created token is printed once, here, because the operator explicitly
 * asked for it and there is nowhere else it can come from — it is not stored
 * and cannot be recovered. It is never written to an application log, never
 * put in the journal, and never committed.
 *
 * Run it on the server so the capability exists in the production store:
 *
 *   sudo -u mointel env -C /opt/mointel/current \
 *     MARKET_DB_PATH=/var/lib/mointel/market.db npm run review:create
 *
 * scripts/aws-create-review.ps1 does that over SSH from Windows.
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import {
  createReviewToken,
  listReviewTokens,
  revokeAllReviewTokens,
  revokeReviewToken,
  DEFAULT_REVIEW_HOURS,
} from '../lib/review/tokens';

/** Where the link points. The host is not knowable from inside the process. */
const BASE_URL = process.env.MOINTEL_PUBLIC_URL ?? 'https://<distribution-host>';

function etClock(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function flag(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function create(): void {
  const hoursRaw = flag('hours');
  const hours = hoursRaw ? Number(hoursRaw) : DEFAULT_REVIEW_HOURS;
  if (!Number.isFinite(hours) || hours <= 0) {
    console.error(`[review] --hours must be a positive number, got "${hoursRaw}"`);
    process.exitCode = 1;
    return;
  }

  const { record, token } = createReviewToken({ hours, label: flag('label') });

  console.log('');
  console.log('  Read-only review session created.');
  console.log('');
  // No trailing slash: Next redirects `/review/<token>/` to the same path
  // without one, and a 308 on the first request is a hop that some
  // automated fetchers handle less gracefully than a browser does.
  console.log(`  URL      ${BASE_URL}/review/${token}`);
  console.log('');
  console.log(`  id       ${record.id}`);
  if (record.label) console.log(`  label    ${record.label}`);
  console.log(`  expires  ${etClock(record.expiresAt)} ET  (${record.expiresAt})`);
  console.log('');
  console.log('  This URL grants read-only access to the live desk without a password.');
  console.log('  It is shown once and is not recoverable. Revoke it when the review');
  console.log(`  is finished:  npm run review:revoke -- ${record.id}`);
  console.log('');
}

function list(): void {
  const tokens = listReviewTokens();
  if (tokens.length === 0) {
    console.log('[review] no review sessions have been created');
    return;
  }

  console.log('');
  console.log('  id   status    label                created              expires              last used');
  console.log('  ---  --------  -------------------  -------------------  -------------------  -------------------');
  for (const token of tokens) {
    // Deliberately no token, and no hash either: the hash is not a secret but
    // printing it invites somebody to treat it as one they can use.
    console.log(
      `  ${String(token.id).padEnd(3)}  ` +
        `${token.status.padEnd(8)}  ` +
        `${(token.label ?? '—').slice(0, 19).padEnd(19)}  ` +
        `${etClock(token.createdAt).padEnd(19)}  ` +
        `${etClock(token.expiresAt).padEnd(19)}  ` +
        `${token.lastUsedAt ? etClock(token.lastUsedAt) : 'never'}`,
    );
  }
  console.log('');
  console.log('  Times are ET.');
  console.log('');
}

function revoke(): void {
  const id = Number(process.argv[3]);
  if (!Number.isInteger(id)) {
    console.error('[review] usage: npm run review:revoke -- <id>');
    process.exitCode = 1;
    return;
  }

  if (revokeReviewToken(id)) console.log(`[review] session ${id} revoked; it stops working immediately`);
  else {
    console.error(`[review] session ${id} not found, or already revoked`);
    process.exitCode = 1;
  }
}

function revokeAll(): void {
  const count = revokeAllReviewTokens();
  console.log(`[review] revoked ${count} active session(s)`);
}

const command = process.argv[2];
switch (command) {
  case 'create':
    create();
    break;
  case 'list':
    list();
    break;
  case 'revoke':
    revoke();
    break;
  case 'revoke-all':
    revokeAll();
    break;
  default:
    console.error('[review] usage: review <create|list|revoke <id>|revoke-all>');
    process.exitCode = 1;
}
