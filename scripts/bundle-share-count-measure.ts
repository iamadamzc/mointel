/**
 * The population the bundle share-count fix changes (Integration 39th, 2026-10-13): of the current dossiers on a STORE
 * COPY, how many had a usable company-facts share count stored at the time of their analysis that the 28-source cap left
 * out of their bundle (so the dossier said "No filed share count"), and how many the fix now gives one. Read-only; no
 * network, no model.
 *
 *   node --import tsx scripts/bundle-share-count-measure.ts <store-copy>
 */
import { openDatabase } from '../lib/market/store/db';
import { readCurrentAnalyses, readSources } from '../lib/market/store/researchRepo';
import { buildEvidenceBundle } from '../lib/research/interpret/bundle';

const [dbPath] = process.argv.slice(2);
if (!dbPath) throw new Error('usage: bundle-share-count-measure.ts <store-copy>');
const db = openDatabase(dbPath, { readonly: true, skipSchema: true });
const tickers = (db.prepare('SELECT ticker FROM research_dossiers ORDER BY ticker').all() as Array<{ ticker: string }>).map((r) => r.ticker);
const current = readCurrentAnalyses(db, tickers);

const usable = (s: { sourceType: string; metadata: Record<string, unknown> }) =>
  s.sourceType === 'SEC_COMPANY_FACTS' && typeof s.metadata.sharesOutstanding === 'number' && s.metadata.sharesOutstanding > 0 && typeof s.metadata.asOf === 'string';

let withCount = 0;
let lostToCap = 0;
let fixedNow = 0;
let overCap = 0;
const named: string[] = [];
for (const ticker of tickers) {
  const version = current.get(ticker);
  if (!version) continue;
  const asOf = version.generatedAt;
  const all = readSources(db, ticker, { asOf });
  if (all.length > 28) overCap += 1;
  if (!all.some(usable)) continue;
  withCount += 1;
  // The bundle as it was before the fix: canonical first, then newest, cap 28 (bundle.ts at 2fa909bf).
  const before = [...all]
    .sort((a, b) => (a.canonical !== b.canonical ? (a.canonical ? -1 : 1) : (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')))
    .slice(0, 28);
  if (before.some(usable)) continue;
  lostToCap += 1;
  const after = buildEvidenceBundle(db, { ticker, tradingDate: asOf.slice(0, 10), asOf });
  if (after.reportedSharesOutstanding) fixedNow += 1;
  named.push(`${ticker} (${all.length} sources)`);
}
db.close();
console.log(`store ${dbPath}; current dossiers ${current.size} of ${tickers.length} tickers`);
console.log(`dossiers whose sources at analysis time exceed the 28 cap: ${overCap}`);
console.log(`dossiers with a usable company-facts count stored at analysis time: ${withCount}`);
console.log(`of those, the cap left the count OUT of the bundle (the old code): ${lostToCap}; the fix gives a count to: ${fixedNow}`);
console.log(`names: ${named.join(', ') || 'none'}`);
