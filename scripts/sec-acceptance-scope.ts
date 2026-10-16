/**
 * THE SEC ACCEPTANCE SCOPE (Integration 42nd's ruling, 2026-10-16; read only, no write, no model call, no spend).
 * The collector stores EDGAR's submissions-JSON acceptanceDateTime verbatim (lib/research/sec/collector.ts), and that
 * JSON is off by +/-4 h against the filing's own index header for a third of a sample (docs/research/sec-acceptance/).
 * This measures, on the PC store copies, against a cache of each accession's header (ACCEPTANCE-DATETIME, Eastern):
 *   (iv) a DRY-RUN repair of stored SEC instants: rows that would change and by how much;
 *   (ii) EXPOSURE: current catalysts whose eventTimestamp rests on an SEC instant, and how many of those are off;
 *   (iii) a REPLAY over the published reports: freshness bands, the dates the writer and checker are handed, and the
 *        board's age chip and hover clock, with stored vs corrected instants; every change listed.
 *   node --import tsx scripts/sec-acceptance-scope.ts <headers.jsonl> <out-dir> <store> [<store> ...]
 * Corrected instants: an EXACT or INFERRED SEC source's published_at becomes its accession's header acceptance. An
 * eventTimestamp equal to a cited source's stored instant that is off takes that source's corrected instant (the
 * stamp was copied from it); any other eventTimestamp is left as written.
 */
import fs from 'node:fs';
import path from 'node:path';

import { relativeAge } from '../lib/dashboard/why';
import { openDatabase, type MarketDatabase } from '../lib/market/store/db';
import { catalystFreshnessOf, eventWhen, sourceWhen, type WhenSource } from '../lib/research/eventWhen';
import { catalystFreshFromUtc } from '../lib/research/freshFrom';

type Header = { accession: string; acceptanceUtc: string | null; error: string | null };
type SourceRow = { id: number; source_type: string; accession: string | null; published_at: string | null; published_precision: string };
type Catalyst = { eventTimestamp: string | null; evidenceSourceIds?: number[]; catalystStatus?: string };

const ms = (s: string | null | undefined) => (s ? Date.parse(s) : Number.NaN);
const timed = (r: SourceRow) =>
  (r.source_type === 'SEC_FILING' || r.source_type === 'SEC_EXHIBIT') &&
  (r.published_precision === 'EXACT' || r.published_precision === 'INFERRED') &&
  !!r.accession && !!r.published_at && r.published_at.includes('T');

