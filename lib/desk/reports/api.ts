/**
 * `GET /api/reports`: the payload the report panel polls (`useSessionReports`).
 *
 * READ-ONLY, and it never runs a model: reports are written and checked in a
 * worker after each checkpoint and STORED (`session_reports`, Ops's table);
 * this only reads what was stored. The web tier holds no model key.
 *
 * NO TABLE = NO FEATURE. While `session_reports` does not exist, the builder
 * returns null and the route answers 404, which the hook reads as "not built"
 * so the panel does not mount. A missing table must never render as a missed
 * report (`useSessionReports`: two different facts).
 *
 * THE SLOTS COME FROM THE STORE, NOT A CALENDAR. The latest 22:00 recap at or
 * before now names the session it prepares (`target_trading_date`), which is
 * exactly the desk's rolled trading date. From it: last night's after-hours
 * and evening slots, and today's into-RTH, into-power-hour, after-hours and
 * evening. The 22:00 report is the evening report's 10 pm edition, in the
 * evening slot.
 */

import { etWallClockToUtc } from '../../market/session';
import { withoutCitations } from '../../research/citations';
import type { MissedCause, ReportKind, ReportRange, ReportSlot, SessionReport, SessionReportsPayload } from './contract';
import { reportKey } from './contract';

/** How long past its due time a slot waits for its report before it reads MISSED. */
export const REPORT_GRACE_MS = 30 * 60_000;

export interface StoredReportRow {
  kind: string;
  range_key: string;
  trading_date: string;
  status: string;
  payload: string | null;
  missed_cause: string | null;
}

export interface RecapRef {
  tradingDate: string;
  targetTradingDate: string | null;
  scheduledFor: string;
}

const KINDS: readonly ReportKind[] = ['PREMARKET', 'INTO_RTH', 'INTO_POWER_HOUR', 'AFTER_HOURS', 'EVENING'];

function slot(kind: ReportKind, rangeId: string, tradingDate: string, target: string | null, due: Date): ReportSlot {
  return {
    kind,
    rangeId,
    tradingDate,
    targetTradingDate: target,
    scheduledFor: due.toISOString(),
    relevantUntil: new Date(due.getTime() + REPORT_GRACE_MS).toISOString(),
  };
}

/** The slots for the session the latest recap prepares, per range. Empty without a recap. */
export function reportSlots(recap: RecapRef | null, ranges: readonly ReportRange[]): ReportSlot[] {
  if (!recap || !recap.targetTradingDate) return [];
  const last = recap.tradingDate;
  const today = recap.targetTradingDate;
  const out: ReportSlot[] = [];
  for (const range of ranges) {
    out.push(slot('AFTER_HOURS', range.id, last, null, etWallClockToUtc(last, 16, 0)));
    // EVENING, like every slot, is due at its checkpoint (20:05); it is written from 20:20 and serves by 20:30.
    // Its 10 pm edition is the PREMARKET row, which has no slot of its own (buildReportsPayload).
    out.push(slot('EVENING', range.id, last, null, etWallClockToUtc(last, 20, 5)));
    out.push(slot('INTO_RTH', range.id, today, null, etWallClockToUtc(today, 9, 25)));
    out.push(slot('INTO_POWER_HOUR', range.id, today, null, etWallClockToUtc(today, 14, 30)));
    out.push(slot('AFTER_HOURS', range.id, today, null, etWallClockToUtc(today, 16, 0)));
    out.push(slot('EVENING', range.id, today, null, etWallClockToUtc(today, 20, 5)));
  }
  return out;
}

function parse<T>(text: string | null): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * The payload, from the latest recap and the stored rows for its two dates.
 * A PUBLISHED row becomes a report; a MISSED row becomes the cause for its
 * slot. A row for a range or kind no longer configured is left out.
 *
 * A PREMARKET row is the evening report's 10 pm edition (his "same report,
 * just edited with new information"): a PUBLISHED one is filed under the same
 * date's EVENING slot, where the window shows the newest edition and keeps the
 * 8:30 one as superseded; a MISSED one shows nothing, so the 8:30 edition
 * stands (its cause stays in the row). Rows from before EVENING fold the same way.
 */
