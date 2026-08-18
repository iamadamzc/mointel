Continue development of:

`A:\mointel`

Repository:

`https://github.com/iamadamzc/mointel`

First inspect:

- current git status
- current HEAD
- all uncommitted operational/retry work
- existing market worker
- research worker
- `npm run desk` supervisor
- session model
- Discovery ranking
- Daily RVOL implementation
- research queue
- Focus
- Desk Events
- current dashboard/read models

Do NOT reset or discard valid uncommitted work.

## PROBLEM

The current application has market-session labels, but its **Discovery state is effectively one continuous Daily-RVOL leaderboard**.

That makes the desk wrong after the RTH close.

At 16:30 ET, the current board can still rank the stocks that accumulated the largest abnormal volume during the entire 04:00–16:00 trading day.

That does NOT answer:

**What is becoming relevant after hours right now?**

The spreadsheet workflow previously performed explicit reassessments at different points of the trading day.

Those reassessments now need to become application architecture.

The system should operate as:

**continuous telemetry + session-aware Discovery + scheduled Desk Assessments**

not:

**one leaderboard all day.**

---

# 1. PRESERVE THE EXISTING DAILY RVOL DEFINITION

Do NOT change the backtested Daily RVOL definition:

```text
Daily RVOL =
current cumulative trading-day volume from 04:00 ET
/
average full-session volume over previous 20 eligible full sessions
```

The denominator remains fixed during the day.

Do not time-normalize it.

Do not change the baseline methodology.

Daily RVOL remains the principal PREMARKET discovery metric and remains useful during RTH.

The problem is specifically that **it should not remain the primary AFTER-HOURS ranking once RTH has ended.**

---

# 2. INTRODUCE SESSION-AWARE DISCOVERY

Create explicit discovery modes.

At minimum:

- PREMARKET
- RTH
- AFTER_HOURS
- POSTMARKET_RECAP / NEXT_DAY_PREP
- CLOSED

The active Discovery Board must depend on the current session.

## PREMARKET

04:00 ET through 09:30 ET.

Primary Discovery ranking:

**existing Daily RVOL cross-sectional rank.**

Preserve:

- current $1–$20 discovery universe
- day-session retention behavior
- price qualification/latching
- Top 12 / Top 25 / Top 50
- current research integration

## RTH

09:30 ET through the regular-session close.

Continue using Daily RVOL as the base live Discovery ranking.

Do not reset cumulative Daily RVOL at 09:30.

Premarket-qualified names may continue into RTH.

The scheduled RTH assessment engine described later will provide the changing 30-minute intelligence state.

## AFTER HOURS

Normal session begins at 16:00 ET and ends at 20:00 ET.

On early-close trading days, use the exchange/calendar's actual RTH close as the AH start rather than blindly assuming 16:00.

**Do NOT rank AFTER_HOURS Discovery by cumulative full-day Daily RVOL.**

Create a separate AH session state.

At the RTH close:

- freeze RTH closing state;
- retain daily history for audit;
- initialize AH session metrics at zero;
- use the official RTH close as the AH reference price.

---

# 3. AFTER-HOURS MARKET METRICS

For every ticker observed after the RTH close, calculate:

## AH Price Change

```text
ahPercentChange =
(currentPrice - currentDayRthClose)
/
currentDayRthClose
* 100
```

## AH Volume

Volume traded since the RTH close.

Do not include RTH volume.

## AH High / Low

High and low since the RTH close.

## AH Participation

Use the existing 20-session full-day average-volume denominator:

```text
ahParticipation =
afterHoursVolume
/
averageFullSessionVolume20
```

This is deliberately NOT called Daily RVOL.

It answers:

**How large is this AH participation relative to the stock's normal full-day activity?**

Unknown denominator remains unknown.

## AH Rank

For this first implementation, use:

**cross-sectional AH Participation rank**

as the primary AH Discovery ranking.

Tie-break sensibly with:

1. absolute AH % change
2. AH volume

Do NOT introduce an opaque AI ranking.

Do NOT invent a complex weighted AH score in this phase.

Persist enough raw fields that we can later test whether AH % change, acceleration, dollar volume or other factors improve ranking.

Display at least:

