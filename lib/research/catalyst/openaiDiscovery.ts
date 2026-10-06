/**
 * OpenAI-backed source locator.
 *
 * Uses the Responses API with the built-in web search tool and a strict schema.
 * The model is a search front-end: it finds where something was published and
 * returns metadata. It is never asked to grade, rank or explain a catalyst.
 *
 * Deliberately runs on the change-detection tier rather than the full research
 * model. Locating a URL does not need the expensive model, and Phase 3 has no
 * interpretation for the expensive model to do.
 */

import type { ModelConfig } from '../config';
import {
  DISCOVERY_SCHEMA,
  validateDiscovered,
  type CatalystSourceDiscoveryProvider,
  type DiscoveryRequest,
  type DiscoveryResult,
} from './discovery';
import {
  buildResolverPrompt,
  COMPANY_SOURCE_SCHEMA,
  type CompanySourceCandidate,
  type CompanySourceRequest,
  type CompanySourceResolution,
  type CompanySourceResolverProvider,
} from './companySourceContract';
import { describeFailure, readProviderFailure } from '../providerError';
import { blockedSearchDomains, DOMAIN_POLICY_VERSION } from './domainPolicy';

const RESPONSES_URL = 'https://api.openai.com/v1/responses';

/**
 * One hosted search per look (his ruling 2026-10-06T23:39:21.703Z, "a"). The Responses API's `max_tool_calls` bounds
 * the built-in tool calls in one response, across all built-in tools; past it, "further attempts to call a tool by the
 * model will be ignored" (OpenAI API reference, Create a model response, read 2026-10-06). Before
 * this, a pass made about three searches (read E, an estimate). Sent on both requests below and recorded in each
 * `toolConfig`, so the ledger tells a capped call from an uncapped one.
 */
export const MAX_TOOL_CALLS = 1;

/**
 * How much retrieved page content the hosted search puts in context.
 *
 * The provider's default is `medium`. It is the dominant cost of both classes
 * below — a resolver prompt is 254 tokens and a resolver call bills 24,708 —
 * so it is stated explicitly rather than inherited, and recorded against every
 * call it pays for.
 */
export type SearchContextSize = 'low' | 'medium' | 'high';

export interface OpenAiDiscoveryOptions {
  config: ModelConfig;
  fetchImpl?: typeof fetch;
  /** Overrides the tier; defaults to the change-detection model. */
  model?: string;
  timeoutMs?: number;
  /** Defaults to the provider's own default rather than silently choosing. */
  searchContextSize?: SearchContextSize;
}

interface ResponsesPayload {
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
  };
  status?: string;
}

/**
 * Token counts as the provider reported them.
 *
 * Returns null when the response carried none, so an absent count reads as
 * unavailable downstream rather than as zero.
 */
function usageOf(payload: ResponsesPayload, model: string) {
  if (payload.usage?.input_tokens === undefined) return null;
  return {
    model,
    inputTokens: payload.usage.input_tokens ?? null,
    cachedInputTokens: payload.usage.input_tokens_details?.cached_tokens ?? null,
    outputTokens: payload.usage.output_tokens ?? null,
  };
}

function buildPrompt(request: DiscoveryRequest): string {
  const company = request.companyName ? `${request.companyName} (${request.ticker})` : request.ticker;

  // The instruction is scoped to location, and says so twice, because a model
  // asked about a moving stock will otherwise volunteer an opinion about why.
  return [
    `Find publicly published announcements about ${company} dated on or after ${request.since}.`,
    '',
    'You are locating sources, not evaluating them. For each source report only:',
    'what it is titled, its URL, who published it, when it was published, and',
    'whether it appears to be the original publication or a copy.',
    '',
    'Do NOT assess whether the news is significant, positive, negative, or',
    'whether it explains any price movement. Do not speculate about the stock.',
    '',
    'Prefer the company\'s own investor-relations or newsroom pages and the',
    'original newswire release over aggregator copies.',
    '',
    request.knownUrls.length > 0
      ? `Already known, do not return these: ${request.knownUrls.slice(0, 20).join(', ')}`
      : '',
    '',
    'Return an empty list if you find nothing. Never invent a URL.',
  ]
    .filter(Boolean)
    .join('\n');
}

