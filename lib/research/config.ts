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

import { DEFAULT_CATALYST_WINDOWS } from './time';
import { DEFAULT_CYCLE_HISTORY_TRADING_DAYS } from './history';

/** SEC publishes a 10 req/s ceiling. We stay well under it deliberately. */
const DEFAULT_SEC_RATE = 5;
const DEFAULT_ACTIVE_POLL_SECONDS = 60;
const DEFAULT_AUTO_RANK = 12;
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_CATALYST_REFRESH_MINUTES = 10;
const DEFAULT_RESEARCH_MODEL = 'gpt-5.6-terra';
/** Deterministic known-source checks are cheap enough to run every minute. */
const DEFAULT_SOURCE_POLL_SECONDS = 60;
/**
 * Discovery costs a model call, so it is spaced far wider than source polling.
 * A ticker whose catalyst is still unknown is checked more often than one whose
 * canonical source is already established — the first has something to find.
 */
const DEFAULT_WEB_DISCOVERY_UNRESOLVED_MINUTES = 10;
const DEFAULT_WEB_DISCOVERY_RESOLVED_MINUTES = 30;

export interface SecConfig {
  /**
   * Contact string sent on every SEC request. SEC requires a real identifier;
   * there is no default and no fabricated fallback.
   */
  userAgent: string | null;
  maxRequestsPerSecond: number;
  activePollSeconds: number;
}

/**
 * Model tiers. Only the interpreter/discovery factories read these; no model
 * string appears anywhere else in the codebase.
 */
export interface ModelConfig {
  apiKey: string | null;
  /** Default full research model. */
  researchModel: string;
  /** Selective escalation for difficult or conflicting dossiers. */
  escalationModel: string;
  /**
   * Which interpreter prompt to use. Defaults to 'A', the shipped instructions.
   *
   * 'B' adds a positive criterion for CLEAN and a definition for CAUTION and is
   * under test, not adopted. Selecting it is how the replay's treatment arm is
   * run without a second deploy.
   */
  promptVariant: 'A' | 'B';
  /**
   * Omits the Sheet's prior analysis from the evidence bundle.
   *
   * The prior is another model's conclusion and reaches the interpreter on
   * every call, so the automatic catalyst grade is not independent of it.
   * Setting this is the control arm that measures how much it actually moves.
   */
  omitSheetPrior: boolean;
  /** Low-cost tier for change detection and source location. */
  changeDetectModel: string;
  /**
   * How much retrieved page content the resolver's hosted search may load.
   *
   * Defaults to the provider default so this change is inert until the replay
   * gate has been run. The resolver is the honest candidate for `low`: it names
   * a candidate URL and the application then fetches and classifies that page
   * itself, so the model's reading of it is not what the decision rests on.
   */
  resolverSearchContext: 'low' | 'medium' | 'high' | null;
}

export interface CatalystConfig {
  /** Deterministic known-source polling. Cheap: no model, no web search. */
  sourcePollSeconds: number;
  /**
   * How often a *currently relevant* ticker with no established recent source
   * may run a low-cost discovery check.
   *
   * A press release can cross a newswire without touching SEC submissions or a
   * company feed, so an unchanged local fingerprint is not proof that nothing
   * happened. This interval is therefore allowed to trigger a bounded discovery
   * check — but only the cheap source-locator tier, and never interpretation.
   */
  webDiscoveryUnresolvedMinutes: number;
  /** The same, for a ticker whose recent canonical source is already known. */
  webDiscoveryResolvedMinutes: number;
  /** How recent a source must be to bear on current attention. */
  activeFreshnessHours: number;
  /** How far back sources are collected for context and recycling detection. */
  contextLookbackDays: number;
}

export interface CycleHistoryConfig {
  /**
   * Daily sessions retained for momentum-cycle context.
   *
   * Separate from minute-bar retention on purpose: cycle history needs months,
   * live state needs minutes, and widening the hot path to serve the cold one
   * would be the wrong trade.
   */
  tradingDays: number;
}

