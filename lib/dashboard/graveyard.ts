/**
 * The graveyard's projection: which names left the board, and whether leaving
 * was right.
 *
 * A name dead for five consecutive minutes leaves the active board. The engine
 * determines that and emits `activity`, `deadSince`, `deadAtRank`,
 * `deadAtPeakTrades` and `deathCount`; this module decides what a surface may
 * say about them.
 *
 * The whole point of the section is that it is **the drop rule's own
 * falsification surface**, so the counts below are the deliverable and the rows
 * are the detail.
 */

import type { DeskRow } from './merge';

/**
 * Deaths at which a name counts as churning rather than as having died.
 *
 * Two is the smallest number that can only be reached by reviving in between,
 * which is exactly what makes it evidence about the threshold rather than about
 * the stock.
 */
export const DEATH_CHURN_THRESHOLD = 2;

/**
 * How far a revived name must move before the drop counts as a MISS.
 *
 * Deliberately a constant in the surface rather than a column in the store.
 * `dead_at_price` is a fact captured at the flip; whether the move since counts
 * as a run is a judgement, and a judgement frozen in a schema changes only by
 * migration. Set to R&D's +25%, which is the bar its own premarket measurement
 * used — 33% of dead names see activity return but only 7% come back at +25% or
 * better — so the count here is comparable to that number rather than to a
 * threshold invented in a component.
 */
export const RAN_THRESHOLD_PCT = 25;

export interface GraveyardEntry {
  ticker: string;
  deadSince: string | null;
  deadForLabel: string;
  deadAtRank: number | null;
  deadAtPeakTrades: number | null;
  deathCount: number;
  /** Died at least once and is trading again. Stays listed, marked. */
  revived: boolean;
  /** Move since the latest death, in percent. Null without a price at death. */
  moveSinceDeathPct: number | null;
  /**
   * Revived AND running: the drop looks like a miss rather than churn.
   *
   * Measured from the LATEST death only, because `dead_at_price` is overwritten
   * at each one. So this is a statement about the current revival, not a tally
   * of every revival that ran — which is why the header says "running now" and
   * not "misses this session".
   */
  ran: boolean;
}

export interface GraveyardSummary {
  /**
   * Whether the activity measurement reaches this surface at all.
   *
   * False means the fields did not survive the store round trip — the engine
   * populates them live but `repo.ts` has no columns yet. **That is a different
   * statement from "nothing has died", and collapsing the two would report a
   * measurement nobody took.** It is also the only thing that distinguishes an
   * honestly empty graveyard from a broken query while this is being built.
   */
  wired: boolean;
  dead: number;
  revived: number;
  /** Rows that have died `DEATH_CHURN_THRESHOLD` times or more. */
  churned: number;
  /**
   * Revived and running now.
   *
   * The MISS signal, and a different question from `churned`. A high
   * `deathCount` says the threshold is too tight — irritating. A revived name
   * that ran says the drop cost a trade — expensive. They argue for different
   * fixes, so one number could not carry both.
   */
  ran: number;
}

/** Minutes since a death, from `deadSince` — never from when detection fired. */
function deadFor(deadSince: string | null | undefined, now: number): string {
  if (!deadSince) return '—';
  const ms = now - Date.parse(deadSince);
  if (!Number.isFinite(ms) || ms < 0) return '—';

  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Percent move since the latest death, or null when it cannot be computed.
 *
 * Needs both a price captured AT the death and a live price now. Either being
 * absent means the question cannot be answered — not that the answer is no.
 */
function moveSinceDeath(deadAtPrice: number | null | undefined, price: number | null): number | null {
  if (deadAtPrice === null || deadAtPrice === undefined || deadAtPrice <= 0) return null;
  if (price === null || price === undefined) return null;
  return ((price - deadAtPrice) / deadAtPrice) * 100;
}

/**
 * True only when the engine's answer reached us.
 *
 * `undefined` means the field did not survive its journey; `'UNKNOWN'` means the
 * engine looked and could not say. Only the second is a measurement, and a row
 * carrying the first must not be rendered at all.
 */
function measured(row: DeskRow): boolean {
  return row.demand?.activity !== undefined;
}

export function graveyardSummary(rows: DeskRow[], now = Date.now()): GraveyardSummary {
  void now;
  const measuredRows = rows.filter(measured);

  const dead = measuredRows.filter((r) => r.demand?.activity === 'DEAD');
  const revived = measuredRows.filter(
    (r) => (r.demand?.deathCount ?? 0) > 0 && r.demand?.activity === 'ACTIVE',
  );
  const churned = measuredRows.filter(
    (r) => (r.demand?.deathCount ?? 0) >= DEATH_CHURN_THRESHOLD,
  );
  const ran = revived.filter((r) => {
    const move = moveSinceDeath(r.demand?.deadAtPrice, r.telemetry?.price ?? null);
    return move !== null && move >= RAN_THRESHOLD_PCT;
  });

  return {
    wired: measuredRows.length > 0,
    dead: dead.length,
    revived: revived.length,
    churned: churned.length,
    ran: ran.length,
  };
}

/**
 * The graveyard's rows, most recently dead first.
 *
 * Recency is the actionable order because revival probability decays with time
 * dead — a name quiet for six minutes is a candidate, one quiet for three hours
 * is history. Ties fall to the rank it held, then the ticker, so the order is
 * total and does not shuffle between polls.
 *
 * **A revived name is included rather than removed.** Dropping it would delete
 * the evidence the section exists to show, and a name reappearing on the main
 * board with no trace here is the same information loss as a name vanishing
 * from it.
 */
export function graveyardRows(rows: DeskRow[], now = Date.now()): GraveyardEntry[] {
  const entries = rows
    .filter(measured)
    .filter((row) => {
      const d = row.demand;
      if (!d) return false;
      return d.activity === 'DEAD' || (d.deathCount ?? 0) > 0;
    })
    .map<GraveyardEntry>((row) => {
      const d = row.demand;
      const move = moveSinceDeath(d?.deadAtPrice, row.telemetry?.price ?? null);
      return {
        ticker: row.ticker,
        deadSince: d?.deadSince ?? null,
        deadForLabel: deadFor(d?.deadSince, now),
        deadAtRank: d?.deadAtRank ?? null,
        deadAtPeakTrades: d?.deadAtPeakTrades ?? null,
        deathCount: d?.deathCount ?? 0,
        revived: (d?.deathCount ?? 0) > 0 && d?.activity === 'ACTIVE',
        moveSinceDeathPct: move,
        ran:
          (d?.deathCount ?? 0) > 0 &&
          d?.activity === 'ACTIVE' &&
          move !== null &&
          move >= RAN_THRESHOLD_PCT,
      };
    });

  entries.sort((a, b) => {
    const at = a.deadSince ? Date.parse(a.deadSince) : Number.NEGATIVE_INFINITY;
    const bt = b.deadSince ? Date.parse(b.deadSince) : Number.NEGATIVE_INFINITY;
    if (at !== bt) return bt - at;

    const ar = a.deadAtRank ?? Number.POSITIVE_INFINITY;
    const br = b.deadAtRank ?? Number.POSITIVE_INFINITY;
    if (ar !== br) return ar - br;

    return a.ticker.localeCompare(b.ticker);
  });

  return entries;
}
