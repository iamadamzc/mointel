/**
 * THE RECAP RE-CHECK (L13), SECOND RUN (his "a and b", queued input 20c5c7db, 2026-10-14T01:28:56.955Z, verified): v7
 * version 8 (RECAP_SHAPE_RULE added after the first run, 7f9210be, failed on the rank sentence). The first run was v7
 * version 7; its raw is docs/research/reports/recap-check/raw at 0374313a. Same harness otherwise:
 * v7 on the 3 stored evening recap (PREMARKET) inputs,
 * 3 runs each, 9 reports, written by luna (production's writer), CHECKED BY THE CHECKER THAT SHIPS (Claude Opus 5.5
 * high, word list off; checker release e56f27c0, merged on this branch). Built from the L12 harness
 * (report-writer-retest.ts, 2c005491); the prompt swap and the stop are its, unchanged.
 *
 * His yes: "yes to all three" (Integration chat 1f30f0a2, uuid 8e3e419f, 2026-10-13T21:36:56.972Z, verified at his
 * turn), item 2: "Put the new TV-voice report writer live, after fixing its recap summary? About a day of work and
 * $1.60." The stop he saw: "about $1.60 with a hard stop at $2.50" (same chat, 2026-10-13T20:52:10.751Z). HARD STOP $2.50.
 *
 * THE STOP ($2.50), PER REPORT, as L12: a report launches only if the spend so far plus ITS worst case (a luna writer
 * call at 10,000 in and 8,000 out, a Claude check at 40,000 in and the adapter's 32,000 max out) fits. A call with no
 * reported usage is charged its worst case. So the spend can never pass $2.50; a report the stop refuses is NOT RUN
 * and listed. No fallback: a failed Claude check is a MISSED report and counts against the result.
 *
 * NEW AGAINST L12 (Integration's condition, L12 lost them): EVERY RAW CHECKER REPLY IS KEPT, and a call that throws
 * keeps its error text. And the pass measure is read off the DRAFT, not only the checker: each ticker-like word in
 * the writer's Summary is compared with the list the prompt gave it (recapSummaryRule), so a Summary that names a
 * name outside its list is counted whether or not the checker struck it.
 *
 * Keys: the Tests-TMI Anthropic key read by name with readNamedKey, never printed; the desk's OpenAI key (luna) from
 * the environment (--env-file). Discipline: committed BEFORE any model call; the raw output committed BEFORE it is read.
 * Run from this worktree:
 *   node --env-file=../mointel/.env.local --import tsx scripts/report-writer-recap-check.ts <db> <out-dir> --key-file <path> [--dry]
 * --dry: stub models (no key, no spend) to prove the reads, the prompt equality and the output on the copy first.
 */
import fs from 'node:fs';
import path from 'node:path';

