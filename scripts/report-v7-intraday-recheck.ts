/**
 * THE v7 INTRADAY RE-CHECK (Integration's (C), his "no, everything gets done tonight", Integration chat uuid 69769171):
 * on 2026-10-14 every live v7 intraday report published with NO Summary (reports 45 to 47; Commercial read 131). This
 * measures the fix: v7 prompt version 11 (three Summary lines, Marketing f6562b63, Commercial read 132a) and the
 * UNFRAMED_PERCENT frame fix (read 131 item 1), on production a966a517's own intraday path (writerPromptFor sends the
 * intraday kinds to v7), checked by the checker that ships (Claude Opus 5.5 high, Tests-TMI key, no fallback).
 *
 * INPUTS: the three 10-14 live reports' own checkpoints (INTO_RTH, INTO_POWER_HOUR, AFTER_HOURS, from Ops's slim copy
 * slim-2026-10-14.db) and the 9 intraday inputs of the earlier re-checks (2026-10-02, 10-05, 10-06 from the 10-07 copy),
 * 3 runs each: 36 reports. EVERY SUMMARY MEASURE ON THE PUBLISHED NARRATIVE, the draft beside it; raw kept.
 * HARD STOP $8 per report as before (a report launches only if spend + its worst case fits). Spend needs his yes.
 *   node --env-file=../mointel/.env.local --import tsx scripts/report-v7-intraday-recheck.ts <store-10-07> <store-10-14> <out-dir> --key-file <path> [--dry]
 * --dry: stub models with PLANTED CONTROLS (run 1: a report label and a bare percent, which the rules strike; run 2: an
 * attributed growth percent and a change note in the sheet's frame, which must survive; run 3: a causal join and a change
 * note with "when", read 135's PUBLISHED measures' present case), no key, no spend.
 */
import fs from 'node:fs';
import path from 'node:path';

import { AnthropicReportModel, CLAUDE_CHECKER_MAX_TOKENS } from '../lib/desk/reports/anthropicReportModel';
import { draftLines, VERDICT_SCHEMA_V6 } from '../lib/desk/reports/check';
import type { CheckerModel } from '../lib/desk/reports/check';
import type { ReportKind } from '../lib/desk/reports/contract';
import type { NarrativeFacts } from '../lib/desk/reports/narrative';
import type { ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { readReportInputs, runReport, writerPromptFor } from '../lib/desk/reports/pipeline';
import type { ReportRun } from '../lib/desk/reports/pipeline';
import { CLAUDE_CHECKER_TIMEOUT_MS, createReportModelsV6 } from '../lib/desk/reports/runner';
import type { ReportDraft, ReportModel, WriterPrompt } from '../lib/desk/reports/writer';
import { REPORT_WRITER_PROMPT_VERSION_V7 } from '../lib/desk/reports/writerV7';
import { openDatabase } from '../lib/market/store/db';
import type { MarketDatabase } from '../lib/market/store/db';
import { readReportModelConfig } from '../lib/research/config';
import { readNamedKey } from './readNamedKey';

const RANGE = { min: 1, max: 20 };
const STOP_AT = 8;
const KINDS: readonly ReportKind[] = ['INTO_RTH', 'INTO_POWER_HOUR', 'AFTER_HOURS'];
const RUNS = 3;
const OPUS = 'claude-opus-5-5';
const EXPECTED_VERSION = 11;
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

const named = (facts: NarrativeFacts) => (facts.intradayNamed ?? []).map((m) => m.ticker);
const COUNT = (f: NarrativeFacts) => `Of the ${f.fresh.covered} names the desk covers, ${f.fresh.count} had fresh news in our sources.`;
/** --dry: run 1 plants what the rules must strike; run 2 plants what the fix must let through; run 3 is clean. */
function stubWriter(facts: NarrativeFacts, run: number): ReportModel {
  const leader = named(facts)[0] ?? 'AAA';
  const lines = (user: string) =>
    [...user.matchAll(/^([A-Z][A-Z.]{0,5}): ranked #/gm)].map((m, i) => ({
      ticker: m[1]!,
      // Run 1 plants read 107 (a)'s scan target in the first name line.
      text: run === 1 && i === 0 ? 'Planted control: a positive operating update.' : 'Dry run line.',
    }));
  const summary =
    run === 1
      ? `Intraday, ${leader} ranked first in this range, up 26 percent. ${COUNT(facts)}`
      : run === 2
        ? `${leader} ranked first in this range; the company reported revenue up 26 percent year over year, and it was down 3.2 percent since the previous checkpoint. ${COUNT(facts)}`
        : // Run 3 plants read 135's two PASS measures, which no rule strikes with the word list off: a causal join and a
          // change note with a "when" clause, so the published measures see a present case.
          `${leader} ranked first in this range, up 5 percent from the prior close after a contract award; it was up 2 percent since the previous checkpoint, when it printed a new high. ${COUNT(facts)}`;
  return { complete: async (prompt) => JSON.stringify({ narrative: summary, lines: lines(prompt.user) }) };
}
const stubChecker = (): CheckerModel => ({
  complete: async (prompt) =>
    JSON.stringify({
      verdicts: [...new Set(prompt.user.match(/^(?:O|S[0-9]+L[0-9]+)(?![A-Za-z0-9])/gm) ?? [])].map((id) => ({
        id, supported: true, note: '', advice: false, forecast: false, leansOnAnother: false, phrase: '',
      })),
    }),
});

