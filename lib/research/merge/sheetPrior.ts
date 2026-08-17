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
      label: 'HUMAN_REVIEWED_PRIOR_ANALYSIS',
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

export async function loadSheetPriors(): Promise<SheetPriorLoad> {
  const priors = new Map<string, SheetPrior>();

  try {
    const { GoogleSheetsProvider, readCredentialsFromEnv } = await import(
      '../../data/providers/googleSheets'
    );
    const credentials = readCredentialsFromEnv();
    if (!credentials) return { priors, error: 'no Google credentials configured' };

    const provider = new GoogleSheetsProvider(credentials);
    const state = await provider.load();
    const observedAt = state.meta.fetchedAt ?? null;

    for (const [symbol, ticker] of indexSheetRows(state.tickers)) {
      priors.set(symbol, toSheetPrior(ticker, observedAt));
    }
  } catch (error) {
    /*
     * Degrade to "no prior human analysis" rather than failing the job.
     *
     * The provider is marked `server-only`, which throws in a plain Node worker
     * unless the process resolves the `react-server` condition — the research
     * npm scripts pass `--conditions=react-server` for exactly this reason. A
     * silent catch previously hid that, leaving zero priors and making the
     * SHEET_AUTO_CONFLICT criterion unreachable, so the reason is surfaced.
     */
    return {
      priors,
      error: error instanceof Error ? error.message.slice(0, 200) : 'sheet load failed',
    };
  }

  return { priors, error: null };
}
