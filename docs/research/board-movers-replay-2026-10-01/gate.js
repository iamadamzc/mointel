/* eslint-disable @typescript-eslint/no-require-imports -- a one-off Node script run with plain node, kept as the record */
const out = require('./movers-raw.json');
for (const s of out.sessions) {
  for (const c of s.checkpoints) {
    if (!c.gate) continue;
    const g = c.gate;
    console.log(s.date, c.checkpoint, `overlap ${g.overlap}/${g.storedCount}`, g.pass ? 'PASS' : 'FAIL', 'copyAgrees=' + g.assessmentsCopyAgrees, 'pctMaxDiff=' + g.pctMaxAbsDiff.toFixed(3), c.gateNote || '');
    for (const m of g.missing) console.log('   missing', JSON.stringify(m));
  }
}
