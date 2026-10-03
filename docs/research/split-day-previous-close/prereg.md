# Split-day prior close: PRE-REGISTERED (written before any count)

*Research seat `local_98e3e9a1`, 2026-10-03. Asked by Integration after this seat noticed WCT's 10-01 close reading -79.9% against a +2.0% high (`docs/research/reports-v6/narrative-redesign-proposal.md`). Read-only, on the 2026-10-02 production snapshot (`market-prod-2026-10-02.db`, sha256 `9f0efa03...`). No external calls. Nothing goes to him until measured.*

## The question

On a split's effective date, is `ticker_session.previous_close` on the post-split basis? If not, the board computes every percent move for that name against a close on the wrong basis: a 1-for-5 reverse split prints as a fall of about 80 percent.

**What the code says, read before any count (not yet run, so not yet evidence):** the market worker builds each day's baseline from Alpaca daily bars requested with `adjustment: 'split'` (`worker/runtime.ts:808-813`), and that baseline's previous close wins over any other source (`lib/market/engine.ts:736-742`). The desk's archive code notes that Alpaca's split adjustment restates history onto the basis current AT FETCH (`lib/archive/splits.ts:18`, `:134`). So the hypothesis to test is timing: a baseline fetched before Alpaca applies the split carries the pre-split close into the effective date.

## Fixed now

**Window and rows.** Every `ticker_session` row from 2026-08-14 to 2026-10-02 (35 dates) with `previous_close > 0`, a regular-session high and low on that date, and a row for the same symbol on the PRIOR trading date of the window that has `rth_final_close` (P_raw, the prior session's close as the desk stored it, on the old basis). Rows without that prior row are excluded and COUNTED. The `rth_final_*` columns are latched only since schema v28, so the dates that carry them are reported first; earlier dates are excluded, never filled from `session_high` / `session_low` (those include extended hours). If fewer than 5 dates carry them, the result says the window is too short to answer "how many", and reports only what it saw.

**Step 1, a basis jump, found without reading `previous_close`.** A row is a CANDIDATE when the day's regular session trades entirely on a different basis from P_raw: `rth_final_low > 1.8 x P_raw` (reverse split, or a very large gap) or `rth_final_high < P_raw / 1.8` (forward split, or a collapse). The ratio R = `rth_final_close / P_raw`.

**Step 2, split or genuine move.** A candidate is a SPLIT when any of:
- `daily_bars.split_factor` is set and not 1 for the symbol within 3 trading days of the date;
- a stored research source or dossier for the symbol names a split effective that date;
- R is within 5 percent of a standard ratio (2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 100, or its inverse).

Otherwise it is a GAP (a genuine move) and is reported, not counted as a defect. Every candidate is listed with the evidence that classified it.

**Step 3, the prior close's basis, for each SPLIT row:**
- DEFECT: `previous_close` within 2 percent of P_raw (the pre-split close carried onto the post-split day);
- ADJUSTED: `previous_close` within 5 percent of P_raw x (split ratio) (correct);
- OTHER: neither, listed.

**Reported:**
- the counts: rows, excluded rows, candidates, SPLIT, GAP, DEFECT, ADJUSTED, OTHER;
- for each DEFECT row:
  - `previous_close_source`, `baseline_adjustment`, and the `rvol_baseline` row for that symbol and date (`previous_close`, `previous_close_date`, `adjustment`);
  - whether the symbol reached the BOARD that date (any `desk_assessment_tickers` row for it on a checkpoint of that date), with the `percent_change` it showed;
  - whether it reached a REPORT, if the store holds report rows for that date.
- The Alpaca question ("is Alpaca's close unadjusted on the effective date?") is answered only as far as the stored baseline rows show it: their `adjustment` and dates. Alpaca itself is not queried.

## Controls, run with the count

- **Positive:** WCT on its effective date must be a CANDIDATE, a SPLIT and a DEFECT (its -79.9% close against +2.0% high is the case that raised this). If the detector does not return it, the run is VOID and says why.
- **Negative:** of the rows that are NOT candidates, at least 95 percent must have `previous_close` within 2 percent of P_raw (on an ordinary day the stored prior close is the desk's own prior close). If fewer, the 2 percent test does not measure what step 3 assumes, and the run is VOID.
- **Adjusted exists:** report whether any SPLIT row is ADJUSTED. Zero ADJUSTED with some DEFECT is a finding; zero of both means the window holds no split the detector could see, and the result says so instead of "no defect".

## Discipline

- The measurement script is committed before it runs, and its raw output before it is read.
- No pass line: a count and its mechanism, for Integration and Ops to judge.
