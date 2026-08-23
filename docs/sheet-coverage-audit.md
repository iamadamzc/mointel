# Sheet coverage audit

What the four ChatGPT tasks produce and consume, against what this desk can.
Produced by the Research thread 2026-08-24. **Integration owns this table**;
Design and R&D annotate through Integration rather than editing in place.

Two halves, because retiring the Sheet needs both: the **outputs** are what would
disappear from the board, and the **inputs** are what would stop being read.

**Count correction:** item 6 says 65 fields. `lib/data/rows.ts` defines **64** —
27 on `TODAY!A:AA` and 37 on `RESEARCH!A:AK`. If the missing one is a column the
parser does not read, that is itself an answer worth recording.

---

## How to read the verdicts

| Verdict | Meaning |
| --- | --- |
| **PRODUCED** | The desk produces an equivalent today. |
| **PRODUCIBLE** | The inputs exist; nothing assembles them yet. |
| **NEW WORK** | Needs collection or capability the desk does not have. |

Annotation columns are deliberately empty. **`live?`** is R&D's — irreplaceable if
not captured in the moment, versus re-fetchable later. **`defs`** flags a field
with more than one possible definition, which per R&D's rule ships with its basis
in an adjacent column. **`screen`** is Design's.

`screen` is **not** the spine of this table and must not become it: a field no
surface renders can still be the only witness to a question nobody has asked yet.

---

## Outputs — TODAY!A:AA (27)

| # | Field | Verdict | Desk equivalent | live? | defs | screen |
| --- | --- | --- | --- | --- | --- | --- |
| A | Priority | NEW WORK | board rank exists; the A/B/C grade is a judgement nothing produces | | | |
| B | Ticker | PRODUCED | `ticker_session` | | | |
| C | Country of Origin | PRODUCED | `issuer_registry.country`, from SEC | | | |
| D | Cycle | PRODUCED | `computedCycle.current.phase` — arithmetic since `97b4caa` | | ✓ | |
| E | RTH Close | PRODUCED | `rth_final_close` / `reference_rth_close` | | ✓ | |
| F | AH Price | PRODUCED | `ticker_session` AH fields | | | |
| G | AH % | PRODUCED | `ah_percent_change` | | ✓ | |
| H | AH Volume | PRODUCED | `ah_volume` | | | |
| I | **Float** | **NEW WORK** | **nothing. Phase C.** Sole source is this column | | ✓ | |
| J | Catalyst Grade | PRODUCED | `catalyst.catalystGrade` | | ✓ | |
| K | Catalyst | PRODUCED | `catalyst.summary` | | | |
| L | Catalyst Time | PRODUCED | `catalyst.eventTimestamp` | | ✓ | |
| M | Recent Run High | PRODUCED | `computedCycle.current.cycleHigh` — was 12% of dossiers before | | ✓ | |
| N | Flush From High % | PRODUCED | `retracementPct` (of the move) and `givebackPct` (below the high) | | ✓ | |
| O | Prior Runner | PRODUCED | `formerRunnerStatus` + `priorCycles[]` | | ✓ | |
| P | Structure Flags | PRODUCED | `structure.structuralWarnings` + classification | | | |
| Q | Key Levels | PRODUCIBLE | `priceLevels` / `cycleLevels` derive some; not assembled as one field | | ✓ | |
| R | Warning Shot | PRODUCIBLE | warnings exist; the Sheet's is prose synthesis over them | | | |
| S | Notes | NEW WORK | free prose | | | |
| T | PM Price | PRODUCED | `pm_price` | | | |
| U | PM % | PRODUCED | `pm_change_pct` | | ✓ | |
| V | PM Volume | PRODUCED | `pm_volume` | | | |
| W | PM Catalyst/Update | PRODUCED | catalyst refresh at the premarket checkpoints | | | |
| X | PM Catalyst Time | PRODUCED | `catalyst.eventTimestamp` | | ✓ | |
| Y | Confirmation | NEW WORK | a judgement on whether premarket confirmed the thesis | | | |
| Z | Revised Priority | NEW WORK | as Priority | | | |
| AA | PM Warning Shot | PRODUCIBLE | as Warning Shot | | | |

## Outputs — RESEARCH!A:AK (37)

