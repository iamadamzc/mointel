/**
 * How long the market worker's 1 s flush takes, and how much of it is the
 * ticker_session upsert -- summarised once a minute.
 *
 * WHY THIS EXISTS. The flush runs on the same thread as the SIP socket's
 * message handler, so every millisecond of flush is a millisecond the stream's
 * messages wait. Integration's ruling (2026-09-29, pre-registered before any
 * reading): a covering index for the range read ships only if the added cost
 * is <= 10% of the median upsert AND of the median whole flush, AND the max
 * whole flush stays < 250 ms in RTH. Nothing measured a flush's duration
 * before this; `last_flush_ms` is a clock, not a duration.
 *
 * Pure: the runtime records one sample per flush and logs whatever `drain`
 * returns. No per-flush log line.
 */

/** The ruled ceiling on one whole flush in RTH, in ms. */
export const FLUSH_STALL_MS = 250;

export interface FlushSample {
  /** The whole flush, ms. */
  wholeMs: number;
  /** upsertTickerSessions alone, ms (0 when nothing was dirty). */
  upsertMs: number;
  /** ticker_session rows written this flush. */
  dirtyRows: number;
}

export interface FlushWindow {
  flushes: number;
  wholeMedianMs: number;
  wholeMaxMs: number;
  upsertMedianMs: number;
  upsertMaxMs: number;
  dirtyMedian: number;
  dirtyMax: number;
  /** Flushes at or over FLUSH_STALL_MS. */
  overStall: number;
}

function median(sorted: readonly number[]): number {
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export class FlushTiming {
  private samples: FlushSample[] = [];

  record(sample: FlushSample): void {
    this.samples.push(sample);
  }

  /** The window since the last drain, or null when no flush ran in it. */
  drain(): FlushWindow | null {
    const samples = this.samples;
    this.samples = [];
    if (samples.length === 0) return null;
    const whole = samples.map((s) => s.wholeMs).sort((a, b) => a - b);
    const upsert = samples.map((s) => s.upsertMs).sort((a, b) => a - b);
    const dirty = samples.map((s) => s.dirtyRows).sort((a, b) => a - b);
    return {
      flushes: samples.length,
      wholeMedianMs: median(whole),
      wholeMaxMs: whole[whole.length - 1],
      upsertMedianMs: median(upsert),
      upsertMaxMs: upsert[upsert.length - 1],
      dirtyMedian: median(dirty),
      dirtyMax: dirty[dirty.length - 1],
      overStall: whole.filter((ms) => ms >= FLUSH_STALL_MS).length,
    };
  }
}

/** One greppable line: `[flush] 60 flushes whole 12.3/48.1 upsert 8.0/30.2 dirty 410/2210 over250 0 phase RTH`. */
export function formatFlushWindow(window: FlushWindow, phase: string): string {
  const f = (ms: number) => ms.toFixed(1);
  return (
    `[flush] ${window.flushes} flushes whole ${f(window.wholeMedianMs)}/${f(window.wholeMaxMs)} ` +
    `upsert ${f(window.upsertMedianMs)}/${f(window.upsertMaxMs)} ` +
    `dirty ${window.dirtyMedian}/${window.dirtyMax} over${FLUSH_STALL_MS} ${window.overStall} phase ${phase}`
  );
}
