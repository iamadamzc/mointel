# Reports v6, step 1b: can the store check Marketing's narrative facts F6 to F9?

*Seat `local_5f4bfcf8`, 2026-10-02. Answers Marketing-tmi's questions (its message after `771898f4`). **His words, verified at his turn** (Marketing's session `2bb33112`, 2026-10-02T02:41:33.543Z): "the opening narrative should include a general summary of the previous session, things like 'there were x stocks that moved over 50%, x of them gave the entire move back. The cohort included 2 fresh news catalyst. x of x were bio tech companies, so that may be a theme. Looking ahead at the next session we are tracking these x stocks.' ... not verbatim, but understand the gist we want to communicate and make it helpful." Every file:line below was opened on the production line `2a625a5b`.*

## What the store holds that matters here

- **The 16:00 freeze.** At the close the engine freezes `rthFinal = { close: the RTH close, high: sessionHigh, ... }` (`engine.ts:852-858`). `sessionHigh` is the max of every bar and trade from 04:00 (`engine.ts:1142`, `:1546`), so the frozen high covers premarket plus RTH. It is persisted as `ticker_session.rth_final_close` and `rth_final_high` (`db.ts:149-150`) with a first-write latch (`repo.ts:969-970` on this line). So **after 16:00 these values never change.**
- **The prior close** is `ticker_session.previous_close` (`db.ts:72`).
- **A checkpoint freezes:** the range-wide counts (eligible, traded, up, down; `computeRangeCounts`, `assessmentRepo.ts:696-733`), plus the COVERED names' rows (`desk_assessment_tickers`, `db.ts:621-665`, including `session_high`, `price` and `reference_close`).

## Answers

| Fact | Checkable? | Source and population | For which reports |
|---|---|---|---|
| **F6: "x moved over 50%"** | **YES for the recap, range-wide.** For the intraday kinds, covered names only. | Recap: in-range eligible names on `ticker_session` for the date with `rth_final_high >= 1.5 x previous_close`, read from frozen 16:00 values. Intraday: covered rows with `session_high >= 1.5 x reference_close`, labelled "of the names the desk covered". | Premarket (recap): range-wide. Into RTH / power hour / after hours: covered only. |
| **F7: "x of them gave the entire move back"** | **YES for the recap**, within the F6 set | Of the F6 names, `rth_final_close <= previous_close`, i.e. closed RTH at or below the prior close. **"Entire move" is defined as that**; any other definition needs Marketing's words and his. | Recap only. Intraday is not a finished move, as Marketing says. |
| **F3: fresh catalyst count** | YES (step 1) | FRESH_FOUND among the covered names' as-of dossiers. Agreed: found, not causation. | All kinds |
| **F8: "x of x were biotech, a possible theme"** | **NOT TODAY.** | A sector field exists: `issuer_registry.sic_description` (EDGAR's industry text, `db.ts:391-393`). But **the code that fills it has not shipped** (`a4a92a8f` on `research/sic-write`, waiting on the v28 main twin), so it is empty. Once filled, a count is traceable only with a FIXED mapping from SIC text to "biotech" (e.g. Pharmaceutical Preparations, Biological Products), and that mapping is his and Marketing's to approve. The hedge "a possible theme" needs a checker policy: proposal, the count states, and the hedge is fixed template text the checker allows only beside a traced count. | After the SIC write ships |
| **F9: "into the next session the desk is tracking these x"** | **Only as the recap checkpoint's own covered names.** | His pins are NOT stored: Focus became browser-only by his ruling (`db.ts:530-550`; the table is kept as history, with no writer). The only stored forward set is the 22:00 recap checkpoint's rows. So "tracking" can only mean "the names this report covers", which the report already lists. | Recap |

## Two options for range-wide F6 and F7 on EVERY kind (not needed for the recap)

1. **Accept covered-only for intraday**, and label it.
2. **Ops adds two counts to the frozen range row** (a moved-50% count and a gave-it-back count, as `counts_version 2` in `computeRangeCounts`). Then every kind reads one frozen number. That is a store change (Ops's) and a schema bump.

## The population question to settle before any SQL is registered

F1's counts use the in-range price **at capture** (`assessmentRepo.ts:716`). For F6 and F7 on the recap, the same rule at 22:00 reads after-hours prices. **Proposal:** F6 and F7 use the same population as F1 (in range at capture, board eligibility), so the three numbers describe one set.
