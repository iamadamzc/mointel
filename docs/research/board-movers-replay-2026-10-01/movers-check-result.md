# Board movers: PRE-REGISTERED check result

Spec: `A:\mointel-cite2\docs\research\board-movers-spec.md` at d02cfb36, section "PRE-REGISTERED CHECK". Parameters as registered: K = 10, FLOOR = +20%, top 50, gate 22 of 25, sessions 2026-09-14 to 2026-09-29, checkpoints 08:00, 09:00, 09:25, 10:00 ET.

Data: `A:\mointel\data\market-prod-2026-09-29.db`, opened read-only. Gate cross-check: `A:\mointel\data\assessments-prod-2026-09-23.db` (covers to 09-22). Scripts: `movers.js` (replay), `report.js` (this file), raw output `movers-raw.json`, all in this folder.

## Reconstruction, as implemented

- Population: every `ticker_session` row for the date (the names the engine tracked that day).
- Time: all twelve sessions are EDT, so 04:00 ET = 08:00Z; checkpoints t = 12:00Z, 13:00Z, 13:25Z, 14:00Z.
- Price at t: close of the last minute bar with `ts` < t. A bar stamped t opens at t and closes after it, so "at or before t" is read as bars that had closed by t.
- RVOL at t: sum of minute-bar volume with 08:00Z <= `ts` < t, divided by the row's stored `baseline_average`.
- percent_change at t: price at t against `ticker_session.previous_close`. Why that column: `engine.ts:1644` measures against `runtime.reference?.close`, which `resolveReferenceRthClose` (`derive.ts:24-56`) sets to the PRIOR session close before 16:00 ET. That prior close is `baseline.previousClose` (`engine.ts:736-750`), persisted as `previous_close` (`engine.ts:2327`). The column that persists `runtime.reference` itself, `reference_rth_close` (`engine.ts:2329`), holds the END-OF-DAY state: on 90% or more of rows per date its basis is CURRENT_SESSION (today's close), so it cannot serve a morning checkpoint. Validated: the stored `desk_assessment_tickers.reference_close` equals `previous_close` on 600 of 600 gate rows, all with basis PRIOR_SESSION.
- Band: $1 to $20 by price at t. Latch NOT replayed (as registered).
- Ranking: RVOL descending, ties by symbol, over names with RVOL non-null, in band, and `universe.discovery_eligible = 1` (the engine rule: `worker/runtime.ts:589-590` excludes a symbol with no universe row once the eligible set is non-empty).
- Rule candidates: in band, not in the reconstructed top 50, percent_change >= 20, universe eligibility as `readRangeCandidates` applies it (flag 1 or no universe row), as the spec's Files section names; sorted by percent_change descending; first K added.
- Universe flags are the 09-29 snapshot (stated in the spec as a limit).

## 1. Instrument gate (09:25 and 10:00)

Stored set: the 25 names of the COMPLETE `OPEN_SPIKE_ASSESSMENT` (13:25Z) and `RTH_INTERVAL` scheduled 14:00Z in the market copy's `desk_assessments`; exactly one per checkpoint. Where the assessments copy also covers the date (09-14 to 09-22) its 25 names are identical.

| Session | 09:25 overlap | 10:00 overlap | Gate |
|---|---|---|---|
| 2026-09-14 | 24/25 | 22/25 | PASS |
| 2026-09-15 | 23/25 | 23/25 | PASS |
| 2026-09-16 | 22/25 | 23/25 | PASS |
| 2026-09-17 | 22/25 | 23/25 | PASS |
| 2026-09-18 | 24/25 | 23/25 | PASS |
| 2026-09-21 | 24/25 | 25/25 | PASS |
| 2026-09-22 | 24/25 | 22/25 | PASS |
| 2026-09-23 | 25/25 | 25/25 | PASS |
| 2026-09-24 | 22/25 | 23/25 | PASS |
| 2026-09-25 | 25/25 | 23/25 | PASS |
| 2026-09-28 | 19/25 | 17/25 | FAIL, EXCLUDED |
| 2026-09-29 | 13/25 | 12/25 | FAIL, EXCLUDED |

A session is gated as a whole: it is kept only if both its 09:25 and 10:00 checkpoints reach 22 of 25. Its 08:00 and 09:00 checkpoints have no assessment of their own and ride on that session gate.

**Every stored name the reconstruction missed is outside $1 to $20 at t, in both the stored and the reconstructed price** (sub-$1 names, plus ELMT, MG, PARK, QURE, SRZN above $20). Production ranks them because the latch keeps a name that once qualified rank-eligible after it leaves the band (`engine.ts:1744-1745`); the registered reconstruction does not replay the latch. On 09-28 and 09-29 production carried many latched sub-$1 names in its top 25, so those two sessions fail and are excluded. No in-band stored name was missed on any checkpoint.

Missing names per checkpoint:

- 2026-09-14 09:25: ELMT (stored #6, $23.0209)
- 2026-09-14 10:00: ELMT (stored #6, $21.97), CTNT (stored #11, $0.34), EU (stored #25, $0.8423)
- 2026-09-15 09:25: EQS (stored #8, $0.98), FCHL (stored #18, $0.95)
- 2026-09-15 10:00: EQS (stored #10, $0.965), HCAI (stored #20, $0.605)
- 2026-09-16 09:25: BENF (stored #3, $0.8334), FCHL (stored #19, $0.9999), REED (stored #23, $0.8868)
- 2026-09-16 10:00: DLXY (stored #1, $0.6598), BENF (stored #3, $0.6781)
- 2026-09-17 09:25: DTSS (stored #3, $0.864), NUWE (stored #6, $0.8785), RETO (stored #11, $0.5999)
- 2026-09-17 10:00: NUWE (stored #10, $0.9299), RETO (stored #17, $0.5036)
- 2026-09-18 09:25: MASK (stored #20, $0.911)
- 2026-09-18 10:00: SOS (stored #4, $0.6892), MG (stored #20, $21.0174)
- 2026-09-21 09:25: VRME (stored #10, $0.9499)
- 2026-09-22 09:25: MASK (stored #9, $0.86)
- 2026-09-22 10:00: CWD (stored #3, $0.7551), LHSW (stored #8, $0.9883), MASK (stored #12, $0.865)
- 2026-09-24 09:25: SRZN (stored #10, $30), HIHO (stored #19, $0.92), PMAX (stored #20, $0.9883)
- 2026-09-24 10:00: SRZN (stored #6, $32.16), AMST (stored #12, $0.9875)
- 2026-09-25 10:00: AXG (stored #23, $0.4828), PARK (stored #25, $20.3999)
- 2026-09-28 09:25: ARAY (stored #2, $0.295), KNDI (stored #5, $0.617), SOAR (stored #12, $0.4049), YDKG (stored #13, $0.87), FUSE (stored #17, $0.5837), MRM (stored #23, $0.8364)
- 2026-09-28 10:00: MTEK (stored #2, $0.971), ARAY (stored #3, $0.3032), KNDI (stored #7, $0.6101), SOAR (stored #12, $0.3431), GYGY (stored #13, $0.9997), WBUY (stored #14, $0.9998), YDKG (stored #17, $0.8913), FUSE (stored #23, $0.5902)
- 2026-09-29 09:25: SLND (stored #1, $0.8968), TEAD (stored #3, $0.4104), EVGN (stored #4, $0.3705), ILLR (stored #5, $0.1709), KALA (stored #10, $0.4138), CYAB (stored #11, $0.1943), SLXN (stored #12, $0.3099), QURE (stored #13, $22), NIVF (stored #15, $0.0833), IVVD (stored #18, $0.9249), BYSI (stored #24, $0.831), AMSS (stored #25, $0.6123)
- 2026-09-29 10:00: SLND (stored #1, $0.8791), TEAD (stored #3, $0.44), EVGN (stored #4, $0.3606), ILLR (stored #5, $0.2141), SLXN (stored #10, $0.3471), QURE (stored #11, $24.661), KALA (stored #12, $0.4055), CYAB (stored #13, $0.1992), NIVF (stored #14, $0.0826), MITQ (stored #19, $0.5595), AMSS (stored #20, $0.6294), IVVD (stored #24, $0.9185), ONFO (stored #25, $0.9899)

## 2. Rule results on gated checkpoints

Gated sessions: 10 (2026-09-14, 2026-09-15, 2026-09-16, 2026-09-17, 2026-09-18, 2026-09-21, 2026-09-22, 2026-09-23, 2026-09-24, 2026-09-25). Gated checkpoints: 40.

- Names added per checkpoint: min 0, median 0, max 3; total 19.
- Cap binding (qualifying names beyond K = 10): 0 of 40 checkpoints; names left off by the cap, total 0.
  - 08:00: added min 0, median 0, max 0; cap binds 0 of 10.
  - 09:00: added min 0, median 0, max 0; cap binds 0 of 10.
  - 09:25: added min 0, median 0, max 1; cap binds 0 of 10.
  - 10:00: added min 1, median 1.5, max 3; cap binds 0 of 10.

## 3. PASS clause (1)

PASS. On all 40 gated checkpoints, no in-band name with percent_change >= 20% and a move larger than the smallest added name was left off. Checked by scanning every in-band, off-top-50 name at each checkpoint, not by assuming the sort.

Clause (2), VEEA today, is a live read through Ops and is not part of this local check.

## Largest added moves (each symbol at its largest added reading)

| Symbol | Session | Checkpoint | percent_change | RVOL rank | Price |
|---|---|---|---|---|---|
| FTFT | 2026-09-16 | 10:00 | +39.8% | 56 | $8.03 |
| NCPL | 2026-09-23 | 10:00 | +36.0% | 1340 | $1.32 |
| SVRN | 2026-09-18 | 10:00 | +35.3% | 54 | $19.20 |
| AEHL | 2026-09-17 | 10:00 | +33.0% | 111 | $12.27 |
| CMND | 2026-09-17 | 10:00 | +27.8% | 72 | $1.03 |
| AIXC | 2026-09-22 | 10:00 | +27.1% | 98 | $1.41 |
| BMGL | 2026-09-17 | 10:00 | +27.1% | 2240 | $5.21 |
| GDC | 2026-09-23 | 10:00 | +24.2% | unranked | $1.81 |
| GRML | 2026-09-24 | 10:00 | +24.1% | 91 | $13.89 |
| LGCL | 2026-09-23 | 10:00 | +23.5% | 131 | $3.42 |
| RTB | 2026-09-23 | 09:25 | +23.1% | 176 | $11.76 |
| PTLE | 2026-09-15 | 10:00 | +22.4% | 57 | $8.64 |
| USDE | 2026-09-21 | 10:00 | +20.9% | 100 | $12.32 |
| BENF | 2026-09-25 | 10:00 | +20.7% | 212 | $1.75 |
| BIAF | 2026-09-18 | 10:00 | +20.7% | 84 | $10.56 |

Distinct symbols added across gated checkpoints: 15. Added names with no universe row: none.

## Per checkpoint detail

### 2026-09-14 08:00 ET

Ranked names: 1390. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: DERM +10.7% (rank 943, $8.00).

### 2026-09-14 09:00 ET

Ranked names: 1567. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: DERM +10.7% (rank 966, $8.00).

### 2026-09-14 09:25 ET

Ranked names: 1633. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: DERM +10.7% (rank 1060, $8.00).

### 2026-09-14 10:00 ET

Ranked names: 2634. Qualifying off-board names: 1. Added: 1. Beyond K: 0.
Largest in-band move off the top 50 before the rule: AIXC +21.0% (rank 911, $1.08).

| Added | percent_change | RVOL rank | Price |
|---|---|---|---|
| AIXC | +21.0% | 911 | $1.08 |

### 2026-09-15 08:00 ET

Ranked names: 1200. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: ARBB +9.9% (rank 69, $4.79).

### 2026-09-15 09:00 ET

Ranked names: 1368. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: MCRB +13.3% (rank 347, $5.36).

### 2026-09-15 09:25 ET

Ranked names: 1437. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: MCRB +13.3% (rank 394, $5.36).

### 2026-09-15 10:00 ET

Ranked names: 2594. Qualifying off-board names: 1. Added: 1. Beyond K: 0.
Largest in-band move off the top 50 before the rule: PTLE +22.4% (rank 57, $8.64).

| Added | percent_change | RVOL rank | Price |
|---|---|---|---|
| PTLE | +22.4% | 57 | $8.64 |

### 2026-09-16 08:00 ET

Ranked names: 1197. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: ANTA +18.8% (rank 204, $4.17).

### 2026-09-16 09:00 ET

Ranked names: 1388. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: FTFT +16.4% (rank 65, $6.68).

### 2026-09-16 09:25 ET

Ranked names: 1474. Qualifying off-board names: 1. Added: 1. Beyond K: 0.
Largest in-band move off the top 50 before the rule: FTFT +22.4% (rank 65, $7.03).

| Added | percent_change | RVOL rank | Price |
|---|---|---|---|
| FTFT | +22.4% | 65 | $7.03 |

### 2026-09-16 10:00 ET

Ranked names: 2585. Qualifying off-board names: 1. Added: 1. Beyond K: 0.
Largest in-band move off the top 50 before the rule: FTFT +39.8% (rank 56, $8.03).

| Added | percent_change | RVOL rank | Price |
|---|---|---|---|
| FTFT | +39.8% | 56 | $8.03 |

### 2026-09-17 08:00 ET

Ranked names: 1281. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: YMAT +9.4% (rank 285, $1.51).

### 2026-09-17 09:00 ET

Ranked names: 1486. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: AXG +10.5% (rank 613, $2.31).

### 2026-09-17 09:25 ET

Ranked names: 1570. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: WATR +14.1% (rank 956, $1.94).

### 2026-09-17 10:00 ET

Ranked names: 2605. Qualifying off-board names: 3. Added: 3. Beyond K: 0.
Largest in-band move off the top 50 before the rule: AEHL +33.0% (rank 111, $12.27).

| Added | percent_change | RVOL rank | Price |
|---|---|---|---|
| AEHL | +33.0% | 111 | $12.27 |
| CMND | +27.8% | 72 | $1.03 |
| BMGL | +27.1% | 2240 | $5.21 |

### 2026-09-18 08:00 ET

Ranked names: 1225. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: SVRN +12.8% (rank 65, $16.00).

### 2026-09-18 09:00 ET

Ranked names: 1380. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: SVRN +17.0% (rank 64, $16.60).

### 2026-09-18 09:25 ET

Ranked names: 1465. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: SVRN +17.5% (rank 69, $16.67).

### 2026-09-18 10:00 ET

Ranked names: 2610. Qualifying off-board names: 2. Added: 2. Beyond K: 0.
Largest in-band move off the top 50 before the rule: SVRN +35.3% (rank 54, $19.20).

| Added | percent_change | RVOL rank | Price |
|---|---|---|---|
| SVRN | +35.3% | 54 | $19.20 |
| BIAF | +20.7% | 84 | $10.56 |

### 2026-09-21 08:00 ET

Ranked names: 1442. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: RIBB +15.6% (rank 907, $8.90).

### 2026-09-21 09:00 ET

Ranked names: 1600. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: PHOS +15.6% (rank 115, $18.27).

### 2026-09-21 09:25 ET

Ranked names: 1654. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: RIBB +15.6% (rank 1175, $8.90).

### 2026-09-21 10:00 ET

Ranked names: 2652. Qualifying off-board names: 1. Added: 1. Beyond K: 0.
Largest in-band move off the top 50 before the rule: USDE +20.9% (rank 100, $12.32).

| Added | percent_change | RVOL rank | Price |
|---|---|---|---|
| USDE | +20.9% | 100 | $12.32 |

### 2026-09-22 08:00 ET

Ranked names: 1288. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: WAVE +15.8% (rank 286, $6.88).

### 2026-09-22 09:00 ET

Ranked names: 1458. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: WAVE +15.8% (rank 404, $6.88).

### 2026-09-22 09:25 ET

Ranked names: 1525. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: WAVE +15.8% (rank 452, $6.88).

### 2026-09-22 10:00 ET

Ranked names: 2606. Qualifying off-board names: 2. Added: 2. Beyond K: 0.
Largest in-band move off the top 50 before the rule: AIXC +27.1% (rank 98, $1.41).

| Added | percent_change | RVOL rank | Price |
|---|---|---|---|
| AIXC | +27.1% | 98 | $1.41 |
| AEHL | +23.8% | 2016 | $8.57 |

### 2026-09-23 08:00 ET

Ranked names: 1299. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: ADVB +13.6% (rank 1034, $7.25).

### 2026-09-23 09:00 ET

Ranked names: 1486. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: BLIV +16.7% (rank 396, $2.51).

### 2026-09-23 09:25 ET

Ranked names: 1540. Qualifying off-board names: 1. Added: 1. Beyond K: 0.
Largest in-band move off the top 50 before the rule: RTB +23.1% (rank 176, $11.76).

| Added | percent_change | RVOL rank | Price |
|---|---|---|---|
| RTB | +23.1% | 176 | $11.76 |

### 2026-09-23 10:00 ET

Ranked names: 2634. Qualifying off-board names: 3. Added: 3. Beyond K: 0.
Largest in-band move off the top 50 before the rule: NCPL +36.0% (rank 1340, $1.32).

| Added | percent_change | RVOL rank | Price |
|---|---|---|---|
| NCPL | +36.0% | 1340 | $1.32 |
| GDC | +24.2% | unranked | $1.81 |
| LGCL | +23.5% | 131 | $3.42 |

### 2026-09-24 08:00 ET

Ranked names: 1319. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: SONM +14.4% (rank 248, $4.13).

### 2026-09-24 09:00 ET

Ranked names: 1502. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: SONM +14.4% (rank 361, $4.13).

### 2026-09-24 09:25 ET

Ranked names: 1577. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: SONM +14.4% (rank 402, $4.13).

### 2026-09-24 10:00 ET

Ranked names: 2647. Qualifying off-board names: 2. Added: 2. Beyond K: 0.
Largest in-band move off the top 50 before the rule: NCPL +35.6% (rank 56, $1.41).

| Added | percent_change | RVOL rank | Price |
|---|---|---|---|
| NCPL | +35.6% | 56 | $1.41 |
| GRML | +24.1% | 91 | $13.89 |

### 2026-09-25 08:00 ET

Ranked names: 1233. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: AVAT +12.2% (rank 132, $2.02).

### 2026-09-25 09:00 ET

Ranked names: 1399. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: NCPL +15.0% (rank 54, $1.46).

### 2026-09-25 09:25 ET

Ranked names: 1489. Qualifying off-board names: 0. Added: 0. Beyond K: 0.
Largest in-band move off the top 50 before the rule: PDC +16.7% (rank 597, $4.20).

### 2026-09-25 10:00 ET

Ranked names: 2599. Qualifying off-board names: 1. Added: 1. Beyond K: 0.
Largest in-band move off the top 50 before the rule: BENF +20.7% (rank 212, $1.75).

| Added | percent_change | RVOL rank | Price |
|---|---|---|---|
| BENF | +20.7% | 212 | $1.75 |

## Departures from the registration and limits

- None in parameters. Interpretations stated above: price "at or before t" read as bars closed by t; universe eligibility for ranking follows the engine (flag 1 required) and for the rule follows `readRangeCandidates` (flag 1 or no row), per the spec's own description of each.
- The gate fails only on latched out-of-band names. Because the latch is not replayed, the reconstructed top 50 contains in-band names that production's top 50 would have displaced with latched names; on those checkpoints production's rule would see a slightly larger off-board pool than this replay does (inferred, not measured).
- Stored assessment prices are live trade prices a few seconds after t; the reconstruction uses the prior minute close. 15 of 600 gate rows differ by more than 5 percentage points of percent_change for that reason; the reference close itself agrees on 600 of 600.
- Sessions 09-28 and 09-29 are excluded by the gate, so the rule results cover ten sessions, not twelve.
