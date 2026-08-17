/**
 * Retry policy for failed research.
 *
 * Reconciliation asks the same question every cycle — "is this Top-N name
 * covered?" — which is what makes it survive restarts and downtime. The cost is
 * that a name failing deterministically gets asked forever: each attempt writes
 * a fresh `research_jobs` row, so the per-row `retry_count` resets every time
 * and bounds nothing. On a five-second cycle that is a failure loop spending
 * model calls all session.
 *
 * The fix is to scope retry state to what actually identifies a repeat: the
 * ticker, the trading date, and the evidence the analysis ran on. Failing three
 * times on the SAME evidence is a deterministic failure and stops. New evidence
 * is a different question and is always allowed through — which is why the
 * block clears the moment the fingerprint changes rather than on a timer.
 *
 * Pure policy: no database, no clock of its own.
 */

/** Attempts against one unchanged fingerprint before the name is left FAILED. */
export const DEFAULT_MAX_ATTEMPTS = 3;

/** First backoff step. Doubles per attempt: 30s, 60s, 120s. */
export const DEFAULT_BACKOFF_BASE_MS = 30_000;

export interface RetryState {
  ticker: string;
  tradingDate: string;
  /** Evidence the failures happened against. '' when none had been gathered. */
  evidenceFingerprint: string;
  attempts: number;
  firstFailedAt: string;
  lastFailedAt: string;
  /** Earliest time the next attempt may start. */
  nextAttemptAt: string | null;
  lastError: string | null;
}

export type RetryVerdict =
  /** Go ahead. */
  | { allow: true; blocked: false; reason: string }
  /** Waiting out a backoff step; this is temporary, not terminal. */
  | { allow: false; blocked: false; reason: string; waitUntil: string | null }
  /** Out of attempts on unchanged evidence. Terminal until something changes. */
  | { allow: false; blocked: true; reason: string; attempts: number };

/** Exponential backoff for the Nth attempt (1-based). */
export function backoffMs(attempts: number, baseMs = DEFAULT_BACKOFF_BASE_MS): number {
  const step = Math.max(1, attempts);
  return baseMs * 2 ** (step - 1);
}

/**
 * Decides whether a ticker may be queued again.
 *
 * The order matters. Changed evidence is checked before the attempt ceiling, so
 * a blocked name is released the instant new evidence exists rather than
 * staying blocked because it was blocked — the deadlock that a
 * count-only policy would produce.
 */
export function evaluateRetry(options: {
  state: RetryState | null;
  /** Fingerprint of the evidence currently on file for this ticker. */
  currentFingerprint: string;
  now: Date;
  maxAttempts?: number;
}): RetryVerdict {
  const { state, currentFingerprint, now } = options;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  if (!state || state.attempts <= 0) {
    return { allow: true, blocked: false, reason: 'no prior failure' };
  }

  /*
   * New evidence is a new question.
   *
   * This is what stops the ceiling becoming permanent: a name that failed three
   * times this morning is analysed again the moment a filing lands, without
   * waiting for a timer or a person.
   */
  if (state.evidenceFingerprint !== currentFingerprint) {
    return { allow: true, blocked: false, reason: 'evidence changed since the last failure' };
  }

  if (state.attempts >= maxAttempts) {
    return {
      allow: false,
      blocked: true,
      attempts: state.attempts,
      reason: `failed ${state.attempts} times on unchanged evidence`,
    };
  }

  if (state.nextAttemptAt && Date.parse(state.nextAttemptAt) > now.getTime()) {
    return {
      allow: false,
      blocked: false,
      reason: `waiting out backoff after ${state.attempts} attempt(s)`,
      waitUntil: state.nextAttemptAt,
    };
  }

  return { allow: true, blocked: false, reason: `retry ${state.attempts + 1}` };
}

/**
 * The next retry state after a failure.
 *
 * A failure against different evidence starts the count again: it is not the
 * same failure, and carrying the old count would block a name for problems it
 * no longer has.
 */
export function nextRetryState(options: {
  previous: RetryState | null;
  ticker: string;
  tradingDate: string;
  evidenceFingerprint: string;
  error: string | null;
  now: Date;
  backoffBaseMs?: number;
}): RetryState {
  const { previous, now } = options;
  const sameEvidence =
    previous !== null && previous.evidenceFingerprint === options.evidenceFingerprint;

  const attempts = sameEvidence ? previous.attempts + 1 : 1;
  const at = now.toISOString();

  return {
    ticker: options.ticker,
    tradingDate: options.tradingDate,
    evidenceFingerprint: options.evidenceFingerprint,
    attempts,
    firstFailedAt: sameEvidence ? previous.firstFailedAt : at,
    lastFailedAt: at,
    nextAttemptAt: new Date(
      now.getTime() + backoffMs(attempts, options.backoffBaseMs),
    ).toISOString(),
    lastError: options.error?.slice(0, 300) ?? null,
  };
}
