Continue development of:

`A:\mointel`

The latest UI/information-hierarchy pass is complete but uncommitted.

Do NOT redesign the dashboard again.

The current overall hierarchy is approved:

- Header / health
- Summary / filters
- compact focus strip
- Discovery
- relevant Events
- collapsed analyzed Watchlist
- Desk Read + Level Ladder at top of ticker drawer

This is a targeted final correction pass before committing that work.

There are four items:

1. separate socket connectivity from market-data freshness;
2. make Desk Read use merged intelligence rather than contradictory AUTO-only prose;
3. correct partial-analysis status labels;
4. redefine the current "PRIMARY / ACTIVE" card strip as a user-controlled **FOCUS** list.

Do not modify RVOL, Discovery ranking, research methodology, model prompts, Dirty Float, cycle logic, catalyst logic, level logic, or Sheet data.

# 1. RENAME PRIMARY / ACTIVE TO FOCUS

The current card strip is labelled:

`PRIMARY / ACTIVE`

That terminology is ambiguous.

Implement the following conceptual distinction:

## DISCOVERY

System generated.

Answers:

`What does the market say deserves attention?`

Driven by the existing deterministic RVOL Discovery system.

Do not change it.

## DESK PRIORITY

Existing research classification such as:

`A — PRIMARY`

`B — SECONDARY`

etc.

This remains an intelligence/research field.

It does NOT equal user Focus.

Do not remove it.

## FOCUS

User selected.

Answers:

`Which names do I personally want continuously visible right now?`

Rename the card strip:

`FOCUS`

Do not call it Active.

Reserve "Active" for a future product state if we later define a deterministic active-momentum/triggering state.

# 2. USER-CONTROLLED FOCUS

Allow the user to add/remove tickers from Focus.

Provide a compact control such as:

- pin icon
- star
- `+ FOCUS`

Use whichever best matches the current visual language.

The action should be available from at least:

- Discovery row
- ticker drawer

Optionally also Watchlist if clean to implement.

The control should be fast and obvious but not visually dominate the row.

Examples:

`☆` not focused

`★` focused

or an equivalent pin treatment.

# 3. FOCUS BEHAVIOR

Focus is independent of Discovery rank.

If a user focuses a ticker and it later falls from:

#3 → #18 → #80

it remains in Focus until removed by the user or the session resets.

Removing a ticker from Focus must NOT:

- remove it from Discovery
- stop market tracking
- delete research
- alter Desk Priority
- change its RVOL ranking

Focus is a display/attention preference only.

# 4. FOCUS PERSISTENCE

Persist Focus locally in SQLite using the existing storage abstraction.

Use a small session-scoped structure such as:

`focus_tickers`

with fields approximately:

- ticker
- tradingDate
- pinnedAt
- displayOrder
- source / initialSeed if useful

Use naming appropriate to the codebase.

Focus should be scoped to the trading date.

Momentum focus is generally session-specific.

Do not automatically carry yesterday's momentum names into today's Focus.

Retain historical rows if useful for analysis, but current UI should load today's Focus.

# 5. INITIAL FOCUS SEED

Preserve existing behavior without making Desk Priority permanently control Focus.

If there are **no explicit Focus records for the current trading date**, initialize Focus once from current:

`A — PRIMARY`

Sheet/Desk Priority names.

Mark them as an initial seed if useful.

After Focus has been initialized for the session:

- new A-priority names must NOT silently overwrite user choices;
- user removals must stay removed;
- user additions must stay added.

This ensures current FIEE behavior remains useful while making Focus genuinely user-controlled.

# 6. FOCUS LIMIT

Support approximately:

`0–6`

focused names for the current prototype.

If the user tries to exceed the configured limit, show a compact message rather than silently replacing another ticker.

Make configurable, e.g.:

`FOCUS_MAX_TICKERS=6`

Do not build elaborate focus-list management.

# 7. FOCUS CARD CONTENT

Keep the card compact.

Each Focus card should show:

- ticker
- fresh live SIP price
- live %
- Cycle
- Catalyst
- Structure
- RVOL / rank
- spread
- nearest meaningful level up
- nearest meaningful level down
- concise structural/current warning

Use the same normalized telemetry and merged intelligence used by Discovery and the drawer.

Do not read directly from raw Sheet fields.

Clicking the Focus card should open the ticker drawer.

# 8. OPTIONAL FOCUS ORDER

If simple to support, preserve pin order.

Drag/drop is NOT required.

A later task can implement reordering.

For now:

- pinned order
- or explicit simple order

is sufficient.

Do not overengineer.

# 9. MARKET HEALTH — CONNECTION IS NOT FRESHNESS

The screenshots show cases such as:

`MARKET: ALPACA SIP — LIVE`

while:

`msg 227s`

A connected WebSocket must not automatically produce a green LIVE badge when market data has not arrived for several minutes during an active market session.

