# Reports v6: the narrative's facts, PRE-REGISTERED before any writer prompt is written

*Seat `local_5f4bfcf8`, 2026-10-02.*

- **Scope** is Integration's order calls after `83db9d75` (research.md LIVE STATE).
- **His shape** is verified at his turn (Marketing's `2bb33112`, 2026-10-02T02:41:33.543Z).
- **Marketing writes the words.** This file fixes only WHICH numbers exist, from WHICH stored values, and how the checker traces them.
- **Nothing here is computed yet.**

## The rule for every fact

- **The narrative's facts are COMPUTED by code** from stored values and handed to BOTH the writer and the checker as one block, the way `afterHoursTotals` is today (`check.ts`, the OVERALL rule).
- **The model never counts.** It words the given numbers.
- **The narrative line (id `N`) is supported only if:**
  - every number it states equals a given fact;
  - every ticker it names is in the given facts;
  - it states nothing else.
- **No adjective** that no fact defines.

## The facts, per report kind (the checkpoint per kind is `pipeline.ts:41-45`)

| Id | Fact | Exact source | Kinds |
|---|---|---|---|
| **F1** | eligible, traded, up, down | The frozen `desk_assessment_ranges` row for (this report's checkpoint id, this range's key), columns `eligible, traded, up, down`, plus its `count_window`, which the words must follow ("after hours" vs "so far today"). **Ops's count-window read is pending; the window is read off the row, never assumed.** | All four |
| **F2** | The leader: ticker, percent change | The covered row with the lowest `assessment_rank` on this checkpoint (`desk_assessment_tickers`): `ticker`, `percent_change` (its stored basis, `reference_basis`, is carried so the words cannot misstate it) | Into RTH, into power hour, after hours |
| **F3** | Fresh-news count among the covered names | Covered rows' `analysis_version_id` gives `catalyst.status = FRESH_FOUND` (`research.ts:51`), counted. **Never worded as causation** (Marketing). | All four |
| **F6** | Moved over 50% (recap) | `ticker_session` for the report's trading date, population = F1's (price in range, eligibility as `computeRangeCounts`, `assessmentRepo.ts:713-717`), with `previous_close > 0 AND rth_final_high >= 1.5 * previous_close` | Premarket (recap) only |
| **F7** | Of F6, gave the entire move back | F6's set with `rth_final_close <= previous_close` | Premarket (recap) only |
| **F9** | The names it is tracking (recap) | This checkpoint's covered names, the same set the report's lines cover, as a count and a list | Premarket (recap) only |

**Read-time stability:** F6, F7 and F9 rest on values that do not move after 16:00, or are frozen at the checkpoint (`rth_final_*`, first-write latch, `repo.ts:969-970`; checkpoint rows). The checker re-reads them minutes after the writer.

**Population check, before the first run:** on a local copy, F6's population count must equal F1's `eligible` for the same checkpoint. If it does not, the population differs and nothing is reported until it does.

### AMENDMENT, ADOPTED (Marketing's ask; Integration's order call 2026-10-02: recap F1 = the regular-session counts, the same set as F6/F7, unless he tells Marketing "after-hours"; registered BEFORE anything is computed)

**Store change needed: NONE.** The 22:00 report reads the 16:00 values from `ticker_session` (the row for the trading date), latched at the bell (`repo.ts:969-974`, production line). The checker re-reads the same latched values.

**Marketing (after `83db9d75`):** the recap narrates the regular session just closed. So F1 breadth must share F6/F7's 16:00 basis, not the 22:00 after-hours snapshot, and F6/F7 must not be filtered by 22:00 band membership. Marketing is confirming the change of the premarket opening, from after-hours totals to the day's totals, with him.

**Research's proposal for the RECAP: F1, F6 and F7 all from ONE source, the 16:00 latched values on `ticker_session`.** Not the RTH_CLOSE checkpoint's range row: that row's `count_window` is unknown until Ops's read, and may be the after-hours one.

| Id | Recap definition, 16:00 basis |
|---|---|
| Population | `ticker_session` for the date; board eligibility (`universe.discovery_eligible` NULL or 1); `rth_final_close` between the range bounds |
| F1 eligible | Count of the population |
| F1 traded | `rth_final_volume > 0` |
| F1 up / down | Among traded, `rth_final_close` above / below `previous_close` |
| F6 | Traded, `previous_close > 0`, `rth_final_high >= 1.5 * previous_close` |
| F7 | F6 and `rth_final_close <= previous_close` |

- **Every value is latched at the bell and never overwritten:** `repo.ts:969-974` on the production line (close, high, low, volume, rvol, rank: COALESCE first write). `rth_final_frozen_at` was READ only as the earliest value among the no-close rows: 20:00:00Z (16:00 ET) on each date 09-22 to 09-29. Not checked on every row.
- **MEASURED GAP, on the local copy (09-22 to 09-29):** names with a price but NO 16:00 close are outside this population. In range and traded: 6, 0, 2, 2, 3, 1 per day. On 09-22 one of them moved 50% or more by `session_high`. In-range rows with a close but no 16:00 high all had zero regular-session volume, so they cannot be movers.
- **So the recap's computed facts carry one more number, G**, the count of in-range traded names with no 16:00 close. It is shown to the writer as a footnote fact and never hidden.
- **The population check then becomes this POSITIVE control:** before the first run, on a local copy, G and the population count are printed for every date, and F6 must find at least one 50% mover on at least one date. Otherwise the instrument is broken.

**Not in v6:** F8 (theme, v6.1). Range-wide F6 and F7 on the intraday kinds (option 2, after v6).

## Seeds this commits the pass bar to (classes promised to Marketing before the freeze)

| Class | Example |
|---|---|
| N1 | A wrong F1 count |
| N2 | A wrong F6 or F7 count |
| N3 | The wrong leader, or the leader's percent wrong |
| N4 | A wrong F3 count |
| N5 | F3 worded as causation ("fresh news drove") |
| N6 | A theme or sector claim (F8, not given in v6) |
| N7 | A ticker in the narrative that no fact names |
| N8 | An adjective no fact defines ("a busy session") |
