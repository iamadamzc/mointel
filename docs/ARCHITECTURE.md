# Architecture

How the desk is put together, and where each planned subsystem attaches. Nothing in the "future" sections is implemented; they are recorded so the current seams stay in the right places.

---

## 1. Current shape

```
                         ┌─ Google Sheets → Research / Structure ─┐
                         │                                        │
Alpaca SIP → Demand Engine → Local State (SQLite) → State Merge → Dashboard
                         │
                         └─ Desk Events / Discovery
```

Two processes, one shared local store:

```
┌──────────────────────── worker process (npm run market:alpaca) ──────────────────────┐
│ worker/alpaca.ts        entry point: bootstrap, then stream                           │
│ worker/runtime.ts       session resolution, universe, baselines, backfill, flush loop │
│   lib/market/alpaca/stream.ts   ONE websocket, auth + subscription diffs + backoff    │
│   lib/market/alpaca/rest.ts     multi-symbol REST, pagination, 429 backoff            │
│   lib/market/alpaca/messages.ts total message parsing (never throws)                  │
│   lib/market/engine.ts          DemandEngine: state, RVOL, ranking, latch, events     │
│   lib/market/rvol.ts            the exact Daily RVOL definition + baselines + ranking │
│   lib/market/derive.ts          percent change, spread, displayed float turnover      │
│   lib/market/session.ts         ET session model, DST-aware, no date library          │
│   lib/market/store/{db,repo}.ts SQLite schema and every SQL statement                 │
└───────────────────────────────────────┬──────────────────────────────────────────────┘
                                        │ SQLite (WAL): worker writes, web reads
┌───────────────────────────────────────▼──────────────────────────────────────────────┐
│ Next.js process (npm run dev)                                                         │
│   app/api/market/route.ts     → lib/market/readModel.ts  (read-only connection)       │
│   app/api/dashboard/route.ts  → lib/data/*               (Google Sheets, 10s cache)   │
│   components/DashboardShell   → lib/dashboard/merge.ts   (demand + research)          │
│     DiscoveryBoard · DeskEventFeed · PrimaryFocus · MomentumTable · TickerDrawer       │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Semantic invariants

Three distinctions are load-bearing enough that they have their own modules and tests:

1. **Reference close ≠ previous close.** `lib/market/derive.ts::resolveReferenceRthClose` picks the prior session's 16:00 ET close during premarket and RTH, and the current day's close after 16:00. Alpaca's 1Day bar close was verified against minute bars to be the official closing-auction print (full-session volume, regular-session OHLC), so it is the source; minute bars would miss the auction.
2. **Ranked universe ≠ Alpaca `us_equity`.** `lib/market/securities.ts` classifies every asset and only `COMMON_EQUITY`, `ADR_ADS` and `UNKNOWN` may be ranked. Ineligible instruments are still tracked and viewable.
3. **Current-cycle high ≠ historical resistance.** `lib/data/cycleLevels.ts` classifies each sheet level and only computes a giveback from an affirmatively current-cycle high.

### Layer rules

1. **The UI depends on types, never on a source.** Components import from `lib/data/types.ts` and `lib/market/types.ts`. No component knows a column letter, an Alpaca payload shape, or that SQLite exists.
2. **One long-lived market connection.** `AlpacaStream` is instantiated once per worker. Interest changes are subscribe/unsubscribe diffs; the socket is never recycled to change symbols.
3. **Credentials are worker-only.** `lib/market/credentials.ts` is never imported by anything under `app/`, `components/` or `lib/hooks`, and a test enforces that. The Next.js process reads SQLite and nothing else.
4. **One state system.** SQLite is the only persistence. Do not add a second.
5. **Unknown stays unknown.** No unknown value becomes zero; no classification is asserted that a source did not state.
6. **Demand ≠ analysis.** `DemandState` carries no structure, catalyst or cycle fields. The merge layer joins them without collapsing them.

### The demand pipeline

```
wildcard bars (whole market)
        │  price inside $1–$20 and baseline known?
        ├── no  → dropped (or queued for lazy baseline hydration)
        └── yes → DemandEngine.ingest
                    minute_volumes[symbol][ts] = volume   (upsert, so corrections replace)
                    cumulative = volumeBase + Σ minute_volumes
                    sessionHigh/Low, price (newest timestamp wins)
                          │
                    every 1s: recompute()
                          rvol = cumulative ÷ baseline.averageVolume
                          rank = descending cross-sectional sort
                          latch, high-res selection, desk events
                          │
                    flush(): upsert dirty rows, write health, publish high-res diff
