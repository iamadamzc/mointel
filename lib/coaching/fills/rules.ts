/**
 * The thresholds every check is measured against, in one place.
 *
 * PROVENANCE MATTERS MORE THAN THE NUMBERS HERE. The coaching charter records
 * that this desk twice graded the trader against a rule that turned out to be
 * the booklet's rather than his — the trading window, corrected 2026-08-24 and
 * then corrected again the same week. The charter's standing instruction is to
 * assume every remaining threshold may be inherited and to check before
 * measuring.
 *
 * So each constant below carries `source`. `stated` means the trader said it.
 * `booklet` means it came from DAY_TRADING_INSTRUCTION_BOOKLET.md and has not
 * been confirmed against him. A report that leans on a `booklet` threshold is
 * obliged to say so.
 *
 * Nothing here is keyed to the clock, and nothing may be. The setup is the
 * requirement; the session is a reporting dimension.
 */

export type ThresholdSource = 'stated' | 'booklet' | 'proposed';

export interface Threshold {
  readonly value: number;
  readonly source: ThresholdSource;
  readonly note: string;
}

/**
 * Maximum intended risk per share. A realised loss above this did not
 * necessarily mean a stop was moved — price can move through a stop faster than
 * an exit fills — which is why the report splits breaches by hold time rather
 * than calling them all violations.
 */
export const MAX_LOSS_PER_SHARE: Threshold = {
  value: 0.25,
  source: 'booklet',
  note: 'Stated band is $0.15-$0.25/share; not yet confirmed against the trader.',
};

/** Upper end of "hold time is seconds, at most 1-2 minutes". */
export const MAX_HOLD_SECONDS: Threshold = {
  value: 120,
  source: 'booklet',
  note: 'Booklet-derived; not yet confirmed against the trader.',
};

/** Three reds and the session is over. A 4th trade is the signature. */
export const STRIKE_LIMIT: Threshold = {
  value: 3,
  source: 'booklet',
  note: 'Booklet section 9; not yet confirmed against the trader.',
};

/** Window for calling a re-entry after a loss "revenge" rather than a re-take. */
export const REVENGE_GAP_SECONDS: Threshold = {
  value: 60,
  source: 'booklet',
  note: 'Heuristic for the charter\'s revenge signature, not a rule the trader states.',
};

/**
 * The five-minute hands-off window after a big winner. Proposed by the desk on
 * 2026-08-25 after both recorded days showed every $25+ winner followed by a
 * net-losing burst; it becomes `stated` only if the trader adopts it.
 */
export const WIN_RITUAL_GAP_SECONDS: Threshold = {
  value: 300,
  source: 'proposed',
  note: 'Proposed 2026-08-25; not yet adopted by the trader.',
};

export function unverified(...thresholds: Threshold[]): Threshold[] {
  return thresholds.filter((t) => t.source !== 'stated');
}
