# Blue-sky scale count: pre-registered before the data exists

*Seat `local_5f4bfcf8` (Research-tmi), 2026-10-02. Written and committed BEFORE tonight's snapshot copy lands. Integration approved the method (Integration-tmi 22nd, 2026-10-02).*

## The question

How many symbols would show a blue-sky ceiling taken from before a stock consolidation, and labelled as a traded level? Of those, how many were on the board in the last 5 sessions?

Background: the GNPX finding and its correction (research.md ERROR LEDGER). The absurd label appears only when the basis check vouches for the rows AND the pre-split ceiling clears the spike and corroboration guards.

## Instrument

- **Store:** tonight's production snapshot copy (Ops, 20:12 ET 2026-10-02), read-only and local. No box reads.
- **Code:** the production functions themselves, NOT a reimplementation:
  - `readDailyBars(db, symbol, 100000, 'INCLUDE')` (the same depth and inclusion as `readModel.ts:~405`);
  - `dailyBarBasis`;
  - `resolveBlueSkyThreshold`.
  - `lib/market/blueSky.ts` and `lib/research/history.ts` are byte-identical between production `28c66f14` and `origin/main` at registration (`git diff --stat` empty).
- **tradingDate:** `2026-10-02`, the board day of the snapshot. Bars dated that day are excluded, as the board excludes them.
- **Symbols:** every DISTINCT `symbol` in `daily_bars`.

## Counts (definitions fixed here)

| Code | Definition | What it means |
|---|---|---|
| **A, SHOWN NOW** | `verified === true` AND `ceilingComparable === false` | The board would print a pre-consolidation ceiling as a traded level today |
| **B, SHOWN, BASIS UNKNOWN** | `verified === true` AND `ceilingComparable === null` | The board prints a ceiling whose split basis was never established |
| **C, LATENT** | NOT verified now, BUT verified with `ceilingComparable === false` when the same bars are run with `adjustment: 'split'` forced | Refused today only by the basis check; would print after a deep pass makes the rows one vintage (GNPX's state on 2026-09-23) |
| **N** | symbols with any `daily_bars` | The denominator |

**On the board in the last 5 sessions:** a symbol appears in `desk_assessment_tickers` for any assessment whose `desk_assessments.trading_date` is among the 5 latest distinct trading dates on or before 2026-10-02. Reported for A, B and C separately.

## Output and discipline

- **Script:** `docs/research/blue-sky-scale/scale.ts`, committed with this file.
- **Raw output:** `raw-<snapshot date>.json` (every A, B and C symbol, with ceiling, date, factor, comparableCeiling and on-board flag) plus a summary text file. **Committed before anyone reads it.**
- **No verdict line is pre-set.** This is a count for sizing, not a pass/fail test. It goes to Integration and, through it, to him.
- **Positive control** (the instrument must be able to see a present case): GNPX must appear in C. Its stored rows are two vintages with a factor-44000 ceiling, and forcing the basis is exactly the GNPX-on-09-23 state. **If GNPX is not in C, the count is withheld and the script is examined first.**
