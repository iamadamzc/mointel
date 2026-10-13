# Writer re-test (L12): result (2026-10-13)

*Research-tmi. His yes "yes to $5" (Integration chat 1f30f0a2, queued input uuid 79180a7a, origin human, 2026-10-13T19:56:42.669Z, verified). Harness and predictions before any call (`2c005491`), Integration's run on that literal, raw committed before it was read (`f71c48c2`). Run 2026-10-13T20:26:11Z to 20:42:54Z, exit 0. Prompt v6 against v7 version 6 (the TV-desk voice `11357d86` plus the rating sentence `38a1130a`), both written by luna, on the 12 stored inputs (copy of 2026-10-07; 10-02, 10-05, 10-06; four kinds), checked by the checker that ships (`e56f27c0`: Claude Opus 5.5 high, word list off, no fallback). Figures from `tabulate.py` (the 10-13 tabulator, unchanged) and the raw records.*

## For him, plainly

**Is v7 as true as v6 under the shipping checker? Yes on the name lines, not yet on the evening recap's Summary.** v7's name lines were struck 5 times in 120 against v6's 14. But v7's Summary was struck in both evening recap (PREMARKET) reports that published, each for figures not in the facts it was given (11 and 4); v6's Summary was never struck. On the other kinds v7's Summary held.

**Does it read better? By every measure registered before the run, yes:** no clock times (v6: 11), the three ruled state phrases exact every time (v6 used two of them 0 of 22 times), "in our sources" in 8 lines against 32, less repetition (0.28 against 0.57), and shorter lines (31 words against 47). Its Summary is twice as long (165 words against 81).

## The numbers

| | v6 | v7 |
|---|---|---|
| Reports run / published | 12 / 10 | 11 / 10 (one refused by the stop) |
| Checks that failed (CHECKER_FAILED, counted against the arm) | 2 | 1 |
| Lines struck | 14 of 130 (10.8%) | 7 of 130 (5.4%) |
| Name lines struck | 14 of 120 | 5 of 120 |
| Summary struck | 0 of 10 | 2 of 10 (both PREMARKET) |
| On the 8 inputs both arms published | 10 of 104 lines | 7 of 104 lines |
| Advice or forecast read by the model | 1 (below) | 0 |
| Clock times | 11 | 0 |
| Ruled state phrases exact | NOT_RESEARCHED 0 of 18, NONE_FOUND 7 of 7, UNKNOWN 0 of 4 | 26 of 26, 7 of 7, 7 of 7 |
| Lines saying "in our sources" | 32 of 120 | 8 of 120 |
| Repetition (share of lines with the report's top 4-word sequence) | 0.57 | 0.28 |
| Mean words: line, Summary | 47.3, 81.3 | 30.6, 165.0 |

The one model read: v6, 2026-10-02 INTO_RTH, a FORECAST on "The listing may increase visibility" (a line about GOWell's listing). It is a forecast in the desk's own voice, correctly struck.

## Three things that went wrong in the run

1. **3 of 23 Claude checks failed** (the advice gate saw 0 of 32). Two replied in full (normal token counts) and the pipeline refused the reply as not a verdict for every line; one call failed after 8 seconds with no output. In production each would fall back to OpenAI with the word list on. **This harness did not keep the checker's raw reply, so I cannot say why two were refused**; production keeps it (diagnostics.checker). Worth watching in the first live week.
2. **The failed call cost the stop a report.** A call with no reported usage is charged its worst case ($0.80), so the spend reached $4.34 and the stop refused the last report (2026-10-06 AFTER_HOURS v7). Spend stayed under $5 as designed.
3. **The blind pairs are not fair as they stand.** 4 of the 10 fixed pairs are skipped (a report missing on one side), and in 2 of the remaining 6 v7's Summary is struck while v6's is not, which marks v7 (the 10-13 lesson). The rule registered with the predictions says the pairs do not go to him as they are. The 4 pairs with both Summaries standing are a fair read, but they are a choice made after the run; that is Integration's call.

## Against the predictions (`predictions.md`)

1. v7 within 5 points of v6, both under 15%: **held** (5.4% and 10.8%; v7 lower).
2. v7 Summary struck at most 3 of 12, v6 at most 2: **held** (2 and 0), but both of v7's are the evening recap.
3. No clock, ruled phrases exact, repetition no higher: **held**.
4. Advice or forecast in at most 2 reports an arm: **held** (1 and 0).
5. Failed checks 0 or 1: **failed** (3 of 23).
6. Cost $3.40 to $4.30, nothing refused: **failed** ($4.34; one report refused, from the failed call's worst-case charge).

## What would fix the recap Summary (not built)

v7's evening recap Summary states counts and figures from the name sheets that the recap facts do not give. The 10-13 test found the same cause for every kind; version 3 fixed it for the intraday kinds and not, it appears, for the recap. A prompt change scoped to the recap Summary, then a re-check of those reports only, is the next step if he wants v7 wired.
