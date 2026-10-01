import { readFileSync } from 'node:fs';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import {
  computedText,
  horizonText,
  LEVELS_ABSENT_TEXT,
  levelLines,
  levelsNote,
  NEAREST_LEVELS,
  shownLevels,
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

describe('the nearest 10, then a link (his "2 b", 2026-09-30T17:03:54Z)', () => {
  const many = (n: number) => levelLines(row({ levels: Array.from({ length: n }, (_, i) => level(4.01 + i * 0.05)) }));

  it('11 levels show the nearest 10 and a link to the eleventh', () => {
    const lines = many(11);
    const view = shownLevels(lines, false);
    expect(NEAREST_LEVELS).toBe(10);
    expect(view.shown).toEqual(lines.slice(0, 10));
    expect(view.hidden).toBe(1);
    expect(view.toggle).toBe('Show all 11 levels');
  });

  it('10 or fewer show every level and no link', () => {
    for (const n of [0, 1, 10]) {
      const view = shownLevels(many(n), false);
      expect(view.shown).toHaveLength(n);
      expect(view.toggle).toBeNull();
    }
  });

  it('140 levels collapse to the nearest 10 and expand to all 140', () => {
    const lines = many(140);
    const collapsed = shownLevels(lines, false);
    expect(collapsed.shown.map((line) => line.price)).toEqual(lines.slice(0, 10).map((line) => line.price));
    expect(collapsed.toggle).toBe('Show all 140 levels');
    const expanded = shownLevels(lines, true);
    expect(expanded.shown).toHaveLength(140);
    expect(expanded.hidden).toBe(0);
    expect(expanded.toggle).toBe('Show the nearest 10');
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
    for (const file of ['components/ResistanceLevels.tsx', 'lib/dashboard/resistance.ts']) {
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
