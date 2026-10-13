/**
 * READ 82's GATE (ii), the switch-off test (Commercial reads 82 `db4f572d`, 82a `2f1136cb`, 85 `bac7a1ea`, 86
 * `859ed1a0`, 87 `2c001fce`; his yes to about $4 for the gate and the night scan, Integration chat 5544e519, uuid
 * 71430cf6, 2026-10-13T01:46:47.838Z; read 87: about $2.00 under his $3 cap needs no further yes).
 * Run on THIS branch's checker: the word list OFF (`WORD_LIST_STRIKES`), read 82's read in the call (`SECOND_READ_V6`).
 *
 * THE SET (`docs/research/reports/advice-gate/seeds.json`, committed before any call):
 * - GATE, must be struck in every run: the 54 seeds and read 75's negatives labelled struck (read 86): 61.
 * - MUST PASS in every run: the 46 deal lines and read 85's six sample lines (95 percent, and NO miss on a sample line,
 *   read 86); read 75's negatives labelled pass (at least 12 of the 13, read 87a).
 * - APART, reported with no mark: the five in-prompt phrasings, the rating line, the two attributed recommendations,
 *   read 75's borderline negative 2.
 *
 * THE METHOD (read 87): the 12 stored v6 luna drafts of the writer v7 test (raw e6e6dcd9) are the reports. Gate seeds
 * are planted INSIDE the drafts' own lines that no rule strikes (opening, middle or end, varied), and one is appended to
 * or put before each Summary (12, read 86 asks at least 6). Every other sentence REPLACES a whole name line. At most 11
 * name lines a report. The rule pre-pass and the shuffle (SEED) fix the assignment before any model call. Each planted
 * report is checked RUNS times; each unplanted draft once (the placebo, which also shows any host line the model
 * already reads as advice). What counts is only the model's advice and forecast answers on a sentence's line.
 * A must-pass deal line struck in any run is re-read ONCE in its own stored draft (the 10-12 reports test raw); it
 * counts as a failure only if that re-read strikes it too (read 87).
 *
 * Run from this worktree:
 *   node --env-file=../mointel/.env.local --import tsx scripts/advice-gate.ts <db> <v7-raw-dir> <10-12-raw-dir> <out-dir> [--dry]
 * --dry: a stub checker that answers no to everything; no key, no spend. It proves the reads, the assignment, that the
 * checker is shown every planted line, and that every deal line is found and shown in its own draft.
 */
import fs from 'node:fs';
import path from 'node:path';

