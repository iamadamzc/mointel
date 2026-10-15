/**
 * THE v13 RE-CHECK (his "b", Integration chat uuid 65ae2fbc: "one more instruction plus a short re-test, then ship"; about
 * $1.80, HARD STOP $4). The v11 re-check (56e1a17a) struck 6 of 36 Summaries, five of them for restating another name's
 * change note (Commercial read 139), and found the desk's own words ("the bundle", "supplied", "excerpts", "SEC-only")
 * in 43 of 432 published name lines. v7 version 13 adds two lines for those (Marketing c8de2a3f, Commercial read 140a).
 * This re-runs, on the tree that would ship (frame fix + v13 + the counterparty rule, checker prompt V6 17), production's
 * own intraday path with the checker that ships (Claude Opus 5.5 high, Tests-TMI key, no fallback).
 *
 * INPUTS: the 3 inputs whose Summaries were struck in the v11 re-check (2026-10-02 INTO_RTH and INTO_POWER_HOUR, 2026-10-06
 * INTO_POWER_HOUR; the 10-07 copy), 3 runs each; and 6 others once each for the plain-words line (Commercial's advice,
 * Integration ADOPTED): the three live 10-14 inputs (slim copy) and the three earlier inputs with the most such lines in
 * the v11 raw (2026-10-06 INTO_RTH, 2026-10-05 INTO_RTH, 2026-10-06 AFTER_HOURS). 15 reports. EVERY MEASURE ON THE
 * PUBLISHED REPORT, the draft beside it; raw kept. A report launches only if spend + its worst case fits the $4 stop.
 *   node --env-file=../mointel/.env.local --import tsx scripts/report-v13-recheck.ts <store-10-07> <store-10-14> <out-dir> --key-file <path> [--dry]
 * --dry: stub models with PLANTED CONTROLS, no key, no spend. Run 1 plants a Summary sentence restating a board name's
 * note that the narrative facts do not name, and a name line with "the bundle" (both measures' present case); run 2 plants
 * a line saying "company filings only" for a name whose research has an unknown (the disclosure measure's present case).
 */
import fs from 'node:fs';
import path from 'node:path';

import { AnthropicReportModel, CLAUDE_CHECKER_MAX_TOKENS } from '../lib/desk/reports/anthropicReportModel';
import { draftLines, namedTickers, REPORT_CHECKER_PROMPT_VERSION_V6, VERDICT_SCHEMA_V6 } from '../lib/desk/reports/check';
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
const STOP_AT = 4;
const OPUS = 'claude-opus-5-5';
const EXPECTED_VERSION = 13;
const EXPECTED_CHECKER = 17;
/** The inputs: [store, day, kind, runs]. 'old' is the 10-07 copy, 'slim' Ops's 10-14 copy. */
const PLAN: ReadonlyArray<readonly ['old' | 'slim', string, ReportKind, number]> = [
  ['old', '2026-10-02', 'INTO_RTH', 3],
  ['old', '2026-10-02', 'INTO_POWER_HOUR', 3],
  ['old', '2026-10-06', 'INTO_POWER_HOUR', 3],
  ['slim', '2026-10-14', 'INTO_RTH', 1],
  ['slim', '2026-10-14', 'INTO_POWER_HOUR', 1],
  ['slim', '2026-10-14', 'AFTER_HOURS', 1],
  ['old', '2026-10-06', 'INTO_RTH', 1],
  ['old', '2026-10-05', 'INTO_RTH', 1],
  ['old', '2026-10-06', 'AFTER_HOURS', 1],
];
const STRUCK_IN_V11 = new Set(['2026-10-02 INTO_RTH', '2026-10-02 INTO_POWER_HOUR', '2026-10-06 INTO_POWER_HOUR']);
const TOTAL = PLAN.reduce((n, p) => n + p[3], 0);
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
const move = (f: NarrativeFacts) => {
  const pct = f.intradayNamed?.[0]?.percentChange ?? 0;
  return `${pct < 0 ? 'down' : 'up'} ${Math.round(Math.abs(pct))} percent`;
};
/** --dry: run 1 plants another board name's note in the Summary and "the bundle" in a line; run 2 plants the disclosure. */
function stubWriter(facts: NarrativeFacts, run: number, other: string | null, withUnknown: string | null): ReportModel {
  const leader = named(facts)[0] ?? 'AAA';
  const lines = (user: string) =>
    [...user.matchAll(/^([A-Z][A-Z.]{0,5}): ranked #/gm)].map((m, i) => ({
      ticker: m[1]!,
      text:
        run === 1 && i === 0
          ? 'Planted control: no fresh catalyst was established in the bundle.'
          : run === 2 && m[1] === withUnknown
            ? 'Planted control: our search covered company filings only.'
            : 'Dry run line.',
    }));
  const summary =
    run === 1 && other
      ? `${leader} ranked first in this range, ${move(facts)} from the prior close. ${other} printed a new high. ${COUNT(facts)}`
      : `${leader} ranked first in this range, ${move(facts)} from the prior close. ${COUNT(facts)}`;
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
/**
 * The desk's own words for its material (v13's second line; Commercial reads 139 and 140a). "our evidence" is the approved
 * specimen's and is counted apart, never here. Every hit is listed for the hand read, since a word like "supplied" can be
 * a company's own ("the company supplied units").
 */
