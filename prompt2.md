Continue development of the existing project:

`A:\mointel`

Repository:

`https://github.com/iamadamzc/mointel`

We are now connecting the Momentum Intelligence Trading Desk to **real Alpaca SIP market data**.

Do not rebuild the dashboard or discard working architecture.

First inspect the repository and determine exactly what is already implemented.

If the Local Live State Runtime / simulator milestone already exists, reuse and extend it.

If portions of that milestone are not yet implemented, implement the minimum missing runtime/state-store/event infrastructure necessary for this milestone rather than stopping to ask me.

## OBJECTIVE

Build the first real **Demand Engine** for the Momentum Intelligence Trading Desk.

The system should now operate approximately as:

`Alpaca SIP → Market Adapter → Demand Engine → Local State Store`

plus:

`Google Sheet → Research / Structural Intelligence`

then:

`Demand State + Research State → Dashboard`

The dashboard must update independently of ChatGPT.

Google Sheets remains the current source of catalyst, structure, Dirty Float, cycle, levels, warnings and deeper research.

Alpaca becomes the live source for market telemetry.

## CREDENTIALS

The user will place these directly in a text file in /mointel

```text
APCA_API_KEY_ID=
APCA_API_SECRET_KEY=
ALPACA_DATA_FEED=sip
```


Never echo the credentials.

Never expose them to browser JavaScript.

Never log them.

Ensure `.env.local` remains gitignored.

Do not commit secrets.

## ALPACA SOURCES

Use the official Alpaca APIs as the source of truth.

Real-time stock SIP WebSocket:

```text
wss://stream.data.alpaca.markets/v2/sip
```

Historical stock API:

```text
https://data.alpaca.markets/v2/stocks/...
```

Use:

```text
feed=sip
```

for stock historical data.

Use Alpaca's official authentication requirements.

Do not substitute IEX data silently.

If SIP authentication fails because the account does not have SIP entitlement, surface a clear error.

## ONE LONG-LIVED MARKET CONNECTION

Build **one persistent Alpaca SIP WebSocket worker**.

Do NOT:

* open WebSockets from the browser
* open one WebSocket per ticker
* open one WebSocket per API request
* reconnect unnecessarily
* create multiple competing SIP sessions

Provide a command such as:

```text
npm run market:alpaca
```

The intended local setup should ultimately be:

Terminal 1:

```text
npm run dev
```

Terminal 2:

```text
npm run market:alpaca
```

Retain the simulator as a separate test source.

## WEBSOCKET SUBSCRIPTIONS

Use the SIP stream strategically.

### Whole-market low-frequency discovery

Subscribe to:

```json
{
  "bars": ["*"],
  "updatedBars": ["*"],
  "statuses": ["*"]
}
```

If wildcard `updatedBars` or another channel is not supported by the current Alpaca API, verify the current official API behavior and implement the closest correct alternative.

Whole-market minute bars are the primary discovery input.

Do NOT subscribe to whole-market quotes or whole-market trades by default. That is unnecessary bandwidth for our use case.

### High-resolution relevant-name stream

Maintain a dynamic **high-resolution interest set** consisting of:

1. all current TODAY-sheet tickers;
2. the current top internal RVOL candidates;
3. any latched momentum names that qualified earlier in the session.

For this interest set, dynamically subscribe to:

* trades
* quotes
* LULD bands when supported

Use subscribe/unsubscribe diffs as the interest set changes.

Do not reconnect the WebSocket merely to change symbol subscriptions.

Default internal high-resolution candidate count:

```text
RVOL_INTERNAL_RANK=50
```

Default trader-facing discovery count:

```text
RVOL_DISCOVERY_RANK=12
```

Make both configurable.

## CONNECTION MANAGEMENT

Implement robust production-style connection behavior even though this runs locally.

Handle:

* authentication success/failure;
* subscription acknowledgement;
* disconnects;
* malformed messages;
* rate/subscription errors;
* Alpaca connection-limit errors;
* network interruption;
* clean shutdown.

Use exponential reconnect backoff with jitter and a sensible maximum.

Do not spin reconnect loops.

Expose connection state such as:

* CONNECTING
* CONNECTED
* AUTHENTICATED
* STREAMING
* DEGRADED
* DISCONNECTED
* ERROR

Record:

