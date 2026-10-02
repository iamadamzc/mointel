import { readFileSync } from 'node:fs';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import {
  airPocketAboveHolds,
  computedText,
  horizonText,
  LEVELS_ABSENT_TEXT,
  levelLines,
  levelsNote,
  NEAREST_LEVELS,
  shownStoredRows,
  storedLadderRows,
} from '@/lib/dashboard/resistance';
import type { ResistanceLevel, ResistanceLevels } from '@/lib/market/resistance';

/*
 * Written from his rulings and spec §2 (docs/research/resistance-levels-spec.md),
 * not from the implementation:
 * - every level is shown, nearest first ("a, show all 7"); the only tag is the
 *   timeframe; nothing highlighted, nothing called measured or tested;
 * - absent (not computed) and empty (computed, nothing stored above) read
 *   differently, and empty never says "all-time high".
 */

const level = (price: number, extra: Partial<ResistanceLevel> = {}): ResistanceLevel => ({
  price,
  low: price,
  high: price,
  timeframes: ['5m'],
  tops: 1,
  newestTopEnd: '2026-09-29T14:00:00Z',
  oldestTopEnd: '2026-09-29T14:00:00Z',
  ...extra,
});

const row = (extra: Partial<ResistanceLevels> = {}): ResistanceLevels => ({
  symbol: 'SLXN',
  tradingDate: '2026-09-29',
  computedAt: '2026-09-29T15:55:00Z',
  price: 4,
  levels: [],
  horizon: {
    fiveMinFrom: '2026-09-29T08:00:00Z',
    fifteenMinFrom: '2026-09-09T08:00:00Z',
    dailyFrom: '2025-09-29T12:00:00Z',
  },
  ...extra,
});

describe('every level, nearest first', () => {
  it('draws all of them, with no cap, in ascending order whatever order they arrive in', () => {
    const prices = [6.5, 4.1, 5.02, 4.4, 9, 4.25, 7.75, 12, 4.05];
    const lines = levelLines(row({ levels: prices.map((p) => level(p)) }));
    expect(lines).toHaveLength(prices.length);
    expect(lines.map((line) => line.price)).toEqual(
      [...prices].sort((a, b) => a - b).map((p) => `$${p.toFixed(2)}`),
    );
  });

  it('says how far above the price each level sits', () => {
    const [line] = levelLines(row({ price: 4, levels: [level(4.2)] }));
    expect(line.distance).toBe('+5.0%');
  });

  it('tags each level with its timeframes, coarsest first as given, and nothing else', () => {
    const [line] = levelLines(row({ levels: [level(5, { timeframes: ['daily', '15m', '5m'] })] }));
    expect(line.tags).toBe('daily · 15m · 5m');
  });

  it('shows a span only when tops at different prices merged', () => {
    const [single, merged] = levelLines(row({ levels: [level(4.5), level(5, { low: 4.98, high: 5.03, tops: 3 })] }));
    expect(single.span).toBeNull();
    expect(merged.span).toBe('4.98 to 5.03');
    expect(merged.title).toMatch(/^3 candle tops/);
  });

  it('marks the one far-back daily peak', () => {
    const [near, far] = levelLines(row({ levels: [level(4.5), level(9, { beyondHorizon: true })] }));
    expect(near.farBack).toBe(false);
    expect(far.farBack).toBe(true);
  });

  it('drops a level that is not a price rather than drawing it', () => {
    expect(levelLines(row({ levels: [level(4.5), level(Number.NaN), level(0)] }))).toHaveLength(1);
  });
});

