/**
 * Read 82 (iii), the audit after the word list comes out (Commercial, db4f572d): "a nightly scan of every stored
 * report by a different model for the same two questions, with every hit sent to Integration the next morning, for
 * the first thirty days". The checker is Claude (his "move it", uuid e51e9b47), so the scan is OpenAI. The questions
 * are the checker's own (`ADVICE_ASK`, `FORECAST_ASK`, `NOT_ADVICE_CARVE_OUTS`), in the same words.
 *
 * Integration's design (2026-10-13): published reports since the last scan's window end; one call per report over its
 * published lines; a morning note and a journal line carrying the counts, so a silent night reads differently from a
 * clean one; the dash replacements that chose " to " named for review (Commercial read 94 (3)); and the reports an
 * OpenAI checker decided, which kept the word list (`CheckerVendors`).
 */
import { ADVICE_ASK, FORECAST_ASK, NOT_ADVICE_CARVE_OUTS, type CheckerModel } from './check';
import type { ReportKind, SessionReport } from './contract';
import { replaceDashes, type DashReplacement } from './dashes';
import type { WriterPrompt } from './writer';

export const NIGHT_SCAN_PROMPT_VERSION = 1;

export const NIGHT_SCAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answers'],
  properties: {
    answers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'advice', 'forecast', 'phrase'],
        properties: {
          id: { type: 'string' },
          advice: { type: 'boolean' },
          forecast: { type: 'boolean' },
          phrase: { type: 'string' },
        },
      },
    },
  },
} as const;

export interface ScanLine {
  /** 'H' the headline, 'O' the narrative, 'V' a v5 overall sentence, `S1L2` section 1 line 2. */
  id: string;
  ticker: string | null;
  text: string;
}

/** Every published line with words in it. A struck name line keeps its card with empty text and is not read. */
export function scanLines(report: SessionReport): ScanLine[] {
  const lines: ScanLine[] = [];
  const add = (id: string, ticker: string | null, text: string | null | undefined) => {
    if (text && text.trim() !== '') lines.push({ id, ticker, text });
  };
  add('H', null, report.headline);
  add('O', null, report.narrative);
  add('V', null, report.overall);
  report.sections.forEach((section, s) => section.lines.forEach((line, l) => add(`S${s + 1}L${l + 1}`, line.ticker, line.text)));
  return lines;
}

const NIGHT_SCAN_SYSTEM = [
  'You read lines from a published market report for two things only. For EVERY line given, answer two questions, each true or false:',
  ADVICE_ASK,
  FORECAST_ASK,
  'When either is true, "phrase" quotes the words that make it so; otherwise "phrase" is "".',
  ...NOT_ADVICE_CARVE_OUTS,
  'Judge each line by its own words only. Do not judge whether it is true.',
  'REPLY: JSON only, {"answers": [{"id": string, "advice": boolean, "forecast": boolean, "phrase": string}]}, one answer per id, every id exactly once.',
].join('\n');

export function buildNightScanPrompt(report: { kind: ReportKind; tradingDate: string }, lines: readonly ScanLine[]): WriterPrompt {
  return {
    system: NIGHT_SCAN_SYSTEM,
    user: [`Report: ${report.kind}, ${report.tradingDate}`, '', ...lines.map((line) => `${line.id}: ${line.text}`)].join('\n'),
  };
}

export interface ScanHit {
  id: string;
  ticker: string | null;
  text: string;
  advice: boolean;
  forecast: boolean;
  phrase: string;
}

