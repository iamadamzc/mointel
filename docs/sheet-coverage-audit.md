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
| A | Priority | NEW WORK | board rank exists; the A/B/C grade is a judgement nothing produces | MOMENT | — | |
| B | Ticker | PRODUCED | `ticker_session` | REFETCH | — | |
| C | Country of Origin | PRODUCED | `issuer_registry.country`, from SEC | REFETCH | — | |
| D | Cycle | PRODUCED | `computedCycle.current.phase` — arithmetic since `97b4caa` | REFETCH | ✓ | |
| E | RTH Close | PRODUCED | `rth_final_close` / `reference_rth_close` | REFETCH | ✓ | |
| F | AH Price | PRODUCED | `ticker_session` AH fields | REFETCH | **+** | |
| G | AH % | PRODUCED | `ah_percent_change` | REFETCH | ✓ | |
| H | AH Volume | PRODUCED | `ah_volume` | REFETCH | **+** | |
| I | **Float** | **NEW WORK** | **nothing. Phase C.** Sole source is this column | MOMENT\* | ✓ | |
| J | Catalyst Grade | PRODUCED | `catalyst.catalystGrade` | MOMENT | ✓ | |
| K | Catalyst | PRODUCED | `catalyst.summary` | MOMENT | — | |
| L | Catalyst Time | PRODUCED | `catalyst.eventTimestamp` | MOMENT\* | ✓ | |
| M | Recent Run High | PRODUCED | `computedCycle.current.cycleHigh` — was 12% of dossiers before | REFETCH | ✓ | |
| N | Flush From High % | PRODUCED | `retracementPct` (of the move) and `givebackPct` (below the high) | REFETCH | ✓ | |
| O | Prior Runner | PRODUCED | `formerRunnerStatus` + `priorCycles[]` | REFETCH | ✓ | |
| P | Structure Flags | PRODUCED | `structure.structuralWarnings` + classification | REFETCH | **+** | |
| Q | Key Levels | PRODUCIBLE | `priceLevels` / `cycleLevels` derive some; not assembled as one field | REFETCH | ✓ | |
| R | Warning Shot | PRODUCIBLE | warnings exist; the Sheet's is prose synthesis over them | MOMENT | — | |
| S | Notes | NEW WORK | free prose | MOMENT | — | |
| T | PM Price | PRODUCED | `pm_price` | REFETCH | **+** | |
| U | PM % | PRODUCED | `pm_change_pct` | REFETCH | ✓ | |
| V | PM Volume | PRODUCED | `pm_volume` | REFETCH | **+** | |
| W | PM Catalyst/Update | PRODUCED | catalyst refresh at the premarket checkpoints | MOMENT | — | |
| X | PM Catalyst Time | PRODUCED | `catalyst.eventTimestamp` | MOMENT\* | ✓ | |
| Y | Confirmation | NEW WORK | a judgement on whether premarket confirmed the thesis | MOMENT | — | |
| Z | Revised Priority | NEW WORK | as Priority | MOMENT | — | |
| AA | PM Warning Shot | PRODUCIBLE | as Warning Shot | MOMENT | — | |

## Outputs — RESEARCH!A:AK (37)

