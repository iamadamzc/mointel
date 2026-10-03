/**
 * Replays a stored v6 voice run through the CURRENT pipeline with no model call:
 * the writer stub returns the stored draft, and the checker stub returns the
 * stored MODEL verdicts. The rule half of the checker recomputes from the same
 * code and store. Used to re-apply a stored run after a library-only change
 * (2026-10-03: struck name lines keep their card, 4cc5f5ca).
 *
 * The replay must reproduce the stored strikes exactly; it refuses otherwise.
 *
 * Run: node --import tsx scripts/report-v6-replay.ts <db> <stored-run-dir> <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';

import type { ReportKind } from '../lib/desk/reports/contract';
import { runReport } from '../lib/desk/reports/pipeline';
import type { ReportDraft } from '../lib/desk/reports/writer';
import { openDatabase } from '../lib/market/store/db';

const KINDS: ReportKind[] = ['INTO_RTH', 'INTO_POWER_HOUR', 'AFTER_HOURS', 'PREMARKET'];
const RANGE = { min: 1, max: 20 };

interface StoredStrike { id: string; reason: string; by: string; detail: string }
interface Stored {
  run: { kind: ReportKind; tradingDate: string };
  draft: ReportDraft;
  result: { status: string; diagnostics: { strikes: StoredStrike[] }; report?: { publishedAt: string } };
}

async function main() {
  const [dbPath, storedDir, out] = process.argv.slice(2);
  if (!dbPath || !storedDir || !out) throw new Error('usage: report-v6-replay.ts <db> <stored-run-dir> <out-dir>');
  fs.mkdirSync(out, { recursive: true });
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
  const summary: string[] = [`replay of ${storedDir} on ${dbPath}; no model calls`];

  for (const kind of KINDS) {
    const stored = JSON.parse(fs.readFileSync(path.join(storedDir, `v6-${kind}.json`), 'utf8')) as Stored;
    const draft = stored.draft;
    const modelStrikes = new Map(stored.result.diagnostics.strikes.filter((s) => s.by === 'model').map((s) => [s.id, s.detail]));
    const writer = {
      complete: async () => JSON.stringify({ narrative: draft.overall ?? null, lines: draft.sections.flatMap((s) => s.lines) }),
    };
    const checker = {
      complete: async (prompt: { user: string }) =>
        JSON.stringify({
          verdicts: [...new Set(prompt.user.match(/^(?:O|S\d+L\d+)\b/gm) ?? [])].map((id) => ({
            id,
            supported: !modelStrikes.has(id),
            note: modelStrikes.get(id) ?? '',
          })),
        }),
    };
    const publishedAt = stored.result.report?.publishedAt ?? new Date().toISOString();
    const result = await runReport(db, { kind, rangeId: '1-20', tradingDate: stored.run.tradingDate, range: RANGE }, { writer, checker }, () => new Date(publishedAt));

    const key = (s: { id: string; reason: string; by: string }) => `${s.id}|${s.reason}|${s.by}`;
    const was = stored.result.diagnostics.strikes.map(key).sort().join(',');
    const now = (result.diagnostics?.strikes ?? []).map(key).sort().join(',');
    if (was !== now) throw new Error(`${kind}: replayed strikes differ from stored (stored ${was} / replay ${now}); refusing`);
    if (result.status !== 'PUBLISHED') throw new Error(`${kind}: replay ${result.status}`);

    const report = result.report;
    fs.writeFileSync(path.join(out, `v6-${kind}-report.json`), `${JSON.stringify(report, null, 2)}\n`);
    const cards = report.sections.reduce((n, s) => n + s.lines.filter((l) => l.ticker !== null).length, 0);
    const empty = report.sections.reduce((n, s) => n + s.lines.filter((l) => l.ticker !== null && l.text === '').length, 0);
    summary.push(`${kind}: strikes reproduced (${now || 'none'}); watchCount ${report.watchCount}; cards ${cards} (${empty} with no prose); narrative ${report.narrative ? 'present' : 'null'}`);
  }
  db.close();
  fs.writeFileSync(path.join(out, 'replay-summary.txt'), `${summary.join('\n')}\n`);
  console.log(summary.join('\n'));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
