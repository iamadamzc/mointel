/**
 * THE L21 RE-CHECK (his "yes to all. except 2.", item 5, Integration chat uuid 0114ba50, 2026-10-17: "Spend about $0.60
 * to $0.80 (hard stop $2) on a quick paid check? It runs 3 of today's reports and one recap through the new writer and
 * checker, and counts any line that still says "fresh" or gets cut."). HARD STOP $2.
 *
 * L21 renames the FRESH_FOUND group "recent news" in the writers (v7 15, v6 17, v5 6) and in the checker line both
 * checkers read (V6 19), which now refuses "fresh" for the group. No test can see how the writer behaves on that, so this
 * runs production's own path on the final tree (d24d2ed6) with the checker that ships (Claude Opus 5.5, Tests-TMI key,
 * no fallback) on the same inputs production wrote from on 2026-10-16, and sets each beside production's stored report.
 *
 * INPUTS, x1 each: 2026-10-16 INTO_RTH, INTO_POWER_HOUR and AFTER_HOURS (v7), and one recap (v6): 2026-10-16 EVENING if
 * production stored a PUBLISHED row for it, else 2026-10-16 PREMARKET. The clock is the run's, as in every earlier
 * re-check, so research newer than production's write can enter; each record names production's created_at.
 *
 * MEASURES, pre-registered with Integration before any call (Integration's pass, 42nd: 0 "fresh" for the group in
 * published lines and Summaries; no new strike reason the production report lacks on the same input; Summaries no worse
 * than production's):
 *   1. every published line, Summary and section heading matching \bfresh\b, each listed; the draft count beside.
 *   2. strikes by reason/by, this run against production's stored diagnostics for the same slot.
 *   3. the Summary published or struck, against production's.
 *   4. the count sentence published, and in which word.
 *
 * A report launches only if spend + its worst case fits the stop; a call with no usage is charged its worst case.
 * Keys: Tests-TMI read by name (readNamedKey), never printed; the desk's OpenAI key from --env-file.
 *   node --env-file=../mointel/.env.local --import tsx scripts/report-l21-recheck.ts <store> <out-dir> --key-file <path> [--dry]
 * --dry: stub models with a PLANTED CONTROL (no key, no spend): each Summary is the count sentence in "fresh" from the
 * input's own counts, and the first name line says "fresh news", so measures 1 and 4 see a present case.
 */
import fs from 'node:fs';
import path from 'node:path';

