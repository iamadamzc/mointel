/**
 * The cycle, as the trader reads it.
 *
 * `lib/market/cycle.ts` computes the phase from daily bars. This module is the
 * only place that turns those six engine names into words, and the only place
 * that decides their colour.
 *
 * Two things worth knowing before changing anything here.
 *
 * **It is deterministic.** Same bars, same answer. The model's cycle
 * classification it replaces was 46% irreproducible across five draws on
 * byte-identical evidence, and — worse — 28 of 236 versions varied between two
 * *directions*, 17 of them across the frontside/backside boundary the playbook
 * acts on. A name could read as having turned when nothing about it had. So a
 * cycle change on the board now means the tape changed, which is a property it
 * has never had before.
 *
 * **It is not part of the Sheet/Auto apparatus.** There is no second opinion to
 * conflict with, so cycle leaves that machinery entirely. Anything that shows a
 * cycle conflict after this is showing a fiction.
 */

import type { CycleHistory, CyclePhase, CycleResult } from '@/lib/market/cycle';
import type { DeskRow } from './merge';
import type { DeskConclusion, ReadTone } from './deskRead';

/**
 * Trader-facing words for the six phases. Settled with the desk owner
 * 2026-08-23.
 *
 * `PULLBACK` is deliberately NOT called "pullback". In this trader's playbook a
 * pullback is the micro pullback on rising volume that is his *entry trigger*;
 * as a cycle phase it means a multi-session position in the arc. One word, one
 * sense saying buy and the other saying context — worse than jargon, because
 * jargon is opaque and this gets confidently misread.
 *
 * `SHADOW` is `PRIOR RUN`: the state carries two facts — the name is not in
 * play, and its old high is still overhead — and a badge can say one. This says
 * the trade-relevant half, in the vocabulary the desk already uses.
 */
export const CYCLE_PHASE_LABEL: Record<CyclePhase, string> = {
  DAY_ONE: 'DAY 1',
  FRONTSIDE: 'FRONTSIDE',
  PULLBACK: 'OFF HIGH',
  BACKSIDE: 'BACKSIDE',
  SHADOW: 'PRIOR RUN',
  NO_CYCLE: 'NO RUN',
};

/**
 * One saturated element per row, so only the phase a trader acts against is
 * loud. `PRIOR RUN` and `NO RUN` are absences of a live move, not warnings, and
 * colouring them would spend the row's one colour on nothing happening.
 */
export function cyclePhaseTone(phase: CyclePhase): ReadTone {
  switch (phase) {
    case 'DAY_ONE':
    case 'FRONTSIDE':
      return 'pos';
    case 'PULLBACK':
      return 'warn';
    case 'BACKSIDE':
      return 'neg';
    default:
      return 'dim';
  }
}

/**
 * The arithmetic behind the badge, for the hover and for the drawer.
 *
 * Retracement is of the MOVE, never distance below the high, and the two
 * diverge badly at ordinary prices: a name based at $1.00 that ran to $1.20 has
 * given back half its move at $1.10, where the below-high figure reads a
 * reassuring 8%. The reassuring number appears on exactly the names that have
 * broken. `retracementPct` is also what decides the phase, so showing it keeps
 * the number and the word consistent.
 */
/** Unsigned, one decimal. A giveback is not a negative advance and must not wear a sign. */
function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function cycleDetail(current: CycleResult): string | null {
  if (current.phase === 'NO_CYCLE') return null;

  const parts = [
    `up ${pct(current.advancePct)} from ${current.baseClose.toFixed(2)}`,
    `high ${current.cycleHigh.toFixed(2)} on ${current.cycleHighDate}`,
  ];

  if (current.retracementPct > 0) {
    parts.push(`${pct(current.retracementPct * 100)} of the move given back`);
  }

  parts.push(
    current.sessionsSinceHigh === 0
      ? 'high is the latest session'
      : `${current.sessionsSinceHigh} session${current.sessionsSinceHigh === 1 ? '' : 's'} since the high`,
  );

  /*
   * The as-of, and the whole point of this line.
   *
   * Every number above is settled-only: `ensureDailyHistory` writes no bar until
   * 20:00 ET and `readDailyBars` defaults to EXCLUDE, so the latest bar is never
   * today's. During premarket -- the window he actually trades -- the reading is
   * a statement about YESTERDAY wearing the present tense.
   *
   * That matters beyond this string, because `cycleHigh` feeds `retracementPct`
   * and `retracementPct` decides the PHASE: a name gapping above yesterday's
   * cycle high is labelled OFF HIGH while it makes new highs. Dating the reading
   * does not fix the phase. It stops the reading claiming to be current, which
   * is a smaller thing done honestly rather than a fix pretending to be one.
   *
   * Stated as what IS true and never as "today not included" -- after 20:00 ET
   * today IS the latest session, and a clause that flips is the failure this
   * desk keeps finding. A bare date is true in every window.
   */
  parts.push(`through ${current.latestDate} close`);

  return parts.join(' · ');
}

/**
 * The cycle conclusion, or null when no dossier has computed one yet.
 *
 * **Null is not a reason to fall back to the model's classification.** That
 * field is being deleted, and reading it here would keep it alive past its own
 * removal — the caller shows the field as unresolved instead. A blank cycle on
 * a not-yet-recomputed name is honest and transient; a stale model verdict
 * wearing the new labels would be neither.
 */