- AH Rank
- AH Price
- AH %
- AH Volume
- AH Participation
- spread
- levels
- Cycle
- Catalyst
- Structure

Daily RVOL may remain available as secondary context, but it must not determine the primary AH order.

---

# 4. AFTER-HOURS RETENTION

Do not allow the day's RTH retention state to automatically occupy AH Discovery.

Separate:

**tracked for the day's history**

from:

**relevant in the current AH session.**

Create session-aware discovery/qualification state.

A stock that was a massive RTH leader but trades almost nothing after 16:00 should remain:

- tracked
- researched
- available in Focus
- available historically

but should fall out of AH Discovery.

A new ticker that was irrelevant all day but starts moving materially after 16:00 must be able to enter AH Discovery immediately.

AH qualification/retention should be independent of the daytime retention state.

Preserve the underlying $1–$20 qualification philosophy at the relevant point of the AH move.

If a ticker qualifies in range and then runs above $20 during AH, retain it for that AH session.

Use trader-facing retention labels only when retention is actually informative, following the existing `RETAINED < $1` / `RETAINED > $20` behavior.

---

# 5. RESEARCH QUEUE MUST FOLLOW THE ACTIVE SESSION BOARD

The automatic research worker currently reconciles the current Top N.

Update that logic so the target population is the **active session's Discovery Top N**, not hardwired Daily RVOL rank.

Therefore:

PREMARKET:
- research current Daily-RVOL Top 12

RTH:
- research current Daily-RVOL Top 12

AFTER HOURS:
- research current AH Discovery Top 12

This is essential.

A brand-new AH mover must automatically progress:

```text
AH Discovery
→ ANALYSIS PENDING
→ COLLECTING
→ ANALYZING
→ intelligence available
```

without Sheet intervention.

Do not create duplicate jobs.

Focus names may remain research-relevant even when outside the current session Top 12.

---

# 6. CREATE A DESK ASSESSMENT ENGINE

Implement the old spreadsheet reassessment schedule as an actual application subsystem.

Prefer a dedicated worker/process such as:

`worker/desk-assessments.ts`

or a similarly clean architecture.

Do not bury scheduling inside React components.

Add it to the normal:

`npm run desk`

supervisor.

The normal desk should therefore supervise:

1. dashboard
2. Alpaca market worker
3. automatic research worker
4. Desk Assessment worker

Use one process if the existing architecture gives a clearly cleaner implementation, but keep responsibilities explicit.

---

# 7. OFFICIAL ASSESSMENT SCHEDULE

Use America/New_York and the exchange trading calendar.

The standard schedule is:

## 22:00 ET — NEXT_DAY_RECAP

Full after-hours recap / next-trading-day preparation.

Market portion uses the completed 16:00–20:00 AH session.

Research portion includes filings/catalysts/structural evidence available through the assessment time.

Purpose:

- identify meaningful AH movers;
- distinguish fresh vs recycled/backside names;
- capture catalyst/structure;
- carry forward meaningful names;
- prepare the next trading day.

## 06:10 ET — STRUCTURAL_REFRESH

Not primarily a market ranking.

Reassess:

- SEC filings
- offerings
- registrations/prospectuses
- EFFECT
- ATM
- PIPE
- warrants
- convertibles
- reverse splits
- shares outstanding changes
- catalysts
- dilution/overhang
- other material structural changes

Targets should include:

- names carried from the 22:00 recap;
- Focus names;
- current early-premarket relevant names;
- names with new source evidence.

Use cheap evidence-change checks first.

Do not force AI calls when evidence is unchanged.

## 06:25 ET — PREMARKET_0625

First formal premarket market assessment.

## 06:45 ET — PREMARKET_0645

Second premarket momentum reassessment.

## 07:00 ET — PREMARKET_0700

Late-mover / updated premarket reassessment.

## 09:25 ET — OPEN_SPIKE_ASSESSMENT

Final pre-open assessment.

This is distinct from simply saving the current Daily RVOL leaderboard.

Create an explicit assessment type.

Persist the objective features needed for later validation, including:

- Daily RVOL / rank
- recent price movement
- recent volume acceleration
- current spread/liquidity
- current Cycle
- Structure / Dirty Float
- nearby resistance / level room
- catalyst
- extension from relevant levels/highs
- prior flush/failure context where already available

