# Big movers reach the board: spec and PRE-REGISTERED check

*Seat `local_f6fa4717` (Research), 2026-10-01. Owner of the selection logic (README, "Who owns lib/market": computes are Research's, `lib/market/store` is Ops's). Placement on screen is Design's. The ship is his yes, via Ops.*

## His ruling (verified at his turn)

2026-10-01T12:14:00Z, his own words: *"VEEA is up 43% from close. it should absolutely show on the baord somewhere."* Recorded by Integration as the requirement: **a name making a large % move from the prior close reaches the board regardless of its RVOL rank.**

**Why VEEA missed (measured, local copy):** the board is the top 50 by `rvol_rank`; RVOL divides today's volume by the MEAN of 20 prior sessions (`rvol.ts:23-33`), and VEEA's 20 include 202,161,392 shares on 09-15. Mean 13.4M, median 346k. Ops read today: rvol 0.581, `rvol_rank` 120. *The baseline method itself is a separate study (robust baseline), not this change.*

## The rule

**The DAILY board = the top 50 by `rvol_rank` (unchanged) UNION the top K names by `percent_change` that are not already in it, among names in the served price band with `percent_change >= FLOOR`.**

- **K = 10. FLOOR = +20% from the prior close** (`percent_change`, the engine's own value against the reference close, `engine.ts:1644`). Sorted by `percent_change` DESCENDING, so the cap only ever drops the SMALLEST qualifying moves: a name like VEEA at +42% is cut only if ten off-board names in the band are moving more.
- **Band:** the served price range by CURRENT price (the same band the board shows); discovery-eligible only (the universe rule the board already applies).
- **Only additive.** No name leaves the board; ranks are not changed; an added row carries its true `rvol_rank` (VEEA's 120) and a flag `boardReason: 'MOVER'` so Design can place and label it.
- **DAILY board only.** The after-hours board has its own move measure (`ah_percent_change`); extending this there is a separate question for him.
- **Never in the capture or the reports.** `lib/desk/rangeCapture.ts` also calls the band ranking; the movers rule is applied only on the live board read (`readModel`), so checkpoint rows, reports and their checker are untouched.

## Files

- **Ops (`lib/market/store/repo.ts`):** one new read, `readTopMovers(db, tradingDate, band, minPct, limit)`: `SELECT * FROM ticker_session WHERE trading_date = ? AND price BETWEEN ? AND ? AND percent_change >= ? ORDER BY percent_change DESC LIMIT ?`, joined to the universe eligibility exactly as `readRangeCandidates` is. Light: one date's rows, bounded LIMIT; no full band read per poll.
- **Research:** `lib/market/readModel.ts` (union after either path: the default-band `readDemandStates` path and the set-range `rankInRange` path), `lib/market/config.ts` (`BOARD_MOVERS_K` default 10, `BOARD_MOVERS_MIN_PCT` default 20; K = 0 turns it off), `lib/market/types.ts` (`boardReason`), tests.
- **Design:** where MOVER rows show and how they are labelled.

**Payload:** at most K = 10 extra rows on top of 50 (+20% rows worst case), only when that many in-band names move 20% or more off the board.

## PRE-REGISTERED CHECK, committed BEFORE any number is computed

**Data:** the local read-only copy `data/market-prod-2026-09-29.db`. Sessions **2026-09-14 to 2026-09-29** (12 sessions with minute bars and 20 prior `ticker_session` days). Checkpoints in his window: **08:00, 09:00, 09:25 and 10:00 ET**.

**Reconstruction at each (session, checkpoint):** price = the last minute close at or before t; `percent_change` = price against the row's stored reference close (the same basis the engine uses; the reconstruction states which column); RVOL = minute volume from 04:00 ET to t over the row's stored `baseline_average`; band $1 to $20 by that price; rank by RVOL descending (ties by symbol); top 50; then the rule.

**Instrument gate, first, so a broken replay cannot pass:** at 09:25 and 10:00, the reconstructed top 25 must contain at least 22 of the 25 names stored in `desk_assessment_tickers` for that checkpoint (the assessments copy that covers the date). A session failing the gate is REPORTED and EXCLUDED, never silently kept.

**Reported (no pass threshold on these; they size the change):** per checkpoint, the names the rule adds with their `percent_change` and true RVOL rank; how often the cap binds (qualifying names beyond K); the largest move that was off the board.

**PASS for the rule:** (1) on every gated checkpoint, no in-band name with `percent_change >= 20%` and a move LARGER than the smallest added name is left off (the sort property, checked, not assumed); (2) **VEEA TODAY:** one read-only query after 10:00 ET through Ops, the rule's own SELECT on today's rows: PASS if VEEA is returned while its `percent_change` is at or above 20% at the read (its value at the read is reported either way).

**What this does not show:** the local copy ends 09-29 and its eligibility flags are a snapshot of 09-29; the latch history is not replayed (names held on the board after leaving the band); a rule chosen on twelve sessions is a rule sized on twelve sessions.
