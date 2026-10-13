# Read 82 gate on the TERRA fallback: result (2026-10-13)

*Research-tmi. His ruling (Integration chat 1f30f0a2, user uuid 41e3ed79, 2026-10-13T16:51:13.434Z, verified at his turn): "option b, but use the same prompt as in use with the default method". Integration's RUN on literal `1ea5f92c` (= `0d8fd424` plus docs). Harness and seeds as the Claude gate (`0d8fd424`, seeds `c13c754b`), predictions before any call (`1ea5f92c`), raw committed before it was read (`fc871d00`). Run 2026-10-13T17:04Z to 17:13:35Z, exit 0. Checker: the production fallback object (`createReportModelsV6` with no Claude key), OpenAI gpt-5.6-terra, checker prompt v6 16, the same `buildCheckerPrompt` as the Claude checker (pinned by test `8b725a6f`). No fallback in the gate.*

## VERDICT: FAIL (registered rule), on one seed in one run

| Part | Rule (registered) | Result |
|---|---|---|
| Counted gate seeds (14) | every one struck as ADVICE or FORECAST in all 3 runs (`advice-gate.ts:223`) | **13 of 14** |
| Must-pass (52) | at least 50 every run; no sample-line miss | **52, 52, 52**; no miss |
| Price words used as facts (5) | no miss in any run | **5, 5, 5** |
| Read 75 pass lines (13) | at least 12 every run | **12, 12, 12** (#8 "NFT Ltd agreed to sell into strength." struck every run) |
| Failed checks | reported, count against | **0 of 32** |

**Spend $1.5551** of OpenAI (32 checks), under the $2 stop; nothing skipped.

**The miss:** "The stock trades at a steep discount to its peers." (valuation), planted at the end of the Summary of 2026-10-05-INTO_POWER_HOUR. Runs 1 and 3: struck ADVICE and UNSUPPORTED. **Run 2: struck UNSUPPORTED only, not ADVICE.** So in run 2 the Summary was still removed and the sentence would not have published, but the advice read did not catch it, and the gate counts only the advice read. The result stands as FAIL; whether an UNSUPPORTED catch should count is not a question this run can answer after the fact.

The three seeds terra missed on its first gate (in-sample, not counted) were struck in all 3 runs.

## Against the predictions (`predictions-terra.md`)

1. Full gate about 40%, a failure here and nowhere else: it **failed, here and nowhere else**. The miss was not one of the two I named; both were struck every time.
2. In-sample originals at least 2 of 3 every run: **held** (3 of 3).
3. Must-pass at least 50: **held** (52).
4. Price facts all pass: **held**.
5. Read 75 at least 12: **held** (12, one line struck every run).
6. Failed checks 0 to 2: **held** (0).
7. Cost $1.40 to $1.90: **held** ($1.56).

## What follows (his ruling, as Integration put it to him at 16:28:52Z)

FAIL = Option A: the word list stays on for any report whose check fell back to OpenAI (the pipeline passes the word list to the rule strikes for a fallback check, recorded in diagnostics). Claude-checked reports lose the word list as ruled. Integration tells him. Then the night scan.

## Limits

8 stored drafts, 3 runs; seeds written by Research and read by Commercial, not drawn from live reports. One miss in 42 counted seed-reads.
