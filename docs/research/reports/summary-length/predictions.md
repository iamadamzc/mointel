# Summary-length re-check (L13, fourth run): pass rule and predictions, before any model call (2026-10-14)

*Research-tmi (local_dd23765d). His "a" (Integration chat 7d32ed42, user uuid 0be89a81, 2026-10-14T03:33:49.640Z, verified at his turn by this seat), answering "(a) Full re-check: 9 recaps plus 27 intraday reports, about $5.50, hard stop $8". HARD STOP $8. Branch `research/summary-length-on-a202a845`: production a202a845, v7 versions 8 and 9 recomposed (`2c863754`), version 10 (`0c2bb149`: Marketing 493a81ff's two sentences, Commercial read 121 PASS), harness `scripts/report-summary-length-check.ts` (`40d4e656`). 3 days (2026-10-02, 10-05, 10-06) x PREMARKET (recap) and INTO_RTH, INTO_POWER_HOUR, AFTER_HOURS (intraday) x 3 runs = 9 recaps + 27 intraday, store copy of 2026-10-07, luna writer, the Claude checker (Tests-TMI key, no fallback). Raw to `raw/`, committed before it is read.*

**Every Summary measure is on the PUBLISHED narrative** (`result.report.narrative`, after strikes and the cut), the draft beside it. The third run measured the draft and was wrong for it (result-3 corrected at 6d24eb12).

## The pass rule

**RECAPS PASS** only when all hold, over the published recaps:
1. No draft Summary names a ticker outside its list, and none is struck for one.
2. No draft Summary states a rank.
3. At most 1 published Summary struck, for any cause (v6 0 of 3; version 8 2 of 9; version 9 0 of 9).
4. **The count sentence ("N of the M names the desk covers had fresh news in our sources") is in EVERY published Summary** (version 9: 0 of 9).
5. **The after-hours name is in EVERY published Summary whose facts give one** (all three days give one: MI, OLOX, MTEN).

**INTRADAY PASSES** only when all hold, over the published intraday reports:
6. At most 2 published Summaries struck, for any cause (v7 in L12, f71c48c2: 0 of 8).
7. **The count sentence is in EVERY published Summary** (v7 in L12: 0 of 8; v6 3 of 7).
8. **The first-ranked name is in EVERY published Summary whose facts name one.**

**BOTH:** 9. Read 107 (a): every flagged line is read by hand and none states a judgement the facts do not give. 10. Failed checks (MISSED or ERROR): at most 1 of the 9 recaps, at most 3 of the 27 intraday reports.

If fewer than 6 recaps or 18 intraday reports publish, that group is **NOT DECIDED**, and goes to him as such, never read as a pass. A PASS ships nothing: the intraday sentence and a recap move each ship only on his go by sha.

**Reported, not pass conditions** (Commercial's ruling): published Summaries missing a named mover altogether (if more than 1 of 9 recaps, said plainly, and the choice goes to him with the figure); the draft sentences the cut removed, verbatim; drafts over the cap; name lines struck.

**Added by Commercial read 122 (PASS with two measures), before any call; both reported as findings, not pass conditions:**
- **A. Name lines:** across all 36 reports, the drafted NAME lines (every flagged line but the Summary, id `O`) with "positive"/"negative" or a classification of the news ("rather than an ... catalyst", "operating", "transaction-development"), as counts, recaps and intraday apart; each hit with whether its research says the word (from `records.json`: `judgementLines[].research`, read by hand).
- **B. Summary against line, recaps, by hand:** for each named mover in each published recap Summary, its news state there (fresh, older or secondary, no conclusion) agrees with the same name's line; every disagreement reported with both sentences. A disagreement goes to him as a finding, not an automatic fail (the checker reads each against the same research).

Both are computed from the raw this harness already keeps (`judgementLines`, `draft`, `result`), so the code under test is unchanged.

## Predictions (this seat's, before any call)

1. Recap count sentence published: **8 or 9 of 9.** Intraday: **24 to 27 of 27.**
2. Recap after-hours name published: **8 or 9 of 9.**
3. Intraday first-ranked name published: **27 of 27** (it is sentence 1 in the rule).
4. Drafts over the cap: recap **0 to 2 of 9**; intraday **2 to 8 of 27** (a three-sentence limit with news on the leader is tight).
5. Published Summary struck: recap **0 or 1**; intraday **0 to 2**.
6. Off-list 0, rank 0, "zero" 0 in recaps.
7. Recaps missing a named mover altogether: **0 or 1 of 9.**
8. Failed checks: **0 to 2 of 36.**
9. Spend **$5.00 to $6.20** (third run's recaps $0.1734 a report; L12 v7 intraday mean $0.1475), all 36 run.
10. Name-line judgement hits (A): **2 to 8** across 36 reports, at most 1 not the research's own word (the third run: 9 of 10 flagged lines were; one was an absence claim).
11. Summary against line disagreements (B): **0 or 1** across the recaps.

My honest expectation: the recap rules pass; intraday rule 7 is the one at risk, because one sentence for the leader with its news and one for the next gainers leave little room before the count, and a writer that runs long loses the count first.