Do NOT pretend we have validated an optimal predictive weighting.

If an initial open-spike ordering is implemented, make it:

- deterministic
- transparent
- configurable
- explicitly `EXPERIMENTAL`

Persist all component values so we can later test which ones actually predicted opening continuation.

Do not replace the normal Discovery rank with this experimental score.

Expose it as an assessment/view.

## RTH — EVERY 30 MINUTES

On a normal session:

```text
10:00
10:30
11:00
11:30
12:00
12:30
13:00
13:30
14:00
14:30
15:00
15:30
```

Then the closing assessment at the actual RTH close.

Do not schedule a redundant 09:30 assessment because 09:25 is the special pre-open assessment.

On early-close days, stop at the actual exchange close.

Each RTH reassessment captures:

- current Discovery rank
- price / %
- volume / RVOL
- rank change
- halts/resumes
- levels / lost-support relationships
- Cycle
- Catalyst
- Structure
- relevant warnings
- what materially changed since the previous assessment

## RTH CLOSE — normally 16:00 ET

Create:

`RTH_CLOSE`

assessment.

Freeze:

- RTH close
- final RTH high/low
- final daytime cumulative volume
- final Daily RVOL / rank
- Cycle
- Catalyst
- Structure
- material warnings
- relevant Desk Events

Then initialize AFTER_HOURS state.

## 16:00–20:00 — AH LIVE DISCOVERY

No need to wait for another scheduled assessment.

AH Discovery updates continuously.

Research continues continuously for current AH names.

## 20:00–22:00

SIP AH market activity is complete.

Freeze the final AH market state.

Continue watching public intelligence sources:

- SEC filings
- offerings
- company releases
- catalysts
- structural changes

At 22:00 combine:

- final AH market state
- research through 22:00

into NEXT_DAY_RECAP.

---

# 8. ASSESSMENTS ARE SNAPSHOTS, NOT MARKET-DATA POLLING

The market feed remains continuous.

Do NOT make market data update only at:

- 06:25
- 06:45
- 07:00
- etc.

Scheduled assessments are higher-level persisted Desk states.

Between assessments:

- prices continue updating;
- Discovery ranks continue changing;
- levels continue changing;
- halts/events continue;
- new research continues;
- Focus remains live.

An assessment answers:

**What does the Desk believe matters at this checkpoint, and what changed since the previous checkpoint?**

---

# 9. PERSIST ASSESSMENTS

Add normalized persistent storage.

Use names appropriate to the codebase, conceptually:

## desk_assessments

- id
- tradingDate
- targetTradingDate when applicable
- assessmentType
- scheduledFor
- startedAt
- completedAt
- generatedLate
- sessionPhase
- status
- marketFingerprint
- researchFingerprint
- notes/metadata

## desk_assessment_tickers

For every ticker included in that assessment:

- assessmentId
- ticker
- assessmentRank
- liveSessionRank
- price
- percentChange
- Daily RVOL
- Daily RVOL rank
- AH %
- AH volume
- AH participation
- AH rank
- volume
- spread
- Cycle
- Catalyst
- Structure
- intelligence provenance
- level summary
- halt state
- focus status
- relevant warnings
- changedFields
- concise change summary

Use append-only assessment history.

Do not overwrite old snapshots.

This historical record is valuable for validating the product.

---

# 10. MATERIAL CHANGE / COMMENTARY

For each assessment, compare against the preceding assessment.

Generate deterministic change facts such as:

- entered Top 12
- left Top 12
- rank improved materially
- new HOD
- major price expansion/retracement
- support now lost
- halt/resume
- catalyst changed
- structure changed
- cycle changed
- new filing
- Dirty Float changed
- research conflict appeared/resolved

Do not generate generic AI prose every 30 minutes.

Use concise deterministic commentary first.

Examples:

```text
IVF: rank #7 → #3; +38% since prior assessment; new HOD.
XYZ: new 424B5; structural reassessment completed.
ABC: lost $4.50 support; cycle remains YELLOW.
```

Do not create buy/sell language.

---

# 11. CONDITIONAL CYCLE REASSESSMENT

Do not rerun the entire Terra dossier every 30 minutes just because an assessment is scheduled.

