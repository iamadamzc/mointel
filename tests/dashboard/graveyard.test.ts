import { describe, expect, it } from 'vitest';

import {
  DEATH_CHURN_THRESHOLD,
  graveyardRows,
  graveyardSummary,
} from '@/lib/dashboard/graveyard';
import type { DeskRow } from '@/lib/dashboard/merge';
import { scrubBandOrdinals } from '@/lib/market/rangeRank';
import type { DemandState } from '@/lib/market/types';

const NOW = Date.parse('2026-09-03T14:00:00.000Z');

function row(
  ticker: string,
  demand: Record<string, unknown> | null,
): DeskRow {
  return { ticker, demand } as unknown as DeskRow;
}

const dead = (t: string, minsAgo: number, extra: Record<string, unknown> = {}) =>
  row(t, {
    activity: 'DEAD',
    deadSince: new Date(NOW - minsAgo * 60_000).toISOString(),
    deadAtRank: 4,
    deadAtPeakTrades: 310,
    deathCount: 1,
    ...extra,
  });

describe('the wired distinction', () => {
  /*
   * The one that cannot be checked by looking at the screen.
   *
   * The engine populates `activity` live, but the store has no column for it
   * yet, so a round-tripped row arrives without it. An empty graveyard for that
   * reason is NOT the same statement as "nothing has gone quiet", and the two
   * are indistinguishable on screen unless the surface says which it is.
   */
  it('reports NOT wired when no row carries the measurement', () => {
    const summary = graveyardSummary([row('AAA', {}), row('BBB', { activity: undefined })], NOW);
    expect(summary.wired).toBe(false);
    expect(summary.dead).toBe(0);
  });

  it('reports wired once any row carries it, even if none has died', () => {
    const summary = graveyardSummary([row('AAA', { activity: 'ACTIVE' })], NOW);
    expect(summary.wired).toBe(true);
    expect(summary.dead).toBe(0);
  });

  /*
   * UNKNOWN is a measurement — the engine looked and could not say. undefined
   * is not. Only the second may be excluded from the population.
   */
  it('treats UNKNOWN as measured and undefined as not', () => {
    expect(graveyardSummary([row('AAA', { activity: 'UNKNOWN' })], NOW).wired).toBe(true);
    expect(graveyardSummary([row('AAA', { deadSince: null })], NOW).wired).toBe(false);
  });

  it('never lists a row whose activity did not survive the round trip', () => {
    // Death-shaped fields with no `activity` — the shape a partial migration
    // would produce. It must not be rendered as a measurement.
    const entries = graveyardRows([row('AAA', { deadSince: '2026-09-03T13:00:00.000Z' })], NOW);
    expect(entries).toHaveLength(0);
  });
});

describe('graveyard rows', () => {
  it('orders most recently dead first, because revival probability decays', () => {
    const entries = graveyardRows([dead('OLD', 180), dead('NEW', 6), dead('MID', 40)], NOW);
    expect(entries.map((e) => e.ticker)).toEqual(['NEW', 'MID', 'OLD']);
  });

  /*
   * A revived name STAYS. Removing it would delete the evidence the section
   * exists to show, and a name reappearing on the main board with no trace here
   * is the same information loss as one vanishing from it.
   */
  it('keeps a revived name listed and marks it', () => {
    const entries = graveyardRows(
      [row('BACK', { activity: 'ACTIVE', deadSince: null, deathCount: 1, deadAtRank: 3, deadAtPeakTrades: 310 })],
      NOW,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].revived).toBe(true);
  });

  it('leaves a never-dead active name out entirely', () => {
    expect(graveyardRows([row('LIVE', { activity: 'ACTIVE', deathCount: 0 })], NOW)).toHaveLength(0);
  });

  /*
   * Elapsed runs from `deadSince`, never from detection. The rule decides at six
   * minutes for a five-minute death, so the smallest honest reading is the
   * settle window — a row appears at "6m" and never "0m".
   */
  it('measures elapsed from the death, not from when detection fired', () => {
    expect(graveyardRows([dead('AAA', 6)], NOW)[0].deadForLabel).toBe('6m');
    expect(graveyardRows([dead('AAA', 95)], NOW)[0].deadForLabel).toBe('1h 35m');
  });

  it('does not shuffle between polls when deaths tie', () => {
    const rows = [dead('ZZZ', 10, { deadAtRank: 2 }), dead('AAA', 10, { deadAtRank: 2 })];
    const first = graveyardRows(rows, NOW).map((e) => e.ticker);
    const second = graveyardRows([...rows].reverse(), NOW).map((e) => e.ticker);
    expect(first).toEqual(['AAA', 'ZZZ']);
    expect(second).toEqual(first);
  });
});

