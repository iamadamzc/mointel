# Architecture

How V0 is put together, and where each planned subsystem attaches. Nothing in the "future" sections is implemented yet; they are recorded so the current seams stay in the right places.

---

## 1. Current shape

```
┌───────────────────────────────────────────────────────────────┐
│ Browser                                                       │
│   DashboardShell (client)                                     │
│     ├── DashboardHeader / DataFreshness                       │
│     ├── MarketSummary                                         │
│     ├── FilterBar        ─┐                                   │
│     ├── PrimaryFocus      ├─ lib/dashboard/view.ts (pure)     │
│     ├── MomentumTable    ─┘                                   │
│     └── TickerDrawer                                          │
│   lib/hooks/useDashboard.ts  — polls every ~4s                │
└───────────────────────────┬───────────────────────────────────┘
                            │ GET /api/dashboard  (the only call)
┌───────────────────────────▼───────────────────────────────────┐
│ Server                                                        │
│   app/api/dashboard/route.ts                                  │
│   lib/data/index.ts                                           │
│     • provider selection (credentials present? mock?)         │
│     • ~10s cache, single-flight refresh                       │
│     • stale fallback to last good payload                     │
│   ├── providers/googleSheets.ts  (server-only, batched read)  │
│   └── providers/mock.ts                                       │
│   lib/data/rows.ts       — column positions live ONLY here    │
│   lib/data/normalize.ts  — parsing + classification           │
│   lib/data/types.ts      — the contract everything depends on │
└───────────────────────────────────────────────────────────────┘
```

### Layer rules

1. **UI depends on types, never on the source.** Components import from `lib/data/types.ts`. No component knows a column letter, a tab name, or that Google exists.
2. **Providers satisfy `DashboardDataProvider`.** A provider's only job is to produce `tickers`, `research`, `summary`, and provenance `meta`.
3. **Column knowledge is confined to `lib/data/rows.ts`.** Swapping the source means writing a provider that produces normalized objects; it does not mean touching the UI.
4. **Server-only boundary.** `lib/data/index.ts` and the Sheets provider import `server-only`, so credentials cannot leak into a client bundle even by accident.
5. **Normalization is conservative.** Explicit `Unknown` stays unknown. Classifications are only asserted when the source states them. Original display text is always preserved next to any parsed value.

### Caching and freshness

`lib/data/index.ts` holds a single cache entry on `globalThis` (so it survives dev hot reloads):

- Fresh cache (< `CACHE_TTL_MS`, 10s) → served directly.
- Expired → one upstream read; concurrent callers share the in-flight promise.
- Upstream failure with a cache present → last good payload, `stale: true`, explanatory `meta.error`.
- Upstream failure with no cache → empty payload, `stale: true`, `meta.error` set. The UI renders empty state rather than crashing.

`meta` carries `provider`, `fetchedAt`, `sourceUpdatedAt`, `stale`, `error`, `cacheAgeMs`, `sourceTitle`, and non-fatal `warnings` (skipped rows, tickers with no RESEARCH record).

---

## 2. Where future subsystems attach

### Replacing the data store (PostgreSQL or a service)

Write `lib/data/providers/postgres.ts` implementing `DashboardDataProvider` and add it to the selection logic in `lib/data/index.ts`. Nothing else changes. If the store returns already-normalized records, it can skip `rows.ts` entirely; `rows.ts` exists for spreadsheet-shaped inputs.

### Live market-data provider

A second provider concern, not a replacement: quotes/volume arrive far faster than the research sheet changes.

- Add `lib/data/providers/marketData.ts` behind a `MarketDataProvider` interface (quote, session, volume, halt state by symbol).
- Compose in `lib/data/index.ts`: research/structure from the sheet or database, live fields from the market-data provider, merged into `MomentumTicker` before the payload is cached.
- `SessionValue.session` already models which session a number came from, so a live feed slots into the existing display contract.
- Push transport (SSE/WebSocket) replaces polling at `lib/hooks/useDashboard.ts` only; the payload shape stays the same.

### Derived momentum metrics

RVOL ranking, float turnover, effective float turnover, and momentum acceleration are computations over normalized data, not new sources. They belong in a `lib/analytics/` module that takes `MomentumTicker[]` (plus historical bars once available) and returns derived fields.

- Add optional fields to `MomentumTicker` (e.g. `rvol?: DerivedMetric`) so the UI can render them when present and ignore them when not.
- Each derived metric must carry its own confidence/unknown state: effective float turnover is meaningless when the float is `UNKNOWN`, and the product must keep saying so rather than emitting a number.

### Halt detection

A market-data provider capability plus a `haltState` field on `MomentumTicker`. Render as a badge alongside the session chip in `MomentumTable` and `PrimaryFocus`; no new page structure needed.

### Event-driven OpenAI analysis

- New server module `lib/intelligence/` with an explicit trigger surface (structure change detected, new filing, cycle transition, halt).
- Runs server-side only, writes results into the store, and surfaces them through the same `/api/dashboard` payload as additional typed fields — the UI must never call a model provider directly.
- Outputs are attributed and timestamped so a generated read is visually distinguishable from a human analyst note.

### Dirty Float state changes, Chop Risk, Flush Risk, Live Confirmation

These are stateful classifications that change during a session, so they need history that V0 does not keep.

- Requires a persistence layer (PostgreSQL) recording per-ticker snapshots over time.
- Add a `stateChanges` collection to the payload and a change-log strip in `TickerDrawer`.
- `StructureState` and `CycleState` are already closed unions, which is what makes transitions expressible.

### Live commentary feed

Server-owned append-only stream keyed by ticker and timestamp, delivered over the same push channel as live quotes. UI slot: a right-hand column in the shell, or a tab inside `TickerDrawer`.

### Historical ticker dossiers

`RESEARCH` already carries `Report Date`, and `selectLatestResearch()` in `lib/data/rows.ts` is deliberately the single place that decides which record wins. Keeping every record instead of the latest is a change to that function plus a date selector in the dossier.

### Multi-user broadcast distribution

The server cache is already the single point of truth for upstream reads, which is the right place to fan out from. Broadcasting means promoting that cache to a shared process (or Redis) and pushing updates to subscribers rather than answering polls. Authentication and per-user watchlists would sit in front of `/api/dashboard`, which stays the single client contract.

---

## 3. Deliberate non-goals in V0

Market-data ingestion, OpenAI integration, authentication, billing, user accounts, broker integration, charts, Level 2, Time & Sales, and automated trading are all out of scope for this milestone. The Google Sheet is treated as strictly read-only.
