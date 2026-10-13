/**
 * The models a v5 report runs on, built one way for the runner (Ops's assess
 * worker) and for any harness, so a production run and a measured run cannot
 * differ in format or version.
 *
 * WORKER-SIDE ONLY: this holds the model key (`tests/security.test.ts`). The
 * web tier reads stored reports and never imports this.
 *
 * THE v5 REPLY SCHEMA IS ITS OWN. The provider enforces a strict schema, and
 * v4's requires `headline` and has no `overall`: a v5 prompt sent through it
 * would be forced to write a headline and could never return the premarket
 * overall sentence. Found before the first v5 model call.
 */

import { REPORT_CHECKER_PROMPT_VERSION_V5, REPORT_CHECKER_PROMPT_VERSION_V6, VERDICT_SCHEMA } from './check';
import { AnthropicReportModel } from './anthropicReportModel';
import { OpenAiReportModel, type ReportModelUsage } from './openaiReportModel';
import { REPORT_WRITER_PROMPT_VERSION_V5 } from './writerV5';
import { REPORT_WRITER_PROMPT_VERSION_V6 } from './writerV6';

export const DRAFT_SCHEMA_V5 = {
  type: 'object',
  additionalProperties: false,
  required: ['overall', 'sections'],
  properties: {
    overall: { type: ['string', 'null'] },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['heading', 'lines'],
        properties: {
          heading: { type: 'string' },
          lines: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['ticker', 'text'],
              properties: {
                ticker: { type: ['string', 'null'] },
                text: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
} as const;

export interface ReportModelConfigV5 {
  apiKey: string | null;
  writerModel: string;
  checkerModel: string;
  /** Tests only. */
  fetchImpl?: typeof fetch;
}

/** The writer and checker for one v5 report, each with its own reply schema and prompt version. */
export function createReportModelsV5(
  config: ReportModelConfigV5,
  onUsage?: (usage: ReportModelUsage) => void,
): { writer: OpenAiReportModel; checker: OpenAiReportModel } {
  return {
    writer: new OpenAiReportModel({
      apiKey: config.apiKey,
      model: config.writerModel,
      timeoutMs: 120_000,
      fetchImpl: config.fetchImpl,
      format: { name: 'report_draft_v5', schema: DRAFT_SCHEMA_V5, promptVersion: REPORT_WRITER_PROMPT_VERSION_V5 },
      onUsage,
    }),
    checker: new OpenAiReportModel({
      apiKey: config.apiKey,
      model: config.checkerModel,
      timeoutMs: 180_000,
      fetchImpl: config.fetchImpl,
      format: { name: 'report_verdicts', schema: VERDICT_SCHEMA, promptVersion: REPORT_CHECKER_PROMPT_VERSION_V5 },
      onUsage,
    }),
  };
}

/**
 * v6's reply: the opening narrative plus one line per name, no headings (the
 * headings are computed after the strikes, `sections.ts`). Its own schema for
 * the same reason as v5's: a v6 prompt through the v5 schema would be forced
 * to return sections and could never return the narrative.
 */
export const DRAFT_SCHEMA_V6 = {
  type: 'object',
  additionalProperties: false,
  required: ['narrative', 'lines'],
  properties: {
    narrative: { type: ['string', 'null'] },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['ticker', 'text'],
        properties: {
          ticker: { type: ['string', 'null'] },
          text: { type: 'string' },
        },
      },
    },
  },
} as const;

/** How long a Claude check may take before the pipeline checks the report on OpenAI instead. */
export const CLAUDE_CHECKER_TIMEOUT_MS = 300_000;

export interface ReportModelsV6 {
  writer: OpenAiReportModel;
  /** The checker that runs first: Claude when the Reports key is set, else OpenAI as before. */
  checker: OpenAiReportModel | AnthropicReportModel;
  /** Present only with the Claude checker: the OpenAI checker that checks the report when the Claude check fails. */
  checkerFallback?: OpenAiReportModel;
  /** For the record (`ReportDiagnostics.checker`, the stored versions): the model names of the two checkers. */
  checkerNames: { primary: string; fallback: string | null };
}

/**
 * The writer and checker for one v6 report: the v6 reply schema, writer prompt v6, checker prompt v6. With
 * `claudeChecker` (the Reports-TMI key, `readReportModelConfig`), the checker is Claude and the OpenAI checker is its
 * fallback on ANY failure (his "move it", uuid e51e9b47; sizing 16a7f9e1). Without it, nothing changes.
 */
export function createReportModelsV6(
  config: ReportModelConfigV5 & { claudeChecker?: { apiKey: string; model: string } | null },
  onUsage?: (usage: ReportModelUsage) => void,
): ReportModelsV6 {
  const writer = new OpenAiReportModel({
    apiKey: config.apiKey,
    model: config.writerModel,
    timeoutMs: 120_000,
    fetchImpl: config.fetchImpl,
    format: { name: 'report_draft_v6', schema: DRAFT_SCHEMA_V6, promptVersion: REPORT_WRITER_PROMPT_VERSION_V6 },
    onUsage,
  });
  const openAiChecker = new OpenAiReportModel({
    apiKey: config.apiKey,
    model: config.checkerModel,
    timeoutMs: 180_000,
    fetchImpl: config.fetchImpl,
    format: { name: 'report_verdicts', schema: VERDICT_SCHEMA, promptVersion: REPORT_CHECKER_PROMPT_VERSION_V6 },
    onUsage,
  });
  if (!config.claudeChecker) return { writer, checker: openAiChecker, checkerNames: { primary: config.checkerModel, fallback: null } };
  return {
    writer,
    checker: new AnthropicReportModel({
      apiKey: config.claudeChecker.apiKey,
      model: config.claudeChecker.model,
      schema: VERDICT_SCHEMA,
      timeoutMs: CLAUDE_CHECKER_TIMEOUT_MS,
      fetchImpl: config.fetchImpl,
      onUsage,
    }),
    checkerFallback: openAiChecker,
    checkerNames: { primary: config.claudeChecker.model, fallback: config.checkerModel },
  };
}