describe('the falsification counts', () => {
  /*
   * `churned` is the signal the section is built around: a name dying more than
   * once can only have revived in between, so it is evidence about the
   * THRESHOLD rather than about the stock.
   *
   * It is deliberately separate from `revived`. Most revivals are a twitch
   * rather than a run — 33% of dead names see activity return but only 7% come
   * back at +25% or better — so a single tally would read as a five-fold higher
   * miss rate than the real one.
   */
  it('counts churn separately from revival', () => {
    const summary = graveyardSummary(
      [
        row('TWITCH', { activity: 'ACTIVE', deathCount: 1, deadAtPeakTrades: 310, deadAtRank: 8 }),
        row('CHURN', { activity: 'DEAD', deadSince: new Date(NOW).toISOString(), deathCount: 4, deadAtPeakTrades: 310, deadAtRank: 8 }),
        dead('ONCE', 10),
      ],
      NOW,
    );

    expect(summary.revived).toBe(1);
    expect(summary.churned).toBe(1);
    expect(summary.dead).toBe(2);
  });

  it('sets the churn threshold at the smallest number that implies a revival', () => {
    expect(DEATH_CHURN_THRESHOLD).toBe(2);
  });
});

/*
 * The miss signal.
 *
 * Every test here asserts a VALUE ARRIVES rather than that its absence is
 * handled. Ops mutation-tested the store mapping and found that deleting the
 * line failed the round-trip test but PASSED the null-handling test vacuously —
 * with the mapping gone the field is undefined anyway, so a test written around
 * absence cannot tell a working field from a missing one.
 */
describe('revived and running', () => {
  // A revived name was alive once by definition, so the fixture carries a peak
  // above the dead line — the production shape, not a convenient one.
  const revivedAt = (deadAtPrice: number | null, price: number | null) =>
    ({
      ticker: 'BACK',
      demand: {
        activity: 'ACTIVE',
        deathCount: 1,
        deadSince: null,
        deadAtPrice,
        deadAtPeakTrades: 310,
        deadAtRank: 8,
      },
      telemetry: { price },
    }) as unknown as DeskRow;

  it('counts a revived name that ran, and reports how far', () => {
    // 4.00 at death, 6.00 now: +50%, comfortably past the bar.
    const entries = graveyardRows([revivedAt(4, 6)], NOW);
    expect(entries[0].ran).toBe(true);
    expect(entries[0].moveSinceDeathPct).toBeCloseTo(50, 5);
    expect(graveyardSummary([revivedAt(4, 6)], NOW).ran).toBe(1);
  });

  it('does not count a twitch, which was correctly dropped', () => {
    // +2%: activity returned, the name did not. The rule was right here.
    const entries = graveyardRows([revivedAt(4, 4.08)], NOW);
    expect(entries[0].revived).toBe(true);
    expect(entries[0].ran).toBe(false);
  });

  it('sits exactly on the threshold rather than near it', () => {
    expect(graveyardRows([revivedAt(4, 5)], NOW)[0].ran).toBe(true); // +25%
    expect(graveyardRows([revivedAt(4, 4.99)], NOW)[0].ran).toBe(false);
  });

  /*
   * Cannot-compute is not did-not-run. Without a price at death the question
   * has no answer, and answering it `false` would report a measurement nobody
   * could take — the same distinction as undefined against UNKNOWN.
   */
  it('reports null rather than false when the move cannot be computed', () => {
    expect(graveyardRows([revivedAt(null, 6)], NOW)[0].moveSinceDeathPct).toBeNull();
    expect(graveyardRows([revivedAt(4, null)], NOW)[0].moveSinceDeathPct).toBeNull();
    expect(graveyardRows([revivedAt(null, 6)], NOW)[0].ran).toBe(false);
  });

  it('never calls a still-dead name running, however far the price moved', () => {
    const stillDead = {
      ticker: 'DEAD',
      demand: {
        activity: 'DEAD',
        deathCount: 1,
        deadSince: new Date(NOW - 600_000).toISOString(),
        deadAtPrice: 4,
        deadAtPeakTrades: 310,
        deadAtRank: 8,
      },
      telemetry: { price: 9 },
    } as unknown as DeskRow;
    expect(graveyardRows([stillDead], NOW)[0].ran).toBe(false);
  });

  /*
   * Churn and miss are separate counts because they argue for different fixes:
   * a high deathCount says the threshold is too tight, a run says the drop cost
   * a trade. One number could not carry both.
   */
  it('keeps churn and miss as independent counts', () => {
    const churnOnly = {
      ticker: 'CHURN',
      demand: { activity: 'ACTIVE', deathCount: 4, deadSince: null, deadAtPrice: 4, deadAtPeakTrades: 310, deadAtRank: 8 },
      telemetry: { price: 4.05 },
    } as unknown as DeskRow;

    const summary = graveyardSummary([churnOnly, revivedAt(4, 6)], NOW);
    expect(summary.churned).toBe(1);
    expect(summary.ran).toBe(1);
    expect(summary.revived).toBe(2);
  });
});