```

`trades`, `quotes`, `statuses` and `lulds` update price, spread, halt state and LULD bands for the high-resolution set. Trades never increment cumulative volume — minute bars are the canonical volume input, which is what makes `updatedBars` corrections safe.

### Caching and freshness

- **Research**: `lib/data/index.ts` holds a 10s cache with single-flight refresh and a last-good-data stale fallback. The browser polls `/api/dashboard` every 4s.
- **Market**: the worker flushes every 1s; the browser polls `/api/market` every 1s. Worker heartbeat older than `MARKET_HEARTBEAT_STALE_MS` marks the feed stale; 4× that marks it offline.
- **Ticker freshness** is computed per ticker from its own last market event, never from the connection state.

---

## 2. Where future subsystems attach

### Replacing the research store (PostgreSQL or a service)

Write `lib/data/providers/postgres.ts` implementing `DashboardDataProvider` and add it to the selection logic in `lib/data/index.ts`. Nothing else changes.

### Replacing the market store

`lib/market/store/repo.ts` is the only module with SQL. A different store implements the same functions. The read model (`lib/market/readModel.ts`) and the worker are the only callers.

### RVOL ranking engine extensions, float turnover, momentum acceleration

These are computations over normalized state, not new sources, and belong beside `lib/market/rvol.ts` and `lib/market/derive.ts`:

- Add optional fields to `DemandState` so the UI renders them when present.
- Each derived metric must carry its own confidence state. Effective Float Turnover in particular is **not** `displayedFloatTurnover`: it needs a supply-adjusted denominator from the structural engine, and must not be inferred from a vendor float.

### Halt prediction, Chop Risk, Flush Risk, Live Confirmation

Stateful classifications that change during a session, so they need history the current store deliberately bounds:

- Extend retention or add a session-snapshot table.
- Add a `stateChanges` collection to the market payload and a change-log strip in `TickerDrawer`.
- `HaltState`, `StructureState` and `CycleState` are closed unions precisely so transitions are expressible.

### Exchange-authoritative halt feeds

Nasdaq/NYSE public halt feeds become a second observation source feeding `DemandEngine.applyHaltTransition`, with source precedence recorded on the event. The normalization seam already exists in `lib/market/alpaca/messages.ts::normalizeHaltState`.

### Event-driven OpenAI analysis

- New server module `lib/intelligence/` with an explicit trigger surface (structure change, new filing, cycle transition, halt).
- Runs in the worker or a sibling process, writes results into the store, and surfaces through the same payload — the UI must never call a model provider directly.
- Outputs must be attributed and timestamped so a generated read is visually distinguishable from a human analyst note.

### Dirty Float reclassification and overhang absorption

Explicitly out of scope here. `displayedFloatTurnover` is computed from the *displayed* float and must never feed back into structure classification; a test enforces that Alpaca state cannot overwrite a Dirty Float classification.

### Live commentary feed and historical dossiers

`RESEARCH` already carries `Report Date`, and `selectLatestResearch()` in `lib/data/rows.ts` is the single place that decides which record wins — keeping every record is a change to that function plus a date selector in the dossier.

### Multi-user broadcast distribution

The worker's flush is already the single fan-out point. Broadcasting means promoting the local store to a shared one and pushing updates to subscribers instead of answering polls. Authentication and per-user watchlists sit in front of `/api/dashboard` and `/api/market`, which stay the only client contracts.

---

## 3. Data model

| Table | Purpose | Retention |
| --- | --- | --- |
| `rvol_baseline` | Fixed RVOL denominator per symbol with full provenance | Rebuilt when a new completed session makes it stale |
| `minute_bars` | Canonical cumulative-volume input, keyed `symbol + ts` | Last 3 trading dates, tracked symbols only |
| `ticker_session` | Per-symbol session state, one row per symbol per trading date | Current session |
| `desk_events` | Deterministic events, unique by `dedupe_key` | Current session |
| `feed_health` | Single-row worker health payload | Latest only |
| `universe` | Cached tradable asset list | Refreshed roughly daily |
| `meta` | Trading date, session phase, discovery summary, owning market mode | Latest only |

---

## 4. Deliberate non-goals in this milestone

OpenAI analysis, automated SEC research, IR/newswire scraping, Dirty Float reclassification, overhang absorption conclusions, Effective Float Turnover, automated Chop/Flush Risk, buy/sell signals, order execution, broker integration, Level 2, Time & Sales UI, customer accounts and billing are all out of scope. Alpaca is used strictly as a market-data source, and the Google Sheet remains strictly read-only.
