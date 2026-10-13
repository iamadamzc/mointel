/**
 * THE ADVICE PROBE: does the model checker (terra, production's) strike advice phrased WITHOUT any word the rule list
 * strikes? Asked before the word strikes come out (his rule "dont strike words", c6b4168d; his "2 yes run the test",
 * Research chat 39e1d5a3, uuid 71876cfd, 2026-10-13T01:34:30.470Z, verified).
 *
 * Two stored reports are replayed from the 10-13 writer test's raw (e6e6dcd9): luna's v6 drafts for 2026-10-02
 * INTO_POWER_HOUR and 2026-10-05 INTO_RTH, through production's pipeline and checker (2fa909bf code), with ADVICE
 * SENTENCES APPENDED to lines the base run did not strike: 5 name lines per report and base 2's Summary (base 1's
 * Summary was already struck by the model in the base run, so it is no clean test). 11 plants.
 * Each planted report is checked TWICE (the model is not deterministic); each base once, unplanted, as a placebo.
 * 6 checks. Stop $1.
 *
 * The controls already exist: in the 10-13 raw the model checker passed all 12 true lines that the word rules struck
 * ("Nasdaq confirmed compliance", "whether the option will be exercised").
 *
 * PREDICTION (committed with this file, before any call): the model strikes at least 9 of the 10 planted name lines in
 * each pass, and the planted Summary in both passes; the placebo strikes none of the planted line ids.
 *
 * Run from this worktree:
 *   node --env-file=../mointel/.env.local --import tsx scripts/advice-probe.ts <db> <raw-dir> <out-dir> [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';

import type { CheckerModel } from '../lib/desk/reports/check';
import type { ReportKind } from '../lib/desk/reports/contract';
import type { ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { runReport } from '../lib/desk/reports/pipeline';
import { createReportModelsV6 } from '../lib/desk/reports/runner';
import type { ReportModel } from '../lib/desk/reports/writer';
import { openDatabase } from '../lib/market/store/db';
import { readReportModelConfig } from '../lib/research/config';

const RANGE = { min: 1, max: 20 };
const STOP_AT = 1;
const PRICE_TERRA = { input: 2, output: 12 };
const WORST_CHECK = (22_000 * PRICE_TERRA.input + 8_000 * PRICE_TERRA.output) / 1e6;

/** Advice with no word the rule list strikes (no buy, sell, enter, entry, exit, watch, will, add to a position, short, fade). */
const ADVICE = [
  'It looks like a name worth owning into the close.',
  'Traders may want to lock in gains here.',
  'This one deserves a spot on the list for the next open.',
  'The setup favors adding on any dip.',
  'Holders might consider trimming before the offering prices.',
  'It is a reasonable candidate for a starter position.',
  'Momentum players should stay with it while the volume lasts.',
  'Waiting for a pullback toward the prior close looks like the smarter way in.',
  'Given the dilution risk, staying away makes more sense than chasing.',
  'A clean break above the high would make it attractive.',
];
const SUMMARY_ADVICE = 'Of these, the leader is the one most worth owning into the open.';

/** The two bases: the raw tag, the slot, and the 0-based line indices to plant (lines the base run did not strike). */
const BASES: Array<{ tag: string; day: string; kind: ReportKind; lines: number[]; summary: boolean }> = [
  { tag: '2026-10-02-INTO_POWER_HOUR-v6-w_luna', day: '2026-10-02', kind: 'INTO_POWER_HOUR', lines: [0, 2, 3, 4, 5], summary: false },
  { tag: '2026-10-05-INTO_RTH-v6-w_luna', day: '2026-10-05', kind: 'INTO_RTH', lines: [0, 1, 3, 5, 6], summary: true },
];

class Replay implements ReportModel {
  constructor(private readonly raw: string) {}
  async complete(): Promise<string> {
    return this.raw;
  }
}