Preserve the existing evidence-fingerprint cost discipline.

However, scheduled assessments must be capable of identifying when the current Cycle may need reassessment because market behavior materially changed.

Create a separate compact **market/cycle reassessment fingerprint** using objective changes such as:

- substantial retracement
- new major session high
- meaningful lower-high/failure pattern if deterministically available
- major support loss
- halt/resume sequence
- large rank/participation change
- material multi-assessment price change

If nothing materially changed:

reuse the existing Cycle.

If the cycle context materially changed:

enqueue/perform the smallest appropriate cycle reassessment.

Do not rerun Catalyst/Structure interpretation unless their evidence changed.

Do not implement Chop Risk or Flush Risk in this phase.

---

# 12. SESSION-SPECIFIC TOP-N ENTRY TIMESTAMPS

Current `top12EnteredAt` is a daytime metric.

Generalize carefully so we can measure:

- daytime Top-12 entry
- AH Top-12 entry

without destroying the existing metric.

Prefer explicit session-aware state such as:

- session
- enteredTopNAt
- enteredRank
- qualificationPrice

Do not overload one timestamp with multiple meanings.

Research latency for an AH discovery must be measured from AH-board entry, not an old daytime qualification.

---

# 13. ASSESSMENT SCHEDULER MUST BE IDEMPOTENT

A scheduled assessment must execute at most once for:

`trading date + assessment type + scheduled time`

Restarts must not duplicate snapshots.

Use a database uniqueness constraint or equally reliable atomic mechanism.

Do not use read-then-write race-prone logic.

---

# 14. STARTUP / MISSED-ASSESSMENT BEHAVIOR

The desk may not always be running at every scheduled time.

Implement honest catch-up behavior.

## High-value checkpoints

For:

- NEXT_DAY_RECAP
- STRUCTURAL_REFRESH
- PREMARKET_0625
- PREMARKET_0645
- PREMARKET_0700
- OPEN_SPIKE_ASSESSMENT
- RTH_CLOSE

if the desk starts shortly after a missed checkpoint and the assessment is still operationally relevant:

run a catch-up assessment.

Persist:

- original `scheduledFor`
- actual `startedAt`
- `generatedLate=true`

Do NOT pretend it was generated on time.

## Repeated 30-minute RTH assessments

If the desk was offline for hours:

do not generate a dozen fake historical snapshots using current data.

Record missed intervals if useful, then perform one current catch-up assessment and continue from the next real scheduled interval.

Do not manufacture point-in-time research state.

---

# 15. 22:00 RECAP AND NEXT TRADING DATE

Use the market calendar.

A Friday 22:00 recap should identify the target next trading date as Monday unless Monday is a holiday.

Persist:

- source trading date
- target next trading date

Do not use calendar-day +1 blindly.

---

# 16. 06:10 STRUCTURAL REFRESH TARGETS

Build a deterministic target set using the union of:

- previous 22:00 recap top/relevant names
- current Focus
- current early-premarket Top 25
- names with new source evidence
- names with unresolved structural reassessment

Do not deep-analyze all 13,000 stocks at 06:10.

Use the existing analyze-once / evidence-fingerprint system.

---

# 17. SESSION-AWARE DASHBOARD HEADER

Make it immediately clear what the user is looking at.

Examples conceptually:

## 17:15

```text
AFTER HOURS — LIVE DISCOVERY
AH session since 16:00
Next full recap: 22:00 ET
```

## 20:30

```text
AFTER HOURS CLOSED
Final AH state frozen at 20:00
Next recap: 22:00 ET
```

## 22:05

```text
NEXT-DAY PREP
22:00 recap complete
Next structural refresh: 06:10 ET
```

## 06:18

```text
PREMARKET
Last assessment: STRUCTURAL REFRESH 06:10
Next: FIRST MARKET SCAN 06:25
```

## 06:50

```text
PREMARKET
Last assessment: 06:45
Next: 07:00
```

## 09:27

```text
PREMARKET
OPEN SPIKE ASSESSMENT: 09:25
```

## 12:17

```text
RTH
Last assessment: 12:00
Next reassessment: 12:30
```

Do not clutter the top bar excessively.

Create one compact `Desk Assessment` status component.

---

