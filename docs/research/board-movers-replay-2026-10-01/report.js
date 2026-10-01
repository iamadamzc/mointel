const fs = require('fs');
const path = require('path');
const out = require('./movers-raw.json');
const K = 10;
const f2 = (x) => (x === null || x === undefined ? 'n/a' : x.toFixed(2));
const f1 = (x) => (x === null || x === undefined ? 'n/a' : x.toFixed(1));
const rk = (x) => (x === null || x === undefined ? 'unranked' : String(x));

const L = [];
L.push('# Board movers: PRE-REGISTERED check result');
L.push('');
L.push('Spec: `A:\\mointel-cite2\\docs\\research\\board-movers-spec.md` at d02cfb36, section "PRE-REGISTERED CHECK". Parameters as registered: K = 10, FLOOR = +20%, top 50, gate 22 of 25, sessions 2026-09-14 to 2026-09-29, checkpoints 08:00, 09:00, 09:25, 10:00 ET.');
L.push('');
L.push('Data: `A:\\mointel\\data\\market-prod-2026-09-29.db`, opened read-only. Gate cross-check: `A:\\mointel\\data\\assessments-prod-2026-09-23.db` (covers to 09-22). Scripts: `movers.js` (replay), `report.js` (this file), raw output `movers-raw.json`, all in this folder.');
L.push('');
L.push('## Reconstruction, as implemented');
L.push('');
L.push('- Population: every `ticker_session` row for the date (the names the engine tracked that day).');
L.push('- Time: all twelve sessions are EDT, so 04:00 ET = 08:00Z; checkpoints t = 12:00Z, 13:00Z, 13:25Z, 14:00Z.');
L.push('- Price at t: close of the last minute bar with `ts` < t. A bar stamped t opens at t and closes after it, so "at or before t" is read as bars that had closed by t.');
L.push('- RVOL at t: sum of minute-bar volume with 08:00Z <= `ts` < t, divided by the row\'s stored `baseline_average`.');
L.push('- percent_change at t: price at t against `ticker_session.previous_close`. Why that column: `engine.ts:1644` measures against `runtime.reference?.close`, which `resolveReferenceRthClose` (`derive.ts:24-56`) sets to the PRIOR session close before 16:00 ET. That prior close is `baseline.previousClose` (`engine.ts:736-750`), persisted as `previous_close` (`engine.ts:2327`). The column that persists `runtime.reference` itself, `reference_rth_close` (`engine.ts:2329`), holds the END-OF-DAY state: on 90% or more of rows per date its basis is CURRENT_SESSION (today\'s close), so it cannot serve a morning checkpoint. Validated: the stored `desk_assessment_tickers.reference_close` equals `previous_close` on 600 of 600 gate rows, all with basis PRIOR_SESSION.');
L.push('- Band: $1 to $20 by price at t. Latch NOT replayed (as registered).');
L.push('- Ranking: RVOL descending, ties by symbol, over names with RVOL non-null, in band, and `universe.discovery_eligible = 1` (the engine rule: `worker/runtime.ts:589-590` excludes a symbol with no universe row once the eligible set is non-empty).');
L.push('- Rule candidates: in band, not in the reconstructed top 50, percent_change >= 20, universe eligibility as `readRangeCandidates` applies it (flag 1 or no universe row), as the spec\'s Files section names; sorted by percent_change descending; first K added.');
L.push('- Universe flags are the 09-29 snapshot (stated in the spec as a limit).');
L.push('');