* last message time;
* last bar time;
* last quote time for relevant names;
* reconnect count;
* last error without secrets.

The dashboard should make feed failure obvious.

## ALPACA TEST STREAM

Because development may occur outside SIP trading hours, add a diagnostic command using Alpaca's official test stream:

```text
wss://stream.data.alpaca.markets/v2/test
```

using:

```text
FAKEPACA
```

Provide something like:

```text
npm run market:test
```

It should verify:

* WebSocket connection;
* authentication;
* subscription handling;
* parsing pipeline;
* state-store write.

This is diagnostics only.

It must not contaminate real market state unless explicitly running in test mode.

## MARKET SESSION MODEL

Use America/New_York and DST-aware date/time handling.

For this product define:

PREMARKET:

```text
04:00 ET – 09:30 ET
```

RTH:

```text
09:30 ET – 16:00 ET
```

AFTER HOURS:

```text
16:00 ET – 20:00 ET
```

SIP overnight data is not part of this milestone.

Treat the momentum trading date as the ET trading date.

Do not accidentally attach Sunday-night overnight prints to Monday SIP cumulative volume.

## DISCOVERY UNIVERSE

Our base discovery universe is approximately:

```text
$1 – $20
```

at the relevant point when the move is discovered.

Make these configurable:

```text
DISCOVERY_PRICE_MIN=1
DISCOVERY_PRICE_MAX=20
```

Do NOT impose a hard float cutoff.

Do NOT require a catalyst.

Do NOT require a fixed RVOL threshold.

Do NOT require a fixed percentage-gain threshold.

The primary discovery mechanism is **cross-sectional Daily RVOL rank**.

If a stock qualifies while inside the discovery range and subsequently trades above $20 because of the momentum move, **latch it for the remainder of the session**.

Do not make a super-runner disappear because price exceeded the initial discovery range.

Persist that session latch.

## EXACT DAILY RVOL DEFINITION

This definition comes from our completed backtesting and MUST NOT be replaced with a conventional time-of-day adjusted RVOL formula.

For each ticker:

```text
Daily RVOL =
current cumulative trading-day volume /
average full-session volume over the previous 20 eligible full trading sessions
```

The denominator is fixed for the entire current session.

Therefore Daily RVOL naturally rises as cumulative volume rises.

It is NOT:

* volume at this minute divided by average volume at the same minute;
* a rolling intraday relative-volume comparison;
* time-normalized expected volume;
* volume acceleration.

Those may become separate metrics later.

Do not change this definition.

## 20-SESSION BASELINE

Build and persist an RVOL baseline table.

For each ticker store at least:

* ticker;
* baseline date;
* previous close;
* average 20-session volume;
* number of valid sessions;
* underlying session dates if practical;
* data source;
* feed;
* adjustment method;
* calculatedAt.

Use Alpaca historical daily SIP bars.

Use **split-adjusted historical bars** for the baseline so reverse/forward splits do not make historical share-volume incomparable to the current share basis.

Use the API's split adjustment capability.

Exclude the current trading day.

Use the previous **20 eligible full trading sessions**, not 20 calendar days.

Use Alpaca's market calendar or another existing reliable calendar mechanism in the repository to identify normal full sessions and exclude early-close/partial sessions from this specific baseline.

Do not count:

* weekends;
* market holidays;
* the current incomplete session;
* zero/missing-volume pseudo-sessions;
* early-close sessions if they do not qualify as a full session.

If fewer than 20 valid full sessions exist:

store the available sample count.

Do not silently claim a 20-session baseline.

If the baseline is insufficient, expose:

```text
RVOL CONFIDENCE: LOW
```

or an equivalent normalized state.

## STARTUP / MID-SESSION RECONSTRUCTION

The worker must work correctly if launched at 7:00 AM, 8:45 AM, 11:00 AM, etc.

It cannot assume it has been running since 4:00 AM.

On startup:

1. determine current ET trading date/session;
2. load/persist the relevant stock universe;
3. ensure historical RVOL baselines exist;
4. obtain previous-close information;
5. retrieve today's historical SIP minute bars from 04:00 ET through startup time for relevant discovery-universe names;
6. reconstruct cumulative session volume;
7. reconstruct session high/low;
8. reconstruct latest price;
9. populate state;
10. then transition to the live WebSocket.

