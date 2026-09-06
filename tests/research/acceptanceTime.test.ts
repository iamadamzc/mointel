import { describe, expect, it } from 'vitest';

import { parseSubmissions } from '@/lib/research/sec/submissions';

/**
 * The time of day was in a payload the desk already downloads.
 *
 * For months every same-day timing question was unanswerable, and it read as a
 * property of the SOURCE — *"the store has no time of day"*, said by me twice.
 * `acceptanceDateTime` sits on the same row of `filings.recent` as the
 * `filingDate` that was being read instead. Verified against a live payload
 * before this was written.
 *
 * These pin the two halves that matter: that it is READ, and that a MISSING one
 * is never replaced by an invented time — which is the only failure that would
 * be worse than not having it at all, because the field exists to answer
 * questions about when something was observable.
 */

const payload = (acceptance: unknown[]) => ({
  cik: '0000000001',
  filings: {
    recent: {
      accessionNumber: ['0001-26-01', '0001-26-02'],
      form: ['8-K', '10-Q'],
      filingDate: ['2026-09-02', '2026-09-01'],
      acceptanceDateTime: acceptance,
      reportDate: ['', ''],
      primaryDocument: ['a.htm', 'b.htm'],
      primaryDocDescription: ['', ''],
      items: ['', ''],
    },
  },
});

describe('the acceptance time is read, not the filing date alone', () => {
  it('carries the stamp EDGAR recorded', () => {
    const profile = parseSubmissions(
      payload(['2026-09-02T06:31:15.000Z', '2026-09-01T21:04:00.000Z']) as never,
      '0000000001',
    );

    expect(profile.filings[0]?.acceptanceDateTime).toBe('2026-09-02T06:31:15.000Z');
    // And the filing date is untouched beside it: the two answer different
    // questions and neither replaces the other.
    expect(profile.filings[0]?.filingDate).toBe('2026-09-02');
  });

  it('distinguishes a pre-open acceptance from a same-day filing date', () => {
    /*
     * THE WHOLE POINT, IN ONE ASSERTION. Both filings carry the same shape of
     * `filingDate` and one was accepted at 06:31Z — 02:31 ET, before the
     * session — while the other landed at 21:04Z, after the close. A bare date
     * cannot tell those apart, and the desk's window question is exactly that
     * distinction.
     */
    const profile = parseSubmissions(
      payload(['2026-09-02T06:31:15.000Z', '2026-09-01T21:04:00.000Z']) as never,
      '0000000001',
    );

    const hours = profile.filings.map((f) => new Date(f.acceptanceDateTime!).getUTCHours());
    expect(hours).toEqual([6, 21]);
  });
});

describe('a missing acceptance is null, never an invented time', () => {
  it('returns null for a blank entry rather than falling back to midnight', () => {
    const profile = parseSubmissions(payload(['', '2026-09-01T21:04:00.000Z']) as never, '0000000001');

    expect(profile.filings[0]?.acceptanceDateTime).toBeNull();
    // Not the filing date, and not a synthesised stamp on it. The store already
    // carries 12:00Z placeholders from another path, and they are exactly what
    // makes those rows unusable for a timing question.
    expect(profile.filings[0]?.acceptanceDateTime).not.toBe('2026-09-02');
    expect(profile.filings[0]?.filingDate).toBe('2026-09-02');
  });

  it('survives a payload with no acceptance column at all', () => {
    // Older cached payloads and any endpoint change must degrade to what the
    // desk had before rather than throwing on every issuer.
    const raw = payload([]) as unknown as { filings: { recent: Record<string, unknown[]> } };
    delete raw.filings.recent.acceptanceDateTime;

    const profile = parseSubmissions(raw as never, '0000000001');
    expect(profile.filings).toHaveLength(2);
    expect(profile.filings[0]?.acceptanceDateTime).toBeNull();
    expect(profile.filings[0]?.filingDate).toBe('2026-09-02');
  });
});
