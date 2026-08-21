Continue development of:

`A:\mointel`

Repository:

`https://github.com/iamadamzc/mointel`

Current latest checkpoint includes the price-level visualization at:

`419335d`

This is a focused **correctness + information hierarchy** pass based on live screenshots of the actual Trading Desk.

Do NOT redesign the visual language from scratch.

The current dark workstation aesthetic, density, typography, status colors, Discovery table, and Level Ladder are fundamentally good.

The problem now is that we have accumulated substantial intelligence without clearly separating:

**what a trader needs in the next 5 seconds**

from:

**what a trader may investigate over the next 5 minutes.**

There are also two live-state correctness problems visible in the current UI that must be fixed before aesthetic work.

---

# OBJECTIVES

This pass has seven objectives:

1. Fix the incorrect market-session state visible in the live dashboard.
2. Ensure live Alpaca telemetry always wins over stale Sheet telemetry in trader-facing views.
3. Add a compact **Desk Read** at the top of the ticker drawer.
4. Reduce drawer duplication, especially Sheet vs AUTO.
5. Improve the home-page information hierarchy and remove wasted space.
6. Make Desk Events materially selective rather than noisy.
7. Slightly simplify compact level presentation while preserving the full Level Ladder.

Do not change:

- Daily RVOL formula
- Discovery ranking methodology
- Dirty Float definitions
- catalyst interpretation
- research evidence collection
- model prompts
- Sheet contents
- Alpaca calculations except where required to fix market-session correctness
- price-level classification logic already implemented

---

# 1. FIX MARKET SESSION CORRECTNESS

The current live screenshots show approximately:

`11:40 ET`

while the header still says:

`PREMARKET`

That is wrong.

At 11:40 ET the session must be:

`RTH`

This is a correctness issue, not merely a display issue.

Investigate the root cause.

Do NOT simply patch the header text.

There should be one authoritative market-session calculation used consistently throughout the application.

Use America/New_York with DST-aware time handling.

Required session definitions:

```text
PREMARKET:    04:00 <= time < 09:30 ET
RTH:          09:30 <= time < 16:00 ET
AFTER_HOURS:  16:00 <= time < 20:00 ET
CLOSED:       otherwise
```

Ensure the authoritative session value is used consistently by:

- header
- reference-close logic
- percent-change logic
- current market-state labels
- worker state where applicable
- dashboard view model
- any other UI/session-dependent calculations

Do not create separate browser and worker definitions that can disagree.

## Tests

At minimum test:

- 03:59 ET → CLOSED
- 04:00 ET → PREMARKET
- 09:29:59 ET → PREMARKET
- 09:30 ET → RTH
- 15:59:59 ET → RTH
- 16:00 ET → AFTER_HOURS
- 19:59:59 ET → AFTER_HOURS
- 20:00 ET → CLOSED
- DST summer date
- DST winter date

Manually verify the current live dashboard no longer reports PREMARKET during RTH.

---

# 2. LIVE TELEMETRY MUST WIN IN ALL TRADER-FACING SURFACES

The current screenshots show a discrepancy for FIEE.

Primary Focus displays Sheet/PM values around:

```text
$5.80
+16.0%
PM
```

while the live Alpaca state shows approximately:

```text
$5.72–$5.73
+14.4–14.6%
SIP
```

Once fresh Alpaca market state exists, trader-facing market telemetry must use it.

The Google Sheet remains authoritative for slow-changing research fields.

## Live market data owns

When fresh:

- current price
- % change
- volume
- session high
- session low
- RVOL
- RVOL rank
- spread
- bid/ask
- LULD
- halt state
- session

## Sheet / research owns

- catalyst
- catalyst grade
- cycle classification when applicable
- structure
- Dirty Float
- warnings
- research-derived levels
- former-runner context
- qualitative analyst notes

Primary Focus, Discovery, Watchlist and ticker drawer must all use the same merged market-state precedence.

Do not allow each component to independently decide which price to show.

Create or reuse a single normalized trader-facing projection.

If Alpaca state is stale:

- visibly mark it stale
- use the documented fallback behavior
- do not silently make stale data look current

Add regression tests proving Primary Focus and Discovery show identical live market telemetry for the same ticker.

---

# 3. ADD A TOP-OF-DRAWER "DESK READ"

