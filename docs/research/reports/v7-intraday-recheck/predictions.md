# v7 intraday re-check (version 11 + the UNFRAMED_PERCENT frame fix): pass rule and predictions, before any model call (2026-10-14)

*Research-tmi (local_dd23765d). His "no, everything gets done tonight" (Integration chat 7d32ed42, uuid 69769171, 2026-10-15T00:47:31.335Z, verified at his turn). Spend: about $5.30, HARD STOP $8, his yes relayed by Integration and verified before the run. Branch `research/v7-intraday-recheck-on-a966a517` = production a966a517 + the frame fix (`4689da3a`, gated) + v7 version 11 (`7b331faa`, `ca0fac3a`: Marketing f6562b63's three lines, Commercial read 132a). Harness `scripts/report-v7-intraday-recheck.ts`: production's own intraday path (writerPromptFor routes the three intraday kinds to v7), the checker that ships (Claude Opus 5.5 high, Tests-TMI key, no fallback). Inputs: the three live 10-14 reports' checkpoints (INTO_RTH, INTO_POWER_HOUR, AFTER_HOURS; Ops's slim copy slim-2026-10-14.db) and the 9 earlier intraday inputs (2026-10-02, 10-05, 10-06; the 10-07 copy), 3 runs each: 36 reports. Raw to `raw/`, committed before it is read.*

**Every Summary measure is on the PUBLISHED narrative** (`result.report.narrative`), the draft beside it.

## The pass rule

**PASS** only when all hold:
1. **At most 2 of the published Summaries struck, for any cause** (live 10-14: 3 of 3 struck; v6 intraday in L12: 0 of 7).
2. **At most 1 struck among the 9 reports on the live 10-14 inputs.**
3. **No Summary struck for UNFRAMED_PERCENT** (read 131 item 1, the frame fix).
4. **No draft Summary uses a report label** ("Intraday," and the like; read 131 item 2, line 1): 0 of 36.
5. **The count sentence is in every published Summary that was not struck** (the count keep, read 124, is in a966a517).
6. **Failed checks (MISSED or ERROR): at most 3 of 36.**

**Added by Commercial read 135 (PASS with these changes), before any call:**
7. **No PUBLISHED Summary has a change note plus a "when" clause** (report 45's fault): 0.
8. **No PUBLISHED Summary joins a move to its news with a causal word** (with the word list off only the model strikes it): 0.
9. **By hand: every growth-framed percent in a published Summary is the company's own reported figure in its research** (read 134's limit: the rule sees only that a frame word is present).
10. **Commercial's own read** of every published Summary and name line of the 36 for any claim the facts do not give, with read 107's scan across the name lines (positive or negative, a classification of the news) judged against the research; the raw goes to Commercial when committed.
Reported as before; more than two published Summaries without the first-ranked name goes to him with the figure.

If fewer than 27 reports publish, the result is **NOT DECIDED** and goes to him as such. A PASS ships nothing by itself: the frame fix and version 11 ship on his go by sha.

**Reported, not pass conditions:** drafts with a change note plus "when" (line 2); drafts joining a move to its news causally (line 3); the first-ranked name in the published Summary; name lines struck; every Summary strike with its reason and detail.

## Predictions (this seat's, before any call)

1. Summaries struck: **0 to 3 of 36**; on the live inputs **0 or 1 of 9**.
2. UNFRAMED_PERCENT Summary strikes: **0**.
3. Report labels in drafts: **0**; a change note with "when": **0 or 1**; a causal join: **0 to 2**.
4. Count sentence in every unstruck published Summary: **yes**.
5. Failed checks: **0 or 1**.
6. Spend **$4.90 to $5.80**, all 36 run.
7. Read 135's new pass conditions: published change note plus "when" **0**; published causal join **0 or 1** (the model strikes most; one that survives fails rule 8); growth-framed percents in published Summaries **0 to 4** (MaxCyte's on the 10-14 INTO_POWER_HOUR and AFTER_HOURS inputs), each the company's own figure.

My honest expectation: rules 3 to 6 pass; rule 1 is the one at risk, because the model's UNSUPPORTED reads (two of the three live strikes) were about time and attribution, which prompt lines reduce but do not remove.
