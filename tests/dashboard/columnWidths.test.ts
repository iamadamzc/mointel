/**
 * Resizable Discovery columns -- the width model.
 *
 * His ruling, 2026-09-29T02:41:45Z: "2 yes discovery only". Each guardrail in
 * `docs/Design/resizable-columns-scope.md` is asserted here from the RULE, over
 * every visible column, not from one convenient case.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ABSOLUTE_MIN,
  COLUMN_WIDTHS_STORAGE_KEY,
  DEFAULT_WIDTHS,
  FLEX_FLOOR,
  NUDGE_LARGE_PX,
  NUDGE_PX,
  RESIZABLE,
  type DiscoveryColumnKey,
  type LayoutInput,
  handleKeyAction,
  hasCustomWidths,
  layoutColumns,
  maxWidthFor,
  parseStoredWidths,
  readStoredWidths,
  resetColumn,
  resizeColumn,
  writeStoredWidths,
} from '@/lib/dashboard/columnWidths';

const BOARD: DiscoveryColumnKey[] = ['mark', 'ticker', 'price', 'rvol', 'now', 'why', 'risk', 'cycle'];
const WITH_FLOAT: DiscoveryColumnKey[] = [
  'mark', 'ticker', 'price', 'rvol', 'now', 'float', 'why', 'risk', 'cycle',
];

/** The sorted-header minimums, roughly as the live board measures them. */
const MINIMUMS = { ticker: 70, price: 150, rvol: 60, now: 62, float: 66, why: 50, risk: 52, cycle: 64 };

/** The Discovery table inside a 1,024 px window: 982 px of table in 1,014 (measured, DiscoveryBoard). */
const FLOOR = 1014;

function input(over: Partial<LayoutInput> = {}): LayoutInput {
  return { available: 1280, visible: BOARD, stored: {}, minimums: MINIMUMS, ...over };
}

/** The least a column may render at: its measured header, the flexible floor, or the gutter. */
function floorOf(key: DiscoveryColumnKey): number {
  if (key === 'mark') return 24;
  const floor = key === 'why' || key === 'risk' ? FLEX_FLOOR : ABSOLUTE_MIN;
  return Math.max(floor, MINIMUMS[key as keyof typeof MINIMUMS] ?? 0);
}

const total = (widths: Record<string, number | undefined>) =>
  Object.values(widths).reduce<number>((sum, width) => sum + (width ?? 0), 0);

describe('layoutColumns: the default board is today\'s board', () => {
  it('gives every fixed column its current width and splits the rest between Why and Risk', () => {
    const widths = layoutColumns(input());
    for (const key of BOARD) {
      const fixed = DEFAULT_WIDTHS[key];
      if (fixed !== null) expect(widths[key], key).toBe(fixed);
    }
    expect(Math.abs((widths.why ?? 0) - (widths.risk ?? 0))).toBeLessThanOrEqual(1);
  });

  it('fits the 1,024 px floor with Why and Risk above their floor, as today', () => {
    const widths = layoutColumns(input({ available: FLOOR }));
    expect(total(widths)).toBe(FLOOR);
    expect(widths.why).toBeGreaterThanOrEqual(FLEX_FLOOR);
    expect(widths.risk).toBeGreaterThanOrEqual(FLEX_FLOOR);
  });
});

describe('the Sheet reproduction layout, measured at the 1,024 px floor', () => {
  it('pins Ticker 128, Float 102, Cycle 152 and a 130 px Why and Risk floor', () => {
    expect(DEFAULT_WIDTHS.ticker).toBe(128);
    expect(DEFAULT_WIDTHS.float).toBe(102);
    expect(DEFAULT_WIDTHS.cycle).toBe(152);
    expect(FLEX_FLOOR).toBe(130);
  });

  it('with Float shown at the floor, no fixed column is squeezed below its default and Why and Risk keep 130', () => {
    // 982 px is the table itself at the 1,024 px window (the board measures 982 in 1,014).
    const widths = layoutColumns(input({ available: 982, visible: WITH_FLOAT }));
    expect(total(widths)).toBe(982);
    for (const key of WITH_FLOAT) {
      const fixed = DEFAULT_WIDTHS[key];
      if (fixed !== null) expect(widths[key], key).toBe(fixed);
    }
    expect(widths.why).toBeGreaterThanOrEqual(130);
    expect(widths.risk).toBeGreaterThanOrEqual(130);
  });
});

