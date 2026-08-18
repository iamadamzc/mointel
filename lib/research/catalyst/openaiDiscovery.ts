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

const RESPONSES_URL = 'https://api.openai.com/v1/responses';

export interface OpenAiDiscoveryOptions {
  config: ModelConfig;
  fetchImpl?: typeof fetch;
  /** Overrides the tier; defaults to the change-detection model. */
  model?: string;
  timeoutMs?: number;
}

interface ResponsesPayload {
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  usage?: { input_tokens?: number; output_tokens?: number };
  status?: string;
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

  constructor(private readonly options: OpenAiDiscoveryOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.model = options.model ?? options.config.changeDetectModel;
  }

  get available(): boolean {
    return this.options.config.apiKey !== null;
  }

  async discover(request: DiscoveryRequest): Promise<DiscoveryResult> {
    if (!this.available) {
      // A missing key disables discovery; it never stops SEC or direct-source
      // collection, which are the layers that do not need a model at all.
      return {
        sources: [],
        ran: false,
        modelCalls: 0,
        detail: 'OPENAI_API_KEY not set — web discovery disabled',
      };
    }

    const body = {
      model: this.model,
      input: buildPrompt(request),
      tools: [{ type: 'web_search' }],
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
        // Status only. The response body can echo request content, and this
        // path is logged.
        return {
          sources: [],
          ran: true,
          modelCalls: 1,
          detail: `discovery failed: HTTP ${response.status}`,
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

  constructor(private readonly options: OpenAiDiscoveryOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.model = options.model ?? options.config.changeDetectModel;
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
      tools: [{ type: 'web_search' }],
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

      // Status only; the body can echo request content and this path is logged.
      if (!response.ok) {
        return { candidates: [], modelCalls: 1, detail: `resolver failed: HTTP ${response.status}` };
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
