/**
 * Global SEC request limiter.
 *
 * The ceiling is a property of our relationship with SEC, not of any one job,
 * so this is shared across every concurrent research job. Two jobs each
 * "politely" pacing themselves would still add up to double the intended rate;
 * one limiter in front of all of them is the only thing that actually holds.
 *
 * Requests are serialised through a queue rather than each caller sleeping, so
 * ordering is FIFO and a burst cannot slip through by racing.
 */

export interface LimiterOptions {
  maxRequestsPerSecond: number;
  /** Injectable for tests; defaults to wall clock. */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class RateLimiter {
  private readonly minIntervalMs: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;

  /** Tail of the queue: resolves when the previous caller has been released. */
  private chain: Promise<void> = Promise.resolve();
  /**
   * Negative infinity, not 0: with a zero-based injected clock, 0 would read as
   * "a request was issued at time 0" and make the very first caller wait a full
   * interval for a request that never happened.
   */
  private lastStartedAt = Number.NEGATIVE_INFINITY;
  private acquired = 0;

  constructor(options: LimiterOptions) {
    const rate = options.maxRequestsPerSecond > 0 ? options.maxRequestsPerSecond : 1;
    this.minIntervalMs = 1000 / rate;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? defaultSleep;
  }

  /** Number of slots handed out; used by diagnostics to report request counts. */
  get requestCount(): number {
    return this.acquired;
  }

  /**
   * Waits until this caller may issue a request.
   *
   * Each caller chains onto the previous one, so concurrency in the collectors
   * does not translate into concurrency at SEC.
   */
  async acquire(): Promise<void> {
    const wait = this.chain.then(async () => {
      const elapsed = this.now() - this.lastStartedAt;
      const remaining = this.minIntervalMs - elapsed;
      if (remaining > 0) await this.sleep(remaining);
      this.lastStartedAt = this.now();
      this.acquired += 1;
    });

    // Swallow rejection on the shared chain so one failed caller cannot wedge
    // the queue for everyone behind it.
    this.chain = wait.catch(() => undefined);
    return wait;
  }

  /**
   * Pushes the next allowed request further out, for a Retry-After or a 429.
   * Applied to the shared schedule so a backoff slows every job, not just the
   * one that happened to be rejected.
   */
  penalise(ms: number): void {
    if (ms <= 0) return;
    this.lastStartedAt = this.now() + ms - this.minIntervalMs;
  }
}
