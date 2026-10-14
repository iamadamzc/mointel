import { describe, expect, it } from 'vitest';

import { buildDeskRead } from '@/lib/dashboard/deskRead';
import { buildDeskRow, mergeDesk } from '@/lib/dashboard/merge';
import { retentionNote, selectFocusRows } from '@/lib/dashboard/view';
import type { DemandState, MarketSnapshot } from '@/lib/market/types';
import { emptySessionVwapSet } from '@/lib/market/vwap';
import { emptyAfterHours } from '@/lib/market/afterHours';

const TODAY = '2026-08-17';

/* ------------------------------------------------------------ focus display */

function demand(ticker: string, overrides: Partial<DemandState> = {}): DemandState {
  return {
    ticker,
    tradingDate: TODAY,
    price: 5.7,
    priceSource: 'sip-trade',
    priceAt: '2026-08-17T15:40:00.000Z',
    barClose: 5.69,
    barAt: '2026-08-17T15:40:00.000Z',
    previousClose: 5.0,
    previousCloseSource: 'alpaca-daily-bar',
    referenceRthClose: 5.0,
    referenceRthCloseDate: '2026-08-14',
    referenceRthCloseSource: 'alpaca-daily-bar-rth-close',
    referenceRthCloseBasis: 'PRIOR_SESSION',
    percentChange: 14.1,
    cumulativeVolume: 2_145_321,
    volumeSource: 'minute-bars',
    volumeBase: 0,
    volumeBaseThrough: null,
    volumeBaseSource: null,
    sessionHigh: 6.69,
    sessionLow: 5.32,
    vwap: emptySessionVwapSet(),
    rvol: 2.02,
    rvolRank: 88,
    previousRvolRank: 92,
    rvolRankChange: 4,
    rvolConfidence: 'OK',
    baselineSessions: 20,
    baselineAverageVolume: 1_060_000,
    baselineCalculatedAt: '2026-08-17T08:00:00.000Z',
    baselineAdjustment: 'split',
    quote: {
      bid: 5.68,
      bidSize: 2,
      ask: 5.72,
      askSize: 3,
      spread: 0.04,
      spreadPct: 0.7,
      at: null,
      invalid: false,
    },
    luld: { lower: null, upper: null, at: null },
    haltState: 'TRADING',
    haltRaw: null,
    haltAt: null,
    highRes: true,
    top12EnteredAt: null,
    qualified: null,
    latched: false,
    rthFinal: null,
    afterHours: emptyAfterHours(),
    feed: 'sip',
    freshness: { lastEventAt: '2026-08-17T15:40:00.000Z', ageSeconds: 3, stale: false },
    updatedAt: '2026-08-17T15:40:02.000Z',
    ...overrides,
  };
}


describe('focus cards', () => {
  it('reads live telemetry, not the sheet snapshot', () => {
    const row = buildDeskRow('AAAA', demand('AAAA'));
    const rows = new Map([['AAAA', row]]);

    const card = selectFocusRows(['AAAA'], rows)[0];
    expect(card.telemetry.source).toBe('ALPACA');
    expect(card.telemetry.price).toBe(5.7);
    expect(card.telemetry.spreadPct).toBe(0.7);
  });

  it('reads merged intelligence, the same object the drawer builds', () => {
    const row = buildDeskRow('AAAA', demand('AAAA'));
    const card = selectFocusRows(['AAAA'], new Map([['AAAA', row]]))[0];

    const read = buildDeskRead(card);
    expect(read.telemetry).toBe(card.telemetry);
    expect(read.intelligence).toBe(card.intelligenceState);
    // Desk only (Sheet switch-off 3a): with no desk dossier there is no Why Now, whatever the Sheet says.
    expect(read.whyNow.text).toBeNull();
  });

  it('keeps a focused name that is no longer ranked', async () => {
    // The pinned name is not in the ranked discovery list at all.
    const snapshot = {
      health: { offline: true },
      discovery: { ranked: [] },
      demand: { VNTX: demand('VNTX') },
      intelligence: {},
      blueSky: {},
      events: [],
    } as unknown as MarketSnapshot;

    const merged = mergeDesk(snapshot);
    expect(merged.discovery).toHaveLength(0);

    const focus = selectFocusRows(['VNTX'], merged.rows);
    expect(focus).toHaveLength(1);
    expect(focus[0].telemetry.source).toBe('ALPACA');
  });

  it('skips a pinned name with no data rather than rendering an empty card', () => {
    expect(selectFocusRows(['NOPE'], new Map())).toHaveLength(0);
  });

  /*
   * LATCH described an engine mechanism, appeared beside nearly every ticker,
   * and told a trader nothing. It only earns a word when the retention is
   * actually holding a name that has left the discovery band.
   */
  it('says nothing about retention while a name is inside the discovery band', () => {
    expect(retentionNote({ latched: true, price: 7.5, priceMin: 1, priceMax: 20 })).toBeNull();
    expect(retentionNote({ latched: true, price: 1, priceMin: 1, priceMax: 20 })).toBeNull();
    expect(retentionNote({ latched: true, price: 20, priceMin: 1, priceMax: 20 })).toBeNull();
  });

  it('says which side a retained name left the band on', () => {
    expect(retentionNote({ latched: true, price: 24.4, priceMin: 1, priceMax: 20 })).toBe(
      'retained > $20',
    );
    expect(retentionNote({ latched: true, price: 0.62, priceMin: 1, priceMax: 20 })).toBe(
      'retained < $1',
    );
  });

  it('says nothing for a name that was never retained, or has no price', () => {
    expect(retentionNote({ latched: false, price: 24.4, priceMin: 1, priceMax: 20 })).toBeNull();
    expect(retentionNote({ latched: true, price: null, priceMin: 1, priceMax: 20 })).toBeNull();
  });

  it('renders one card per pinned name, in pin order', () => {
    const rows = new Map(
      ['AAAA', 'BBBB'].map((ticker) => [
        ticker,
        buildDeskRow(ticker, demand(ticker)),
      ]),
    );

    expect(selectFocusRows(['BBBB', 'AAAA'], rows).map((row) => row.ticker)).toEqual([
      'BBBB',
      'AAAA',
    ]);
  });
});

