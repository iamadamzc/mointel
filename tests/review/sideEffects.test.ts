import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import { createReviewToken, verifyReviewToken } from '@/lib/review/tokens';

/**
 * A reviewer must be able to look at the desk without leaving a mark on it.
 *
 * The method whitelist in proxy.ts stops the obvious writes. These cover the
 * quieter ones — the state a GET can change without anybody intending it. That
 * is not hypothetical here: the owner's `GET /api/focus` seeds the Focus list
 * on first read, exactly once per trading date, and a review route that copied
 * it would have spent that seed on a stranger's page load.
 */

let directory: string;
let db: MarketDatabase;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-side-'));
  db = openDatabase(path.join(directory, 'market.db'));
});

afterEach(() => {
  db.close();
  fs.rmSync(directory, { recursive: true, force: true });
});

/** Everything a review read could plausibly disturb. */
function stateFingerprint(store: MarketDatabase): string {
  const tables = [
    'focus_tickers',
    'research_jobs',
    'desk_assessments',
    'desk_assessment_tickers',
    'research_analysis_versions',
    'research_dossiers',
    'ticker_session',
  ];

  return tables
    .map((table) => {
      try {
        const row = store.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number };
        return `${table}=${row.n}`;
      } catch {
        return `${table}=absent`;
      }
    })
    .join(',');
}

describe('a review read changes nothing', () => {
  it('verifying a capability does not touch Focus, jobs or assessments', () => {
    const { token } = createReviewToken({ db });
    const before = stateFingerprint(db);

    // A reviewer polling for a while.
    for (let i = 0; i < 25; i += 1) {
      expect(verifyReviewToken(token, { db }).ok).toBe(true);
    }

    expect(stateFingerprint(db)).toBe(before);
  });

  it('writes nothing but the capability\'s own last-used stamp', () => {
    const { token, record } = createReviewToken({ db });

    const rowsBefore = db
      .prepare('SELECT id, token_hash, label, created_at, expires_at, revoked_at FROM review_tokens')
      .all();

    verifyReviewToken(token, { db });

    const rowsAfter = db
      .prepare('SELECT id, token_hash, label, created_at, expires_at, revoked_at FROM review_tokens')
      .all();

    // Everything that defines the capability is untouched; only last_used_at
    // moves, and that is bookkeeping about the reader, not about the desk.
    expect(rowsAfter).toEqual(rowsBefore);

    const used = db
      .prepare('SELECT last_used_at FROM review_tokens WHERE id = ?')
      .get(record.id) as { last_used_at: string | null };
    expect(used.last_used_at).not.toBeNull();
  });

  it('a rejected capability writes nothing at all', () => {
    createReviewToken({ db });
    const before = stateFingerprint(db);
    const tokensBefore = db.prepare('SELECT * FROM review_tokens').all();

    verifyReviewToken('kQ2mP9xLd4Tn7RvBs1WyZc8FgHj3AeUo6NiXr0QpMbE', { db });

    expect(stateFingerprint(db)).toBe(before);
    // Not even a last-used stamp: nothing was authorized, so nothing is recorded.
    expect(db.prepare('SELECT * FROM review_tokens').all()).toEqual(tokensBefore);
  });
});

describe('the review surface cannot reach the things that cost money', () => {
  const routes = path.resolve(__dirname, '../../app/review');

  function sources(directory: string): Array<{ file: string; text: string }> {
    const found: Array<{ file: string; text: string }> = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) found.push(...sources(full));
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        found.push({ file: path.relative(routes, full), text: fs.readFileSync(full, 'utf8') });
      }
    }
    return found;
  }

  it('never queues research or calls a model', () => {
    // Opening a page must not become a way to spend the OpenAI budget or to
    // put work on a queue the owner did not ask for.
    const forbidden = [
      'queueJob',
      'claimQueuedJobs',
      'retryResearch',
      'pinFocus',
      'unpinFocus',
      'seedFocus',
      'claimAssessmentSlot',
      'completeAssessment',
      'insertAssessmentTickers',
      'OpenAiInterpreter',
      'OpenAiDiscoveryProvider',
    ];

    const files = sources(routes);
    expect(files.length).toBeGreaterThan(0);

    for (const { file, text } of files) {
      for (const name of forbidden) {
        expect(text.includes(name), `${file} references ${name}`).toBe(false);
      }
    }
  });

  it('forces a fresh read on every request rather than serving a cached page', () => {
    // A static export would defeat the point: the reviewer is here to judge
    // whether the live desk is current.
    for (const { file, text } of sources(routes)) {
      expect(text, `${file} is not force-dynamic`).toContain("export const dynamic = 'force-dynamic'");
    }
  });
});

describe('the capability never travels outward', () => {
  it('no component sends the review token to an external destination', () => {
    // Evidence links open sec.gov. Referrer-Policy: no-referrer stops the
    // browser attaching the capability URL, and nothing may put it in an href.
    const components = path.resolve(__dirname, '../../components');
    for (const name of fs.readdirSync(components)) {
      const text = fs.readFileSync(path.join(components, name), 'utf8');
      if (!text.includes('target="_blank"')) continue;

      // Every externally-opened link is rel-protected...
      expect(text, `${name} opens a tab without rel=noopener`).toContain('rel="noopener noreferrer"');
      // ...and none of them interpolates the review path into a URL.
      expect(text).not.toMatch(/href=\{[^}]*\/review\//);
    }
  });
});
