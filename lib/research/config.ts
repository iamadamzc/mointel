/**
 * Research configuration.
 *
 * Read once, from the environment, by worker-side code only. Nothing here is
 * imported by anything under app/ or components/ — the same rule that keeps
 * Alpaca credentials out of the browser applies to SEC and model settings, and
 * tests/security.test.ts enforces it.
 *
 * No value is printed or persisted. Availability is reported as a boolean and a
 * reason string, never as the value itself.
 */

/** SEC publishes a 10 req/s ceiling. We stay well under it deliberately. */
const DEFAULT_SEC_RATE = 5;
const DEFAULT_ACTIVE_POLL_SECONDS = 60;
const DEFAULT_AUTO_RANK = 12;
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_CATALYST_REFRESH_MINUTES = 10;

export interface SecConfig {
  /**
   * Contact string sent on every SEC request. SEC requires a real identifier;
   * there is no default and no fabricated fallback.
   */
  userAgent: string | null;
  maxRequestsPerSecond: number;
  activePollSeconds: number;
}

export interface ResearchConfig {
  sec: SecConfig;
  autoRank: number;
  concurrency: number;
  catalystRefreshMinutes: number;
}

function positiveNumber(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function readResearchConfig(env: NodeJS.ProcessEnv = process.env): ResearchConfig {
  const userAgent = env.SEC_USER_AGENT?.trim();

  return {
    sec: {
      userAgent: userAgent ? userAgent : null,
      maxRequestsPerSecond: positiveNumber(env.SEC_MAX_REQUESTS_PER_SECOND, DEFAULT_SEC_RATE),
      activePollSeconds: positiveNumber(env.SEC_ACTIVE_POLL_SECONDS, DEFAULT_ACTIVE_POLL_SECONDS),
    },
    autoRank: positiveNumber(env.RESEARCH_AUTO_RANK, DEFAULT_AUTO_RANK),
    concurrency: positiveNumber(env.RESEARCH_CONCURRENCY, DEFAULT_CONCURRENCY),
    catalystRefreshMinutes: positiveNumber(
      env.CATALYST_REFRESH_MINUTES,
      DEFAULT_CATALYST_REFRESH_MINUTES,
    ),
  };
}

export interface Availability {
  available: boolean;
  detail: string;
}

/**
 * Whether SEC collection may run.
 *
 * A missing user agent disables fetching rather than sending an anonymous
 * request. The diagnostic names the variable, never a value.
 */
export function secAvailability(config: SecConfig): Availability {
  if (!config.userAgent) {
    return {
      available: false,
      detail: 'SEC_USER_AGENT is not set — SEC fetching disabled',
    };
  }

  // SEC asks for something that identifies the requester and can be contacted.
  // A bare product name with no contact route is not compliant, so it is
  // rejected here rather than quietly rate-limited by them later.
  if (!config.userAgent.includes('@')) {
    return {
      available: false,
      detail: 'SEC_USER_AGENT must include a contact email address',
    };
  }

  return { available: true, detail: `configured, ${config.maxRequestsPerSecond} req/s ceiling` };
}