describe('no horizontal scroll, ever', () => {
  const windows = [FLOOR, 1180, 1280, 1440, 1920];
  const storedCases: Record<string, LayoutInput['stored']> = {
    none: {},
    'wide price': { price: 400 },
    'everything wide': { ticker: 300, price: 400, rvol: 200, now: 200, cycle: 300, float: 200 },
    'why pinned wide': { why: 900 },
    'risk pinned narrow': { risk: 10 },
  };

  for (const available of windows) {
    for (const [name, stored] of Object.entries(storedCases)) {
      for (const visible of [BOARD, WITH_FLOAT]) {
        it(`sums to the table width at ${available} px, ${name}, ${visible.length} columns`, () => {
          const widths = layoutColumns(input({ available, stored, visible }));
          expect(total(widths)).toBe(available);
          expect(Object.keys(widths).sort()).toEqual([...visible].sort());
          // The sum holds by construction; what can break is a column paying
          // for it by going under its own floor, or negative.
          for (const key of visible) expect(widths[key], key).toBeGreaterThanOrEqual(floorOf(key));
        });
      }
    }
  }
});

describe('a column never goes under its own sorted header', () => {
  it('holds for every resizable column dragged to zero', () => {
    for (const key of RESIZABLE) {
      const visible = key === 'float' ? WITH_FLOAT : BOARD;
      const stored = resizeColumn(key, 0, input({ visible }));
      const widths = layoutColumns(input({ visible, stored }));
      const floor = Math.max(MINIMUMS[key as keyof typeof MINIMUMS], key === 'why' || key === 'risk' ? FLEX_FLOOR : ABSOLUTE_MIN);
      expect(widths[key], key).toBe(floor);
    }
  });

  it('holds when the window shrinks the stored widths', () => {
    const stored = { ticker: 300, price: 400, rvol: 200, now: 200, cycle: 300 };
    const widths = layoutColumns(input({ available: FLOOR, stored }));
    for (const [key, min] of Object.entries(MINIMUMS)) {
      if (key in widths) expect(widths[key as DiscoveryColumnKey], key).toBeGreaterThanOrEqual(min);
    }
  });

  it('uses the measured header when it is wider than the stored width (a label grew)', () => {
    const widths = layoutColumns(input({ stored: { now: 40 }, minimums: { ...MINIMUMS, now: 90 } }));
    expect(widths.now).toBe(90);
  });
});

describe('widening a column takes the width from Why and Risk, and stops at their floor', () => {
  it('takes it from the flexible columns, not from another fixed one', () => {
    const before = layoutColumns(input());
    const stored = resizeColumn('price', (before.price ?? 0) + 60, input());
    const after = layoutColumns(input({ stored }));
    expect(after.price).toBe((before.price ?? 0) + 60);
    for (const key of ['ticker', 'rvol', 'now', 'cycle'] as const) expect(after[key], key).toBe(before[key]);
    expect((after.why ?? 0) + (after.risk ?? 0)).toBe((before.why ?? 0) + (before.risk ?? 0) - 60);
  });

  it('stops when Why and Risk reach their floor', () => {
    const stored = resizeColumn('price', 5000, input());
    const widths = layoutColumns(input({ stored }));
    expect(widths.why).toBe(FLEX_FLOOR);
    expect(widths.risk).toBe(FLEX_FLOOR);
    expect(total(widths)).toBe(1280);
    expect(maxWidthFor('price', input({ stored }))).toBe(widths.price);
  });
});

