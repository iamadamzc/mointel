# Momentum Intelligence Trading Desk

A local, dark, institutional-style intelligence desk for U.S. small-cap momentum traders.

It is not a stock scanner and not a trading platform. It answers a specific set of questions at a glance:

- What stocks currently matter?
- Why are they moving?
- Where are they in the momentum cycle?
- What does the share structure actually look like?
- Is the displayed float trustworthy?
- Is there dilution, resale supply, warrants, convertibles, PIPEs, ATMs, or reverse-split distortion?
- What are the major levels and warnings?

Two independent engines answer different halves of that:

- **Demand** comes from Alpaca SIP market data. It discovers *what the market is doing*.
- **Research** comes from the Google Sheet. It explains *what that means structurally*.

Those are deliberately never merged into a single verdict. A ticker can have **DEMAND DETECTED** with no **STRUCTURAL ANALYSIS AVAILABLE**, and the desk says exactly that.

---

## Architecture

```
                         ┌─ Google Sheets → Research / Structure ─┐
                         │                                        │
Alpaca SIP → Demand Engine → Local State (SQLite) → State Merge → Dashboard
                         │
                         └─ Desk Events / Discovery
```

Concretely:

```
worker (npm run market:alpaca)              Next.js (npm run dev)
┌──────────────────────────────┐            ┌────────────────────────────┐
│ ONE Alpaca SIP WebSocket     │            │ /api/dashboard  (research) │
│  bars:*  updatedBars:*       │            │ /api/market     (demand)   │
│  statuses:*                  │            │                            │
│  trades/quotes/lulds: Top-50 │            │ DashboardShell             │
│         ↓                    │            │   mergeDesk(research,      │
│ DemandEngine                 │            │             demand)        │
│   cumulative volume          │  SQLite    │   DiscoveryBoard           │
│   Daily RVOL + ranking       │  (WAL)     │   DeskEventFeed            │
│   discovery latch            │ ─────────▶ │   PrimaryFocus / Watchlist │
│   desk events                │            │   TickerDrawer             │
│         ↓                    │            │                            │
│ flush every 1s               │            │ polls /api/market every 1s │
└──────────────────────────────┘            └────────────────────────────┘
```

Rules the codebase holds to:

- **One long-lived market connection.** Never one socket per ticker, per request, or in the browser. Symbol interest changes are subscribe/unsubscribe diffs on the open socket.
- **The browser never talks to Alpaca or Google.** It only calls `/api/dashboard` and `/api/market`.
- **Alpaca credentials never enter the web process.** Only the worker loads them; Next.js just reads the local SQLite store.
- **Nothing is written back to Google Sheets.** The sheet is read-only research, not the live-state database.
- **Unknown stays unknown.** No unknown value is ever coerced to zero, and no classification is asserted that the source did not state.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for module-level detail and future integration points.

---

## Running it

Requirements: Node.js 20+ (developed on 22), npm.

```bash
npm install
```

**Terminal 1 — the dashboard**

```bash
npm run dev            # http://localhost:3000
```

**Terminal 2 — the market feed**

```bash
npm run market:alpaca  # one long-lived Alpaca SIP connection
```

Both are needed for live demand data. The dashboard runs perfectly well on its own — it just shows research with `MARKET: WORKER OFFLINE`.

### All commands

| Command | What it does |
| --- | --- |
| `npm run dev` | The dashboard on http://localhost:3000 |
| `npm run market:alpaca` | The live SIP worker: bootstrap, then stream |
| `npm run market:sim` | Deterministic simulator (no Alpaca, no market hours needed) |
| `npm run market:test` | Alpaca official test stream (FAKEPACA) diagnostics |
| `npm run market:diagnose` | Reports credentials, SIP auth, REST, WebSocket, store and research health |
| `npm run market:baseline` | Pre-builds the 20-session RVOL baselines and exits |
| `npm run assessments` | The scheduled desk assessments (06:10 … 22:00); part of `npm run desk` |
| `npm test` | Vitest suite |
| `npm run lint` / `npm run typecheck` / `npm run build` | Quality gates |

### Typical trading morning

```bash
# Terminal 1
npm run dev

# Terminal 2 (any time from 04:00 ET; it reconstructs the session if you start late)
npm run market:alpaca
```

