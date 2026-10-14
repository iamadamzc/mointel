/**
 * L6: the float cell's inputs restated across LISTED splits (build plan 0719a53b, steps 3 to 5; Commercial reads 98 R1 to
 * R4, 104, 108, 110; his "yes to all three", uuid 8e3e419f, item 3). The one place the job (`floatCellFor` in
 * floatJob.ts) and the reader (`floatCellAt` in floatRead.ts) restate, so they decide alike at any D.
 *
 * Restatement only ever replaces TODAY'S REFUSAL for a split since the count (CANNOT_VERIFY / SPLIT_SINCE_COUNT). A row
 * stored before L6 (`announcedActions` undefined), a failed fetch (null), and a span that today's two sources already
 * call NONE all keep today's path unchanged: `AS_TODAY`. When the listed splits and the bars do not support a
 * restatement (`restateCount` refuses), today's refusal stands: `REFUSE`.
 *
 * Holdings when the count is restated (plan step 4, read 110): a holding refused today stays refused. Every other
 * holding's classes are restated: h0 and hD each by the splits after their OWN date through D, so h0 (dated on or
 * before the count, with no split in between by read 108's rule) takes the count's factor, and an hD dated after a split
 * takes only the splits after it. Any refusal for either refuses the whole holding (not subtracted): a non-split
 * share-changing action in the holding's span (read 110 (2), R2), a holding FILED on or after an ex-date it predates
 * (read 110 (1), R3), an ex-date on the holding's own date, a rateless split. The smallest title is chosen AFTER
 * restating, as S1 chooses it today (insiderBound.ts holdingsAtBoth), so the insiders the panel lists are in the
 * restated count's units (Commercial read 114 (1)).
 */
import type { SplitProof } from './insiderBound';
import type { StoredHolding } from './floatJob';
import { restateCount, restateSpan, type AnnouncedAction, type RestatedSplit } from './splitRestate';
import { splitProofFromBars, type SpanBar } from './splitProof';

/** What a PRODUCED cell carries when its count was restated; the payload field Design's face reads (`restated`). */
export interface Restatement {
  /** Oldest first, as announced; a 1-for-10 reverse split is { newRate: 1, oldRate: 10 }. */
  splits: RestatedSplit[];
  /** Shares side: the product of newRate / oldRate (R4). */
  factor: number;
  /** The filed count times `factor`: the count the bound is measured from. */
  restatedShares: number;
  /** True only when the bars prove the span and agree within 1 percent (no triangle on the face). */
  provenByBars: boolean;
}

export type RestatedInputs =
  | { kind: 'AS_TODAY' }
  | { kind: 'REFUSE' }
  | { kind: 'RESTATE'; countShares: number; holdings: StoredHolding[]; restated: Restatement };

/** The latest of a holding's filed dates, or null: R3 asks whether it was filed on or after an ex-date it predates. */
const latestFiled = (h: StoredHolding): string | null => (h.filingDates.length > 0 ? [...h.filingDates].sort()[h.filingDates.length - 1]! : null);

/** The factor for a holding value dated `asOf`, carried to D; null = refused (the holding is not subtracted). */
function holdingFactor(actions: readonly AnnouncedAction[], asOf: string, d: string, filed: string | null): number | null {
  const r = restateSpan(actions, { from: asOf, to: d, filed, d });
  if (r.kind === 'REFUSE') return null;
  return r.kind === 'RESTATE' ? r.factor : 1;
}

/** One stored holding under a restated count: restated (split NONE), or refused (split UNPROVEN, not subtracted). */
function restateHolding(actions: readonly AnnouncedAction[], h: StoredHolding, countAsOf: string, d: string): StoredHolding {
  if (h.split !== 'NONE') return h;
  const refused: StoredHolding = { ...h, split: 'UNPROVEN' };
  // Read 110 (2), R2 over the HOLDING span: any listed share-changing action between the holding and the count refuses.
  // A split there is already refused today (`h.split`, rule R-A), so only a non-split action can reach this.
  if (h.asOf < countAsOf && restateSpan(actions, { from: h.asOf, to: countAsOf, d }).kind !== 'NONE_LISTED') return refused;
  if (h.classes.length === 0) return refused;
  const filed = latestFiled(h);
  let smallest: number | null = null;
  for (const c of h.classes) {
    const f0 = holdingFactor(actions, c.h0AsOf, d, filed);
    const fD = holdingFactor(actions, c.hDAsOf, d, filed);
    if (f0 === null || fD === null) return refused;
    // S1: min(h0, hD), each in today's units; then the smallest title, AFTER restating.
    const held = Math.min(c.h0 * f0, c.hD * fD);
    smallest = smallest === null ? held : Math.min(smallest, held);
  }
  return { ...h, shares: smallest! };
}

/**
 * The cell's inputs at D. `actions`: the row's `announcedActions` (undefined on a row stored before L6). `splitSinceCount`:
 * today's answer for the count span (R1 bars with rule R-A), which only a restatement can override.
 */
export function restateForCell(input: {
  actions: readonly AnnouncedAction[] | null | undefined;
  count: { shares: number; asOf: string; filed: string };
  holdings: readonly StoredHolding[];
  splitSinceCount: SplitProof;
  countSpanBars: readonly SpanBar[];
  d: string;
}): RestatedInputs {
  const { actions, count, d } = input;
  if (actions === undefined || actions === null || input.splitSinceCount === 'NONE') return { kind: 'AS_TODAY' };
  const listed = restateSpan(actions, { from: count.asOf, to: d, filed: count.filed, d });
  const decided = restateCount(listed, splitProofFromBars(input.countSpanBars, d), input.countSpanBars);
  if (decided.kind === 'AS_TODAY') return { kind: 'AS_TODAY' };
  if (decided.kind === 'REFUSE') return { kind: 'REFUSE' };
  const countShares = count.shares * decided.factor;
  return {
    kind: 'RESTATE',
    countShares,
    holdings: input.holdings.map((h) => restateHolding(actions, h, count.asOf, d)),
    restated: { splits: decided.splits, factor: decided.factor, restatedShares: countShares, provenByBars: decided.provenByBars },
  };
}
