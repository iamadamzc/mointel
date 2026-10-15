/**
 * THE FRESHNESS REPLAY (Integration 41st, 2026-10-15): at each published report's own time, every covered name's
 * catalyst banded twice, by the raw stamp (`resolveCatalystFreshness`, production) and by the shared event rule
 * (`catalystFreshnessOf`, this tree: a clock only when a cited EXACT or INFERRED source carries the instant), with the
 * prior session's close as the boundary, as the board and the write side use it. Read only, no model call, no spend.
 *   node --import tsx scripts/research-freshness-replay.ts <out-file> <store> [<store> ...]
 * The research version is the newest generated at or before the report's created_at; the sources are its cited ids.
 */
import fs from 'node:fs';
import path from 'node:path';

import { readSourcesByIds } from '../lib/market/store/researchRepo';
import { openDatabase } from '../lib/market/store/db';
import { catalystFreshnessOf, citedWhenSources } from '../lib/research/eventWhen';
import { catalystFreshFromUtc } from '../lib/research/freshFrom';
import { resolveCatalystFreshness } from '../lib/research/time';

type Catalyst = { eventTimestamp: string | null; evidenceSourceIds?: number[]; catalystStatus?: string };

function main() {
  const [out, ...stores] = process.argv.slice(2);
  if (!out || stores.length === 0) throw new Error('usage: research-freshness-replay.ts <out-file> <store> [<store> ...]');
  const lines: string[] = ['OLD = resolveCatalystFreshness (raw stamp, production); NEW = catalystFreshnessOf (shared event rule, this tree)', ''];
  const totals = { names: 0, changed: 0, intoFresh: 0, outOfFresh: 0, intoStale: 0, outOfStale: 0 };
  const transitions = new Map<string, number>();
  for (const store of stores) {
    const db = openDatabase(store, { readonly: true, skipSchema: true });
    const reports = db
      .prepare(`SELECT id, kind, trading_date AS day, created_at AS at, payload FROM session_reports WHERE status = 'PUBLISHED' ORDER BY id`)
      .all() as Array<{ id: number; kind: string; day: string; at: string; payload: string }>;
    const version = db.prepare(
      `SELECT dossier FROM research_analysis_versions WHERE ticker = ? AND generated_at <= ? ORDER BY generated_at DESC LIMIT 1`,
    );
    lines.push(`store ${store}: ${reports.length} published reports`);
    for (const report of reports) {
      const now = new Date(report.at);
      const freshFromRaw = catalystFreshFromUtc(db, report.day);
      const freshFrom = freshFromRaw ? new Date(freshFromRaw) : null;
      const payload = JSON.parse(report.payload) as { sections?: Array<{ lines?: Array<{ ticker: string | null }> }> };
      const tickers = [...new Set((payload.sections ?? []).flatMap((s) => (s.lines ?? []).map((l) => l.ticker)).filter((t): t is string => !!t))];
      const moved: string[] = [];
      for (const ticker of tickers) {
        const row = version.get(ticker, report.at) as { dossier: string } | undefined;
        if (!row) continue;
        const catalyst = (JSON.parse(row.dossier) as { catalyst?: Catalyst }).catalyst;
        if (!catalyst) continue;
        totals.names += 1;
        const ids = catalyst.evidenceSourceIds ?? [];
        const old = resolveCatalystFreshness(catalyst.eventTimestamp, now, freshFrom);
        const fresh = catalystFreshnessOf({ eventTimestamp: catalyst.eventTimestamp, sources: citedWhenSources(ids, readSourcesByIds(db, ids)) }, now, freshFrom);
        if (old === fresh) continue;
        totals.changed += 1;
        transitions.set(`${old} -> ${fresh}`, (transitions.get(`${old} -> ${fresh}`) ?? 0) + 1);
        if (fresh === 'FRESH') totals.intoFresh += 1;
        if (old === 'FRESH') totals.outOfFresh += 1;
        if (fresh === 'STALE') totals.intoStale += 1;
        if (old === 'STALE') totals.outOfStale += 1;
        moved.push(`${ticker} ${catalyst.eventTimestamp} ${old}->${fresh} (status ${catalyst.catalystStatus ?? '?'})`);
      }
      lines.push(`  report ${report.id} ${report.day} ${report.kind} at ${report.at}: ${tickers.length} names; changed ${moved.length}${moved.length ? `: ${moved.join('; ')}` : ''}`);
    }
    db.close();
    lines.push('');
  }
  lines.push(
    `TOTAL name-reports ${totals.names}; band changed ${totals.changed}; into FRESH ${totals.intoFresh}, out of FRESH ${totals.outOfFresh}; into STALE ${totals.intoStale}, out of STALE ${totals.outOfStale}`,
    `transitions: ${[...transitions].map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`,
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${lines.join('\n')}\n`);
  console.log(`wrote ${out}`);
}

main();