export function resolveComputedCycle(history: CycleHistory | null | undefined): DeskConclusion | null {
  if (!history) return null;

  const phase = history.current.phase;

  return {
    label: CYCLE_PHASE_LABEL[phase],
    tone: cyclePhaseTone(phase),
    provenance: 'COMPUTED',
    title: cycleDetail(history.current),
    // Nothing to disagree with. Arithmetic has no counterparty.
    otherLabel: null,
  };
}

/** A row's computed phase, or null when no dossier has one yet. */
export function cyclePhaseOf(row: DeskRow | undefined | null): CyclePhase | null {
  return row?.intelligence?.analysis?.dossier?.computedCycle?.current.phase ?? null;
}

/**
 * How many rows sit in each phase.
 *
 * Computed here rather than read from `MarketSummary.freshFrontside` and its
 * siblings, which count the Sheet's cycle string (`lib/data/rows.ts:428`).
 * Mixing the two would put a sheet-derived count on a segment that applies a
 * phase-derived filter — click "fresh · 4", get zero rows. A count and the
 * filter it describes have to come from one source or they will disagree in
 * front of the trader.
 */
export function countCyclePhases(rows: Iterable<DeskRow>): Record<CyclePhase, number> {
  const counts: Record<CyclePhase, number> = {
    DAY_ONE: 0,
    FRONTSIDE: 0,
    PULLBACK: 0,
    BACKSIDE: 0,
    SHADOW: 0,
    NO_CYCLE: 0,
  };
  for (const row of rows) {
    const phase = cyclePhaseOf(row);
    if (phase) counts[phase] += 1;
  }
  return counts;
}

/**
 * The chip's high reference and the two prices beneath it.
 *
 * He asked for prices rather than a percentage: *"dont do a percentage - it's
 * deceptive… OFF HIGH - $1.20→ $1.00"*. **A ratio hides its denominator; two
 * prices carry theirs**, and he does the arithmetic he actually trades on.
 *
 * **The reference is `max(cycleHigh, sessionHigh)`, and that alone removes the
 * contradiction this began with.** `cycleHigh` is settled-only, so a name that
 * gapped overnight could sit ABOVE it — printing "OFF HIGH · $1.20 → $1.80", a
 * price above the high beside a word saying it is off it. Taking the maximum
 * makes `now > high` STRUCTURALLY IMPOSSIBLE rather than merely unlikely.
 */
export interface HighReading {
  /**
   * Label override, or null to keep the arc's phase word.
   *
   * Fires ONLY when today's high has actually beaten the arc — read literally
   * from *"change to NEW HIGH if the high is new"*. A name sitting at its OLD
   * cycle high keeps its phase word, because that high is not new and reading
   * the instruction more broadly would label names he did not describe.
   */
  label: 'NEW HIGH' | 'OFF HIGH' | null;
  /**
   * Tone for the override.
   *
   * **Must follow the label.** Without it NEW HIGH renders in the `neg` colour
   * of the stale BACKSIDE verdict underneath — a word saying one thing while
   * its colour says the opposite, which is the label-and-number mismatch one
   * layer up.
   */
  tone: ReadTone | null;
  /** The reference high, for the left of the pair. */
  high: number;
  /** Live price, for the right. Matches his screen; `latestClose` would not. */
  now: number;
}

/**
 * Null when there is nothing to show — no cycle, or no live price.
 *
 * **The band is the SPREAD, and it is not optional for the reason it looks
 * like.** `reference` is a MAXIMUM, so price can never exceed it: `price ===
 * reference` holds for one print and is false immediately after. Without a
 * band NEW HIGH would appear and vanish on the same tick. Off by less than the
 * spread is not off — the difference was not sellable — and it is the same
 * instrument the colour on this row already uses, rather than a second invented
 * band.
 *
 * **No spread means no override**, not a guess. The prices still render, because
 * they are observations and need no band; only the verdict does.
 */
export function highReading(
  arc: CycleResult | null | undefined,
  sessionHigh: number | null | undefined,
  price: number | null | undefined,
  spread: number | null | undefined,
): HighReading | null {
  if (!arc || arc.phase === 'NO_CYCLE') return null;
  if (price === null || price === undefined || !Number.isFinite(price)) return null;

  const cycleHigh = arc.cycleHigh;
  const beat =
    sessionHigh !== null &&
    sessionHigh !== undefined &&
    Number.isFinite(sessionHigh) &&
    sessionHigh > cycleHigh;
  const high = beat ? (sessionHigh as number) : cycleHigh;

  if (!beat) return { label: null, tone: null, high, now: price };

  if (spread === null || spread === undefined || !Number.isFinite(spread)) {
    return { label: null, tone: null, high, now: price };
  }

  /*
   * Compared at six decimals, because the raw subtraction is not stable at the
   * boundary: `1.5 - 1.49` is 0.010000000000000009 and would read as OUTSIDE a
   * one-cent spread. Quotes are never finer than four decimals, so rounding at
   * six cannot change a real decision and removes the float noise that would
   * otherwise flip the label on an exact-boundary print.
   */
  const scaled = (v: number) => Math.round(v * 1e6);
  const atHigh = scaled(high - price) <= scaled(Math.abs(spread));
  return atHigh
    ? { label: 'NEW HIGH', tone: 'pos', high, now: price }
    : { label: 'OFF HIGH', tone: 'warn', high, now: price };
}

/** Prices as he wrote them: dollar signs, four decimals under $1, two above. */
export function formatHighPair(reading: HighReading): string {
  const fmt = (v: number) => `$${v.toFixed(v < 1 ? 4 : 2)}`;
  return `${fmt(reading.high)} → ${fmt(reading.now)}`;
}