# 18. DISCOVERY TITLE / COLUMNS MUST CHANGE BY SESSION

## PREMARKET / RTH

Keep:

`DISCOVERY`

and Daily RVOL context.

## AFTER HOURS

Display clearly:

`AFTER-HOURS DISCOVERY`

Do not visually imply the main rank is Daily RVOL.

Columns should emphasize:

- Rank
- Ticker
- AH Price
- AH %
- AH Participation
- AH Volume
- spread
- levels
- Cycle
- Catalyst
- Structure

Daily RVOL may be secondary/contextual.

At 16:30, the board should be obviously based on post-close activity.

---

# 19. ASSESSMENT HISTORY VIEW

Add a compact way to review assessment snapshots.

Do not build a large analytics product.

A dropdown/toggle is sufficient:

```text
LIVE
LAST ASSESSMENT
06:25
06:45
07:00
09:25
10:00
...
RTH CLOSE
22:00 RECAP
```

Default remains LIVE.

Selecting a historical assessment should show its frozen ticker snapshot and clearly indicate:

`SNAPSHOT — not live`

Do not mix live prices into a historical assessment view.

This will be useful for evaluating whether the Desk improved or deteriorated between checkpoints.

---

# 20. FOCUS IS NOT RESET AT SESSION BOUNDARIES

Focus remains the user's session/trading-date workspace.

Do not remove a Focus ticker at 16:00 merely because AH Discovery resets.

A Focus ticker continues receiving live market state/research where available.

Current Focus behavior remains user-controlled.

Reset according to the existing trading-date Focus policy, not every sub-session.

---

# 21. POST-20:00 MARKET STATE

When SIP extended trading has ended:

do not show:

`MARKET LIVE`

merely because the socket remains connected.

Use session/market-health semantics to communicate that new SIP prints are not expected.

Research/public-source intelligence can still remain active.

Separate:

**market closed**

from:

**research engine active.**

---

# 22. RESEARCH ENGINE REMAINS CONTINUOUS

Do not make research happen only at scheduled assessments.

The automatic research worker continues reconciling continuously.

Scheduled structural refreshes provide broader/checkpoint reassessment.

A new:

- SEC filing
- catalyst
- offering
- prospectus

on a relevant ticker should still trigger research outside the scheduled times.

---

# 23. DATA PROVENANCE

Assessment snapshots must retain enough provenance to answer:

- which market session?
- which ranking definition?
- which price reference close?
- which assessment type?
- was it generated on time or late?
- which research version was current?
- what data timestamp was used?

This will later matter for backtesting.

---

# 24. TESTS — SESSION DISCOVERY

Add tests for at least:

1. Daily RVOL remains PREMARKET ranking.
2. Daily RVOL remains RTH base ranking.
3. RTH state freezes at close.
4. AH volume starts at zero at the RTH close.
5. RTH volume does not leak into AH volume.
6. AH % uses current-day RTH close.
7. AH high/low reset at AH start.
8. AH Participation formula.
9. Unknown baseline means unknown AH Participation.
10. AH ranking uses AH Participation, not Daily RVOL.
11. Massive RTH leader with no AH trading falls from AH relevance.
12. New AH mover can enter AH Top 12.
13. AH retention is independent from daytime retention.
14. AH >$20 retention works after in-range qualification.
15. Research queue follows AH Top 12 during AH.
16. Focus ticker survives session transition.

---

# 25. TESTS — SCHEDULE

Test at minimum:

17. 22:00 recap fires once.
18. 06:10 structural refresh.
19. 06:25 assessment.
20. 06:45 assessment.
21. 07:00 assessment.
22. 09:25 assessment.
23. 10:00 RTH assessment.
24. 10:30 RTH assessment.
25. 15:30 RTH assessment.
26. RTH close assessment.
27. no duplicate assessment after restart.
28. early-close calendar behavior.
29. Friday recap targets next valid trading date.
30. catch-up marked generatedLate.
31. missed RTH intervals do not create fake historical snapshots.
32. assessment snapshot is immutable.
33. historical snapshot view does not merge live telemetry.

---

# 26. TESTS — CHANGES / RESEARCH

