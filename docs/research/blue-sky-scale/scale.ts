/**
 * Blue-sky scale count (prereg.md beside this file). Read-only, local copy only.
 *
 * Run: node --import tsx docs/research/blue-sky-scale/scale.ts <db> <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';

import { resolveBlueSkyThreshold, type BlueSkyThreshold } from '../../../lib/market/blueSky';
import { dailyBarBasis, readDailyBars } from '../../../lib/research/history';
import { openDatabase } from '../../../lib/market/store/db';

const TRADING_DATE = '2026-10-02';
const DEPTH = 100_000; // readModel.ts ALL_STORED_SESSIONS

function row(symbol: string, t: BlueSkyThreshold, onBoard: boolean) {
  return {
    symbol,
    onBoard,
    ceiling: t.price,
    ceilingDate: t.date,
    ceilingSplitFactor: t.ceilingSplitFactor,
    ceilingComparable: t.ceilingComparable,
    comparableCeiling: t.comparableCeiling,
    comparableCeilingDate: t.comparableCeilingDate,
    sessions: t.sessionsObserved,
    unverifiedReason: t.unverifiedReason,
  };
}

function main() {
  const [dbPath, out] = process.argv.slice(2);
  if (!dbPath || !out) throw new Error('usage: scale.ts <db> <out-dir>');
  fs.mkdirSync(out, { recursive: true });
  const stat = fs.statSync(dbPath);
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });

  const dates = (
    db
      .prepare(`SELECT DISTINCT trading_date AS d FROM desk_assessments WHERE trading_date <= ? ORDER BY trading_date DESC LIMIT 5`)
      .all(TRADING_DATE) as Array<{ d: string }>
  ).map((r) => r.d);
  const board = new Set(
    (
      db
        .prepare(
          `SELECT DISTINCT t.ticker AS ticker FROM desk_assessment_tickers t
             JOIN desk_assessments a ON a.id = t.assessment_id
            WHERE a.trading_date IN (${dates.map(() => '?').join(',')})`,
        )
        .all(...dates) as Array<{ ticker: string }>
    ).map((r) => r.ticker),
  );

  const symbols = (db.prepare(`SELECT DISTINCT symbol FROM daily_bars ORDER BY symbol`).all() as Array<{ symbol: string }>).map((r) => r.symbol);
  const A: ReturnType<typeof row>[] = [];
  const B: ReturnType<typeof row>[] = [];
  const C: ReturnType<typeof row>[] = [];
  let errors = 0;
  for (const symbol of symbols) {
    try {
      const bars = readDailyBars(db, symbol, DEPTH, 'INCLUDE');
      const basis = dailyBarBasis(db, symbol);
      const now = resolveBlueSkyThreshold(bars, {
        tradingDate: TRADING_DATE,
        adjustment: basis.vouched ? basis.adjustment : null,
        basisReason: basis.reason,
      });
      const onBoard = board.has(symbol);
      if (now.verified && now.ceilingComparable === false) A.push(row(symbol, now, onBoard));
      else if (now.verified && now.ceilingComparable === null) B.push(row(symbol, now, onBoard));
      else if (!now.verified) {
        const forced = resolveBlueSkyThreshold(bars, { tradingDate: TRADING_DATE, adjustment: 'split', basisReason: null });
        if (forced.verified && forced.ceilingComparable === false) C.push(row(symbol, forced, onBoard));
      }
    } catch {
      errors += 1;
    }
  }
  db.close();

  const count = (list: ReturnType<typeof row>[]) => `${list.length} (on board in last 5 sessions: ${list.filter((r) => r.onBoard).length})`;
  const summary = [
    `store ${dbPath}: ${stat.size} bytes, mtime ${stat.mtime.toISOString()}`,
    `tradingDate ${TRADING_DATE}; board sessions ${dates.join(', ')} (${board.size} tickers)`,
    `N symbols with daily_bars: ${symbols.length}; errors: ${errors}`,
    `A SHOWN NOW (verified, ceilingComparable false): ${count(A)}`,
    `B SHOWN, BASIS UNKNOWN (verified, ceilingComparable null): ${count(B)}`,
    `C LATENT (refused now, verified if basis vouched, comparable false): ${count(C)}`,
    `positive control GNPX in C: ${C.some((r) => r.symbol === 'GNPX') ? 'YES' : 'NO (count withheld per prereg)'}`,
  ];
  fs.writeFileSync(path.join(out, `raw-${TRADING_DATE}.json`), JSON.stringify({ dates, A, B, C, errors, n: symbols.length }, null, 2));
  fs.writeFileSync(path.join(out, `summary-${TRADING_DATE}.txt`), `${summary.join('\n')}\n`);
  console.log(`wrote ${out}`);
}

main();
