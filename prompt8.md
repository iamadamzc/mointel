Continue development of:

`A:\mointel`

Current head is the latest Phase 4/instrumentation build.

Do not change the Demand Engine, research pipeline, interpretation logic, or ranking logic in this task.

This is a **UI/data-presentation improvement** focused on price levels.

## OBJECTIVE

Replace the current buried text-style level display with a much more eye-ready, logically structured **Price Level Visualization**.

Levels must no longer appear as an undifferentiated line of prices.

They should be shown in a way that makes it immediately obvious:

* what levels are above current price;
* what levels are below current price;
* which level is nearest;
* what type of level each one is;
* how far each level is from current price;
* what the next actionable levels are.

The goal is a trader-friendly **level map**, not a sentence.

## DESIGN PRINCIPLE

Represent levels as a **stacked ladder centered on current price**.

Every displayed level should belong to one of three groups:

1. **Above current price** — resistance / breakout / trigger levels
2. **Current price zone**
3. **Below current price** — support / risk / reclaim / flush-reference levels

Do not render levels as a plain comma-separated or prose string.

## MAIN TABLE / DISCOVERY BOARD

Add a compact level visualization to each row.

This should not try to show every level.

Instead, show the most actionable nearby levels.

Preferred structure for the row:

* **Next Up** — nearest 1–3 levels above current price
* **Now** — current last price and optionally spread
* **Next Down** — nearest 1–3 levels below current price

Each displayed level should include:

* price
* compact level type label
* distance from current price in dollars/cents
* optional percentage distance when space allows

Example visual logic:

`UP: 6.50 HOD (+0.28) · 6.75 PMH (+0.53)`

`NOW: 6.22`

`DOWN: 6.00 $ (+0.22 below) · 5.88 VWAP (-0.34)`

You do not need to copy this exact text formatting, but the structure must be obvious.

The table should let me glance at a ticker and know the nearest resistance/support without opening the drawer.

## TICKER DRAWER

Add a fuller **Level Ladder** section.

This should be a vertically ordered list centered on current price:

### Above price

sorted nearest-to-farthest above current

### Current

current last price, spread, and optionally the active zone

### Below price

sorted nearest-to-farthest below current

For each level row show:

* price
* normalized level type
* distance from current price
* optional note/source
* optional compact importance badge if already available

The drawer is where the more complete logical map belongs.

## LEVEL NORMALIZATION

Create/extend a normalized level representation, e.g. something like:

* price
* label
* type
* direction (ABOVE / BELOW / AT_PRICE / UNKNOWN)
* source
* priority
* note
* distanceAbs
* distancePct
* clustered
* clusterId

Use naming consistent with the codebase.

Do not leave the UI dependent on raw free-text level strings.

## LEVEL TYPES

Normalize levels into trader-meaningful categories where possible.

Examples include:

* HOD
* PM_HIGH
* PM_LOW
* PRIOR_DAY_HIGH
* PRIOR_DAY_LOW
* PRIOR_DAY_CLOSE
* VWAP
* WHOLE_DOLLAR
* HALF_DOLLAR
* RESISTANCE
* SUPPORT
* RECLAIM
* BREAKOUT_TRIGGER
* HISTORICAL_RESISTANCE
* BLUE_SKY
* OTHER

Do not invent a type if the source does not support it.

Unknown type is acceptable.

## DATA SOURCES

Use whatever level information currently exists in the system, including:

* Sheet/research levels
* Demand Engine session high/low
* prior day close/high/low where already accessible or easy to derive from existing market data
* whole-dollar / half-dollar derived levels
* historical resistance already present in research if applicable

Do not build a full new technical-analysis engine in this task.

Use existing available facts first.

If some level types are not currently available, degrade gracefully.

## PRIORITIZATION

Not all levels are equally important.

Implement a sensible priority order for display.

Example idea:

For levels above price, prefer:

* session HOD
* PM high
* nearby research resistance / breakout trigger
* whole / half dollar
* prior day high
* historical resistance

For levels below price, prefer:

* nearby support / reclaim
* whole / half dollar
* VWAP
* prior day low / close
* session low / PM low

You do not need to use exactly this order, but it should be logical and stable.

## CLUSTERING

If multiple levels are very close, they should be grouped into a zone rather than displayed as redundant clutter.

Example:

6.48 HOD
6.50 half-dollar
6.52 research resistance

could become:

`6.48–6.52 resistance zone`

with small tags inside the drawer such as:

HOD · $0.50 · resistance

Use a sensible configurable threshold, probably based on absolute cents and/or a small % of price.

Do not over-cluster distinct levels that are meaningfully separated.

## CURRENT PRICE CONTEXT

In both table and drawer, current price should be visually central.

Show:

* last price
* spread when available
* optional mini note if price is sitting between two nearby levels

Example concept:

`Inside 6.00 support / 6.50 HOD`

You do not need elaborate charting.

## AIR POCKET / GAP TO NEXT LEVEL

If there is a large gap from current price to the next meaningful support below, or next resistance above, optionally surface this visually in the drawer as a compact note.

Examples:

* `Air pocket below to 5.50`
* `No nearby resistance until 7.00`

Do not call this flush risk or breakout prediction.

Just present the spacing logically.

## UI

Do not redesign the entire dashboard.

This is a focused visualization improvement.

The output should feel clean, readable, and consistent with the current visual language.

Avoid excessive color clutter.

Use existing badge/token styling where appropriate.

The layout should work on the current dark theme.

## SERVER-SIDE / VIEW MODEL

Move as much of the level parsing/normalization as practical into server/view-model code, not React presentation only.

The component should receive structured level data, not raw text that it must heavily parse in the browser.

## FALLBACK

If only raw research text exists for a ticker and proper normalization is incomplete:

* still try to parse what is reliable;
* show a reduced but structured display;
* never silently fabricate level meaning.

If no levels are available, show a clear empty state like:

`No key levels available`

rather than a blank area.

## ACCEPTANCE EXAMPLES

A trader should be able to answer at a glance:

* What is the next level above?
* What is the next important support below?
* How far is price from each?
* Are multiple nearby levels stacked into a zone?
* Is there open air above/below?

That must be true from the main table without opening the drawer, and more fully true inside the drawer.

## TESTS

Add tests for at least:

1. level normalization from existing structured data
2. raw text fallback parsing where applicable
3. above/below grouping
4. distance calculations
5. sorting nearest-to-farthest
6. whole/half-dollar derived levels
7. clustering nearby levels into zones
8. not clustering clearly distinct levels
9. current-price-centered output
10. fallback when no levels exist
11. preservation of historical resistance vs current/session level semantics
12. server-side view-model output for table
13. drawer ladder ordering
14. air-pocket note generation if implemented

## VALIDATION

Run:

* tests
* lint
* typecheck
* production build

Then manually inspect several tickers, including at least:

* a ticker with known research resistance/support
* a ticker with only session-derived levels
* a ticker with clustered nearby levels
* a ticker with sparse levels / air pocket
* a ticker with no usable levels

Report:

* files changed
* new level model/view model
* how levels are sourced
* clustering logic
* examples before/after
* tests/lint/typecheck/build status

Stop before commit.
