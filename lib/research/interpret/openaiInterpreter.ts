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
import { describeFailure, readProviderFailure } from '../providerError';
import type { ResearchDossier } from '../types';
import type { ResearchEvidenceBundle } from './bundle';
import { catalystGradePromptBlock } from './catalystGrades';
import { evidenceRiskPromptBlock } from './evidenceRisk';
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
  /**
   * The tier that ACTUALLY served the request, per OpenAI's reference.
   *
   * The desk sends no `service_tier`, has no SDK client and no wrapper, so the
   * documented chain is `auto` -> project setting -> `default`. THAT IS AN
   * INFERENCE FROM AN ABSENCE, and pricing is a factor of four across the
   * tiers: Batch and Flex are half, Fast is double.
   *
   * The response says which. Reading it turns the inference into a measurement
   * for the cost of one field, and nothing on the console is visible from here.
   */
  service_tier?: string;
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
export const SYSTEM_PROMPT_A = `You are the interpretation layer of a momentum trading desk's research system.

You receive an evidence bundle that was collected by a separate deterministic
pipeline: SEC filings and exhibits, company and newswire sources, and market
state computed from the exchange feed. You reason ONLY from that bundle. You
have no browsing ability and must never assert a fact the bundle does not
support.

Every material conclusion must cite the numeric source ids supplied in the
bundle, in evidenceSourceIds. A claim with no source id will be rejected.
Never refer to a source by its id in prose (not "Source 28817", not
"(Source 28817)"). Name each source by the form or title the bundle gives it;
never name a form the bundle does not state, and where it gives none, say a
filing or a news item. For example: an 8-K, a press release.

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
- businessDescription says what the company does, in one plain sentence a
  trader can read at a glance. Ground it in sicDescription and the filings in
  the bundle. Do not add products, customers, partners or markets the bundle
  does not name. If the bundle does not establish it, leave it null.
${evidenceRiskPromptBlock()}
- Never write the em dash character (Unicode U+2014) in any text field. Use a
  comma, a colon, a full stop or parentheses instead, never a spaced hyphen.

${catalystGradePromptBlock()}

If the bundle includes PRIOR_MODEL_ANALYSIS, treat it as a prior opinion to
compare against, NOT as evidence. Do not adopt its conclusions without support
in the collected sources.

Never produce buy or sell instructions, price targets, or trading advice.
Describe what the evidence shows and what remains unknown.`;

/**
 * Variant B: the same instructions, with a positive criterion for CLEAN and a
 * definition for CAUTION.
 *
 * Variant A says only when NOT to reach CLEAN and which way to fall, and never
 * says what would justify it -- while CLEAN_REQUIRES_RECONCILIATION holds a
 * precise, satisfiable test the model is never shown. Across 94 dossiers CLEAN
 * was chosen zero times and that guardrail never fired once: CLEAN was not
 * proposed and downgraded, it was never proposed. CAUTION, the only verdict
 * guarded by nothing, took 64%.
 *
 * Built by substitution rather than as a second literal so the two variants
 * cannot drift anywhere except the passage under test. The substring is
 * asserted at module load: a later edit to A that silently stopped producing B
 * would otherwise leave the experiment comparing A with A.
 *
 * UNDER TEST, NOT ADOPTED. RESEARCH_PROMPT_VARIANT selects it, the default is A,
 * and deploying this changes nothing until someone asks for B.
 */
const CLEAN_RULE_A = `- CLEAN requires affirmative evidence that the structure was reconciled. The
  absence of a detected warning is NOT evidence of CLEAN. Prefer UNKNOWN.`;

const CLEAN_RULE_B = `- CLEAN requires affirmative evidence that the structure was reconciled, which
  means ALL of: coverage has no recorded gaps; registration evidence was
  located; a reported share count is present; you cite at least one source; and
  you have marked no supply block KNOWN_ACTIVE beyond a negligible amount. The
  absence of a detected warning is NOT evidence of CLEAN - but where every one
  of those holds, CLEAN is the correct answer and UNKNOWN is not.
- CAUTION means supply was identified and could not be quantified or dated. It
  is not a way to avoid deciding. Where nothing was identified at all, say
  UNKNOWN. Where the CLEAN conditions above all hold, say CLEAN.`;