describe('one ladder: the stored levels on the price axis (his ruling 2026-10-02T11:51:56Z)', () => {
  it('places each level against the LIVE price: above it, or below once the price has crossed it', () => {
    const rows = storedLadderRows(row({ price: 4, levels: [level(4.1), level(4.6), level(5)] }), 4.5);
    expect(rows.map((r) => [r.priceText, r.side])).toEqual([
      ['4.10', 'BELOW'],
      ['4.60', 'ABOVE'],
      ['5.00', 'ABOVE'],
    ]);
  });

  it('measures the distance from the live price in the ladder form, and falls back to its own price', () => {
    const [live] = storedLadderRows(row({ price: 4, levels: [level(5)] }), 4.5);
    expect(live.distanceAbs).toBeCloseTo(0.5, 6);
    expect(live.distancePct).toBeCloseTo((0.5 / 4.5) * 100, 6);
    const [own] = storedLadderRows(row({ price: 4, levels: [level(5)] }), null);
    expect(own.side).toBe('ABOVE');
    expect(own.distancePct).toBeCloseTo(25, 6);
  });

  it("prints prices in the ladder's own format, three decimals under $1", () => {
    const rows = storedLadderRows(row({ price: 0.5, levels: [level(0.5612), level(1.2)] }), 0.5);
    expect(rows.map((r) => r.priceText)).toEqual(['0.561', '1.20']);
  });

  it('shows a span only when it does not round to one price', () => {
    const rows = storedLadderRows(
      row({ levels: [level(4.62, { low: 4.618, high: 4.621 }), level(5, { low: 4.98, high: 5.03, tops: 3 })] }),
      4,
    );
    expect(rows[0].span).toBeNull();
    expect(rows[1].span).toBe('4.98 to 5.03');
  });

  it('carries the timeframe tags and the candle tops, and marks the far-back peak', () => {
    const rows = storedLadderRows(
      row({ levels: [level(5, { timeframes: ['daily', '5m'], tops: 1 }), level(9, { tops: 3, beyondHorizon: true })] }),
      4,
    );
    expect(rows.map((r) => [r.tags, r.topsText, r.farBack])).toEqual([
      ['daily · 5m', '1 candle top', false],
      ['5m', '3 candle tops', true],
    ]);
  });

  const many = (n: number) =>
    storedLadderRows(row({ price: 4, levels: Array.from({ length: n }, (_, i) => level(4.01 + i * 0.05)) }), 4);

  it('shows the nearest 10 above and a link to the rest; 10 or fewer show all with no link', () => {
    expect(NEAREST_LEVELS).toBe(10);
    const rows = many(11);
    const collapsed = shownStoredRows(rows, false);
    expect(collapsed.shown.map((r) => r.priceText)).toEqual(rows.slice(0, 10).map((r) => r.priceText));
    expect(collapsed.toggle).toBe('Show all 11 levels above');
    for (const n of [0, 1, 10]) expect(shownStoredRows(many(n), false)).toEqual({ shown: many(n), toggle: null });
  });

  it('140 levels expand to all 140, and a crossed level always shows', () => {
    const rows = many(140);
    expect(shownStoredRows(rows, true).shown).toHaveLength(140);
    expect(shownStoredRows(rows, true).toggle).toBe('Show the nearest 10');
    const crossed = storedLadderRows(row({ price: 4, levels: [level(3.9), ...Array.from({ length: 12 }, (_, i) => level(4.1 + i))] }), 4);
    const view = shownStoredRows(crossed, false);
    expect(view.shown).toHaveLength(11);
    expect(view.shown.some((r) => r.side === 'BELOW')).toBe(true);
  });

  it("keeps the ladder's open-air note only while no stored level sits nearer above", () => {
    const rows = storedLadderRows(row({ price: 4, levels: [level(4.2)] }), 4);
    expect(airPocketAboveHolds(12, [])).toBe(true);
    expect(airPocketAboveHolds(12, rows)).toBe(false);
    expect(airPocketAboveHolds(2, rows)).toBe(true);
    expect(airPocketAboveHolds(null, rows)).toBe(false);
  });
});