/*
 * Only names that were on his board.
 *
 * The first live reading found 60 of 71 rows the engine marked DEAD had never
 * been anything else. An earlier filter used a trade-count floor, which R&D
 * then measured to be a bad proxy: 45.5% of board symbol-days never reach 300
 * trades/min, including 26.6% of top-ten names. So a trade-count line hid
 * nearly half the board — names he WAS watching that simply did not trade much.
 *
 * `deadAtRank` answers it directly, and its PRESENCE is the predicate rather
 * than any threshold, because "the board" names three different sets in this
 * codebase — discoveryRank 12, the archive's 1-25, the UI's Top 12/25/50 — and
 * picking one would manufacture the collision this desk keeps finding.
 */
describe('the board-presence filter', () => {
  const ranked = (t: string, rank: number | null) =>
    row(t, {
      activity: 'DEAD',
      deadSince: new Date(NOW - 10 * 60_000).toISOString(),
      deadAtRank: rank,
      deadAtPeakTrades: 2,
      deathCount: 1,
    });

  it('lists a name that held a rank, however modestly it traded', () => {
    // Peak of 2/min and ranked: the case a trade-count floor wrongly hid.
    expect(graveyardRows([ranked('LOWVOL', 8)], NOW)).toHaveLength(1);
    expect(graveyardRows([ranked('DEEP', 900)], NOW)).toHaveLength(1);
  });

  it('withholds a name that never held a rank at all', () => {
    expect(graveyardRows([ranked('UNRANKED', null)], NOW)).toHaveLength(0);
  });

  /*
   * No threshold anywhere. A predicate against 12, 25 or 50 would pick one of
   * three live meanings of "board" and would also move with a view size the
   * trader changes at will.
   */
  it('uses rank presence rather than any rank threshold', async () => {
    const { promises: fs } = await import('node:fs');
    const source = await fs.readFile('lib/dashboard/graveyard.ts', 'utf8');
    expect(source).not.toMatch(/deadAtRank\s*<=\s*\d+/);
  });

  it('reports how many were withheld rather than dropping them silently', () => {
    const summary = graveyardSummary(
      [ranked('ONBOARD', 8), ranked('OFF', null), ranked('ALSOOFF', null)],
      NOW,
    );
    expect(summary.dead).toBe(1);
    expect(summary.neverActive).toBe(2);
  });

  /*
   * A board re-ranked inside the viewer's price range. The server omits every
   * stored ordinal there (a rank in the engine's band is not a rank in his), so
   * a filter keyed on `deadAtRank` would empty this section on every custom
   * range and read "nothing died". Run through the REAL scrub, so a scrub that
   * starts removing the fact as well fails here, not only in its own suite.
   */
  const scrubbed = (t: string, diedWhileRanked: boolean) =>
    row(
      t,
      scrubBandOrdinals({
        ticker: t,
        activity: 'DEAD',
        deadSince: new Date(NOW - 10 * 60_000).toISOString(),
        deadAtRank: diedWhileRanked ? 4 : null,
        diedWhileRanked,
        deadAtPeakTrades: 310,
        deathCount: 1,
        afterHours: {},
      } as unknown as DemandState) as unknown as Record<string, unknown>,
    );

  it('lists a name that died ranked after the range scrub removed its rank', () => {
    const input = scrubbed('RANGED', true);
    // The control: the ordinal really is gone, so only the fact can list it.
    expect(input.demand).not.toHaveProperty('deadAtRank');
    const entries = graveyardRows([input], NOW);
    expect(entries.map((e) => e.ticker)).toEqual(['RANGED']);
    expect(entries[0].deadAtRank).toBeNull();
    expect(graveyardSummary([input], NOW).dead).toBe(1);
  });

  it('still withholds a never-ranked name after the scrub', () => {
    const summary = graveyardSummary([scrubbed('OFF', false), scrubbed('ON', true)], NOW);
    expect(summary.dead).toBe(1);
    expect(summary.neverActive).toBe(1);
  });

  it('keeps the counts on the shown population, not the withheld one', () => {
    const churnUnranked = row('CQ', {
      activity: 'DEAD',
      deadSince: new Date(NOW).toISOString(),
      deadAtRank: null,
      deathCount: 5,
    });
    expect(graveyardSummary([churnUnranked], NOW).churned).toBe(0);
  });
});