The ticker drawer contains excellent detail but currently requires too much scrolling before the trader gets the answer.

Add a compact **DESK READ** immediately under the drawer header.

This is the live trading summary.

The trader should be able to open a ticker and understand the important state in roughly 2–3 seconds.

## Desired information

Example conceptual layout:

```text
FIEE   $5.73   +14.6%
FRESH / FRONTSIDE   A CATALYST   STRUCTURE CAUTION

RVOL 2.0x #85    Spread 0.70%    Vol 2.11M

NEXT UP
6.00 whole $ → 6.22 resistance → 6.50 resistance

NEXT DOWN
5.50 half $ → 5.32 LOD → 5.00 support

WHY NOW
Friday earnings catalyst; holding above prior RTH close; live demand currently modest.

STRUCTURAL WARNING
Public float unresolved. $6.27M ATM capacity + $30M shelf capacity.
```

Do not copy this wording literally.

Build from normalized data.

The Desk Read should include:

### Core state

- ticker
- live current price
- live %
- cycle
- catalyst grade/status
- structure classification

### Demand

- RVOL
- RVOL rank
- spread
- session volume

### Levels

- nearest meaningful 2–3 levels above
- nearest meaningful 2–3 below

### Why Now

One concise sentence or compact set of phrases using existing catalyst/demand intelligence.

Do not generate a new AI call for this.

Derive it from existing normalized data.

### Structural Warning

One concise warning using existing structure/supply intelligence.

Again, no new AI call.

If no meaningful warning exists, do not invent one.

---

# 4. REDUCE DRAWER DUPLICATION

The drawer currently contains many sequential sections:

- Demand
- Level Ladder
- Sheet vs Automatic
- Why It Is Moving
- Automatic Structure
- Automatic Cycle
- Evidence
- Overview
- Sheet Catalyst
- Sheet Cycle
- Sheet Structure
- Level Sources

This is useful as an audit tool but too repetitive for live use.

Do NOT remove the detailed information.

Reorganize it.

## Preferred hierarchy

### Tier 1 — immediate

- Drawer header
- Desk Read
- Level Ladder

### Tier 2 — intelligence

- Why It Is Moving / Catalyst
- Structural Intelligence
- Momentum Cycle

### Tier 3 — audit / research

- Sheet vs AUTO comparison when needed
- Evidence & Provenance
- Source details
- Raw Sheet research
- Level source text

Use collapsible/expandable sections for Tier 3 if appropriate.

Do not hide critical conflict warnings.

---

# 5. SHEET VS AUTO SHOULD BE CONDITIONAL

The current Sheet-vs-Automatic panel is useful when conclusions differ, but it should not occupy a large permanent block when there is no material disagreement.

## When Sheet and AUTO materially agree

Show only a subtle provenance indicator:

`SHEET + AUTO`

No large comparison table by default.

Allow the user to expand the comparison if desired.

## When there is a material conflict

Show prominently:

`CONFLICT`

Then display the comparison table with:

- field
- Sheet conclusion
- Automatic conclusion
- conflict reason

Keep both conclusions.

Do not silently resolve the conflict.

Do not let AUTO overwrite Sheet.

## When only AUTO exists

Show:

`AUTO`

## When only Sheet exists

Show:

`SHEET`

## Partial / incomplete

Represent accurately.

Do not turn incomplete AUTO coverage into a fake disagreement.

---

# 6. COMPRESS STRUCTURAL INTELLIGENCE FOR LIVE USE

The current Automatic Structure section contains useful but lengthy prose.

Keep the prose for audit, but add an immediate structured summary at the top.

Example conceptual format:

```text
STRUCTURE: CAUTION

FLOAT
Unknown

KNOWN / POTENTIAL SUPPLY
$6.27M ATM        POSSIBLY ACTIVE
$30M shelf        LATENT CAPACITY
Warrants          UNRESOLVED

KEY WARNING
Public float is unresolved; current filing evidence establishes capacity, not confirmed selling.
```

Use the existing supply ledger.

Do not change structural classifications.

Do not reinterpret supply.

This is presentation only.

Then put the fuller model explanation below or behind expansion.

---

# 7. HOME PAGE INFORMATION HIERARCHY

The current home page contains:

1. summary metrics
2. filters
3. Discovery
4. Desk Events
5. Primary Focus
6. Watchlist

