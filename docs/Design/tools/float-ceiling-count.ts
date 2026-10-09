/**
 * Read-only count for Integration 36th's float ruling (Design, 2026-10-09): names whose DRAWER shows a
 * float ceiling ("Float is at most {N}", floatBoundReading verdict PROVEN) while the BOARD CELL refuses
 * the float (floatCellView kind is not 'bound'). Uses the app's own two functions on one saved
 * /api/market payload; makes no request and writes nothing.
 *
 * Ops, on the box, in the production checkout (f015a071), outside 07:00-10:00 ET:
 *   1. one keyed GET of /api/market, saved to a file (e.g. /tmp/market.json)
 *   2. npx tsx --conditions=react-server docs/Design/tools/float-ceiling-count.ts /tmp/market.json
 * Output: the count, then one line per name: ticker, the drawer sentence, the cell face and reason.
 */
import { readFileSync } from 'node:fs';

import { floatCellView } from '../../../lib/dashboard/floatBound';
import { floatBoundReading } from '../../../lib/dashboard/supply';

const snapshot = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const intelligence: Record<string, any> = snapshot.intelligence ?? {};
const floatBounds: Record<string, unknown> | undefined = snapshot.floatBounds;

const rows: string[] = [];
let withPair = 0;
for (const [ticker, intel] of Object.entries(intelligence)) {
  const pair = intel?.analysis?.dossier?.structure?.supplyPair ?? null;
  if (!pair) continue;
  withPair += 1;
  const drawer = floatBoundReading(pair);
  if (!drawer || drawer.verdict !== 'PROVEN') continue;
  const cell = floatCellView((floatBounds?.[ticker] ?? null) as never);
  if (cell.kind === 'bound') continue;
  rows.push(`${ticker}\tdrawer: ${drawer.sentence}\tcell: ${cell.face} (${cell.paragraphs[0] ?? ''})`);
}

console.log(`floatBounds on payload: ${floatBounds ? 'yes' : 'NO (cell not wired: every cell is Not computed)'}`);
console.log(`names with research: ${Object.keys(intelligence).length}; with a share-count pair: ${withPair}`);
console.log(`drawer shows a ceiling the cell refuses: ${rows.length}`);
for (const row of rows.sort()) console.log(row);