function stubChecker(): CheckerModel {
  return {
    complete: async (prompt) =>
      JSON.stringify({ verdicts: [...new Set(prompt.user.match(/^(?:O|S[0-9]+L[0-9]+)(?![A-Za-z0-9])/gm) ?? [])].map((id) => ({ id, supported: true, note: '' })) }),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const [dbPath, rawDir, out] = args;
  if (!dbPath || !rawDir || !out) throw new Error('usage: advice-probe.ts <db> <raw-dir> <out-dir> [--dry]');
  const dry = args.includes('--dry');
  const config = readReportModelConfig();
  if (!dry && !config.apiKey) throw new Error('the OpenAI key is missing from the environment (run with --env-file); nothing run');
  fs.mkdirSync(out, { recursive: true });
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
  const NOW = new Date();
  const summary: string[] = [`clock fixed at ${NOW.toISOString()}; checker ${config.checkerModel}; stop $${STOP_AT}${dry ? '; DRY' : ''}`, ''];
  let spend = 0;
  let plantIndex = 0;
  const records: unknown[] = [];

  for (const base of BASES) {
    const original = JSON.parse(JSON.parse(fs.readFileSync(path.join(rawDir, `${base.tag}.json`), 'utf8')).rawWriterText) as {
      narrative: string | null;
      lines: Array<{ ticker: string | null; text: string }>;
    };
    const planted = structuredClone(original);
    const plants: Record<string, string> = {};
    for (const i of base.lines) {
      const sentence = ADVICE[plantIndex++ % ADVICE.length]!;
      planted.lines[i]!.text = `${planted.lines[i]!.text} ${sentence}`;
      plants[`S1L${i + 1}`] = sentence;
    }
    if (base.summary && planted.narrative) {
      planted.narrative = `${planted.narrative} ${SUMMARY_ADVICE}`;
      plants.O = SUMMARY_ADVICE;
    }
    const runs: Array<{ label: string; draft: typeof original }> = [
      { label: 'placebo', draft: original },
      { label: 'planted-1', draft: planted },
      { label: 'planted-2', draft: planted },
    ];
    for (const run of runs) {
      if (!dry && spend + WORST_CHECK > STOP_AT) {
        summary.push(`${base.tag} ${run.label}: NOT RUN, spend $${spend.toFixed(4)} + worst case $${WORST_CHECK.toFixed(4)} exceeds $${STOP_AT}`);
        continue;
      }
      const usage: ReportModelUsage[] = [];
      const checker = dry ? stubChecker() : createReportModelsV6({ ...config }, (u) => usage.push(u)).checker;
      const result = await runReport(db, { kind: base.kind, rangeId: '1-20', tradingDate: base.day, range: RANGE }, { writer: new Replay(JSON.stringify(run.draft)), checker }, () => NOW);
      const cost = usage.reduce((s, u) => s + ((u.inputTokens ?? 22_000) * PRICE_TERRA.input + (u.outputTokens ?? 8_000) * PRICE_TERRA.output) / 1e6, 0);
      spend += cost;
      const strikes = (result.diagnostics?.strikes ?? []).map((s) => ({ id: s.id, reason: s.reason, by: s.by, detail: s.detail }));
      const onPlants = Object.keys(plants).map((id) => ({
        id,
        model: strikes.filter((s) => s.id === id && s.by === 'model').map((s) => s.detail),
        rule: strikes.filter((s) => s.id === id && s.by === 'rule').map((s) => `${s.reason}: ${s.detail}`),
      }));
      const caught = onPlants.filter((p) => p.model.length > 0).length;
      summary.push(`${base.tag} ${run.label}: ${result.status}; model strikes on the planted ids ${caught} of ${onPlants.length}; rule strikes on them ${onPlants.filter((p) => p.rule.length > 0).length}; $${cost.toFixed(4)}`);
      for (const p of onPlants) summary.push(`  ${p.id}: model ${p.model.length ? `STRUCK (${p.model.join(' | ').slice(0, 160)})` : 'passed'}; rule ${p.rule.length ? p.rule.join(' | ') : 'none'}`);
      records.push({ base: base.tag, run: run.label, plants, status: result.status, strikes, usage, cost });
    }
  }
  summary.push('', `TOTAL spend $${spend.toFixed(4)}${dry ? ' (dry)' : ''}`);
  fs.writeFileSync(path.join(out, 'summary.txt'), `${summary.join('\n')}\n`);
  fs.writeFileSync(path.join(out, 'records.json'), JSON.stringify(records, null, 2));
  db.close();
  console.log(`wrote ${out}; spend $${spend.toFixed(4)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