import { DEAL_EXAMPLES, type CheckerModel } from '../lib/desk/reports/check';
import type { ReportKind } from '../lib/desk/reports/contract';
import type { ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { runReport, type ReportRun } from '../lib/desk/reports/pipeline';
import { createReportModelsV6 } from '../lib/desk/reports/runner';
import type { ReportModel } from '../lib/desk/reports/writer';
import { openDatabase, type MarketDatabase } from '../lib/market/store/db';
import { readReportModelConfig } from '../lib/research/config';

const RANGE = { min: 1, max: 20 };
const STOP_AT = 3;
const RUNS = 3;
const SEED = 20261013;
const MAX_NAME_LINES = 11;
const PASS_SHARE = 0.95;
/** Read 87a (Commercial): the 13 read-75 pass lines need at least 12 of 13 in every run; each miss is listed and judged. */
const READ75_NEED = 12;
const PRICE_TERRA = { input: 2, output: 12 };
const WORST_CHECK = (26_000 * PRICE_TERRA.input + 10_000 * PRICE_TERRA.output) / 1e6;

const DAYS = ['2026-10-02', '2026-10-05', '2026-10-06'];
const KINDS: ReportKind[] = ['PREMARKET', 'INTO_RTH', 'INTO_POWER_HOUR', 'AFTER_HOURS'];
const BASES = DAYS.flatMap((day) => KINDS.map((kind) => ({ day, kind, tag: `${day}-${kind}-v6-w_luna` })));

type Kind = 'gate' | 'deal' | 'sample' | 'read75pass' | 'apart';
type Position = 'opening' | 'middle' | 'end' | 'whole';
interface Sentence {
  n: number;
  kind: Kind;
  group: string;
  text: string;
  /** A deal line that holds one of the carve-out's examples (`DEAL_EXAMPLES`): also reported apart, as in-sample. */
  holdsExample: boolean;
}
interface Placement {
  base: number;
  id: string;
  position: Position;
  sentence: Sentence;
}
interface Draft {
  narrative: string | null;
  lines: Array<{ ticker: string | null; text: string }>;
}
type Answer = { struck: boolean; flags: string[]; phrase: string } | null;

/** mulberry32: a small fixed generator, so the assignment is the same on every run of this file. */
function generator(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], next: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function loadSentences(): Sentence[] {
  const seeds = JSON.parse(fs.readFileSync('docs/research/reports/advice-gate/seeds.json', 'utf8')) as {
    gate: Record<string, string[]>;
    apart: { inSample: string[]; ratingForAdam: string[]; attributedForAdam: string[] };
    read75Labels: { struck: number[]; struckBorderlineApart: number[]; attributedApart: number[]; pass: number[] };
    mustPass: { sampleLines: string[] };
  };
  const fixture = JSON.parse(fs.readFileSync('tests/desk/fixtures/deal-fact-lines-2026-10-12.json', 'utf8')) as {
    dealFacts: string[];
    adviceNegatives: string[];
  };
  const labels = seeds.read75Labels;
  const labelled = [...labels.struck, ...labels.struckBorderlineApart, ...labels.attributedApart, ...labels.pass].sort((a, b) => a - b);
  if (labelled.join() !== fixture.adviceNegatives.map((_, i) => i).join()) throw new Error('read 75 labels do not cover the 22 negatives exactly once');

  const out: Sentence[] = [];
  const add = (kind: Kind, group: string, text: string, holdsExample = false) => out.push({ n: out.length, kind, group, text, holdsExample });
  for (const [group, list] of Object.entries(seeds.gate)) for (const text of list) add('gate', group, text);
  for (const i of labels.struck) add('gate', `read75 #${i}`, fixture.adviceNegatives[i]!);
  for (const text of fixture.dealFacts) add('deal', 'deal', text, DEAL_EXAMPLES.some((e) => text.includes(e)));
  for (const text of seeds.mustPass.sampleLines) add('sample', 'sample', text);
  for (const i of labels.pass) add('read75pass', `read75 #${i}`, fixture.adviceNegatives[i]!);
  for (const text of seeds.apart.inSample) add('apart', 'in-prompt phrasing', text);
  for (const text of seeds.apart.ratingForAdam) add('apart', 'rating, for Adam', text);
  for (const text of seeds.apart.attributedForAdam) add('apart', 'attributed recommendation, for Adam', text);
  for (const i of labels.attributedApart) add('apart', `attributed recommendation, for Adam (read75 #${i})`, fixture.adviceNegatives[i]!);
  for (const i of labels.struckBorderlineApart) add('apart', `borderline (read75 #${i})`, fixture.adviceNegatives[i]!);
  return out;
}

/** A gate seed put inside a host line at a position; "middle" falls back to "end" when the host has one sentence. */
function plantInside(host: string, seed: string, position: Position): { text: string; position: Position } {
  if (position === 'opening') return { text: `${seed} ${host}`, position };
  if (position === 'middle') {
    const cut = host.indexOf('. ');
    if (cut > 0 && cut < host.length - 2) return { text: `${host.slice(0, cut + 1)} ${seed} ${host.slice(cut + 2)}`, position };
  }
  return { text: `${host} ${seed}`, position: 'end' };
}

/** The fixed assignment, from the rule pre-pass and the shuffle alone. */
function assign(sentences: Sentence[], drafts: Draft[], hostable: string[][]): Placement[] {
  const next = generator(SEED);
  const gate = shuffled(sentences.filter((s) => s.kind === 'gate'), next);
  const whole = shuffled(sentences.filter((s) => s.kind !== 'gate'), next);
  const placements: Placement[] = [];
  const used = BASES.map(() => new Set<string>());
  // One gate seed to each Summary, alternating after and before it.
  gate.slice(0, BASES.length).forEach((sentence, base) => placements.push({ base, id: 'O', position: base % 2 === 0 ? 'end' : 'opening', sentence }));
  // The other gate seeds inside lines no rule strikes, round robin, positions cycling.
  const positions: Position[] = ['opening', 'middle', 'end'];
  let base = 0;
  gate.slice(BASES.length).forEach((sentence, k) => {
    for (let tries = 0; ; tries += 1) {
      if (tries > BASES.length) throw new Error('no room for the gate seeds inside unstruck lines');
      const free = hostable[base]!.find((id) => !used[base]!.has(id));
      if (free && used[base]!.size < MAX_NAME_LINES) {
        used[base]!.add(free);
        placements.push({ base, id: free, position: positions[k % positions.length]!, sentence });
        base = (base + 1) % BASES.length;
        return;
      }
      base = (base + 1) % BASES.length;
    }
  });
  // Every other sentence replaces a whole name line not already used.
  for (const sentence of whole) {
    for (let tries = 0; ; tries += 1) {
      if (tries > BASES.length) throw new Error('no room for the whole-line sentences');
      const ids = drafts[base]!.lines.map((_, i) => `S1L${i + 1}`);
      const free = ids.find((id) => !used[base]!.has(id));
      if (free && used[base]!.size < MAX_NAME_LINES) {
        used[base]!.add(free);
        placements.push({ base, id: free, position: 'whole', sentence });
        base = (base + 1) % BASES.length;
        break;
      }
      base = (base + 1) % BASES.length;
    }
  }
  return placements;
}

class Replay implements ReportModel {
  constructor(private readonly raw: string) {}
  async complete(): Promise<string> {
    return this.raw;
  }
}

/** Answers no to every question (and supports every line), recording the ids it was shown. */
function stubChecker(shown: Set<string>): CheckerModel {
  return {
    complete: async (prompt) => {
      const ids = [...new Set(prompt.user.match(/^(?:O|S[0-9]+L[0-9]+)(?![A-Za-z0-9])/gm) ?? [])];
      for (const id of ids) shown.add(id);
      return JSON.stringify({ verdicts: ids.map((id) => ({ id, supported: true, note: '', advice: false, forecast: false, leansOnAnother: false, phrase: '' })) });
    },
  };
}

const flagsOf = (run: ReportRun, id: string) =>
  (run.diagnostics?.strikes ?? []).filter((s) => s.id === id && s.by === 'model' && (s.reason === 'ADVICE' || s.reason === 'FORECAST'));

async function main() {
  const args = process.argv.slice(2);
  const [dbPath, v7Raw, reportsRaw, out] = args;
  if (!dbPath || !v7Raw || !reportsRaw || !out) throw new Error('usage: advice-gate.ts <db> <v7-raw-dir> <10-12-raw-dir> <out-dir> [--dry]');
  const dry = args.includes('--dry');
  const config = readReportModelConfig();
  if (!dry && !config.apiKey) throw new Error('the OpenAI key is missing from the environment (run with --env-file); nothing run');
  fs.mkdirSync(out, { recursive: true });
  const db: MarketDatabase = openDatabase(dbPath, { readonly: true, skipSchema: true });
  const NOW = new Date();
  let spend = 0;
  const records: unknown[] = [];
  const log: string[] = [];

  /** One check; null when the stop would be crossed. */
  const check = async (label: string, day: string, kind: ReportKind, draft: Draft, shown: Set<string>): Promise<ReportRun | null> => {
    if (!dry && spend + WORST_CHECK > STOP_AT) {
      log.push(`${label}: NOT RUN, spend $${spend.toFixed(4)} + worst case $${WORST_CHECK.toFixed(4)} exceeds $${STOP_AT}`);
      return null;
    }
    const usage: ReportModelUsage[] = [];
    const checker = dry ? stubChecker(shown) : createReportModelsV6({ ...config }, (u) => usage.push(u)).checker;
    const run = await runReport(db, { kind, rangeId: '1-20', tradingDate: day, range: RANGE }, { writer: new Replay(JSON.stringify(draft)), checker }, () => NOW);
    const cost = usage.reduce((s, u) => s + ((u.inputTokens ?? 26_000) * PRICE_TERRA.input + (u.outputTokens ?? 10_000) * PRICE_TERRA.output) / 1e6, 0);
    spend += cost;
    records.push({ label, status: run.status, strikes: run.diagnostics?.strikes ?? [], usage, cost });
    log.push(`${label}: ${run.status}; $${cost.toFixed(4)}`);
    return run;
  };

  const sentences = loadSentences();
  const drafts: Draft[] = BASES.map((b) => JSON.parse(JSON.parse(fs.readFileSync(path.join(v7Raw, `${b.tag}.json`), 'utf8')).rawWriterText) as Draft);

  // The rule pre-pass: no model, so the host lines are fixed before any call.
  const hostable: string[][] = [];
  for (const [b, base] of BASES.entries()) {
    const run = await runReport(db, { kind: base.kind, rangeId: '1-20', tradingDate: base.day, range: RANGE }, { writer: new Replay(JSON.stringify(drafts[b])), checker: stubChecker(new Set()) }, () => NOW);
    const struck = new Set<string>((run.diagnostics?.strikes ?? []).map((s) => s.id));
    hostable.push(drafts[b]!.lines.map((_, i) => `S1L${i + 1}`).filter((id) => !struck.has(id)));
  }
  const placements = assign(sentences, drafts, hostable);
  if (placements.length !== sentences.length) throw new Error(`placed ${placements.length} of ${sentences.length}`);

  const plantedDrafts = drafts.map((draft, b) => {
    const planted = structuredClone(draft);
    for (const p of placements.filter((x) => x.base === b)) {
      if (p.id === 'O') {
        const n = planted.narrative ?? '';
        planted.narrative = p.position === 'opening' ? `${p.sentence.text} ${n}`.trim() : `${n} ${p.sentence.text}`.trim();
      } else {
        const line = planted.lines[Number(p.id.slice(3)) - 1]!;
        if (p.position === 'whole') line.text = p.sentence.text;
        else {
          const placed = plantInside(line.text, p.sentence.text, p.position);
          line.text = placed.text;
          p.position = placed.position;
        }
      }
    }
    return planted;
  });
  fs.writeFileSync(
    path.join(out, 'assignment.json'),
    JSON.stringify(placements.map((p) => ({ base: BASES[p.base]!.tag, id: p.id, position: p.position, n: p.sentence.n, kind: p.sentence.kind, group: p.sentence.group, text: p.sentence.text })), null, 1),
  );

  log.push(
    `clock fixed at ${NOW.toISOString()}; checker ${config.checkerModel}; ${RUNS} runs; stop $${STOP_AT}${dry ? '; DRY: stub checker, nothing spent' : ''}`,
    `${sentences.length} sentences: ${['gate', 'deal', 'sample', 'read75pass', 'apart'].map((k) => `${k} ${sentences.filter((s) => s.kind === k).length}`).join(', ')}; ${BASES.length} reports; seed ${SEED}`,
    `placements: ${(['whole', 'opening', 'middle', 'end'] as Position[]).map((p) => `${p} ${placements.filter((x) => x.position === p).length}`).join(', ')}; Summary ${placements.filter((x) => x.id === 'O').length}`,
    '',
  );

  const outcome = new Map<number, Answer[]>();
  const hostFlagged = new Set<string>();
  for (const [b, base] of BASES.entries()) {
    const mine = placements.filter((p) => p.base === b);
    const placebo = await check(`${base.tag} placebo`, base.day, base.kind, drafts[b]!, new Set());
    if (placebo) {
      const own = (placebo.diagnostics?.strikes ?? []).filter((s) => s.by === 'model' && (s.reason === 'ADVICE' || s.reason === 'FORECAST'));
      for (const s of own) hostFlagged.add(`${b}:${s.id}`);
      if (own.length) log.push(`  the writer's own lines read as advice or forecast: ${own.map((s) => `${s.id} "${s.detail}"`).join('; ')}`);
    }
    for (let r = 0; r < RUNS; r += 1) {
      const shown = new Set<string>();
      const run = await check(`${base.tag} planted-${r + 1}`, base.day, base.kind, plantedDrafts[b]!, shown);
      if (dry) {
        const missing = mine.filter((p) => !shown.has(p.id)).map((p) => p.id);
        if (missing.length) throw new Error(`${base.tag}: the checker was not shown planted ids ${missing.join(', ')}`);
      }
      for (const p of mine) {
        const flags = run && run.status === 'PUBLISHED' ? flagsOf(run, p.id) : null;
        const answer: Answer = flags === null ? null : { struck: flags.length > 0, flags: flags.map((f) => f.reason), phrase: flags[0]?.detail ?? '' };
        outcome.set(p.sentence.n, [...(outcome.get(p.sentence.n) ?? []), answer]);
      }
    }
  }

  // Must-pass deal lines struck in any run: re-read once in their own stored draft (read 87). In dry, all 46 are
  // re-read, to prove every one is found and shown in its own draft.
  const files = fs.readdirSync(reportsRaw).filter((f) => /^p1-.*\.json$/.test(f));
  const own = new Map<number, { file: string; id: string }>();
  const ownDrafts = new Map<string, Draft>();
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(reportsRaw, file), 'utf8')) as { rawWriterText?: string };
    if (!raw.rawWriterText) continue;
    let draft: Draft;
    try {
      draft = JSON.parse(raw.rawWriterText) as Draft;
    } catch {
      continue;
    }
    ownDrafts.set(file, draft);
    for (const s of sentences.filter((x) => x.kind === 'deal' && !own.has(x.n))) {
      const i = draft.lines.findIndex((l) => l.text === s.text);
      if (i >= 0) own.set(s.n, { file, id: `S1L${i + 1}` });
      else if (draft.narrative === s.text) own.set(s.n, { file, id: 'O' });
    }
  }
  const deals = sentences.filter((s) => s.kind === 'deal');
  const missingOwn = deals.filter((s) => !own.has(s.n));
  if (missingOwn.length) throw new Error(`deal lines with no own draft: ${missingOwn.map((s) => s.n).join(', ')}`);
  const toReread = dry ? deals : deals.filter((s) => (outcome.get(s.n) ?? []).some((a) => a === null || a.struck));
  const reread = new Map<number, Answer>();
  for (const file of [...new Set(toReread.map((s) => own.get(s.n)!.file))]) {
    const m = /^p1-(\d{4}-\d{2}-\d{2})-([A-Z_]+)-w_/.exec(file);
    if (!m) throw new Error(`cannot read the slot from ${file}`);
    const shown = new Set<string>();
    const run = await check(`re-read ${file}`, m[1]!, m[2] as ReportKind, ownDrafts.get(file)!, shown);
    for (const s of toReread.filter((x) => own.get(x.n)!.file === file)) {
      const id = own.get(s.n)!.id;
      if (dry && !shown.has(id)) throw new Error(`re-read ${file}: ${id} not shown`);
      const flags = run && run.status === 'PUBLISHED' ? flagsOf(run, id) : null;
      reread.set(s.n, flags === null ? null : { struck: flags.length > 0, flags: flags.map((f) => f.reason), phrase: flags[0]?.detail ?? '' });
    }
  }

  // The tables.
  const runsOf = (s: Sentence) => outcome.get(s.n) ?? [];
  const mark = (a: Answer | undefined) => (a === null || a === undefined ? '?' : a.struck ? 'X' : '.');
  const where = (s: Sentence) => {
    const p = placements.find((x) => x.sentence.n === s.n)!;
    return `${BASES[p.base]!.tag} ${p.id} ${p.position}${hostFlagged.has(`${p.base}:${p.id}`) && p.position !== 'whole' ? ' HOST READ AS ADVICE IN THE PLACEBO' : ''}`;
  };
  const row = (s: Sentence) => {
    const phrase = runsOf(s).find((a) => a?.struck)?.phrase;
    const again = reread.has(s.n) ? ` re-read in own draft: ${mark(reread.get(s.n))}${reread.get(s.n)?.phrase ? ` "${reread.get(s.n)!.phrase}"` : ''}` : '';
    return `  [${runsOf(s).map(mark).join('')}] ${s.group}: ${s.text.slice(0, 150)}${phrase ? `  <- "${phrase}"` : ''}${again}  (${where(s)})`;
  };
  /** A must-pass line fails run r when struck (or unmeasured) there, unless its own-draft re-read passed it. */
  const failsIn = (s: Sentence, r: number) => {
    const a = runsOf(s)[r];
    const missed = a === null || a === undefined || a.struck;
    if (!missed) return false;
    if (s.kind !== 'deal' || dry) return true;
    const again = reread.get(s.n);
    return again === null || again === undefined || again.struck;
  };
  const passedIn = (set: Sentence[], r: number) => set.filter((s) => !failsIn(s, r)).length;
  const need = (set: Sentence[]) => Math.ceil(PASS_SHARE * set.length);

  const gate = sentences.filter((s) => s.kind === 'gate');
  const mustPass = sentences.filter((s) => s.kind === 'deal' || s.kind === 'sample');
  const samples = sentences.filter((s) => s.kind === 'sample');
  const read75pass = sentences.filter((s) => s.kind === 'read75pass');
  const runIdx = Array.from({ length: RUNS }, (_, r) => r);
  const gateHeld = gate.every((s) => runsOf(s).length === RUNS && runsOf(s).every((a) => a?.struck === true));
  const mustHeld = runIdx.every((r) => passedIn(mustPass, r) >= need(mustPass));
  const samplesHeld = runIdx.every((r) => samples.every((s) => !failsIn(s, r)));
  const read75Held = runIdx.every((r) => passedIn(read75pass, r) >= READ75_NEED);

  log.push('', `GATE SEEDS: ${gate.filter((s) => runsOf(s).every((a) => a?.struck === true) && runsOf(s).length === RUNS).length} of ${gate.length} struck in all ${RUNS} runs (X struck, . passed, ? not measured)`);
  for (const s of gate) log.push(row(s));
  log.push('', `MUST PASS (${mustPass.length}): passed per run, after own-draft re-reads, ${runIdx.map((r) => passedIn(mustPass, r)).join(', ')}; need ${need(mustPass)} in every run; the six sample lines may not miss in any run`);
  const outside = mustPass.filter((s) => !s.holdsExample);
  log.push(`  the ${outside.length} with no carve-out example inside: passed per run ${runIdx.map((r) => passedIn(outside, r)).join(', ')}`);
  log.push('  every must-pass line struck in any run:');
  for (const s of mustPass.filter((m) => runsOf(m).some((a) => a === null || a.struck))) log.push(row(s));
  log.push('', `READ 75 LABELLED PASS (${read75pass.length}): passed per run ${runIdx.map((r) => passedIn(read75pass, r)).join(', ')}; need ${READ75_NEED} in every run (read 87a)`);
  for (const s of read75pass) log.push(row(s));
  log.push('', 'APART, no mark (in-prompt phrasings; rating and attributed recommendations, for Adam; borderline):');
  for (const s of sentences.filter((x) => x.kind === 'apart')) log.push(row(s));
  if (dry) log.push('', `own-draft re-reads (dry, all ${deals.length} deal lines): every one found and shown`);
  log.push(
    '',
    `VERDICT: ${dry ? 'DRY, no verdict' : gateHeld && mustHeld && samplesHeld && read75Held ? 'PASS' : 'FAIL'} (gate seeds ${gateHeld ? 'held' : 'did not hold'}; must-pass ${mustHeld ? 'held' : 'did not hold'}; sample lines ${samplesHeld ? 'held' : 'did not hold'}; read 75 pass set ${read75Held ? 'held' : 'did not hold'})`,
    `TOTAL spend $${spend.toFixed(4)}${dry ? ' (dry)' : ''}`,
  );
  db.close();
  fs.writeFileSync(path.join(out, 'summary.txt'), `${log.join('\n')}\n`);
  fs.writeFileSync(path.join(out, 'records.json'), JSON.stringify(records, null, 1));
  console.log(`wrote ${out}; spend $${spend.toFixed(4)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
