/**
 * The 16:30 ET second look at every stored close (his "yes to the 4:30 close re-check", Integration chat
 * 2026-10-13T14:54:19.833Z).
 *
 * WHY. Today's close is captured once, two minutes after the bell (worker/runtime.ts captureTodayRthClose, from
 * Alpaca's snapshot dailyBar.c), and then latched. On 2026-10-12 one of 300 names (MNDR 3.02, final 3.04) was still
 * pre-final at 16:02 and 16:10 ET, and every close was final by 16:20 (docs/ops-readings/close-probe-2026-10-12.txt;
 * Research found 7 of 319 recap calls the same way). The re-check runs 30 minutes after the close and replaces any
 * stored close that Alpaca's daily bar no longer agrees with.
 *
 * WHAT READS THE REPLACED VALUE. The engine's reference close: every after-hours percent change from then on, the
 * 20:05 AFTER_HOURS_CLOSE checkpoint, the EVENING report, the 22:00 NEXT_DAY_RECAP, the performance record job after
 * it, and the stored ticker_session row the reports' official close reads (OFFICIAL_CLOSE_SQL).
 *
 * Pure: the runtime supplies the stored closes and the fresh daily-bar closes and applies what this returns.
 */

export interface CloseReplacement {
  symbol: string;
  /** The close stored at the first capture. */
  old: number;
  /** Alpaca's daily-bar close at the re-check. */
  next: number;
}

/**
 * Closes to replace: a symbol with a stored close whose fresh daily-bar close is a positive finite number that
 * differs from it. A symbol with no fresh value (no bar for today, a failed fetch) is left alone: absence is not
 * evidence that the stored close is wrong. Sorted by symbol so the log line is stable.
 */
export function closeReplacements(
  stored: ReadonlyMap<string, number>,
  fresh: ReadonlyMap<string, number | null>,
): CloseReplacement[] {
  const out: CloseReplacement[] = [];
  for (const [symbol, old] of stored) {
    const next = fresh.get(symbol);
    if (next === undefined || next === null || !Number.isFinite(next) || next <= 0) continue;
    if (Math.abs(next - old) <= 1e-9) continue;
    out.push({ symbol, old, next });
  }
  return out.sort((a, b) => (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0));
}

/** Seconds after the close before the re-check may run: 30 min (16:30 ET on a normal day, close + 30 on a short one). */
export const RTH_CLOSE_RECHECK_AFTER_SECONDS = 30 * 60;

/** The log line, countable: how many were checked, how many replaced, and each one as "TICKER old -> new". */
export function formatRecheckLine(checked: number, replaced: readonly CloseReplacement[]): string {
  const head = `[demand] RTH close re-check: ${replaced.length} of ${checked} close(s) replaced`;
  return replaced.length === 0 ? head : `${head}: ${replaced.map((r) => `${r.symbol} ${r.old} -> ${r.next}`).join(', ')}`;
}