Optionally run `npm run market:baseline` before the open so the first start is instant, and `npm run market:diagnose` if anything looks wrong.

---

## Credentials

### Alpaca

The worker accepts credentials from either source, in this order:

1. `APCA_API_KEY_ID` / `APCA_API_SECRET_KEY` (plus optional `ALPACA_DATA_FEED=sip`) in `.env.local`.
2. Any root-level `.txt` / `.env*` file containing them. Both `KEY=VALUE` lines and the bare two-token layout Alpaca's key dialog produces are accepted.

Credentials are sent only as request headers and websocket auth frames. They are never logged, never written back to disk, and never reach the browser — the Next.js process does not load them at all. Every Alpaca error message is passed through a redactor before it is logged or persisted.

Root-level `*.txt` files are gitignored, as are `.env*`, the SQLite store, and the Google service-account JSON.

**SIP is not silently downgraded.** If the account lacks SIP entitlement, the worker surfaces a fatal, explicit error (Alpaca code 408/409) and reports `SIP not entitled` in the header rather than quietly falling back to IEX.

### Google Sheets

Unchanged from the previous milestone: copy `.env.example` to `.env.local` and fill in `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` (one line, `\n`-escaped, in double quotes), then share the sheet with the service-account address as Viewer.

1. Create or choose a Google Cloud project.
2. Enable the Google Sheets API.
3. Create service-account credentials and download the JSON key.
4. Put `client_email` and `private_key` into `.env.local`.
5. Share the Trading Desk spreadsheet with that address as **Viewer**.
6. Restart the app.

---

## Daily RVOL — the exact definition

```
Daily RVOL = current cumulative trading-day volume
           ÷ average full-session volume over the previous 20 eligible full trading sessions
```

The denominator is **fixed for the entire session**, so Daily RVOL rises naturally as cumulative volume accumulates.

It is explicitly **not**:

- volume at this minute ÷ average volume at the same minute
- a rolling intraday relative-volume comparison
- time-normalized expected volume
- volume acceleration

This comes from completed backtesting and must not be replaced. `lib/market/rvol.ts` is the only implementation, and `tests/market/rvol.test.ts` asserts the definition, including an explicit test that it is not time-of-day normalized.

**Unknown denominator ⇒ unknown RVOL.** A ticker with no usable baseline is not ranked at all; it is never treated as a zero.

### The 20-session baseline

Built from Alpaca **split-adjusted** daily SIP bars so a reverse split cannot make historical share volume incomparable to today's share basis.