Separate:

## Connection state

Examples:

- CONNECTING
- CONNECTED
- DISCONNECTED
- ERROR

from:

## Data freshness

Examples:

- FRESH
- DEGRADED
- STALE
- CLOSED / NOT EXPECTED

Create one normalized market-health projection.

The visible status should combine the two.

Examples:

`MARKET: ALPACA SIP — LIVE`

green only when:

- socket is healthy
- AND market-data freshness is within the expected threshold.

If socket remains connected but market messages become unexpectedly old:

`MARKET: CONNECTED — DATA STALE`

or:

`MARKET: ALPACA SIP — DEGRADED`

in amber.

If disconnected:

red/offline.

Do not claim LIVE based solely on socket state.

# 10. MARKET FRESHNESS THRESHOLDS

Use expected live-stream behavior rather than an arbitrary browser timer.

Make thresholds configurable.

The exact implementation should account for the whole-market stream and high-resolution stream already available.

During RTH, a message age of approximately:

`227 seconds`

must not remain green LIVE.

A normal short lull such as approximately:

`55 seconds`

should not necessarily produce a false outage if the source cadence makes that normal.

Use a sensible two-stage threshold such as:

FRESH → DEGRADED → STALE

and document the values.

Do not make a single illiquid ticker's lack of trades mark the entire SIP feed stale.

Feed health should use global/socket/whole-market activity.

Ticker freshness remains separate.

# 11. DESK READ MUST USE MERGED INTELLIGENCE

FIEE currently exposes a contradiction:

The Desk Read shows the human-reviewed:

`A — STRONG/FRESH`

catalyst.

But:

`WHY NOW — AUTOMATIC`

says catalyst coverage is incomplete and no company-specific explanation can be established.

Both statements reflect their sources, but they should not be presented as one unified trader-facing conclusion.

Desk Read must use **merged intelligence**.

Do not default its narrative to AUTO merely because AUTO exists.

# 12. MERGED WHY NOW

Create a deterministic Desk Read projection.

If Sheet has a human-reviewed catalyst and AUTO coverage is incomplete:

Desk Read should conceptually communicate:

`Fresh Friday earnings remain the known catalyst. Automatic source coverage is incomplete.`

Do NOT fabricate new analysis.

Build this from existing:

- Sheet catalyst
- AUTO catalyst
- provenance
- conflict state
- coverage state

Rules should roughly be:

## Sheet + AUTO agree

Use the concise agreed conclusion.

Provenance:

`SHEET + AUTO`

## Sheet evidence exists, AUTO incomplete

Use the Sheet conclusion as the trader-facing known intelligence.

Add a compact qualification:

`AUTO COVERAGE INCOMPLETE`

Do not replace known Sheet intelligence with UNKNOWN.

## AUTO newer / Sheet absent

Use AUTO.

## Material conflict

Show:

`CONFLICT`

and a concise neutral summary that the two sources disagree.

Do not choose a winner silently.

Detailed comparison remains below.

# 13. MERGED STRUCTURAL WARNING

Apply the same principle to the Desk Read structural warning.

Do not display AUTO narrative as the sole trader-facing warning if:

- Sheet has material structural intelligence
- AUTO coverage is incomplete

Use the merged provenance state.

Examples:

Sheet UNKNOWN + AUTO CAUTION/incomplete may remain:

`CAUTION — automatic evidence identifies financing capacity; full structure remains unresolved.`

Sheet DIRTY_FLOAT + AUTO incomplete CAUTION should not quietly become CAUTION in Desk Read.

Present the merged state/conflict honestly.

Do not change the underlying interpretation rules.

This is presentation/merge logic only.

# 14. APUS / PARTIAL INTELLIGENCE STATUS BUG

APUS currently shows:

`NOT YET ANALYZED`

in the drawer header while the Desk Read already contains:

- AUTO catalyst classification
- AUTO structure classification

That is contradictory.

Create a single normalized `intelligenceStatus`.

Possible trader-facing states:

- NOT_ANALYZED
- ANALYSIS_PENDING
- PARTIAL_AUTO
- AUTO
- SHEET
- SHEET_AUTO
- CONFLICT
- FAILED

Use existing internal states as input.

Do not introduce duplicate research job semantics.

# 15. STATUS DEFINITIONS

## NOT_ANALYZED

No Sheet intelligence and no accepted AUTO intelligence and no job underway.

## ANALYSIS_PENDING

Research job genuinely queued/collecting/analyzing with no useful accepted dossier yet.

## PARTIAL_AUTO

Some accepted AUTO intelligence exists but major fields remain unavailable.

Example:

Catalyst + Structure exist, Cycle unknown.

APUS should show something like:

`PARTIAL AUTO`

not:

`NOT YET ANALYZED`.

## AUTO

Usable accepted automatic dossier available with the core intelligence fields sufficiently populated.

