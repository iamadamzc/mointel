Do not commit Phase 4 yet. Two final correctness items remain.

1. Audit and fix Sol escalation on SHEET/AUTO conflicts.

Your reported escalation criteria include SHEET_AUTO_CONFLICT, yet IVF, IPST and SLE materially disagree on Structure (Sheet DIRTY_FLOAT vs AUTO CAUTION) and the rerun produced zero Sol escalations.

Trace the actual runtime path and determine why those conflicts did not trigger escalation.

The intended policy is:

multiple supply instruments alone do NOT trigger Sol;
structural complexity alone does NOT trigger Sol;
a material DIRTY_FLOAT ↔ CAUTION/CLEAN/UNKNOWN Sheet/AUTO disagreement DOES trigger one Sol adjudication when both sides have meaningful evidence;
Sheet UNKNOWN vs AUTO evidence-backed classification does not automatically trigger Sol;
AUTO incomplete vs Sheet evidence-backed classification does not automatically trigger Sol;
high RVOL/rank/price movement never triggers Sol.

For a Sheet/AUTO structural conflict, Sol must receive:

the same source-grounded evidence bundle;
Terra’s output;
deterministic validation results;
the human-reviewed Sheet conclusion labelled explicitly as prior human analysis, not source fact;
the precise disputed field.

Sol should adjudicate the evidence independently, not simply choose Sheet or Terra.

Re-run at least IVF, IPST, SLE, NWTG, XPON and any other current structural conflict.

Report:

whether escalation occurred;
Terra classification;
Sheet classification;
Sol classification;
evidence rationale;
final accepted classification;
whether Sol changed the result;
incremental token/cost impact.

If SHEET_AUTO_CONFLICT was not actually wired into the execution path, add a regression test proving that a material structure conflict invokes exactly one escalation.

2. Add longer deterministic daily historical context for cycle classification.

Do NOT increase minute-bar retention beyond the existing short live window merely to solve cycle history.

Add a separate persisted/cached daily-history layer using Alpaca split-adjusted daily SIP bars.

Use approximately:

CYCLE_HISTORY_TRADING_DAYS=90

configurable.

Build deterministic historical summaries from daily bars sufficient to identify:

recent major runs;
prior 20%/50%/100%+ expansions where meaningful;
recent major peaks;
substantial retracement from prior momentum peaks;
repeated momentum episodes;
historical resistance;
former-runner/superrunner candidates;
prior-session and multi-session momentum context.

Do not label every 20% daily move a former runner.

Preserve split adjustment.

Do not send 90 raw bars to Terra. Generate compact deterministic summaries.

Keep:

3-day minute data for live/short-term market state;
longer daily data for momentum-cycle/history context.

Re-run the Phase-4 cycle set after the daily-history addition.

Report for every previously UNKNOWN cycle:

previous reason;
historical context now available;
new classification;
confidence;
whether it remains UNKNOWN and why.

Do NOT force a classification if evidence remains insufficient.

Preserve the FIEE regression:

$10.59 remains historical resistance;
it cannot become currentCycleHigh merely because it appears in daily history;
currentGiveback remains null unless a true current-cycle high is established.

3. Re-run the full live pipeline.

With the research worker running continuously, allow at least one newly queued ticker to complete automatically and record true steady-state:

Top-12 entry → queue → collection → sources ready → interpretation → dashboard-visible.

Do not use a ticker that entered before the worker started when reporting steady-state time-to-intelligence.

4. Final gate.

Run tests, lint, typecheck and production build.

Then report:

conflict-escalation bug/root cause;
before/after Sol count;
structural outcomes for disputed names;
added daily-history architecture;
cycle UNKNOWN before/after;
steady-state time-to-intelligence;
incremental API cost;
tests/lint/typecheck/build.

Stop before commit.