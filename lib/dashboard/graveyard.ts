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

export interface GraveyardEntry {
  ticker: string;
  deadSince: string | null;
  deadForLabel: string;
  deadAtRank: number | null;
  deadAtPeakTrades: number | null;
  deathCount: number;
  /** Died at least once and is trading again. Stays listed, marked. */
  revived: boolean;
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

  return {
    wired: measuredRows.length > 0,
    dead: dead.length,
    revived: revived.length,
    churned: churned.length,
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
      return {
        ticker: row.ticker,
        deadSince: d?.deadSince ?? null,
        deadForLabel: deadFor(d?.deadSince, now),
        deadAtRank: d?.deadAtRank ?? null,
        deadAtPeakTrades: d?.deadAtPeakTrades ?? null,
        deathCount: d?.deathCount ?? 0,
        revived: (d?.deathCount ?? 0) > 0 && d?.activity === 'ACTIVE',
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
