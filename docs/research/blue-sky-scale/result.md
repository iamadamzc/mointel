# Blue-sky scale count: RESULT

*Seat `local_5f4bfcf8` (Research-tmi), 2026-10-02. Pre-registration `258624e2` (`prereg.md`), run on HIS yes ("go all 3"). Store: the 2026-10-02 production snapshot (`market-prod-2026-10-02.db`, sha256 `9f0efa03...`, verified locally; instant 2026-10-03T00:12:20Z). Raw `69e812a8`, committed before it was read.*

**Production functions, tradingDate 2026-10-02:** 1,214 symbols with `daily_bars`, 0 errors.

**On the board:** any checkpoint row in the last 5 sessions (09-28 to 10-02), 330 tickers.

| Group | Definition | Symbols | On board, last 5 sessions |
|---|---|---|---|
| **A, SHOWN NOW** | verified, and the ceiling sits behind a known consolidation | **79** | **22** |
| B, shown, basis unknown | verified, ceiling's split factor never established | 207 | 8 |
| C, latent | refused today only by the basis check; would show after a deep pass makes the rows one vintage | 104 | 34 |

**Positive control:** GNPX is in C. PASS.

**Spot-check of A on the board (top by deep ceiling):**

| Symbol | Shown today as overhead | Its date | Split factor | Comparable ceiling (what the fix shows) |
|---|---|---|---|---|
| EZRA | $106,996.98 | 2022-01-05 | 10,200 | $5.45 (2026-05-22) |
| GMM | $56,152.50 | 2017-10-16 | 750 | $5.79 (2026-07-10) |
| BTTC | $21,996.00 | 2016-10-05 | 3,600 | $39.00 (2025-10-02) |
| SLXN | $18,302.76 | 2024-08-07 | 1,350 | $5.45 (2026-05-29) |
| SDOT | $10,180.00 | 2020-03-18 | 2,000 | $106.00 (2026-07-02) |

Every A symbol's factor is above 1 (reverse splits); none are forward splits.

## What it means

- **The defect is live on production today:** 22 names his board carried this week would print a pre-consolidation "overhead" in the drawer.
- **About as many more would print one after their next deep pass** (C, 34 on board). GNPX on 2026-09-23 was one of these.
- **The fix** (`research/bluesky-comparable`, head `bac44069`; gate green; Marketing's words) moves all of A and C to the comparable ceiling, or to UNVERIFIED when no comparable ceiling exists.
- **B (207 symbols, 8 on board) is NOT addressed by the fix, deliberately.** Their split factor was never established, so the ceiling may or may not be pre-split. Refusing them would refuse blue sky across most of the board. A deep pass establishes the factor, and with it they become either comparable or A/C, which the fix then handles.
