import { describe, expect, it } from 'vitest';

import {
  sessionMoveLabel,
  sessionMoveReading,
  thinAnchorLine,
} from '@/lib/dashboard/sessionMove';
import { baselineLabel } from '@/lib/dashboard/view';
import { DEFAULT_ACTIVITY_CONFIG } from '@/lib/market/activity';
import type { SessionOpen, SessionOpenSet } from '@/lib/market/vwap';

function open(fields: Partial<SessionOpen> = {}): SessionOpen {
  // The default state follows the price so the fixture cannot build an open
  // that production could not produce -- OPEN with no price. An explicit
  // `state` in `fields` still wins, which is how NOT_STARTED gets tested.
  const price = 'price' in fields ? (fields.price ?? null) : 4.0;
  return {
    session: 'PREMARKET',
    label: 'PM VWAP',
    state: price !== null ? 'OPEN' : 'NO_PRINT',
    price,
    at: '2026-09-10T08:00:00.000Z',
    tradeCount: 400,
    move: null,
    ...fields,
  };
}

function set(fields: Partial<SessionOpenSet> = {}): SessionOpenSet {
  return {
    premarket: open({ session: 'PREMARKET' }),
    regular: open({ session: 'RTH' }),
    afterHours: open({ session: 'AFTER_HOURS' }),
    ...fields,
  };
}

/* ------------------------------------------------------------------------- *
 * TWO FAMILIES, TWO NOUNS
 *
 * `Gap` is across sessions from the last relevant close; `Move` is within this
 * session from its own first print. The prefix carries the session and the noun
 * carries the direction of the comparison. Each family's guard keeps the other
 * one out — the reserved-word guard on the Gap side is only half of it, and
 * this is the mirror it was always owed.
 * ------------------------------------------------------------------------- */
describe('the two label families stay apart', () => {
  const phases = ['PREMARKET', 'RTH', 'AFTER_HOURS', 'POST_MARKET'] as const;

  it('names the within-session move per session', () => {
    expect(sessionMoveLabel('PREMARKET')).toBe('PM Move');
    expect(sessionMoveLabel('RTH')).toBe('RTH Move');
    expect(sessionMoveLabel('AFTER_HOURS')).toBe('AH Move');
  });

  /*
   * THE MIRROR GUARD, owed with this family since the Gap side shipped and
   * deliberately not written before there was anything to guard. Case-insensitive
   * because `'AH move'.includes('Move')` is false — the containment guard on the
   * other side passed the exact string it existed to reject until the case was
   * fixed, and that lesson transfers rather than needing re-learning.
   */
  it('never lets a Move label contain the other family’s noun', () => {
    for (const phase of phases) {
      expect(sessionMoveLabel(phase).toLowerCase()).not.toContain('gap');
    }
  });

  it('never lets a Gap label contain this family’s noun', () => {
    const all = [...phases, 'CLOSED', 'NEXT_DAY_PREP', null] as const;
    for (const phase of all) {
      expect(baselineLabel(phase).label.toLowerCase()).not.toContain('move');
    }
  });

  /*
   * The two families must also not collide on a single phase: at any moment the
   * row can carry one of each, adjacent, and they must be told apart at a
   * glance rather than by reading carefully.
   */
  it('gives one phase two different words', () => {
    for (const phase of phases) {
      expect(sessionMoveLabel(phase)).not.toBe(baselineLabel(phase).label);
    }
  });
});

describe('the move is measured from the session’s own first print', () => {
  it('computes from the LIVE price rather than the stored snapshot', () => {
    // `move` on the stored object is deliberately stale here: it is a snapshot
    // of a comparison that keeps moving, and the surface must not show a frozen
    // comparison beside a live price.
    const opens = set({ premarket: open({ price: 4.0, move: -99 }) });
    const reading = sessionMoveReading(opens, 'PREMARKET', 4.5)!;
    expect(reading.move).toBeCloseTo(12.5, 6);
    expect(reading.openPrice).toBe(4.0);
  });

  it('signs the move, because down is a reading too', () => {
    const reading = sessionMoveReading(set(), 'PREMARKET', 3.6)!;
    expect(reading.move).toBeCloseTo(-10, 6);
  });

  it('picks the session the desk is actually in', () => {
    const opens = set({
      premarket: open({ price: 4.0 }),
      regular: open({ price: 5.0 }),
      afterHours: open({ price: 8.0 }),
    });
    expect(sessionMoveReading(opens, 'PREMARKET', 4.0)!.label).toBe('PM Move');
    expect(sessionMoveReading(opens, 'RTH', 5.0)!.openPrice).toBe(5.0);
    expect(sessionMoveReading(opens, 'AFTER_HOURS', 8.0)!.openPrice).toBe(8.0);
  });

  /*
   * NULL RATHER THAN A LABEL WITH NOTHING BEHIND IT. A cell reading `AH Move —`
   * looks like a broken number; showing nothing reads as what it is. Same
   * choice `resolveVwap` makes one field over.
   */
  it('returns nothing when there is no session to measure within', () => {
    expect(sessionMoveReading(null, 'PREMARKET', 4)).toBeNull();
    expect(sessionMoveReading(set(), null, 4)).toBeNull();
    expect(sessionMoveReading(set(), 'PREMARKET', null)).toBeNull();
    expect(sessionMoveReading(set({ premarket: open({ price: null }) }), 'PREMARKET', 4)).toBeNull();
    expect(sessionMoveReading(set({ premarket: open({ price: 0 }) }), 'PREMARKET', 4)).toBeNull();
  });
});