const names = (text: string | null, ticker: string) =>
  text !== null && new RegExp(`(?<![A-Za-z0-9])${ticker.replace('.', '\\.')}(?![A-Za-z0-9])`).test(text);
const hasCount = (text: string | null) => text !== null && /names the desk covers/.test(text) && /fresh news/.test(text);
/** Commercial read 135 (c): a percent framed by a growth period, to be read by hand against the company's research. */
const GROWTH_PERCENT = /[^.;]*\b\d[\d,.]*\s+percent\b[^.;]*\b(?:year over year|year-over-year|from a year earlier|compared with the same quarter)\b[^.;]*/gi;
/** Commercial read 107 (a), across the name lines: a judgement word, or a classification of the news by kind. */
const JUDGEMENT = /\bpositive\b|\bnegative\b|\brather than an?\b[^.]*\bcatalyst\b|\boperating\b|\btransaction-development\b|\b[a-z-]+ catalyst\b/gi;
const NOT_A_KIND = new Set(['no catalyst', 'fresh catalyst']);
/** A report label used as one (read 131: "Intraday," copied into an AFTER_HOURS Summary). */
const LABEL = /\b(?:Intraday|Into the open|Into power hour|After hours)\s*[,:]/;
/** A change note with something added to it (read 131: "since the previous checkpoint, when it ..."). */
const NOTE_PLUS_WHEN = /since the previous checkpoint[^.;]*\bwhen\b/i;
/** A move joined to its news causally (the v6 rule's ban, now v7's third line): a move, then after / following / on. */
const CAUSAL_JOIN = /\b(?:up|down)\s+\d[\d,.]*\s+percent[^.;]*?\b(?:after|following|due to|because of|in response to|amid)\b/i;

interface RunRecord {
  tag: string;
  store: string;
  kind: ReportKind;
  day: string;
  run: number;
  status: string;
  error: string | null;
  narrativeStruck: boolean;
  summaryStrikes: Array<{ reason: string; by: string; detail: string }>;
  nameLinesStruck: number;
  lines: number;
  draftSummary: string | null;
  narrative: string | null;
  countPublished: boolean;
  firstRanked: string | null;
  firstRankedPublished: boolean;
  labelInDraft: boolean;
  noteWhenInDraft: boolean;
  causalJoinInDraft: boolean;
  /** Commercial read 135: (a) and (b) are PASS conditions on the PUBLISHED Summary; (c) growth-framed percents, by hand. */
  noteWhenPublished: boolean;
  causalJoinPublished: boolean;
  growthPercentsPublished: string[];
  /** Read 107 (a) across the published name lines, each hit with its ticker's research beside it, for the hand read. */
  judgementLines: Array<{ ticker: string | null; text: string; matched: string[]; research: string | null }>;
  writerCalls: number;
  checkerReplies: number;
  checkerErrors: number;
  costUsd: number;
  usage: Array<ReportModelUsage & { role: 'writer' | 'checker' }>;
}

