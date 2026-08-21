Phase 4 interpretation is approved in principle, but do not commit yet. Complete the following corrective integration pass.

1. Wire the real automatic pipeline end-to-end.

The live research worker must consume actual Discovery/Top-12 state and use research_jobs so that a newly eligible unknown ticker automatically progresses:

Top-12 entry → QUEUED → COLLECTING → SOURCES_READY → ANALYZING → dossier accepted → dashboard-visible.

Persist every timestamp needed to calculate:

Top-12 entry → queued
queued → collection start
collection start → sources ready
sources ready → interpretation start
interpretation start → accepted dossier
Top-12 entry → dashboard intelligence available

Do not use standalone runner shortcuts for the acceptance test.

Test this against at least one actual live Discovery ticker that does not already have an accepted AUTO dossier. Do not hardcode a ticker.

2. Complete Sheet/AUTO merge on the server-side dashboard state.

The Discovery Board must not simply render AUTO when Sheet research also exists.

Render provenance accurately:

AUTO
SHEET
SHEET + AUTO
CONFLICT

SHEET + AUTO requires material agreement for the displayed intelligence.

CONFLICT must be visible whenever Catalyst, Structure or Cycle materially disagree.

In the drawer, preserve and display both Sheet and AUTO conclusions plus the classified disagreement reason.

Google Sheet remains read-only.

3. Correct conflict-reason semantics.

Review all comparison states.

A case such as:

Sheet structure = UNKNOWN

AUTO structure = DIRTY_FLOAT with adequate evidence

must not be labelled AUTO_INCOMPLETE.

Add/rename reason states where necessary, such as:

SHEET_INCOMPLETE
AUTO_INCOMPLETE
SOURCE_DIFFERENCE
TIMING_DIFFERENCE
INTERPRETATION_DIFFERENCE
SHEET_STALE
AUTO_NEW_EVIDENCE
POTENTIAL_SHEET_ERROR
UNKNOWN

Make the reason reflect which side actually lacks evidence.

Re-run all overlapping Sheet/AUTO names and report the corrected classifications.

4. Tighten Sol escalation.

Five Sol calls across nine dossiers is too aggressive.

Multiple financing/supply instruments alone must NOT trigger Sol.

Replace COMPETING_SUPPLY_INSTRUMENTS as a broad trigger with a narrower condition based on unresolved ambiguity.

Sol should be used when, after Terra plus deterministic validation/reconciliation:

material source evidence conflicts;
share/supply arithmetic cannot be reconciled;
instrument eligibility/status has materially contradictory evidence;
Terra remains LOW confidence specifically because evidence conflicts;
Terra fails validation/repair;
material Sheet/AUTO conflict requires deeper adjudication.

Do not escalate merely because a ticker has warrants + shelf + ELOC/PIPE/etc.

Re-run the nine Phase-4 dossiers from the same evidence fingerprints under the corrected escalation policy and report:

which still escalate;
why;
which no longer escalate;
whether final classifications change;
Terra/Sol token and cost difference.

IVF should not be hardcoded to escalate; let the corrected rule decide from evidence.

5. Audit UNKNOWN cycle outcomes.

For every Phase-4 ticker where AUTO cycle is UNKNOWN, report the deterministic/model reason:

inadequate historical evidence
current-cycle boundary unresolved
conflicting market history
insufficient recent-run information
other

Do not force a cycle merely to reduce UNKNOWN counts.

However, verify that currentCycleHigh = null does not mechanically force cycleClassification = UNKNOWN. Historical evidence can support GREEN/YELLOW/RED without a precise currentCycleHigh where justified.

Preserve the FIEE regression absolutely:

$10.59 remains historical resistance and never becomes currentCycleHigh/current giveback.

6. Live acceptance test.

While the market is active if possible, demonstrate one real new Discovery ticker automatically moving from demand detection to intelligence without manual runner invocation or Sheet modification.

Report its exact timestamps and total time-to-intelligence.

Also verify that if Sheet and AUTO conflict, the board displays CONFLICT rather than silently showing AUTO.

7. Full gate.

Run tests, lint, typecheck and production build.

Then stop before commit and report:

corrected live pipeline behavior
time-to-intelligence
Sheet/AUTO merge results
conflict reason corrections
before/after Sol escalation count
before/after model cost
cycle UNKNOWN audit
tests/lint/typecheck/build

Do not begin Chop Risk, Flush Risk, Live Confirmation or Overhang Absorption.