/**
 * Report line tags: the BOARD'S OWN Why and Risk outputs, computed on the
 * research AS OF the checkpoint (Integration's order call, 2026-10-02, "one
 * vocabulary": the report says them exactly as the board does today; Design's
 * option B, `docs/Design/report-b-spec.md`).
 *
 * Shared code, never a re-implementation: `resolveIntelligenceState`,
 * `resolveWhy` and `resolveRisk` run unchanged on a row built from checkpoint
 * data. What a checkpoint cannot supply is passed as absent, as established in
 * `docs/research/reports-v6/step1c-board-rules-as-of.md`:
 * - the outside SHEET (`research`, `comparison`) is live, not frozen per
 *   checkpoint, so it is null: a report tag can differ from the board where the
 *   sheet grades a name differently (said in the step-5 sample, Integration);
 * - `displayedFloat` is NULL, always: `resolveRisk` would otherwise print
 *   "{N} float", and a report states float only as a verdict;
 * - time is the CHECKPOINT's, never `Date.now()`: catalyst age and freshness
 *   colour are judged as the checkpoint saw them.
 */

import { resolveIntelligenceState } from '../../dashboard/intelligence';
import { withoutEmDashDeep } from '../../dashboard/prose';
import { withoutCitationsDeep } from '../../research/citations';
import type { DeskRow } from '../../dashboard/merge';
import { resolveRisk, type DeskRisk } from '../../dashboard/risk';
import { resolveWhy, type DeskWhy } from '../../dashboard/why';
import type { ResearchDossier } from '../../research/types';
import type { AutoIntelligence } from '../../research/view';

export interface ReportTags {
  why: DeskWhy;
  risk: DeskRisk;
}

export interface ReportTagInput {
  /** The research status the checkpoint froze (`desk_assessment_tickers.intelligence_status`). */
  status: string | null;
  /** The accepted dossier the checkpoint named (`analysis_version_id`), or null. */
  dossier: ResearchDossier | null;
  /** That version's coverage flag (`metadata.coverageIncomplete`). */
  coverageIncomplete: boolean;
  /** The checkpoint's completion time: the "now" the tags are judged at. */
  at: string;
  /** `catalystFreshFromUtc(db, tradingDate)` for the report's trading date. */
  catalystFreshFrom: string | null;
}

export function reportTags(input: ReportTagInput): ReportTags {
  /*
   * Cleaned EXACTLY as the board cleans it (`readableIntelligence`, merge.ts):
   * citation tokens out, then em dashes, BEFORE why.ts and risk.ts read it.
   * Integration's catch, 2026-10-03: fed the raw dossier, nearly every tag
   * headline and risk detail in the step-5 samples carried "[30265,30266]"-style
   * tokens and U+2014 (CAMP's catalyst summary was the first seen). Cleaned at the
   * INPUT, never the output, because why.ts prints a lone em-dash glyph for an
   * empty grade, his named exception, which an output-side clean would erase.
   */
  const dossier = input.dossier ? withoutEmDashDeep(withoutCitationsDeep(input.dossier)) : null;
  const intelligence = {
    status: input.status,
    coverageIncomplete: input.coverageIncomplete,
    analysis: dossier ? { dossier } : null,
  } as unknown as AutoIntelligence;
  const intelligenceState = resolveIntelligenceState({ sheet: null, intelligence, comparison: null });
  const row = {
    intelligenceState,
    intelligence,
    research: null,
    comparison: null,
    displayedFloat: null,
    catalystFreshFrom: input.catalystFreshFrom,
  } as unknown as DeskRow;
  return { why: resolveWhy(row, Date.parse(input.at)), risk: resolveRisk(row) };
}
