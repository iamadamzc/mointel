# R1 re-run at 90 days: RESULT

*Research-tmi, 2026-10-05. Registration `split-proof-r1-registration-2026-10-05.md` (`2c325f05`), library function `lib/research/splitProof.ts` and script `state-table-r1.ts` (`95f017bd`), raw `state-table-r1-out-2026-10-05.json` committed at `2994b8a3` before it was read. No new sample: both draws re-read from the stored raw names and the local scratch copy of the store. $0.*

**The registered checks held.** The library R1 reproduces the replay's counts on both draws (first draw 6 NONE / 6 FOUND / 18 UNPROVEN of 30 counted; fresh draw 6 / 3 / 21), and no name R0 found a split for reads NONE.

## The registered state table at 90 days, with R1 as the split proof

| Draw (names) | Issuance rule | PRODUCED | issuance | split | too old | UNKNOWN (no count) |
|---|---|---|---|---|---|---|
| first, 2026-09-28 to 10-01 (36) | KNOWN_ACTIVE | **3** | 14 | 12 | 1 | 6 |
| first (36) | KNOWN + POSSIBLY_ACTIVE | **1** | 21 | 7 | 1 | 6 |
| fresh, 2026-09-23 to 25 (35) | KNOWN_ACTIVE | **2** | 12 | 14 | 2 | 5 |
| fresh (35) | KNOWN + POSSIBLY_ACTIVE | **2** | 25 | 2 | 1 | 5 |

Over both draws (71 names): a number for **5 names (7 percent) under KNOWN_ACTIVE and 3 (4 percent) under the wider issuance rule**. At 45 days the same tables give 1 and 2 for KNOWN_ACTIVE, 0 and 2 for the wider rule.

## What it says

- **The 90-day maximum and R1 together still leave the column dark for about nine names in ten.** The gates that remain are issuance (12 to 25 flagged per draw), a split actually found in the span (R1 resolves the missing bar, not the real splits), and, for the split-proof column, spans whose nulls are older than the checkpoint day (those stay UNPROVEN under R1; R2 and R3 would admit a few more at more risk).
- **The issuance flag's miss rate is unmeasured at every age** (Commercial 5i), so 90 days widens a window whose protection nobody has tested. The pass of the validation audit is about the arithmetic, not about that.
- This is a count of 71 names on seven recap days, twice read; it is a description of the board on those days, not a forecast.
