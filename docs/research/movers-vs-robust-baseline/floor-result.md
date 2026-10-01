# Movers floor: is 20% right, and what does it change? RESULT, as registered (`7492e845`)

*Seat `local_5f4bfcf8`, 2026-10-01. His question, verified at 15:31:15Z. Script `floors.js`, raw `floors-raw.json`; the A replay's reconstruction (local copy, 10 sessions 09-14 to 09-25, checkpoints 08:00, 09:00, 09:25 and 10:00 ET, band $1 to $20). Instrument check passed: at 20% with K = 10 it reproduces A's 19 additions exactly. Today's live counts are Ops's, read separately.*

> **⚠️ BAND CORRECTION (Integration's catch, after `2fce3d4d`).** Every replay number in this file uses the A replay's band, **$1 to $20**. **The live board serves $0.25 to $20** (Ops `f1c0628d`, the worker's `discovery_summary`: priceMin 0.25, priceMax 20; also the qualify band in research.md's post-restart item 1). So on the live board:
> - **Movers from $0.25 to $1 CAN be shown.** The replay left them out, so every row count below UNDERSTATES what each floor adds live.
> - The section on movers outside the band was wrong as first written, and is corrected below.
>
> **A re-run on $0.25 to $20, with the volume cross and the cap 15% needs there, is queued after his answer** (Integration), and will be pre-registered first.

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
- **Lowering 20% to 15% triples the movers rows** (19 to 63 over 40 checkpoints). It also starts catching them before the open (up to 2 at 09:00 and 3 at 09:25, where 20% catches none at 09:00 and 1 at 09:25). It never needed the cap on the replay; **today's live read put it at the cap** (see "Today, live").
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

## Movers outside the REPLAY's band ($1 to $20)

~~The board shows only the served price band. At every floor some movers are outside it, almost all of them under $1.~~ **CORRECTED:** this table counts movers the REPLAY left out. On the live board ($0.25 to $20), the **under-$1 column is mostly movers the board CAN show** (from $0.25 to $1), and the replay did not test them. Only names **over $20** (and under $0.25, which this table does not separate) are outside the live band. Per checkpoint (median / max), outside $1 to $20:

| Floor | Under $1 | Over $20 |
|---|---|---|
| 10% | 4 / 9 | 1 / 5 |
| 15% | 2 / 6 | 0 / 2 |
| 20% | 1.5 / 3 | 0 / 2 |
| 25% | 1 / 3 | 0 / 1 |
| 30% | 1 / 2 | 0 / 1 |

~~No floor puts these on the board; only the band setting does.~~ **CORRECTED:** on the live band, a floor DOES add movers from $0.25 to $1. Only names over $20 or under $0.25 are beyond every floor; those depend on the band setting, his separate choice.

## Volume floor x percent floor (registered `4ab690ae`, script `floors-vol.js`)

*Integration's request after today's thin names. Volume is shares traded from 04:00 ET to the checkpoint. The instrument check passed: with no volume floor, every cell equals the table above. Uncapped; "cap hides" is with K = 10.*

| Floor | Volume floor | Rows per checkpoint (median / max) | Cap of 10 hides | Total rows (distinct) | Still at or above the floor 60 min later |
|---|---|---|---|---|---|
| 10% | none | 5 / 29 | 51 | 273 (167) | 56% |
| 10% | 100k | 1 / 15 | 6 | 101 (65) | 74% |
| **10%** | **500k** | **1 / 10** | **0** | **62 (42)** | **82%** |
| 10% | 1M | 0 / 7 | 0 | 44 (27) | 86% |
| **15%** | **none** | **1 / 8** | **0** | **63 (41)** | **60%** |
| 15% | 100k | 0 / 5 | 0 | 32 (21) | 69% |
| 15% | 500k | 0 / 4 | 0 | 23 (15) | 78% |
| 15% | 1M | 0 / 3 | 0 | 19 (12) | 79% |
| 20% | none | 0 / 3 | 0 | 19 (15) | 47% |
| 20% | 100k | 0 / 3 | 0 | 15 (11) | 53% |
| 20% | 500k | 0 / 2 | 0 | 11 (9) | 64% |
| 20% | 1M | 0 / 2 | 0 | 9 (7) | 78% |
| 25% / 30% | any | 0 / 1 to 3 | 0 | 4 to 8 | 50% to 75% (n of 8 or fewer) |

**Reading it:**
- **Within a percent floor, a volume floor sharply raises how many names are still moving an hour later** (at 10%: 56%, then 74%, 82%, 86%).
- **The percent floor alone does not** (47% to 60% across 10% to 30%, first table).
- **10% with 500k shares adds the same number of rows as 15% with no volume floor** (62 vs 63), and 82% of them hold against 60%.
- What a volume floor costs: thin names with a big percent move (today WFCF, +15.8% on 5,756 shares) are left off. Whether those count as "a mover in the market" is his call.

## Today, live (Ops `f1c0628d`, ONE moment, 11:32 ET, served band $0.25 to $20)

In-band names off the top 50 at each percent floor: **10%: 22; 15%: 11; 20%: 5; 25%: 2; 30%: 1.**

- **At 15%, today's count (11) is over the cap of 10.** One of the 11 is under $1 (TEAD, $0.61), so in the replay's $1 to $20 band it is at most 10. The replay's "the cap never binds at 15%" held on its ten days; today it would have sat at the cap.
- **By volume floor.** The file gives volumes only for the 17 names at 10 to 20%, so each count below is that part, plus up to 5 names at 20% or more whose volumes were not read:

| Floor | 100k | 500k | 1M |
|---|---|---|---|
| 10% | 14 | 5 | 1 |
| 15% | 4 | 2 | 0 |

## Recommendation, from the measurement (revised with the volume cross and today's read)

**10%, with a 500k-share volume floor, keeping the cap of 10.**
- On the replay it never needed the cap (the most at once was 10).
- It typically adds about one row, the same size as 15% alone.
- Its names hold far better an hour later (82% vs 60%).
- It shows moves from 10% up once they trade 500k shares; without a volume floor, 10% is too many rows.
- Today it would show at most 10 (5 counted, plus up to 5 unread).

**Second choice: 15% with no volume floor**, if he wants every in-band move to count however thin. The cost: on a day like today it reaches the cap, and the cap then hides the smallest move.

~~Either way, a mover under $1 or over $20 is outside the served band and no floor shows it.~~ **CORRECTED:** the live band is $0.25 to $20, so only movers under $0.25 or over $20 are beyond every floor. **Both choices above are sized on $1 to $20 and understate the live board**, which also shows $0.25 to $1 names. The live-band re-run decides the sizes and the cap.

**What this does not show:** ten sessions only; no claim about trades; the latch and after-hours are not replayed; the band was fixed at $1 to $20 for the replay.
