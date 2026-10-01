# Readers of RVOL, RVOL rank, the baseline and the ranked board

*A read-only subagent swept `main` (working tree, 2026-10-01, at about `09d33239`) for seat `local_5f4bfcf8`. Lines opened and confirmed by hand before use: `guardrails.ts:317-319`, `afterHours.ts:57-67`, `cycle.ts:847-858`, `columnTitles.ts:68`, `bundle.ts:305`, `TickerDrawer.tsx:514-516`, `DiscoveryBoard.tsx:809-817`, `merge.ts:568`, `coverage.ts:405-411`, `dead-while-ranked.ts:306-311`, `assessment.ts:88-91`, `rvol.test.ts` (all fixtures), `repo.ts:863-866`, `repo.ts:893-894`, `runtime.ts:773-847`. The rest is the subagent's reading. Counts are approximate.*

Class: 1 computes, 2 persists, 3 ranks/selects, 4 displays, 5 compares across time, 6 tests.

## What B (median denominator) touches

- **The only mean:** `lib/market/rvol.ts:93-97` (`buildBaseline`). Computed in the market worker: `worker/runtime.ts:795-847`. Existing rows for a date are never rebuilt (`:773-791`).
- **Same denominator, other uses:**
  - After-hours participation: `afterHours.ts:57-67`, `engine.ts:1678`, `:1919-1922`.
  - The startup focus set for minute backfill: `runtime.ts:1035-1058`, top `max(internalRank*4, 100)`.
- **Value thresholds that shift:**
  - `lib/research/interpret/guardrails.ts:319`: `rvol >= 5` for FLOW_DOMINANT, via `bundle.ts:305`.
  - `worker/dead-while-ranked.ts:306-311`: bands 0.5 / 2 / 5.
  - `lib/desk/assessment.ts:89-91`: the cycle fingerprint, `floor(log2(rvol))`.
- **Unchanged:**
  - `lib/market/cycle.ts:31` (`CYCLE_START_RVOL = 5`) and `:104` (`SHADOW_RVOL = 2`). Both are already on the module's OWN median (`:250-260`, `:845-858`); its comment at `:848-853` says stored `rvol` divides by the mean.
  - Confidence (`rvol.ts:40`), which is count-based.
- **Persisted, so history mixes before and after the change:**
  - `rvol_baseline.average_volume`.
  - On `ticker_session`: `rvol`, `rvol_rank`, `baseline_average`, `qualified_rvol` and `qualified_rank` (first-write latch, `repo.ts:863-866`), `rth_final_rvol` and `rth_final_rank` (latch, `:893-894`), `dead_at_rank`.
  - `desk_assessment_tickers.rvol` / `rvol_rank`.
  - The archive's `final_rvol` and `best_rank` (`lib/archive/coverage.ts:396-411`, `repo.ts:108-147`).
  - `RVOL_RANK_ENTRY` and `NEW_HOD` event payloads (`engine.ts:1814-1858`, `:2085`).
- **Text that says "average":**
  - `columnTitles.ts:68` and `:121`.
  - `DiscoveryBoard.tsx:809-817`, for both Daily RVOL and AH participation.
  - `TickerDrawer.tsx:514-516`.
  - `rvol.ts:7-9`; `afterHours.ts:9`, `:50`.
  - The landing page: "twenty-session baseline" (`app/page.tsx:214`, `:223`, `:347`), which stays true.
- **Tests:** no test separates mean from median. Every `buildBaseline` fixture is flat (`tests/market/rvol.test.ts:7`). Engine and pipeline tests inject `averageVolume` directly through `setBaselines`.

## What A (movers rows) touches

- `readTopMovers` and `boardReason` exist only on `research/movers` (`aaebfc42`), not on main.
- On the branch, `ranked` excludes movers (`readModel.ts:614`); they travel as `discovery.movers` (`:648`).
- On the branch, the `demand` map's one UI reader is a price lookup (`DashboardShell.tsx:656`).

**Readers of the ranked board that would break if movers were put INTO `ranked`.** A does not do this; the list is why it must not:

- `readModel.ts:616-624` builds `ranked` only from rows with `rvolRank !== null`. The counts at `:641-646` fall back to `ranked.length`.
- `rangeRank.ts:210-221` slices and overwrites ranks. `:250` treats a non-null rank as "ranked".
- `lib/dashboard/view.ts:434-446` states the invariant "every Discovery row has an `rvol_rank`".
- `DiscoveryBoard.tsx:56` and `:309`: at most 50 visible rows after sorting.
- Positional top-N:
  - `DashboardShell.tsx:404`
  - `lib/mcp/tools.ts:210` and `:311`
  - `lib/review/diagnostics.ts:565`
- `lib/desk/reports/facts.ts:9-13` assumes checkpoint rows are a contiguous band prefix.
- Tests:
  - `tests/dashboard/discoverySort.test.ts:95-108`
  - `tests/market/rangeRank.test.ts:299-341`
  - `tests/market/store.test.ts:199-200`

**Readers that query `ticker_session` by `rvol_rank` directly** never see an unpersisted mover:

- `worker/desk-assessments.ts:191`, `:363`
- `lib/market/store/researchRepo.ts:136`
- `worker/research-catalyst.ts:205`
- `worker/research-collect.ts:157`
- `worker/research-interpret.ts:125`
- `lib/research/historyFetch.ts:315`

## Rank thresholds (for reference)

- `discoveryRank` 12 and `internalRank` 50 (`config.ts:101-102`).
- `autoRank` 12 (`research/config.ts:19`); `STALE_REASK_MAX_RANK` 12 (`queue.ts:161`); `NEWS_RECHECK_MAX_RANK` 12 (`recheck.ts:42`); `DEEP_HISTORY_RANK` 10 (`historyFetch.ts:289`).
- `MATERIAL_RANK_IMPROVEMENT` 5 (`research-catalyst.ts:76`); `MATERIAL_RANK_MOVE` 3 and bands 3/6/12 (`assessment.ts:26`, `:88`).
- `captureCount` `max(2*12, 25)` (`desk-assessments.ts:464`); `REPORT_NAME_CAP` 12 (`facts.ts:91`).
- `VIEW_SIZES` max 50 (`DiscoveryBoard.tsx:56`); MCP max 50 (`tools.ts:185-197`).
- `highResMax` 250 (`engine.ts:2215`).