export class OpenAiDiscoveryProvider implements CatalystSourceDiscoveryProvider {
  readonly name = 'openai-web-search';
  private readonly fetchImpl: typeof fetch;
  private readonly model: string;
  private readonly searchContextSize: SearchContextSize | null;

  constructor(private readonly options: OpenAiDiscoveryOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.model = options.model ?? options.config.changeDetectModel;
    this.searchContextSize = options.searchContextSize ?? null;
  }

  get available(): boolean {
    return this.options.config.apiKey !== null;
  }

  /**
   * What this provider was configured to buy, for the token ledger.
   *
   * Read the size rather than the literal 'default'. Hardcoded, this column
   * reported the same string whatever the provider was sent, so the one field
   * that exists to tell two configurations apart could not have distinguished
   * them -- a check that cannot fail is not a check. The resolver's equivalent
   * was already dynamic, which is why the discrepancy went unseen: the ledger
   * looked populated for both stages.
   */
  get toolConfig(): string {
    return `web_search:${this.searchContextSize ?? 'default'};domains:v${DOMAIN_POLICY_VERSION};max_tool_calls:${MAX_TOOL_CALLS}`;
  }

  async discover(request: DiscoveryRequest): Promise<DiscoveryResult> {
    if (!this.available) {
      // A missing key disables discovery; it never stops SEC or direct-source
      // collection, which are the layers that do not need a model at all.
      return {
        sources: [],
        ran: false,
        modelCalls: 0,
        detail: 'OPENAI_API_KEY not set: web discovery disabled',
      };
    }

    const blocked = blockedSearchDomains();
    const body = {
      model: this.model,
      input: buildPrompt(request),
      max_tool_calls: MAX_TOOL_CALLS, // one search per discovery look
      tools: [
        {
          type: 'web_search',
          // Derived from the deterministic rejection rule, never hand-listed.
          // An empty policy sends no filter at all rather than an empty one.
          ...(blocked.length > 0 ? { filters: { blocked_domains: blocked } } : {}),
          // Unset sends no key, leaving the provider's own default, so this
          // is inert until someone chooses a value deliberately.
          ...(this.searchContextSize
            ? { search_context_size: this.searchContextSize }
            : {}),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'catalyst_sources',
          strict: true,
          schema: DISCOVERY_SCHEMA,
        },
      },
      // Nothing about this request needs to be retained by the provider.
      store: false,
    };

    let payload: ResponsesPayload;
    try {
      const response = await this.fetchImpl(RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.config.apiKey as string}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: this.options.timeoutMs
          ? AbortSignal.timeout(this.options.timeoutMs)
          : undefined,
      });

      if (!response.ok) {
        // Code and type only. The message can echo request content; the code
        // is what separates "slow down" from "the account is empty".
        const failure = await readProviderFailure(response);
        return {
          sources: [],
          ran: true,
          modelCalls: 1,
          detail: `discovery failed: ${describeFailure(failure)}`,
        };
      }

      payload = (await response.json()) as ResponsesPayload;
    } catch (error) {
      return {
        sources: [],
        ran: true,
        modelCalls: 1,
        detail: `discovery failed: ${error instanceof Error ? error.name : 'error'}`,
      };
    }

    const text = payload.output
      ?.filter((item) => item.type === 'message')
      .flatMap((item) => item.content ?? [])
      .map((part) => part.text ?? '')
      .join('');

    if (!text) {
      return { sources: [], ran: true, modelCalls: 1, detail: 'discovery returned no content' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        sources: [],
        ran: true,
        modelCalls: 1,
        detail: 'discovery returned unparseable JSON',
      };
    }

    const { accepted, rejected } = validateDiscovered(parsed, new Set(request.knownUrls));

    return {
      sources: accepted,
      usage: usageOf(payload, this.model),
      toolConfig: this.toolConfig,
      ran: true,
      modelCalls: 1,
      detail: `located ${accepted.length} candidate source(s)${
        rejected.length > 0 ? `, rejected ${rejected.length}` : ''
      }`,
    };
  }
}

/**
 * Locates an issuer's durable publishing locations.
 *
 * Shares transport and model tier with discovery and nothing else. The prompt,
 * the schema and the validation are all separate, because "where does this
 * company publish" and "what did this company announce" have different right
 * answers and the same wrong one.
 */
