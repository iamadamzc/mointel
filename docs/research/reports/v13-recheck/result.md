# v13 re-check: result (2026-10-15 UTC)

*Research-tmi (local_dd23765d). Rule and predictions: `predictions.md`, committed before any call. Run literal `42af81546d38e6ab17e5213d5595e55e798a978c`, Integration's GO. Raw committed before it was read and sent to Commercial: `eb0def59c851f12640186be13da6339ceec89045`. 15 of 15 run; spend $2.3362 of the $4 stop. The counterparty part is in `../counterparty-check/result.md` ($0.6778). Combined $3.0140 of $6.*

## Verdict: FAIL on rule 4. Rule 5 by my hand read also fails as written, almost all of it carried over from v11. Rule 7 (Commercial's read) is pending.

The fix v13 was built for worked. The Summaries are clean: 0 of 9 struck on the three inputs that failed in v11 (v11: 6 of 9), and 1 of 15 overall. The plain-words line roughly halved the desk's words in published lines, but did not end them. Its "company filings only" clause was never used.

| Rule | Allowed | Measured | |
|---|---|---|---|
| 1. Struck on the 9 struck-in-v11 reports | at most 1 | **0** | pass |
| 2. Struck across 15 | at most 2 | **1** | pass |
| 3. Published Summary naming a board name its facts do not | 0 | **0** (drafts 0) | pass |
| 4. The desk's words in published lines | 0 | **8 of 195** | **FAIL** |
| 5. Filings-only disclosure kept (by hand) | none dropped while naming a finding | **6 of 11 drop it while naming a finding; 0 say "company filings only"** | **FAIL as written** (5 of the 6 dropped it in v11 too) |
| 6. Held rules | 0 / 0 / 0 / 0 / all / at most 1 | UNFRAMED 0, labels 0, note+when 0, causal 0 (1 flag, not causal by hand), count 14 of 14 unstruck, failed 0 | pass |
| 7. Commercial's own read | | pending | |

## Rule 1 to 3: the Summary fix

- **0 of 9** struck on 10-02 INTO_RTH, 10-02 INTO_POWER_HOUR and 10-06 INTO_POWER_HOUR. In v11, those inputs struck 6 of 9. No draft named a board name its facts do not (in v11, 5 Summaries did, and each was struck).
- **The one strike** (10-14 AFTER_HOURS): the draft opened with "None of the counted names ran at least 50 percent above the prior close." That is a recap's sentence, not in an intraday report's facts, and the model struck it (UNSUPPORTED). The same draft also restated NXGL's change note ("NXGL was down 23.2% since the previous checkpoint"). NXGL is a name its Summary names, so that is allowed.
- **The causal-join flag** (10-02 INTO_POWER_HOUR run 1) reads "AIXI was up 56 percent from the prior close, with fresh news in our sources: the company furnished its semi-annual report after the October 1 session". The "after" says when the report was furnished. The move is joined to the news with "with", as the rule asks. My hand read is not causal. Commercial confirms.

## Rule 4: the desk's words, 8 published lines

Every hit is the desk's word for its material; none is a company's own use. The lines:
- XHG x2: "The evidence describes ..."
- MXCT, DFNS, BLRK: "The bundle does not provide / include / contains ..."
- SOUL: "SEC-only evidence showed ..." and "The supplied evidence ..."
- SAIQ: "The primary-source excerpts ..."
- VEEA: "The supplied evidence ..."

Against v11 on the same inputs:
- The name-line rate fell from 10.0 percent (43 of 432) to 4.4 percent (8 of 180, Summaries excluded).
- On the six "others" inputs, v11 averaged about 16 such lines per run of each; v13 had 6.
- The words come from the research's unknowns, which the writer still receives in those words. That was the stated risk.

Commercial read 141: rule 4 is a quality rule, not a claims gate. "the bundle" is clumsy, not false. The rule as committed says 0, so it fails here.

## Rule 5: the filings-only disclosure, 11 lines read in full

- **No finding named (3 lines, fine):** XTER, IACO and SOUL on 10-14 INTO_POWER_HOUR say "our research reached no conclusion".
- **Limit kept (2 lines):**
  - RAC: "Our sources did not establish a later company-specific development outside SEC filings." These are plain words, the clause's intent.
  - SOUL (AFTER_HOURS): "SEC-only evidence showed ...". This keeps the limit, but in the desk's words.
- **A finding named with the filings-only limit dropped (6 lines):**
  - FACT x3: the July 21 termination.
  - BLRK x2: the August 3 merger. Its lines say only "The bundle contains no fresh company announcement" / "Our sources had no fresh company announcement".
  - IACQ: the September 2 8-K.

None states that coverage was complete. Every limit is stated as "our sources" or "the bundle", never as fact about the world.

Against v11, the same stocks:
- FACT dropped the limit 3 of 3, and BLRK 6 of 6, there too.
- IACQ kept it in 2 of 3 v11 runs ("The SEC-only coverage ..."), and dropped it in v13's one run. That is the only line where v13 may have lost the substance while removing the word, which is the risk read 140a named.
- No line said "company filings only" (0 of 11). The clause's specific wording was not taken up.

Commercial's read of these lines decides rule 5 (read 141: a fail on claims is a line that states coverage was complete, or drops the filings-only limit while naming a finding).

## Predictions against the result

| Prediction | Predicted | Result | |
|---|---|---|---|
| Struck on the 9 | 0 to 2 | 0 | |
| Struck across 15 | 0 to 3 | 1 | |
| Published other names | 0 | 0 | |
| Drafts with other names | 0 to 2 | 0 | |
| Published lines with the desk's words, before the hand read | 0 to 4 | **8** | missed |
| Filings-only lines that say "company filings only" or the plain-words equivalent | most | 1 of 11 (RAC) | missed |
| Held rules | as in v11 | as in v11 | |
| Spend for the 15 | $1.90 to $2.60 | $2.3362 | |
| Spend combined | $2.50 to $3.55 | $3.0140 | |

My stated expectation was that rule 4 was the one at risk. It failed, and so did rule 5 as written, which I predicted would pass.

## What this means for his "a"

His "a" (uuid bc2c0dac): v13 and the checker fix ship together if the combined run passes; otherwise the checker-fix floor ships alone. By the committed rules, the combined run does not pass (rule 4, and rule 5 as written). Two things are his to weigh:
- The Summary fix that v13 was for passes cleanly.
- The two failing rules are a quality count and a disclosure that was already missing in v11 for 5 of its 6 lines.

Commercial's claims read (rule 7) and its rule 5 judgment come first.
