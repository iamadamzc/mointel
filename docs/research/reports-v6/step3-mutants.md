# v6 narrative v2, build step 3 (the checker): mutant predictions (written BEFORE any test ran)

*Research-tmi `local_dd23765d`, 2026-10-06 (UTC date of its commit). Spec: `narrative-redesign-proposal.md` "Build plan" step 3 (on main). NOT RUN: no tsc, eslint or vitest has run on this commit; it waits on an Ops slot.*

## What changed

`lib/desk/reports/check.ts`, `narrativeFindings` (the deterministic half for the narrative, line id O):

- **Numbers: as the v2 sheet prints them** (`narrativeSheet`): the counts (50 percent movers, gave back, kept half, covered movers, the three F12b counts, fresh, covered, carried), WHOLE percents (the named movers' high and close, the after-hours name, the intraday named names; "less than 1" reads as 1), prices at two places (the context: close, session high, support, resistance, older high), the intraday change notes' figures. The leader's one-decimal percent is no longer given and is struck. Breadth and the range bounds stay allowed (the sheet dropped them; a true one is not struck).
- **The named names' catalyst summaries** (the sheet tells the writer it may repeat "the catalyst's own figure"): their figures, compared at the claim's own precision and unit as a name line's are (`roundsTo`, "$46.8M" for "$46.802 million"), their dates (`dateAllowed`, now exported from `traced.ts`) and a bare year a date carries. The reader is now `claimsIn` (the name lines' reader: a number touching a letter, "10-year", "13D", "8-K", is a name, not a claim; dates are their own claims, struck as `DATE_NOT_TRACED` when no named catalyst carries them).
- **Tickers: the named set** (the recap's named movers and its after-hours name; intraday, the leader and the next two). Any other covered ticker is `NOT_SELF_CONTAINED`.
- **Anchors:** "ran at least 50 percent above" (and the v1 "ran past 50 percent") must carry the 50 percent count; "gave the entire move back" the gave-back count. "four of the nine" reads four. An anchor with no count before it is no longer struck (it states no count to contradict).
- **G left the prose (N11 retired):** no omission strike; G and the split count are not given numbers, so stating them is struck. `OMITTED_FACT` stays in the type for stored strikes.
- **Clock:** the recap narrative may say the sheet's "16:00 close" frame when it has an after-hours name.
- **Model:** `CHECKER_SYSTEM_V6` admits an INTERPRETATION only when the same sentence names the given facts it rests on; the blanket "any theme" ban is gone (his v2 ruling allows a labeled pattern or theme). Checker prompt version 5 to **6**.
- `narrativeSheet` loses its unused `_range` (the step 2 lint warning).

**Not in this step, stated:** F14 (per-name theme labels) is not built and the writer returns none, so there is no label to check (settled as option (b), a computed line the surface prints). A swap of kept-half to another given count (4 written as 5) passes the rules: the third anchor was drafted and dropped, because "held half" also reads a single name's move and would strike true prose; the test file states it as a LIMIT, the model's to read.

## Tests

`tests/desk/reportCheckV6.test.ts`, **18 tests** (`grep -c "  it("`): narrative 10 (controls, numbers, whole percents, summary figures and dates, G retired, tickers, window, anchors, "of the nine", the LIMIT), ruleStrikes 4 (name-count exemption, 16:00 frame, citation token, prompt), applyStrikes 4 (unchanged). Changed elsewhere, because they encoded the old rules: `reportWriterV6.test.ts` (two `narrativeSheet` calls lose the range), `reportPipeline.test.ts` (its narrative fixture said "12.5 percent", now the sheet's whole "13"), `reportRunner.test.ts` (checker prompt version 6).

## Mutants (each applied alone to `check.ts`; `reportCheckV6.test.ts` run; predicted FAILING tests)

| # | Mutant | Predicted | Which |
|---|---|---|---|
| M1 | `sheetPercent` drops `\|\| 1` | 1 | whole percents ("less than 1") |
| M2 | the bare-year allowance removed | 1 | summary figures and dates |
| M3 | summary figures compared exactly, not by `roundsTo` | 9 | controls, numbers, whole percents, summary, G retired, tickers, anchors, LIMIT, 16:00 frame (every exact-array test on the recap template, which says "$46.8M") |
| M4 | dates compared exactly, not by `dateAllowed` | 9 | the same nine ("September 29" against "2026-09-29") |
| M5 | `namedTickers` drops the after-hours name | 8 | the nine of M3 less tickers (its recap case strikes once either way, both names in one finding) |
| M6 | `noClose` back among the given numbers | 1 | G retired |
| M7 | `splitExcluded` among the given numbers | 1 | G retired |
| M8 | the gave-back anchor removed | 2 | anchors, "of the nine" |
| M9 | the "N of the M" rule in `countBefore` removed | 1 | "of the nine" |
| M10 | an anchor with no count struck (`null` as a mismatch) | 1 | "of the nine" (its third case) |
| M11 | the 16:00 frame removed | 1 | 16:00 frame |
| M12 | the 16:00 frame allowed with no after-hours name | 1 | 16:00 frame |
| M13 | the change notes' figures not given | 7 | controls, numbers, whole percents, summary, tickers, window, name-count exemption (every exact test on the intraday template, which says "32.2%") |
| M14 | the interpretation sentence dropped from `CHECKER_SYSTEM_V6` | 1 | prompt |
| M15 | `sheetPercent` keeps one decimal | 11 | controls, numbers, whole percents, summary, G retired, tickers, window, anchors, LIMIT, name-count exemption, 16:00 frame |

Control M0 (no mutant): 18 tests, 0 failing. Gate in the slot: `tsc --noEmit`, `eslint` on the seven touched `.ts` files (three in lib, four tests), then vitest on `tests/desk/{reportCheckV6,reportWriterV6,reportPipeline,reportRunner}.test.ts`, then the mutants, raw output committed before it is read.

## Seam-read amendment (Integration 28th's two questions), written BEFORE any run of it

*Research-tmi `local_dd23765d`, after the 2026-10-06 self-reset. NOT RUN: no tsc, eslint or vitest has run on this amendment; it waits on an Ops slot.*

**(3) Breadth and the range bounds: struck.** The writer's prompt carries neither (`narrativeSheet` drops both, `writerV6.ts:167-176`; `buildWriterPromptV6` sends no range, opened). The checker compared them to the stored facts, so they were not untraced, but the writer had nothing to copy them from, so a stated one could only be invented, and admitting them widened the set a swap can hide behind. `givenNumbers` no longer takes the range or the breadth; `narrativeFindings` loses its `range` parameter. N10 (the breadth window check) is retired with it: it could only add a second reason to a line already struck. `WINDOW_CONTRADICTED` stays in the type for stored strikes. Checker prompt text unchanged (version stays 6).

**(4) An anchor with no count is struck when its count is 0** ("Some names gave the entire move back" when none did). With a nonzero count it is still not struck (it states no count to contradict). "None ran at least 50 percent" reads as 0 and passes.

**Tests:** `reportCheckV6.test.ts` now **19** (`grep -c "  it("`): the window test is replaced by "breadth and the range bounds are not on the sheet" (true breadth with its window's words is struck; the range top is struck; a frame mention of after-hours with no number is not); a new zero-anchor test; `GOOD_INTRADAY` loses its breadth and range clause; the numbers test's intraday case is now exact (13 for 12). `reportPipeline.test.ts`: its `NARRATIVE` fixture loses the breadth and range clause, and its struck-number case changes 13 to 14 percent (2,700 is no longer stated).

**Every earlier mutant re-predicted against the whole suite at this commit** (the ledger cure: count against the suite at run time, not the introducing commit). Changed: M3 9 to **10**, M4 9 to **10**, M5 8 to **9** (each adds the breadth test, whose recap cases are exact), M8 2 to **3** (adds the zero-anchor test), M10 1 to **2** (adds the zero-anchor test's nonzero case). Unchanged: M1 1, M2 1, M6 1, M7 1, M9 1, M11 1, M12 1, M13 7 (the breadth test replaces the window test in its list), M14 1, M15 11 (the same).

| # | Mutant | Predicted | Which |
|---|---|---|---|
| N1 | the range top (20) among the given numbers | 1 | breadth and range |
| N2 | the breadth among the given numbers | 1 | breadth and range |
| N3 | the zero-count anchor rule removed | 1 | zero anchor |
| N4 | an anchor with no count struck at any count | 2 | "of the nine" (third case), zero anchor (its nonzero case) |

Runner amended in place (`step3-mutants.mjs`): 19 mutants, predicted kills 65; dry check: every edit matches exactly once. Gate in the slot: `next typegen`, `tsc --noEmit` (with a planted-error control), `eslint` on `check.ts`, the two test files and the runner, vitest on `tests/desk/{reportCheckV6,reportWriterV6,reportPipeline,reportRunner}.test.ts` (19 + 9 + 6 + 4 = 38), then the mutants, raw committed before it is read.
