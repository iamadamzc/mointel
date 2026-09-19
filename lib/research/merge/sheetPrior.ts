/**
 * Human-reviewed prior analysis, loaded worker-side.
 *
 * The Sheet previously reached only the browser, which is why the escalation
 * criterion that depends on it could never fire: the worker had no way to know
 * a human had disagreed. This module gives the interpretation pipeline read-only
 * access to that prior work.
 *
 * Read-only is enforced by construction — nothing here writes, and the provider
 * is only ever asked to fetch.
 */

import type { MomentumTicker } from '../../data/types';
import type { SheetPriorAnalysis } from '../interpret/bundle';
import type { SheetSnapshot } from './sheetAuto';

export interface SheetPrior {
  /** Labelled prior opinion for the evidence bundle. */
  analysis: SheetPriorAnalysis;
  /** Normalised fields for deterministic comparison. */
  snapshot: SheetSnapshot;
}

/** How many analysis fields a row actually determines. */
function classifiedCount(ticker: MomentumTicker): number {
  let count = 0;
  if (ticker.cycle.state !== 'UNCLASSIFIED') count += 1;
  if (ticker.structure.state !== 'UNCLASSIFIED') count += 1;
  if (ticker.catalyst.gradeBucket !== 'UNCLASSIFIED') count += 1;
  return count;
}

/**
 * Picks the most informative row for each ticker.
 *
 * The live sheet carries a ticker twice — a populated research row and a later
 * placeholder — and taking the last occurrence silently discards the analysis.
 */
export function indexSheetRows(tickers: readonly MomentumTicker[]): Map<string, MomentumTicker> {
  const best = new Map<string, MomentumTicker>();
  for (const ticker of tickers) {
    const existing = best.get(ticker.ticker);
    if (!existing || classifiedCount(ticker) > classifiedCount(existing)) {
      best.set(ticker.ticker, ticker);
    }
  }
  return best;
}

export function toSheetPrior(ticker: MomentumTicker, observedAt: string | null): SheetPrior {
  return {
    analysis: {
      // The label travels with the data so the interpreter cannot mistake a
      // human opinion for a collected source.
      label: 'PRIOR_MODEL_ANALYSIS',
      catalyst: ticker.catalyst.latest || null,
      catalystGrade: ticker.catalyst.gradeRaw || null,
      structure: ticker.structure.raw || null,
      cycle: ticker.cycle.raw || ticker.cycle.display || null,
      warnings: ticker.warning?.current || null,
      floatQuality: ticker.structure.floatRaw || null,
      notes: null,
    },
    snapshot: {
      cycle: ticker.cycle,
      catalyst: ticker.catalyst,
      structure: ticker.structure,
      observedAt,
    },
  };
}

/**
 * Loads sheet research for the whole desk, or returns an empty map.
 *
 * A failure here must never stop interpretation: the automatic layer is
 * independent of the sheet by design, and losing the human comparison is a
 * degraded feature, not a broken pipeline.
 */
export interface SheetPriorLoad {
  priors: Map<string, SheetPrior>;
  /** Why the sheet could not be read, when it could not be. */
  error: string | null;
}

/**
 * How long a read is reused.
 *
 * The worker polls every 5 seconds and called this at the top of every cycle,
 * constructing a fresh provider each time — which defeated the provider's own
 * JWT, title and Drive-availability caches, all of which are instance fields.
 * That was three Google calls plus a token mint per cycle, one of them a Drive
 * request that always 403s because the Drive API is not enabled on the project,
 * to re-read a spreadsheet four scheduled tasks write four times a day.
 *
 * Sixty seconds rather than longer on purpose. `observedAt` is the fetch time
 * and `sheetStale` compares it against source publication times, so a longer
 * TTL would age `observedAt` and make that already-misconceived branch fire for
 * scheduling reasons. At sixty seconds a source would have to be published
 * within the last minute to trip it, which is no worse than today: the worker
 * parks inside a collection for minutes with the same priors already.
 */
const SHEET_PRIOR_TTL_MS = 60_000;

/** Ceiling on a sheet read from the worker. Comfortably above a normal read. */
const SHEET_TIMEOUT_MS = 20_000;

let cachedProvider: InstanceType<
  typeof import('../../data/providers/googleSheets').GoogleSheetsProvider
> | null = null;
let cachedLoad: { at: number; load: SheetPriorLoad } | null = null;

/** Drops the cached provider and read. For tests, and for a credential change. */
export function resetSheetPriorCache(): void {
  cachedProvider = null;
  cachedLoad = null;
}

export async function loadSheetPriors(now: number = Date.now()): Promise<SheetPriorLoad> {
  if (cachedLoad && now - cachedLoad.at < SHEET_PRIOR_TTL_MS) return cachedLoad.load;

  const priors = new Map<string, SheetPrior>();

  try {
    const { GoogleSheetsProvider, readCredentialsFromEnv } = await import(
      '../../data/providers/googleSheets'
    );
    const credentials = readCredentialsFromEnv();
    if (!credentials) {
      const load = { priors, error: 'no Google credentials configured' };
      cachedLoad = { at: now, load };
      return load;
    }

    // Reused so the provider's JWT, spreadsheet title and Drive-availability
    // caches survive between reads instead of being rebuilt every cycle.
    /*
     * The worker asks for a ceiling; the dashboard does not. This call sits at
     * the top of every poll, before any job is claimed, so an unbounded fetch
     * here stops the loop without failing anything.
     */
    cachedProvider ??= new GoogleSheetsProvider(credentials, { timeoutMs: SHEET_TIMEOUT_MS });
    const state = await cachedProvider.load();
    const observedAt = state.meta.fetchedAt ?? null;

    for (const [symbol, ticker] of indexSheetRows(state.tickers)) {
      priors.set(symbol, toSheetPrior(ticker, observedAt));
    }
  } catch (error) {
    /*
     * Degrade rather than failing the job: the automatic layer is independent
     * of the sheet by design, and losing the human comparison is a degraded
     * feature, not a broken pipeline.
     *
     * The provider is marked `server-only`, which throws in a plain Node worker
     * unless the process resolves the `react-server` condition — the research
     * npm scripts pass `--conditions=react-server` for exactly this reason. A
     * silent catch previously hid that, so the reason is surfaced.
     *
     * A last good read is preferred to an empty map, which is what the
     * provider's own "keeping the previous read" comment assumes a caller does.
     * This one had no such cache, so an unlocatable table dropped the whole desk
     * to zero priors. The error still travels, so a degraded read never reads as
     * a healthy one.
     */
    const message = error instanceof Error ? error.message.slice(0, 200) : 'sheet load failed';
    // A failed provider may hold a broken client; build a fresh one next time.
    cachedProvider = null;
    const previous = cachedLoad?.load.priors;
    const load: SheetPriorLoad = {
      priors: previous && previous.size > 0 ? previous : priors,
      error: message,
    };
    // Cached so a failing sheet is not retried every five seconds either.
    cachedLoad = { at: now, load };
    return load;
  }

  const load: SheetPriorLoad = { priors, error: null };
  cachedLoad = { at: now, load };
  return load;
}
