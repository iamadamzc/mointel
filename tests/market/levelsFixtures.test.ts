/**
 * Section 6 item 1 and item 2 of `docs/research/resistance-levels-spec.md`,
 * pre-registered before any levels code: the PURE function, on Ops's CSVs, at
 * his four chart moments on 2026-09-29, scored against his own lines.
 *
 *   PASS = recall >= 13 of his 14 lines pooled over SLXN, NCI and MSGY,
 *   tolerance max($0.002, 0.5% of L), one-to-one nearest matching. Extra
 *   levels are not failures ("show all").
 *   BIYA is REPORTED, not a pass condition: under the interim windows 2.421
 *   and 2.501 are expected as daily levels, 2.462 and 2.490 expected absent.
 *
 * SLXN's moment is the labelled amendment in `docs/threads/research.md`: his
 * chart's last bar is the 17:40 ET candle IN PROGRESS, so L = 0.3064 (its
 * in-progress trade price, not any completed 1m close). Every other chart's L
 * is the function's own: the latest 1m close at or before t.
 *
 * The CSVs are git-ignored market data. They are read from this checkout's
 * `data/`, else from MOINTEL_FIXTURE_DATA_DIR, else from the main checkout's
 * `data/` when this is a git worktree. When none has them the suite is
 * SKIPPED, and vitest counts it as skipped; it never passes on absent data.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  computeResistanceLevels,
  type LevelsDailyBar,
  type LevelsMinuteBar,
  type ResistanceLevels,
} from '@/lib/market/levels';
import { etDateString, etWallClockToUtc } from '@/lib/market/session';

const FILES = {
  slxn: 'slxn-2026-09-29-minute-bars.csv',
  minute: 'nci-msgy-biya-minute-bars.csv',
  daily: 'nci-msgy-biya-daily-bars.csv',
};

function mainCheckoutData(root: string): string | null {
  try {
    const dotGit = path.join(root, '.git');
    if (!fs.statSync(dotGit).isFile()) return null;
    const match = /^gitdir:\s*(.+)$/m.exec(fs.readFileSync(dotGit, 'utf8'));
    if (!match) return null;
    // <main>/.git/worktrees/<name>  ->  <main>
    const main = path.resolve(match[1]!.trim(), '..', '..', '..');
    return path.join(main, 'data');
  } catch {
    return null;
  }
}

function findDataDir(): string | null {
  const root = path.resolve(__dirname, '..', '..');
  const candidates = [
    path.join(root, 'data'),
    process.env.MOINTEL_FIXTURE_DATA_DIR ?? null,
    mainCheckoutData(root),
  ].filter((dir): dir is string => Boolean(dir));
  return (
    candidates.find((dir) => Object.values(FILES).every((file) => fs.existsSync(path.join(dir, file)))) ??
    null
  );
}

function parseCsv(file: string): Array<Record<string, string>> {
  const [head, ...rows] = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  const columns = head!.split(',').map((c) => c.replace(/"/g, ''));
  return rows.map((line) => {
    const cells = line.split(',').map((c) => c.replace(/"/g, ''));
    return Object.fromEntries(columns.map((c, i) => [c, cells[i] ?? '']));
  });
}

const num = (value: string | undefined): number | null =>
  value === undefined || value === '' ? null : Number(value);

interface Chart {
  symbol: string;
  moment: [number, number, number];
  price?: number;
  his: number[];
}

const DATE = '2026-09-29';
const CHARTS: Chart[] = [
  { symbol: 'SLXN', moment: [17, 40, 0], price: 0.3064, his: [0.321, 0.3279, 0.3328, 0.3414, 0.3882] },
  { symbol: 'NCI', moment: [17, 58, 28], his: [2.353, 2.201, 2.021, 1.93] },
  { symbol: 'MSGY', moment: [18, 0, 0], his: [12.75, 10.29, 9.52, 8.91, 7.08] },
  { symbol: 'BIYA', moment: [17, 55, 0], his: [2.501, 2.49, 2.462, 2.421] },
];
const PASS_SYMBOLS = new Set(['SLXN', 'NCI', 'MSGY']);
const PASS_RECALL = 13;

interface Score {
  tolerance: number;
  matched: Array<{ his: number; level: number }>;
  missed: number[];
  extras: number[];
}

/** One-to-one nearest matching: pairs within tolerance, closest first. */
function score(row: ResistanceLevels, his: readonly number[]): Score {
  const tolerance = Math.max(0.002, 0.005 * row.price);
  const pairs: Array<{ i: number; j: number; d: number }> = [];
  row.levels.forEach((level, i) =>
    his.forEach((line, j) => {
      const d = Math.abs(level.price - line);
      if (d <= tolerance) pairs.push({ i, j, d });
    }),
  );
  pairs.sort((a, b) => a.d - b.d);
  const usedLevels = new Set<number>();
  const usedLines = new Set<number>();
  const matched: Score['matched'] = [];
  for (const pair of pairs) {
    if (usedLevels.has(pair.i) || usedLines.has(pair.j)) continue;
    usedLevels.add(pair.i);
    usedLines.add(pair.j);
    matched.push({ his: his[pair.j]!, level: row.levels[pair.i]!.price });
  }
  return {
    tolerance,
    matched: matched.sort((a, b) => b.his - a.his),
    missed: his.filter((_, j) => !usedLines.has(j)),
    extras: row.levels.filter((_, i) => !usedLevels.has(i)).map((level) => level.price),
  };
}