34. assessment comparison detects Top-12 entry.
35. detects rank change.
36. detects new HOD.
37. detects support loss.
38. detects Catalyst change.
39. detects Structure change.
40. unchanged evidence creates zero unnecessary full interpretation calls.
41. 06:10 targets are bounded to relevant names.
42. AH new mover gets auto-research.
43. assessment and research workers remain independently healthy.

---

# 27. LIVE ACCEPTANCE TEST — TODAY AFTER HOURS

Use the current live session if still available.

The current app at approximately 16:30 is showing stale daytime leaders.

After implementation/restart:

verify:

1. Session says AFTER HOURS.
2. Discovery title says AFTER-HOURS DISCOVERY.
3. AH volume reflects only trades since 16:00.
4. AH % is versus today's RTH close.
5. AH rank is not the same as the old Daily-RVOL rank merely by construction.
6. A daytime leader with little AH activity falls appropriately.
7. A new post-16:00 mover can rise into the board.
8. A new AH Top-12 unknown ticker automatically queues for analysis.
9. Focus names remain visible regardless of AH rank.
10. Daily RVOL remains available as context where useful.

Report before/after Top 12.

---

# 28. VALIDATE THE OLD SPREADSHEET SCHEDULE

At completion, explicitly map each historical spreadsheet checkpoint to the implemented assessment type:

```text
22:00
06:10
06:25
06:45
07:00
09:25
RTH every 30 min
RTH close
AH continuous
```

Report whether each is:

- implemented
- idempotent
- persisted
- visible in UI
- catch-up capable

---

# 29. DO NOT IMPLEMENT

Do NOT introduce in this phase:

- Level 2
- Time & Sales UI
- broker/order integration
- Chop Risk model
- Flush Risk model
- Dirty Float absorption/cleaning
- Effective Float Turnover
- individualized trade signals
- customer billing/accounts
- an opaque AI AH ranking
- a supposedly validated open-spike predictor

The 09:25 feature may be explicitly EXPERIMENTAL until tested.

---

# 30. PERFORMANCE / COST

The scheduled assessment engine must not turn into:

`Top 12 × every 30 minutes × full Terra dossier`

Use:

- deterministic market calculations
- persisted research
- source fingerprints
- compact change checks

AI reanalysis only when the relevant interpretation context materially changes.

Log assessment runtime and any model-call counts.

---

# 31. DATABASE SAFETY

Follow the existing schema-migration safety behavior.

Before schema upgrade:

- timestamped SQLite backup
- integrity-safe backup mechanism
- transactional migration
- visible backup logging

Add tables through normal schema migration.

Do not depend on web-process compatibility CREATEs for the final schema.

---

# 32. NORMAL DAILY OPERATION

`npm run desk`

must start/supervise everything required:

- web dashboard
- Alpaca market worker
- research worker
- assessment worker

The user should not need to remember which process powers which session.

Expose independent health for:

- MARKET
- RESEARCH
- ASSESSMENT/SCHEDULER
- GOOGLE SHEET

Do not make a green Sheet light imply the scheduler is alive.

---

# VALIDATION GATE

Run the full current project gate:

```text
npm test
npm run lint
npm run typecheck
npm run build
```

Also run relevant diagnostics.

---

# STOP BEFORE COMMIT

Do NOT commit automatically.

When complete, report:

## Architecture

- session-aware discovery design
- AH state storage
- assessment worker
- scheduler/idempotency design
- tables/schema versions

## Ranking

- PREMARKET ranking
- RTH ranking
- AFTER_HOURS ranking
- exact AH Participation formula
- session retention behavior

## Schedule

For every assessment time:

- scheduled time
- assessment type
- trigger behavior
- catch-up behavior

## Live AH Validation

- old Daily-RVOL Top 12
- new AH Top 12
- AH %
- AH volume
- AH Participation
- examples of RTH leaders dropping
- examples of new AH movers entering

## Research

- proof AH new movers auto-queue
- 06:10 target behavior
- AI/model calls created by assessments

## UI

- session-aware header
- last/next assessment
- AH Discovery
- historical assessment selector
- screenshots

## Reliability

- migration backup
- tests
- lint
- typecheck
- build
- worker health

## Deviations

Explain any material implementation choice that differs from this specification and why.

Do not begin another feature phase until the session-aware desk has been reviewed live.