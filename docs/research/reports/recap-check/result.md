# Recap re-check (L13): result (2026-10-14)

*Research-tmi. His yes "yes to all three" (Integration chat 1f30f0a2, uuid 8e3e419f, item 2, verified at his turn). Literal `e67a49db` (Integration's GO); predictions and pass rule committed before any call; raw committed before it was read (`0374313a`). Run 2026-10-14T01:19:00Z to 01:24:47Z, exit 0, **$1.5739 of the $2.50 stop**, 9 of 9 reports run, one checker call per report (the reserve's assumption held).*

## For him, plainly

**Option 1 FAILED its rule.** The prompt list stopped most off-list names (1 draft of 9 named one, against both published recaps in L12), but the recap Summary found a new way to say what the recap facts do not give: **a rank sentence** ("Intraday, MI ranked first in this range", "MI ranked first in this range") in 5 of 9 drafts. The Summary was struck in **5 of 7** published reports (L12: 2 of 2). The name lines held (3 of 84 struck in the 7 published reports). By his own rule, option 2 needs a new word from him.

## Against the pass rule

1. From the draft: **FAIL**, 1 of 9 (2026-10-02 run 1 named VCIG, outside [AMOD, CYCU, MI]).
2. From the checker: **FAIL**, that Summary was struck for it (rule NOT_SELF_CONTAINED and the model read).

## Every Summary strike (5 of 7 published)

| Report | Cause, from the strike |
|---|---|
| 10-02 run 1 | VCIG named ("Intraday, VCIG ranked first in this range") |
| 10-02 run 3 | "Intraday, the name ranked first...": a rank the facts do not give |
| 10-05 run 2 | "MI ranked first in this range" and "57.3" (a change note, not a narrative fact) |
| 10-05 run 3 | "Intraday, MI ranked first in this range" |
| 10-06 run 1 | "Zero gave the entire move back" (the count rule wants the number) |

Four of five are the same thing: the writer adds the in-range rank to the recap Summary. The name sheets say "ranked #N in this range", and the voice tells it to "say a rank as a rank ("ranked first in this range")". The recap's facts give no rank.

## Two checks failed, and the cause is in the checker that ships (NOT the writer)

Both failed reports (10-05 run 1, 10-06 run 2) got a full, well-formed Claude reply with a verdict for every line **plus one for `H`** ("No headline was provided to check."). v7 writes no headline, so `parseVerdicts` refuses the whole reply on `unknown id H` (`check.ts:1035`), and the report is CHECKER_FAILED. In production that report falls back to the OpenAI checker with the word list ON. The raw replies are kept this time (`checkerReplies` in each file). This is very likely the cause of L12's two refused replies too (not proven: L12 kept no replies). Same code in `82d81e22` (`check.ts:1035`). 2 of 9 here; with L12, about 4 of 32.

## Against the predictions

1. Off-list names 0 of 9: **failed** (1).
2. Summary struck at most 2 of 9: **failed** (5 of 7 published).
3. Failed checks 0 to 2: **held** (2; both the `H` verdict).
4. Name lines struck at most 4: **held** (3: a misattribution, and a reverse-split date the research does not give, twice).
5. Spend $1.45 to $1.75, all 9 run: **held** ($1.5739).
6. No "ranked first" in 9 of 9: **failed** (a rank word in 5 of 9).
7. Judgement or kind lines at most 2, each stated by the source: **count failed (8), content held**: read by hand, all 8 are clean: "positive" is Kairos's own attributed word, in its research (KAPA, 3; allowed by read 107); "operations" and "operating system" are not a catalyst kind (XHG 3, NIQ 1; the measure's false positives); "no fresh operating catalyst" is the research's own words (VRAX 1).
8. Count sentence 9 of 9: **held**.

## What would fix it (not built; each needs his word)

- **1b, one more sentence (no structure change):** "A recap's Summary gives no rank and no change since the previous checkpoint; those are for the intraday reports. Use each count as a number." Re-check: the same 9 reports, about $1.60, stop $2.50.
- **2, structural (sized `d40c5dff`):** the name sheets after a clear break, or no Summary in the recap (the name lines only). About half a day, the same re-check.
- **Wire v7 for the intraday kinds only, keep v6 for the recaps:** v6's recap Summary was never struck in L12, and v7's intraday Summaries held there. No spend; the wiring is written (`A:/mointel-wire`) and would need one switch by kind. This changes what he approved ("after fixing its recap summary"), so it is his to choose.

Separately, the `H` verdict refusal in the shipping checker is Integration's and Ops's to route (a fix would drop an `H` verdict when the draft has no headline; not built).