const PIPELINE = /\bthe bundle\b|\bbundle\b|\bsupplied\b|\bcollected (?:sources|evidence|material)\b|\bthe evidence\b|\bexcerpts?\b|\bSEC-only\b/gi;
const OUR_EVIDENCE = /\bour evidence\b/i;
const FILINGS_ONLY = /\bcompany filings only\b/i;
/** Research whose unknowns carry the desk's own words, or say coverage was filings only: the lines the disclosure check reads. */
const UNKNOWN_SOURCE = /\bbundle\b|\bsupplied\b|\bcollected\b|\bexcerpts?\b|\bSEC-only\b|\bfilings only\b|\bonly SEC\b/i;
/** Unknowns saying the catalyst search covered filings only: the lines rule 5's hand read covers (11 in the dry). */
const FILINGS_ONLY_SOURCE = /\bSEC-only\b|\bfilings only\b|\bonly SEC\b|\bnon-SEC\b|\bno company IR\b/i;
const LABEL = /\b(?:Intraday|Into the open|Into power hour|After hours)\s*[,:]/;
const NOTE_PLUS_WHEN = /since the previous checkpoint[^.;]*\bwhen\b/i;
const CAUSAL_JOIN = /\b(?:up|down)\s+\d[\d,.]*\s+percent[^.;]*?\b(?:after|following|due to|because of|in response to|amid)\b/i;

interface RunRecord {
  tag: string;
  store: string;
  kind: ReportKind;
  day: string;
  run: number;
  struckInV11: boolean;
  status: string;
  error: string | null;
  narrativeStruck: boolean;
  summaryStrikes: Array<{ reason: string; by: string; detail: string }>;
  nameLinesStruck: number;
  lines: number;
  draftSummary: string | null;
  narrative: string | null;
  /** v13 line 1: board tickers the Summary names that the narrative facts do not (draft, and published). */
  otherNamesInDraft: string[];
  otherNamesPublished: string[];
  countPublished: boolean;
  firstRanked: string | null;
  firstRankedPublished: boolean;
  labelInDraft: boolean;
  noteWhenPublished: boolean;
  causalJoinPublished: boolean;
  /** v13 line 2, on the PUBLISHED report: every line (and the Summary, ticker 'O') with a pipeline word. */
  pipelinePublished: Array<{ ticker: string | null; text: string; matched: string[] }>;
  pipelineInDraft: number;
  ourEvidencePublished: number;
  /** The disclosure's substance (read 140a): each published line whose research unknowns carry such words, for the hand read. */
  disclosureLines: Array<{ ticker: string | null; text: string; filingsOnly: boolean; companyFilingsOnly: boolean; unknowns: string[] }>;
  publishedLines: number;
  checkerErrors: number;
  costUsd: number;
  usage: Array<ReportModelUsage & { role: 'writer' | 'checker' }>;
}

