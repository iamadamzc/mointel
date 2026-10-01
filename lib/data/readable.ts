/**
 * The Sheet's text, as the board shows it: no em dash (his rule,
 * 2026-09-30T10:43:39Z, "no em dashes in any writing. hard rule.").
 *
 * The Sheet is written by outside tasks, and its labels carry the dash
 * (grade "A [em dash] STRONG/FRESH", cycle "FRONTSIDE [em dash] WARNING",
 * structure "UNKNOWN [em dash] ..."; seen live 2026-10-01). The desk
 * already cleans its own model's prose where every row takes it
 * (`readableIntelligence` in `lib/dashboard/merge.ts`), but the Sheet's values
 * reach the page by another road: the Researched names table reads them
 * straight off this payload, never through the merge. So they are cleaned
 * HERE, once, on the payload both dashboard routes serve, and every surface
 * inherits it: the table, its tooltips and row labels, the dossier.
 *
 * DISPLAY ONLY. This runs on the response, never on the provider's rows: the
 * research worker reads the Sheet through `loadSheetPriors`, which this does not
 * touch, so what the model sees is unchanged. Every state, bucket and number
 * was parsed from the raw text before this point; only words change.
 *
 * Not touched: the symbol, the change signature (a fingerprint, not writing),
 * and every URL (an address, not writing). The lone empty-value dash is kept
 * by `withoutEmDash` itself (his exception).
 */

import { withoutEmDash } from '../dashboard/prose';
import type { DashboardState } from './types';

const KEEP = new Set(['ticker', 'changeSignature']);

function isAddress(key: string): boolean {
  return /Urls?$/.test(key);
}

function readable<T>(value: T): T {
  if (typeof value === 'string') return withoutEmDash(value) as T;
  if (Array.isArray(value)) return value.map((item) => readable(item)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = KEEP.has(key) || isAddress(key) ? item : readable(item);
    }
    return out as T;
  }
  return value;
}

export function readableSheet(state: DashboardState): DashboardState {
  const research: DashboardState['research'] = {};
  for (const [symbol, record] of Object.entries(state.research)) research[symbol] = readable(record);
  return { ...state, tickers: state.tickers.map((ticker) => readable(ticker)), research };
}