| # | Field | Verdict | Desk equivalent | live? | defs | screen |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Report Date | PRODUCED | `generated_at` | REFETCH | — | |
| 2 | Ticker | PRODUCED | | REFETCH | — | |
| 3 | Country of Origin | PRODUCED | `issuer_registry` | REFETCH | — | |
| 4 | Company | PRODUCED | `issuer_registry.company_name` | REFETCH | — | |
| 5 | RTH Close | PRODUCED | | REFETCH | ✓ | |
| 6 | AH Price | PRODUCED | | REFETCH | **+** | |
| 7 | AH % | PRODUCED | | REFETCH | ✓ | |
| 8 | AH Volume | PRODUCED | | REFETCH | **+** | |
| 9 | **Float** | **NEW WORK** | **nothing. Phase C.** | MOMENT\* | ✓ | |
| 10 | Float Source Date | NEW WORK | follows Float | MOMENT\* | **+** | |
| 11 | Float Source URL | NEW WORK | follows Float; today always stockanalysis.com | MOMENT\* | — | |
| 12 | Shares Outstanding | PRODUCED | `SEC_COMPANY_FACTS`, surfaced to the model since `55f3e20` | REFETCH | ✓ | |
| 13 | Catalyst Details | PRODUCED | `catalyst.summary` | MOMENT | — | |
| 14 | Catalyst Timestamp | PRODUCED | `catalyst.eventTimestamp` | MOMENT\* | ✓ | |
| 15 | Catalyst Grade | PRODUCED | `catalyst.catalystGrade` | MOMENT | ✓ | |
| 16 | Catalyst Source URL | PRODUCED | `evidenceSourceIds` → `research_sources.url` | MOMENT\* | — | |
| 17 | Recent Cycle High | PRODUCED | `computedCycle.current.cycleHigh` | REFETCH | ✓ | |
| 18 | Flush From High % | PRODUCED | `retracementPct` / `givebackPct` | REFETCH | ✓ | |
| 19 | Cycle Classification | PRODUCED | `computedCycle.current.phase` | REFETCH | ✓ | |
| 20 | Cycle Reasoning | NEW WORK | prose. The arithmetic gives numbers, not narrative | MOMENT | — | |
| 21 | Recent Major Runs | PRODUCED | `priorCycles[]` with dates and advances | REFETCH | ✓ | |
| 22 | Historical Runner Notes | PRODUCIBLE | status is produced; the notes are prose over it | MOMENT | — | |
| 23 | Split History | PRODUCIBLE | `reverseSplitHistory` from filings; `daily_bars.adjustment` | REFETCH | ✓ | |
| 24 | Daily Resistance | PRODUCIBLE | `priceLevels` | REFETCH | ✓ | |
| 25 | Daily Support | PRODUCIBLE | `priceLevels` | REFETCH | ✓ | |
| 26 | 8-K / 6-K | PRODUCED | collected; 378 and 225 in the window | REFETCH | — | |
| 27 | Registration / Prospectus | PRODUCED | S-1/S-3/F-1/F-3/424B/EFFECT all collected | REFETCH | — | |
| 28 | Offerings / ATM / PIPE | PRODUCED | `supplyLedger` types ATM, PIPE, RECENT_OFFERING | REFETCH | ✓ | |
| 29 | Warrants / Convertibles | PRODUCED | `supplyLedger` WARRANTS, CONVERTIBLES | REFETCH | ✓ | |
| 30 | Other Share Structure | PRODUCED | `supplyLedger` OTHER_ISSUED_SHARES | REFETCH | — | |
| 31 | Structure Source URLs | PRODUCED | `evidenceSourceIds` | REFETCH | **+** | |
| 32 | Warning Flags | PRODUCED | `structuralWarnings` | REFETCH | — | |
| 33 | Overall Priority | NEW WORK | as Priority | MOMENT | — | |
| 34 | Analyst Notes | NEW WORK | free prose | MOMENT | — | |
| 35 | Float Quality | PRODUCIBLE | `structureClassification` + `supplyBound`; "quality" of a float needs a float | MOMENT\* | ✓ | |
| 36 | Overhang / Float | NEW WORK | the ratio needs a float. `supplyBound` is a **lower bound** substitute, not this | MOMENT\* | ✓ | |
| 37 | Supply Evidence | PRODUCED | `supplyLedger` + cited sources | REFETCH | — | |

### R&D annotation — `live?` and `defs`, filled 2026-09-05

**THE COLUMN ASKED FOR A BINARY AND THE BINARY LIES ON TEN FIELDS.** Three
values, because they have three different retirement consequences:

| value | meaning | consequence if the Sheet goes |
| --- | --- | --- |
| **REFETCH** | a later query recovers the SAME value | drop freely — no history is lost |
| **MOMENT\*** | the quantity is re-fetchable, **but not as it stood then** | history lost either way; a substitute can be built |
| **MOMENT** | nothing later recovers it | **those days are blank forever** |

`stockanalysis.com` overwrites its float; the number it showed on 08-17 is gone
whatever we do now. **That is not the same as irreplaceable and not the same as
re-fetchable**, and collapsing it into either one gets the retirement order
wrong in opposite directions.

#### The cross-tab is the answer to the sequencing question

    live?         PRODUCED  PRODUCIBLE  NEW WORK   total
    REFETCH             35           4         0      39
    MOMENT*              4           1         5      10
    MOMENT               5           3         7      15

> **REFETCH x NEW WORK IS EMPTY.** Every re-fetchable field is already PRODUCED
> or PRODUCIBLE. **Nothing that can be rebuilt later is blocking retirement** —
> 39 of 64 fields can be dropped the day the desk writes them, in any order, with
> nothing lost.

#### The seven that actually constrain the order

**MOMENT x NEW WORK** — drop the Sheet before these exist and the observation is
gone for those days:

    A   Priority          Z   Revised Priority     33  Overall Priority
    S   Notes             20  Cycle Reasoning      34  Analyst Notes
    Y   Confirmation

**ALL SEVEN ARE JUDGEMENTS, NOT MEASUREMENTS.** That changes what "build it
first" means: the desk cannot derive a Priority the way it derives a close.
**The question for these is not when to build them but whether he wants the
judgement preserved at all, and whose** — and that is his, not a scoping
decision.

#### The float ruling empties a cell

