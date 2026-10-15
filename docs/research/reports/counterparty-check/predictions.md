# Counterparty check: pass rule and predictions, before any model call (2026-10-14)

*Research-tmi (local_dd23765d). His "yes to both" (Integration chat 7d32ed42, uuid 193d6e98, 2026-10-15T01:04:50.431Z) item 2, the sentence "yes" (uuid 6f497f5d, 01:12:05.613Z), the spend "yes" (queued input, origin human, uuid 38463b77, 01:14:06.809Z: about $0.75, HARD STOP $2), each verified at his turn. Branch `research/counterparty-on-d45d01bd`: v7 version 11 + the counterparty exception (v7 12, checker prompt V6 17, rule `counterpartyTickers`, Commercial's spec controls) + the frame fix merged, so the check runs on what would ship together. Input: report 45's own (2026-10-14 INTO_RTH, checkpoint 776, Ops's slim copy), the ONLY counterparty case in the recorded checkpoints (Research's scan, sent to Integration). 5 runs, the shipping checker. Raw to `raw/`, committed before it is read.*

*Updated 2026-10-15 UTC, before any call: his "b" (uuid 65ae2fbc) adds v7 version 13 (two lines, Marketing c8de2a3f, Commercial read 140a) to the same branch, and this check now runs on version 13, in one run with the v13 re-check (`docs/research/reports/v13-recheck/predictions.md`), each part under its own stop ($2 here). 4360b06c's two defects are fixed first (the checker clause's apostrophe; the "shorter than v6" test half dropped). The rule and predictions below are unchanged.*

## The pass rule

**PASS** only when all hold:
1. **At least 3 of 5 drafts name FFR in FFAI's line** (else the exception was not exercised: **NOT DECIDED**, to him as such).
2. **In every run whose draft names FFR, FFAI's PUBLISHED line keeps FFR**: not struck for NOT_SELF_CONTAINED, by the rule or the model.
3. **No published FFAI line carries FFR's own facts** (its whole-percent move or its rank): 0 of 5.
4. **The deterministic controls pass in the gate** (tests/desk/reportCheckV6.test.ts: FFAI/FFR admitted; a covered ticker named only in a DIFFERENT name's research strikes; a covered ticker not in the line's research strikes; name-only research admits nothing; no uncovered ticker admitted; TC and AI whole-word controls).

5. **Added by Commercial read 138 (PASS with this condition), before any call: Commercial's own hand read** of each of the five published FFAI lines with FFAI's research open beside it; none may state anything about FFR that FFAI's own research does not (price, move, rank, news, status). Condition 3 catches only numbers; this read covers FFR's news stated without one (the LIMIT test). The raw goes to Commercial when committed, before Research reads it.

A PASS ships nothing by itself; the change ships on his go by sha.

**Reported, not pass conditions:** every strike on FFAI's line with its reason; whether the writer said the company instead of the ticker; FFR's news without a number in FFAI's line (a LIMIT: only the model's support read can strike it).

## Predictions

1. Drafts naming FFR: **3 to 5 of 5** (the research states FFR as the buyer).
2. FFAI's published line keeps FFR in **every** run that names it.
3. FFR's own facts in FFAI's line: **0**.
4. Spend **$0.60 to $0.95**.