async function main() {
  if (process.argv[1] && !process.argv[1].endsWith('report-v13-recheck.ts')) return;
  const args = process.argv.slice(2);
  const [oldStore, slimStore, out] = args;
  if (!oldStore || !slimStore || !out) throw new Error('usage: report-v13-recheck.ts <store-10-07> <store-10-14> <out-dir> --key-file <path> [--dry]');
  const dry = args.includes('--dry');
  const keyFileAt = args.indexOf('--key-file');
  const keyFile = keyFileAt >= 0 ? args[keyFileAt + 1] : undefined;
  if (Number(REPORT_WRITER_PROMPT_VERSION_V7) !== EXPECTED_VERSION) throw new Error(`the v7 prompt is version ${REPORT_WRITER_PROMPT_VERSION_V7}, not ${EXPECTED_VERSION}; nothing run`);
  if (Number(REPORT_CHECKER_PROMPT_VERSION_V6) !== EXPECTED_CHECKER) throw new Error(`the checker prompt is ${REPORT_CHECKER_PROMPT_VERSION_V6}, not ${EXPECTED_CHECKER}; nothing run`);
  for (const [, , kind] of PLAN) if (writerPromptFor(kind).family !== 'v7') throw new Error(`${kind} is not routed to v7 on this tree; nothing run`);
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
  const stores: Record<'old' | 'slim', { file: string; db: MarketDatabase }> = {
    old: { file: oldStore, db: openDatabase(oldStore, { readonly: true, skipSchema: true }) },
    slim: { file: slimStore, db: openDatabase(slimStore, { readonly: true, skipSchema: true }) },
  };
  const summary: string[] = [
    ...Object.values(stores).map((s) => { const st = fs.statSync(s.file); return `store ${s.file}: ${st.size} bytes, mtime ${st.mtime.toISOString()}`; }),
    `clock fixed at ${NOW.toISOString()}; range $1-$20; inputs ${PLAN.map(([, d, k, n]) => `${d} ${k} x${n}`).join(', ')}`,
    `prompt v7 version ${REPORT_WRITER_PROMPT_VERSION_V7}, checker prompt V6 ${REPORT_CHECKER_PROMPT_VERSION_V6}, writer ${luna}; checker ${OPUS} (Tests-TMI key, no fallback); every raw reply kept`,
    `stop $${STOP_AT}: a report launches only if spend + its worst case ($${RESERVE_PER_REPORT.toFixed(4)}) fits${dry ? '; DRY: stub models, nothing spent' : ''}`,
    'every measure on the PUBLISHED report, the draft beside it',
    '',
  ];
  const records: RunRecord[] = [];
  let spend = 0;
  let stopped: string | null = null;

  for (const [which, day, kind, runs] of PLAN) {
    const { file, db } = stores[which];
    const read = readReportInputs(db, kind, day, RANGE, NOW);
    for (let run = 1; run <= runs; run += 1) {
      const tag = `${day}-${kind}-v7.${EXPECTED_VERSION}-run${run}`;
      if (stopped) { summary.push(`${tag}: NOT RUN, ${stopped}`); continue; }
      if (!read.ok) { summary.push(`${tag}: NOT RUN, inputs MISSED ${JSON.stringify(read.cause)}`); continue; }
      if (!dry && spend + RESERVE_PER_REPORT > STOP_AT) { summary.push(`${tag}: NOT RUN, spend $${spend.toFixed(4)} + worst case exceeds the $${STOP_AT} stop`); continue; }
      const facts = read.inputs.narrative;
      const allowed = namedTickers(facts);
      const board = read.inputs.facts.map((f) => f.ticker);
      const others = board.filter((t) => !allowed.has(t));
      const withUnknown = board.find((t) => (read.inputs.research.get(t)?.catalyst.unknowns.length ?? 0) > 0) ?? null;
      const usage: RunRecord['usage'] = [];
      const calls: KeptCall[] = [];
      const inner = dry ? stubWriter(facts, run, others[0] ?? null, withUnknown) : createReportModelsV6({ ...config, claudeChecker: null }, (u) => usage.push({ ...u, role: 'writer' })).writer;
      const checker = new KeptChecker(
        dry ? stubChecker() : new AnthropicReportModel({ apiKey: anthropicKey, model: OPUS, schema: VERDICT_SCHEMA_V6, timeoutMs: CLAUDE_CHECKER_TIMEOUT_MS, onUsage: (u) => usage.push({ ...u, role: 'checker' }) }),
      );
      let draft: ReportDraft | null = null;
      let result: ReportRun | null = null;
      let error: string | null = null;
      try {
        result = await runReport(db, { kind, rangeId: '1-20', tradingDate: day, range: RANGE }, { writer: keeping(inner, calls), checker }, () => NOW, { draft: (d) => (draft = d) });
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
      const drafted = draft as ReportDraft | null;
      const draftSummary = drafted?.overall ?? null;
      const published = result?.status === 'PUBLISHED' ? result.report : null;
      const narrative = published?.narrative ?? null;
      const strikes = result?.diagnostics?.strikes ?? [];
      const first = named(facts)[0] ?? null;
      const pubLines = published ? published.sections.flatMap((s) => s.lines) : [];
      const pipelineHits = (text: string) => [...text.matchAll(PIPELINE)].map((m) => m[0]);
      const pipelinePublished = [
        ...(narrative && pipelineHits(narrative).length > 0 ? [{ ticker: 'O', text: narrative, matched: pipelineHits(narrative) }] : []),
        ...pubLines.filter((l) => pipelineHits(l.text).length > 0).map((l) => ({ ticker: l.ticker, text: l.text, matched: pipelineHits(l.text) })),
      ];
      const draftTexts = drafted ? [drafted.overall ?? '', ...draftLines(drafted).map((l) => l.text)] : [];
      const record: RunRecord = {
        tag,
        store: path.basename(file),
        kind,
        day,
        run,
        struckInV11: STRUCK_IN_V11.has(`${day} ${kind}`),
        status: error ? 'ERROR' : result!.status === 'MISSED' ? `MISSED ${JSON.stringify(result!.cause)}` : 'PUBLISHED',
        error,
        narrativeStruck: strikes.some((s) => s.id === 'O'),
        summaryStrikes: strikes.filter((s) => s.id === 'O').map((s) => ({ reason: s.reason, by: s.by, detail: s.detail })),
        nameLinesStruck: new Set(strikes.filter((s) => s.id !== 'O').map((s) => s.id)).size,
        lines: drafted ? draftLines(drafted).length : 0,
        draftSummary,
        narrative,
        otherNamesInDraft: others.filter((t) => names(draftSummary, t)),
        otherNamesPublished: others.filter((t) => names(narrative, t)),
        countPublished: hasCount(narrative),
        firstRanked: first,
        firstRankedPublished: first !== null && names(narrative, first),
        labelInDraft: draftSummary !== null && LABEL.test(draftSummary),
        noteWhenPublished: narrative !== null && NOTE_PLUS_WHEN.test(narrative),
        causalJoinPublished: narrative !== null && CAUSAL_JOIN.test(narrative),
        pipelinePublished,
        pipelineInDraft: draftTexts.filter((t) => pipelineHits(t).length > 0).length,
        ourEvidencePublished: [narrative ?? '', ...pubLines.map((l) => l.text)].filter((t) => OUR_EVIDENCE.test(t)).length,
        disclosureLines: pubLines.flatMap((l) => {
          const unknowns = l.ticker ? read.inputs.research.get(l.ticker)?.catalyst.unknowns ?? [] : [];
          return unknowns.some((u) => UNKNOWN_SOURCE.test(u)) ? [{ ticker: l.ticker, text: l.text, filingsOnly: unknowns.some((u) => FILINGS_ONLY_SOURCE.test(u)), companyFilingsOnly: FILINGS_ONLY.test(l.text), unknowns }] : [];
        }),
        publishedLines: pubLines.length,
        checkerErrors: checker.replies.filter((r) => r.error !== null).length,
        costUsd: usage.reduce((sum, u) => sum + cost(u, u.role), 0),
        usage,
      };
      fs.writeFileSync(path.join(out, `${tag}.json`), JSON.stringify({ record, sentPrompts: calls.map((c) => c.prompt), rawWriterTexts: calls.map((c) => c.raw), draft, checkerReplies: checker.replies, result }, null, 2));
      spend += record.costUsd;
      records.push(record);
      summary.push(
        `${tag}: ${record.error ? `ERROR ${record.error}` : record.status}; Summary ${record.narrativeStruck ? `STRUCK (${record.summaryStrikes.map((s) => `${s.reason}/${s.by}`).join(', ')})` : 'published'}; ` +
          `other names draft [${record.otherNamesInDraft.join(' ')}] PUBLISHED [${record.otherNamesPublished.join(' ')}]; count ${record.countPublished ? 'yes' : 'NO'}; first-ranked ${first ?? '-'} ${record.firstRankedPublished ? 'yes' : 'NO'}; ` +
          `pipeline words: draft texts ${record.pipelineInDraft}, PUBLISHED ${record.pipelinePublished.length}; disclosure lines ${record.disclosureLines.length} (company filings only ${record.disclosureLines.filter((d) => d.companyFilingsOnly).length}); ` +
          `name lines struck ${record.nameLinesStruck} of ${Math.max(record.lines - 1, 0)}; $${record.costUsd.toFixed(4)}`,
      );
      if (!dry && records.length === 1 && record.error) stopped = 'the first report had an error (fail fast)';
    }
    console.log(`${day} ${kind}: spend $${spend.toFixed(4)}`);
  }

  const tally = (label: string, rows: RunRecord[]) => {
    const pub = rows.filter((r) => r.status === 'PUBLISHED');
    const reasons = new Map<string, number>();
    for (const r of pub) for (const s of r.summaryStrikes) reasons.set(`${s.reason}/${s.by}`, (reasons.get(`${s.reason}/${s.by}`) ?? 0) + 1);
    return [
      `${label}: run ${rows.length}; published ${pub.length}; failed ${rows.length - pub.length}`,
      `  Summary STRUCK ${pub.filter((r) => r.narrativeStruck).length} of ${pub.length}; strike reasons ${[...reasons.entries()].map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`,
      `  Summaries naming a board name the facts do not: drafts ${rows.filter((r) => r.otherNamesInDraft.length > 0).length}, PUBLISHED ${pub.filter((r) => r.otherNamesPublished.length > 0).length}`,
      `  UNFRAMED_PERCENT Summary strikes ${pub.filter((r) => r.summaryStrikes.some((s) => s.reason === 'UNFRAMED_PERCENT')).length}; labels in drafts ${rows.filter((r) => r.labelInDraft).length}; PUBLISHED note+when ${pub.filter((r) => r.noteWhenPublished).length}; PUBLISHED causal join ${pub.filter((r) => r.causalJoinPublished).length}`,
      `  count sentence PUBLISHED ${pub.filter((r) => r.countPublished).length} of ${pub.length}; first-ranked PUBLISHED ${pub.filter((r) => r.firstRankedPublished).length} of ${pub.filter((r) => r.firstRanked).length}`,
      `  pipeline words: PUBLISHED lines ${pub.reduce((n, r) => n + r.pipelinePublished.length, 0)} of ${pub.reduce((n, r) => n + r.publishedLines + 1, 0)} (Summaries included); draft texts ${rows.reduce((n, r) => n + r.pipelineInDraft, 0)}; "our evidence" (allowed, counted apart) ${pub.reduce((n, r) => n + r.ourEvidencePublished, 0)}`,
      `  disclosure lines (research unknowns carry such words) ${pub.reduce((n, r) => n + r.disclosureLines.length, 0)}; of them FILINGS-ONLY (rule 5, each read by hand) ${pub.reduce((n, r) => n + r.disclosureLines.filter((d) => d.filingsOnly).length, 0)}, saying "company filings only" ${pub.reduce((n, r) => n + r.disclosureLines.filter((d) => d.filingsOnly && d.companyFilingsOnly).length, 0)}; any line saying it ${pub.reduce((n, r) => n + r.disclosureLines.filter((d) => d.companyFilingsOnly).length, 0)}`,
      `  checker calls that threw ${rows.reduce((n, r) => n + r.checkerErrors, 0)}; name lines struck ${rows.reduce((n, r) => n + r.nameLinesStruck, 0)}`,
    ];
  };
  summary.push(
    '',
    ...tally('STRUCK IN v11 (10-02 INTO_RTH, 10-02 INTO_POWER_HOUR, 10-06 INTO_POWER_HOUR; x3)', records.filter((r) => r.struckInV11)),
    ...tally('OTHERS (x1)', records.filter((r) => !r.struckInV11)),
    ...tally('ALL', records),
    `TOTAL reports run ${records.length} of ${TOTAL}; spend $${spend.toFixed(4)}${dry ? ' (dry: stub models, nothing spent)' : ''}`,
  );
  fs.writeFileSync(path.join(out, 'summary.txt'), `${summary.join('\n')}\n`);
  fs.writeFileSync(path.join(out, 'records.json'), JSON.stringify(records, null, 2));
  console.log(`wrote ${out}; spend $${spend.toFixed(4)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
