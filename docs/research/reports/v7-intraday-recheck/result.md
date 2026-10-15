# v7 intraday re-check: result (2026-10-14)

*Research-tmi (local_dd23765d). Rule and predictions: `predictions.md` (committed before any call). Run literal `7d2d93ae`. Raw committed before it was read: `a4835d709ca106798f49055b42f7a296f484dda3` (sent to Commercial at once for read 135 (d)). 36 of 36 reports run; spend $5.2748 of the $8 stop.*

## Verdict: FAIL on rule 1

6 of 36 published Summaries were struck. The rule allows at most 2. Every other rule passes. Nothing ships from this result. The frame fix (`4689da3a`) and version 11 stay unshipped and wait for his ruling.

| Rule | Allowed | Measured | |
|---|---|---|---|
| 1. Summaries struck, any cause | at most 2 of 36 | **6 of 36** | **FAIL** |
| 2. Struck on the live 10-14 inputs | at most 1 of 9 | 0 of 9 | pass |
| 3. Struck for UNFRAMED_PERCENT | 0 | 0 | pass |
| 4. Drafts with a report label | 0 | 0 | pass |
| 5. Count sentence in every unstruck published Summary | 30 of 30 | 30 of 30 | pass |
| 6. Failed checks | at most 3 | 0 | pass |
| 7. Published change note plus "when" | 0 | 0 | pass |
| 8. Published causal join | 0 | 0 | pass |
| 9. Growth percents are the company's own figure (by hand) | all | 4 of 4 | pass |
| 10. Commercial's own read | | pending (read 135 d) | |

On the live 10-14 inputs, where production struck 3 of 3 Summaries, the re-check struck 0 of 9. The two fixes did what they were built for. The 6 strikes are all on the older inputs, and come from two causes the fixes do not touch.

## The six strikes

**A wrong date (1 of 6).** 2026-10-02 INTO_RTH run 3 dated Alpha Modus's PIPE completion October 1. The research says September 30. The model struck it as UNSUPPORTED. That was a correct strike of a model error. Runs 1 and 2 on the same input got the date right.

**Other names' change notes restated in the Summary (5 of 6).** This is a new failure pattern.
- 2026-10-02 INTO_POWER_HOUR runs 1, 2 and 3: the last sentence restates row notes for names that are not in the Summary's own facts, such as "INAC lost $10.38 support" and "WENC printed a new high". Each was struck by the rule (NUMBER_WITHOUT_ROW, NOT_SELF_CONTAINED) and by the model (UNSUPPORTED).
- 2026-10-06 INTO_POWER_HOUR runs 2 and 3: "SMXT printed a new high of day since the previous checkpoint", struck as NOT_SELF_CONTAINED by the rule and the model.

All five are intraday power-hour inputs whose facts carry change notes. Version 11's lines say how to frame a move. They do not stop the writer from adding a sentence about the board's other changes. The likely fix is one writer line, for example: the Summary names only the names in its facts. That line would need its own Marketing wording, Commercial read, gate and re-check, and only if he wants it.

## Predictions against the result

- Summaries struck: predicted 0 to 3, got **6** (missed). The live inputs: predicted 0 or 1, got 0.
- UNFRAMED_PERCENT 0, labels 0, change note with "when" 0, count kept: as predicted.
- Causal joins: predicted 0 to 2 in drafts, got 0.
- Failed checks: predicted 0 or 1, got 0.
- Spend: predicted $4.90 to $5.80, got $5.2748.
- Growth-framed percents: predicted 0 to 4, got 4. Three are MaxCyte's "up 26 percent year over year" (10-14 INTO_POWER_HOUR, runs 1 to 3). One is AIXI's "down about 99.12 percent year over year" (10-02 INTO_RTH run 2). Each matches the company's own reported figure in its research.

My stated expectation was that rule 1 was the one at risk from the model's reads. It failed, but for a different cause: the writer adding a sentence, not the model's reads of time and attribution.

## Reported, not pass conditions

- First-ranked name in the published Summary: 30 of 36. The 6 without it are exactly the 6 struck Summaries; every unstruck Summary kept it.
- Name lines struck: 29 across the 36 reports.
- Read 107 (a), the judgement words in name lines: 21 hits (positive, operating, company-specific catalyst). Each of the 17 distinct lines was read in full against the research the writer received. Every judgement word restates the research and is attributed to the company or to our sources. None adds a judgement of its own. The lines' extra sentences about what the evidence lacks (a sample size, a closing confirmation) come from the research's "what the desk does not have" field, which the writer is given. Commercial reads them as well.

## A separate finding: internal words in published name lines

43 of 432 published name lines in the re-check use the pipeline's own words: "the bundle", "supplied evidence", "excerpts", "SEC-only coverage". One example (IACQ, 10-14 AFTER_HOURS run 1): "no fresh company-specific catalyst was established in the bundle."

This is not new to version 11, and it is not limited to v7. The words come from the research the writer is given, mostly its "what the desk does not have" field ("The bundle lacks the SEC prospectus..."), and the writer copies them. Production's published reports in the two local store copies show the same:
- `market-prod-2026-10-07.db`: 13 of 20 published reports (09-30 to 10-07, writer prompt version 5) have at least one such line.
- `slim-2026-10-14.db`: 6 of 9 published reports (10-13 and 10-14, writer prompt versions 7, 15 and 16). Today's three live intraday reports had 0. The re-check's runs of those same inputs had some, so this varies run to run.

The match is a word list, so a few hits may be fair uses of "excerpt". The examples read like the pipeline's words, not a reader's. No writer or checker rule names these words today. It would need a scoped fix (a writer line, a checker rule, or wording at the research source), and is reported here, not fixed.