Excluded from the average: the current (incomplete) session, weekends, holidays, zero/missing-volume pseudo-sessions, and early-close sessions (identified from Alpaca's market calendar, where `close != 16:00`).

Stored per symbol with full provenance: baseline date, previous close and its date, average volume, session count, target session count, the session dates used, data source, feed, adjustment method, and calculation timestamp.

If fewer than 20 eligible sessions exist, the real sample size is stored and the ticker reports **RVOL CONFIDENCE: LOW** — the desk never claims a 20-session baseline it does not have. (At the last build: 12,323 symbols at full confidence, 737 reduced-sample.)

Previous close is the most recent prior session's close, including a half day, because that genuinely is the last print of the prior session — even though half days are excluded from the *average*.

---

## Percent change and the reference close

Percent change is measured against the most recent **relevant official regular-session close**, not simply "yesterday":

| Session phase | Reference close |
| --- | --- |
| PREMARKET 04:00–09:30 ET | the **prior** session's 16:00 ET close |
| RTH 09:30–16:00 ET | the **prior** session's 16:00 ET close |
| AFTER HOURS 16:00–20:00 ET | the **current** day's 16:00 ET close |

```
percentChange = (currentPrice - referenceRthClose) / referenceRthClose * 100
```

So Monday 07:00 ET compares against Friday's close, and Friday 18:00 ET compares against Friday's own close rather than Thursday's. The switch happens exactly at the closing bell; before 16:00 the day has no close of its own, so the prior session is used regardless of the clock. With no usable reference, percent change stays **unknown** rather than falling back to something misleading.

Every ticker carries `referenceRthClose`, `referenceRthCloseDate`, `referenceRthCloseSource` and `referenceRthCloseBasis` (`PRIOR_SESSION` / `CURRENT_SESSION`). The prior session's close is retained separately as `previousClose` for audit.

**Source.** Alpaca's 1Day bar close, verified against minute bars to be the official closing-auction print and *not* the 20:00 ET extended-hours last trade. Alpaca's daily bar carries full-session **volume** but regular-session **OHLC** — on 2026-08-14 FIEE's daily close was $5.00 (the RTH close) while it traded to $6.22 after hours, and for WETO the daily close of $8.22 matched the closing auction where the last minute bar did not. Deriving the close from minute bars would therefore be *less* accurate, so the daily bar is used deliberately rather than by default.

A worker running across 16:00 ET captures the day's official close with a single snapshot pass a couple of minutes after the bell, then flips every tracked ticker's reference to the current session.

## Discovery

**Universe.** Active, tradable US equities from Alpaca's asset list (NYSE / NASDAQ / ARCA / AMEX / BATS). No crypto, no options, no OTC by default. If the asset endpoint is unavailable the worker degrades to sheet tickers plus symbols seen on the wildcard bar stream, and the header shows `UNIVERSE: DEGRADED`.

**Security classification.** Alpaca's `us_equity` class mixes operating-company stock with preferred series, warrants, rights, units, ETFs, ETNs and closed-end funds. Every asset is classified before it can be ranked:

| Class | Ranked in Discovery |
| --- | --- |
| `COMMON_EQUITY`, `ADR_ADS`, `UNKNOWN` | yes |
| `PREFERRED`, `WARRANT`, `RIGHT`, `UNIT`, `ETF_ETP`, `FUND`, `OTHER` | no |

Foreign issuers and ADRs are explicitly kept — only instrument *type* excludes a name, never its domicile. `UNKNOWN` stays eligible, because absence of evidence is not evidence that something is a non-common instrument. Each decision records its classification, confidence and the rule that produced it, and ineligible instruments are still tracked and still viewable — they simply do not compete for a rank.

Evidence is read from the issuer name, the symbol suffix convention and the listing venue, in that order. ADR wording is tested before warrant/right/unit because ADS descriptions routinely contain those words in prose ("each representing the right to receive one Class A ordinary share"), and warrant/right/unit patterns are anchored to the instrument-designation position at the end of the name.

Bumping `CLASSIFIER_VERSION` in `lib/market/securities.ts` re-classifies the cached universe on the next worker start.

**Price range.** `$1–$20` at the moment of discovery, configurable via `DISCOVERY_PRICE_MIN` / `DISCOVERY_PRICE_MAX`. There is deliberately no float cutoff, no catalyst requirement, no fixed RVOL threshold and no fixed percentage-gain threshold.

**Ranking.** Cross-sectional Daily RVOL rank, descending, recomputed every second. `rvol`, `rvolRank`, `previousRvolRank` and `rvolRankChange` are all tracked (rank change is positive when a ticker climbs).

**Top 12 / Top 50.** The trader-facing discovery population defaults to the Top 12 (`RVOL_DISCOVERY_RANK`), switchable to Top 25 / Top 50 in the UI. Internally the Top 50 (`RVOL_INTERNAL_RANK`) is retained and streamed at high resolution. Falling outside the Top 50 does not delete a ticker's market state.

**Price-range latch.** When a ticker first qualifies inside the price range, the desk stores `qualifiedAt`, `qualifiedPrice`, `qualifiedRvol` and `qualifiedRank` and latches it for the rest of the session. A super-runner that trades through $20 stays ranked and visible. The latch resets on a new trading session.

**High-resolution interest set** = TODAY-sheet tickers ∪ Top 50 Daily RVOL ∪ latched session candidates, capped at 250 symbols. These get `trades`, `quotes` and `lulds` subscriptions; the rest of the market is covered by wildcard minute bars only. Whole-market quotes and trades are deliberately never subscribed.

---

## Momentum-cycle levels vs historical resistance

A 52-week high, an old run high, or any other historical resistance is **not** the current momentum-cycle high, and the distance to it is **not** a current giveback.

The sheet mixes both meanings in the same columns — FIEE carries `Recent Cycle High = $10.59 (52-week proxy)` — so every level cell is classified before it is displayed:

- **`currentCycleHigh`** — only populated on affirmative evidence that the level belongs to the move happening now. `givebackFromCurrentCycleHighPct` is computed from it and from nothing else.
- **`historicalResistance`** — 52-week highs, prior run highs, all-time highs, anything annotated as a proxy. Displayed with its label and its raw sheet text.
- **`unverifiedRunHigh`** — a level with no evidence either way, shown as exactly that rather than promoted.

An unlabelled level that matches one the sheet annotates as historical elsewhere (or that the sheet narrative describes as a 52-week high at the same price) inherits the historical classification. The sheet's own `Flush From High %` is preserved for audit alongside the level it was measured from, and is never presented as a current-cycle giveback when that basis is historical.

The live Alpaca session high is shown separately in the Demand section. It is deliberately **not** equated with a multi-day momentum-cycle high.

## Market session semantics

America/New_York, DST-aware, with no date library.

| Phase | Window |
| --- | --- |
| PREMARKET | 04:00–09:30 ET |
| RTH | 09:30–16:00 ET |
| AFTER HOURS | 16:00–20:00 ET |

The momentum trading date is the ET trading date. Observations outside `04:00–20:00 ET` of the current trading date are rejected, which is what stops Sunday-night prints from landing in Monday's cumulative volume. Outside market hours the desk rolls forward to the next scheduled session rather than replaying the previous one. SIP overnight data is out of scope for this milestone.

### Startup / mid-session reconstruction

The worker is correct whether it starts at 04:00, 07:00, 08:45 or 11:00. On startup it:

1. resolves the ET trading date and session phase from Alpaca's market calendar,
2. loads or builds the RVOL baselines (persisted, so restarts are instant),
3. reads multi-symbol **snapshots** to rebuild cumulative volume, previous close, session high/low and last price for the whole candidate band,
4. reads true **minute bars** from 04:00 ET for the focused set, so late corrections and precise high/low work where it matters,
5. writes state, then transitions to the live WebSocket.

Alpaca daily bars were verified to carry full 04:00–20:00 session volume (matched against minute-bar sums to within 0.4%), which is what makes the snapshot bootstrap correct and cheap. Cumulative volume for the focused set is derived purely from minute bars keyed by `symbol + minute`, so an `updatedBars` correction **replaces** that minute rather than being added to it.

Reconstructed highs are marked as already-established, so restarting mid-session does not replay the morning's highs as fresh `NEW_HOD` events.

---

## Desk events

Deterministic, evidence-backed, and deduplicated in SQLite by a stable key. They describe observed market facts only.

| Event | Fires when | Dedup rule |
| --- | --- | --- |
| `NEW_HOD` | A previously established session high is genuinely exceeded | Once per 60s per symbol, keyed by the high value; the first high of the session (and any backfilled high) is not an event |
| `HALT` | Trading status transitions into halted | Keyed by symbol + status timestamp |
| `RESUME` | Trading status transitions out of halted | Keyed by symbol + status timestamp |
| `RVOL_RANK_ENTRY` | A ticker enters the Top 12 from outside it | Once per entry episode; re-entry only counts after 5 minutes outside |
| `DISCOVERY_QUALIFIED` | A ticker first satisfies the price universe and enters the ranked population | Once per symbol per trading date |

**Rank means abnormal participation deserves investigation.** It does not mean buy, good trade, clean structure, strong catalyst, frontside, or continuation. That separation is preserved in naming and in the UI.

---

## Feed health and freshness

The header reports the two sources **independently** — there is no single "LIVE" light that could hide which one is stale:

```
MARKET: ALPACA SIP — LIVE     RESEARCH: GOOGLE SHEET — CURRENT
```

Market status also shows session phase, last message age, high-resolution symbol count, reconnect count and universe mode. Connection state moves through `CONNECTING → CONNECTED → AUTHENTICATED → STREAMING`, with `DEGRADED`, `DISCONNECTED` and `ERROR` surfaced explicitly.

Feed health and ticker freshness are separate concepts: feed health comes from connection and whole-market activity, while a ticker is marked quiet from *its own* timestamps. One illiquid stock not printing never marks the whole feed dead.

If Alpaca disconnects, the last known market state is preserved and marked stale — prices, volume and RVOL are never zeroed — and the worker reconnects with exponential backoff plus jitter, capped at 30s.

---

## Modes

| Mode | Command | How it looks |
| --- | --- | --- |
| Sheet only | `npm run dev` | `MARKET: WORKER OFFLINE`, research unaffected |
| Sheet + simulator | `+ npm run market:sim` | Amber `SIMULATOR` chip and a full-width banner: synthetic values, must not be traded |
| Sheet + Alpaca SIP | `+ npm run market:alpaca` | `MARKET: ALPACA SIP — LIVE` |
| Test stream | `npm run market:test` | FAKEPACA diagnostics, written to a separate `data/market-test.db` |

The state store records which mode owns it. Switching modes clears session state so simulated or test prints can never be mistaken for real market data. Baselines built from real historical data survive a simulator run; synthetic baselines do not survive a return to live.

---

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `RVOL_DISCOVERY_RANK` | `12` | Trader-facing discovery population size |
| `RVOL_INTERNAL_RANK` | `50` | Internal high-resolution candidate count |
| `DISCOVERY_PRICE_MIN` / `MAX` | `1` / `20` | Discovery price universe |
| `RVOL_BASELINE_SESSIONS` | `20` | Target baseline sessions |
| `MARKET_DB_PATH` | `data/market.db` | Local state store |
| `MARKET_CLIENT_POLL_MS` | `1000` | Browser market poll cadence |
| `MARKET_FLUSH_INTERVAL_MS` | `1000` | Worker flush/recompute cadence |
| `MARKET_HEARTBEAT_STALE_MS` | `15000` | Worker heartbeat staleness threshold |
| `MARKET_TICKER_STALE_SECONDS` | `300` | Per-ticker quiet threshold during an active session |
| `MARKET_MINUTE_BAR_RETENTION_DAYS` | `3` | Minute-bar retention |
| `ALPACA_REST_BATCH_SIZE` / `_CONCURRENCY` | `200` / `4` | Multi-symbol request sizing |
| `ALPACA_DEBUG` | `0` | Verbose worker logging |
| `DEMAND_TRADING_DATE_OVERRIDE` | unset | **Diagnostics only.** Forces a trading date so a completed session can be reconstructed outside market hours |

---

## Data retention

The local store keeps: RVOL baselines (one row per symbol), per-symbol session state for the current trading date, minute bars for the last 3 trading dates for tracked symbols only, desk events, feed health, and the cached asset universe.

Minute bars for untracked whole-market symbols are **not** persisted. This is a live desk, not a tick warehouse.

---

## Known prototype limitations

- Minute-bar corrections that arrive for a minute already inside a snapshot-reconstructed volume base are ignored rather than applied, because the original value for that minute was never stored. Symbols in the focused minute-bar set are unaffected.
- Session high/low merges bar-derived and trade-derived extremes; the bar-only value is not stored separately.
- Halt normalization maps CTA and UTP status codes explicitly and falls back to status text; anything unmapped stays `UNKNOWN` with the raw code preserved. Exchange-authoritative halt feeds (Nasdaq/NYSE) are a later milestone.
- LULD bands are recorded and displayed but are not a halt prediction, and the band is not the guaranteed halt price.
- Security classification is inferred from issuer names, symbol conventions and listing venue, because Alpaca's asset payload has no authoritative security-type field. It is deliberately biased toward keeping a name: an unrecognised symbol suffix stays eligible. A proper exchange security master (SIP security type, or a vendor reference feed) would replace `lib/market/securities.ts` wholesale and is the documented upgrade path.
- Structured products, SPAC-adjacent instruments and trust certificates are the least certain classifications; a handful land in `OTHER` on name evidence alone.
- The worker reads the TODAY-ticker list from `/api/dashboard` once a minute rather than holding Google credentials itself. If the dashboard is not running, no sheet tickers are pinned until it is.
- Google Sheet polling frequency is unchanged from the previous milestone, and nothing is ever written back to the sheet.

---

## Testing

```bash
npm test
```

109 tests covering SIP parsing and malformed-frame safety, minute-bar accumulation and correction, the exact Daily RVOL formula (including that it is not time-of-day normalized), baseline construction and confidence, ranking and rank change, event generation and deduplication, price-range latching, session reset, quote/spread edge cases, stale-observation guards, halt/resume transitions, reconnect backoff, REST pagination and batching, mid-session reconstruction, store round-trips and mode segregation, sheet-only operation, the demand/research merge, credential redaction, and that no credential material reaches the client bundle.

**Google Sheets is a temporary prototype data store. All dashboard UI must depend on normalized application types, not spreadsheet coordinates, so the data source can later be replaced without rewriting the product.**