export class OpenAiCompanySourceResolver implements CompanySourceResolverProvider {
  readonly name = 'openai-company-source';
  private readonly fetchImpl: typeof fetch;
  private readonly model: string;
  private readonly searchContextSize: SearchContextSize | null;

  constructor(private readonly options: OpenAiDiscoveryOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.model = options.model ?? options.config.changeDetectModel;
    this.searchContextSize = options.searchContextSize ?? null;
  }

  /** What this provider was configured to buy, for the token ledger. */
  get toolConfig(): string {
    return `web_search:${this.searchContextSize ?? 'default'};domains:v${DOMAIN_POLICY_VERSION};max_tool_calls:${MAX_TOOL_CALLS}`;
  }

  get available(): boolean {
    return this.options.config.apiKey !== null;
  }

  async resolve(request: CompanySourceRequest): Promise<CompanySourceResolution> {
    if (!this.available) {
      return { candidates: [], modelCalls: 0, detail: 'OPENAI_API_KEY not set' };
    }

    const body = {
      model: this.model,
      input: buildResolverPrompt(request),
      max_tool_calls: MAX_TOOL_CALLS, // one search per resolver look
      tools: [
        {
          type: 'web_search',
          ...(this.searchContextSize
            ? { search_context_size: this.searchContextSize }
            : {}),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'company_sources',
          strict: true,
          schema: COMPANY_SOURCE_SCHEMA,
        },
      },
      store: false,
    };

    let payload: ResponsesPayload;
    try {
      const response = await this.fetchImpl(RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.config.apiKey as string}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: this.options.timeoutMs ? AbortSignal.timeout(this.options.timeoutMs) : undefined,
      });

      if (!response.ok) {
        const failure = await readProviderFailure(response);
        return { candidates: [], modelCalls: 1, detail: `resolver failed: ${describeFailure(failure)}` };
      }

      payload = (await response.json()) as ResponsesPayload;
    } catch (error) {
      return {
        candidates: [],
        modelCalls: 1,
        detail: `resolver failed: ${error instanceof Error ? error.name : 'error'}`,
      };
    }

    const text = payload.output
      ?.filter((item) => item.type === 'message')
      .flatMap((item) => item.content ?? [])
      .map((part) => part.text ?? '')
      .join('');

    if (!text) return { candidates: [], modelCalls: 1, detail: 'resolver returned no content' };

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { candidates: [], modelCalls: 1, detail: 'resolver returned unparseable JSON' };
    }

    const candidates = parseCandidates(parsed);
    return {
      candidates,
      usage: usageOf(payload, this.model),
      toolConfig: this.toolConfig,
      modelCalls: 1,
      detail: `offered ${candidates.length} collection point(s)`,
    };
  }
}

const CANDIDATE_KINDS = new Set([
  'FEED',
  'NEWSROOM_INDEX',
  'PRESS_LISTING',
  'IR_ROOT',
  'OFFICIAL_DOMAIN',
]);

/**
 * Shapes the model's reply without judging it.
 *
 * Whether a candidate is really a collection point is settled later against the
 * fetched page; this only discards entries that are not well formed.
 */
function parseCandidates(parsed: unknown): CompanySourceCandidate[] {
  const list = (parsed as { candidates?: unknown })?.candidates;
  if (!Array.isArray(list)) return [];

  const candidates: CompanySourceCandidate[] = [];
  for (const entry of list) {
    const item = entry as Record<string, unknown>;
    const url = typeof item.url === 'string' ? item.url.trim() : '';
    const kind = typeof item.kind === 'string' ? item.kind : '';
    if (url.length === 0 || !CANDIDATE_KINDS.has(kind)) continue;
    try {
      const protocol = new URL(url).protocol;
      if (protocol !== 'https:' && protocol !== 'http:') continue;
    } catch {
      continue;
    }
    candidates.push({
      url,
      kind: kind as CompanySourceCandidate['kind'],
      confidence:
        item.confidence === 'HIGH' || item.confidence === 'LOW'
          ? item.confidence
          : 'MEDIUM',
      rationale: typeof item.rationale === 'string' ? item.rationale : null,
    });
  }
  return candidates;
}