export interface ResearchConfig {
  sec: SecConfig;
  model: ModelConfig;
  catalyst: CatalystConfig;
  cycleHistory: CycleHistoryConfig;
  autoRank: number;
  concurrency: number;
  catalystRefreshMinutes: number;
}

/**
 * The hosted-search context size, or null to leave the provider's default.
 *
 * An unrecognised value reads as "not configured" rather than being passed
 * through: the API rejects an unknown enum, and a typo in an env var must not
 * take research down.
 */
function searchContext(raw: string | undefined): 'low' | 'medium' | 'high' | null {
  const value = raw?.trim().toLowerCase();
  return value === 'low' || value === 'medium' || value === 'high' ? value : null;
}

function positiveNumber(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function readResearchConfig(env: NodeJS.ProcessEnv = process.env): ResearchConfig {
  const userAgent = env.SEC_USER_AGENT?.trim();
  const apiKey = env.OPENAI_API_KEY?.trim();
  const researchModel = env.OPENAI_RESEARCH_MODEL?.trim() || DEFAULT_RESEARCH_MODEL;

  return {
    sec: {
      userAgent: userAgent ? userAgent : null,
      maxRequestsPerSecond: positiveNumber(env.SEC_MAX_REQUESTS_PER_SECOND, DEFAULT_SEC_RATE),
      activePollSeconds: positiveNumber(env.SEC_ACTIVE_POLL_SECONDS, DEFAULT_ACTIVE_POLL_SECONDS),
    },
    model: {
      apiKey: apiKey ? apiKey : null,
      researchModel,
      // Both tiers fall back to the research model, so tiering is an
      // optimisation the system never depends on.
      escalationModel: env.OPENAI_ESCALATION_MODEL?.trim() || researchModel,
      changeDetectModel: env.OPENAI_CHANGE_DETECT_MODEL?.trim() || researchModel,
      resolverSearchContext: searchContext(env.RESEARCH_RESOLVER_SEARCH_CONTEXT),
      promptVariant: env.RESEARCH_PROMPT_VARIANT?.trim().toUpperCase() === 'B' ? 'B' : 'A',
      omitSheetPrior: env.RESEARCH_OMIT_SHEET_PRIOR?.trim() === '1',
    },
    catalyst: {
      sourcePollSeconds: positiveNumber(
        env.CATALYST_SOURCE_POLL_SECONDS,
        DEFAULT_SOURCE_POLL_SECONDS,
      ),
      webDiscoveryUnresolvedMinutes: positiveNumber(
        env.CATALYST_WEB_DISCOVERY_UNRESOLVED_MINUTES,
        DEFAULT_WEB_DISCOVERY_UNRESOLVED_MINUTES,
      ),
      webDiscoveryResolvedMinutes: positiveNumber(
        env.CATALYST_WEB_DISCOVERY_RESOLVED_MINUTES,
        DEFAULT_WEB_DISCOVERY_RESOLVED_MINUTES,
      ),
      activeFreshnessHours: positiveNumber(
        env.CATALYST_ACTIVE_FRESHNESS_HOURS,
        DEFAULT_CATALYST_WINDOWS.activeFreshnessHours,
      ),
      contextLookbackDays: positiveNumber(
        env.CATALYST_CONTEXT_LOOKBACK_DAYS,
        DEFAULT_CATALYST_WINDOWS.contextLookbackDays,
      ),
    },
    cycleHistory: {
      tradingDays: positiveNumber(
        env.CYCLE_HISTORY_TRADING_DAYS,
        DEFAULT_CYCLE_HISTORY_TRADING_DAYS,
      ),
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

/**
 * Whether an interpretation/discovery model is configured.
 *
 * Reports availability and model names only. The key itself is never returned,
 * logged, or included in a diagnostic.
 */
export function modelAvailability(config: ModelConfig): Availability {
  if (!config.apiKey) {
    return {
      available: false,
      detail: 'OPENAI_API_KEY not set — source collection continues without interpretation',
    };
  }
  return {
    available: true,
    detail: `research=${config.researchModel} discovery=${config.changeDetectModel}`,
  };
}
