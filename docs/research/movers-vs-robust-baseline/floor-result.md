# Movers floor: is 20% right, and what does it change? RESULT, as registered (`7492e845`)

*Seat `local_5f4bfcf8`, 2026-10-01. His question, verified at 15:31:15Z. Script `floors.js`, raw `floors-raw.json`; the A replay's reconstruction (local copy, 10 sessions 09-14 to 09-25, checkpoints 08:00, 09:00, 09:25 and 10:00 ET, band $1 to $20). Instrument check passed: at 20% with K = 10 it reproduces A's 19 additions exactly. Today's live counts are Ops's, read separately.*

## The table

Rows are in-band movers added under the RVOL top 50, over 40 checkpoints.

| Floor | Rows per checkpoint, typical (median) | Most at one checkpoint | Before 09:30 (08:00 / 09:00 / 09:25, max) | Cap of 10 hides a mover | Total rows (distinct names) | Still at or above the floor 60 min later |
|---|---|---|---|---|---|---|
| **10%** | 5 | **29 uncapped** (10 with the cap) | 6 / 7 / 11 | **yes: on 8 of 40 checkpoints, 51 left off** | 273 (167) uncapped | 56% |
| **15%** | 1 | **8** | 1 / 2 / 3 | never | 63 (41) | 60% |
| **20%** (as built) | 0 | 3 | 0 / 0 / 1 | never | 19 (15) | 47% |
| 25% | 0 | 3 | 0 / 0 / 0 | never | 8 (7) | 50% |
| 30% | 0 | 1 | 0 / 0 / 0 | never | 5 (4) | 60% (n = 5) |

**Reading it:**
- **Lowering 20% to 15% triples the movers rows** (19 to 63 over 40 checkpoints). It also starts catching them before the open (up to 2 at 09:00 and 3 at 09:25, where 20% catches none at 09:00 and 1 at 09:25), and it never needs the cap.
- **10% is a different product.** About 5 rows on a typical checkpoint and up to 29 at 10:00. With the cap of 10 it hides 51 movers, so it breaks "no mover off the board"; without the cap it is a gainers list.
- **The 60-minute check does not favour any floor** (47% to 60%, small samples at 25% and 30%). On this data a lower floor does not add more fleeting names. This describes the names; it is not a claim about trades.

## What each step down adds (examples, as registered)

**15% adds, beyond 20%** (largest first):
- USDE 09-17 10:00, +19.9%, rank 610, $7.43. It was **+41.4%** 60 minutes later.
- SOWG 09-21 10:00, +19.3%, rank 534, $2.90. +5.3% later.
- NXTT 09-21 10:00, +19.3%, rank 117, $6.39. +25.4% later.

**10% adds, beyond 15%** (largest first, so just under 15%):
- MEDS 09-21 09:25, +15.0%, rank 310. +17.8% later.
- NCPL 09-25 09:00, +15.0%, rank 54. +19.3% later.
- AESI 09-25 09:00, +14.9%, rank 189. +17.5% later.

**20% adds, beyond 25%:**
- GDC 09-23, +24.2%, unranked. +17.1% later.
- GRML 09-24, +24.1%. +35.2% later.
- AEHL 09-22, +23.8%. +19.9% later.

**25% adds, beyond 30%:**
- CMND 09-17, +27.8%. +14.8% later.
- AIXC 09-22, +27.1%. +24.3% later.
- BMGL 09-17, +27.1%. +18.0% later.

**30% adds** (largest):
- FTFT 09-16, +39.8%. +32.1% later.
- NCPL 09-23, +36.0%. +15.7% later.
- NCPL 09-24, +35.6%. +45.3% later.

## "Any mover in the market": what no floor can do

The board shows only the served price band. At every floor some movers are outside it, almost all of them **under $1**. Per checkpoint (median / max), outside $1 to $20:

| Floor | Under $1 | Over $20 |
|---|---|---|
| 10% | 4 / 9 | 1 / 5 |
| 15% | 2 / 6 | 0 / 2 |
| 20% | 1.5 / 3 | 0 / 2 |
| 25% | 1 / 3 | 0 / 1 |
| 30% | 1 / 2 | 0 / 1 |

**No floor puts these on the board; only the band setting does.** That is a separate choice of his.

## Recommendation, from the measurement

**15%, keeping the cap of 10.** It is the lowest floor here that never needed the cap, so no qualifying mover is hidden. It typically adds about one row, and catches movers before the open that 20% misses. 10% either hides movers behind the cap or turns the group into a gainers list. Whether 15% reads as "a mover" is his call.

**What this does not show:** ten sessions only; no claim about trades; the latch and after-hours are not replayed; the band was fixed at $1 to $20 for the replay.