The Discovery table is now the strongest and most important component.

Make it visually dominant.

## Recommended hierarchy

### Top

Header + market/research health

### Summary

Compact market-state summary

### Primary / Active

Compact horizontal strip, not a tall isolated card surrounded by empty space

### Discovery

Dominant table

### Events

Compact contextual panel / rail / collapsible area

### Watchlist

Secondary analyzed list, collapsible or below Discovery

Do not necessarily copy this order rigidly if the current component architecture suggests a cleaner equivalent.

The key goals:

- remove the huge unused empty area around a single Primary Focus card
- Discovery remains visually dominant
- Primary Focus remains immediately visible
- Watchlist does not compete equally with Discovery
- Desk Events do not consume a large full-width block unless materially useful

---

# 8. PRIMARY FOCUS SHOULD BE A COMPACT STRIP

The current single FIEE card occupies the left side while the rest of the horizontal space is empty.

Replace this with a compact horizontal **Primary / Active strip**.

It should support approximately 1–5 names.

Each compact card should show:

- ticker
- live price
- live %
- cycle
- catalyst
- structure
- RVOL / rank
- nearest up level
- nearest down level
- concise warning

Do not reproduce every Watchlist field.

If only one ticker is Primary, do not waste the remaining viewport height.

The strip should remain compact.

---

# 9. DESK EVENTS NEED MATERIALITY FILTERING

The current Desk Events panel can show many simultaneous:

`NEW HOD`

events for unrelated stocks.

That creates noise.

Do not delete events from storage.

Create a trader-facing event priority/filter layer.

## Highest display priority

Events involving:

- Primary / Active names
- current Top 12
- structural warnings
- catalyst source changes
- analysis completion
- halt/resume
- major rank-entry events
- relevant support loss / level relationship events if already deterministic

## Lower display priority

Broad-market events for names outside the current relevant universe.

These may remain accessible but should not dominate the visible feed.

### NEW HOD

A NEW HOD for a Top-12 or Active ticker is useful.

A NEW HOD for an unrelated symbol outside the relevant set should normally be visually subordinate or hidden from the default feed.

Do not change underlying event-generation semantics in this task unless absolutely necessary.

Prefer a view-layer filter/prioritization.

Consider showing:

`Relevant Events`

by default, with an option to view:

`All Events`

---

# 10. COMPACT LEVEL CELL — REMOVE REDUNDANT "NOW"

The Discovery table already has a dedicated Price column.

The compact Levels cell currently repeats:

```text
UP
NOW
DN
```

Remove the `NOW` row from the compact table level cell unless there is a specific relationship note that adds information.

Prefer:

```text
UP  3.36 resistance +0.17 · 3.47 HOD +0.28
DN  2.98 resistance PRICE ABOVE -0.21 · 2.73 LOD -0.46
```

The Price column already tells the trader the current price.

Keep the full current-price-centered Level Ladder in the drawer.

Do not change level selection/importance logic from commit `419335d`.

---

# 11. KEEP THE LEVEL LADDER AS-IS UNLESS A VISUAL BUG EXISTS

The full drawer Level Ladder is working well.

Preserve:

- historical resistance distinction
- HOD / LOD
- research resistance/support
- round numbers
- current price center
- LOST SUPPORT
- PRICE ABOVE
- distance calculations
- clustering
- importance × proximity logic

Do not redesign the underlying price-level engine.

---

# 12. WATCHLIST SHOULD BE CLEARLY SECONDARY

The Watchlist now overlaps heavily with Discovery.

Do not remove it because it still represents the analyzed/research population.

But visually distinguish:

**Discovery = what the market says matters now**

from:

**Watchlist = what the desk already knows/researches**

Options:

- collapse Watchlist by default
- place below Discovery
- give it lower visual prominence
- add a clear section subtitle such as `ANALYZED WATCHLIST`

Do not make the user interpret two equally prominent tables with overlapping names.

---

# 13. SUMMARY STRIP — MORE LIVE-MARKET ORIENTED

Current summary fields include:

- Names Tracked
- Fresh / Frontside
- Frontside Warning
- Backside
- Dirty Float
- Strong / Fresh Catalysts

These are useful.

Retain them for now unless a clean layout permits adding live-state metrics.

If room allows, consider adding or replacing less-useful summary fields with:

