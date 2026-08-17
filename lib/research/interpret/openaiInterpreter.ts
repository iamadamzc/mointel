/**
 * OpenAI-backed interpreter.
 *
 * Deliberately has no tools. Phase 3 owns source discovery, and letting the
 * interpreter search would break the property this whole design rests on: that
 * every conclusion traces to a stored, re-readable source. Without it we could
 * not cache, could not reproduce a dossier, and could not tell a collection
 * failure from a reasoning failure.
 *
 * So the request carries `tools: []` explicitly rather than by omission, and a
 * test asserts it.
 */

import type { ModelConfig } from '../config';
import type { ResearchDossier } from '../types';
import type { ResearchEvidenceBundle } from './bundle';
import {
  AUTOMATIC_DOSSIER_SCHEMA,
  AUTOMATIC_DOSSIER_SCHEMA_VERSION,
  INTERPRETER_PROMPT_VERSION,
} from './schema';
import type {
  AdjudicationRequest,
  InterpretResult,
  RepairRequest,
  ResearchInterpreter,
} from './interpreter';

const RESPONSES_URL = 'https://api.openai.com/v1/responses';

export type InterpreterTier = 'DEFAULT' | 'ESCALATION';

export interface OpenAiInterpreterOptions {
  config: ModelConfig;
  tier?: InterpreterTier;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface ResponsesPayload {
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
  };
}

/**
 * System instructions.
 *
 * Versioned via INTERPRETER_PROMPT_VERSION. The rules restated here are also
 * enforced deterministically afterwards; stating them twice is intentional,
 * because a model that follows them produces better output than one that gets
 * corrected, and neither is trusted alone.
 */
export const SYSTEM_PROMPT = `You are the interpretation layer of a momentum trading desk's research system.

You receive an evidence bundle that was collected by a separate deterministic
pipeline: SEC filings and exhibits, company and newswire sources, and market
state computed from the exchange feed. You reason ONLY from that bundle. You
have no browsing ability and must never assert a fact the bundle does not
support.

Every material conclusion must cite the numeric source ids supplied in the
bundle. A claim with no source id will be rejected.

Distinctions that matter and are checked in software afterwards:

- Shares outstanding is NOT float. Market capitalisation is NOT float. If no
  source states a float, leave displayedFloat null and floatConfidence UNKNOWN.
- A dollar shelf is capacity, NOT a share count. Do not convert one into shares
  without pricing or conversion terms in the evidence.
- An effective registration (EFFECT) means securities MAY be sold. It is not
  evidence that any were sold.
- Registered resale is the legal ability to sell, not confirmed selling.
- Warrants are not automatically live supply; consider exercise price,
  registration and eligibility.
- CLEAN requires affirmative evidence that the structure was reconciled. The
  absence of a detected warning is NOT evidence of CLEAN. Prefer UNKNOWN.
- currentCycleHigh is the high of the CURRENT momentum cycle. A 52-week high, an
  old run high or historical resistance must never be placed there merely
  because it is the highest number available. If no current-cycle boundary is
  established, set currentCycleHigh null and currentGivebackPct null.
- Do not infer that overhang was absorbed. High turnover proves nothing about
  absorption.
- FLOW_DOMINANT requires BOTH that no sufficient fresh company catalyst was
  located AND strong objective live-demand evidence. Finding no news is not
  evidence of flow. If coverage is incomplete, prefer UNKNOWN.
- Only state "NO FRESH CATALYST FOUND" when coverage was adequate and the
  evidence supports that conclusion. If coverage is incomplete, say so instead.
- Unknown is never zero. Leave unknown values null.

If the bundle includes HUMAN_REVIEWED_PRIOR_ANALYSIS, treat it as a prior
opinion to compare against, NOT as evidence. Do not adopt its conclusions
without support in the collected sources.

Never produce buy or sell instructions, price targets, or trading advice.
Describe what the evidence shows and what remains unknown.`;

function buildInput(bundle: ResearchEvidenceBundle): string {
  return [
    `Interpret the evidence for ${bundle.ticker}.`,
    '',
    'EVIDENCE BUNDLE (JSON):',
    JSON.stringify(bundle),
    '',
    bundle.coverage.incomplete
      ? `NOTE: source coverage is INCOMPLETE. Gaps: ${bundle.coverage.gaps.join('; ')}. Prefer UNKNOWN over confident conclusions in the affected areas.`
      : 'Source coverage has no recorded gaps.',
  ].join('\n');
}

function buildRepairInput(request: RepairRequest): string {
  return [
    `Your previous output for ${request.bundle.ticker} failed deterministic validation.`,
    '',
    'VALIDATION ERRORS:',
    request.errors,
    '',
    'YOUR PREVIOUS OUTPUT (JSON):',
    JSON.stringify(request.previous),
    '',
    'EVIDENCE BUNDLE (JSON):',
    JSON.stringify(request.bundle),
    '',
    'Correct only what the errors identify. Where a claim cannot be supported by',
    'the cited evidence, remove it or set the field to its unknown value rather',
    'than restating it differently.',
  ].join('\n');
}

