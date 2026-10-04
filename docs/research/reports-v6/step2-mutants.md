# v6 narrative v2, build step 2 (the writer): mutant predictions (written BEFORE any test ran)

*Research seat `local_ab66f9f3`, 2026-10-04. Code: `lib/desk/reports/writerV6.ts` (v2 narrative sheet, `wholePercent`, the v2 rules, prompt version 8). Tests: `tests/desk/reportWriterV6.test.ts`, **9 tests** (counted by opening the file: `grep -c "it("`), of which 4 are new or rewritten (wholePercent, intraday sheet, recap sheet, SYSTEM_V6 v2 rules). One checker test line moves to the new wording (`reportCheckV6.test.ts:112`). Each mutant is applied alone and `reportWriterV6.test.ts` is run.*

| # | Mutant (in `writerV6.ts`) | Predicted failing tests | Which |
|---|---|---|---|
| W1 | round the one-decimal display, not the exact value | 3 | wholePercent (68.46 gives 69); intraday sheet (68 and 51 become 69 and 52); recap sheet (156.46 gives 157) |
| W2 | "less than 1" branch removed | 1 | wholePercent |
| W3 | the after-hours line loses its ALWAYS-label instruction | 1 | recap sheet |
| W4 | F12b prints zero counts (`>= 0`) | 1 | recap sheet ("had no fresh news found" appears) |
| W5 | intraday basis words inverted | 1 | intraday sheet |
| W6 | the not-researched branch never taken | 1 | intraday sheet (BBB reads "news: unknown") |
| W7 | GREEN cycle word changed | 1 | intraday sheet |
| W8 | the GAINERS sentence removed from the rules | 1 | SYSTEM_V6 v2 rules |
| W9 | the carried-count line loses "(state the count only, never list them)" | 1 | recap sheet (its last line) |
| W10 | the older-high clause never printed | 1 | recap sheet (context line) |

**Out of this step, raised with Integration rather than built:** F14 (per-name theme labels). The model cannot be handed a count of labels it writes in the same reply, and the narrative may not count; so "three were deals or contracts" needs the labels to exist BEFORE the narrative is written (a separate step or a stored field), or a computed line the surface prints. Breadth is also out of the sheet, following Marketing's final examples (neither uses it); its numbers stay allowed in the checker.