const dataDir = findDataDir();

describe.skipIf(dataDir === null)('levels: his four charts (spec section 6, items 1 and 2)', () => {
  const minute = new Map<string, LevelsMinuteBar[]>();
  const daily = new Map<string, LevelsDailyBar[]>();

  const toBar = (row: Record<string, string>): LevelsMinuteBar => ({
    tradingDate: etDateString(new Date(row.ts!)),
    ts: row.ts!,
    open: num(row.open),
    high: num(row.high),
    close: num(row.close),
  });

  if (dataDir !== null) {
    minute.set('SLXN', parseCsv(path.join(dataDir, FILES.slxn)).map(toBar));
    for (const row of parseCsv(path.join(dataDir, FILES.minute))) {
      const list = minute.get(row.symbol!) ?? [];
      list.push(toBar(row));
      minute.set(row.symbol!, list);
    }
    for (const row of parseCsv(path.join(dataDir, FILES.daily))) {
      const list = daily.get(row.symbol!) ?? [];
      list.push({
        tradingDate: row.trading_date!,
        high: num(row.high),
        close: num(row.close),
        splitFactor: num(row.split_factor),
      });
      daily.set(row.symbol!, list);
    }
  }

  function compute(chart: Chart): ResistanceLevels {
    const bars = minute.get(chart.symbol) ?? [];
    const row = computeResistanceLevels({
      symbol: chart.symbol,
      t: etWallClockToUtc(DATE, ...chart.moment).getTime(),
      tradingDate: DATE,
      todayBars: bars.filter((bar) => bar.tradingDate === DATE),
      priorBars: bars.filter((bar) => bar.tradingDate < DATE),
      dailyBars: daily.get(chart.symbol) ?? [],
      price: chart.price,
    });
    if (!row) throw new Error(`${chart.symbol}: no row`);
    return row;
  }

  const results = CHARTS.map((chart) => {
    const row = dataDir === null ? null : compute(chart);
    return { chart, row, score: row ? score(row, chart.his) : null };
  });

  it('prints the scorecard', () => {
    const fmt = (n: number) => n.toFixed(4);
    for (const { chart, row, score: s } of results) {
      if (!row || !s) continue;
      console.log(
        [
          `${chart.symbol} t=${chart.moment.join(':')} ET  L=${row.price}  tol=${fmt(s.tolerance)}  ` +
            `recall ${s.matched.length}/${chart.his.length}${row.basisBreak ? '  BASIS BREAK' : ''}`,
          `  horizon ${JSON.stringify(row.horizon)}`,
          `  matched: ${s.matched.map((m) => `${m.his}<->${fmt(m.level)}`).join('  ') || '(none)'}`,
          `  missed:  ${s.missed.join(' ') || '(none)'}`,
          `  levels (${row.levels.length}): ${row.levels
            .map((l) => `${fmt(l.price)}[${l.timeframes.join('+')}${l.tops > 1 ? ` x${l.tops}` : ''}${l.beyondHorizon ? ' beyond' : ''}]`)
            .join(' ')}`,
        ].join('\n'),
      );
    }
    expect(results.every((r) => r.row !== null)).toBe(true);
  });

  it(`PASS bar: recall >= ${PASS_RECALL} of 14 pooled over SLXN, NCI and MSGY`, () => {
    const pooled = results.filter((r) => PASS_SYMBOLS.has(r.chart.symbol));
    expect(pooled.reduce((n, r) => n + r.chart.his.length, 0)).toBe(14);
    const recall = pooled.reduce((n, r) => n + (r.score?.matched.length ?? 0), 0);
    console.log(`POOLED recall SLXN+NCI+MSGY: ${recall}/14 (PASS bar >= ${PASS_RECALL})`);
    expect(recall).toBeGreaterThanOrEqual(PASS_RECALL);
  });

  it('BIYA (reported, not a pass condition): 2.421 and 2.501 as daily levels, 2.462 and 2.490 absent', () => {
    const biya = results.find((r) => r.chart.symbol === 'BIYA')!;
    const row = biya.row!;
    const s = biya.score!;
    const matchedDaily = (line: number) => {
      const m = s.matched.find((x) => x.his === line);
      if (!m) return 'ABSENT';
      const level = row.levels.find((l) => l.price === m.level)!;
      return `${m.level.toFixed(4)} [${level.timeframes.join('+')}]`;
    };
    const outcome = Object.fromEntries(biya.chart.his.map((line) => [line, matchedDaily(line)]));
    console.log(`BIYA outcome vs expectation: ${JSON.stringify(outcome)}`);
    // Reported only: the assertion is that the row exists and was walked.
    expect(row.basisBreak).toBeUndefined();
  });
});
