# Movers floor x VOLUME floor: PRE-REGISTERED, committed BEFORE any number is computed

*Seat `local_5f4bfcf8`, 2026-10-01. Integration's request, after Ops's live read `f1c0628d` showed thin names among today's 10 to 20% movers (WFCF 5,756 shares, GNTA 44,607). It extends `prereg-floor.md` (`7492e845`) and changes nothing in it.*

**Reconstruction:** identical to `floors.js` (the A replay's: local copy, 10 gated sessions, checkpoints 08:00, 09:00, 09:25 and 10:00 ET, band $1 to $20, top 50 by RVOL over the stored mean). **Volume** = cumulative minute-bar volume from 04:00 ET to the checkpoint, the same sum as the RVOL numerator. **Instrument check:** with no volume floor, every cell must equal the `floors-raw.json` result (`b3c13ce6`), or nothing is reported.

**Grid:** percent floors 10, 15, 20, 25 and 30%, crossed with volume floors **none, 100k, 500k and 1M shares**. Each cell is computed with K = 10 and uncapped. A name qualifies only if it clears both floors; the order is still by percent change, largest first.

**Reported per cell:** rows per checkpoint (median, max); checkpoints where K = 10 binds, and the names left off; total rows (distinct names); the 60-minute hold rate as defined in `prereg-floor.md`. Also, per percent floor, how many rows each volume floor removes.

**Today (live, one moment):** from Ops's `f1c0628d` file only: the counts at 10% and 15% for each volume floor. The file lists volumes only for names at 10 to 20%; the 5 names at 20% or more are counted, but their volumes are not in it. So today's cells at 20% and above are reported as "not read".

**Also stated with the result:** today's live read used the served band **$0.25 to $20**; the replay uses **$1 to $20**.
