# L6 restate: mutants with predicted kills (2026-10-14)

Code: `lib/research/splitRestate.ts`. Tests: `tests/research/splitRestate.test.ts` (16 `it` blocks under restateSpan, 2 under the holding span (read 110), 13 under restateCount; a kill is counted per `it` block). Predictions were derived by reading the tests, before any run. Each mutant is one exact text replacement in splitRestate.ts. A mutant that kills fewer tests than predicted is the signal that a guard is vacuous.

| # | Old text | New text | Predicted kills | Which tests |
|---|---|---|---|---|
| 1 | `if (!(action.exDate > from && action.exDate <= to)) continue;` | `if (!(action.exDate > from && action.exDate < to)) continue;` | 1 | counts an ex-date ON `to` as inside the span |
| 2 | `if (action.exDate === from) {` | `if (action.exDate === to) {` | 4 | ON `to` inside; ON `from` refuses; non-split ON `from` refuses; refusal precedence (EX_DATE_ON_FROM step) |
| 3 | `if (!SPLIT_GROUPS.has(action.group)) {` | `if (action.group === 'stock_dividends') {` | 1 | R2: every other Alpaca group refuses |
| 4 | `if (cutoff === null \|\| action.exDate < cutoff) older = true;` | `if (cutoff === null \|\| action.exDate <= cutoff) older = true;` | 2 | the 9-month cutoff; the cutoff clamps to the month end |
| 5 | `if (filed !== null && action.exDate <= filed) filedAfter = true;` | `if (filed !== null && action.exDate < filed) filedAfter = true;` | 2 | R3 (filed ON the ex-date); R3 for holdings (filed ON the ex-date) |
| 6 | `for (const split of splits) factor *= split.newRate / split.oldRate;` | `for (const split of splits) factor *= split.oldRate / split.newRate;` | 15 | restateSpan: outside ignored, R4 orientation, composes, ON `to`, 9-month cutoff (5); restateCount: listed refusal control, UNPROVEN, NONE control, 6-for-5 FOUND control, 1 percent, YAAS, price side, shares side, last non-null, two splits (10) |
| 7 | `const announced = 1 / listed.factor;` | `const announced = listed.factor;` | 9 | restateCount: listed refusal control, NONE control, 6-for-5 FOUND control, 1 percent, YAAS, price side, shares side, last non-null, two splits |
| 8 | `return barsProof === 'NONE' ? { kind: 'AS_TODAY' }` | `return barsProof !== 'FOUND' ? { kind: 'AS_TODAY' }` | 1 | R1: nothing listed with bars UNPROVEN refuses |

Notes:

- Mutant 6 survives only in the restateCount test where the step cannot be read (it refuses either way), and in every test that checks only `.kind` of a restatement or a refusal reason.
- Mutant 7 is the bars-side orientation flip: under it a reverse split's bars running 1 then 10 (the rejected, shares-side reading) would be proven, which is exactly what the shares-side test pins.
- A ninth, outside the table: deleting `if (barsProof === 'NONE') return { kind: 'REFUSE', why: 'BARS_DISAGREE' };` is predicted to kill 1 (the 6-for-5 test). Every other NONE test uses a 1-for-10, whose step can never agree with bars that moved less than 1.25, so without the 6-for-5 case this line would die silently.
