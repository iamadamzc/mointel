# Summary-length re-check (L13, fourth run): RESULT, FAIL (2026-10-14)

*Research-tmi (local_dd23765d). Literal `503ff4a4` (code `7ba30ab2`, Integration's GO); pass rule and predictions `predictions.md`, committed before any call, with Commercial read 122's two measures; raw `raw/` committed at `83d99065` before it was read past the console's spend lines. Ops's slot. Spend $5.5590 of the $8 stop (his "a", uuid 0be89a81: "about $5.50, hard stop $8"). 36 of 36 run, 36 published, 0 failed checks, 0 writer errors. Every Summary measure on the PUBLISHED narrative.*

## The pass rule

| rule | result |
|---|---|
| RECAPS 1. no off-list ticker | **0 of 9: holds** |
| 2. no rank | **0 of 9: holds** |
| 3. at most 1 Summary struck | **0 of 9: holds** |
| 4. the count sentence in EVERY published Summary | **5 of 9: FAILS** |
| 5. the after-hours name in every published Summary whose facts give one | **9 of 9: holds** |
| INTRADAY 6. at most 2 of 27 Summaries struck | **8 of 27: FAILS** |
| 7. the count sentence in EVERY published Summary | **16 of 27: FAILS** |
| 8. the first-ranked name in every published Summary | **19 of 27: FAILS** (the 8 missing are the 8 struck Summaries) |
| BOTH 9. read 107 (a) by hand | **holds** (below) |
| 10. failed checks at most 1 and 3 | **0: holds** |

**FAIL**, both groups. Nothing moves: the recaps stay on v6 and the intraday prompt stays at production's.

## Why, from the raw

**Recaps (rule 4):** 4 of 9 drafts ran 5 sentences (2026-10-02 run 2; 2026-10-05 all three runs) with the count sentence last, so the cut to 4 removed it; the other 5 drafted 4 and kept it. The length sentence moved the after-hours line inside the cap (9 of 9; the third run lost it on two of three days) but not the count on every draft.

**Intraday (rules 6 to 8): the length limit created a new strike.** 24 of 27 drafts kept to 3 sentences, and to fit, the writer joined each move to its news in one sentence with "after" ("AMOD was up 181 percent from the prior close after Alpha Modus reported..."). The checker read that as stating a cause and struck the whole Summary in 7 reports (2026-10-02 INTO_RTH run 3, INTO_POWER_HOUR runs 1 and 2, AFTER_HOURS runs 2 and 3; 2026-10-06 AFTER_HOURS runs 1 and 3); an 8th was struck for dating a license "October 5" that was signed September 30 and disclosed October 5. v6's recap rule joins a mover to its news "by 'with', never causal" (`writerV6.ts:186`); v7 has no such line, and the third run's longer Summaries put move and news in separate sentences. 3 drafts went over the cap (4, 4, 5 sentences) and lost the count. A struck Summary publishes nothing, so a reader of those 8 reports got no Summary at all, which is worse than the cut it was meant to fix.

## Read 122 (A): judgement words in the NAME lines

24 hits across the 36 reports, five names, all in name lines that repeat their research's own sentence: KAPA "positive, statistically significant interim efficacy data" (12 lines); VRAX "no fresh operating catalyst" (6); SAIQ "did not state a transaction value or other material operating result" (3; research: "the primary-source excerpts do not state a transaction value or other material operating result"); XHG "not a completed transaction or operating result" (2 recap lines; research: "rather than a completed transaction or operating result"); ZNB "No fresh company-specific positive event" (1). Read by hand against the research printed beside each: none states a judgement the research does not. The automatic "research has the word" check read true for all 24 and never met a false case, so the hand read is the evidence, not the check. My prediction (2 to 8) missed: the scan now covers 36 reports and lines that repeat research verbatim.

## Read 122 (B): recap Summary against line, by hand

0 disagreements in 9 recaps. Each named mover's state in the Summary (fresh for AMOD, CYCU, XHG, VCIG; "only older or secondary news" for MI and VRAX) matches the section its line sits in (FRESH NEWS FOUND; OLDER OR SECONDARY NEWS) and the line's own content. One XHG line (2026-10-06 run 2) was struck to empty; its section still reads FRESH NEWS FOUND, matching the Summary.

## Name lines

Recaps 7 of 108 struck (third run 5 of 108); intraday 26 of 324.

## Predictions

Held: after-hours 9 of 9; off-list, rank, "zero" 0; recaps missing a named mover 0; failed checks 0; spend $5.5590 (said $5.00 to $6.20); recap Summary struck 0; Summary-against-line 0 disagreements. Missed: recap count 5 of 9 (said 8 or 9); intraday count 16 of 27 (said 24 to 27); intraday first-ranked 19 of 27 (said 27); recap drafts over the cap 4 (said 0 to 2); intraday Summary struck 8 (said 0 to 2); name-line hits 24 (said 2 to 8). My stated risk was intraday rule 7; I did not foresee the causal "after" strike.

## What a fix would need (not built; for Integration, Commercial and Marketing)

Two separate defects: (1) the count sentence still falls past the recap cap when a draft runs 5 sentences; (2) packing move and news into one sentence invites a causal "after". Options include a "with, never causal" line for v7 like v6's, putting the count sentence earlier in both orders so the cut cannot reach it, or a code change that keeps the count sentence when the cut would drop it. Each is a new decision and a new re-check; none is recommended here before Commercial and Marketing read this.
