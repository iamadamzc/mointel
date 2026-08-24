# R&D annotation of the Sheet coverage audit

**For Integration to merge into `docs/sheet-coverage-audit.md`.** Not edited in
place — that table is Integration's. Produced 2026-08-24 against the 64 fields
`lib/data/rows.ts` defines.

`live?` marks a field that is **irreplaceable if not captured in the moment**.
`defs` marks one with more than one possible definition, which by this thread's
rule ships with its basis in an adjacent column.

## The finding, before the table

**`live?` and the PRODUCED/NEW WORK verdict answer different questions, and the
audit only asked one of them.** The verdict says whether the desk could rebuild
the *capability*. `live?` says whether it could rebuild the *history*. A field
can be fully PRODUCED and still have every past value lost forever.

The pattern is clean, and it does not follow the verdict column:

- **Anything derived from bars or filings is not live.** Prices, volumes, cycle,
  levels, prior runs, split history, the whole SEC set. Re-fetchable at any time
  — which is why this archive reconstructed five days of outcomes from a cold
  fetch after the fact, and answered the tier A count from nothing.
- **Anything that is a model judgement is live.** Not because it cannot be
  re-run, but because a re-run gives *a* grade rather than *the* grade. Catalyst
  is 45% not-unanimous over five draws; structure is 55%.
- **Anything that is a vendor snapshot is live.** Float above all — vendors keep
  no history, so an uncaptured float is simply gone.
- **A citation is live even when its target is not.** Which source the desk used
  is an act, not a fact about the world. The URL survives; the choice does not.

**26 of 64 fields are live.** The three places where liveness and verdict come
apart are where the risk actually sits:

| Field | Verdict | live? | why it matters |
| --- | --- | --- | --- |
| Catalyst Grade | PRODUCED | **LIVE** | reads safe and is not — the history is unreproducible |
| Cycle Classification | PRODUCED | — | *was* live; arithmetic since `97b4caa`, and now the only classification whose history can be rebuilt |
| Float | NEW WORK | **LIVE** | the worst pair: cannot produce it, cannot recover it |

**Ten PRODUCED fields are live** — J, K, P, W on TODAY and 13, 15, 16, 31, 32,
37 on RESEARCH. Those are the ones a retirement plan reads as safe. They are
not. Retiring the Sheet stops new rows, and for these the old rows cannot be
regenerated from anything.

**On the 65th field.** `rows.ts` defines 64 and item 6 says 65. The audit is
right that finding the missing one is itself an answer, and the shape to expect
is a column the parser does not read — which would mean it has been silently
dropped on every ingest rather than lost in a count. That makes it a live-data
question rather than an arithmetic one, and if the column carries anything the
tasks write, its history is already gone.

## Annotated tables

### Outputs — TODAY!A:AA (27)

| # | Field | Verdict | live? | defs | R&D note |
| --- | --- | --- | --- | --- | --- |
| A | Priority | NEW WORK | **LIVE** | | a judgement made at a moment; nothing re-derives what was thought then |
| B | Ticker | PRODUCED | — | | |
| C | Country of Origin | PRODUCED | — | | SEC, re-fetchable |
| D | Cycle | PRODUCED | — | ✓ | arithmetic from bars; point-in-time recompute verified in `lib/archive/cycles.ts` |
| E | RTH Close | PRODUCED | — | ✓ | auction vs last continuous tick — this archive stores both and they differ on 11% of rows |
| F | AH Price | PRODUCED | — | | |
| G | AH % | PRODUCED | — | ✓ | against which reference close; the desk's own flips at the bell |
| H | AH Volume | PRODUCED | — | | |
| I | **Float** | NEW WORK | **LIVE** | ✓ | vendor snapshot — vendors keep no history and float moves |
| J | Catalyst Grade | PRODUCED | **LIVE** | ✓ | 45% not-unanimous over five draws; a re-run gives *a* grade, not *the* grade |
| K | Catalyst | PRODUCED | **LIVE** | | model prose at a moment |
| L | Catalyst Time | PRODUCED | — | ✓ | event time vs discovery time |
| M | Recent Run High | PRODUCED | — | ✓ | which cycle, and on which share basis |
| N | Flush From High % | PRODUCED | — | ✓ | retracement of the move vs giveback below the high — two different numbers |
| O | Prior Runner | PRODUCED | — | ✓ | threshold-dependent; store the threshold |
| P | Structure Flags | PRODUCED | **LIVE** | | `structureClassification` is 55% not-unanimous |
| Q | Key Levels | PRODUCIBLE | — | ✓ | |
| R | Warning Shot | PRODUCIBLE | **LIVE** | | prose synthesis; a judgement |
| S | Notes | NEW WORK | **LIVE** | | free prose |
| T | PM Price | PRODUCED | — | | |
| U | PM % | PRODUCED | — | ✓ | as AH % |
| V | PM Volume | PRODUCED | — | | |
| W | PM Catalyst/Update | PRODUCED | **LIVE** | | a grade at a checkpoint; see J |
| X | PM Catalyst Time | PRODUCED | — | ✓ | as L |
| Y | Confirmation | NEW WORK | **LIVE** | | a judgement on whether premarket confirmed the thesis |
| Z | Revised Priority | NEW WORK | **LIVE** | | as A |
| AA | PM Warning Shot | PRODUCIBLE | **LIVE** | | as R |