Do not start cumulative volume at zero merely because the application was launched late.

Use efficient batched historical requests and pagination.

Do not make one REST request per ticker when a multi-symbol request can be used.

Respect Alpaca rate-limit headers and use bounded concurrency/backoff.

Persist baselines so this historical bootstrap does not need to be unnecessarily repeated every restart.

## UNIVERSE BOOTSTRAP

Use a sensible Alpaca-provided U.S.-equity asset/universe mechanism when accessible with these credentials.

We primarily care about active U.S.-listed equities.

Do not include crypto or options.

Do not make OTC a default part of this universe unless explicitly configured later.

If the asset-list endpoint cannot be used with the current credential/account configuration:

do not fail the entire application.

Fall back to:

* existing Sheet tickers;
* symbols observed through wildcard SIP bars;
* lazy historical-baseline hydration as new symbols appear.

Clearly surface that discovery is running in a degraded universe mode.

## CURRENT CUMULATIVE VOLUME

For the current trading date, maintain cumulative SIP volume from:

```text
04:00 ET
```

forward through the current PRE/RTH/AH session.

Use minute bars as the canonical cumulative-volume input.

Handle `updatedBars`/late corrections so corrected minute volume does not get double-counted.

Do NOT increment cumulative volume blindly every time a bar update arrives.

Store bars keyed by:

```text
ticker + minute timestamp
```

and calculate/update cumulative volume correctly when a previously seen minute changes.

At the new trading date, reset session state appropriately.

## LIVE PRICE

For discovery names, minute-bar close is sufficient for whole-market ranking.

For names in the high-resolution interest set:

use the latest SIP trade for the high-frequency last-trade display.

Preserve trade timestamp and conditions/provenance.

Do not invent filtering rules for unusual trade conditions without documenting them.

Use minute-bar values as the more stable basis for deterministic aggregate calculations unless the calculation explicitly requires trade-level data.

## SESSION HIGH / LOW

Maintain:

* current session high;
* current session low.

Bootstrap them from current-day historical minute bars.

Update them from live bars.

For high-resolution names, trades may update the provisional live displayed high/low, but preserve the bar-derived canonical value separately if needed.

Do not allow an old/stale observation to overwrite a newer one.

## PREVIOUS CLOSE / PERCENT CHANGE

Use the prior eligible daily close from Alpaca SIP historical data.

Calculate:

```text
percentChange =
(price - previousClose) / previousClose * 100
```

Use the current canonical market price.

Store provenance.

Do not silently use a Sheet close when current Alpaca previous-close data is available.

If Alpaca previous close is unavailable, existing Sheet fallback behavior may remain, but mark the source.

## RVOL RANKING

Continuously maintain the cross-sectional Daily RVOL ranking of the eligible discovery universe.

Only rank names with a valid denominator.

Unknown RVOL must remain unknown.

Do not convert unknown to zero.

Rank descending by Daily RVOL.

Track at least:

```text
rvol
rvolRank
previousRvolRank
rvolRankChange
```

The main trader-facing discovery population is:

```text
Top 12 by Daily RVOL
```

But 12 is a configurable display/default threshold, not a permanent product law.

Internally retain at least the Top 50.

Do not delete other market state merely because a ticker falls outside Top 50.

## PRICE RANGE LATCH

If a stock qualifies for the discovery universe while its relevant price is between configured min/max:

store:

```text
qualifiedAt
qualifiedPrice
qualifiedRvol
qualifiedRank
```

If price later exceeds the maximum:

retain it.

Reset this latch on a new trading session unless another persisted rule explicitly says otherwise.

## DISPLAYED FLOAT TURNOVER

Where the structural/research layer contains a valid displayed float:

calculate:

```text
displayedFloatTurnover =
current cumulative session volume / displayed float
```

This is NOT Effective Float Turnover.

Name it explicitly:

```text
displayedFloatTurnover
```

Do not calculate it if float is:

* UNKNOWN;
* conflicting;
* invalid;
* zero;
* unavailable.

Do not infer clean float.

Do not modify Dirty Float classification based on turnover.

Dirty Float / overhang absorption will be a separate research engine.

## HIGH-RESOLUTION INTEREST SET

Maintain the union of:

```text
TODAY-sheet tickers
+
Top 50 Daily RVOL names
+
latched session candidates
```