describe('Why and Risk: sizing one makes the other the remainder', () => {
  it('Why sized, Risk takes the rest', () => {
    const stored = resizeColumn('why', 300, input());
    expect(stored).toEqual({ why: 300 });
    const widths = layoutColumns(input({ stored }));
    expect(widths.why).toBe(300);
    expect(widths.risk).toBe(1280 - total({ ...widths, risk: 0 }));
  });

  it('Risk sized after Why releases Why, so the drag is never inert', () => {
    const afterWhy = resizeColumn('why', 300, input());
    const stored = resizeColumn('risk', 350, input({ stored: afterWhy }));
    expect(stored).toEqual({ risk: 350 });
    expect(layoutColumns(input({ stored })).risk).toBe(350);
  });

  it('storage holding both keeps Why and lets Risk take the remainder', () => {
    expect(parseStoredWidths(JSON.stringify({ why: 300, risk: 350 }))).toEqual({ why: 300 });
  });

  it('a pinned flexible column cannot squeeze the other under its floor', () => {
    const stored = resizeColumn('why', 5000, input());
    const widths = layoutColumns(input({ stored }));
    expect(widths.risk).toBe(FLEX_FLOOR);
  });
});

describe('a narrower window shrinks stored widths and never discards them', () => {
  const stored = { ticker: 200, price: 300, cycle: 260 };

  it('shrinks in proportion to each column\'s room above its header', () => {
    const narrow = layoutColumns(input({ available: FLOOR, stored }));
    expect(total(narrow)).toBe(FLOOR);
    // At their floor, give or take the pixels the shrink rounds down: those go
    // to the flexible columns rather than past the right edge.
    for (const key of ['why', 'risk'] as const) {
      expect(narrow[key], key).toBeGreaterThanOrEqual(FLEX_FLOOR);
      expect(narrow[key], key).toBeLessThanOrEqual(FLEX_FLOOR + 3);
    }
    const give = (key: 'ticker' | 'price' | 'cycle') => stored[key] - MINIMUMS[key];
    const lost = (key: 'ticker' | 'price' | 'cycle') => stored[key] - (narrow[key] ?? 0);
    // Same fraction of each column's slack, to within a pixel of rounding.
    expect(Math.abs(lost('ticker') / give('ticker') - lost('price') / give('price'))).toBeLessThan(0.02);
    expect(Math.abs(lost('cycle') / give('cycle') - lost('price') / give('price'))).toBeLessThan(0.02);
  });

  it('returns them whole when the window grows again', () => {
    layoutColumns(input({ available: FLOOR, stored }));
    const wide = layoutColumns(input({ available: 1920, stored }));
    expect(wide.ticker).toBe(200);
    expect(wide.price).toBe(300);
    expect(wide.cycle).toBe(260);
  });
});

describe('Float keeps its own width and takes its space from Why and Risk', () => {
  it('appearing moves nothing but the flexible columns', () => {
    const stored = { float: 120 };
    const without = layoutColumns(input({ stored }));
    const withFloat = layoutColumns(input({ stored, visible: WITH_FLOAT }));
    expect(withFloat.float).toBe(120);
    for (const key of ['ticker', 'price', 'rvol', 'now', 'cycle'] as const) {
      expect(withFloat[key], key).toBe(without[key]);
    }
  });
});

describe('the change mark is a gutter, not a column', () => {
  it('cannot be resized and stays 24 px', () => {
    expect(RESIZABLE.has('mark')).toBe(false);
    expect(resizeColumn('mark', 300, input())).toEqual({});
    expect(layoutColumns(input({ stored: { mark: 300 } })).mark).toBe(24);
  });
});

describe('reset', () => {
  it('one column returns to its default; the others keep theirs', () => {
    const stored = resetColumn('price', { price: 300, ticker: 150 });
    expect(stored).toEqual({ ticker: 150 });
    expect(layoutColumns(input({ stored })).price).toBe(DEFAULT_WIDTHS.price);
  });

  it('"Reset widths" has something to do only when a width is stored', () => {
    expect(hasCustomWidths({})).toBe(false);
    expect(hasCustomWidths({ now: 90 })).toBe(true);
  });
});