function main() {
  const [headersFile, outDir, ...stores] = process.argv.slice(2);
  if (!headersFile || !outDir || stores.length === 0) throw new Error('usage: sec-acceptance-scope.ts <headers.jsonl> <out-dir> <store> [<store> ...]');
  const headers = new Map<string, Header>();
  for (const line of fs.readFileSync(headersFile, 'utf8').split('\n')) if (line.trim()) { const h = JSON.parse(line) as Header; headers.set(h.accession, h); }
  fs.mkdirSync(outDir, { recursive: true });
  const out: string[] = [`headers cached: ${headers.size} (with an acceptance ${[...headers.values()].filter((h) => h.acceptanceUtc).length})`, ''];

  for (const store of stores) {
    const db = openDatabase(store, { readonly: true, skipSchema: true });
    const name = path.basename(store);
    const sources = new Map<number, SourceRow>();
    for (const r of db.prepare('SELECT id, source_type, accession, published_at, published_precision FROM research_sources').all() as SourceRow[]) sources.set(r.id, r);
    /** The corrected instant of a timed SEC source, or its stored one. */
    const corrected = (r: SourceRow): string | null => {
      if (!timed(r)) return r.published_at;
      const h = headers.get(r.accession!);
      return h?.acceptanceUtc ?? r.published_at;
    };
    const isOff = (r: SourceRow) => timed(r) && headers.get(r.accession!)?.acceptanceUtc != null && ms(corrected(r)) !== ms(r.published_at);

    /* ------------------------------------------------------ (iv) dry-run repair */
    const deltas = new Map<string, number>();
    let checked = 0;
    let noHeader = 0;
    let changed = 0;
    const byType = new Map<string, { checked: number; changed: number }>();
    for (const r of sources.values()) {
      if (!timed(r)) continue;
      const h = headers.get(r.accession!);
      if (!h?.acceptanceUtc) { noHeader += 1; continue; }
      checked += 1;
      const t = byType.get(r.source_type) ?? { checked: 0, changed: 0 };
      t.checked += 1;
      const d = (ms(r.published_at) - ms(h.acceptanceUtc)) / 3_600_000;
      if (d !== 0) {
        changed += 1;
        t.changed += 1;
        deltas.set(`${d > 0 ? '+' : ''}${d}h`, (deltas.get(`${d > 0 ? '+' : ''}${d}h`) ?? 0) + 1);
      }
      byType.set(r.source_type, t);
    }
    out.push(
      `== ${name}`,
      `(iv) DRY-RUN REPAIR of research_sources (timed SEC rows; stored minus header): checked ${checked}, no header ${noHeader}, would change ${changed} (${((100 * changed) / Math.max(checked, 1)).toFixed(1)}%)`,
      `     by delta: ${[...deltas].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`,
      `     by type: ${[...byType].map(([k, v]) => `${k} ${v.changed} of ${v.checked}`).join(', ')}`,
    );

    /* -------------------------------------------------- versions and the stamp */
    const versionAt = db.prepare('SELECT id, generated_at, dossier FROM research_analysis_versions WHERE ticker = ? AND generated_at <= ? ORDER BY generated_at DESC LIMIT 1');
    const catalystOf = (dossier: string): Catalyst | null => {
      try { return (JSON.parse(dossier) as { catalyst?: Catalyst }).catalyst ?? null; } catch { return null; }
    };
    const cited = (c: Catalyst) => (c.evidenceSourceIds ?? []).map((id) => sources.get(id)).filter((r): r is SourceRow => !!r);
    const whenSources = (rows: SourceRow[], fix: boolean): WhenSource[] => rows.map((r) => ({ publishedAt: fix ? corrected(r) : r.published_at, precision: r.published_precision }));
    /** The stamp after repair: a stamp copied from an off source takes that source's corrected instant. */
    const fixedStamp = (c: Catalyst, rows: SourceRow[]): string | null => {
      const stamp = c.eventTimestamp;
      if (!stamp || !stamp.includes('T')) return stamp;
      const from = rows.find((r) => isOff(r) && ms(r.published_at) === ms(stamp));
      return from ? corrected(from) : stamp;
    };

    /* ------------------------------------------------------------ (ii) exposure */
    // Current = research_dossiers.current_version_id; a copy without that table's rows (Ops's slim copy) falls back to
    // each ticker's newest version, which is the same thing whenever the table is present.
    let current = db
      .prepare('SELECT v.ticker AS ticker, v.dossier AS dossier FROM research_dossiers d JOIN research_analysis_versions v ON v.id = d.current_version_id')
      .all() as Array<{ ticker: string; dossier: string }>;
    if (current.length === 0) {
      current = db
        .prepare(
          `SELECT v.ticker AS ticker, v.dossier AS dossier FROM research_analysis_versions v
            WHERE v.generated_at = (SELECT MAX(w.generated_at) FROM research_analysis_versions w WHERE w.ticker = v.ticker)`,
        )
        .all() as Array<{ ticker: string; dossier: string }>;
    }
    let withStamp = 0;
    let onSec = 0;
    let onSecOff = 0;
    let clockNow = 0;
    let clockAfter = 0;
    let stampEqualsHeaderOnly = 0;
    const exposed: string[] = [];
    for (const { ticker, dossier } of current) {
      const c = catalystOf(dossier);
      if (!c?.eventTimestamp) continue;
      withStamp += 1;
      const rows = cited(c);
      const sec = rows.filter((r) => timed(r) && ms(r.published_at) === ms(c.eventTimestamp));
      if (sec.length > 0) {
        onSec += 1;
        if (sec.some(isOff)) { onSecOff += 1; exposed.push(`${ticker} ${c.eventTimestamp} -> ${fixedStamp(c, rows)}`); }
      }
      if (rows.some((r) => timed(r) && isOff(r) && ms(corrected(r)) === ms(c.eventTimestamp))) stampEqualsHeaderOnly += 1;
      if (eventWhen({ eventTimestamp: c.eventTimestamp, sources: whenSources(rows, false) }).clock !== null) clockNow += 1;
      if (eventWhen({ eventTimestamp: fixedStamp(c, rows), sources: whenSources(rows, true) }).clock !== null) clockAfter += 1;
    }
    out.push(
      `(ii) EXPOSURE, current catalysts (research_dossiers.current_version_id): ${current.length}; with a stamp ${withStamp}; stamp equal to a cited SEC instant ${onSec}, of which that instant is OFF ${onSecOff}`,
      `     stamps already equal to a cited source's TRUE (header) instant while its stored one is off (AIXI's shape): ${stampEqualsHeaderOnly}`,
      `     a trusted clock (card hover, eventWhen) now ${clockNow}, after repair ${clockAfter}`,
      ...exposed.map((e) => `     off: ${e}`),
    );

    /* ------------------------------------------------------------ (iii) replay */
    const reports = db.prepare("SELECT id, kind, trading_date AS day, created_at AS at, payload FROM session_reports WHERE status = 'PUBLISHED' ORDER BY id").all() as Array<{ id: number; kind: string; day: string; at: string; payload: string }>;
    const changes: string[] = [];
    let nameReports = 0;
    const tally = { band: 0, eventDate: 0, sourceDate: 0, age: 0, hover: 0 };
    const tallySources = { band: 0, eventDate: 0, age: 0, hover: 0 };
    const sourcesOnly: string[] = [];
    for (const report of reports) {
      const now = new Date(report.at);
      const fromRaw = catalystFreshFromUtc(db as MarketDatabase, report.day);
      const freshFrom = fromRaw ? new Date(fromRaw) : null;
      const payload = JSON.parse(report.payload) as { sections?: Array<{ lines?: Array<{ ticker: string | null }> }> };
      const tickers = [...new Set((payload.sections ?? []).flatMap((s) => (s.lines ?? []).map((l) => l.ticker)).filter((t): t is string => !!t))];
      for (const ticker of tickers) {
        const v = versionAt.get(ticker, report.at) as { dossier: string } | undefined;
        const c = v ? catalystOf(v.dossier) : null;
        if (!c) continue;
        nameReports += 1;
        const rows = cited(c);
        if (!rows.some(isOff)) continue;
        const before = { eventTimestamp: c.eventTimestamp, sources: whenSources(rows, false) };
        const after = { eventTimestamp: fixedStamp(c, rows), sources: whenSources(rows, true) };
        const what: string[] = [];
        const b0 = catalystFreshnessOf(before, now, freshFrom);
        const b1 = catalystFreshnessOf(after, now, freshFrom);
        if (b0 !== b1) { tally.band += 1; what.push(`band ${b0}->${b1}`); }
        const e0 = eventWhen(before);
        const e1 = eventWhen(after);
        if (e0.date !== e1.date) { tally.eventDate += 1; what.push(`event date ${e0.date}->${e1.date}`); }
        if ((e0.clock === null) !== (e1.clock === null) || e0.clock !== e1.clock) { tally.hover += 1; what.push(`hover clock ${e0.clock ?? 'none'}->${e1.clock ?? 'none'}`); }
        rows.forEach((r, i) => {
          const s0 = sourceWhen(before.sources[i]!).date;
          const s1 = sourceWhen(after.sources[i]!).date;
          if (s0 !== s1) { tally.sourceDate += 1; what.push(`source ${r.id} ${r.source_type} date ${s0}->${s1}`); }
        });
        const a0 = relativeAge(before.eventTimestamp, now.getTime(), before.sources);
        const a1 = relativeAge(after.eventTimestamp, now.getTime(), after.sources);
        if (a0 !== a1) { tally.age += 1; what.push(`age ${a0}->${a1}`); }
        // Variant: repair the source rows ONLY (versions are append-only): a stamp copied from an off source stays.
        const onlySources = { eventTimestamp: c.eventTimestamp, sources: whenSources(rows, true) };
        const vs: string[] = [];
        const b2 = catalystFreshnessOf(onlySources, now, freshFrom);
        if (b0 !== b2) { tallySources.band += 1; vs.push(`band ${b0}->${b2}`); }
        const e2 = eventWhen(onlySources);
        if (e0.date !== e2.date) { tallySources.eventDate += 1; vs.push(`event date ${e0.date}->${e2.date}`); }
        if (e0.clock !== e2.clock) { tallySources.hover += 1; vs.push(`hover clock ${e0.clock ?? 'none'}->${e2.clock ?? 'none'}`); }
        const a2 = relativeAge(onlySources.eventTimestamp, now.getTime(), onlySources.sources);
        if (a0 !== a2) { tallySources.age += 1; vs.push(`age ${a0}->${a2}`); }
        if (vs.length) sourcesOnly.push(`     report ${report.id} ${report.day} ${report.kind} ${ticker}: ${vs.join('; ')}`);
        if (what.length) changes.push(`     report ${report.id} ${report.day} ${report.kind} ${ticker} (stamp ${c.eventTimestamp}): ${what.join('; ')}`);
      }
    }
    out.push(
      `(iii) REPLAY over ${reports.length} published reports, ${nameReports} name-reports: changed name-reports ${changes.length}; bands ${tally.band}, event dates ${tally.eventDate}, cited-source dates ${tally.sourceDate}, age chips ${tally.age}, hover clocks ${tally.hover}`,
      ...changes,
      `(iii-b) the same replay if ONLY the source rows are repaired (stamps left as written): changed name-reports ${sourcesOnly.length}; bands ${tallySources.band}, event dates ${tallySources.eventDate}, age chips ${tallySources.age}, hover clocks ${tallySources.hover}`,
      ...sourcesOnly,
      '',
    );
    db.close();
  }
  fs.writeFileSync(path.join(outDir, 'scope.txt'), `${out.join('\n')}\n`);
  console.log(`wrote ${path.join(outDir, 'scope.txt')}`);
}

main();