/** The hits, or why the reply is not an answer for every line (then the report counts as not read). */
export function parseNightScan(raw: string, lines: readonly ScanLine[]): { ok: true; hits: ScanHit[] } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'reply: not JSON' };
  }
  const answers = (parsed as { answers?: unknown })?.answers;
  if (!Array.isArray(answers)) return { ok: false, error: 'reply: no answers' };
  const byId = new Map(lines.map((line) => [line.id, line] as const));
  const seen = new Set<string>();
  const hits: ScanHit[] = [];
  for (const answer of answers as Array<Record<string, unknown>>) {
    const id = answer?.id;
    if (typeof id !== 'string' || !byId.has(id) || seen.has(id)) return { ok: false, error: 'reply: an unknown or repeated id' };
    if (typeof answer.advice !== 'boolean' || typeof answer.forecast !== 'boolean') return { ok: false, error: 'reply: an answer is not true or false' };
    seen.add(id);
    if (answer.advice || answer.forecast) {
      const line = byId.get(id)!;
      hits.push({ id, ticker: line.ticker, text: line.text, advice: answer.advice, forecast: answer.forecast, phrase: typeof answer.phrase === 'string' ? answer.phrase : '' });
    }
  }
  if (seen.size !== lines.length) return { ok: false, error: 'reply: a line has no answer' };
  return { ok: true, hits };
}

/** One stored report as the scan reads it (`session_reports`, PUBLISHED). */
export interface StoredReportRow {
  id: number;
  kind: ReportKind;
  range_key: string;
  trading_date: string;
  published_at: string;
  payload: string;
  diagnostics: string | null;
}

export interface DashReview {
  id: string;
  before: string;
  after: string;
  /** The replacement put " to " between two figures: the case Commercial read 94 (3) asked to see in week one. */
  to: boolean;
}

export interface ScannedReport {
  rowId: number;
  kind: ReportKind;
  rangeKey: string;
  tradingDate: string;
  publishedAt: string;
  status: 'READ' | 'FAILED' | 'NOT_RUN';
  failure: string | null;
  lines: number;
  hits: ScanHit[];
  /** The checker that decided this report was OpenAI, so the word list ran (`diagnostics.run.checker.wordList`). */
  wordList: boolean;
  /** Set when Claude's check failed and the OpenAI fallback checked the report. */
  fallbackFrom: string | null;
  dashes: DashReview[];
}

export interface NightScan {
  runAt: string;
  windowStart: string;
  windowEnd: string;
  stopUsd: number;
  spendUsd: number;
  reports: ScannedReport[];
}

interface StoredDiagnostics {
  run?: {
    dashes?: DashReplacement[];
    checker?: { ran?: string; fallbackFrom?: { model?: string }; wordList?: boolean };
  } | null;
}

function countTo(text: string): number {
  return text.split(' to ').length - 1;
}

/**
 * Reads each report in turn. `spent` is the night's spend so far and `reserveUsd` the most one call can cost; a report
 * whose call could cross the stop is NOT_RUN, never read at a cost past it. A failed call or reply is FAILED.
 */
export async function runNightScan(
  rows: readonly StoredReportRow[],
  model: CheckerModel,
  options: { runAt: string; windowStart: string; windowEnd: string; stopUsd: number; reserveUsd: number; spent: () => number },
): Promise<NightScan> {
  const reports: ScannedReport[] = [];
  for (const row of rows) {
    const report = JSON.parse(row.payload) as SessionReport;
    const diagnostics = (row.diagnostics ? JSON.parse(row.diagnostics) : {}) as StoredDiagnostics;
    const checker = diagnostics.run?.checker;
    const lines = scanLines(report);
    const scanned: ScannedReport = {
      rowId: row.id,
      kind: row.kind,
      rangeKey: row.range_key,
      tradingDate: row.trading_date,
      publishedAt: row.published_at,
      status: 'READ',
      failure: null,
      lines: lines.length,
      hits: [],
      wordList: checker?.wordList === true,
      fallbackFrom: checker?.fallbackFrom?.model ?? null,
      dashes: (diagnostics.run?.dashes ?? []).map(({ id, before }) => {
        const after = replaceDashes(before);
        return { id, before, after, to: countTo(after) > countTo(before) };
      }),
    };
    reports.push(scanned);
    if (lines.length === 0) continue;
    if (options.spent() + options.reserveUsd > options.stopUsd) {
      scanned.status = 'NOT_RUN';
      scanned.failure = `stop: $${options.spent().toFixed(4)} spent + $${options.reserveUsd.toFixed(4)} would pass $${options.stopUsd}`;
      continue;
    }
    let raw: string;
    try {
      raw = await model.complete(buildNightScanPrompt({ kind: row.kind, tradingDate: row.trading_date }, lines));
    } catch (error) {
      scanned.status = 'FAILED';
      scanned.failure = `call: ${error instanceof Error ? error.message : 'failed'}`;
      continue;
    }
    const parsed = parseNightScan(raw, lines);
    if (!parsed.ok) {
      scanned.status = 'FAILED';
      scanned.failure = parsed.error;
      continue;
    }
    scanned.hits = parsed.hits;
  }
  return { runAt: options.runAt, windowStart: options.windowStart, windowEnd: options.windowEnd, stopUsd: options.stopUsd, spendUsd: options.spent(), reports };
}