- Top RVOL
- Active / Primary count
- Halted count
- new research pending

Do not clutter the header.

This is lower priority than the rest of the task.

---

# 14. NO NEW AI CALLS

Everything in this UI pass must use data already available in the application.

Do not create:

- Desk Read model calls
- summary model calls
- event-summary model calls

Use existing normalized intelligence.

---

# 15. RESPONSIVENESS

Primary target remains:

`1920x1080`

Also verify the layout at the approximate browser dimensions shown in the supplied screenshots.

The ticker drawer should remain readable without creating extremely long horizontal lines of prose.

Use sensible max widths.

---

# 16. TESTS

Add/extend tests for at least:

1. authoritative session state at all boundaries
2. RTH shown correctly during RTH
3. DST behavior
4. live telemetry precedence over Sheet telemetry
5. Primary Focus uses live price when market state is fresh
6. Primary Focus fallback when market state unavailable
7. Discovery and Primary show identical current market price source
8. Desk Read construction
9. Desk Read level selection
10. Desk Read structure warning
11. no invented Why Now text
12. Sheet + AUTO agreement compact state
13. conflict shows full comparison
14. AUTO-only state
15. Sheet-only state
16. event priority for Top-12 ticker
17. unrelated NEW_HOD is lower priority
18. compact level display has no redundant NOW row
19. drawer Level Ladder regression
20. FIEE historical-resistance regression remains intact

---

# 17. MANUAL LIVE VALIDATION

Use the currently running live system if possible.

Manually inspect:

## FIEE

Confirm:

- header says RTH during RTH
- Primary Focus live price matches SIP drawer price
- live % matches
- Sheet catalyst/structure/cycle remain intact
- Level Ladder unchanged
- $10.59 remains historical resistance
- Desk Read is useful

## IVF

Confirm:

- high RVOL and Dirty Float are immediately visible
- nearest levels are readable
- Sheet/AUTO conflict visible if applicable

## One AUTO-only ticker

Confirm the drawer is useful without Sheet data.

## One unrelated event ticker

Confirm its NEW HOD does not dominate the default relevant-events feed if it is outside the active relevant universe.

---

# 18. VISUAL ACCEPTANCE STANDARD

On the main screen, within approximately 2–3 seconds, a trader should be able to answer:

1. What are the few names that matter most?
2. Which ones have the strongest abnormal demand?
3. Which have dangerous structure?
4. What is the next meaningful level above?
5. What is the next meaningful level below?
6. What material event just changed?

On opening a ticker drawer, within approximately 3 seconds the trader should be able to answer:

1. Why is it moving?
2. Is it frontside/backside?
3. Is the structure clean/caution/dirty/unknown?
4. What are the next levels?
5. What is the major warning?

Only after that should the user need to scroll into detailed evidence.

---

# 19. DO NOT TOUCH

Do NOT change:

- RVOL methodology
- Top-12 ranking
- Top-50 logic
- research queue
- research model tiers
- catalyst collector
- SEC collector
- Dirty Float logic
- supply classifications
- cycle methodology
- historical-bar methodology
- Sheet/AUTO interpretation rules
- event-generation thresholds unless necessary for a correctness bug
- database architecture beyond minimal view-state changes

---

# VALIDATION GATE

Run:

```text
npm test
npm run lint
npm run typecheck
npm run build
```

or the equivalent current project commands.

Fix all failures.

---

# STOP BEFORE COMMIT

Do NOT commit automatically.

When complete, report:

## Correctness

- root cause of PREMARKET-at-11:40 bug
- fix implemented
- session-boundary test results
- live telemetry precedence fix
- FIEE before/after live values

## Home Page

- new component order/layout
- Primary Focus changes
- Discovery changes
- Watchlist changes
- event-feed prioritization

## Drawer

- Desk Read design
- Sheet/AUTO conditional display
- structural summary changes
- detail/audit section organization

## Levels

- compact table before/after
- confirmation full Level Ladder unchanged

## Validation

- screenshots of top of home page
- screenshot with Discovery visible
- screenshot of relevant events
- screenshot of FIEE Desk Read
- screenshot of FIEE Level Ladder
- screenshot of FIEE detail further down
- tests/lint/typecheck/build

## Deviations

Explain any material choice that differs from this specification and why.

Do not begin another product feature until this information-hierarchy pass has been visually reviewed.