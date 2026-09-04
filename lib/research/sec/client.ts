/**
 * SEC HTTP client.
 *
 * Every SEC request in the project goes through here, which is what makes the
 * rate ceiling, the declared User-Agent and the backoff policy actually global
 * rather than a convention each collector is trusted to follow.
 *
 * Deliberately narrow: it fetches a URL SEC published and returns the body. It
 * does not discover links, follow redirects into other hosts, or crawl. Callers
 * ask for documents an active research job needs.
 */

import type { SecConfig } from '../config';
import { secAvailability } from '../config';
import { RateLimiter } from './limiter';

const RETRYABLE_STATUS = new Set([403, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 15_000;

export class SecUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecUnavailableError';
  }
}

export class SecRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(message);
    this.name = 'SecRequestError';
  }
}

export interface SecFetchResult {
  url: string;
  body: string;
  status: number;
  /** True when served from the in-process cache without touching the network. */
  cached: boolean;
}

export interface SecClientOptions {
  config: SecConfig;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Per-request ceiling. See REQUEST_TIMEOUT_MS. */
  timeoutMs?: number;
}

/**
 * Ceiling on a single SEC request.
 *
 * An unbounded fetch inside the research worker's poll loop is a hang with no
 * error, no crash and no failed heartbeat -- the process stays up, health keeps
 * its last state, and nothing is claimed. The worker went silent for 23 hours
 * on 2026-08-22 with exactly that signature. Whether an unbounded fetch caused
 * that specific silence is not established, but a network call in a loop with
 * no ceiling is a defect on its own terms.
 *
 * Generous rather than tight: the retry path already handles a slow SEC, and a
 * timeout short enough to fire on ordinary latency would turn a working
 * dependency into a failing one.
 */
export const REQUEST_TIMEOUT_MS = 30_000;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Parses Retry-After, which SEC may send as seconds or as an HTTP date.
 * Returns null when absent or unparseable, leaving the caller on exponential
 * backoff rather than guessing.
 */
export function parseRetryAfter(header: string | null, nowMs: number): number | null {
  if (!header) return null;

  const seconds = Number(header.trim());
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

  const date = Date.parse(header);
  if (Number.isFinite(date)) {
    const delta = date - nowMs;
    return delta > 0 ? delta : 0;
  }
  return null;
}

export function backoffDelayMs(attempt: number): number {
  return Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
}

/**
 * What SEC has actually done, as opposed to what we are configured to do.
 *
 * `secAvailability` answers "is a User-Agent set", never touches the network,
 * and therefore CANNOT REPORT AN OUTAGE. On 2026-09-04 the desk reported SEC
 * available for hours while every request from that box returned 403, and two
 * threads spent the morning reasoning about a block that the health endpoint
 * was structurally unable to see.
 *
 * UNKNOWN is a real state and must never read as healthy. A client that has
 * made no request has observed nothing, and "nothing observed" is not "fine" —
 * that collapse is the defect this record exists to remove. It costs no extra
 * requests: every status below is one the client already saw and discarded.
 */
export type SecReachability =
  | { state: 'UNKNOWN' }
  | { state: 'REACHABLE'; at: string }
  | {
      state: 'UNREACHABLE';
      at: string;
      /**
       * The HTTP status SEC refused with, or NULL when there was no response
       * at all — DNS failure, timeout, connection refused.
       *
       * Nullable because 0 is not a status. Rendering "SEC responded 0" states
       * something that did not happen and sends the next reader looking for a
       * status code that does not exist, during an incident, inside the field
       * built to stop exactly that. An absence must not borrow a plausible
       * value.
       */
      status: number | null;
      /** Exhausted get() calls, NOT HTTP requests — each is up to MAX_ATTEMPTS. */
      consecutiveFailures: number;
    };

/** One line for the health payload, so an outage is legible without parsing. */
export function describeReachability(r: SecReachability): string {
  if (r.state === 'UNKNOWN') return 'not yet observed';
  if (r.state === 'REACHABLE') return `last reached ${r.at}`;

  // "attempt" was ambiguous: the counter increments once per exhausted get(),
  // and each of those is up to MAX_ATTEMPTS HTTP requests. Every reader would
  // have taken 3 to mean 3. Say what the number counts.
  const scope = `${r.consecutiveFailures} consecutive fetch(es), each after ${MAX_ATTEMPTS} attempts`;
  const what =
    r.status === null ? 'no response — network failure' : `SEC responded ${r.status}`;
  return `${what} on ${scope}, last ${r.at}`;
}