/* ------------------------------------------------------------------------- *
 * THREE STATES, AND THE THIRD IS THE EXPENSIVE ONE
 *
 * A premarket open anchored on 3 trades must not look like one anchored on 400,
 * and an anchor whose count the feed never reported must not look like either.
 * `tradeCount` is nullable independently of `price` precisely so this can be
 * said, and a zero default would erase it.
 * ------------------------------------------------------------------------- */
describe('the anchor states its own trustworthiness', () => {
  it('separates a solid anchor from a thin one', () => {
    expect(sessionMoveReading(set({ premarket: open({ tradeCount: 400 }) }), 'PREMARKET', 4)!.trust)
      .toBe('SOLID');
    expect(sessionMoveReading(set({ premarket: open({ tradeCount: 3 }) }), 'PREMARKET', 4)!.trust)
      .toBe('THIN');
  });

  /*
   * UNKNOWN IS ITS OWN STATE AND NEVER SILENCE, because silence is what a SOLID
   * anchor also looks like. Collapsing this into either neighbour is the defect
   * the nullable column exists to prevent.
   */
  it('will not read an unreported count as a solid anchor', () => {
    const reading = sessionMoveReading(
      set({ premarket: open({ tradeCount: null }) }),
      'PREMARKET',
      4,
    )!;
    expect(reading.trust).toBe('UNKNOWN');
    expect(reading.trust).not.toBe('SOLID');
    expect(reading.tradeCount).toBeNull();
  });

  /*
   * THE THRESHOLD IS THE DEAD LINE, DERIVED. Not a second definition of "thin"
   * invented for this column — `deadRatio` already marks where this desk stops
   * calling a minute active. The config is injected so the derivation is
   * testable: asserting against the live config would pass just as well for a
   * hardcoded 30.
   */
  it('follows the dead line rather than restating a number', () => {
    expect(thinAnchorLine()).toBe(30);

    const loose = { ...DEFAULT_ACTIVITY_CONFIG, deadRatio: 2 }; // 300 / 2 = 150
    expect(thinAnchorLine(loose)).toBe(150);

    const at100 = set({ premarket: open({ tradeCount: 100 }) });
    expect(sessionMoveReading(at100, 'PREMARKET', 4)!.trust).toBe('SOLID');
    expect(sessionMoveReading(at100, 'PREMARKET', 4, loose)!.trust).toBe('THIN');
  });

  it('keeps the anchoring minute, so a reader can see WHICH print it was', () => {
    const reading = sessionMoveReading(set(), 'PREMARKET', 4)!;
    expect(reading.at).toBe('2026-09-10T08:00:00.000Z');
  });
});

/* ------------------------------------------------------------------------- *
 * THE RENDER, ASSERTED AGAINST SOURCE BECAUSE THIS SUITE HAS NO RENDERER
 * ------------------------------------------------------------------------- */
describe('the surface renders the anchor state, not just the number', () => {
  const code = async () => {
    const fs = await import('node:fs');
    return fs
      .readFileSync('components/DecisionCells.tsx', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
  };

  /*
   * Comments stripped first: this component now explains the measurement that
   * ruled the count off the line, and quotes the strings while doing it. A
   * source guard that reads prose reports its own explanation as the code.
   */
  it('gives UNKNOWN a mark of its own rather than silence', async () => {
    const source = await code();
    expect(source).toContain("reading.trust === 'THIN'");
    expect(source).toContain("reading.trust === 'UNKNOWN'");
    // Both branches must produce something. A ternary whose UNKNOWN arm is null
    // is exactly the collapse the nullable column exists to prevent.
    expect(source).not.toMatch(/trust === 'UNKNOWN'\s*\?\s*null/);
  });

  it('keeps the trade count off the line and in the title', async () => {
    const source = await code();
    // The count appears in the `title` string, never in the rendered spans.
    expect(source).toMatch(/title=\{[\s\S]*?tradeCount/);
    expect(source).not.toMatch(/>\s*\{reading\.tradeCount\}/);
  });

  it('sits with the VWAP line rather than between price and VWAP', async () => {
    const source = await code();
    const vwap = source.indexOf('<VwapLine');
    const move = source.indexOf('<SessionMoveLine');
    expect(vwap).toBeGreaterThan(-1);
    expect(move).toBeGreaterThan(vwap);
  });
});