**Five of the ten MOMENT\* fields are float** — I, 9, 10, 11, 36. The vendor
number is MOMENT\* because the page overwrites. **The BOUND is computed from
shares outstanding and affiliate holdings, both of which are filings, both
REFETCH.**

> **So the trader's ruling converts float from MOMENT\* to REFETCH.** Once the
> bound ships, float stops being a capture-clock problem entirely and becomes an
> ordinary build. **Nothing about float requires writing it now to preserve it** —
> only the historical vendor values are lost, and they were lost already.

#### `defs` — nine added, twenty-eight confirmed

**Added (`+`):** F, H, P, T, V, 6, 8, 10, 31. The AH and PM price/volume fields
carry a window definition and a venue definition (consolidated vs primary) that
nothing states. **10 Float Source Date is the sharpest: the as-of date of the
count and the date it was retrieved are different dates**, and the Sheet's single
column cannot say which it holds.

**Confirmed rather than inherited**, per the instruction — all twenty-eight
existing ticks re-checked against the field, none removed.

#### Scope check before marking anything: the taxonomy is BUILT BUT UNWIRED

`lib/research/effect.ts` (`2128a71`) exists with its two signed axes and mandatory
basis. **Only its own test imports it** — nothing in `lib`, `worker` or `app`
produces or consumes it. **So it changes no verdict in this table yet**, and the
prose fields it could eventually structure are still prose today.

---

### R&D — what would have to be WRITTEN tonight, for the 25 moment-bound fields. 2026-09-05.

**Measured against the store, not scoped. Of the 25, ELEVEN ARE ALREADY WRITTEN
and six need one nullable column each. Nothing needs a new table.**

| | fields | what it costs |
| --- | --- | --- |
| **0 — already written** | 11 | **nothing** |
| **1 — column exists, write path broken** | 5 | a parser fix, **not** a schema change |
| **2 — derivable from what is written** | 3 | **nothing** |
| **3 — genuinely unwritten** | 6 | one nullable column each, on a row already inserted |

#### 0 — ALREADY WRITTEN. Measured over the 94 stored dossier versions.

    J,15 Catalyst Grade      catalyst.catalystGrade      94/94  100%
    K,13 Catalyst Details    catalyst.summary            94/94  100%
    L,X,14 Catalyst Time     catalyst.eventTimestamp     63/94   67%  (populated when one exists)
    16 Catalyst Source URL   catalyst.evidenceSourceIds  88/94   94%  -> research_sources.url
    20 Cycle Reasoning       cycle.reasoning             94/94  100%
    22 Historical Runner     cycle.formerRunnerStatus    68/94   72%
    W  PM Catalyst/Update    a new version per refresh, each with generated_at

> **20 CYCLE REASONING IS ONE OF THE SEVEN AND IT IS ALREADY WRITTEN ON EVERY
> VERSION.** **The count going to him is SIX, not seven.** Flagged before the
> question is put rather than after.

#### 1 — THE COLUMN EXISTS AND THE WRITE PATH IS BROKEN. All five are float.

    I,9  Float               structure.displayedFloat        1/94   1.1%
    10   Float Source Date   structure.displayedFloatDate    1/94   1.1%
    11   Float Source URL    structure.displayedFloatSource  1/94   1.1%
    35   Float Quality       structure.floatConfidence       1/94   1.1%

**1.1% is 1 in 94, against Integration's report that the Sheet's parser discards
12 of 13 written floats.** The two figures are the same defect seen from either
end.

> **Nothing needs to be written tonight to preserve float. The place to put it
> already exists and has for the whole window.** This is a broken writer against
> a working schema — **and measuring the broken behaviour as the Sheet's
> capability is the error the audit was warned about**, arriving here as a
> storage question instead of a coverage one.

#### 2 — DERIVABLE FROM WHAT IS ALREADY WRITTEN. Nothing to add.

    R,AA Warning Shot        structuralWarnings + cycleWarnings, both 100%
    36   Overhang / Float    supplyLedger is written; the RATIO needs a float, which is category 1

#### 3 — GENUINELY UNWRITTEN. Six fields, one nullable column each.

    A  Priority        Z  Revised Priority   33 Overall Priority
    S  Notes           34 Analyst Notes      Y  Confirmation

**`desk_assessment_tickers` already inserts one row per ticker per assessment
with 33 columns.** `ADDED_COLUMNS` in `lib/market/store/db.ts` applies additive
columns on open — **one line per column, and the migration machinery is already
the thing that ships them.**

> **SO THE SCHEMA IS THE CHEAP PART AND IT IS NOT THE COST.**
>
> **A column with no writer preserves nothing.** Adding six nullable columns
> tonight preserves exactly as much as adding none, unless something puts a
> judgement in them. **The expensive question is not where the Priority goes, it
> is whose Priority it is** — and that is the question already going to him.
>
> **Six empty columns would look like preparation and function as a placebo.**

---

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
