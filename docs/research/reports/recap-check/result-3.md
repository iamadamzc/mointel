# Recap re-check, third run (the rebuild, v7 version 9): RESULT, ~~PASS~~ FAILS read 116 on the published Summary (2026-10-14)

> **CORRECTION (same night, found by Integration 41st, confirmed here on raw-3):** rule 5 below was written and measured on the DRAFT Summary; Commercial's read 116 says "present in each Summary", the reader's. The PUBLISHED Summary (`records.json` field `narrative`) carries the count sentence in **0 of 9** (draft 9 of 9). Cause: `capNarrative` (`lib/desk/reports/sentences.ts:66-69`, `NARRATIVE_MAX_SENTENCES.recap = 4`) keeps the first 4 sentences after the check (`pipeline.ts:517`); v7's Summary rule says "in whatever order reads best, in a few sentences" and the drafts run 7 sentences on 10-02 and 10-06 and 5 on 10-05 (my reading; the published 4 end where the cap's split puts sentence 4) with the count sentence last, so it is always cut, as are the after-hours sentence on 10-02 and 10-06 and a covered mover's news sentence on 10-02 (CYCU) and 10-06 (VCIG). Not new with the rebuild: the first two v7 runs published it in 0 of 2 and 0 of 7. v6's published recaps carry it in 3 of 3 (writer-retest raw `f71c48c2`), from its "at most FOUR sentences, in this order" rule (`writerV6.ts:186`). So on what a reader gets, v9 publishes less than v6. The PASS below holds only for the rule as I wrote it, which mis-stated read 116's condition. My own N check printed the published field without the sentence and I read it as the facts.

*Research-tmi (fresh seat, local_dd23765d). Literal `83532d01` (code `17a172bc`), Integration 41st's GO; predictions and the pass rule `predictions-3.md`, committed before any call; raw `raw-3` committed at `7c2d8514` before it was read past the console's spend lines. Ops's slot. Spend $1.5605 of the $2.50 stop (his option (c), "around $1.60"). 9 of 9 reports run, 9 published, 0 failed checks, 0 writer errors, 2 writer calls in each.*

## The pass rule

| rule | result |
|---|---|
| 1. No off-list ticker in a draft Summary, none struck for one | **0 of 9: holds** |
| 2. No rank in a draft Summary | **0 of 9: holds** |
| 3. At most 1 published Summary struck, any cause | **0 of 9: holds** (version 8: 2 of 9; version 7: 5 of 7; v6: 0 of 3) |
| 4. Read 107 (a): every flagged line read by hand, none states a judgement the facts do not give | **holds**, one borderline line named below |
| 5. Read 107 (b): the count sentence in every draft Summary, its N from the facts | **9 of 9: holds**; N = 5, 2, 5, matching the facts line "names the desk covers that had fresh news in our sources: 5 of 12 / 2 of 12 / 5 of 12" in each day's raw |

~~**PASS.** By the rule this moves nothing: the recaps move to v7 only on his go.~~ Struck: see the correction at the top. Rule 5 on the published Summary: 0 of 9.

## Rule 4, the hand read (10 flagged lines)

- "positive" (KAPA, 3 lines): "positive, statistically significant interim efficacy data" is the research's own sentence. Clean.
- "operating" (XHG 3 lines, the 10-06 Summary 3 times): "rather than a completed transaction or operating result" restates the research's reading. Clean. Run 1 and run 3 write "The announcement described a proposal", where the research says "The evidence describes"; the evidence is the announcement, and the checker passed both. Run 2's "The company described" was STRUCK by the checker for that attribution.
- "operating" (VCIG, 10-06 run 1): "The sources provided no operating, customer, revenue or transaction-value metrics for the platform." **Borderline:** a claim about what the sources lack, which the research does not state; it judges nothing, and the checker passed it. Counted as clean, named here.

## Name lines

5 of 108 struck (12 name lines a report), all UNSUPPORTED, all in the lines call: OLOX's figures attributed to CS Digital instead of Olenox (10-05, twice); "April 1, 2026" for an event at 20:00 ET on 2026-03-31 (10-05); XHG "the company described" (10-06); a reverse-split date inferred from a filing time (10-06). Version 8: 7 of 108.

## Predictions (9 of 9 held)

Off-list 0 (said 0); rank 0 (0 or 1); "zero" 0 (0); Summary struck 0 (0 or 1); failed checks 0 (0 or 1); spend $1.5605 ($1.55 to $1.95); count sentence 9 of 9 (9 of 9); name lines struck 5 (3 to 10); judgement lines clean (clean).

## What the rule does not measure

I expected a Summary written without the name sheets to read thinner. It did not: each Summary carries the covered movers' news from the narrative facts (AMOD's Bitcoin PIPE, CYCU's Nasdaq compliance, XHG's proposal), and on 10-05 says MI and VRAX had only older or secondary news. The three runs a day agree on every count. Length and voice were not measured.