/* ------------------------------------------------------------------------- *
 * IN-MEMORY PINS (2026-09-07)
 *
 * Everything ABOVE this line covers the focus CARDS. I deleted it, and ten
 * `focusRepo` cases beside it, with a `cat >` that overwrote this file instead
 * of appending, and restored all eighteen here.
 *
 * `focusRepo` WAS still live when they were destroyed, so they were covering
 * shipped code at that moment -- which is why restoring them was right even
 * though Ops removed the repo, and the ten with it, hours later. UPDATED
 * BECAUSE THE ORIGINAL SENTENCE SAID "Ops removes it in a LATER STEP" AND THAT
 * STEP HAS NOW HAPPENED: a comment written in the future tense goes stale the
 * moment the future arrives, and nothing fails when it does.
 *
 * The card tests that remain cover `selectFocusRows`, `retentionNote` and
 * `buildDeskRead`, which have nothing to do with pins at all.
 * ------------------------------------------------------------------------- */

/*
 * Pins are cosmetic from `dd3bca0` -- a pin used to admit a ticker past the
 * rank gate and into the research queue, which he did not know and ruled out.
 * So the state has no reason to leave the tab.
 */
describe('the focus hook holds nothing outside the tab', () => {
  /*
   * COMMENTS STRIPPED, AND THIS IS THE THIRD TIME IT HAS BEEN NEEDED.
   *
   * A source test that FORBIDS a term will fail on the comment EXPLAINING why
   * the term is forbidden -- the file says "no localStorage, deliberately", and
   * a naive match cannot tell code from prose about code. The Move label, the
   * placeholder tone and now this.
   */
  const NL = String.fromCharCode(10);
  const read = async (f: string) => {
    const raw = await import('node:fs').then((fs) => fs.promises.readFile(f, 'utf8'));
    return raw
      .split(NL)
      .filter((line) => {
        const t = line.trim();
        return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
      })
      .join(NL);
  };

  /*
   * NO BROWSER STORAGE, DELIBERATELY. There is none anywhere in this app, so
   * persisting would be the first browser-held state the desk has had -- and
   * pins were date-scoped, so a stored one needs expiry logic or a Friday pin
   * reappears on Tuesday. That is stale-state-that-looks-live.
   */
  it('uses no browser storage', async () => {
    const source = await read('lib/hooks/useFocus.ts');
    // The instrument can see the file it is asserting about.
    expect(source).toContain('export function useFocus');
    expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB/);
  });

  /* Cosmetic means no write. A pin that still POSTed would still be a fact on
   * the server, whatever the label said. */
  it('calls no API', async () => {
    const source = await read('lib/hooks/useFocus.ts');
    expect(source).not.toMatch(/fetch\(|apiBase/);
  });

  /*
   * The refusal is stated rather than swallowed. A click that silently does
   * nothing is the same failure as an optimistic update that silently fails.
   */
  it('states the refusal at the limit', async () => {
    const source = await read('lib/hooks/useFocus.ts');
    expect(source).toContain('FOCUS_LIMIT');
    expect(source).toMatch(/setMessage\(`Focus holds/);
  });

  /*
   * A field that cannot be known must not be typed as knowable. `tradingDate`
   * came from the server and has no client source, so it is gone rather than
   * returned as an empty string -- the fabricated-value pattern removed from
   * the placeholder family.
   */
  it('returns no field it cannot know', async () => {
    const source = await read('lib/hooks/useFocus.ts');
    expect(source).not.toMatch(/tradingDate/);
  });
});

/*
 * The badge meant "pinned AND therefore researched". Pins are cosmetic now, so
 * a reader months from now would read it as a display preference and miss that
 * it was a research lever. Keeping it preserves a token, not a fact.
 */
describe('assessment history does not render the focus badge', () => {
  it('renders no focus marker', async () => {
    const source = await import('node:fs').then((fs) =>
      fs.promises.readFile('components/AssessmentHistory.tsx', 'utf8'),
    );
    // The instrument can see the file.
    expect(source).toContain('row.ticker');
    expect(source).not.toMatch(/\{row\.focus/);
  });
});
