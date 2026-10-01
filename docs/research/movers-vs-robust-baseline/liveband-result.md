# Movers on the live band, and NOW coverage: RESULT, as registered (`1314ae7b`)

*Seat `local_5f4bfcf8`, 2026-10-01. Script `liveband.js`, raw `liveband-raw-0.25.json` and `liveband-raw-1.json`. Local copy, read-only.*

## Instrument

- **Check 2 PASSED:** the same script at band $1 to $20 reproduces `floors-raw.json` exactly (every floor, uncapped, no volume floor, the ten A sessions).
- **The live-band gate FAILS on 10 of 12 sessions.** Reconstructed top 25 vs stored top 25, 09:25 / 10:00:

  | Session | Overlap at 09:25 / 10:00 | Gate |
  |---|---|---|
  | 09-14 | 19 / 20 | FAIL |
  | 09-15 | 21 / 22 | FAIL |
  | 09-16 | 20 / 21 | FAIL |
  | 09-17 | 22 / 23 | PASS |
  | 09-18 | 19 / 19 | FAIL |
  | 09-21 | 20 / 23 | FAIL |
  | 09-22 | 19 / 22 | FAIL |
  | 09-23 | 20 / 20 | FAIL |
  | 09-24 | 21 / 21 | FAIL |
  | 09-25 | 22 / 21 | FAIL |
  | **09-28** | **25 / 25** | **PASS** |
  | 09-29 | 21 / 21 | FAIL |

  At $1 the pattern is the mirror: 09-14 to 09-25 pass and 09-28 / 09-29 fail (19/17, 13/12).
- **INFERENCE, labelled (the store keeps no band per checkpoint; `desk_assessments` has no band field):** production ranked on about $1 to $20 through 09-25 and on $0.25 to $20 by 09-28. **So the A replay's account of its 09-28 / 09-29 failures ("latched sub-$1 names") is probably wrong:** those names were in band. The A replay's 10 sessions match production's band in that window, so its results stand for that window.

## Live band ($0.25 to $20), the 2 gated sessions (09-17, 09-28), 8 checkpoints: THIN

| Floor | Volume floor | Typical rows (median) | **Cap needed (max at once)** | Cap 10 hides | Rows | 60-min hold | **Live on NOW** (rank 250 or better) |
|---|---|---|---|---|---|---|---|
| 10% | none | 7 | 36 | on 2 of 8 | 79 | 51% | 48% |
| 10% | 100k | 0 | 20 | on 1 of 8 | 27 | 70% | 70% |
| **10%** | **500k** | **0** | **13** | **on 1 of 8** | **17** | **71%** | **76%** |
| 10% | 1M | 0 | 9 | never | 12 | 92% | 83% |
| **15%** | **none** | **1** | **10** | **never** | **16** | **56%** | **56%** |
| 15% | 500k | 0 | 6 | never | 9 | 67% | 78% |
| 20% | none | 0 | 4 | never | 6 | 67% | 83% |
| 20% | 500k | 0 | 3 | never | 5 | 80% | 100% |

**What 15% needs on the live band:** a cap of 10 at most, with no volume floor. It touched 10 on these sessions; today's 11:32 ET read (Ops `f1c0628d`) had 11.

## NOW coverage on the ten $1-band sessions (POST HOC, not registered; the band production used then)

| Floor | Live on NOW |
|---|---|
| 10% + 500k | **82%** (51 of 62) |
| 10% + 1M | 89% |
| 15% alone | 57% |
| 20% alone | 74% |

## Reading, by the registered rule

- **10% + 500k: 76% live on NOW** (82% on the ten $1 sessions). That is between 50% and 80%, so both paths are stated.
  - **Most of its movers are already live on NOW without any worker change:** they are latched and ranked inside the top 250.
  - **About 1 in 4 to 5 are not.** Those ranked worse than about 250 sit below the live rows under NOW. Only for them would the market-worker change (and its restart) matter.
- **A volume floor also raises NOW coverage** (10%: 48%, then 70%, 76%, 83% as the floor rises). Thin movers are the low-ranked ones.
- **Cap:** on the live band, 10% + 500k needed 13 at one checkpoint, so a cap of 10 would hide a mover there. **A cap of 15 covers every checkpoint measured**, eight on the live band and forty at $1.

## What this does not show

- Two live-band sessions only.
- "Rank 250 or better" is a proxy for the live set: the alive filter and pins are not replayed.
- No claim about trades.
