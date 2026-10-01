# Option B (robust RVOL baseline): PRE-REGISTERED replay, committed BEFORE any B number is computed

*Seat `local_5f4bfcf8` (Research-tmi), 2026-10-01. Part of ONE side-by-side for his question (his turn 2026-10-01T12:42:22.026Z in Integration's transcript `1bfab363`): "was there a cost analysis? (not $, system cost, compatibility, design, etc.) does it make sense? we're slowly becoming a scanner doing that." His "yes, wait for the comparison" is at 12:53:31.806Z in the same file. His requirement (12:14:00.566Z): "VEEA is up 43% from close. it should absolutely show on the baord somewhere."*

**(A)** is the movers rule as built (`research/movers` at `aaebfc42`, spec `d02cfb36`, replay result in `docs/research/board-movers-replay-2026-10-01/`). **(B)** replaces the 20-session MEAN in the RVOL denominator with a robust statistic. `lib/market/rvol.ts:4-14` pins the definition as backtested and fixed, so B is his call; this replay sizes it and decides nothing.

## What B is, exactly

Same as today in every respect (the same 20 prior eligible sessions, `volume > 0`, the same full-session calendar, the same cumulative numerator), except the reduce at `rvol.ts:94-97`:

- **B1, MEDIAN** of the selected sessions' volumes (an even count takes the mean of the middle two).
- **B2, TRIMMED MEAN**: sort the selected volumes, drop `floor(0.1 * n)` from each end (2 and 2 when n = 20), mean the rest.

Both are reported. Neither is picked here.

## Data and the instrument problem

Local read-only copy `data/market-prod-2026-09-29.db`. The copy does NOT hold per-day volumes for the universe: `daily_bars` covers 1,133 symbols, and `rvol_baseline` keeps one row per symbol with the mean only. **The per-day volume is therefore a PROXY: each prior date's `ticker_session.cumulative_volume`** (raw across splits; the hand-off measured it within 1% of the stored mean for only 1,663 of 7,909 symbols). The prior 20 dates for each session are the 20 latest `ticker_session` dates before it (for 2026-09-14 that is 08-14 to 09-11; 08-20 is a partial day of 4,165 rows, so some names have 19). Days with null or zero volume are excluded, as the engine excludes them.

**Because the proxy is weak, B is never compared against the stored mean directly. A CONTROL ARM, M-proxy (the MEAN of the same proxy days), is computed beside B1 and B2.** Then a difference between M-proxy and B is the statistic, not the data.

## Reconstruction

Identical to the A replay (`movers.js`): sessions 2026-09-14 to 2026-09-29, checkpoints 08:00, 09:00, 09:25, 10:00 ET; price = last minute close with `ts < t`; numerator = minute volume 08:00Z <= ts < t; band $1 to $20 by that price; ranked = RVOL non-null, in band, `universe.discovery_eligible = 1`; top 50; ties by symbol. Latch not replayed. Five boards per checkpoint: **S** (stored `baseline_average`, which is A's base board), **M** (M-proxy), **B1**, **B2**, and **A** (S plus the movers rule, as in the A replay).

## Gates, BEFORE any B result is read

1. **Session gate:** the A replay's own (sessions 09-28 and 09-29 failed it and stay EXCLUDED). 40 checkpoints remain.
2. **Proxy gate, per checkpoint:** the M top 50 must share **at least 45 of 50** names with the S top 50. A checkpoint that fails is reported and its B result is UNTESTED there. If fewer than 20 of the 40 checkpoints pass, the whole B replay is UNTESTED and only the per-name results below are reported.
3. **Per-name gate, for each name A added:** its M-proxy denominator within **±10%** of its stored `baseline_average` for that session. A name that fails is UNTESTED for B (a split or a missing day makes its proxy wrong), with its two values printed.

## Measured and reported

**Primary (his requirement):** of the 19 additions A made on gated checkpoints (15 distinct names: FTFT, NCPL, SVRN, AEHL, CMND, AIXC, BMGL, GDC, GRML, LGCL, RTB, PTLE, USDE, BENF, BIAF), how many sit in the B1 top 50, and in the B2 top 50, **at the same checkpoint**. Each one is listed with its S rank, M rank, B1 rank and B2 rank. The named six are VEEA, NCPL, FTFT, SVRN, AEHL and CMND. VEEA's big move is 2026-10-01, outside the copy, so it is handled separately below.

**What else B changes (the product cost):** per checkpoint, the names B1 and B2 put in the top 50 that M does not, and the names they drop. Churn is measured B vs M, not B vs S, so the proxy does not count as churn. Reported: entries per checkpoint (min, median, max), and each entrant's percent_change and cumulative volume at t.

**Thin names, the known risk of a median:** a name that trades on a few days and is dormant on the rest gets a tiny median, so ordinary volume looks large. Per board, the count of top-50 names with cumulative volume at t **below 100,000 shares**, and the median cumulative volume of the top 50. B against M.

**A on top of B (descriptive):** the movers rule (K = 10, +20%) applied to the B1 board. How many names it would still add.

## VEEA today, an ESTIMATE, labelled

VEEA's B1 denominator = the median of its proxy volumes over the 20 latest copy dates before 2026-10-01. The copy has no 09-30 row, so that is 19 of the true 20 plus 2026-09-01; this is stated with the result. **The local median (346k) is known already** and does not count as a B result. Its B1 RVOL at 10:00 ET = VEEA's cumulative volume 04:00 to 10:00 ET today (asked of Ops after 10:00 ET, a one-symbol minute-bar read) / that median. **It is compared with the 50th-place B1 RVOL at 10:00 on each gated replay session (min, median, max).** Above the max reads "would have ranked on every replay day"; below the min, "on none"; between, "depends on the day". It is an estimate because today's other 2,000+ denominators are not replayed.

## What this does not show

The latch, the after-hours board, and anything about whether B's ranking predicts better moves. The backtest that fixed the mean is not re-run here. A rule sized on ten sessions is a rule sized on ten sessions.