Use that set for trade/quote subscriptions.

For quote data calculate when valid:

```text
spread = ask - bid
spreadPct = spread / midpoint * 100
```

Preserve:

* bid;
* bid size;
* ask;
* ask size;
* quote timestamp.

Do not interpret Level 1 spread as Level 2 liquidity.

## LULD

Capture Alpaca LULD information for relevant names when available.

Store:

* lower band;
* upper band;
* timestamp.

Display it in the ticker detail/current state.

Do not yet implement a predictive halt model.

Do not call the LULD band the guaranteed halt price.

## TRADING STATUS / HALTS

Consume Alpaca trading-status events.

Preserve the raw status/status code.

Normalize carefully into our existing halt-state model.

At minimum support:

* TRADING
* HALTED
* RESUMING / PENDING if source semantics allow it
* UNKNOWN

Do not guess.

Generate deterministic HALT and RESUME events only when an actual state transition is observed.

Later we will also connect Nasdaq/NYSE public halt feeds as a separate exchange-authoritative source.

## DEMAND ENGINE STATE

Create or extend normalized types representing:

```text
MarketObservation
MarketMinuteBar
RvolBaseline
DemandState
DiscoveryState
MarketFeedHealth
```

Use naming consistent with the existing codebase.

A ticker's DemandState should be capable of representing:

* ticker
* price
* price source
* previous close
* percent change
* cumulative session volume
* session high
* session low
* Daily RVOL
* RVOL rank
* RVOL rank change
* displayed float turnover
* bid
* ask
* spread
* spread %
* LULD bands
* halt state
* high-resolution subscription state
* qualified/latched state
* timestamps
* source provenance
* freshness

## PERSISTENCE

Reuse the existing SQLite/state abstraction if present.

Do not create a second competing state system.

Persist enough data for restart continuity.

At minimum persist:

* current ticker market state;
* minute bars needed for current-session reconstruction/corrections;
* RVOL baselines;
* discovery qualification/latch state;
* recent deterministic desk events;
* feed health where appropriate.

Bound historical minute-bar retention.

We are not building a permanent tick warehouse yet.

Document retention.

## DESK EVENTS

Reuse the existing DeskEvent architecture if present.

Generate deterministic events where source evidence is sufficient.

At minimum:

### NEW_HOD

When a genuine new session high is established.

Do not repeatedly emit the same HOD.

### HALT

On transition into halted status.

### RESUME

On transition out of halted status into trading.

### RVOL_RANK_ENTRY

When a ticker moves from outside the configured discovery rank to inside:

```text
Top 12
```

Example:

```text
08:17:00  XYZ  RVOL RANK ENTRY  Entered Top 12 at #9 — RVOL 23.4x
```

### DISCOVERY_QUALIFIED

When a ticker first satisfies the configured discovery-price universe and enters the tracked ranked population.

Do not generate noisy events every minute.

Deduplicate deterministically.

## DO NOT OVERSTATE SIGNALS

Daily RVOL rank means:

**abnormal participation deserves investigation.**

It does NOT mean:

* buy;
* good trade;
* clean structure;
* strong catalyst;
* frontside;
* continuation guaranteed.

Preserve this separation throughout naming/UI.

The system discovers demand.

The structural/research engine qualifies its implications.

## DASHBOARD — NEW DISCOVERY BOARD

Add a **DISCOVERY** section using real Alpaca data.

This should become one of the most prominent areas of the dashboard.

Display approximately:

```text
Rank
Ticker
Price
%
Daily RVOL
Rank Change
Volume
Float
Float Turnover
Cycle
Catalyst
Structure
Spread
Halt
```

Default:

Top 12 Daily RVOL.

Allow:

```text
Top 12
Top 25
Top 50
```

Do not remove the existing watchlist/research interface.

TODAY Sheet names and discovery names may overlap.

Merge them by ticker.

A discovery ticker without Sheet research should still appear, with research fields clearly showing:

```text
NOT YET ANALYZED
```

not UNKNOWN CLEAN or another fabricated classification.

## ACTIVE / ANALYZED DISTINCTION

A ticker being discovered by Alpaca does not imply that we have structural analysis.

Represent separately:

```text
DEMAND DETECTED
```

and:

```text
STRUCTURAL ANALYSIS AVAILABLE
```

