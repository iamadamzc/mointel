import { describe, expect, it } from 'vitest';

import { computeFloatBound, type FloatJobDeps, type SubmissionsRecent } from '@/lib/research/floatJob';
import {
  MAX_STATED_READS,
  newestStatedCount,
  statedCountFilings,
  statedCounts,
  type StatedCandidate,
} from '@/lib/research/statedCount';

/*
 * Float fix 2 piece 2 (his yes da37a14b and d157f781): the newest share count a LATER filing states, read with the
 * survey's matcher (8e24cf6a). Common stock only, a count only from a sentence carrying its own date, never guessed.
 */

describe('the matcher (the survey control, unchanged)', () => {
  it('finds dated common-share counts and refuses a sale and a warrant count', () => {
    expect(statedCounts('As of August 26, 2026, there were 1,679,936 shares of common stock issued and outstanding.')).toEqual([{ shares: 1_679_936, asOf: '2026-08-26' }]);
    expect(statedCounts('There were 1,601,770 shares of common stock issued and outstanding as of August 6, 2026.')).toEqual([{ shares: 1_601_770, asOf: '2026-08-06' }]);
    expect(statedCounts('As of September 30, 2026, we had 26,473,222 shares of our common stock outstanding.')).toEqual([{ shares: 26_473_222, asOf: '2026-09-30' }]);
    expect(statedCounts('The company sold 251,666 shares of common stock to the investor.')).toEqual([]);
    expect(statedCounts('As of August 26, 2026, there were 1,679,936 warrants outstanding.')).toEqual([]);
  });

  it('never takes a count of SOME shares or of one class among several (Commercial read 101); the two good shapes still pass', () => {
    const must = [
      '5,000,000 shares of common stock underlying warrants outstanding as of September 1, 2026.',
      '1,000,000 shares of common stock reserved for issuance under our plan, none outstanding as of September 1, 2026.',
      '4,000,000 shares of common stock held by non-affiliates outstanding as of September 1, 2026.',
      'As of September 1, 2026, there were 300,000 shares of common stock held in treasury outstanding.',
      '1,200,000 shares of common stock issuable on conversion of preferred stock outstanding as of September 1, 2026.',
      '3,000,000 shares of common stock into which our notes are convertible, outstanding as of September 1, 2026.',
      '10,000,000 shares of Class A common stock and 5,000,000 shares of Class B common stock outstanding as of September 1, 2026.',
      'As of September 1, 2026, there were 10,000,000 shares of Class A common stock outstanding and 5,000,000 shares of Class B common stock outstanding.',
      '2,000,000 shares of common stock subject to options outstanding as of September 1, 2026.',
    ];
    for (const sentence of must) expect(statedCounts(sentence)).toEqual([]);
    // Controls: the cover style and the "As of DATE, there were N shares ... issued and outstanding" style.
    expect(statedCounts('There were 14,000,000 shares of common stock issued and outstanding as of September 1, 2026.')).toEqual([{ shares: 14_000_000, asOf: '2026-09-01' }]);
    expect(statedCounts('As of September 1, 2026, there were 14,000,000 shares of common stock issued and outstanding.')).toEqual([{ shares: 14_000_000, asOf: '2026-09-01' }]);
  });

  it('never takes a post-offering figure, which assumes full sale (Commercial read 99 (1)), but keeps the dated base count beside it', () => {
    const prospectus =
      '10,000,000 shares of common stock to be outstanding after this offering, based on 8,000,000 shares of common stock outstanding as of September 1, 2026.';
    expect(statedCounts(prospectus)).toEqual([{ shares: 8_000_000, asOf: '2026-09-01' }]);
    expect(statedCounts('As of September 1, 2026, assuming the sale of all shares offered, there would be 10,000,000 shares of common stock outstanding.')).toEqual([]);
    // Refused alone: the restart inside it finds no other dated count, and any tail of the number is refused the same way.
    expect(statedCounts('10,000,000 shares of common stock to be outstanding after this offering, against those outstanding as of September 1, 2026.')).toEqual([]);
  });
});

const listing = (rows: Array<[string, string, string, string]>): SubmissionsRecent => ({
  filings: {
    recent: {
      accessionNumber: rows.map((r) => r[0]),
      form: rows.map((r) => r[1]),
      filingDate: rows.map((r) => r[2]),
      primaryDocument: rows.map((r) => r[3]),
    },
  },
});