describe('the keyboard: WAI-ARIA window splitter', () => {
  it('maps the keys the scope names, and nothing else', () => {
    expect(handleKeyAction('ArrowLeft', false)).toEqual({ kind: 'nudge', delta: -NUDGE_PX });
    expect(handleKeyAction('ArrowRight', false)).toEqual({ kind: 'nudge', delta: NUDGE_PX });
    expect(handleKeyAction('ArrowLeft', true)).toEqual({ kind: 'nudge', delta: -NUDGE_LARGE_PX });
    expect(handleKeyAction('ArrowRight', true)).toEqual({ kind: 'nudge', delta: NUDGE_LARGE_PX });
    expect(handleKeyAction('Enter', false)).toEqual({ kind: 'fit' });
    expect(handleKeyAction('Delete', false)).toEqual({ kind: 'reset' });
    for (const key of ['ArrowUp', 'ArrowDown', 'Tab', ' ', 'Escape', 'Home', 'a']) {
      expect(handleKeyAction(key, false), key).toBeNull();
    }
    expect([NUDGE_PX, NUDGE_LARGE_PX]).toEqual([8, 32]);
  });
});

describe('storage is a convenience: junk reads as today\'s widths', () => {
  it.each([
    [null],
    [''],
    ['not json'],
    ['[1,2]'],
    ['42'],
    ['null'],
  ])('%s -> no custom widths', (raw) => {
    expect(parseStoredWidths(raw)).toEqual({});
  });

  it('keeps known, positive, finite widths and drops the rest', () => {
    const raw = JSON.stringify({ price: 250.4, now: -5, rvol: 'wide', mark: 90, bogus: 100, cycle: 0, ticker: 1e999 });
    expect(parseStoredWidths(raw)).toEqual({ price: 250 });
  });

  it('is versioned, so a future shape does not read as this one', () => {
    expect(COLUMN_WIDTHS_STORAGE_KEY).toMatch(/\.v\d+$/);
  });

  const throwing = {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
    removeItem: () => {
      throw new Error('SecurityError');
    },
  };

  it('a storage that throws on every call reads as no widths and writes silently', () => {
    expect(readStoredWidths(throwing)).toEqual({});
    expect(() => writeStoredWidths(throwing, { price: 250 })).not.toThrow();
    expect(() => writeStoredWidths(throwing, {})).not.toThrow();
    expect(readStoredWidths(null)).toEqual({});
    expect(() => writeStoredWidths(null, { price: 250 })).not.toThrow();
  });

  it('round-trips, and a reset removes the key rather than storing an empty object', () => {
    const map = new Map<string, string>();
    const memory = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
      removeItem: (key: string) => void map.delete(key),
    };
    writeStoredWidths(memory, { price: 250, why: 300 });
    expect(readStoredWidths(memory)).toEqual({ price: 250, why: 300 });
    writeStoredWidths(memory, {});
    expect(map.has(COLUMN_WIDTHS_STORAGE_KEY)).toBe(false);
  });
});

describe('the board is wired to the model', () => {
  const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
  const source = read('components/DiscoveryBoard.tsx');
  const hook = read('lib/hooks/useColumnWidths.ts');

  it('sizes columns through a <colgroup>, with no width class left on a header', () => {
    expect(source).toMatch(/<colgroup>/);
    const heads = source.match(/<Th\b[^>]*>/g) ?? [];
    expect(heads.length).toBeGreaterThan(5);
    for (const head of heads) expect(head, head).not.toMatch(/w-\[\d+px\]/);
  });

  it('reaches storage only through the guarded helpers', () => {
    expect(source).not.toMatch(/localStorage/);
    expect(hook).not.toMatch(/localStorage/);
    expect(hook).toMatch(/readStoredWidths\(/);
    expect(hook).toMatch(/writeStoredWidths\(/);
  });
});
