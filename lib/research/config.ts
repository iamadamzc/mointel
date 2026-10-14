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
  /**
   * The same, for general discovery -- which is the larger bill by far.
   *
   * Measured over 2026-08-19..21: discovery spent 7,862,324 input tokens
   * against the resolver's 3,853,202. Together they are 84% of all input spend
   * and interpretation is 14%, so the desk pays mostly to FIND evidence rather
   * than to read it. The dial existed and reached only the cheaper of the two.
   *
   * Separate from `resolverSearchContext` rather than one shared value, because
   * the two stages have opposite tolerances. The resolver names a URL the
   * application then fetches and classifies itself, so a thin read costs it
   * little. Discovery's returned metadata IS the evidence -- nothing re-reads
   * the page, and `excerpt` is stored null by design -- so a thin read there
   * degrades what the interpreter later sees. One value would have forced the
   * cheap answer on the stage that can least afford it.
   *
   * Defaults to the provider default: unset, this changes nothing.
   */
  discoverySearchContext: 'low' | 'medium' | 'high' | null;
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

/**
 * The session reports' two model calls (`docs/research/session-reports/design.md` §4).
 *
 * THE PAIR IS SPLIT ON PURPOSE. The writer arranges prose over a fact sheet,
 * which the cheap tier does well, so it falls back to the change-detect tier.
 * The checker decides what ships to a stranger -- a checker that rubber-stamps
 * turns an unverified report into a verified-looking one -- so it falls back
 * to the interpreter's tier. Both fall back further to the research model, as
 * every tier here does.
 */
export interface ReportModelConfig {
  apiKey: string | null;
  writerModel: string;
  checkerModel: string;
  /**
   * The report checker on Claude, with the OpenAI checker above as its fallback (his "move it", Integration chat
   * 1f30f0a2, user uuid e51e9b47, 2026-10-13T10:12:11.529Z; sizing 16a7f9e1). The key is read ONLY from
   * `ANTHROPIC_API_KEY_REPORTS`, the Reports-TMI key (Integration's ruling); the old unsuffixed name is never read
   * (`tests/security.test.ts`). Null when that key is absent: the OpenAI checker then runs alone, exactly as before, and
   * no other key is tried.
   */
  claudeChecker: { apiKey: string; model: string } | null;
}

/** The Claude checker's model unless `REPORT_CHECKER_CLAUDE_MODEL` names another (sizing 16a7f9e1: Opus 5.5, high effort). */
export const DEFAULT_CLAUDE_CHECKER_MODEL = 'claude-opus-5-5';

export function readReportModelConfig(env: NodeJS.ProcessEnv = process.env): ReportModelConfig {
  const apiKey = env.OPENAI_API_KEY?.trim();
  const researchModel = env.OPENAI_RESEARCH_MODEL?.trim() || DEFAULT_RESEARCH_MODEL;
  const cheap = env.OPENAI_CHANGE_DETECT_MODEL?.trim() || researchModel;
  const claudeKey = env.ANTHROPIC_API_KEY_REPORTS?.trim();
  return {
    apiKey: apiKey ? apiKey : null,
    writerModel: env.OPENAI_REPORT_WRITER_MODEL?.trim() || cheap,
    checkerModel: env.OPENAI_REPORT_CHECKER_MODEL?.trim() || researchModel,
    claudeChecker: claudeKey ? { apiKey: claudeKey, model: env.REPORT_CHECKER_CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_CHECKER_MODEL } : null,
  };
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
      discoverySearchContext: searchContext(env.RESEARCH_DISCOVERY_SEARCH_CONTEXT),
      promptVariant: env.RESEARCH_PROMPT_VARIANT?.trim().toUpperCase() === 'B' ? 'B' : 'A',
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
      detail: 'SEC_USER_AGENT is not set: SEC fetching disabled',
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
      detail: 'OPENAI_API_KEY not set: source collection continues without interpretation',
    };
  }
  return {
    available: true,
    detail: `research=${config.researchModel} discovery=${config.changeDetectModel}`,
  };
}
