/**
 * When to ask Alpaca for today's official closing print, and when to stop.
 *
 * There are three ways this can end and they are not the same, which is the
 * whole reason this exists as a state machine rather than a boolean.
 *
 * The original code set `rthCloseCaptured = true` after the request, inside the
 * try, so any throw skipped it and the one-second flush timer asked again
 * immediately: 21,473 identical failures in a day. The obvious repair — latch in
 * the catch instead — stops the loop and introduces a worse bug, because a
 * single transient 500 would then abandon the closing reference for the entire
 * trading date. A close nobody can capture and a close nobody will try to
 * capture look identical on the dashboard and are very different problems.
 *
 * So:
 *
 *   success                  -> CAPTURED, terminal, no further requests
 *   invalid symbol           -> quarantine it and retry the valid remainder;
 *                               the latch waits for that remainder to succeed
 *   nothing valid remains    -> NO_VALID_SYMBOLS, terminal, said out loud
 *   transient / unclassified -> schedule a bounded retry, never latch
 *
 * and everything resets when the trading date rolls.
 */

export type RthCloseState =
  | 'PENDING'
  | 'CAPTURED'
  | 'RETRY_SCHEDULED'
  | 'DEGRADED'
  | 'NO_VALID_SYMBOLS';

export interface RthCloseCaptureStatus {
  tradingDate: string | null;
  state: RthCloseState;
  attempts: number;
  consecutiveFailures: number;
  nextAttemptAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  capturedSymbols: number | null;
  capturedAt: string | null;
}

export interface RthCloseCaptureOptions {
  /** Waits between transient failures. The last value is the cap. */
  backoffMs?: readonly number[];
  /** Consecutive failures before the state is reported as degraded. */
  degradedAfter?: number;
  now?: () => Date;
}

/**
 * 30s, 1m, 2m, 5m, then 10m forever.
 *
 * Deliberately starts short: the closing print is worth having promptly, and a
 * provider blip usually clears in seconds. It ends long because after ten
 * minutes of failures the problem is not going to be solved by asking faster.
 */
const DEFAULT_BACKOFF_MS = [30_000, 60_000, 120_000, 300_000, 600_000] as const;
const DEFAULT_DEGRADED_AFTER = 4;

export class RthCloseCapture {
  private tradingDate: string | null = null;
  private state: RthCloseState = 'PENDING';
  private attempts = 0;
  private consecutiveFailures = 0;
  private nextAttemptAtMs = 0;
  private lastError: string | null = null;
  private lastErrorAt: string | null = null;
  private capturedSymbols: number | null = null;
  private capturedAt: string | null = null;

  private readonly backoff: readonly number[];
  private readonly degradedAfter: number;

  constructor(private readonly options: RthCloseCaptureOptions = {}) {
    this.backoff = options.backoffMs ?? DEFAULT_BACKOFF_MS;
    this.degradedAfter = options.degradedAfter ?? DEFAULT_DEGRADED_AFTER;
  }

  private now(): Date {
    return this.options.now ? this.options.now() : new Date();
  }

  /**
   * Points the machine at a trading date, resetting everything if it changed.
   *
   * A new session gets a clean attempt regardless of how the previous one ended
   * — including a terminal one. Yesterday's quarantine is not evidence about
   * today's board.
   */
  beginTradingDate(tradingDate: string): void {
    if (this.tradingDate === tradingDate) return;
    this.tradingDate = tradingDate;
    this.state = 'PENDING';
    this.attempts = 0;
    this.consecutiveFailures = 0;
    this.nextAttemptAtMs = 0;
    this.lastError = null;
    this.lastErrorAt = null;
    this.capturedSymbols = null;
    this.capturedAt = null;
  }

  /** True once no further request will be made for this trading date. */
  get isTerminal(): boolean {
    return this.state === 'CAPTURED' || this.state === 'NO_VALID_SYMBOLS';
  }

  /** True when a request may be made right now. */
  shouldAttempt(): boolean {
    if (this.isTerminal) return false;
    return this.now().getTime() >= this.nextAttemptAtMs;
  }

  /** Counted before the request, so an attempt that throws still counts. */
  noteAttempt(): void {
    this.attempts += 1;
  }

  recordSuccess(symbols: number): void {
    this.state = 'CAPTURED';
    this.consecutiveFailures = 0;
    this.capturedSymbols = symbols;
    this.capturedAt = this.now().toISOString();
    this.nextAttemptAtMs = 0;
  }

  /**
   * Terminal, and loudly so.
   *
   * Everything the desk wanted a close for was refused. Retrying cannot change
   * that — the quarantine is what made the set empty — so the episode ends and
   * the reason is carried in the status rather than being inferred from an
   * absence of closes.
   */
  recordNoValidSymbols(detail: string): void {
    this.state = 'NO_VALID_SYMBOLS';
    this.lastError = detail;
    this.lastErrorAt = this.now().toISOString();
    this.nextAttemptAtMs = 0;
  }

  /**
   * A transient or unclassified failure. Never latches success.
   *
   * `retryAfterMs` wins when the provider sent one: being told to wait sixty
   * seconds and coming back in thirty earns another 429.
   */
  recordFailure(failure: { detail: string; retryAfterMs?: number | null }): void {
    this.consecutiveFailures += 1;
    this.lastError = failure.detail;
    this.lastErrorAt = this.now().toISOString();

    const scheduled = this.backoff[Math.min(this.consecutiveFailures - 1, this.backoff.length - 1)];
    const waitMs = Math.max(failure.retryAfterMs ?? 0, scheduled);
    this.nextAttemptAtMs = this.now().getTime() + waitMs;

    // Degraded still retries. Abandoning the reference close silently is the
    // failure mode this whole machine exists to avoid.
    this.state = this.consecutiveFailures >= this.degradedAfter ? 'DEGRADED' : 'RETRY_SCHEDULED';
  }

  get status(): RthCloseCaptureStatus {
    return {
      tradingDate: this.tradingDate,
      state: this.state,
      attempts: this.attempts,
      consecutiveFailures: this.consecutiveFailures,
      nextAttemptAt:
        this.nextAttemptAtMs > 0 && !this.isTerminal
          ? new Date(this.nextAttemptAtMs).toISOString()
          : null,
      lastError: this.lastError,
      lastErrorAt: this.lastErrorAt,
      capturedSymbols: this.capturedSymbols,
      capturedAt: this.capturedAt,
    };
  }
}