describe('absent is not empty, and empty is not clear air', () => {
  it('the absent copy is true for every absent name and never promises a row is coming', () => {
    // A name opened from search, off both boards, never gets a row.
    expect(LEVELS_ABSENT_TEXT).not.toMatch(/\b(yet|computing|calculating|soon|loading|pending)\b/i);
    expect(LEVELS_ABSENT_TEXT).toMatch(/names on the board/);
    // And it is not the empty row's sentence: absent is not empty.
    expect(LEVELS_ABSENT_TEXT).not.toBe(levelsNote(row({ levels: [], aboveAllStored: true })));
  });

  // Commercial (via Integration, 2026-09-30): an empty list says only what is
  // true about OUR HISTORY and how far back it goes; a split-refused row must
  // not read as "no levels".
  const undatedHorizon = { fiveMinFrom: null, fifteenMinFrom: null, dailyFrom: null };

  it('a computed row with nothing stored above names the history and its reach, never "all-time high"', () => {
    const note = levelsNote(row({ levels: [], aboveAllStored: true }));
    expect(note).toBe('No prior high above the price in the history we hold, back to Sep 29, 2025.');
    expect(note).not.toMatch(/all[- ]time/i);
  });

  it('with no daily horizon the sentence loses its date, not its meaning', () => {
    expect(levelsNote(row({ levels: [], aboveAllStored: true, horizon: undatedHorizon }))).toBe(
      'No prior high above the price in the history we hold.',
    );
  });

  it('an empty row without the flag claims no reach at all', () => {
    expect(levelsNote(row({ levels: [] }))).toBe('No prior high above the price in the history we hold.');
  });

  it('a split behind the store says older levels are not shown, and levels still draw', () => {
    const r = row({ basisBreak: true, levels: [level(4.5)] });
    expect(levelsNote(r)).toBe('Older levels are not shown: a split is not yet reflected in our stored history.');
    expect(levelLines(r)).toHaveLength(1);
  });

  it('a split-refused row with nothing above never reads as "no levels"', () => {
    const note = levelsNote(row({ basisBreak: true, levels: [], aboveAllStored: true })) ?? '';
    expect(note).toBe(
      'Older levels are not shown: a split is not yet reflected in our stored history. None of today’s 5-minute candles is above the price.',
    );
    expect(note).not.toMatch(/history we hold/);
  });

  it('a row with levels and nothing unusual adds no note', () => {
    expect(levelsNote(row({ levels: [level(4.5)] }))).toBeNull();
  });
});

describe('how far back it looked, and from where', () => {
  it('names each ladder that had data', () => {
    expect(horizonText(row())).toBe('Read: today’s 5m candles, 15m from Sep 9, daily from Sep 29, 2025.');
  });

  it('drops a ladder with no data and says nothing when none had any', () => {
    expect(
      horizonText(row({ horizon: { fiveMinFrom: '2026-09-29T08:00:00Z', fifteenMinFrom: null, dailyFrom: null } })),
    ).toBe('Read: today’s 5m candles.');
    expect(horizonText(row({ horizon: { fiveMinFrom: null, fifteenMinFrom: null, dailyFrom: null } }))).toBeNull();
  });

  it('states the price and the 5-minute close it was computed from', () => {
    expect(computedText(row({ price: 3.84 }))).toBe('From $3.84 at the 11:55 ET 5-minute close.');
    expect(computedText(row({ computedAt: 'nope' }))).toBeNull();
  });
});

describe('his label, not a measurement', () => {
  const FORBIDDEN =
    /\b(measured|tested|strength|strong|weak|all[- ]time|clear|blue sky|no resistance|nothing (above|stopping|in the way))\b/i;

  it('no word the section prints claims strength or a test', () => {
    const r = row({
      levels: [level(4.5), level(5, { timeframes: ['daily', '15m'], low: 4.98, high: 5.03, tops: 2 }), level(9, { beyondHorizon: true })],
      basisBreak: true,
    });
    const printed = [
      ...levelLines(r).flatMap((line) => [line.price, line.span ?? '', line.distance, line.tags, line.title]),
      levelsNote(r) ?? '',
      levelsNote(row({ aboveAllStored: true })) ?? '',
      levelsNote(row({ aboveAllStored: true, horizon: { fiveMinFrom: null, fifteenMinFrom: null, dailyFrom: null } })) ?? '',
      levelsNote(row({ basisBreak: true, levels: [] })) ?? '',
      levelsNote(row({ levels: [] })) ?? '',
      horizonText(r) ?? '',
      computedText(r) ?? '',
    ];
    for (const text of printed) expect(text).not.toMatch(FORBIDDEN);
  });

  it('nor does any string or JSX text in the section component or its view', () => {
    // Comments may explain the ruling; only what can render is checked.
    for (const file of ['components/ResistanceLevels.tsx', 'components/LevelLadder.tsx', 'lib/dashboard/resistance.ts']) {
      const source = readFileSync(file, 'utf8');
      const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const texts: string[] = [];
      const visit = (node: ts.Node) => {
        if (ts.isStringLiteralLike(node) || ts.isTemplateLiteralToken(node)) texts.push(node.text);
        if (ts.isJsxText(node)) texts.push(node.getText(tree));
        ts.forEachChild(node, visit);
      };
      visit(tree);
      expect(texts.length).toBeGreaterThan(5);
      for (const text of texts) expect(text).not.toMatch(FORBIDDEN);
    }
  });
});