This distinction is central to the product.

## HEADER FEED HEALTH

Show compact independent status for:

```text
MARKET: ALPACA SIP — LIVE
RESEARCH: GOOGLE SHEET — CURRENT
```

or corresponding stale/error states.

Show:

* Alpaca connection state;
* last SIP message age;
* market session;
* universe mode;
* last Google research sync.

Do not use one generic "LIVE" light that masks which source is stale.

## MARKET FRESHNESS

Use tighter freshness semantics than Google research data.

For high-resolution names:

if no expected market event has arrived recently during an active session, mark data stale.

Do not call the entire feed dead merely because a specific illiquid stock has not traded.

Feed health should use WebSocket connection/control activity and whole-market messages.

Ticker freshness should use that ticker's own market timestamps.

Separate those concepts.

## GOOGLE SHEET

Do not increase Google Sheet polling frequency.

It remains slow-changing research data.

Do not write Alpaca telemetry back into the Google Sheet.

The Sheet is NOT the live-state database.

## FALLBACK BEHAVIOR

If Alpaca is disconnected:

* preserve last known market state;
* mark it stale;
* continue displaying Google research;
* do not zero prices/volume/RVOL;
* attempt bounded reconnect.

If the live worker is not running:

the existing Sheet-only dashboard should still function.

If simulator mode is active:

make SIMULATOR visually unmistakable.

## PERFORMANCE

Whole-market bars can produce a meaningful stream.

Do not cause React rerenders for every raw incoming message.

The WebSocket worker should ingest/process server-side.

The browser should receive normalized state at an appropriate rate, roughly once per second for this local prototype.

Batch database writes when sensible.

Use SQLite WAL mode if appropriate for concurrent worker/dashboard access.

Do not prematurely introduce Kafka, Redis, RabbitMQ, Kubernetes or similar infrastructure.

## REST BOOTSTRAP EFFICIENCY

Use multi-symbol historical endpoints and pagination.

Avoid N requests for N symbols.

Handle Alpaca's returned page tokens correctly.

Respect HTTP 429 responses and rate-limit headers.

Cache/persist historical baseline data.

Only refresh the 20-session baseline when a new completed trading session makes it necessary or when data is explicitly invalidated.

## DATA PROVENANCE

For derived metrics retain enough metadata to answer:

* Which feed?
* What timestamp?
* Which source bars?
* Raw or split-adjusted?
* How many baseline sessions?
* When was baseline calculated?
* Is this live or stale?
* Was this value directly supplied or derived?

This is especially important for future backtesting.

## TESTS

Add meaningful automated tests.

At minimum test:

1. SIP message parsing.
2. malformed SIP messages do not crash worker.
3. minute bar volume accumulates correctly.
4. updated bar replaces prior minute rather than double-counting.
5. previous-close calculation.
6. exact Daily RVOL formula.
7. Daily RVOL is NOT time-of-day normalized.
8. baseline excludes current session.
9. fewer than 20 valid sessions reports reduced confidence/sample.
10. split-adjusted baseline is requested/configured.
11. unknown baseline produces unknown RVOL, not zero.
12. correct descending RVOL ranking.
13. rank-change calculation.
14. Top-12 entry generates one event.
15. leaving/re-entering Top 12 behaves according to documented event-dedup rules.
16. price-range qualification latches.
17. qualified stock remains tracked above $20.
18. session reset clears the appropriate latch.
19. displayed float turnover calculation.
20. UNKNOWN float does not calculate turnover.
21. Dirty Float classification cannot be overwritten by Alpaca state.
22. quote spread calculation.
23. invalid/crossed/missing quote handling is safe.
24. stale market observations cannot overwrite newer ones.
25. HOD event deduplication.
26. halt transition.
27. resume transition.
28. reconnect state handling.
29. startup mid-session reconstructs cumulative volume.
30. historical page-token pagination.
31. simulator still works.
32. Sheet-only dashboard still works without market worker.
33. Alpaca credentials never enter client bundle.
34. secrets are not logged.

## DIAGNOSTICS

Create a useful diagnostic command such as:

```text
npm run market:diagnose
```

It should report WITHOUT revealing credentials:

```text
Credentials: present
SIP authentication: OK
Historical SIP access: OK
WebSocket: OK
Subscription: OK
SQLite/state store: OK
Google research provider: OK
```

