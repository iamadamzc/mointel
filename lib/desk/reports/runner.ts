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

/** The writer and checker for one v6 report: the v6 reply schema, writer prompt v6, checker prompt v4. */
export function createReportModelsV6(
  config: ReportModelConfigV5,
  onUsage?: (usage: ReportModelUsage) => void,
): { writer: OpenAiReportModel; checker: OpenAiReportModel } {
  return {
    writer: new OpenAiReportModel({
      apiKey: config.apiKey,
      model: config.writerModel,
      timeoutMs: 120_000,
      fetchImpl: config.fetchImpl,
      format: { name: 'report_draft_v6', schema: DRAFT_SCHEMA_V6, promptVersion: REPORT_WRITER_PROMPT_VERSION_V6 },
      onUsage,
    }),
    checker: new OpenAiReportModel({
      apiKey: config.apiKey,
      model: config.checkerModel,
      timeoutMs: 180_000,
      fetchImpl: config.fetchImpl,
      format: { name: 'report_verdicts', schema: VERDICT_SCHEMA, promptVersion: REPORT_CHECKER_PROMPT_VERSION_V6 },
      onUsage,
    }),
  };
}