// Gate
L.push('## 1. Instrument gate (09:25 and 10:00)');
L.push('');
L.push('Stored set: the 25 names of the COMPLETE `OPEN_SPIKE_ASSESSMENT` (13:25Z) and `RTH_INTERVAL` scheduled 14:00Z in the market copy\'s `desk_assessments`; exactly one per checkpoint. Where the assessments copy also covers the date (09-14 to 09-22) its 25 names are identical.');
L.push('');
L.push('| Session | 09:25 overlap | 10:00 overlap | Gate |');
L.push('|---|---|---|---|');
const gated = [];
const failed = [];
for (const s of out.sessions) {
  const g = (lab) => s.checkpoints.find((c) => c.checkpoint === lab).gate;
  const a = g('09:25');
  const b = g('10:00');
  const pass = a.pass && b.pass;
  (pass ? gated : failed).push(s);
  L.push(`| ${s.date} | ${a.overlap}/25 | ${b.overlap}/25 | ${pass ? 'PASS' : 'FAIL, EXCLUDED'} |`);
}
L.push('');
L.push('A session is gated as a whole: it is kept only if both its 09:25 and 10:00 checkpoints reach 22 of 25. Its 08:00 and 09:00 checkpoints have no assessment of their own and ride on that session gate.');
L.push('');
L.push('**Every stored name the reconstruction missed is outside $1 to $20 at t, in both the stored and the reconstructed price** (sub-$1 names, plus ELMT, MG, PARK, QURE, SRZN above $20). Production ranks them because the latch keeps a name that once qualified rank-eligible after it leaves the band (`engine.ts:1744-1745`); the registered reconstruction does not replay the latch. On 09-28 and 09-29 production carried many latched sub-$1 names in its top 25, so those two sessions fail and are excluded. No in-band stored name was missed on any checkpoint.');
L.push('');
L.push('Missing names per checkpoint:');
L.push('');
for (const s of out.sessions) {
  for (const c of s.checkpoints) {
    if (!c.gate || c.gate.missing.length === 0) continue;
    L.push(`- ${s.date} ${c.checkpoint}: ` + c.gate.missing.map((m) => `${m.symbol} (stored #${m.storedRank}, $${m.storedPrice})`).join(', '));
  }
}
L.push('');