If run outside SIP session hours, it should distinguish:

```text
connection/auth successful but no live SIP prints expected now
```

from an actual failure.

## OBSERVABILITY

Log concise operational information.

Examples:

```text
[alpaca] connected
[alpaca] authenticated SIP
[alpaca] whole-market bars subscribed
[demand] 3,842 baselines loaded
[demand] startup backfill complete through 07:02:00 ET
[demand] discovery ranks calculated: 1,912 eligible
[alpaca] high-res interest set: 47 symbols
```

Do not spew every trade or quote to the console.

Provide a debug mode for detailed logs if needed.

## DOCUMENTATION

Update README and architecture docs.

Document the actual live architecture clearly:

```text
                         ┌─ Google Sheets → Research/Structure ─┐
                         │                                      │
Alpaca SIP → Demand Engine → Local State → State Merge → Dashboard
                         │
                         └─ Desk Events / Discovery
```

Document:

* how credentials are configured;
* how to run the dashboard;
* how to run Alpaca;
* how to run simulator;
* how to run diagnostic mode;
* Daily RVOL definition;
* 20-session baseline;
* discovery universe;
* Top-12 ranking;
* Top-50 high-resolution set;
* price latching;
* market-session semantics;
* known prototype limitations.

## DO NOT IMPLEMENT YET

Do NOT add:

* OpenAI API analysis;
* automated SEC research;
* company IR scraping;
* newswire scraping;
* Dirty Float reclassification;
* overhang absorption conclusions;
* Effective Float Turnover;
* automated Chop Risk;
* automated Flush Risk;
* buy/sell signals;
* order execution;
* broker order integration;
* Level 2;
* Time & Sales UI;
* customer accounts;
* billing.

Alpaca is being used only as a market-data source in this milestone.

## SECURITY AUDIT

Before committing, confirm none of the following are in Git:

* `.env.local`;
* APCA key;
* APCA secret;
* Google private key;
* service-account JSON;
* SQLite database;
* local logs containing credentials.

Search the Git history/current tracked files where practical.

Do not commit anything containing secrets.

## VALIDATION

Run all project tests.

Run:

```text
npm run lint
```

Run:

```text
npm run build
```

Fix failures before completion.

Then manually validate:

### Mode 1

Google Sheet only.

### Mode 2

Google Sheet + simulator.

### Mode 3

Google Sheet + Alpaca SIP.

### Mode 4

Alpaca diagnostic/test-stream path outside live SIP hours.

Verify that live Alpaca data never writes to Google Sheets.

## DEFINITION OF DONE

Do not stop after scaffolding.

This milestone is complete when:

1. Alpaca SIP authentication works.
2. Exactly one long-lived market WebSocket is used.
3. Whole-market minute bars are consumed.
4. High-resolution relevant-name trades/quotes work.
5. startup mid-session reconstruction works.
6. 20-session Daily RVOL baselines work.
7. split adjustments are accounted for.
8. Daily RVOL calculates using our exact backtested definition.
9. cross-sectional RVOL ranking works.
10. Top-12 Discovery Board works.
11. Top-50 internal interest set works.
12. price-range latching works.
13. cumulative session volume works.
14. percent change works.
15. session HOD/LOD works.
16. displayed float turnover works where valid.
17. spread works where valid.
18. halt/status data works.
19. LULD data is retained where available.
20. deterministic Desk Events work.
21. market-feed health is visible.
22. Google research remains independently usable.
23. simulator still works.
24. test-stream/diagnostic mode works.
25. tests pass.
26. TypeScript passes.
27. lint passes.
28. production build passes.
29. no secret is committed.
30. changes are pushed to `main`.

When finished, give me:

* commit hash;
* exact architecture implemented;
* tables/state added;
* Alpaca channels actually subscribed;
* number of symbols successfully baselined;
* number of eligible symbols ranked;
* whether SIP entitlement was verified;
* startup-backfill results;
* exact Daily RVOL calculation used;
* any discrepancies found between Alpaca data and the existing Sheet;
* test results;
* lint/build results;
* exact commands to start everything tomorrow morning;
* any implementation choice that materially differed from this specification and why.

Do not make product-strategy decisions on your own. If a source/API limitation forces a material change, implement the safest reversible approach and flag it in the completion report.
