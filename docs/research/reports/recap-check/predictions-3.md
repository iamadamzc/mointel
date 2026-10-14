# Recap re-check, third run (the rebuild, v7 version 9): predictions and the pass rule, before any model call (2026-10-14)

*Research-tmi (fresh seat, local_dd23765d). His "a, rebuid" (Integration chat 9c4f0257, queued input 97ba9a9a, origin human, 2026-10-14T02:18:45.322Z, verified at his turn) chose option (c) of Integration's block at 2026-10-14T02:13:28Z, which read: "Rebuild the recap summary. About half a day plus another re-check, around $1.60." Integration told him at 02:19:50Z: "The recap rebuild's re-check uses the same hard stop as the earlier ones, $2.50 (expected about $1.60)." Both verified in that transcript by this seat. HARD STOP $2.50.*

*Literal `17a172bc` (research/recap-fix-on-d28c02ab): v7 version 9, a recap in two writer calls (the Summary call with the narrative facts, the ticker list and RECAP_SHAPE_RULE and no NAMES section; the name-lines call with the NAMES section only; merged). Gated tonight in Ops's slot: reportWriterV7 32/32; mutants a, b, c killed at the predicted 2, 3, 4 (`mutants-3.py`); tests/desk+research+dashboard 208 files 3056/3056; tsc 0; eslint 0 errors. Dry run with the planted control (`dry/summary-planted-control-3.txt`): every measure saw its planted case (outside the list 9 of 9, rank 9 of 9, "zero" 9, count sentence 9 of 9, judgement lines 18, two writer calls 9 of 9), and both replies parse. Same harness otherwise as the second run: the same 9 reports (PREMARKET 2026-10-02, 10-05, 10-06, 3 runs each, store copy of 2026-10-07), luna writer, the Claude checker (Tests-TMI key, no fallback). Raw to `docs/research/reports/recap-check/raw-3`, committed before it is read.*

## The pass rule (predictions-2's, plus Commercial read 116's additions)

**PASS** only when all five hold:
1. **No off-list ticker:** no draft Summary names a ticker outside its list, and no published Summary is struck for one.
2. **No rank:** no draft Summary states a rank (`rankInSummary` false in all 9).
3. **The Summary holds as v6's did:** at most 1 published Summary struck, for any cause. Baseline: v6's recap Summary struck in 0 of 3 published recaps (L12, raw `f71c48c2`); v7 version 7 in 5 of 7; version 8 in 2 of 9.
4. **Read 107 (a), by hand:** every drafted line the harness flags for a judgement word or a catalyst kind is read by hand, and none states a judgement the facts do not give.
5. **Read 107 (b), the count sentence:** "Of the 12 names the desk covers, N had fresh news in our sources" (its N from the facts) is in every draft Summary.

If fewer than 6 reports publish, 3 is **NOT DECIDED**. Every other strike, every failed check (with its raw reply) and every name-line strike are reported. **FAIL** means the recaps stay on v6. A PASS moves nothing by itself: the recaps move to v7 only on his go.

## Predictions (this seat's, before any call)

1. Off-list names in the draft Summaries: **0 of 9** (the Summary call sees only its list; version 8 already read 0).
2. A rank in a draft Summary: **0 or 1 of 9** (no NAMES section to take one from; version 8 read 1).
3. The word "zero" for a count: **0 of 9**.
4. Summary struck: **0 or 1** of the published. The cause the rebuild removes (a fact from the name sheets) was every Summary strike so far; a figure from outside the facts remains possible.
5. Failed checks: **0 or 1 of 9**.
6. Spend **$1.55 to $1.95**, all 9 run (second run $1.5959 with one writer call; the second writer call adds a little).
7. Count sentence: **9 of 9**.
8. Name lines struck: **3 to 10** of about 108 (the lines call carries version 8's NAMES section; version 8 read 7 of 108).
9. Judgement lines: clean on the hand read.

My honest expectation: rules 1 to 3 and 5 pass; rule 3 is still the one most likely to fail, and a Summary written without the sheets may read thinner, which this rule does not measure and the result will say.