## SHEET

Sheet only.

## SHEET + AUTO

Both exist and materially agree.

## CONFLICT

Material Sheet/AUTO disagreement.

## FAILED

Analysis failed and no usable accepted intelligence exists.

# 16. SINGLE STATUS SOURCE

The ticker drawer header, Desk Read, Discovery row and any other intelligence-status display must use the same normalized object.

Do not let individual components infer:

`NOT YET ANALYZED`

independently.

Add a regression test using APUS-like partial data.

# 17. SHEET/AUTO CONFLICT DETAIL

Keep the existing conditional comparison behavior:

Agreement:
- collapsed/subtle

Conflict:
- prominent
- comparison expanded

Do not change it except as required to support the merged Desk Read.

# 18. FIEE ACCEPTANCE TEST

Using current FIEE data, manually verify:

## Market telemetry

Focus card
Discovery
Watchlist
drawer header
Desk Read

all use the same current SIP price/%.

## Why Now

Desk Read must no longer simultaneously imply:

`A — STRONG/FRESH`

and:

`no fresh company explanation can be established`

without reconciling provenance.

It should preserve the known human-reviewed earnings catalyst and disclose AUTO coverage limitations separately.

## Structure

Preserve:

- public float UNKNOWN
- financing warnings
- Sheet/AUTO conflict/incomplete state as appropriate
- $10.59 historical resistance
- no fake currentCycleHigh

# 19. APUS ACCEPTANCE TEST

APUS currently has:

- AUTO catalyst
- AUTO structure
- unknown/not-established cycle

Its header/status must become:

`PARTIAL AUTO`

or equivalent.

Do not display:

`NOT YET ANALYZED`.

The Desk Read must still expose the available intelligence.

# 20. FOCUS ACCEPTANCE TEST

During the live session:

1. FIEE should initially appear in Focus via the existing A-priority seed if today's Focus has not previously been initialized.
2. Pin a non-A ticker such as any current Discovery name.
3. It should immediately receive a Focus card.
4. Remove FIEE.
5. FIEE should disappear from Focus but remain everywhere else.
6. Refresh browser.
7. User Focus choices must persist.
8. If the pinned ticker leaves Top 12, it must remain in Focus.
9. The next trading date starts with a new session-scoped Focus state.

Do not hardcode ticker names in implementation/tests.

# 21. FOCUS UI

Replace:

`PRIMARY / ACTIVE`

with:

`FOCUS`

Optional subtitle:

`Pinned for this session`

or similarly concise text.

If no ticker is focused:

show a small empty state such as:

`Pin a ticker from Discovery to keep it here.`

Do not leave a large empty panel.

# 22. TESTS

Add tests for at least:

1. Focus seeded from A priority once
2. Focus seed does not continually overwrite user changes
3. pin ticker
4. unpin ticker
5. Focus survives browser refresh
6. Focus ticker remains after leaving Top 12
7. Focus resets/scopes on new trading date
8. maximum Focus count
9. Focus uses live telemetry
10. Focus uses merged intelligence
11. connection healthy + fresh data = LIVE
12. connected + old data = DEGRADED/STALE
13. disconnected = OFFLINE
14. market-level freshness independent of illiquid ticker freshness
15. FIEE merged Why Now uses Sheet catalyst when AUTO incomplete
16. agreed Sheet/AUTO summary
17. conflict Desk Read
18. APUS partial accepted intelligence = PARTIAL_AUTO
19. pending with no accepted intelligence = ANALYSIS_PENDING
20. all components consume one intelligenceStatus
21. FIEE historical-resistance regression
22. Level Ladder regression unchanged

# 23. DO NOT CHANGE

Do NOT modify:

- Daily RVOL definition
- rank calculations
- discovery universe
- Top 12 logic
- security classification
- price-level engine
- research collection
- interpreter prompts
- model tiers
- Sheet/AUTO comparison methodology
- Dirty Float definitions
- cycle methodology
- research concurrency
- event generation
- Google Sheet

# VALIDATION

Run:

`npm test`

`npm run lint`

`npm run typecheck`

`npm run build`

or current equivalents.

Manual live validation should include:

- Focus pin/unpin
- persistence after refresh
- FIEE merged Desk Read
- APUS partial status
- market badge under fresh data
- forced/simulated stale market-data state

# STOP BEFORE COMMIT

Do NOT commit automatically.

Report:

## Focus

- persistence architecture
- initial seed behavior
- UI controls
- max count
- live examples

## Market Health

- old behavior
- new connection/freshness model
- configured thresholds
- how 55s vs 227s behave

## Desk Read

- FIEE before/after
- merge rules
- conflict behavior

## Intelligence Status

- APUS before/after
- normalized states
- single-source projection

## Validation

- screenshots
- tests
- lint
- typecheck
- build

Then stop for review before commit.