async function main() {
  if (process.argv[1] && !process.argv[1].endsWith('report-v7-intraday-recheck.ts')) return;
  const args = process.argv.slice(2);
  const [oldStore, slimStore, out] = args;
  if (!oldStore || !slimStore || !out) throw new Error('usage: report-v7-intraday-recheck.ts <store-10-07> <store-10-14> <out-dir> --key-file <path> [--dry]');
  const dry = args.includes('--dry');
  const keyFileAt = args.indexOf('--key-file');
  const keyFile = keyFileAt >= 0 ? args[keyFileAt + 1] : undefined;
  if (Number(REPORT_WRITER_PROMPT_VERSION_V7) !== EXPECTED_VERSION) throw new Error(`the v7 prompt is version ${REPORT_WRITER_PROMPT_VERSION_V7}, not ${EXPECTED_VERSION}; nothing run`);
  for (const kind of KINDS) if (writerPromptFor(kind).family !== 'v7') throw new Error(`${kind} is not routed to v7 on this tree; nothing run`);
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
  const NOW = new Date();
  const plan: Array<{ store: string; db: MarketDatabase; days: string[] }> = [
    { store: slimStore, db: openDatabase(slimStore, { readonly: true, skipSchema: true }), days: ['2026-10-14'] },
    { store: oldStore, db: openDatabase(oldStore, { readonly: true, skipSchema: true }), days: ['2026-10-02', '2026-10-05', '2026-10-06'] },
  ];
  const summary: string[] = [
    ...plan.map((p) => { const s = fs.statSync(p.store); return `store ${p.store}: ${s.size} bytes, mtime ${s.mtime.toISOString()}; days ${p.days.join(', ')}`; }),
    `clock fixed at ${NOW.toISOString()}; kinds ${KINDS.join(', ')}; range $1-$20; ${RUNS} runs per input`,
    `prompt v7 version ${REPORT_WRITER_PROMPT_VERSION_V7}, writer ${luna}; checker ${OPUS} (Tests-TMI key, no fallback); every raw reply kept`,
    `stop $${STOP_AT}: a report launches only if spend + its worst case ($${RESERVE_PER_REPORT.toFixed(4)}) fits${dry ? '; DRY: stub models, nothing spent' : ''}`,
    'every Summary measure on the PUBLISHED narrative (result.report.narrative), the draft beside it',
    '',
  ];
  const records: RunRecord[] = [];
  let spend = 0;
  let stopped: string | null = null;

  for (const p of plan) {
    for (const day of p.days) {
      for (const kind of KINDS) {
        const read = readReportInputs(p.db, kind, day, RANGE, NOW);
        for (let run = 1; run <= RUNS; run += 1) {
          const tag = `${day}-${kind}-v7.${EXPECTED_VERSION}-run${run}`;
          if (stopped) { summary.push(`${tag}: NOT RUN, ${stopped}`); continue; }
          if (!read.ok) { summary.push(`${tag}: NOT RUN, inputs MISSED ${JSON.stringify(read.cause)}`); continue; }
          if (!dry && spend + RESERVE_PER_REPORT > STOP_AT) { summary.push(`${tag}: NOT RUN, spend $${spend.toFixed(4)} + worst case exceeds the $${STOP_AT} stop`); continue; }
          const facts = read.inputs.narrative;
          const usage: RunRecord['usage'] = [];
          const calls: KeptCall[] = [];
          const inner = dry ? stubWriter(facts, run) : createReportModelsV6({ ...config, claudeChecker: null }, (u) => usage.push({ ...u, role: 'writer' })).writer;
          const checker = new KeptChecker(
            dry ? stubChecker() : new AnthropicReportModel({ apiKey: anthropicKey, model: OPUS, schema: VERDICT_SCHEMA_V6, timeoutMs: CLAUDE_CHECKER_TIMEOUT_MS, onUsage: (u) => usage.push({ ...u, role: 'checker' }) }),
          );
          let draft: ReportDraft | null = null;
          let result: ReportRun | null = null;
          let error: string | null = null;
          try {
            result = await runReport(p.db, { kind, rangeId: '1-20', tradingDate: day, range: RANGE }, { writer: keeping(inner, calls), checker }, () => NOW, { draft: (d) => (draft = d) });
          } catch (e) {
            error = e instanceof Error ? e.message : String(e);
          }
          const drafted = draft as ReportDraft | null;
          const draftSummary = drafted?.overall ?? null;
          const narrative = result?.status === 'PUBLISHED' ? result.report.narrative ?? null : null;
          const strikes = result?.diagnostics?.strikes ?? [];
          const first = named(facts)[0] ?? null;
          const record: RunRecord = {
            tag,
            store: path.basename(p.store),
            kind,
            day,
            run,
            status: error ? 'ERROR' : result!.status === 'MISSED' ? `MISSED ${JSON.stringify(result!.cause)}` : 'PUBLISHED',
            error,
            narrativeStruck: strikes.some((s) => s.id === 'O'),
            summaryStrikes: strikes.filter((s) => s.id === 'O').map((s) => ({ reason: s.reason, by: s.by, detail: s.detail })),
            nameLinesStruck: new Set(strikes.filter((s) => s.id !== 'O').map((s) => s.id)).size,
            lines: drafted ? draftLines(drafted).length : 0,
            draftSummary,
            narrative,
            countPublished: hasCount(narrative),
            firstRanked: first,
            firstRankedPublished: first !== null && names(narrative, first),
            labelInDraft: draftSummary !== null && LABEL.test(draftSummary),
            noteWhenInDraft: draftSummary !== null && NOTE_PLUS_WHEN.test(draftSummary),
            causalJoinInDraft: draftSummary !== null && CAUSAL_JOIN.test(draftSummary),
            noteWhenPublished: narrative !== null && NOTE_PLUS_WHEN.test(narrative),
            causalJoinPublished: narrative !== null && CAUSAL_JOIN.test(narrative),
            growthPercentsPublished: narrative === null ? [] : [...narrative.matchAll(GROWTH_PERCENT)].map((m) => m[0].trim()),
            judgementLines:
              result?.status === 'PUBLISHED'
                ? result.report.sections.flatMap((section) =>
                    section.lines.flatMap((line) => {
                      const matched = [...line.text.matchAll(JUDGEMENT)].map((m) => m[0]).filter((w) => !NOT_A_KIND.has(w.toLowerCase()));
                      if (matched.length === 0) return [];
                      const research = line.ticker ? read.inputs.research.get(line.ticker)?.catalyst.summary ?? null : null;
                      return [{ ticker: line.ticker, text: line.text, matched, research }];
                    }),
                  )
                : [],
            writerCalls: calls.length,
            checkerReplies: checker.replies.length,
            checkerErrors: checker.replies.filter((r) => r.error !== null).length,
            costUsd: usage.reduce((sum, u) => sum + cost(u, u.role), 0),
            usage,
          };
          fs.writeFileSync(path.join(out, `${tag}.json`), JSON.stringify({ record, sentPrompts: calls.map((c) => c.prompt), rawWriterTexts: calls.map((c) => c.raw), draft, checkerReplies: checker.replies, result }, null, 2));
          spend += record.costUsd;
          records.push(record);
          summary.push(
            `${tag}: ${record.error ? `ERROR ${record.error}` : record.status}; Summary ${record.narrativeStruck ? `STRUCK (${record.summaryStrikes.map((s) => `${s.reason}/${s.by}`).join(', ')})` : 'published'}; ` +
              `count ${record.countPublished ? 'yes' : 'NO'}; first-ranked ${first ?? '-'} ${record.firstRankedPublished ? 'yes' : 'NO'}; ` +
              `label ${record.labelInDraft ? 'YES' : 'no'}; note+when draft ${record.noteWhenInDraft ? 'YES' : 'no'} PUBLISHED ${record.noteWhenPublished ? 'YES' : 'no'}; causal join draft ${record.causalJoinInDraft ? 'YES' : 'no'} PUBLISHED ${record.causalJoinPublished ? 'YES' : 'no'}; growth percents published ${record.growthPercentsPublished.length}; judgement lines ${record.judgementLines.length}; ` +
              `name lines struck ${record.nameLinesStruck} of ${Math.max(record.lines - 1, 0)}; $${record.costUsd.toFixed(4)}`,
          );
          if (!dry && records.length === 1 && record.error) stopped = 'the first report had an error (fail fast)';
        }
      }
      console.log(`${day}: spend $${spend.toFixed(4)}`);
    }
  }

  const tally = (label: string, rows: RunRecord[]) => {
    const pub = rows.filter((r) => r.status === 'PUBLISHED');
    const reasons = new Map<string, number>();
    for (const r of pub) for (const s of r.summaryStrikes) reasons.set(`${s.reason}/${s.by}`, (reasons.get(`${s.reason}/${s.by}`) ?? 0) + 1);
    return [
      `${label}: run ${rows.length}; published ${pub.length}; failed ${rows.length - pub.length}`,
      `  Summary STRUCK ${pub.filter((r) => r.narrativeStruck).length} of ${pub.length}; strike reasons ${[...reasons.entries()].map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`,
      `  UNFRAMED_PERCENT Summary strikes: ${pub.filter((r) => r.summaryStrikes.some((s) => s.reason === 'UNFRAMED_PERCENT')).length}`,
      `  count sentence PUBLISHED ${pub.filter((r) => r.countPublished).length} of ${pub.length}; first-ranked PUBLISHED ${pub.filter((r) => r.firstRankedPublished).length} of ${pub.filter((r) => r.firstRanked).length}`,
      `  drafts with a report label ${rows.filter((r) => r.labelInDraft).length}; a change note with "when" ${rows.filter((r) => r.noteWhenInDraft).length}; a causal join ${rows.filter((r) => r.causalJoinInDraft).length}`,
      `  PUBLISHED Summaries with a change note + "when" ${pub.filter((r) => r.noteWhenPublished).length}; with a causal join ${pub.filter((r) => r.causalJoinPublished).length} (read 135: both must be 0)`,
      `  growth-framed percents in published Summaries (each read by hand, read 135 c): ${pub.reduce((n, r) => n + r.growthPercentsPublished.length, 0)}`,
      `  published name lines with a judgement word or a news kind (read 107 a, each read by hand): ${pub.reduce((n, r) => n + r.judgementLines.length, 0)}`,
      `  checker calls that threw ${rows.reduce((n, r) => n + r.checkerErrors, 0)}; name lines struck ${rows.reduce((n, r) => n + r.nameLinesStruck, 0)}`,
    ];
  };
  summary.push(
    '',
    ...tally('LIVE 10-14 (reports 45 to 47 inputs)', records.filter((r) => r.day === '2026-10-14')),
    ...tally('EARLIER INPUTS (10-02, 10-05, 10-06)', records.filter((r) => r.day !== '2026-10-14')),
    ...tally('ALL', records),
    `TOTAL reports run ${records.length} of 36; spend $${spend.toFixed(4)}${dry ? ' (dry: stub models, nothing spent)' : ''}`,
  );
  fs.writeFileSync(path.join(out, 'summary.txt'), `${summary.join('\n')}\n`);
  fs.writeFileSync(path.join(out, 'records.json'), JSON.stringify(records, null, 2));
  console.log(`wrote ${out}; spend $${spend.toFixed(4)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
