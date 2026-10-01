# Movers on the LIVE band ($0.25 to $20), and whether movers are live on NOW: PRE-REGISTERED before computing

*Seat `local_5f4bfcf8`, 2026-10-01. It answers two Integration asks: the live-band re-run (queued after the band correction `ecaa0823`) and NOW coverage, after his 15:36:50Z ruling that movers rank normally and "will show on gap and now". Local copy only. Nothing ships.*

## From code, before any number (opened by this seat)

- **Latch:** `engine.ts:1781-1791` latches a name the FIRST time it is ranked AT ANY RANK while its price is in band (`!qualifiedAt && price in range`). It is not limited to the top 50. So nearly every in-band mover is latched.
- **Live 10 s capture set:** `engine.ts:2182-2227`.
  - Members: (rank <= 50 and alive) plus (latched and alive), capped at `highResMax` 250.
  - Pinned names always join (`:2154-2156`) and fill the cap first (`:2217`), then names in RANK order (`:2220`), then the rest.
  - With far more than 250 latched names, which is the case when thousands are ranked, **the set is about the top 250 by rank, alive only.**
- **So the measure is rank:** a mover ranked 250th or better is in the set, unless dead names or pins move the line. Dead names push it DOWN the ranks, so more names get in; pins push it up by the number pinned. Ranked 251st or worse, it is not in the set and is not live on NOW.

## Reconstruction

The A replay's (`floors.js`), with ONE change: **band $0.25 to $20** for both ranking and movers. Everything else is the same: local copy, checkpoints 08:00, 09:00, 09:25 and 10:00 ET, top 50 by RVOL over the stored mean, eligibility.

**Sessions:** all 12 (09-14 to 09-29). Each is GATED again on the live band.

**Instrument gate:** at 09:25 and 10:00, the reconstructed top 25 must share at least 22 of 25 names with the stored `desk_assessment_tickers` set, the same rule as A. A session failing it is reported and excluded. The A replay's 09-28 and 09-29 failures were all sub-$1 names, so this gate also tests whether production's band in that window included them.

**Second instrument check:** the same script with band $1 to $20 must reproduce `floors-raw.json` for every floor with no volume floor.

## Grid and outputs

- **Floors:** percent 10, 15, 20; volume none, 100k, 500k, 1M (shares from 04:00 ET to t). K uncapped.
- **Per cell:**
  - rows per checkpoint (median, max);
  - **the K a cap would need** (max rows at one checkpoint);
  - the K = 10 binds count;
  - the 60-minute hold rate (as in `prereg-floor.md`).
- **NOW coverage, per cell:** the share of added rows with RVOL rank 250 or better at t (**LIVE on NOW**), the share ranked worse (**NOT**), and the rank distribution (median, 90th percentile, max).

**Reading rule, fixed now:**
- If 80% or more of a candidate floor's rows are ranked 250 or better, NOW needs no worker change for most movers, and the restart question covers only the rest.
- If under 50%, the worker change is the main path.
- Between, both are stated.

## What this does not show

- The live set's "alive" filter and pins are not replayed, so "rank <= 250" is a close proxy, not the set itself.
- Latches from before the checkpoint are not replayed.
- The local copy only.
