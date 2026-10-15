/**
 * THE COUNTERPARTY CHECK (his "yes to both", uuid 193d6e98, item 2; spend "yes", uuid 38463b77: about $0.75, HARD STOP
 * $2): a name line may name another covered ticker that its own research states as the other party in its story. The
 * one recorded case is report 45 (2026-10-14 INTO_RTH, checkpoint 776): FFAI's line naming FFR, the buyer of FFAI's
 * robotics assets, struck by the rule and the model alike. This runs that input 5 times on v7 version 13 with the
 * counterparty rule and checker prompt (V6 17), production's own intraday path, the shipping checker (Claude Opus 5.5
 * high, Tests-TMI key, no fallback), and measures FFAI's PUBLISHED line.
 *   node --env-file=../mointel/.env.local --import tsx scripts/report-counterparty-check.ts <slim-10-14-store> <out-dir> --key-file <path> [--dry]
 * --dry: stub models; run 1 plants FFAI's line naming FFR (must publish), run 2 adds FFR's own move to it (must strike),
 * run 3 names an unadmitted covered ticker (must strike).
 */
import fs from 'node:fs';
import path from 'node:path';

import { AnthropicReportModel, CLAUDE_CHECKER_MAX_TOKENS } from '../lib/desk/reports/anthropicReportModel';
import { REPORT_CHECKER_PROMPT_VERSION_V6, VERDICT_SCHEMA_V6, type CheckerModel } from '../lib/desk/reports/check';
import type { ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { readReportInputs, runReport, writerPromptFor } from '../lib/desk/reports/pipeline';
import type { ReportRun } from '../lib/desk/reports/pipeline';
import { CLAUDE_CHECKER_TIMEOUT_MS, createReportModelsV6 } from '../lib/desk/reports/runner';
import type { ReportDraft, ReportModel, WriterPrompt } from '../lib/desk/reports/writer';
import { REPORT_WRITER_PROMPT_VERSION_V7 } from '../lib/desk/reports/writerV7';
import { openDatabase } from '../lib/market/store/db';
import { readReportModelConfig } from '../lib/research/config';
import { readNamedKey } from './readNamedKey';

const DAY = '2026-10-14';
const KIND = 'INTO_RTH' as const;
const RANGE = { min: 1, max: 20 };
const RUNS = 5;
const STOP_AT = 2;
const OPUS = 'claude-opus-5-5';
const LINE_TICKER = 'FFAI';
const PARTY = 'FFR';
const PRICE: Record<string, { input: number; output: number }> = { luna: { input: 0.2, output: 1.2 }, 'claude-opus-5-5': { input: 4, output: 20 } };
const tierOf = (model: string) => Object.keys(PRICE).find((key) => model.includes(key)) ?? null;
const worst = (role: 'writer' | 'checker') =>
  role === 'writer' ? (10_000 * PRICE.luna!.input + 8_000 * PRICE.luna!.output) / 1e6 : (40_000 * PRICE[OPUS]!.input + CLAUDE_CHECKER_MAX_TOKENS * PRICE[OPUS]!.output) / 1e6;
const RESERVE = worst('writer') + worst('checker');
const cost = (u: ReportModelUsage, role: 'writer' | 'checker') => {
  const tier = tierOf(u.model);
  if (!tier) return STOP_AT;
  if (u.inputTokens === null || u.outputTokens === null) return worst(role);
  return (u.inputTokens * PRICE[tier]!.input + u.outputTokens * PRICE[tier]!.output) / 1e6;
};
const names = (text: string, ticker: string) => new RegExp(`(?<![A-Za-z0-9.])${ticker}(?![A-Za-z0-9])`).test(text);

function stubWriter(run: number, otherCovered: string): ReportModel {
  const base = `On October 14, 2026, Faraday Future announced that it and ${PARTY} had signed definitive agreements for ${PARTY} to acquire its robotics assets.`;
  const ffai = run === 1 ? base : run === 2 ? `${base} ${PARTY} was up 40 percent from the prior close.` : `${base} ${otherCovered} also rose.`;
  return {
    complete: async (prompt: WriterPrompt) =>
      JSON.stringify({
        narrative: 'Dry run Summary.',
        lines: [...prompt.user.matchAll(/^([A-Z][A-Z.]{0,5}): ranked #/gm)].map((m) => ({ ticker: m[1]!, text: m[1] === LINE_TICKER ? ffai : 'Dry run line.' })),
      }),
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

async function main() {
  const args = process.argv.slice(2);
  const [store, out] = args;
  if (!store || !out) throw new Error('usage: report-counterparty-check.ts <slim-10-14-store> <out-dir> --key-file <path> [--dry]');
  const dry = args.includes('--dry');
  const keyFile = args.includes('--key-file') ? args[args.indexOf('--key-file') + 1] : undefined;
  if (Number(REPORT_WRITER_PROMPT_VERSION_V7) !== 13) throw new Error(`v7 is version ${REPORT_WRITER_PROMPT_VERSION_V7}, not 13; nothing run`);
  if (Number(REPORT_CHECKER_PROMPT_VERSION_V6) !== 17) throw new Error(`the checker prompt is ${REPORT_CHECKER_PROMPT_VERSION_V6}, not 17; nothing run`);
  if (writerPromptFor(KIND).family !== 'v7') throw new Error('INTO_RTH is not routed to v7 on this tree; nothing run');
  fs.mkdirSync(out, { recursive: true });
  const config = readReportModelConfig();
  let anthropicKey = '';
  if (!dry) {
    if (!config.apiKey) throw new Error('the OpenAI key is missing from the environment; nothing run');
    if (!keyFile) throw new Error('--key-file is required for a paid run; nothing run');
    anthropicKey = readNamedKey(keyFile, 'tests-tmi');
  }
  const NOW = new Date();
  const db = openDatabase(store, { readonly: true, skipSchema: true });
  const read = readReportInputs(db, KIND, DAY, RANGE, NOW);
  if (!read.ok) throw new Error(`inputs MISSED ${JSON.stringify(read.cause)}; nothing run`);
  const rows = read.inputs.facts.map((f) => f.ticker);
  if (!rows.includes(LINE_TICKER) || !rows.includes(PARTY)) throw new Error(`${LINE_TICKER} and ${PARTY} are not both covered here (${rows.join(', ')}); nothing run`);
  const party = read.inputs.facts.find((f) => f.ticker === PARTY)!;
  // FFR's own row facts, which must never appear in FFAI's line: its whole-percent move and its rank.
  const partyMove = Math.round(Math.abs(party.percentChange ?? 0));
  const partyRank = party.assessmentRank;
  const otherCovered = rows.find((t) => t !== LINE_TICKER && t !== PARTY)!;
  const summary: string[] = [
    `store ${store}; ${DAY} ${KIND}; covered ${rows.join(', ')}; ${PARTY} move ${partyMove} percent, rank #${partyRank}`,
    `v7 version ${REPORT_WRITER_PROMPT_VERSION_V7}; checker prompt V6 ${REPORT_CHECKER_PROMPT_VERSION_V6}; ${RUNS} runs; stop $${STOP_AT}${dry ? '; DRY' : ''}`,
    '',
  ];
  const records: unknown[] = [];
  let spend = 0;
  for (let run = 1; run <= RUNS; run += 1) {
    const tag = `${DAY}-${KIND}-counterparty-run${run}`;
    if (!dry && spend + RESERVE > STOP_AT) { summary.push(`${tag}: NOT RUN, the $${STOP_AT} stop`); continue; }
    const usage: Array<ReportModelUsage & { role: 'writer' | 'checker' }> = [];
    const writer = dry ? stubWriter(run, otherCovered) : createReportModelsV6({ ...config, claudeChecker: null }, (u) => usage.push({ ...u, role: 'writer' })).writer;
    const checker = dry ? stubChecker() : new AnthropicReportModel({ apiKey: anthropicKey, model: OPUS, schema: VERDICT_SCHEMA_V6, timeoutMs: CLAUDE_CHECKER_TIMEOUT_MS, onUsage: (u) => usage.push({ ...u, role: 'checker' }) });
    let draft: ReportDraft | null = null;
    let result: ReportRun | null = null;
    let error: string | null = null;
    try {
      result = await runReport(db, { kind: KIND, rangeId: '1-20', tradingDate: DAY, range: RANGE }, { writer, checker }, () => NOW, { draft: (d) => (draft = d) });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const drafted = draft as ReportDraft | null;
    const draftLine = drafted?.sections.flatMap((s) => s.lines).find((l) => l.ticker === LINE_TICKER)?.text ?? null;
    const published = result?.status === 'PUBLISHED' ? result.report.sections.flatMap((s) => s.lines).find((l) => l.ticker === LINE_TICKER)?.text ?? null : null;
    const ffaiStrikes = (result?.diagnostics?.strikes ?? []).filter((s) => {
      const lines = drafted?.sections.flatMap((x) => x.lines) ?? [];
      const at = lines.findIndex((l) => l.ticker === LINE_TICKER);
      return at >= 0 && s.id === `S1L${at + 1}`;
    });
    const record = {
      tag,
      status: error ? `ERROR ${error}` : result!.status,
      draftNamesParty: draftLine !== null && names(draftLine, PARTY),
      publishedNamesParty: published !== null && names(published, PARTY),
      publishedEmpty: published === null || published === '',
      partyFactsInPublished: published !== null && (new RegExp(`\\b${partyMove}\\s+percent`).test(published) || new RegExp(`#${partyRank}\\b`).test(published)),
      ffaiStrikes: ffaiStrikes.map((s) => ({ reason: s.reason, by: s.by, detail: s.detail })),
      draftLine,
      published,
      costUsd: usage.reduce((n, u) => n + cost(u, u.role), 0),
      usage,
    };
    spend += record.costUsd;
    records.push(record);
    fs.writeFileSync(path.join(out, `${tag}.json`), JSON.stringify({ record, draft, result }, null, 2));
    summary.push(`${tag}: ${record.status}; ${LINE_TICKER} draft names ${PARTY} ${record.draftNamesParty ? 'yes' : 'no'}; PUBLISHED names ${PARTY} ${record.publishedNamesParty ? 'yes' : 'no'}${record.publishedEmpty ? ' (line struck to empty)' : ''}; ${PARTY}'s own facts in it ${record.partyFactsInPublished ? 'YES' : 'no'}; strikes ${record.ffaiStrikes.map((s) => `${s.reason}/${s.by}`).join(', ') || 'none'}; $${record.costUsd.toFixed(4)}`);
  }
  summary.push('', `TOTAL spend $${spend.toFixed(4)}${dry ? ' (dry)' : ''}`);
  fs.writeFileSync(path.join(out, 'summary.txt'), `${summary.join('\n')}\n`);
  fs.writeFileSync(path.join(out, 'records.json'), JSON.stringify(records, null, 2));
  console.log(`wrote ${out}; spend $${spend.toFixed(4)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