/**
 * Instruction for a disputed field.
 *
 * The human conclusion is stated and labelled, then explicitly denied the
 * status of evidence. The task is to re-decide from the sources, which is the
 * only thing a second read can legitimately add — a model asked to choose
 * between two opinions would just be voting.
 */
function buildAdjudicationInput(request: AdjudicationRequest): string {
  return [
    `A conclusion about ${request.bundle.ticker} is disputed: ${request.field}.`,
    '',
    `HUMAN_REVIEWED_PRIOR_ANALYSIS says: ${request.humanConclusion}`,
    `Automatic analysis said: ${request.automaticConclusion}`,
    '',
    'The human conclusion is a PRIOR OPINION, not a source fact. Do not adopt it',
    'because a person wrote it, and do not reject it because a model disagreed.',
    'Decide the disputed field yourself from the evidence bundle below, and cite',
    'the source ids that support whatever you conclude.',
    '',
    'PREVIOUS AUTOMATIC OUTPUT (JSON):',
    JSON.stringify(request.terra),
    '',
    'DETERMINISTIC VALIDATION OF THAT OUTPUT:',
    request.validation || 'no violations recorded',
    '',
    'EVIDENCE BUNDLE (JSON):',
    JSON.stringify(request.bundle),
    '',
    'Return a complete dossier. Where the evidence does not settle the dispute,',
    'say so through the unknown values and a lower confidence rather than',
    'picking a side.',
  ].join('\n');
}

export class OpenAiInterpreter implements ResearchInterpreter {
  readonly name: string;
  readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: OpenAiInterpreterOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.model =
      options.tier === 'ESCALATION'
        ? options.config.escalationModel
        : options.config.researchModel;
    this.name = options.tier === 'ESCALATION' ? 'openai-escalation' : 'openai-research';
  }

  get available(): boolean {
    return this.options.config.apiKey !== null;
  }

  async interpret(bundle: ResearchEvidenceBundle): Promise<InterpretResult> {
    return this.call(buildInput(bundle));
  }

  async repair(request: RepairRequest): Promise<InterpretResult> {
    return this.call(buildRepairInput(request));
  }

  async adjudicate(request: AdjudicationRequest): Promise<InterpretResult> {
    return this.call(buildAdjudicationInput(request));
  }

  private async call(input: string): Promise<InterpretResult> {
    const startedAt = Date.now();
    const empty = { inputTokens: null, outputTokens: null, cachedInputTokens: null };

    if (!this.available) {
      return {
        dossier: null,
        model: this.model,
        usage: empty,
        durationMs: 0,
        error: 'OPENAI_API_KEY not set',
      };
    }

    const body = {
      model: this.model,
      instructions: SYSTEM_PROMPT,
      input,
      // Explicitly empty. Interpretation must not reach past the evidence
      // store; source discovery belongs to Phase 3.
      tools: [],
      text: {
        format: {
          type: 'json_schema',
          name: `automatic_dossier_v${AUTOMATIC_DOSSIER_SCHEMA_VERSION}`,
          strict: true,
          schema: AUTOMATIC_DOSSIER_SCHEMA,
        },
      },
      store: false,
      metadata: {
        prompt_version: String(INTERPRETER_PROMPT_VERSION),
        schema_version: String(AUTOMATIC_DOSSIER_SCHEMA_VERSION),
      },
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
        // Status only: the body can echo the prompt, which carries evidence.
        return {
          dossier: null,
          model: this.model,
          usage: empty,
          durationMs: Date.now() - startedAt,
          error: `HTTP ${response.status}`,
        };
      }
      payload = (await response.json()) as ResponsesPayload;
    } catch (error) {
      return {
        dossier: null,
        model: this.model,
        usage: empty,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.name : 'request failed',
      };
    }

    const usage = {
      inputTokens: payload.usage?.input_tokens ?? null,
      outputTokens: payload.usage?.output_tokens ?? null,
      cachedInputTokens: payload.usage?.input_tokens_details?.cached_tokens ?? null,
    };

    const text = payload.output
      ?.filter((item) => item.type === 'message')
      .flatMap((item) => item.content ?? [])
      .map((part) => part.text ?? '')
      .join('');

    if (!text) {
      return {
        dossier: null,
        model: this.model,
        usage,
        durationMs: Date.now() - startedAt,
        error: 'no content returned',
      };
    }

    try {
      return {
        dossier: JSON.parse(text) as ResearchDossier,
        model: this.model,
        usage,
        durationMs: Date.now() - startedAt,
        error: null,
      };
    } catch {
      return {
        dossier: null,
        model: this.model,
        usage,
        durationMs: Date.now() - startedAt,
        error: 'unparseable JSON',
      };
    }
  }
}
