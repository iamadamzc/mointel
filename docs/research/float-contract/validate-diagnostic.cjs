// EXPLORATORY, NOT REGISTERED (labeled so in result-2026-10-05.md). Tabulates what drives the state table in
// validation-out-2026-10-05/report.json, from the raw names/*.json only. No network, no store, $0.
const fs = require('node:fs');

const dir = process.argv[2];
const names = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.includes('FAILED'))
  .map((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')));
const withCount = names.filter((r) => r.count.state === 'PRODUCED');
const age = (r) => Math.floor((Date.parse(r.tradingDate) - Date.parse(r.count.asOf)) / 864e5);
const ISS = new Set(['ATM', 'EQUITY_PURCHASE_AGREEMENT', 'WARRANTS', 'CONVERTIBLES', 'PREFERRED_CONVERSION', 'RECENT_OFFERING', 'PIPE', 'ACQUISITION_SHARES', 'OTHER_ISSUED_SHARES']);
const flagged = (r, wide) => (r.ledger ?? []).some((b) => ISS.has(b.type) && (b.status === 'KNOWN_ACTIVE' || (wide && b.status === 'POSSIBLY_ACTIVE')));

const tally = (values) => values.reduce((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});
const out = {
  names: names.length,
  withCount: withCount.length,
  noCount: names.length - withCount.length,
  splitSinceCountAmongCounted: tally(withCount.map((r) => r.splitSinceCount)),
  holdingLevelSplitProofs: tally(withCount.flatMap((r) => Object.values(r.holdingSplit))),
  countedWithoutDossierLedger: withCount.filter((r) => r.ledger === null).length,
  countAgeDaysSorted: withCount.map(age).sort((a, b) => a - b),
  issuanceFlagged: { knownActive: withCount.filter((r) => flagged(r, false)).length, knownOrPossiblyActive: withCount.filter((r) => flagged(r, true)).length },
  drawDates: [...new Set(names.map((r) => r.tradingDate))].sort(),
  // What each gate alone would leave, ignoring the others (NOT the registered precedence).
  wouldPassIfOnlyThisGate: {
    age45: withCount.filter((r) => age(r) <= 45).length,
    age90: withCount.filter((r) => age(r) <= 90).length,
    age120: withCount.filter((r) => age(r) <= 120).length,
    splitProofNone: withCount.filter((r) => r.splitSinceCount === 'NONE').length,
    noKnownActiveIssuance: withCount.filter((r) => !flagged(r, false)).length,
    noKnownOrPossiblyActiveIssuance: withCount.filter((r) => !flagged(r, true)).length,
  },
  // All three gates at once, split gate IGNORED (to see what the split proof alone costs).
  wouldPassIgnoringSplitProof: {
    age45_known: withCount.filter((r) => age(r) <= 45 && !flagged(r, false)).length,
    age90_known: withCount.filter((r) => age(r) <= 90 && !flagged(r, false)).length,
    age120_known: withCount.filter((r) => age(r) <= 120 && !flagged(r, false)).length,
    age90_knownOrPossibly: withCount.filter((r) => age(r) <= 90 && !flagged(r, true)).length,
    age120_knownOrPossibly: withCount.filter((r) => age(r) <= 120 && !flagged(r, true)).length,
  },
};
console.log(JSON.stringify(out, null, 1));