/** The one line the journal carries (Integration's condition 1): the counts themselves, so a glance tells a silent night. */
export function journalLine(scan: NightScan, date: string): string {
  const read = scan.reports.filter((r) => r.status === 'READ').length;
  const hits = scan.reports.reduce((n, r) => n + r.hits.length, 0);
  const fallback = scan.reports.filter((r) => r.fallbackFrom !== null).length;
  const notRead = scan.reports.length - read;
  return `night scan ${date}: ${read} reports read, ${hits} hits, ${fallback} fallback-checked${notRead > 0 ? `, ${notRead} NOT READ` : ''}`;
}

/** The morning note for Integration: hits first, then what was not read, then the reviews read 94 asked for. */
export function morningNote(scan: NightScan, date: string): string {
  const out: string[] = [journalLine(scan, date), ''];
  out.push(`Window: reports published after ${scan.windowStart} up to ${scan.windowEnd}. Spend $${scan.spendUsd.toFixed(4)} (stop $${scan.stopUsd}).`);
  const name = (r: ScannedReport) => `${r.kind} ${r.tradingDate} (${r.rangeKey}, row ${r.rowId})`;
  out.push('', 'HITS (advice or forecast, read 82):');
  const withHits = scan.reports.filter((r) => r.hits.length > 0);
  if (withHits.length === 0) out.push(`  none, in ${scan.reports.filter((r) => r.status === 'READ').length} reports read`);
  for (const r of withHits) {
    for (const hit of r.hits) {
      const asked = [hit.advice ? 'advice' : null, hit.forecast ? 'forecast' : null].filter(Boolean).join(' and ');
      out.push(`  ${name(r)} ${hit.id}${hit.ticker ? ` ${hit.ticker}` : ''}: ${asked}; "${hit.phrase}" in: ${hit.text}`);
    }
  }
  const notRead = scan.reports.filter((r) => r.status !== 'READ');
  out.push('', 'NOT READ:');
  if (notRead.length === 0) out.push('  none');
  for (const r of notRead) out.push(`  ${name(r)}: ${r.status}, ${r.failure}`);
  const wordList = scan.reports.filter((r) => r.wordList);
  out.push('', 'CHECKED BY OPENAI, WORD LIST ON:');
  if (wordList.length === 0) out.push('  none');
  for (const r of wordList) out.push(`  ${name(r)}${r.fallbackFrom ? `: fallback after ${r.fallbackFrom} failed` : ': OpenAI was the first checker'}`);
  const dashes = scan.reports.flatMap((r) => r.dashes.map((d) => ({ r, d })));
  out.push('', 'DASHES REPLACED (" to " between figures marked TO, read 94 (3)):');
  if (dashes.length === 0) out.push('  none');
  for (const { r, d } of dashes) out.push(`  ${d.to ? 'TO ' : ''}${name(r)} ${d.id}: ${d.before} => ${d.after}`);
  return `${out.join('\n')}\n`;
}
