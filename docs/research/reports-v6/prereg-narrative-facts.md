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