| # | Field | Verdict | Desk equivalent | live? | defs | screen |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Report Date | PRODUCED | `generated_at` | | | |
| 2 | Ticker | PRODUCED | | | | |
| 3 | Country of Origin | PRODUCED | `issuer_registry` | | | |
| 4 | Company | PRODUCED | `issuer_registry.company_name` | | | |
| 5 | RTH Close | PRODUCED | | | ✓ | |
| 6 | AH Price | PRODUCED | | | | |
| 7 | AH % | PRODUCED | | | ✓ | |
| 8 | AH Volume | PRODUCED | | | | |
| 9 | **Float** | **NEW WORK** | **nothing. Phase C.** | | ✓ | |
| 10 | Float Source Date | NEW WORK | follows Float | | | |
| 11 | Float Source URL | NEW WORK | follows Float; today always stockanalysis.com | | | |
| 12 | Shares Outstanding | PRODUCED | `SEC_COMPANY_FACTS`, surfaced to the model since `55f3e20` | | ✓ | |
| 13 | Catalyst Details | PRODUCED | `catalyst.summary` | | | |
| 14 | Catalyst Timestamp | PRODUCED | `catalyst.eventTimestamp` | | ✓ | |
| 15 | Catalyst Grade | PRODUCED | `catalyst.catalystGrade` | | ✓ | |
| 16 | Catalyst Source URL | PRODUCED | `evidenceSourceIds` → `research_sources.url` | | | |
| 17 | Recent Cycle High | PRODUCED | `computedCycle.current.cycleHigh` | | ✓ | |
| 18 | Flush From High % | PRODUCED | `retracementPct` / `givebackPct` | | ✓ | |
| 19 | Cycle Classification | PRODUCED | `computedCycle.current.phase` | | ✓ | |
| 20 | Cycle Reasoning | NEW WORK | prose. The arithmetic gives numbers, not narrative | | | |
| 21 | Recent Major Runs | PRODUCED | `priorCycles[]` with dates and advances | | ✓ | |
| 22 | Historical Runner Notes | PRODUCIBLE | status is produced; the notes are prose over it | | | |
| 23 | Split History | PRODUCIBLE | `reverseSplitHistory` from filings; `daily_bars.adjustment` | | ✓ | |
| 24 | Daily Resistance | PRODUCIBLE | `priceLevels` | | ✓ | |
| 25 | Daily Support | PRODUCIBLE | `priceLevels` | | ✓ | |
| 26 | 8-K / 6-K | PRODUCED | collected; 378 and 225 in the window | | | |
| 27 | Registration / Prospectus | PRODUCED | S-1/S-3/F-1/F-3/424B/EFFECT all collected | | | |
| 28 | Offerings / ATM / PIPE | PRODUCED | `supplyLedger` types ATM, PIPE, RECENT_OFFERING | | ✓ | |
| 29 | Warrants / Convertibles | PRODUCED | `supplyLedger` WARRANTS, CONVERTIBLES | | ✓ | |
| 30 | Other Share Structure | PRODUCED | `supplyLedger` OTHER_ISSUED_SHARES | | | |
| 31 | Structure Source URLs | PRODUCED | `evidenceSourceIds` | | | |
| 32 | Warning Flags | PRODUCED | `structuralWarnings` | | | |
| 33 | Overall Priority | NEW WORK | as Priority | | | |
| 34 | Analyst Notes | NEW WORK | free prose | | | |
| 35 | Float Quality | PRODUCIBLE | `structureClassification` + `supplyBound`; "quality" of a float needs a float | | ✓ | |
| 36 | Overhang / Float | NEW WORK | the ratio needs a float. `supplyBound` is a **lower bound** substitute, not this | | ✓ | |
| 37 | Supply Evidence | PRODUCED | `supplyLedger` + cited sources | | | |

### Outputs summary

| | TODAY | RESEARCH | total |
| --- | --- | --- | --- |
| PRODUCED | 17 | 22 | **39** |
| PRODUCIBLE | 4 | 6 | **10** |
| NEW WORK | 6 | 9 | **15** |

**Float and everything downstream of it is the whole of the hard part.** Fields 9,
10, 11 and 36 on RESEARCH and I on TODAY are one problem wearing five names. The
remaining NEW WORK is prose — Notes, Analyst Notes, Cycle Reasoning — and the
A/B/C priority grade, which is a judgement rather than a measurement.

Nine fields moved from NEW WORK to PRODUCED **during this audit's own session**,
all cycle-derived: `97b4caa` through `f6137a2`.

---

## Inputs — what the tasks read

935 URL appearances across 64 domains in the workbook, against what this desk has
ever collected.

| Domain | Sheet cites | Desk policy | Desk has | Gap or drop? |
| --- | --- | --- | --- | --- |
| stockanalysis.com | **505** | unclassified | **0** | **GAP** — accepted by policy, never reached |
| sec.gov | 137 | SEC | 4,137 | reached, heavily |
| stocktitan.net | 74 | unclassified | 10 | thin |
| marketwatch.com | 24 | unclassified | 0 | GAP |
| tradingview.com | 24 | unclassified | 0 | GAP |
| globenewswire.com | 23 | NEWSWIRE | 5 | thin |
| prnewswire.com | 20 | NEWSWIRE | 6 | thin |
| finance.yahoo.com | 14 | MIRROR | 0 | demoted, not refused |
| nasdaq.com | 11 | MIRROR | 2 | demoted |
| investing.com | 6 | MIRROR | 0 | demoted |
| tipranks.com | 6 | unclassified | 0 | GAP |
| ~40 issuer IR hosts | ~60 | unclassified | partial | resolver-limited |

**642 of 935 citations — 69% — sit on domains this desk has never collected from.**

**Nothing the tasks use is blocked.** `domainPolicy` refuses exactly one class,
the RFC 2606 placeholder domains. `stockanalysis.com` — the largest source in the
workbook and the origin of every float on the board — is unclassified, meaning the
desk would store it and simply never looks.

So the input gap is **discovery, not policy**. That reframes the SEC-only bundle
problem: 1,408 of 1,437 collected sources are SEC not because aggregators are
refused, but because nothing reaches them. It is the same root as the resolver
locating a usable newsroom for 4 issuers of 74.

### The consequence for Phase C

Deriving float from filings is not the only route, and this audit says so plainly:
the desk's own policy would accept `stockanalysis.com` today. That is a cheaper
path to pillar 5 than new SEC collection, and it is the path the tasks already
use.

It is **not** an argument against Phase C. Per R&D's rule, a vendor-displayed
float and a filing-derived float are different quantities and both ship with
`float_basis` alongside. The audit's contribution is that the vendor route is
available and unblocked, which nobody had established.
