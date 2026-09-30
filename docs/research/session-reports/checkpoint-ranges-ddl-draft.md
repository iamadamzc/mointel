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

## 4. Open for Research before the migration

1. **Bounds:** inclusive at both ends, as written? It must match the board's own range filter, or a
   report's count and its list disagree on a name priced exactly at a bound.
2. **Flat names:** traded names with a change of exactly 0 (or NULL) count as neither up nor down,
   so up + down <= traded. Say if the report needs a stored `flat`.
3. **Price NULL** at capture: excluded from `eligible`?
4. **top_n and the rank basis per range:** N (the report shows 12; the band stores 25), and which rank
   orders top_tickers at each checkpoint kind (the board's DAILY_RVOL rank within the range, or ah_rank
   at the 22:00 recap?). `ranking_definition` records whichever is chosen.
5. The 20:05 ET checkpoint (a separate Ops piece) will need its own row in the table above
   (AFTER_HOURS, final at 20:05). Say if its window differs.
