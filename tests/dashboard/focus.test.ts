import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildDeskRead } from '@/lib/dashboard/deskRead';
import { buildDeskRow, mergeDesk } from '@/lib/dashboard/merge';
import { retentionNote, selectFocusRows } from '@/lib/dashboard/view';
import { MockProvider } from '@/lib/data/providers/mock';
import { normalizeSheetRows } from '@/lib/data/rows';
import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import {
  focusCount,
  isFocusSeeded,
  pinFocus,
  readFocus,
  seedFocus,
  unpinFocus,
} from '@/lib/market/store/focusRepo';
import type { DemandState, MarketSnapshot } from '@/lib/market/types';
import { emptySessionVwapSet } from '@/lib/market/vwap';
import { emptyAfterHours } from '@/lib/market/afterHours';

const temporaryFiles: string[] = [];

function temporaryDb(): MarketDatabase {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-focus-')), 'market.db');
  temporaryFiles.push(file);
  return openDatabase(file);
}

afterEach(() => {
  for (const file of temporaryFiles.splice(0)) {
    try {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});

const TODAY = '2026-08-17';
const TOMORROW = '2026-08-18';
const LIMIT = 6;

/** Names are supplied by the caller; nothing here knows a real ticker. */
const A_PRIORITY = ['AAAA', 'BBBB'];

describe('focus persistence', () => {
  it('seeds once from the desk priority names', () => {
    const db = temporaryDb();
    seedFocus(db, { tradingDate: TODAY, candidates: A_PRIORITY, limit: LIMIT });

    expect(readFocus(db, TODAY).map((entry) => entry.ticker)).toEqual(A_PRIORITY);
    expect(readFocus(db, TODAY).every((entry) => entry.source === 'SEED')).toBe(true);
    expect(isFocusSeeded(db, TODAY)).toBe(true);
  });

  it('does not re-seed over the user, even after they empty the list', () => {
    const db = temporaryDb();
    seedFocus(db, { tradingDate: TODAY, candidates: A_PRIORITY, limit: LIMIT });

    for (const ticker of A_PRIORITY) unpinFocus(db, ticker, TODAY);
    expect(focusCount(db, TODAY)).toBe(0);

    // A later load, and a later A-priority name, must not refill the list.
    seedFocus(db, { tradingDate: TODAY, candidates: [...A_PRIORITY, 'CCCC'], limit: LIMIT });
    expect(readFocus(db, TODAY)).toHaveLength(0);
  });

  it('keeps user additions when the seed runs again', () => {
    const db = temporaryDb();
    seedFocus(db, { tradingDate: TODAY, candidates: A_PRIORITY, limit: LIMIT });
    pinFocus(db, { ticker: 'DDDD', tradingDate: TODAY, limit: LIMIT });

    seedFocus(db, { tradingDate: TODAY, candidates: ['EEEE'], limit: LIMIT });

    const tickers = readFocus(db, TODAY).map((entry) => entry.ticker);
    expect(tickers).toContain('DDDD');
    expect(tickers).not.toContain('EEEE');
  });

  it('pins and unpins', () => {
    const db = temporaryDb();

    const pinned = pinFocus(db, { ticker: 'DDDD', tradingDate: TODAY, limit: LIMIT });
    expect(pinned.ok).toBe(true);
    expect(readFocus(db, TODAY).map((entry) => entry.ticker)).toEqual(['DDDD']);

    unpinFocus(db, 'DDDD', TODAY);
    expect(readFocus(db, TODAY)).toHaveLength(0);
  });

  it('treats a repeat pin as a no-op rather than an error', () => {
    const db = temporaryDb();
    pinFocus(db, { ticker: 'DDDD', tradingDate: TODAY, limit: LIMIT });
    const again = pinFocus(db, { ticker: 'DDDD', tradingDate: TODAY, limit: LIMIT });

    expect(again.ok).toBe(true);
    expect(focusCount(db, TODAY)).toBe(1);
  });

  it('survives a reload of the store, which is what a browser refresh does', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-focus-')), 'market.db');
    temporaryFiles.push(file);

    const first = openDatabase(file);
    pinFocus(first, { ticker: 'DDDD', tradingDate: TODAY, limit: LIMIT });
    first.close();

    // A refresh is a new connection reading the same file, not new state.
    const second = openDatabase(file);
    expect(readFocus(second, TODAY).map((entry) => entry.ticker)).toEqual(['DDDD']);
    second.close();
  });

  it('preserves pin order', () => {
    const db = temporaryDb();
    for (const ticker of ['CCCC', 'AAAA', 'BBBB']) {
      pinFocus(db, { ticker, tradingDate: TODAY, limit: LIMIT });
    }
    expect(readFocus(db, TODAY).map((entry) => entry.ticker)).toEqual(['CCCC', 'AAAA', 'BBBB']);
  });

  it('refuses past the limit instead of evicting somebody else', () => {
    const db = temporaryDb();
    const limit = 2;

    expect(pinFocus(db, { ticker: 'AAAA', tradingDate: TODAY, limit }).ok).toBe(true);
    expect(pinFocus(db, { ticker: 'BBBB', tradingDate: TODAY, limit }).ok).toBe(true);

    const refused = pinFocus(db, { ticker: 'CCCC', tradingDate: TODAY, limit });
    expect(refused.ok).toBe(false);
    expect(refused).toMatchObject({ reason: 'LIMIT_REACHED', limit: 2 });

    // The names already pinned are untouched.
    expect(readFocus(db, TODAY).map((entry) => entry.ticker)).toEqual(['AAAA', 'BBBB']);
  });

  it('scopes to the trading date, so a new session starts clean', () => {
    const db = temporaryDb();
    pinFocus(db, { ticker: 'DDDD', tradingDate: TODAY, limit: LIMIT });

    // Momentum attention is session-specific: yesterday's runner is not
    // automatically today's problem.
    expect(readFocus(db, TOMORROW)).toHaveLength(0);
    expect(isFocusSeeded(db, TOMORROW)).toBe(false);

    // And the earlier day's rows are retained rather than deleted.
    expect(readFocus(db, TODAY)).toHaveLength(1);
  });

  it('lets a new trading date seed again', () => {
    const db = temporaryDb();
    seedFocus(db, { tradingDate: TODAY, candidates: ['AAAA'], limit: LIMIT });
    seedFocus(db, { tradingDate: TOMORROW, candidates: ['BBBB'], limit: LIMIT });

    expect(readFocus(db, TOMORROW).map((entry) => entry.ticker)).toEqual(['BBBB']);
  });
});

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

function sheetRow(ticker: string) {
  const row: string[] = new Array(27).fill('');
  row[0] = 'B — SECONDARY';
  row[1] = ticker;
  row[3] = '🟡 FRONTSIDE — WARNING';
  row[4] = '$5.00';
  row[9] = 'A — STRONG/FRESH';
  row[10] = 'Earnings released after Friday close.';
  row[19] = '$5.80';
  row[20] = '16.0%';
  return normalizeSheetRows([row], []).tickers[0]!;
}

describe('focus cards', () => {
  it('reads live telemetry, not the sheet snapshot', () => {
    const row = buildDeskRow('AAAA', sheetRow('AAAA'), null, demand('AAAA'));
    const rows = new Map([['AAAA', row]]);

    const card = selectFocusRows(['AAAA'], rows)[0];
    expect(card.telemetry.source).toBe('ALPACA');
    expect(card.telemetry.price).toBe(5.7);
    expect(card.telemetry.spreadPct).toBe(0.7);
  });

  it('reads merged intelligence, the same object the drawer builds', () => {
    const row = buildDeskRow('AAAA', sheetRow('AAAA'), null, demand('AAAA'));
    const card = selectFocusRows(['AAAA'], new Map([['AAAA', row]]))[0];

    const read = buildDeskRead(card);
    expect(read.telemetry).toBe(card.telemetry);
    expect(read.intelligence).toBe(card.intelligenceState);
    expect(read.whyNow.text).toBe('Earnings released after Friday close.');
  });

  it('keeps a focused name that is no longer ranked', async () => {
    const payload = await new MockProvider().load();
    const dashboard = { ...payload, meta: { ...payload.meta, stale: false, cacheAgeMs: 0 } };
    // The pinned name is not in the ranked discovery list at all.
    const snapshot = {
      health: { offline: true },
      discovery: { ranked: [] },
      demand: { VNTX: demand('VNTX') },
      intelligence: {},
      blueSky: {},
      events: [],
    } as unknown as MarketSnapshot;

    const merged = mergeDesk(dashboard, snapshot);
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
        buildDeskRow(ticker, null, null, demand(ticker)),
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
 * Everything ABOVE this line covers `focusRepo` and the focus CARDS, and none
 * of it was affected by pins becoming cosmetic. I deleted all of it with a
 * `cat >` that overwrote this file instead of appending, and restored it here.
 *
 * `focusRepo` is still live -- Ops removes it in a later step -- so those tests
 * were covering shipped code at the moment they were destroyed. The card tests
 * cover `selectFocusRows`, `retentionNote` and `buildDeskRead`, which have
 * nothing to do with pins at all.
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