import { AnthropicReportModel, CLAUDE_CHECKER_MAX_TOKENS } from '../lib/desk/reports/anthropicReportModel';
import { draftLines, VERDICT_SCHEMA_V6 } from '../lib/desk/reports/check';
import type { CheckerModel } from '../lib/desk/reports/check';
import type { ReportKind } from '../lib/desk/reports/contract';
import type { ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { readReportInputs, runReport } from '../lib/desk/reports/pipeline';
import type { ReportRun } from '../lib/desk/reports/pipeline';
import { CLAUDE_CHECKER_TIMEOUT_MS, createReportModelsV6 } from '../lib/desk/reports/runner';
import type { ReportDraft, ReportModel, WriterPrompt } from '../lib/desk/reports/writer';
import { buildWriterPromptV6, type WriterInputV6 } from '../lib/desk/reports/writerV6';
import { buildWriterPromptV7, recapSummaryRule, REPORT_WRITER_PROMPT_VERSION_V7 } from '../lib/desk/reports/writerV7';
import { openDatabase } from '../lib/market/store/db';
import type { MarketDatabase } from '../lib/market/store/db';
import { readReportModelConfig } from '../lib/research/config';
import { readNamedKey } from './readNamedKey';

const RANGE = { min: 1, max: 20 };
const STOP_AT = 2.5;
const DAYS = ['2026-10-02', '2026-10-05', '2026-10-06'];
const KIND: ReportKind = 'PREMARKET';
const RUNS = 3;
const OPUS = 'claude-opus-5-5';
const EXPECTED_VERSION = 8;

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

function cost(usage: ReportModelUsage, role: 'writer' | 'checker'): number {
  const tier = tierOf(usage.model);
  if (!tier) return STOP_AT;
  if (usage.inputTokens === null || usage.outputTokens === null) return worstCase(role);
  return (usage.inputTokens * PRICE[tier]!.input + usage.outputTokens * PRICE[tier]!.output) / 1e6;
}

/**
 * The prompt swap, as L12: REQUIRES the pipeline's prompt to equal the v6 prompt the harness builds from the same
 * inputs (fails before any call otherwise), then sends v7 built from the same inputs.
 */
class V7Writer implements ReportModel {
  raw: string | null = null;
  sentPrompt: WriterPrompt | null = null;
  constructor(
    private readonly inner: ReportModel,
    private readonly input: WriterInputV6,
  ) {}
  async complete(prompt: WriterPrompt): Promise<string> {
    const expected = buildWriterPromptV6(this.input);
    if (prompt.system !== expected.system || prompt.user !== expected.user) {
      throw new Error('PROMPT_MISMATCH: the pipeline built a different v6 prompt than the harness; no call made');
    }
    this.sentPrompt = buildWriterPromptV7(this.input);
    this.raw = await this.inner.complete(this.sentPrompt);
    return this.raw;
  }
}

/** Keeps every checker reply verbatim, and the error text of a call that throws (L12 kept neither). */
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
 * --dry only: a PLANTED CONTROL, so the dry run proves each measure can see a present case: the Summary names one shown
 * ticker outside its list, says "positive" and carries the count sentence; the first name line classifies its news.
 * Expected on the dry: outside the list 9 of 9, at least 2 judgement lines a report, the count sentence 9 of 9, and
 * (second run) a rank word and the word "zero" in 9 of 9 Summaries.
 */
function stubWriter(): ReportModel {
  return {
    complete: async (prompt) => {
      const shown = [...prompt.user.matchAll(/^([A-Z][A-Z.]{0,5}): ranked #/gm)].map((m) => m[1]!);
      const allowed = allowedOf(/The Summary may name only these tickers: [^.]*\./.exec(prompt.user)?.[0] ?? '') ?? [];
      const outside = shown.find((t) => !allowed.includes(t)) ?? 'NONE';
      return JSON.stringify({
        narrative: `Planted control: ${outside} had a positive event and ranked first in this range. Zero gave the entire move back. Of the 12 names the desk covers, 2 had fresh news in our sources.`,
        lines: shown.map((ticker, i) => ({ ticker, text: i === 0 ? 'Planted control: an operating catalyst.' : 'Dry run line.' })),
      });
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

/** Commercial read 107 (a): a judgement word, or a classification of the news by kind (read 100's JONE example). */
const JUDGEMENT = /\bpositive\b|\bnegative\b|\brather than an?\b[^.]*\bcatalyst\b|\boperating\b|\btransaction-development\b|\b[a-z-]+ catalyst\b/gi;

/** The ruled state phrase and the news state, which are not a kind of catalyst (read 107 (3)). */
const NOT_A_KIND = new Set(['no catalyst', 'fresh catalyst']);

/** The allowed tickers, read back out of the rule the prompt carried (null for no rule; [] for "names no ticker"). */
function allowedOf(rule: string | null): string[] | null {
  if (rule === null) return null;
  const m = /may name only these tickers: ([^.]*)\./.exec(rule);
  return m ? m[1]!.split(', ') : [];
}

interface RunRecord {
  tag: string;
  day: string;
  run: number;
  status: string;
  error: string | null;
  lines: number;
  struck: string[];
  strikes: Array<{ id: string; reason: string; by: string; detail: string }>;
  narrativeStruck: boolean;
  /** The writer's Summary before any strike, and what the published report kept. */
  draftSummary: string | null;
  narrative: string | null;
  allowed: string[] | null;
  /** Names the writer was shown (its NAMES sheets) that its draft Summary names though the list does not allow them. */
  outsideList: string[];
  /**
   * Commercial read 107 (a): every drafted line that says "positive" or "negative", or classifies the news, with the
   * research summary of its ticker beside it, so strings 2 and 3 are read by hand against whether the research says it.
   */
  judgementLines: Array<{ id: string; ticker: string | null; text: string; matched: string[]; research: string | null }>;
  /** Commercial read 107 (b): the draft Summary still carries the count of covered names with fresh news. */
  countSentence: boolean;
  /** Second run: the draft Summary still states a rank (the first run's main failure, 5 of 9). */
  rankInSummary: boolean;
  /** Second run: the draft Summary says a count as the word "zero" (struck: countBefore has no "zero"). */
  zeroWord: boolean;
  checkerReplies: number;
  checkerErrors: number;
  costUsd: number;
  usage: Array<ReportModelUsage & { role: 'writer' | 'checker' }>;
}

function inputFor(db: MarketDatabase, day: string, now: Date): WriterInputV6 | null {
  const read = readReportInputs(db, KIND, day, RANGE, now);
  if (!read.ok) return null;
  const { inputs } = read;
  return {
    kind: KIND,
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
  if (process.argv[1] && !process.argv[1].endsWith('report-writer-recap-check.ts')) return;
  const args = process.argv.slice(2);
  const [dbPath, out] = args;
  if (!dbPath || !out) throw new Error('usage: report-writer-recap-check.ts <db> <out-dir> --key-file <path> [--dry]');
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

  // One fixed clock for the whole run: the pipeline's reads and the harness's reads must see the same moment.
  const NOW = new Date();
  const stat = fs.statSync(dbPath);
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
  const reserve = worstCase('writer') + worstCase('checker');
  const summary: string[] = [
    `store ${dbPath}: ${stat.size} bytes, mtime ${stat.mtime.toISOString()}; clock fixed at ${NOW.toISOString()}`,
    `days ${DAYS.join(', ')}; kind ${KIND}; range $1-$20; ${RUNS} runs per input`,
    `prompt v7 version ${REPORT_WRITER_PROMPT_VERSION_V7}, writer ${luna}; checker ${OPUS} (Tests-TMI key, no fallback); every raw checker reply kept`,
    `stop $${STOP_AT}: a report launches only if spend + its worst case ($${reserve.toFixed(4)}) fits${dry ? '; DRY: stub models, nothing spent' : ''}`,
    '',
  ];
  const records: RunRecord[] = [];
  let spend = 0;

  async function one(day: string, run: number, input: WriterInputV6): Promise<RunRecord> {
    const tag = `${day}-${KIND}-v7-run${run}`;
    const usage: RunRecord['usage'] = [];
    const asWriter = (u: ReportModelUsage) => usage.push({ ...u, role: 'writer' });
    const asChecker = (u: ReportModelUsage) => usage.push({ ...u, role: 'checker' });
    const inner = dry ? stubWriter() : createReportModelsV6({ ...config, claudeChecker: null }, asWriter).writer;
    const writer = new V7Writer(inner, input);
    const checker = new KeptChecker(
      dry
        ? stubChecker()
        : new AnthropicReportModel({ apiKey: anthropicKey, model: OPUS, schema: VERDICT_SCHEMA_V6, timeoutMs: CLAUDE_CHECKER_TIMEOUT_MS, onUsage: asChecker }),
    );
    let draft: ReportDraft | null = null;
    let result: ReportRun | null = null;
    let error: string | null = null;
    try {
      result = await runReport(db, { kind: KIND, rangeId: '1-20', tradingDate: day, range: RANGE }, { writer, checker }, () => NOW, { draft: (d) => (draft = d) });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const strikes = (result?.diagnostics?.strikes ?? []).map((s) => ({ id: s.id, reason: s.reason, by: s.by, detail: s.detail }));
    const allowed = allowedOf(recapSummaryRule(input.narrative));
    const drafted = draft as ReportDraft | null;
    const draftSummary = drafted?.overall ?? null;
    const shown = input.facts.map((f) => f.ticker);
    const outsideList = draftSummary
      ? shown.filter((t) => !(allowed ?? []).includes(t) && new RegExp(`(?<![A-Za-z0-9])${t.replace('.', '\\.')}(?![A-Za-z0-9])`).test(draftSummary))
      : [];
    const record: RunRecord = {
      tag,
      day,
      run,
      status: error ? 'ERROR' : result!.status === 'MISSED' ? `MISSED ${JSON.stringify(result!.cause)}` : 'PUBLISHED',
      error,
      lines: drafted ? draftLines(drafted).length : 0,
      struck: [...new Set(strikes.map((s) => s.id))],
      strikes,
      narrativeStruck: strikes.some((s) => s.id === 'O'),
      draftSummary,
      narrative: result?.status === 'PUBLISHED' ? result.report.narrative ?? null : null,
      allowed,
      outsideList,
      judgementLines: drafted
        ? draftLines(drafted).flatMap((l) => {
            const matched = [...l.text.matchAll(JUDGEMENT)].map((m) => m[0]).filter((w) => !NOT_A_KIND.has(w.toLowerCase()));
            if (matched.length === 0) return [];
            const research = l.ticker ? input.research.get(l.ticker)?.catalyst.summary ?? null : null;
            return [{ id: l.id, ticker: l.ticker, text: l.text, matched, research }];
          })
        : [],
      countSentence: draftSummary !== null && /names the desk covers/.test(draftSummary) && /fresh news/.test(draftSummary),
      rankInSummary: draftSummary !== null && /\branked\b|\brank\b/i.test(draftSummary),
      zeroWord: draftSummary !== null && /\bzero\b/i.test(draftSummary),
      checkerReplies: checker.replies.length,
      checkerErrors: checker.replies.filter((r) => r.error !== null).length,
      costUsd: usage.reduce((sum, u) => sum + cost(u, u.role), 0),
      usage,
    };
    fs.writeFileSync(
      path.join(out, `${tag}.json`),
      JSON.stringify({ record, sentPrompt: writer.sentPrompt, draft, rawWriterText: writer.raw, checkerReplies: checker.replies, result }, null, 2),
    );
    return record;
  }

  const line = (r: RunRecord) =>
    `${r.tag}: ${r.error ? `ERROR ${r.error}` : r.status}; ${r.struck.length} of ${r.lines} lines struck${r.narrativeStruck ? ' (Summary struck)' : ''}; ` +
    `allowed [${(r.allowed ?? []).join(', ')}]; outside the list in the draft Summary [${r.outsideList.join(', ')}]; ` +
    `judgement or kind lines ${r.judgementLines.length}; count sentence ${r.countSentence ? 'yes' : 'NO'}; ` +
    `rank in Summary ${r.rankInSummary ? 'YES' : 'no'}; "zero" ${r.zeroWord ? 'YES' : 'no'}; ` +
    `checker replies ${r.checkerReplies} (errors ${r.checkerErrors}); $${r.costUsd.toFixed(4)}; ` +
    `tokens ${r.usage.map((u) => `${u.role}:${u.model}:${u.inputTokens}/${u.outputTokens}`).join(' ')}`;

  let stopped: string | null = null;
  for (const day of DAYS) {
    const input = inputFor(db, day, NOW);
    for (let run = 1; run <= RUNS; run += 1) {
      const tag = `${day}-${KIND}-v7-run${run}`;
      if (stopped) {
        summary.push(`${tag}: NOT RUN, ${stopped}`);
        continue;
      }
      if (!input) {
        summary.push(`${tag}: NOT RUN, the inputs could not be read (MISSED at read)`);
        continue;
      }
      if (!dry && spend + reserve > STOP_AT) {
        summary.push(`${tag}: NOT RUN, spend $${spend.toFixed(4)} + worst case $${reserve.toFixed(4)} exceeds the $${STOP_AT} stop`);
        continue;
      }
      const record = await one(day, run, input);
      spend += record.costUsd;
      records.push(record);
      summary.push(line(record));
      if (!dry && records.length === 1 && record.error) stopped = 'the first report had an error (fail fast)';
    }
    console.log(`${day} ${KIND}: spend $${spend.toFixed(4)}`);
  }

  const published = records.filter((r) => r.status === 'PUBLISHED');
  summary.push(
    '',
    `reports run ${records.length} of ${DAYS.length * RUNS}; published ${published.length}; Summary struck ${published.filter((r) => r.narrativeStruck).length}`,
    `draft Summaries naming a name outside the list: ${records.filter((r) => r.outsideList.length > 0).length} of ${records.filter((r) => r.draftSummary !== null).length}`,
    `drafted lines with a judgement word or a catalyst kind (read 107 a; each read by hand): ${records.reduce((n, r) => n + r.judgementLines.length, 0)}`,
    `draft Summaries with the covered-names count sentence (read 107 b): ${records.filter((r) => r.countSentence).length} of ${records.filter((r) => r.draftSummary !== null).length}`,
    `draft Summaries stating a rank: ${records.filter((r) => r.rankInSummary).length} of ${records.filter((r) => r.draftSummary !== null).length}; saying "zero": ${records.filter((r) => r.zeroWord).length}`,
    `checker calls that threw: ${records.reduce((n, r) => n + r.checkerErrors, 0)}; reports MISSED or ERROR: ${records.length - published.length}`,
    `TOTAL spend $${spend.toFixed(4)}${dry ? ' (dry: stub models, nothing spent)' : ''}`,
  );
  fs.writeFileSync(path.join(out, 'summary.txt'), `${summary.join('\n')}\n`);
  fs.writeFileSync(path.join(out, 'records.json'), JSON.stringify(records, null, 2));
  console.log(`wrote ${out}; spend $${spend.toFixed(4)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