### Outputs — RESEARCH!A:AK (37)

| # | Field | Verdict | live? | defs | R&D note |
| --- | --- | --- | --- | --- | --- |
| 1 | Report Date | PRODUCED | — | | |
| 2 | Ticker | PRODUCED | — | | |
| 3 | Country of Origin | PRODUCED | — | | |
| 4 | Company | PRODUCED | — | | |
| 5 | RTH Close | PRODUCED | — | ✓ | as TODAY E |
| 6 | AH Price | PRODUCED | — | | |
| 7 | AH % | PRODUCED | — | ✓ | as TODAY G |
| 8 | AH Volume | PRODUCED | — | | |
| 9 | **Float** | NEW WORK | **LIVE** | ✓ | as TODAY I — and a filing-derived float is a different word, boundary is a date |
| 10 | Float Source Date | NEW WORK | **LIVE** | | the vintage of a live-captured value is part of the value |
| 11 | Float Source URL | NEW WORK | **LIVE** | | which source was used *then*, not which exists now |
| 12 | Shares Outstanding | PRODUCED | — | ✓ | SEC fact, re-fetchable with an as-of; cover-page vs company-facts differ |
| 13 | Catalyst Details | PRODUCED | **LIVE** | | as TODAY K |
| 14 | Catalyst Timestamp | PRODUCED | — | ✓ | as TODAY L |
| 15 | Catalyst Grade | PRODUCED | **LIVE** | ✓ | as TODAY J |
| 16 | Catalyst Source URL | PRODUCED | **LIVE** | | the citation is the desk's act, not a fact about the world |
| 17 | Recent Cycle High | PRODUCED | — | ✓ | as TODAY M |
| 18 | Flush From High % | PRODUCED | — | ✓ | as TODAY N |
| 19 | Cycle Classification | PRODUCED | — | ✓ | as TODAY D — arithmetic since `97b4caa`, so no longer live |
| 20 | Cycle Reasoning | NEW WORK | **LIVE** | | prose |
| 21 | Recent Major Runs | PRODUCED | — | ✓ | threshold-dependent |
| 22 | Historical Runner Notes | PRODUCIBLE | **LIVE** | | prose over a produced status |
| 23 | Split History | PRODUCIBLE | — | ✓ | recoverable from raw vs split-adjusted bars — verified over 515 sessions |
| 24 | Daily Resistance | PRODUCIBLE | — | ✓ | |
| 25 | Daily Support | PRODUCIBLE | — | ✓ | |
| 26 | 8-K / 6-K | PRODUCED | — | | SEC |
| 27 | Registration / Prospectus | PRODUCED | — | | SEC |
| 28 | Offerings / ATM / PIPE | PRODUCED | — | ✓ | from filings |
| 29 | Warrants / Convertibles | PRODUCED | — | ✓ | from filings |
| 30 | Other Share Structure | PRODUCED | — | | |
| 31 | Structure Source URLs | PRODUCED | **LIVE** | | as 16 |
| 32 | Warning Flags | PRODUCED | **LIVE** | | model-derived; see P |
| 33 | Overall Priority | NEW WORK | **LIVE** | | as TODAY A |
| 34 | Analyst Notes | NEW WORK | **LIVE** | | free prose |
| 35 | Float Quality | PRODUCIBLE | **LIVE** | ✓ | inherits float's liveness |
| 36 | Overhang / Float | NEW WORK | **LIVE** | ✓ | inherits float's liveness; `supplyBound` is a lower bound and asymmetric |
| 37 | Supply Evidence | PRODUCED | **LIVE** | | the ledger re-derives; the citation set does not |

## Counts

| | TODAY | RESEARCH | total |
| --- | ---: | ---: | ---: |
| live | 11 | 15 | **26** of 64 |
| defs | 12 | 17 | **29** of 64 |

`defs` largely agrees with the audit's own pre-marking. Where this thread added
one it is because the field has already bitten here: `RTH Close` differs from
the auction close on 11% of rows in this archive, and `Flush From High %` is two
different numbers — retracement of the move against giveback below the high.

## What this does not say

It says nothing about whether a field should be kept. A live field that nobody
will ever ask a question about is still not worth capturing, and that judgement
needs the question, not this column. What `live?` establishes is only the
**order of the decision**: for the 26, deciding late and deciding no are the same
decision, and for the other 38 they are not.