describe('which filings are read', () => {
  it('the ruled forms only, after the cover date and by D, newest first', () => {
    const data = listing([
      ['a-1', '8-K', '2026-09-01', 'a.htm'],
      ['a-2', '424B5', '2026-09-10', 'b.htm'],
      ['a-3', 'S-1/A', '2026-09-05', 'c.htm'],
      ['a-4', 'DEF 14A', '2026-08-20', 'd.htm'],
      ['a-5', '10-Q', '2026-09-12', 'e.htm'],
      ['a-6', 'SC 13G', '2026-09-12', 'f.htm'],
      ['a-7', '8-K', '2026-07-31', 'g.htm'],
      ['a-8', 'PRE 14C', '2026-10-02', 'h.htm'],
      ['a-9', '424B3', '2026-09-11', 'i.htm'],
    ]);
    // 424B3 is read here (his yes da37a14b: 424B1-5), though rule I-D's issuance list leaves it out: different questions.
    expect(statedCountFilings(data, '2026-08-01', '2026-09-28').map((c) => c.accession)).toEqual(['a-9', 'a-2', 'a-3', 'a-1', 'a-4']);
  });
});

const candidate = (accession: string, filingDate: string, form = '8-K'): StatedCandidate => ({ accession, filingDate, form, primaryDocument: `${accession}.htm` });
const said = (shares: string, date: string) => `As of ${date}, there were ${shares} shares of common stock outstanding.`;

describe('the newest stated count', () => {
  it('takes the newest DATED count after the cover, and names the filing that states it', async () => {
    const texts: Record<string, string> = {
      n1: said('12,000,000', 'September 1, 2026'),
      n2: said('11,000,000', 'August 20, 2026'),
    };
    const check = await newestStatedCount([candidate('n1', '2026-09-05', 'S-1'), candidate('n2', '2026-08-25')], async (c) => texts[c.accession]!, '2026-08-01', '2026-09-28');
    expect(check.found).toEqual({ shares: 12_000_000, asOf: '2026-09-01', filed: '2026-09-05', accession: 'n1', form: 'S-1' });
  });

  it('stops once no older filing could state a newer date (a filing cannot state a date after it was filed)', async () => {
    const read: string[] = [];
    const texts: Record<string, string> = { n1: said('12,000,000', 'September 1, 2026'), n2: said('13,000,000', 'September 2, 2026') };
    const check = await newestStatedCount(
      [candidate('n1', '2026-09-05'), candidate('n2', '2026-09-01'), candidate('n3', '2026-08-20')],
      async (c) => {
        read.push(c.accession);
        return texts[c.accession] ?? '';
      },
      '2026-08-01',
      '2026-09-28',
    );
    expect(read).toEqual(['n1']);
    expect(check.found?.shares).toBe(12_000_000);
  });

  it('ignores a date on or before the cover, after D, or after its own filing date', async () => {
    const text = [said('9,000,000', 'August 1, 2026'), said('8,000,000', 'October 1, 2026'), said('7,000,000', 'September 20, 2026')].join(' ');
    const check = await newestStatedCount([candidate('n1', '2026-09-10')], async () => text, '2026-08-01', '2026-09-28');
    expect(check.found).toBeNull();
    expect(check.read).toBe(1);
  });

  it('two different counts for the newest date are a conflict: the cover stands', async () => {
    const text = `${said('12,000,000', 'September 1, 2026')} ${said('12,500,000', 'September 1, 2026')}`;
    const check = await newestStatedCount([candidate('n1', '2026-09-05')], async () => text, '2026-08-01', '2026-09-28');
    expect(check.found).toBeNull();
    expect(check.conflict).toEqual({ asOf: '2026-09-01', shares: [12_000_000, 12_500_000] });
  });

  it('a document that cannot be fetched is counted unread and the next one is read', async () => {
    const check = await newestStatedCount(
      [candidate('n1', '2026-09-05'), candidate('n2', '2026-08-25')],
      async (c) => {
        if (c.accession === 'n1') throw new Error('404');
        return said('11,000,000', 'August 20, 2026');
      },
      '2026-08-01',
      '2026-09-28',
    );
    expect(check).toMatchObject({ read: 1, unread: 1, found: { shares: 11_000_000, accession: 'n2' } });
  });

  it('opens at most MAX_STATED_READS a name and counts the rest that could still have been newer', async () => {
    const many = Array.from({ length: MAX_STATED_READS + 3 }, (_, i) => candidate(`m${i}`, `2026-09-${String(20 - i).padStart(2, '0')}`));
    const check = await newestStatedCount(many, async () => 'nothing dated here', '2026-08-01', '2026-09-28');
    expect(check.read).toBe(MAX_STATED_READS);
    expect(check.capped).toBe(3);
  });
});