if (!SYSTEM_PROMPT_A.includes(CLEAN_RULE_A)) {
  throw new Error('SYSTEM_PROMPT_A no longer contains the CLEAN rule variant B substitutes');
}

export const SYSTEM_PROMPT_B = SYSTEM_PROMPT_A.replace(CLEAN_RULE_A, CLEAN_RULE_B);

export type PromptVariant = 'A' | 'B';

export function systemPromptFor(variant: PromptVariant): string {
  return variant === 'B' ? SYSTEM_PROMPT_B : SYSTEM_PROMPT_A;
}

/** The default variant, under its original name, for existing callers. */
export const SYSTEM_PROMPT = SYSTEM_PROMPT_A;

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
 * The prior conclusion is stated and labelled, then explicitly denied the
 * status of evidence. The task is to re-decide from the sources, which is the
 * only thing a second read can legitimately add — a model asked to choose
 * between two opinions would just be voting.
 */
function buildAdjudicationInput(request: AdjudicationRequest): string {
  return [
    `A conclusion about ${request.bundle.ticker} is disputed: ${request.field}.`,
    '',
    `PRIOR_MODEL_ANALYSIS says: ${request.priorConclusion}`,
    `Automatic analysis said: ${request.automaticConclusion}`,
    '',
    'The prior conclusion is a PRIOR OPINION, not a source fact. Do not adopt',
    'it because it was asserted, and do not reject it because it disagrees with',
    'the automatic analysis. Both sides are model output.',
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
  private readonly systemPrompt: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: OpenAiInterpreterOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.model =
      options.tier === 'ESCALATION'
        ? options.config.escalationModel
        : options.config.researchModel;
    this.name = options.tier === 'ESCALATION' ? 'openai-escalation' : 'openai-research';
    this.systemPrompt = systemPromptFor(options.config.promptVariant ?? 'A');
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
        serviceTier: null,
        durationMs: 0,
        error: 'OPENAI_API_KEY not set',
      };
    }

    const body = {
      model: this.model,
      instructions: this.systemPrompt,
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
        // Code and type only. The message can echo the prompt, which carries
        // evidence; the code cannot, and without it an exhausted balance is
        // indistinguishable from a rate limit.
        const failure = await readProviderFailure(response);
        return {
          dossier: null,
          model: this.model,
          usage: empty,
        serviceTier: null,
          durationMs: Date.now() - startedAt,
          error: describeFailure(failure),
        };
      }
      payload = (await response.json()) as ResponsesPayload;
    } catch (error) {
      return {
        dossier: null,
        model: this.model,
        usage: empty,
        serviceTier: null,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.name : 'request failed',
      };
    }

    /*
     * `UNREPORTED` RATHER THAN `null`, AND THE DISTINCTION IS THE WHOLE POINT.
     *
     * `null` means NOTHING WAS SERVED — no response to read a tier from.
     * `UNREPORTED` means a response CAME BACK AND DID NOT SAY.
     *
     * Collapsing them would make this the second instance of the defect it was
     * built to observe: tonight's entire cost problem is one status meaning
     * both "spent nothing" and "spent and fell short".
     */
    const serviceTier = payload.service_tier ?? 'UNREPORTED';

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
        serviceTier,
        error: 'no content returned',
      };
    }

    try {
      return {
        dossier: JSON.parse(text) as ResearchDossier,
        model: this.model,
        usage,
        durationMs: Date.now() - startedAt,
        serviceTier,
        error: null,
      };
    } catch {
      return {
        dossier: null,
        model: this.model,
        usage,
        durationMs: Date.now() - startedAt,
        serviceTier,
        error: 'unparseable JSON',
      };
    }
  }
}
