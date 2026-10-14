/**
 * THE SUMMARY-LENGTH RE-CHECK (L13, fourth run): v7 prompt version 10, the recap and the intraday Summary each told
 * their length (Marketing 493a81ff: RECAP_SHAPE_RULE's added sentence, INTRADAY_SHAPE_RULE), so the cut that keeps the
 * first sentences after the check (`capNarrative`, sentences.ts: recap 4, intraday 3) no longer drops the count
 * sentence. The third run (raw-3 at 7c2d8514, result corrected at 6d24eb12) measured the DRAFT Summary; the reader gets
 * the PUBLISHED one, and the count sentence reached it in 0 of 9 recaps (v7 intraday in L12, f71c48c2: 0 of 8).
 *
 * EVERY SUMMARY MEASURE IS TAKEN ON THE PUBLISHED NARRATIVE (`result.report.narrative`), and on the draft beside it.
 *
 * His yes: "a" (Integration chat 7d32ed42, user uuid 0be89a81, 2026-10-14T03:33:49.640Z, verified at his turn by this
 * seat), answering option (a) "Full re-check: 9 recaps plus 27 intraday reports, about $5.50, hard stop $8".
 * HARD STOP $8, per report as L12: a report launches only if the spend so far plus ITS worst case fits.
 *
 * Built on production a202a845 with v7 versions 8 and 9 recomposed (2c863754), so the code under test is the code that
 * would ship. Production writes the intraday kinds with v7 already (`writerPromptFor`), so an intraday report here is
 * the pipeline's own path with the model's calls recorded; the recaps are routed to v6 in production, so a recap is the
 * third run's swap (the pipeline's v6 prompt is required to match, then `writeReportV7` runs version 10's two calls).
 *
 * 3 days (2026-10-02, 10-05, 10-06) x (PREMARKET + INTO_RTH + INTO_POWER_HOUR + AFTER_HOURS) x 3 runs = 36 reports,
 * written by luna (production's writer), CHECKED BY THE CHECKER THAT SHIPS (Claude Opus 5.5 high, Tests-TMI key, no
 * fallback; a failed check is MISSED and counts against). Every prompt, raw reply and checker reply is kept.
 *
 * Keys: the Tests-TMI Anthropic key read by name with readNamedKey, never printed; the desk's OpenAI key (luna) from
 * the environment (--env-file). Discipline: committed BEFORE any model call; the raw output committed BEFORE it is read.
 *   node --env-file=../mointel/.env.local --import tsx scripts/report-summary-length-check.ts <db> <out-dir> --key-file <path> [--dry]
 * --dry: stub models (no key, no spend) with a PLANTED CONTROL that writes past the cap, to prove each measure sees a
 * present case and an absent one on the published Summary.
 */
import fs from 'node:fs';
import path from 'node:path';