export class SecClient {
  private readonly limiter: RateLimiter;
  private readonly cache = new Map<string, SecFetchResult>();
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private networkRequests = 0;
  private reachabilityState: SecReachability = { state: 'UNKNOWN' };
  private consecutiveFailures = 0;

  constructor(private readonly options: SecClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? defaultSleep;
    this.now = options.now ?? Date.now;
    this.limiter = new RateLimiter({
      maxRequestsPerSecond: options.config.maxRequestsPerSecond,
      now: this.now,
      sleep: this.sleep,
    });
  }

  /** Requests that actually reached the network, excluding cache hits. */
  get requestCount(): number {
    return this.networkRequests;
  }

  /**
   * The last thing SEC actually did. UNKNOWN until a request has been made —
   * reported as such rather than as success.
   */
  get reachability(): SecReachability {
    return this.reachabilityState;
  }

  private recordReachable(): void {
    this.consecutiveFailures = 0;
    this.reachabilityState = { state: 'REACHABLE', at: new Date(this.now()).toISOString() };
  }

  private recordUnreachable(status: number | null): void {
    this.consecutiveFailures += 1;
    this.reachabilityState = {
      state: 'UNREACHABLE',
      at: new Date(this.now()).toISOString(),
      status,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Fetches a SEC URL, or returns the cached body from an earlier fetch in this
   * process. The cache is what stops one job's filing set from being re-fetched
   * by the next job that needs the same document.
   */
  async get(url: string): Promise<SecFetchResult> {
    const availability = secAvailability(this.options.config);
    if (!availability.available) {
      // Refusing here rather than sending an anonymous request is the required
      // behavior: SEC gets no traffic it cannot attribute.
      throw new SecUnavailableError(availability.detail);
    }

    const cached = this.cache.get(url);
    if (cached) return { ...cached, cached: true };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      await this.limiter.acquire();
      this.networkRequests += 1;

      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          headers: {
            // SEC requires this to identify the requester.
            'User-Agent': this.options.config.userAgent as string,
            'Accept-Encoding': 'gzip, deflate',
          },
          // A timeout is a failed attempt, not a hang: it lands in the catch
          // below and takes the existing backoff like any other error.
          signal: AbortSignal.timeout(this.options.timeoutMs ?? REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < MAX_ATTEMPTS) await this.sleep(backoffDelayMs(attempt));
        continue;
      }

      if (response.ok) {
        this.recordReachable();
        const body = await response.text();
        const result: SecFetchResult = { url, body, status: response.status, cached: false };
        this.cache.set(url, result);
        return result;
      }

      if (!RETRYABLE_STATUS.has(response.status)) {
        // 404 for a document that does not exist is an answer, not a failure to
        // retry against — and an answer means SEC is reachable. Recording it as
        // an outage would make a missing filing look like a blocked desk.
        this.recordReachable();
        throw new SecRequestError(`SEC responded ${response.status}`, response.status, url);
      }

      // 403 and 429 both mean "you are asking too much". Slow the shared
      // schedule so every job backs off, not only this one.
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'), this.now());
      const delay = retryAfter ?? backoffDelayMs(attempt);
      this.limiter.penalise(delay);
      lastError = new SecRequestError(`SEC responded ${response.status}`, response.status, url);

      if (attempt < MAX_ATTEMPTS) await this.sleep(delay);
    }

    // Every attempt exhausted on a retryable status: 403 or 429 repeated until
    // the client gave up. THAT is an outage, and it is the case the old health
    // field could not express.
    // null, not 0: a thrown fetch means SEC never answered, and a refusal and
    // a network failure are two different observations.
    this.recordUnreachable(lastError instanceof SecRequestError ? lastError.status : null);
    throw lastError ?? new SecRequestError('SEC request failed', 0, url);
  }

  /** Fetches and parses JSON, surfacing a parse failure as a request error. */
  async getJson<T>(url: string): Promise<{ data: T; cached: boolean }> {
    const result = await this.get(url);
    try {
      return { data: JSON.parse(result.body) as T, cached: result.cached };
    } catch {
      throw new SecRequestError('SEC returned unparseable JSON', result.status, url);
    }
  }
}
