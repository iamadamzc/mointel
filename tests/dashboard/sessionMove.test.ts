import { describe, expect, it } from 'vitest';

import {
  sessionMoveLabel,
  sessionMoveReading,
} from '@/lib/dashboard/sessionMove';
import { baselineLabel } from '@/lib/dashboard/view';
import { DEFAULT_ACTIVITY_CONFIG, deadLineFor } from '@/lib/market/activity';
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
  it('returns nothing when there is no session context at all', () => {
    // No opens, no phase, no price: nothing to name and nothing to measure.
    expect(sessionMoveReading(null, 'PREMARKET', 4)).toBeNull();
    expect(sessionMoveReading(set(), null, 4)).toBeNull();
    expect(sessionMoveReading(set(), 'PREMARKET', null)).toBeNull();
  });

  /*
   * THE CASE THAT PROMPTED ALL OF THIS, AND IT USED TO RETURN NULL.
   *
   * He questioned a row showing +43.4% labelled PM Gap on a name whose PM VWAP
   * and RVOL both said nothing had traded in premarket. The number was right --
   * the gap spans the prior close and includes after hours by construction --
   * and the row could not tell him the move was already over. The second line
   * is what tells him, and it only tells him if an untraded session SAYS SO.
   */
  it('reports an untraded session as a measurement, not as nothing', () => {
    const reading = sessionMoveReading(
      set({ premarket: open({ price: null }) }),
      'PREMARKET',
      4,
    );
    expect(reading).not.toBeNull();
    expect(reading!.state).toBe('NO_PRINT');
    expect(reading!.move).toBeNull();
    expect(reading!.openPrice).toBeNull();
    expect(reading!.label).toBe('PM Move');
  });

  /*
   * AND THE OTHER DIRECTION, WHICH IS THE ERROR THIS MUST NOT MAKE. A store
   * that cannot tell NOT_STARTED from NO_PRINT says UNKNOWN, and UNKNOWN must
   * never become "not traded" -- that asserts a market fact from a storage gap.
   */
  it('keeps UNKNOWN distinct from NO_PRINT all the way through', () => {
    const unknown = sessionMoveReading(
      set({ premarket: open({ price: null, state: 'UNKNOWN' }) }),
      'PREMARKET',
      4,
    )!;
    expect(unknown.state).toBe('UNKNOWN');
    expect(unknown.state).not.toBe('NO_PRINT');

    const notStarted = sessionMoveReading(
      set({ premarket: open({ price: null, state: 'NOT_STARTED' }) }),
      'PREMARKET',
      4,
    )!;
    expect(notStarted.state).toBe('NOT_STARTED');
  });

  it('treats a zero or negative open as no usable print rather than a move', () => {
    const zero = sessionMoveReading(set({ premarket: open({ price: 0 }) }), 'PREMARKET', 4)!;
    expect(zero.move).toBeNull();
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
      .toBe('THICK');
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
    expect(reading.trust).not.toBe('THICK');
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
    /*
     * The classifier now lives in `vwap.ts` and this file passes it
     * `deadLineFor(config)`. What is still worth pinning HERE is that the
     * threshold travels with the config rather than being frozen at 30 — the
     * reading is the caller that decides which line to use.
     */
    expect(deadLineFor(DEFAULT_ACTIVITY_CONFIG)).toBe(30);

    const loose = { ...DEFAULT_ACTIVITY_CONFIG, deadRatio: 2 }; // 300 / 2 = 150
    expect(deadLineFor(loose)).toBe(150);

    const at100 = set({ premarket: open({ tradeCount: 100 }) });
    expect(sessionMoveReading(at100, 'PREMARKET', 4)!.trust).toBe('THICK');
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

/* ------------------------------------------------------------------------- *
 * THE RENDER SPLIT, WHICH IS THE WHOLE SAFETY ARGUMENT
 * ------------------------------------------------------------------------- */
describe('the surface tells the two absences apart', () => {
  const code = async () => {
    const fs = await import('node:fs');
    return fs
      .readFileSync('components/DecisionCells.tsx', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
  };

  it('renders nothing for UNKNOWN and NOT_STARTED', async () => {
    expect(await code()).toMatch(
      /state === 'NOT_STARTED' \|\| reading\.state === 'UNKNOWN'\) return null/,
    );
  });

  it('renders NO_PRINT as words on the row', async () => {
    const source = await code();
    expect(source).toContain("reading.state === 'NO_PRINT'");
    expect(source).toContain('not traded');
  });

  /*
   * The two must not share a branch. If a future edit folds UNKNOWN into the
   * NO_PRINT arm, the board asserts "not trading in a live session" for names
   * where nothing was ever stored -- comments stripped, because the code above
   * explains that exact hazard and quotes both state names while doing it.
   */
  it('never lets UNKNOWN reach the not-traded copy', async () => {
    const source = await code();
    expect(source).not.toMatch(/state === 'UNKNOWN'[\s\S]{0,120}not traded/);
  });
});

/* ------------------------------------------------------------------------- *
 * WHICH SIDE CARRIES THE MARK
 *
 * He ruled the flag binary -- thick or thin, no middle band. Research measured
 * the board and about HALF of it sits at or under the dead line: median 22
 * trades in the anchoring minute, p25 of 3. So the mark fires on roughly every
 * other row, and it asked whether marking the TRUSTWORTHY half would read
 * better than marking the weak one.
 *
 * MARKING THE THIN SIDE, AND THE REASON IS NOT FREQUENCY. Mark THICK and the
 * absence of a mark would mean THIN *or* UNKNOWN *or* no line at all -- three
 * facts in one silence, which is the collapse two commits just undid on
 * `state`. A warning must sit on the thing that warrants caution; the absence
 * of a warning must not BE the warning.
 *
 * The ~50% rate is not noise, it is the finding: half the Move numbers on his
 * board rest on a minute this desk would not call alive.
 * ------------------------------------------------------------------------- */
describe('the mark goes on the side that warrants caution', () => {
  const code = async () => {
    const fs = await import('node:fs');
    return fs
      .readFileSync('components/DecisionCells.tsx', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
  };

  it('marks THIN and leaves THICK unmarked', async () => {
    const source = await code();
    expect(source).toContain("reading.trust === 'THIN'");
    // THICK must not carry a mark: if it did, an unmarked row would be
    // ambiguous between thin, unknown, and no reading at all.
    expect(source).not.toContain("reading.trust === 'THICK'");
  });

  it('keeps UNKNOWN out of the thin branch', async () => {
    // Not a band. `tradeCount` null is the ABSENCE of the measurement the
    // bands are made of, and calling it thin asserts a market fact from a gap
    // in the feed -- the same error as UNKNOWN-vs-NO_PRINT one field over.
    const unknown = sessionMoveReading(
      set({ premarket: open({ tradeCount: null }) }),
      'PREMARKET',
      4,
    )!;
    expect(unknown.trust).toBe('UNKNOWN');
    expect(unknown.trust).not.toBe('THIN');
  });

  it('puts the boundary at the dead line, exclusive', () => {
    const at = (n: number) =>
      sessionMoveReading(set({ premarket: open({ tradeCount: n }) }), 'PREMARKET', 4)!.trust;
    // 30 is NOT alive anywhere else on this desk, so 30 is thin and 31 is not.
    expect(at(30)).toBe('THIN');
    expect(at(31)).toBe('THICK');
    // The measured board median sits on the thin side, which is the finding.
    expect(at(22)).toBe('THIN');
  });
});
