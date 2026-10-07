/**
 * The evening report's 10 pm edition: "same report, just edited with new
 * information" (his ruling, verified at his turn, 1b67a4e0,
 * 2026-10-07T02:41:47.719Z). Integration ruled the shape and R2 on
 * `docs/research/session-reports/evening-revision-proposal-2026-10-07.md`.
 *
 * The 22:00 PREMARKET run reads the published 8:30 EVENING edition for the same
 * range and date. A name is UNCHANGED, and keeps its checked 8:30 line VERBATIM
 * (never re-written, never re-checked; a struck line stays struck), only when
 * ALL of these hold:
 * - it had a line in the 8:30 edition;
 * - its research version id is the one that line was written from (Integration's
 *   condition 2, the same rule as the per-line note);
 * - every other input the writer is shown for it is identical: the name's sheet
 *   (`factSheetV6`) with its "since the previous checkpoint" line left out, keyed
 *   on both editions (`lineInputKey`);
 * - its 22:00 change notes, which are relative to the 20:05 checkpoint, are empty.
 * Anything else is CHANGED (Integration's condition 3) and goes to the writer and
 * the checker. The narrative is re-written only when its sheet changed.
 *
 * The "since the previous checkpoint" line is left out of the key because it is
 * relative: at 8:30 it compares with the checkpoint before 20:05, at 22:00 with
 * 20:05, so it differs on nearly every name whatever happened. The fourth
 * condition reads the 22:00 one instead. Measured on the 10-02 snapshot (two
 * nights, 63 names in both captures): rank, price, price time, percent change,
 * session high, reference close and basis, halt state and research status were
 * identical between 20:05 and 22:00 on every name; the version id differed on 6,
 * and the raw 22:00 change summary was non-empty on exactly those 6 (structure,
 * cycle and "new source evidence" notes, none of them a note the writer is
 * shown). Nothing here relies on that: any difference makes the name CHANGED.
 */

import { createHash } from 'node:crypto';

import type { MarketDatabase } from '../../market/store/db';
import type { ReportLine, ReportPath, SessionReport } from './contract';
import type { ReportFact } from './facts';
import type { NarrativeFacts } from './narrative';
import type { ReportResearch } from './research';
import { reportableChangeNotes } from './writer';
import { factSheetV6, narrativeSheet } from './writerV6';

const SINCE_PREVIOUS = 'since the previous checkpoint: ';

function key(parts: unknown): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 16);
}

/** A name's writer inputs, without the relative change line, with its research version id. */
export function lineInputKey(
  fact: ReportFact,
  research: ReportResearch | null,
  path: ReportPath | null,
  researchVersionId: number | null,
): string {
  const sheet = factSheetV6(fact, research, path).filter((line) => !line.startsWith(SINCE_PREVIOUS));
  return key([researchVersionId, sheet]);
}

/** The narrative's writer inputs. */
export function narrativeInputKey(narrative: NarrativeFacts): string {
  return key(narrativeSheet(narrative));
}

/** The published 8:30 edition for this range and date, or null (none, missed, or no table). */
export function readEveningEdition(db: MarketDatabase, rangeId: string, tradingDate: string): SessionReport | null {
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'session_reports'").get();
  if (!table) return null;
  const row = db
    .prepare(
      `SELECT payload FROM session_reports
        WHERE kind = 'EVENING' AND range_key = ? AND trading_date = ? AND status = 'PUBLISHED'`,
    )
    .get(rangeId, tradingDate) as { payload: string | null } | undefined;
  if (!row?.payload) return null;
  try {
    return JSON.parse(row.payload) as SessionReport;
  } catch {
    return null;
  }
}

export interface RevisionPlan {
  /** The 8:30 edition this revises. */
  edition: SessionReport;
  /** Unchanged names: their 8:30 line, carried verbatim. */
  carried: Map<string, ReportLine>;
  /** In 22:00 rank order. */
  changedTickers: string[];
  narrativeChanged: boolean;
}

export function planRevision(
  edition: SessionReport,
  facts: readonly ReportFact[],
  current: ReadonlyMap<string, { researchVersionId: number | null; inputKey: string }>,
  narrativeKey: string,
): RevisionPlan {
  const previous = new Map<string, ReportLine>();
  for (const line of edition.sections.flatMap((section) => section.lines)) {
    if (line.ticker !== null) previous.set(line.ticker, line);
  }
  const carried = new Map<string, ReportLine>();
  const changedTickers: string[] = [];
  for (const fact of facts) {
    const before = previous.get(fact.ticker);
    const now = current.get(fact.ticker);
    const unchanged =
      before !== undefined &&
      now !== undefined &&
      before.inputKey !== undefined &&
      (before.researchVersionId ?? null) === now.researchVersionId &&
      before.inputKey === now.inputKey &&
      reportableChangeNotes(fact.changeSummary).length === 0;
    if (unchanged) carried.set(fact.ticker, before);
    else changedTickers.push(fact.ticker);
  }
  return {
    edition,
    carried,
    changedTickers,
    narrativeChanged: edition.narrativeKey === undefined || edition.narrativeKey !== narrativeKey,
  };
}
