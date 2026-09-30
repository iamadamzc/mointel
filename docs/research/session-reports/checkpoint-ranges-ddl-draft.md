# DRAFT: the per-range checkpoint table and the after-hours freeze (market.db v28)

*Ops, 2026-09-30 ~05:2xZ. A DRAFT for Research to check. No migration is written, nothing ships.
The schema bump waits on the pre-deploy backup route (no VACUUM INTO inside a session) and comes after the
10:17 ET read. Shape ruled by Integration (one child table keyed (assessment_id, range_key)); count
definitions are Research's (data-map-2026-09-30.md, superseded by its 05:1xZ message, recorded in ops.md b89fbd3).*

## 1. New table (in the base DDL and as a v28 step)

```sql
CREATE TABLE IF NOT EXISTS desk_assessment_ranges (
  assessment_id      INTEGER NOT NULL,
  -- "<min>-<max>" of a configured set range, e.g. "1-20". One row per range per checkpoint.
  range_key          TEXT NOT NULL,
  range_min          REAL NOT NULL,
  range_max          REAL NOT NULL,
  -- Frozen "overall" counts. Population: ticker_session rows for the parent's trading_date
  -- (selected by that date, never by the worker's current date), universe.discovery_eligible = 1,
  -- ticker_session.price at capture within [range_min, range_max].
  count_window       TEXT NOT NULL CHECK (count_window IN ('AFTER_HOURS', 'SESSION_TO_DATE')),
  eligible           INTEGER NOT NULL,
  traded             INTEGER NOT NULL,
  up                 INTEGER NOT NULL,
  down               INTEGER NOT NULL,
  counts_version     INTEGER NOT NULL DEFAULT 1,
  -- SESSION_TO_DATE only: how many of `eligible` had a cumulative_volume that includes an Alpaca
  -- snapshot daily-bar base (volume_base_through NOT NULL). 0 = a pure 04:00 ET minute sum.
  volume_base_seeded INTEGER NOT NULL DEFAULT 0,
  -- Per-range top-N. Ordered tickers; every one has a desk_assessment_tickers row in the SAME
  -- assessment (the capture writes the union of all ranges' top-N plus the band's top 25).
  -- ORDER = the parent's own board (desk_assessments.board: DAILY_RVOL at 09:25/14:30/16:00,
  -- AFTER_HOURS at 20:05/22:00), produced by readRangeBoard (repo.ts:1081), the live board's own
  -- read, so the list is exactly what a viewer of that range saw.
  -- DELIBERATE DIFFERENCE, DO NOT "FIX": top_tickers admit a name LATCHED inside the range at a
  -- price now outside it (rangeRank.ts:157-158, :168-169), as the board does; the COUNTS above use
  -- price at capture only, no latch, because they describe the market in the range, not the board.
  -- Bounds are inclusive at both ends and a NULL price is outside, for both (rangeRank.ts:150-151).
  top_n              INTEGER NOT NULL,
  top_tickers        TEXT NOT NULL DEFAULT '[]',
  ranking_definition TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (assessment_id, range_key),
  FOREIGN KEY (assessment_id) REFERENCES desk_assessments (id)
);
```

## 2. After-hours path frozen on the ticker row (ALTER list)

```ts
{ table: 'desk_assessment_tickers', column: 'ah_reference_close', definition: 'REAL' },
{ table: 'desk_assessment_tickers', column: 'ah_high',            definition: 'REAL' },
{ table: 'desk_assessment_tickers', column: 'ah_low',             definition: 'REAL' },
```
Copied from ticker_session at capture. NULL on every row captured before v28 (fills forward only).

## 3. Count definitions (Research's, restated for the check)

| checkpoint | count_window | traded | up / down |
| --- | --- | --- | --- |
| NEXT_DAY_RECAP 22:00 | AFTER_HOURS (16:00-20:00 ET of D) | ah_participation > 0 | sign of ah_percent_change (vs ah_reference_close) |
| OPEN_SPIKE 09:25, RTH_INTERVAL 14:30, RTH_CLOSE 16:00 | SESSION_TO_DATE (04:00 ET of D to capture) | cumulative_volume > 0 (NULL = not traded) | sign of percent_change (vs prior close) |

## 4. Research's answers (2026-09-30 ~05:3xZ), checked against rangeRank.ts:145-170

1. Bounds inclusive at both ends, NULL price outside (rangeRank.ts:150-151). Latch: lists yes, counts no (comment above).
2. No stored flat: up + down <= traded; the report never prints flat.
3. NULL price excluded from `eligible`.
4. top_n = 25 per range (the report's 12 is an interim cap). Rank basis = the checkpoint's own board, via readRangeBoard.
5. 20:05 ET: AFTER_HOURS, 16:00-20:00 ET of D, final at 20:05. Cross-check for free: the 20:05 and 22:00 rows for the
   same D must carry identical counts; a difference means a late write.

No open points. Next: the migration + capture code, after the pre-deploy backup route and the 10:17 ET read.