describe('in the float job', () => {
  const deps = (
    s1: string | null,
    options: { coverEnd?: string; coverFiled?: string; splits?: string[]; extra?: Array<[string, string, string, string]> } = {},
  ): FloatJobDeps => {
    const cover = { end: options.coverEnd ?? '2026-08-01', val: 10_000_000, filed: options.coverFiled ?? '2026-08-10', accn: 'cover-1', form: '10-Q' };
    const facts = { facts: { dei: { EntityCommonStockSharesOutstanding: { units: { shares: [cover] } } } } };
    const subs = listing([
      // The listing must reach the count's date (rule I-D's `listingReaches`), or the job writes no row.
      ['old-1', '10-K', '2026-03-01', 'k.htm'],
      ['cover-1', '10-Q', cover.filed, 'q.htm'],
      ['0000-26-000777', 'S-1', '2026-09-05', 's1.htm'],
      ...(options.extra ?? []),
    ]);
    return {
      getJson: async <T,>(url: string) => (url.includes('companyfacts') ? facts : subs) as T,
      getText: async (url: string) => {
        if (url === 'https://www.sec.gov/Archives/edgar/data/555/000026000777/s1.htm' && s1 !== null) return `<html><body><p>${s1}</p></body></html>`;
        throw new Error('404');
      },
      spanBars: (_symbol, from, to) => [
        { date: from, close: 10, factor: 1 },
        { date: to, close: 10, factor: 1 },
      ],
      announcedSplits: async () => options.splits ?? [],
      announcedActions: async () => [],
      now: () => '2026-09-28T23:00:00.000Z',
    };
  };
  const STATED = said('14,000,000', 'September 1, 2026');
  const run = (d: FloatJobDeps) => computeFloatBound({ symbol: 'ACME', cik: '555', asOfDate: '2026-09-28', dossier: { analysisVersionId: 1, ledger: [] } }, d);

  /*
   * Commercial read 99 (4), until L6 restates across splits: a newer count never inherits the cover's clean result.
   * The split check, the issuance check and the 90-day age all run from the STATED count's own date.
   */
  it('a split announced AFTER the stated count\'s date gives "Cannot verify"; one before it (already in the count) does not', async () => {
    expect((await run(deps(STATED, { splits: ['2026-09-15'] }))).cell).toEqual({ state: 'CANNOT_VERIFY', reason: 'SPLIT_SINCE_COUNT' });
    expect((await run(deps(STATED, { splits: ['2026-08-15'] }))).cell).toMatchObject({ state: 'PRODUCED', bound: 14_000_000 });
  });

  it('the issuance check runs from the stated count\'s date: a 424B5 after it refuses, one before it does not', async () => {
    expect((await run(deps(STATED, { extra: [['p-1', '424B5', '2026-09-10', 'p.htm']] }))).cell).toEqual({ state: 'CANNOT_VERIFY', reason: 'ISSUANCE_FILED' });
    expect((await run(deps(STATED, { extra: [['p-2', '424B5', '2026-08-20', 'p.htm']] }))).cell).toMatchObject({ state: 'PRODUCED' });
  });

  it('the 90-day age counts from the stated count\'s date: a stale cover with a fresh stated count gives a number', async () => {
    const stale = { coverEnd: '2026-05-01', coverFiled: '2026-05-10' };
    expect((await run(deps(null, stale))).cell).toEqual({ state: 'CANNOT_VERIFY', reason: 'COUNT_TOO_OLD' });
    expect((await run(deps(STATED, stale))).cell).toMatchObject({ state: 'PRODUCED', bound: 14_000_000 });
  });

  it('a later S-1\'s dated count becomes the count, and the cover it replaced is kept on the row', async () => {
    const row = await run(deps(STATED));
    expect(row.count).toEqual({ kind: 'COUNT', shares: 14_000_000, asOf: '2026-09-01', filed: '2026-09-05', accession: '0000-26-000777', form: 'S-1' });
    expect(row.statedCount?.cover).toEqual({ shares: 10_000_000, asOf: '2026-08-01', filed: '2026-08-10', accession: 'cover-1', form: '10-Q' });
    expect(row.statedCount?.read).toBe(1);
  });

  it('no stated count found: the cover count stands and the read is still recorded', async () => {
    const row = await run(deps(null));
    expect(row.count).toMatchObject({ kind: 'COUNT', shares: 10_000_000, asOf: '2026-08-01', form: '10-Q' });
    expect(row.statedCount).toMatchObject({ found: null, read: 0, unread: 1 });
  });
});