// Rule results
const cps = [];
for (const s of gated) for (const c of s.checkpoints) cps.push({ date: s.date, ...c });
const counts = cps.map((c) => c.added.length).sort((a, b) => a - b);
const median = (arr) => (arr.length % 2 ? arr[(arr.length - 1) / 2] : (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2);
const binding = cps.filter((c) => c.beyondK > 0);
const violators = cps.filter((c) => c.pass1Violators.length > 0);

L.push('## 2. Rule results on gated checkpoints');
L.push('');
L.push(`Gated sessions: ${gated.length} (${gated.map((s) => s.date).join(', ')}). Gated checkpoints: ${cps.length}.`);
L.push('');
L.push(`- Names added per checkpoint: min ${counts[0]}, median ${median(counts)}, max ${counts[counts.length - 1]}; total ${counts.reduce((a, b) => a + b, 0)}.`);
L.push(`- Cap binding (qualifying names beyond K = 10): ${binding.length} of ${cps.length} checkpoints; names left off by the cap, total ${binding.reduce((a, c) => a + c.beyondK, 0)}.`);
for (const lab of ['08:00', '09:00', '09:25', '10:00']) {
  const sub = cps.filter((c) => c.checkpoint === lab);
  const n = sub.map((c) => c.added.length).sort((a, b) => a - b);
  L.push(`  - ${lab}: added min ${n[0]}, median ${median(n)}, max ${n[n.length - 1]}; cap binds ${sub.filter((c) => c.beyondK > 0).length} of ${sub.length}.`);
}
L.push('');
L.push('## 3. PASS clause (1)');
L.push('');
L.push(violators.length === 0
  ? `PASS. On all ${cps.length} gated checkpoints, no in-band name with percent_change >= 20% and a move larger than the smallest added name was left off. Checked by scanning every in-band, off-top-50 name at each checkpoint, not by assuming the sort.`
  : `FAIL on ${violators.length} checkpoints: ` + violators.map((c) => `${c.date} ${c.checkpoint} (${c.pass1Violators.join(', ')})`).join('; '));
L.push('');
L.push('Clause (2), VEEA today, is a live read through Ops and is not part of this local check.');
L.push('');

// Notable
const best = new Map();
for (const c of cps) for (const a of c.added) {
  const cur = best.get(a.symbol);
  if (!cur || a.pct > cur.pct) best.set(a.symbol, { ...a, date: c.date, checkpoint: c.checkpoint });
}
const notable = [...best.values()].sort((a, b) => b.pct - a.pct);
L.push('## Largest added moves (each symbol at its largest added reading)');
L.push('');
L.push('| Symbol | Session | Checkpoint | percent_change | RVOL rank | Price |');
L.push('|---|---|---|---|---|---|');
for (const a of notable.slice(0, 15)) L.push(`| ${a.symbol} | ${a.date} | ${a.checkpoint} | +${f1(a.pct)}% | ${rk(a.rank)} | $${f2(a.price)} |`);
L.push('');
L.push(`Distinct symbols added across gated checkpoints: ${best.size}. Added names with no universe row: ${[...best.values()].filter((a) => a.universe === null).map((a) => a.symbol).join(', ') || 'none'}.`);
L.push('');

L.push('## Per checkpoint detail');
L.push('');
for (const c of cps) {
  L.push(`### ${c.date} ${c.checkpoint} ET`);
  L.push('');
  L.push(`Ranked names: ${c.rankedCount}. Qualifying off-board names: ${c.qualifying}. Added: ${c.added.length}. Beyond K: ${c.beyondK}.`);
  const lo = c.largestOff;
  L.push(`Largest in-band move off the top 50 before the rule: ${lo ? `${lo.symbol} ${lo.pct >= 0 ? '+' : ''}${f1(lo.pct)}% (rank ${rk(lo.rank)}, $${f2(lo.price)})` : 'none'}.`);
  L.push('');
  if (c.added.length) {
    L.push('| Added | percent_change | RVOL rank | Price |');
    L.push('|---|---|---|---|');
    for (const a of c.added) L.push(`| ${a.symbol} | +${f1(a.pct)}% | ${rk(a.rank)} | $${f2(a.price)} |`);
    L.push('');
  }
  if (c.beyondK) {
    L.push('Left off by the cap: ' + c.beyondKList.map((a) => `${a.symbol} +${f1(a.pct)}%`).join(', ') + '.');
    L.push('');
  }
}

L.push('## Departures from the registration and limits');
L.push('');
L.push('- None in parameters. Interpretations stated above: price "at or before t" read as bars closed by t; universe eligibility for ranking follows the engine (flag 1 required) and for the rule follows `readRangeCandidates` (flag 1 or no row), per the spec\'s own description of each.');
L.push('- The gate fails only on latched out-of-band names. Because the latch is not replayed, the reconstructed top 50 contains in-band names that production\'s top 50 would have displaced with latched names; on those checkpoints production\'s rule would see a slightly larger off-board pool than this replay does (inferred, not measured).');
L.push('- Stored assessment prices are live trade prices a few seconds after t; the reconstruction uses the prior minute close. 15 of 600 gate rows differ by more than 5 percentage points of percent_change for that reason; the reference close itself agrees on 600 of 600.');
L.push('- Sessions 09-28 and 09-29 are excluded by the gate, so the rule results cover ten sessions, not twelve.');

const text = L.join('\n') + '\n';
if (/[\u2014\u2013]|&mdash;|&ndash;/.test(text)) throw new Error('dash glyph present');
fs.writeFileSync(path.join(__dirname, 'movers-check-result.md'), text);
console.log(JSON.stringify({ gated: gated.map((s) => s.date), failed: failed.map((s) => s.date), cps: cps.length, counts, median: median(counts), binding: binding.length, beyond: binding.reduce((a, c) => a + c.beyondK, 0), violators: violators.length, top: notable.slice(0, 8).map((a) => [a.symbol, a.date, a.checkpoint, +a.pct.toFixed(1), a.rank, a.price]), noUniverse: [...best.values()].filter((a) => a.universe === null).map((a) => a.symbol), distinct: best.size }));
for (const lab of ['08:00', '09:00', '09:25', '10:00']) {
  const sub = cps.filter((c) => c.checkpoint === lab);
  console.log(lab, sub.map((c) => c.added.length).join(','), 'binding', sub.filter((c) => c.beyondK > 0).length);
}
console.log('largestOff', cps.map((c) => `${c.date.slice(5)} ${c.checkpoint} ${c.largestOff && c.largestOff.symbol} ${c.largestOff && c.largestOff.pct.toFixed(0)}`).join(' | '));
