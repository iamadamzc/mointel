/**
 * THE NIGHT SCAN, read 82 (iii) (Commercial, db4f572d): for the first thirty days after the word list comes out,
 * every report published since the last scan is read again by OpenAI for read 82's two questions (advice, forecast),
 * and the hits reach Integration the next morning. The module is `lib/desk/reports/nightScan.ts`; this is its runner.
 * Spend: inside his approval (about $1.20 for the 30 days, Integration 2026-10-13); stop $0.25 a night.
 *
 * Run on the box by Ops's timer (about 23:45 ET), with the desk's env (OPENAI_API_KEY, the checker model):
 *   node --env-file=<env> --import tsx scripts/report-night-scan.ts --db=<market db> --until=<YYYY-MM-DD> [--out=data/night-scan] [--dry]
 * --until: the last ET date it runs (day 30). After it, it writes nothing and says so.
 * --dry: a stub model that answers no for every line; no key, no spend.
 * --from=<ISO> --to=<ISO>: the window set by hand (a re-read, or a dry proof on a copy of the database).
 *
 * Writes <out>/<ET date>.json (every answer) and <ET date>.txt (the morning note), then prints the journal line with
 * the counts (Integration's condition 1). Exit 1 when any report was not read, so the unit shows the failure.
 * The window starts where the newest earlier scan's window ended (at most 7 days back), else 24 hours back, so a
 * night the timer missed is read the next night; when a night left a report unread (stop or failure), the next window
 * starts just before it (`nextFrom`), so it is read again rather than lost.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { CheckerModel } from '../lib/desk/reports/check';
import {
  NIGHT_SCAN_PROMPT_VERSION,
  NIGHT_SCAN_SCHEMA,
  journalLine,
  morningNote,
  runNightScan,
  type NightScan,
  type StoredReportRow,
} from '../lib/desk/reports/nightScan';
import { OpenAiReportModel, type ReportModelUsage } from '../lib/desk/reports/openaiReportModel';
import { etDateString } from '../lib/market/session';
import { openDatabase } from '../lib/market/store/db';
import { readReportModelConfig } from '../lib/research/config';

const ARG = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const DRY = process.argv.includes('--dry');
/** The night's hard stop in dollars (Integration accepted $0.25). */
const STOP_USD = 0.25;
/** OpenAI terra, dollars per million tokens, as the advice gate priced it (`scripts/advice-gate.ts` PRICE_TERRA). */
const PRICE = { input: 2, output: 12 };
/** The most one report's call is reserved at: a report's lines and the questions are well under 6,000 tokens. */
const RESERVE = { input: 6_000, output: 4_000 };
const RESERVE_USD = (RESERVE.input * PRICE.input + RESERVE.output * PRICE.output) / 1e6;
const MAX_CATCH_UP_MS = 7 * 24 * 60 * 60_000;

/** The newest earlier scan's window end, from its json, when it is within a week. */
function previousWindowEnd(out: string, now: Date): string | null {
  if (!fs.existsSync(out)) return null;
  const files = fs.readdirSync(out).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  for (const file of files.reverse()) {
    try {
      const earlier = JSON.parse(fs.readFileSync(path.join(out, file), 'utf8')) as NightScan & { nextFrom?: string };
      // nextFrom sits just before the first report that night did not read, so it is read again tonight.
      const end = earlier.nextFrom ?? earlier.windowEnd;
      const ms = Date.parse(end);
      if (Number.isFinite(ms) && ms < now.getTime() && now.getTime() - ms <= MAX_CATCH_UP_MS) return end;
    } catch {
      // An unreadable earlier file is skipped; the default window still reads the last 24 hours.
    }
  }
  return null;
}

async function main(): Promise<number> {
  const dbPath = ARG('db');
  const until = ARG('until');
  const out = ARG('out') ?? 'data/night-scan';
  if (!dbPath || !until || !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
    throw new Error('usage: report-night-scan.ts --db=<market db> --until=<YYYY-MM-DD> [--out=<dir>] [--dry]; nothing run');
  }
  const now = new Date();
  const date = etDateString(now);
  if (date > until) {
    console.log(`night scan ${date}: past --until ${until}, the thirty days are over; nothing run`);
    return 0;
  }
  const config = readReportModelConfig();
  if (!DRY && !config.apiKey) throw new Error('night scan: OPENAI_API_KEY is not set; nothing run');

  // --from/--to (ISO): a window set by hand, to re-read a night or to prove the reads on a copy.
  // Every bound in toISOString's form, as published_at is stored, so the text comparison in SQL orders them right.
  const iso = (raw: string) => {
    const ms = Date.parse(raw);
    if (!Number.isFinite(ms)) throw new Error(`night scan: not a time: ${raw}; nothing run`);
    return new Date(ms).toISOString();
  };
  const windowEnd = iso(ARG('to') ?? now.toISOString());
  const windowStart = iso(ARG('from') ?? previousWindowEnd(out, now) ?? new Date(now.getTime() - 24 * 60 * 60_000).toISOString());
  const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
  const rows = db
    .prepare(
      `SELECT id, kind, range_key, trading_date, published_at, payload, diagnostics FROM session_reports
       WHERE status = 'PUBLISHED' AND published_at > ? AND published_at <= ? ORDER BY published_at, id`,
    )
    .all(windowStart, windowEnd) as StoredReportRow[];
  db.close();

  let spend = 0;
  const onUsage = (u: ReportModelUsage) => {
    // An unknown count is priced at the reservation, so a missing count never under-counts spend.
    spend += ((u.inputTokens ?? RESERVE.input) * PRICE.input + (u.outputTokens ?? RESERVE.output) * PRICE.output) / 1e6;
  };
  const model: CheckerModel = DRY
    ? {
        complete: async (prompt) => {
          const ids = prompt.user.split('\n').map((line) => /^(H|O|V|S\d+L\d+): /.exec(line)?.[1]).filter((id): id is string => Boolean(id));
          return JSON.stringify({ answers: ids.map((id) => ({ id, advice: false, forecast: false, phrase: '' })) });
        },
      }
    : new OpenAiReportModel({
        apiKey: config.apiKey,
        model: config.checkerModel,
        timeoutMs: 180_000,
        format: { name: 'night_scan', schema: NIGHT_SCAN_SCHEMA, promptVersion: NIGHT_SCAN_PROMPT_VERSION },
        onUsage,
      });

  const scan = await runNightScan(rows, model, { runAt: windowEnd, windowStart, windowEnd, stopUsd: STOP_USD, reserveUsd: RESERVE_USD, spent: () => spend });
  fs.mkdirSync(out, { recursive: true });
  const firstUnread = scan.reports.find((r) => r.status !== 'READ');
  const nextFrom = firstUnread ? new Date(Date.parse(firstUnread.publishedAt) - 1).toISOString() : scan.windowEnd;
  fs.writeFileSync(path.join(out, `${date}.json`), `${JSON.stringify({ ...scan, nextFrom, model: DRY ? 'dry' : config.checkerModel }, null, 1)}\n`);
  fs.writeFileSync(path.join(out, `${date}.txt`), morningNote(scan, date));
  console.log(`${journalLine(scan, date)}${DRY ? ' (DRY: stub model, nothing spent)' : ''}`);
  return scan.reports.every((r) => r.status === 'READ') ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(`night scan: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  },
);