import { AnthropicReportModel, CLAUDE_CHECKER_MAX_TOKENS } from '../lib/desk/reports/anthropicReportModel';
import { draftLines, REPORT_CHECKER_PROMPT_VERSION_V6, VERDICT_SCHEMA_V6 } from '../lib/desk/reports/check';
import type { CheckerModel } from '../lib/desk/reports/check';
import type { ReportKind } from '../lib/desk/reports/contract';
import type { NarrativeFacts } from '../lib/desk/reports/narrative';
import type { ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { readReportInputs, runReport, writerPromptFor } from '../lib/desk/reports/pipeline';
import type { ReportRun } from '../lib/desk/reports/pipeline';
import { CLAUDE_CHECKER_TIMEOUT_MS, createReportModelsV6 } from '../lib/desk/reports/runner';
import type { ReportDraft, ReportModel, WriterPrompt } from '../lib/desk/reports/writer';
import { REPORT_WRITER_PROMPT_VERSION_V6 } from '../lib/desk/reports/writerV6';
import { REPORT_WRITER_PROMPT_VERSION_V7 } from '../lib/desk/reports/writerV7';
import { openDatabase } from '../lib/market/store/db';
import { readReportModelConfig } from '../lib/research/config';
import { readNamedKey } from './readNamedKey';

const RANGE = { min: 1, max: 20 };
const RANGE_KEY = '1-20';
const DAY = '2026-10-16';
const STOP_AT = 2;
const OPUS = 'claude-opus-5-5';
const EXPECTED = { v7: 15, v6: 17, checker: 19 };
const PRICE: Record<string, { input: number; output: number }> = { luna: { input: 0.2, output: 1.2 }, 'claude-opus-5-5': { input: 4, output: 20 } };
const RESERVE = { writerInput: 10_000, writerOutput: 8_000, checkerInput: 40_000, checkerOutput: CLAUDE_CHECKER_MAX_TOKENS };
const tierOf = (model: string) => Object.keys(PRICE).find((key) => model.includes(key)) ?? null;
const worstCase = (role: 'writer' | 'checker') =>
  role === 'writer'
    ? (RESERVE.writerInput * PRICE.luna!.input + RESERVE.writerOutput * PRICE.luna!.output) / 1e6
    : (RESERVE.checkerInput * PRICE[OPUS]!.input + RESERVE.checkerOutput * PRICE[OPUS]!.output) / 1e6;
const RESERVE_PER_REPORT = worstCase('writer') + worstCase('checker');
function cost(usage: ReportModelUsage, role: 'writer' | 'checker'): number {
  const tier = tierOf(usage.model);
  if (!tier) return STOP_AT;
  if (usage.inputTokens === null || usage.outputTokens === null) return worstCase(role);
  return (usage.inputTokens * PRICE[tier]!.input + usage.outputTokens * PRICE[tier]!.output) / 1e6;
}

type KeptCall = { prompt: WriterPrompt; raw: string | null; error: string | null };
function keeping(inner: ReportModel, calls: KeptCall[]): ReportModel {
  return {
    complete: async (sent) => {
      try {
        const raw = await inner.complete(sent);
        calls.push({ prompt: sent, raw, error: null });
        return raw;
      } catch (e) {
        calls.push({ prompt: sent, raw: null, error: e instanceof Error ? e.message : String(e) });
        throw e;
      }
    },
  };
}
class KeptChecker implements CheckerModel {
  readonly replies: Array<{ raw: string | null; error: string | null }> = [];
  constructor(private readonly inner: CheckerModel) {}
  async complete(prompt: WriterPrompt): Promise<string> {
    try {
      const raw = await this.inner.complete(prompt);
      this.replies.push({ raw, error: null });
      return raw;
    } catch (e) {
      this.replies.push({ raw: null, error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  }
}

/**
 * --dry: the planted control (measures 1 and 4 see a present case). The Summary is only the count sentence in "fresh",
 * from the input's own counts, so no number rule strikes it and the PUBLISHED count word reads "fresh" (an invented count
 * is struck NUMBER_WITHOUT_ROW, and the published measure then sees nothing: the first dry, and 7d2d93ae's lesson).
 */
function stubWriter(facts: NarrativeFacts): ReportModel {
  return {
    complete: async (prompt) => {
      const shown = [...prompt.user.matchAll(/^([A-Z][A-Z.]{0,5}): ranked #/gm)].map((m) => m[1]!);
      return JSON.stringify({
        narrative: `Of the ${facts.fresh.covered} names the desk covers, ${facts.fresh.count} had fresh news in our sources.`,
        lines: shown.map((ticker, i) => ({ ticker, text: i === 0 ? 'Planted control: fresh news in our sources.' : 'Dry run line.' })),
      });
    },
  };
}
const stubChecker = (): CheckerModel => ({
  complete: async (prompt) =>
    JSON.stringify({
      verdicts: [...new Set(prompt.user.match(/^(?:O|S[0-9]+L[0-9]+)(?![A-Za-z0-9])/gm) ?? [])].map((id) => ({
        id, supported: true, note: '', advice: false, forecast: false, leansOnAnother: false, phrase: '',
      })),
    }),
});

const FRESH = /\bfresh\b/i;
const COUNT_WORD = /names the desk covers[^.]*?\b(recent|fresh) news|\b(Recent|Fresh) news was found for/;
const countWord = (text: string | null) => {
  if (text === null) return null;
  const m = COUNT_WORD.exec(text);
  return m ? (m[1] ?? m[2] ?? '').toLowerCase() : null;
};

type StoredStrike = { id: string; reason: string; by: string; detail?: string; text?: string | null };
interface ProductionRow {
  status: string;
  createdAt: string;
  versions: unknown;
  narrative: string | null;
  summaryStruck: boolean;
  strikes: StoredStrike[];
  freshHits: number;
  countWord: string | null;
}
type PayloadSection = { heading?: string; lines?: Array<{ ticker: string | null; text: string }> };
function readProduction(db: ReturnType<typeof openDatabase>, kind: ReportKind): ProductionRow | null {
  const row = db
    .prepare('SELECT status, payload, diagnostics, versions, created_at FROM session_reports WHERE kind = ? AND range_key = ? AND trading_date = ?')
    .get(kind, RANGE_KEY, DAY) as { status: string; payload: string | null; diagnostics: string | null; versions: string; created_at: string } | undefined;
  if (!row) return null;
  const payload = row.payload ? (JSON.parse(row.payload) as { narrative?: string | null; sections?: PayloadSection[] }) : null;
  const diagnostics = row.diagnostics ? (JSON.parse(row.diagnostics) as { run?: { strikes?: StoredStrike[] } }) : null;
  const strikes = diagnostics?.run?.strikes ?? [];
  const narrative = payload?.narrative ?? null;
  const texts = [narrative ?? '', ...(payload?.sections ?? []).flatMap((s) => [s.heading ?? '', ...(s.lines ?? []).map((l) => l.text)])];
  return {
    status: row.status,
    createdAt: row.created_at,
    versions: JSON.parse(row.versions) as unknown,
    narrative,
    summaryStruck: strikes.some((s) => s.id === 'O'),
    strikes,
    freshHits: texts.filter((t) => FRESH.test(t)).length,
    countWord: countWord(narrative),
  };
}
const byReason = (strikes: ReadonlyArray<{ reason: string; by: string }>) => {
  const m = new Map<string, number>();
  for (const s of strikes) m.set(`${s.reason}/${s.by}`, (m.get(`${s.reason}/${s.by}`) ?? 0) + 1);
  return m;
};
const fmt = (m: Map<string, number>) => [...m.entries()].map(([k, n]) => `${k} ${n}`).join(', ') || 'none';

interface RunRecord {
  tag: string;
  kind: ReportKind;
  family: string;
  status: string;
  error: string | null;
  summaryStruck: boolean;
  summaryStrikes: Array<{ reason: string; by: string; detail: string }>;
  strikesByReason: Record<string, number>;
  freshPublished: Array<{ where: string; ticker: string | null; text: string }>;
  freshInDraft: number;
  countWordPublished: string | null;
  countWordDraft: string | null;
  narrative: string | null;
  draftSummary: string | null;
  publishedLines: number;
  checkerErrors: number;
  production: ProductionRow | null;
  newReasons: string[];
  costUsd: number;
  usage: Array<ReportModelUsage & { role: 'writer' | 'checker' }>;
}

async function main() {
  if (process.argv[1] && !process.argv[1].endsWith('report-l21-recheck.ts')) return;
  const args = process.argv.slice(2);
  const [store, out] = args;
  if (!store || !out) throw new Error('usage: report-l21-recheck.ts <store> <out-dir> --key-file <path> [--dry]');
  const dry = args.includes('--dry');
  const keyFileAt = args.indexOf('--key-file');
  const keyFile = keyFileAt >= 0 ? args[keyFileAt + 1] : undefined;
  if (Number(REPORT_WRITER_PROMPT_VERSION_V7) !== EXPECTED.v7) throw new Error(`v7 is ${REPORT_WRITER_PROMPT_VERSION_V7}, not ${EXPECTED.v7}; nothing run`);
  if (Number(REPORT_WRITER_PROMPT_VERSION_V6) !== EXPECTED.v6) throw new Error(`v6 is ${REPORT_WRITER_PROMPT_VERSION_V6}, not ${EXPECTED.v6}; nothing run`);
  if (Number(REPORT_CHECKER_PROMPT_VERSION_V6) !== EXPECTED.checker) throw new Error(`the checker prompt is ${REPORT_CHECKER_PROMPT_VERSION_V6}, not ${EXPECTED.checker}; nothing run`);
  fs.mkdirSync(out, { recursive: true });
  const config = readReportModelConfig();
  const luna = config.writerModel;
  let anthropicKey = '';
  if (!dry) {
    if (!config.apiKey) throw new Error('the OpenAI key is missing from the environment (run with --env-file); nothing run');
    if (!keyFile) throw new Error('--key-file is required for a paid run; nothing run');
    anthropicKey = readNamedKey(keyFile, 'tests-tmi');
    if (tierOf(luna) !== 'luna') throw new Error(`the writer model ${luna} is not priced here; nothing run`);
  }
  const db = openDatabase(store, { readonly: true, skipSchema: true });
  const recap: ReportKind = readProduction(db, 'EVENING')?.status === 'PUBLISHED' ? 'EVENING' : 'PREMARKET';
  const plan: ReportKind[] = ['INTO_RTH', 'INTO_POWER_HOUR', 'AFTER_HOURS', recap];
  const NOW = new Date();
  const st = fs.statSync(store);
  const summary: string[] = [
    `store ${store}: ${st.size} bytes, mtime ${st.mtime.toISOString()}`,
    `clock fixed at ${NOW.toISOString()}; range $1-$20; inputs ${plan.map((k) => `${DAY} ${k} x1`).join(', ')} (recap ${recap}: ${recap === 'EVENING' ? 'production stored a PUBLISHED EVENING row' : 'no PUBLISHED EVENING row, so PREMARKET'})`,
    `prompts v7 ${REPORT_WRITER_PROMPT_VERSION_V7}, v6 ${REPORT_WRITER_PROMPT_VERSION_V6}, checker V6 ${REPORT_CHECKER_PROMPT_VERSION_V6}; writer ${luna}; checker ${OPUS} (Tests-TMI key, no fallback); every raw reply kept`,
    `stop $${STOP_AT}: a report launches only if spend + its worst case ($${RESERVE_PER_REPORT.toFixed(4)}) fits${dry ? '; DRY: stub models, nothing spent' : ''}`,
    '',
  ];
  const records: RunRecord[] = [];
  let spend = 0;
  let stopped: string | null = null;

  for (const kind of plan) {
    const tag = `${DAY}-${kind}-l21`;
    const family = writerPromptFor(kind).family;
    if (stopped) { summary.push(`${tag}: NOT RUN, ${stopped}`); continue; }
    const read = readReportInputs(db, kind, DAY, RANGE, NOW);
    if (!read.ok) { summary.push(`${tag}: NOT RUN, inputs MISSED ${JSON.stringify(read.cause)}`); continue; }
    if (!dry && spend + RESERVE_PER_REPORT > STOP_AT) { summary.push(`${tag}: NOT RUN, spend $${spend.toFixed(4)} + worst case exceeds the $${STOP_AT} stop`); continue; }
    const usage: RunRecord['usage'] = [];
    const calls: KeptCall[] = [];
    const inner = dry ? stubWriter(read.inputs.narrative) : createReportModelsV6({ ...config, claudeChecker: null }, (u) => usage.push({ ...u, role: 'writer' })).writer;
    const checker = new KeptChecker(
      dry ? stubChecker() : new AnthropicReportModel({ apiKey: anthropicKey, model: OPUS, schema: VERDICT_SCHEMA_V6, timeoutMs: CLAUDE_CHECKER_TIMEOUT_MS, onUsage: (u) => usage.push({ ...u, role: 'checker' }) }),
    );
    let draft: ReportDraft | null = null;
    let result: ReportRun | null = null;
    let error: string | null = null;
    try {
      result = await runReport(db, { kind, rangeId: RANGE_KEY, tradingDate: DAY, range: RANGE }, { writer: keeping(inner, calls), checker }, () => NOW, { draft: (d) => (draft = d) });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const drafted = draft as ReportDraft | null;
    const published = result?.status === 'PUBLISHED' ? result.report : null;
    const narrative = published?.narrative ?? null;
    const strikes = result?.diagnostics?.strikes ?? [];
    const sections = published ? published.sections : [];
    const freshPublished = [
      ...(narrative && FRESH.test(narrative) ? [{ where: 'Summary', ticker: null, text: narrative }] : []),
      ...sections.filter((s) => FRESH.test(s.heading ?? '')).map((s) => ({ where: 'heading', ticker: null, text: s.heading ?? '' })),
      ...sections.flatMap((s) => s.lines).filter((l) => FRESH.test(l.text)).map((l) => ({ where: 'line', ticker: l.ticker, text: l.text })),
    ];
    const draftTexts = drafted ? [drafted.overall ?? '', ...draftLines(drafted).map((l) => l.text)] : [];
    const production = readProduction(db, kind);
    const mine = byReason(strikes);
    const theirs = byReason(production?.strikes ?? []);
    const record: RunRecord = {
      tag,
      kind,
      family,
      status: error ? 'ERROR' : result!.status === 'MISSED' ? `MISSED ${JSON.stringify(result!.cause)}` : 'PUBLISHED',
      error,
      summaryStruck: strikes.some((s) => s.id === 'O'),
      summaryStrikes: strikes.filter((s) => s.id === 'O').map((s) => ({ reason: s.reason, by: s.by, detail: s.detail })),
      strikesByReason: Object.fromEntries(mine),
      freshPublished,
      freshInDraft: draftTexts.filter((t) => FRESH.test(t)).length,
      countWordPublished: countWord(narrative),
      countWordDraft: countWord(drafted?.overall ?? null),
      narrative,
      draftSummary: drafted?.overall ?? null,
      publishedLines: sections.reduce((n, s) => n + s.lines.length, 0),
      checkerErrors: checker.replies.filter((r) => r.error !== null).length,
      production,
      newReasons: [...mine.keys()].filter((k) => !theirs.has(k)),
      costUsd: usage.reduce((sum, u) => sum + cost(u, u.role), 0),
      usage,
    };
    fs.writeFileSync(path.join(out, `${tag}.json`), JSON.stringify({ record, sentPrompts: calls.map((c) => c.prompt), rawWriterTexts: calls.map((c) => c.raw), draft, checkerReplies: checker.replies, result }, null, 2));
    spend += record.costUsd;
    records.push(record);
    summary.push(
      `${tag} (${family}): ${record.error ? `ERROR ${record.error}` : record.status}; Summary ${record.summaryStruck ? `STRUCK (${record.summaryStrikes.map((s) => `${s.reason}/${s.by}`).join(', ')})` : 'published'}, production ${production ? (production.summaryStruck ? 'STRUCK' : 'published') : 'NO ROW'}; ` +
        `"fresh" PUBLISHED ${record.freshPublished.length} (draft texts ${record.freshInDraft}); count word published ${record.countWordPublished ?? 'none'} (draft ${record.countWordDraft ?? 'none'}); ` +
        `strikes ${fmt(mine)}; production (${production?.createdAt ?? '-'}) ${fmt(theirs)}; reasons production lacks [${record.newReasons.join(' ')}]; $${record.costUsd.toFixed(4)}`,
    );
    for (const f of record.freshPublished) summary.push(`  fresh, ${f.where}${f.ticker ? ` ${f.ticker}` : ''}: ${f.text}`);
    if (!dry && records.length === 1 && record.error) stopped = 'the first report had an error (fail fast)';
    console.log(`${kind}: spend $${spend.toFixed(4)}`);
  }

  const pub = records.filter((r) => r.status === 'PUBLISHED');
  summary.push(
    '',
    `1. "fresh" in published lines, Summaries and headings: ${pub.reduce((n, r) => n + r.freshPublished.length, 0)} (draft texts ${records.reduce((n, r) => n + r.freshInDraft, 0)})`,
    `2. strike reasons production lacks on the same input: ${records.filter((r) => r.newReasons.length > 0).map((r) => `${r.kind} [${r.newReasons.join(' ')}]`).join('; ') || 'none'}`,
    `3. Summaries struck: this run ${pub.filter((r) => r.summaryStruck).length} of ${pub.length}; production ${records.filter((r) => r.production?.summaryStruck).length} of ${records.filter((r) => r.production?.status === 'PUBLISHED').length}`,
    `4. count sentence published ${pub.filter((r) => r.countWordPublished !== null).length} of ${pub.length}, word ${pub.map((r) => r.countWordPublished ?? 'none').join(' ')}`,
    `checker calls that threw ${records.reduce((n, r) => n + r.checkerErrors, 0)}`,
    `TOTAL reports run ${records.length} of ${plan.length}; spend $${spend.toFixed(4)}${dry ? ' (dry: stub models, nothing spent)' : ''}`,
  );
  fs.writeFileSync(path.join(out, 'summary.txt'), `${summary.join('\n')}\n`);
  fs.writeFileSync(path.join(out, 'records.json'), JSON.stringify(records, null, 2));
  console.log(`wrote ${out}; spend $${spend.toFixed(4)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
