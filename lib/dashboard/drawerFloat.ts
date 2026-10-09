/**
 * THE DRAWER'S FLOAT LINE FOLLOWS THE BOARD CELL'S VERDICT (Integration 36th's ruling on Commercial read 49
 * finding (a), 2026-10-09). The drawer computed its own ceiling ("Float is at most {N} shares outstanding")
 * from the share count alone (`floatBoundReading`), with none of the cell's checks: count age, a flagged or
 * filed issuance since the count, a split. On WORX on 2026-10-08 the cell refused the count (449,860 shares
 * issued since it) while the drawer printed "Float is at most 89,789".
 *
 * Rule: where the float is wired and the cell REFUSES (Unknown, Cannot verify), the drawer prints no float
 * line of its own; it prints the cell's own refusal sentence (`floatCellView`, the passed words, no new
 * string). Where the cell prints a number, or reads "Not computed" (not a refusal: the desk has not run the
 * float for the name), or the float is not wired, the drawer's line is unchanged.
 */

import type { SupplyPair } from '@/lib/research/supply';

import { floatCellView, type FloatBound } from './floatBound';
import { floatBoundReading, type FloatBoundReading } from './supply';

export interface DrawerFloatLine {
  sentence: string;
  detail: string | null;
  tone: 'pos' | 'dim';
  /** True when the line is the board cell's refusal, not the drawer's own reading. */
  refusedByCell: boolean;
}

export function drawerFloatLine(
  pair: SupplyPair | null | undefined,
  cell: FloatBound | null | undefined,
  floatWired: boolean,
): DrawerFloatLine | null {
  const reading: FloatBoundReading | null = floatBoundReading(pair);
  if (!reading) return null;
  const own: DrawerFloatLine = { sentence: reading.sentence, detail: reading.detail ?? null, tone: reading.tone === 'pos' ? 'pos' : 'dim', refusedByCell: false };
  if (!floatWired) return own;
  const view = floatCellView(cell ?? null);
  if (view.kind !== 'unknown' && view.kind !== 'cannotVerify') return own;
  return { sentence: view.paragraphs[0] ?? view.face, detail: null, tone: 'dim', refusedByCell: true };
}
