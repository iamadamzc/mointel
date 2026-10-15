/**
 * THE RECAP BASIS REPLAY (his yes, Integration chat uuid 3268cfdd: the recap picks its names by the PRIOR close, so a
 * name that started the day in $1-$20 stays counted however it closed). Reads each recorded trading date in a store copy
 * with readRecapCounts twice, this tree's (by the prior close) and a production tree's (by the official close), and
 * prints which counts move and which 50 percent movers enter or leave. Read only; no model call; no spend.
 *   node --import tsx scripts/report-recap-basis-replay.ts <production-tree> <out-file> <store> [<store> ...]
 * <production-tree>: a checkout whose lib/desk/reports/narrative.ts is production's (e.g. A:/mointel-cparty at 28e4dad7,
 * identical to efa164e3's).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { readRecapCounts, type RecapCounts } from '../lib/desk/reports/narrative';
import { openDatabase } from '../lib/market/store/db';

const RANGE = { min: 1, max: 20 };
type Reader = (db: Parameters<typeof readRecapCounts>[0], date: string, range: typeof RANGE) => RecapCounts;

async function main() {
  const [prodTree, out, ...stores] = process.argv.slice(2);
  if (!prodTree || !out || stores.length === 0) throw new Error('usage: report-recap-basis-replay.ts <production-tree> <out-file> <store> [<store> ...]');
  const prodModule = (await import(pathToFileURL(path.join(prodTree, 'lib/desk/reports/narrative.ts')).href)) as { readRecapCounts: Reader };
  const lines: string[] = [`range $${RANGE.min}-$${RANGE.max}; OLD = production's readRecapCounts (${prodTree}), by the official close; NEW = this tree's, by the prior close`, ''];
  for (const store of stores) {
    const db = openDatabase(store, { readonly: true, skipSchema: true });
    const dates = (
      db
        .prepare(
          `SELECT trading_date AS d FROM ticker_session
            WHERE reference_rth_close_basis = 'CURRENT_SESSION' AND reference_rth_close_date = trading_date
            GROUP BY trading_date ORDER BY trading_date`,
        )
        .all() as Array<{ d: string }>
    ).map((r) => r.d);
    lines.push(`store ${store}: ${dates.length} dates with official closes`);
    for (const date of dates) {
      const before = prodModule.readRecapCounts(db, date, RANGE);
      const after = readRecapCounts(db, date, RANGE);
      const fig = (r: RecapCounts) =>
        `eligible ${r.breadth.eligible}, traded ${r.breadth.traded}, up ${r.breadth.up}, down ${r.breadth.down}; ran 50% ${r.movers50}, gave back ${r.gaveBack}, kept half ${r.keptHalf}; no close ${r.noClose}, split ${r.splitExcluded}`;
      const was = new Set(before.movers.map((m) => m.symbol));
      const now = new Set(after.movers.map((m) => m.symbol));
      const pct = (r: RecapCounts, s: string) => {
        const m = r.movers.find((x) => x.symbol === s)!;
        return `${s} ${m.previousClose}->${m.high}->${m.close}${m.close <= m.previousClose ? ' GAVE BACK' : m.retention >= 0.5 ? ' kept half' : ''}`;
      };
      lines.push(
        `${date}`,
        `  OLD ${fig(before)}`,
        `  NEW ${fig(after)}`,
        `  movers in: ${[...now].filter((s) => !was.has(s)).map((s) => pct(after, s)).join('; ') || 'none'}`,
        `  movers out: ${[...was].filter((s) => !now.has(s)).map((s) => pct(before, s)).join('; ') || 'none'}`,
      );
    }
    db.close();
    lines.push('');
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${lines.join('\n')}\n`);
  console.log(`wrote ${out}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