import { AnthropicReportModel, CLAUDE_CHECKER_MAX_TOKENS } from '../lib/desk/reports/anthropicReportModel';
import { draftLines, VERDICT_SCHEMA_V6 } from '../lib/desk/reports/check';
import type { CheckerModel } from '../lib/desk/reports/check';
import type { ReportKind } from '../lib/desk/reports/contract';
import { isRecap, type NarrativeFacts } from '../lib/desk/reports/narrative';
import type { ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { readReportInputs, runReport } from '../lib/desk/reports/pipeline';
import type { ReportRun } from '../lib/desk/reports/pipeline';
import { CLAUDE_CHECKER_TIMEOUT_MS, createReportModelsV6 } from '../lib/desk/reports/runner';
import { NARRATIVE_MAX_SENTENCES, splitSentences } from '../lib/desk/reports/sentences';
import type { ReportDraft, ReportModel, WriterPrompt } from '../lib/desk/reports/writer';
import { buildWriterPromptV6, type WriterInputV6 } from '../lib/desk/reports/writerV6';
import { RECAP_LINES_ONLY, RECAP_SUMMARY_ONLY, recapSummaryRule, REPORT_WRITER_PROMPT_VERSION_V7, writeReportV7 } from '../lib/desk/reports/writerV7';
import { openDatabase } from '../lib/market/store/db';
import type { MarketDatabase } from '../lib/market/store/db';
import { readReportModelConfig } from '../lib/research/config';
import { readNamedKey } from './readNamedKey';

const RANGE = { min: 1, max: 20 };
const STOP_AT = 8;
const DAYS = ['2026-10-02', '2026-10-05', '2026-10-06'];
const KINDS: readonly ReportKind[] = ['PREMARKET', 'INTO_RTH', 'INTO_POWER_HOUR', 'AFTER_HOURS'];
const RUNS = 3;
const OPUS = 'claude-opus-5-5';
const EXPECTED_VERSION = 10;

/** Per Mtok, as the L12 harness. */
const PRICE: Record<string, { input: number; output: number }> = {
  luna: { input: 0.2, output: 1.2 },
  'claude-opus-5-5': { input: 4, output: 20 },
};

/** Worst case per call, in tokens, as L12. */
const RESERVE = { writerInput: 10_000, writerOutput: 8_000, checkerInput: 40_000, checkerOutput: CLAUDE_CHECKER_MAX_TOKENS };

function tierOf(model: string): string | null {
  return Object.keys(PRICE).find((key) => model.includes(key)) ?? null;
}

function worstCase(role: 'writer' | 'checker'): number {
  return role === 'writer'
    ? (RESERVE.writerInput * PRICE.luna!.input + RESERVE.writerOutput * PRICE.luna!.output) / 1e6
    : (RESERVE.checkerInput * PRICE[OPUS]!.input + RESERVE.checkerOutput * PRICE[OPUS]!.output) / 1e6;
}

/** A recap makes two writer calls (version 9), an intraday report one. */
const writerCallsFor = (kind: ReportKind) => (isRecap(kind) ? 2 : 1);
const reserveFor = (kind: ReportKind) => writerCallsFor(kind) * worstCase('writer') + worstCase('checker');
const capFor = (kind: ReportKind) => (isRecap(kind) ? NARRATIVE_MAX_SENTENCES.recap : NARRATIVE_MAX_SENTENCES.intraday);

function cost(usage: ReportModelUsage, role: 'writer' | 'checker'): number {
  const tier = tierOf(usage.model);
  if (!tier) return STOP_AT;
  if (usage.inputTokens === null || usage.outputTokens === null) return worstCase(role);
  return (usage.inputTokens * PRICE[tier]!.input + usage.outputTokens * PRICE[tier]!.output) / 1e6;
}

type KeptCall = { prompt: WriterPrompt; raw: string | null; error: string | null };

/** Records every call to `inner` (prompt, raw reply, or the error of a call that threw). */
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

/**
 * The writer the pipeline is handed. Intraday: production's own v7 path, the calls recorded. Recap: the third run's
 * swap: REQUIRES the pipeline's prompt to equal the v6 prompt built from the same inputs (no call otherwise), runs
 * `writeReportV7` (two calls), and returns its merged draft in v6's reply shape for the pipeline to parse; a v7
 * WRITER_FAILED throws, which the pipeline turns into WRITER_FAILED, so the report is MISSED as in production.
 */
class HarnessWriter implements ReportModel {
  readonly calls: KeptCall[] = [];
  merged: string | null = null;
  constructor(
    private readonly inner: ReportModel,
    private readonly input: WriterInputV6,
  ) {}
  async complete(prompt: WriterPrompt): Promise<string> {
    if (!isRecap(this.input.kind)) return keeping(this.inner, this.calls).complete(prompt);
    const expected = buildWriterPromptV6(this.input);
    if (prompt.system !== expected.system || prompt.user !== expected.user) {
      throw new Error('PROMPT_MISMATCH: the pipeline built a different v6 prompt than the harness; no call made');
    }
    const written = await writeReportV7(this.input, keeping(this.inner, this.calls));
    if (!written.ok) throw new Error(`V7_WRITER_FAILED after ${this.calls.length} call(s)`);
    this.merged = JSON.stringify({ narrative: written.draft.overall, lines: written.draft.sections.flatMap((s) => s.lines) });
    return this.merged;
  }
}

/** Keeps every checker reply verbatim, and the error text of a call that throws. */
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

/** The names the facts tell the Summary to name, in order: recap leaders; intraday leader then next gainers. */
function namedOf(facts: NarrativeFacts): string[] {
  return isRecap(facts.kind) ? (facts.recapLeaders ?? []).map((m) => m.ticker) : (facts.intradayNamed ?? []).map((m) => m.ticker);
}

/**
 * --dry only: a PLANTED CONTROL that writes PAST the cap with the count sentence last, so the dry run shows each measure
 * seeing both a present and an absent case on the PUBLISHED Summary. Recap (cap 4): counts with an off-list name, a rank
 * and "zero"; each named mover; fillers up to the cap; the after-hours name; the count sentence: the movers survive (up
 * to 3), the after-hours line and the count sentence are cut. Intraday (cap 3): the named names in one sentence (or "No
 * name led"); two fillers; the count sentence: cut.
 * Expected on the dry: count sentence drafted 36 of 36, published 0; after-hours published 0 where the facts give one;
 * in runs 2 and 3, every named name published (a present case, unless a rule strikes the plain Summary, which the dry
 * then shows); drafts over the cap 36 of 36; run 1's draft measures (outside the list, rank, "zero") in each run-1 recap, 3 in all.
 */
function stubWriter(input: WriterInputV6, run: number): ReportModel {
  const named = namedOf(input.narrative);
  const count = `Of the ${input.narrative.fresh.covered} names the desk covers, ${input.narrative.fresh.count} had fresh news in our sources.`;
  // Run 1 plants the draft-only measures (an off-list name, a rank, "zero", "positive"), which the pipeline's rules
  // strike (the third run's dry: Summary struck 9 of 9); runs 2 and 3 plant a clean Summary past the cap, so the
  // PUBLISHED measures see a present case (the named movers) and an absent one (the after-hours line, the count).
  const opener = (outside: string) =>
    run === 1
      ? `Planted control: ${outside} had a positive event and ranked first in this range, and zero gave the entire move back.`
      : `${input.narrative.movers50 ?? 0} counted names ran at least 50 percent above the prior close.`;
  const linesFor = (user: string) =>
    [...user.matchAll(/^([A-Z][A-Z.]{0,5}): ranked #/gm)].map((m, i) => ({ ticker: m[1]!, text: i === 0 ? 'Planted control: an operating catalyst.' : 'Dry run line.' }));
  return {
    complete: async (prompt) => {
      if (prompt.user.endsWith(RECAP_SUMMARY_ONLY)) {
        const allowed = allowedOf(/The Summary may name only these tickers: [^.]*\./.exec(prompt.user)?.[0] ?? '') ?? [];
        const outside = input.facts.map((f) => f.ticker).find((t) => !allowed.includes(t)) ?? 'NONE';
        const ah = input.narrative.afterHours?.ticker;
        // Padded to the cap whatever the number of named movers, so the after-hours line and the count always fall past it.
        const kept = [opener(outside), ...named.map((t) => `${t} was a covered 50 percent mover.`)];
        while (kept.length < NARRATIVE_MAX_SENTENCES.recap) kept.push('This filler sentence pushes the rest past the cap.');
        const sentences = [...kept, ...(ah ? [`${ah} was up after the close.`] : []), count];
        return JSON.stringify({ narrative: sentences.join(' '), lines: [] });
      }
      if (prompt.user.endsWith(RECAP_LINES_ONLY)) return JSON.stringify({ narrative: null, lines: linesFor(prompt.user) });
      if (isRecap(input.kind)) throw new Error('DRY: a recap call that is neither recap call');
      const sentences = [
        named.length > 0 ? `${named.join(' and ')} led this range${run === 1 ? ' with a positive catalyst' : ''}.` : 'No name led this range.',
        'This filler sentence pushes the rest past the cap.',
        'A second filler sentence does the same.',
        count,
      ];
      return JSON.stringify({ narrative: sentences.join(' '), lines: linesFor(prompt.user) });
    },
  };
}
function stubChecker(): CheckerModel {
  return {
    complete: async (prompt) =>
      JSON.stringify({
        verdicts: [...new Set(prompt.user.match(/^(?:O|S[0-9]+L[0-9]+)(?![A-Za-z0-9])/gm) ?? [])].map((id) => ({
          id, supported: true, note: '', advice: false, forecast: false, leansOnAnother: false, phrase: '',
        })),
      }),
  };
}

/** Commercial read 107 (a): a judgement word, or a classification of the news by kind. */
const JUDGEMENT = /\bpositive\b|\bnegative\b|\brather than an?\b[^.]*\bcatalyst\b|\boperating\b|\btransaction-development\b|\b[a-z-]+ catalyst\b/gi;
const NOT_A_KIND = new Set(['no catalyst', 'fresh catalyst']);

function allowedOf(rule: string | null): string[] | null {
  if (rule === null) return null;
  const m = /may name only these tickers: ([^.]*)\./.exec(rule);
  return m ? m[1]!.split(', ') : [];
}

const names = (text: string | null, ticker: string) =>
  text !== null && new RegExp(`(?<![A-Za-z0-9])${ticker.replace('.', '\\.')}(?![A-Za-z0-9])`).test(text);
const hasCount = (text: string | null) => text !== null && /names the desk covers/.test(text) && /fresh news/.test(text);

interface RunRecord {
  tag: string;
  kind: ReportKind;
  day: string;
  run: number;
  status: string;
  error: string | null;
  lines: number;
  struck: string[];
  strikes: Array<{ id: string; reason: string; by: string; detail: string }>;
  narrativeStruck: boolean;
  /** The writer's Summary before any strike, and what the published report kept (after strikes and the cap). */
  draftSummary: string | null;
  narrative: string | null;
  /** Sentences in the draft Summary by the cap's own splitter, the cap, and the draft sentences the cap cut. */
  draftSentences: number;
  cap: number;
  cutSentences: string[];
  /** The count sentence ("N of the M names the desk covers had fresh news"), in the draft and in the PUBLISHED Summary. */
  countDraft: boolean;
  countPublished: boolean;
  /** Recap: the after-hours name the facts give (null if none), named in the draft / PUBLISHED Summary. */
  afterHours: string | null;
  afterHoursDraft: boolean;
  afterHoursPublished: boolean;
  /** The names the facts tell the Summary to name, and those the PUBLISHED Summary does not name at all. */
  named: string[];
  namedMissingPublished: string[];
  /** Recap: the allowed list, and shown names outside it in the draft Summary. */
  allowed: string[] | null;
  outsideList: string[];
  rankInSummary: boolean;
  zeroWord: boolean;
  judgementLines: Array<{ id: string; ticker: string | null; text: string; matched: string[]; research: string | null }>;
  writerCalls: number;
  writerErrors: number;
  checkerReplies: number;
  checkerErrors: number;
  costUsd: number;
  usage: Array<ReportModelUsage & { role: 'writer' | 'checker' }>;
}

function inputFor(db: MarketDatabase, kind: ReportKind, day: string, now: Date): WriterInputV6 | null {
  const read = readReportInputs(db, kind, day, RANGE, now);
  if (!read.ok) return null;
  const { inputs } = read;
  return {
    kind,
    range: RANGE,
    checkpoint: inputs.checkpoint,
    facts: inputs.facts,
    research: inputs.research,
    paths: inputs.paths,
    afterHoursTotals: inputs.afterHoursTotals,
    narrative: inputs.narrative,
  };
}

async function main() {
  if (process.argv[1] && !process.argv[1].endsWith('report-summary-length-check.ts')) return;
  const args = process.argv.slice(2);
  const [dbPath, out] = args;
  if (!dbPath || !out) throw new Error('usage: report-summary-length-check.ts <db> <out-dir> --key-file <path> [--dry]');
  const dry = args.includes('--dry');
  const keyFileAt = args.indexOf('--key-file');
  const keyFile = keyFileAt >= 0 ? args[keyFileAt + 1] : undefined;
  if (REPORT_WRITER_PROMPT_VERSION_V7 !== EXPECTED_VERSION) {
    throw new Error(`the v7 prompt is version ${REPORT_WRITER_PROMPT_VERSION_V7}, not ${EXPECTED_VERSION}; nothing run`);
  }
  fs.mkdirSync(out, { recursive: true });
  const config = readReportModelConfig();
  const luna = config.writerModel;
  let anthropicKey = '';
  if (!dry) {
    if (!config.apiKey) throw new Error('the OpenAI key is missing from the environment (run with --env-file); nothing run');
    if (!keyFile) throw new Error('--key-file is required for a paid run; nothing run');
    anthropicKey = readNamedKey(keyFile, 'tests-tmi');
  }
  if (!dry && tierOf(luna) !== 'luna') throw new Error(`the writer model ${luna} is not priced here; nothing run`);

  const NOW = new Date();
  const stat = fs.statSync(dbPath);
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
  const summary: string[] = [
    `store ${dbPath}: ${stat.size} bytes, mtime ${stat.mtime.toISOString()}; clock fixed at ${NOW.toISOString()}`,
    `days ${DAYS.join(', ')}; kinds ${KINDS.join(', ')}; range $1-$20; ${RUNS} runs per input`,
    `prompt v7 version ${REPORT_WRITER_PROMPT_VERSION_V7} (a recap in 2 writer calls, intraday in 1), writer ${luna}; checker ${OPUS} (Tests-TMI key, no fallback); every raw reply kept`,
    `stop $${STOP_AT}: a report launches only if spend + its worst case (recap $${reserveFor('PREMARKET').toFixed(4)}, intraday $${reserveFor('INTO_RTH').toFixed(4)}) fits${dry ? '; DRY: stub models, nothing spent' : ''}`,
    'every Summary measure on the PUBLISHED narrative (result.report.narrative), the draft beside it',
    '',
  ];
  const records: RunRecord[] = [];
  let spend = 0;

  async function one(kind: ReportKind, day: string, run: number, input: WriterInputV6): Promise<RunRecord> {
    const tag = `${day}-${kind}-v7-run${run}`;
    const usage: RunRecord['usage'] = [];
    const asWriter = (u: ReportModelUsage) => usage.push({ ...u, role: 'writer' });
    const asChecker = (u: ReportModelUsage) => usage.push({ ...u, role: 'checker' });
    const inner = dry ? stubWriter(input, run) : createReportModelsV6({ ...config, claudeChecker: null }, asWriter).writer;
    const writer = new HarnessWriter(inner, input);
    const checker = new KeptChecker(
      dry
        ? stubChecker()
        : new AnthropicReportModel({ apiKey: anthropicKey, model: OPUS, schema: VERDICT_SCHEMA_V6, timeoutMs: CLAUDE_CHECKER_TIMEOUT_MS, onUsage: asChecker }),
    );
    let draft: ReportDraft | null = null;
    let result: ReportRun | null = null;
    let error: string | null = null;
    try {
      result = await runReport(db, { kind, rangeId: '1-20', tradingDate: day, range: RANGE }, { writer, checker }, () => NOW, { draft: (d) => (draft = d) });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const strikes = (result?.diagnostics?.strikes ?? []).map((s) => ({ id: s.id, reason: s.reason, by: s.by, detail: s.detail }));
    const recap = isRecap(kind);
    const allowed = recap ? allowedOf(recapSummaryRule(input.narrative)) : null;
    const drafted = draft as ReportDraft | null;
    const draftSummary = drafted?.overall ?? null;
    const narrative = result?.status === 'PUBLISHED' ? result.report.narrative ?? null : null;
    const cap = capFor(kind);
    const draftSplit = draftSummary ? splitSentences(draftSummary) : [];
    const named = namedOf(input.narrative);
    const afterHours = recap ? input.narrative.afterHours?.ticker ?? null : null;
    const outsideList = recap && draftSummary
      ? input.facts.map((f) => f.ticker).filter((t) => !(allowed ?? []).includes(t) && names(draftSummary, t))
      : [];
    const record: RunRecord = {
      tag,
      kind,
      day,
      run,
      status: error ? 'ERROR' : result!.status === 'MISSED' ? `MISSED ${JSON.stringify(result!.cause)}` : 'PUBLISHED',
      error,
      lines: drafted ? draftLines(drafted).length : 0,
      struck: [...new Set(strikes.map((s) => s.id))],
      strikes,
      narrativeStruck: strikes.some((s) => s.id === 'O'),
      draftSummary,
      narrative,
      draftSentences: draftSplit.length,
      cap,
      cutSentences: draftSplit.slice(cap),
      countDraft: hasCount(draftSummary),
      countPublished: hasCount(narrative),
      afterHours,
      afterHoursDraft: afterHours !== null && names(draftSummary, afterHours),
      afterHoursPublished: afterHours !== null && names(narrative, afterHours),
      named,
      namedMissingPublished: narrative === null ? [] : named.filter((t) => !names(narrative, t)),
      allowed,
      outsideList,
      rankInSummary: recap && draftSummary !== null && /\branked\b|\brank\b/i.test(draftSummary),
      zeroWord: draftSummary !== null && /\bzero\b/i.test(draftSummary),
      judgementLines: drafted
        ? draftLines(drafted).flatMap((l) => {
            const matched = [...l.text.matchAll(JUDGEMENT)].map((m) => m[0]).filter((w) => !NOT_A_KIND.has(w.toLowerCase()));
            if (matched.length === 0) return [];
            const research = l.ticker ? input.research.get(l.ticker)?.catalyst.summary ?? null : null;
            return [{ id: l.id, ticker: l.ticker, text: l.text, matched, research }];
          })
        : [],
      writerCalls: writer.calls.length,
      writerErrors: writer.calls.filter((c) => c.error !== null).length,
      checkerReplies: checker.replies.length,
      checkerErrors: checker.replies.filter((r) => r.error !== null).length,
      costUsd: usage.reduce((sum, u) => sum + cost(u, u.role), 0),
      usage,
    };
    fs.writeFileSync(
      path.join(out, `${tag}.json`),
      JSON.stringify(
        {
          record,
          sentPrompts: writer.calls.map((c) => c.prompt),
          draft,
          rawWriterTexts: writer.calls.map((c) => c.raw),
          writerErrors: writer.calls.map((c) => c.error),
          mergedWriterReply: writer.merged,
          checkerReplies: checker.replies,
          result,
        },
        null,
        2,
      ),
    );
    return record;
  }

  const line = (r: RunRecord) =>
    `${r.tag}: ${r.error ? `ERROR ${r.error}` : r.status}; ${r.struck.length} of ${r.lines} lines struck${r.narrativeStruck ? ' (Summary struck)' : ''}; ` +
    `draft ${r.draftSentences} sentences (cap ${r.cap}); count sentence draft ${r.countDraft ? 'yes' : 'no'} PUBLISHED ${r.countPublished ? 'yes' : 'NO'}; ` +
    (r.afterHours ? `after-hours ${r.afterHours} draft ${r.afterHoursDraft ? 'yes' : 'no'} PUBLISHED ${r.afterHoursPublished ? 'yes' : 'NO'}; ` : '') +
    `named [${r.named.join(', ')}] missing from published [${r.namedMissingPublished.join(', ')}]; ` +
    (r.allowed ? `outside the list in the draft [${r.outsideList.join(', ')}]; rank ${r.rankInSummary ? 'YES' : 'no'}; ` : '') +
    `"zero" ${r.zeroWord ? 'YES' : 'no'}; judgement or kind lines ${r.judgementLines.length}; ` +
    `writer calls ${r.writerCalls} (errors ${r.writerErrors}); checker replies ${r.checkerReplies} (errors ${r.checkerErrors}); $${r.costUsd.toFixed(4)}; ` +
    `tokens ${r.usage.map((u) => `${u.role}:${u.model}:${u.inputTokens}/${u.outputTokens}`).join(' ')}`;

  let stopped: string | null = null;
  for (const day of DAYS) {
    for (const kind of KINDS) {
      const input = inputFor(db, kind, day, NOW);
      for (let run = 1; run <= RUNS; run += 1) {
        const tag = `${day}-${kind}-v7-run${run}`;
        if (stopped) {
          summary.push(`${tag}: NOT RUN, ${stopped}`);
          continue;
        }
        if (!input) {
          summary.push(`${tag}: NOT RUN, the inputs could not be read (MISSED at read)`);
          continue;
        }
        if (!dry && spend + reserveFor(kind) > STOP_AT) {
          summary.push(`${tag}: NOT RUN, spend $${spend.toFixed(4)} + worst case $${reserveFor(kind).toFixed(4)} exceeds the $${STOP_AT} stop`);
          continue;
        }
        const record = await one(kind, day, run, input);
        spend += record.costUsd;
        records.push(record);
        summary.push(line(record));
        if (!dry && records.length === 1 && record.error) stopped = 'the first report had an error (fail fast)';
      }
    }
    console.log(`${day}: spend $${spend.toFixed(4)}`);
  }

  const tally = (label: string, rows: RunRecord[]) => {
    const pub = rows.filter((r) => r.status === 'PUBLISHED');
    const withAh = pub.filter((r) => r.afterHours !== null);
    return [
      `${label}: run ${rows.length}; published ${pub.length}; Summary struck ${pub.filter((r) => r.narrativeStruck).length}; failed (MISSED or ERROR) ${rows.length - pub.length}`,
      `  count sentence: drafted ${rows.filter((r) => r.countDraft).length} of ${rows.filter((r) => r.draftSummary !== null).length}; PUBLISHED ${pub.filter((r) => r.countPublished).length} of ${pub.length}`,
      `  drafts over the cap: ${rows.filter((r) => r.draftSentences > r.cap).length} of ${rows.filter((r) => r.draftSummary !== null).length}`,
      ...(withAh.length > 0 || rows.some((r) => r.afterHours !== null)
        ? [`  after-hours line PUBLISHED where the facts give one: ${withAh.filter((r) => r.afterHoursPublished).length} of ${withAh.length}`]
        : []),
      `  published Summaries missing a named name altogether: ${pub.filter((r) => r.namedMissingPublished.length > 0).length} of ${pub.length}`,
      `  draft Summaries naming a name outside the list (recap): ${rows.filter((r) => r.outsideList.length > 0).length}; stating a rank (recap): ${rows.filter((r) => r.rankInSummary).length}; saying "zero": ${rows.filter((r) => r.zeroWord).length}`,
      `  drafted lines with a judgement word or a catalyst kind (read 107 a; each read by hand): ${rows.reduce((n, r) => n + r.judgementLines.length, 0)}`,
      `  writer calls that threw: ${rows.reduce((n, r) => n + r.writerErrors, 0)}; checker calls that threw: ${rows.reduce((n, r) => n + r.checkerErrors, 0)}`,
    ];
  };
  summary.push(
    '',
    ...tally('RECAPS (PREMARKET)', records.filter((r) => isRecap(r.kind))),
    ...tally('INTRADAY (INTO_RTH, INTO_POWER_HOUR, AFTER_HOURS)', records.filter((r) => !isRecap(r.kind))),
    `TOTAL reports run ${records.length} of ${DAYS.length * KINDS.length * RUNS}; spend $${spend.toFixed(4)}${dry ? ' (dry: stub models, nothing spent)' : ''}`,
  );
  fs.writeFileSync(path.join(out, 'summary.txt'), `${summary.join('\n')}\n`);
  fs.writeFileSync(path.join(out, 'records.json'), JSON.stringify(records, null, 2));
  console.log(`wrote ${out}; spend $${spend.toFixed(4)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