export function buildReportsPayload(
  recap: RecapRef | null,
  rows: readonly StoredReportRow[],
  ranges: readonly ReportRange[],
  defaultRangeId: string,
): SessionReportsPayload {
  const slots = reportSlots(recap, ranges);
  const wanted = new Set(slots.map((s) => reportKey(s)));
  const reports: SessionReport[] = [];
  const missedCauses: Record<string, MissedCause> = {};
  for (const row of rows) {
    if (!KINDS.includes(row.kind as ReportKind)) continue;
    const edition = row.kind === 'PREMARKET';
    if (edition && row.status !== 'PUBLISHED') continue;
    const kind: ReportKind = edition ? 'EVENING' : (row.kind as ReportKind);
    const key = reportKey({ kind, rangeId: row.range_key, tradingDate: row.trading_date });
    if (!wanted.has(key)) continue;
    if (row.status === 'PUBLISHED') {
      const report = parse<SessionReport>(row.payload);
      if (report) reports.push(edition ? { ...report, kind } : report);
    } else if (row.status === 'MISSED') {
      const cause = parse<MissedCause>(row.missed_cause);
      if (cause) missedCauses[key] = cause;
    }
  }
  return { ranges: [...ranges], defaultRangeId, slots, reports, missedCauses };
}

interface Database {
  prepare(sql: string): { get(...params: unknown[]): unknown; all(...params: unknown[]): unknown[] };
}

/**
 * Stored reports keep the company line they were written with, and a report written before
 * the report side of the citation fix carries the model's lone short tokens ("[1043]") in
 * `company.business`. They are removed here, on read, with the ticker's own research source
 * ids, so rows already stored read clean without being rewritten. Only `company.business` is
 * touched: the writer's checked sentences are left exactly as stored. Returns new objects.
 */
export function withoutStoredCitations(
  reports: readonly SessionReport[],
  idsFor: (ticker: string) => ReadonlySet<number>,
): SessionReport[] {
  return reports.map((report) => ({
    ...report,
    sections: report.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => {
        const business = line.company?.business;
        if (!line.ticker || typeof business !== 'string') return line;
        return { ...line, company: { ...line.company!, business: withoutCitations(business, idsFor(line.ticker)) } };
      }),
    })),
  }));
}

/** Null while the table does not exist: the route then answers 404. */
export function readReportsPayload(
  db: Database,
  now: Date,
  ranges: readonly ReportRange[],
  defaultRangeId: string,
): SessionReportsPayload | null {
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'session_reports'").get();
  if (!table) return null;
  const recapRow = db
    .prepare(
      `SELECT trading_date, target_trading_date, scheduled_for FROM desk_assessments
        WHERE assessment_type = 'NEXT_DAY_RECAP' AND scheduled_for <= ?
        ORDER BY scheduled_for DESC LIMIT 1`,
    )
    .get(now.toISOString()) as { trading_date: string; target_trading_date: string | null; scheduled_for: string } | undefined;
  const recap: RecapRef | null = recapRow
    ? { tradingDate: recapRow.trading_date, targetTradingDate: recapRow.target_trading_date, scheduledFor: recapRow.scheduled_for }
    : null;
  const dates = recap ? [recap.tradingDate, recap.targetTradingDate ?? recap.tradingDate] : [];
  const rows =
    dates.length === 0
      ? []
      : (db
          .prepare(
            `SELECT kind, range_key, trading_date, status, payload, missed_cause FROM session_reports
              WHERE trading_date IN (?, ?)`,
          )
          .all(dates[0], dates[1]) as StoredReportRow[]);
  const payload = buildReportsPayload(recap, rows, ranges, defaultRangeId);
  const sources = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'research_sources'").get();
  if (payload.reports.length === 0) return payload;
  const owned = new Map<string, Set<number>>();
  const idsFor = (ticker: string) => {
    let ids = owned.get(ticker);
    if (!ids && !sources) {
      // No sources table: no owned ids, so only the forms that need none (long ids, comma lists) go.
      ids = new Set<number>();
      owned.set(ticker, ids);
    }
    if (!ids) {
      ids = new Set((db.prepare('SELECT id FROM research_sources WHERE ticker = ?').all(ticker) as Array<{ id: number }>).map((row) => row.id));
      owned.set(ticker, ids);
    }
    return ids;
  };
  return { ...payload, reports: withoutStoredCitations(payload.reports, idsFor) };
}
