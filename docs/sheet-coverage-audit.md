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

**Verdict cells now carry the Sheet's PARSE RATE beside the desk verdict, added
by R&D 2026-09-07.** They are two axes: **the verdict is what the DESK can
produce; the rate is what the SHEET actually delivers.** A cell reading
`PRODUCED (desk) · SHEET NULLS IT` means the desk can compute it and the Sheet's
value never arrives — **the cheapest thing on this table to retire, because he is
already living without it.**

**TODAY rates are n=7 on ONE SNAPSHOT of a SHUT MARKET and are INDICATIVE.** The
RESEARCH rates at n=226 are the ones that carry weight. `0 of 7` has a 95% upper
bound of **35.4%**.

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
| A | Priority | NEW WORK | board rank exists; the A/B/C grade is a judgement nothing produces | MOMENT | — | board — priority chip |
| B | Ticker | PRODUCED | `ticker_session` | REFETCH | — | board + drawer |
| C | Country of Origin | PRODUCED | `issuer_registry.country`, from SEC | REFETCH | — | drawer |
| D | Cycle | PRODUCED | `computedCycle.current.phase` — arithmetic since `97b4caa` | REFETCH | ✓ | board + drawer — cycle chip |
| E | RTH Close | PRODUCED · Sheet parses 100% of 7 | `rth_final_close` / `reference_rth_close` | REFETCH | ✓ | drawer |
| F | AH Price | PRODUCED · Sheet parses 100% of 7 | `ticker_session` AH fields | REFETCH | **+** | **—** |
| G | AH % | PRODUCED · Sheet parses 100% of 7 | `ah_percent_change` | REFETCH | ✓ | board — as *Move*, after hours |
| H | AH Volume | PRODUCED · Sheet parses 100% of 7 | `ah_volume` | REFETCH | **+** | history |
| I | **Float** | **NEW WORK** · Sheet parses 57% of 7 | **nothing. Phase C.** Sole source is this column | MOMENT\* | ✓ | board (float sort only) + drawer |
| J | Catalyst Grade | PRODUCED | `catalyst.catalystGrade` | MOMENT | ✓ | drawer |
| K | Catalyst | PRODUCED | `catalyst.summary` | MOMENT | — | board — *Why* cell; drawer |
| L | Catalyst Time | PRODUCED | `catalyst.eventTimestamp` | MOMENT\* | ✓ | drawer |
| M | Recent Run High | **PRODUCED (desk)** · **SHEET NULLS IT** — Sheet parses **0% of 7** | `computedCycle.current.cycleHigh` — was 12% of dossiers before | REFETCH | ✓ | drawer — via `cycleLevels` |
| N | Flush From High % | **PRODUCED (desk)** · **SHEET NULLS IT** — Sheet parses **14% of 7** | `retracementPct` (of the move) and `givebackPct` (below the high) | REFETCH | ✓ | drawer — **hover only** |
| O | Prior Runner | PRODUCED | `formerRunnerStatus` + `priorCycles[]` | REFETCH | ✓ | drawer |
| P | Structure Flags | PRODUCED | `structure.structuralWarnings` + classification | REFETCH | **+** | board — risk chip; drawer |
| Q | Key Levels | PRODUCIBLE | `priceLevels` / `cycleLevels` derive some; not assembled as one field | REFETCH | ✓ | drawer |
| R | Warning Shot | PRODUCIBLE | warnings exist; the Sheet's is prose synthesis over them | MOMENT | — | board — risk chip; drawer |
| S | Notes | NEW WORK | free prose | MOMENT | — | drawer |
| T | PM Price | PRODUCED · Sheet parses not written | `pm_price` | REFETCH | **+** | board — as the live price, premarket |
| U | PM % | PRODUCED · Sheet parses not written | `pm_change_pct` | REFETCH | ✓ | board — as *Gap*, premarket |
| V | PM Volume | PRODUCED · Sheet parses not written | `pm_volume` | REFETCH | **+** | board — as Volume, premarket |
| W | PM Catalyst/Update | PRODUCED | catalyst refresh at the premarket checkpoints | MOMENT | — | drawer — folded into `catalyst.latest` |
| X | PM Catalyst Time | PRODUCED | `catalyst.eventTimestamp` | MOMENT\* | ✓ | drawer — with W |
| Y | Confirmation | NEW WORK | a judgement on whether premarket confirmed the thesis | MOMENT | — | drawer |
| Z | Revised Priority | NEW WORK | as Priority | MOMENT | — | board — folded into the priority chip |
| AA | PM Warning Shot | PRODUCIBLE | as Warning Shot | MOMENT | — | board + drawer — folded into `warning.current` |

## Outputs — RESEARCH!A:AK (37)

| # | Field | Verdict | Desk equivalent | live? | defs | screen |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Report Date | PRODUCED | `generated_at` | REFETCH | — | drawer |
| 2 | Ticker | PRODUCED | | REFETCH | — | board + drawer |
| 3 | Country of Origin | PRODUCED | `issuer_registry` | REFETCH | — | drawer |
| 4 | Company | PRODUCED | `issuer_registry.company_name` | REFETCH | — | drawer |
| 5 | RTH Close | PRODUCED · Sheet parses 99% of 224 | | REFETCH | ✓ | drawer |
| 6 | AH Price | PRODUCED · Sheet parses 68% of 192 | | REFETCH | **+** | **—** |
| 7 | AH % | PRODUCED · Sheet parses 76% of 172 | | REFETCH | ✓ | **—** |
| 8 | AH Volume | PRODUCED · Sheet parses 54% of 152 | | REFETCH | **+** | history |
| 9 | **Float** | **NEW WORK** · Sheet parses 69% of 188 | **nothing. Phase C.** | MOMENT\* | ✓ | board (float sort only) + drawer |
| 10 | Float Source Date | NEW WORK | follows Float | MOMENT\* | **+** | drawer |
| 11 | Float Source URL | NEW WORK | follows Float; today always stockanalysis.com | MOMENT\* | — | drawer — link list |
| 12 | Shares Outstanding | PRODUCED · Sheet parses 56% of 185 | `SEC_COMPANY_FACTS`, surfaced to the model since `55f3e20` | REFETCH | ✓ | drawer |
| 13 | Catalyst Details | PRODUCED | `catalyst.summary` | MOMENT | — | drawer |
| 14 | Catalyst Timestamp | PRODUCED | `catalyst.eventTimestamp` | MOMENT\* | ✓ | drawer |
| 15 | Catalyst Grade | PRODUCED | `catalyst.catalystGrade` | MOMENT | ✓ | drawer |
| 16 | Catalyst Source URL | PRODUCED | `evidenceSourceIds` → `research_sources.url` | MOMENT\* | — | drawer — link list |
| 17 | Recent Cycle High | **PRODUCED (desk)** · **SHEET NULLS IT** — Sheet parses **32% of 190** | `computedCycle.current.cycleHigh` | REFETCH | ✓ | drawer — via `cycleLevels` |
| 18 | Flush From High % | **PRODUCED (desk)** · **SHEET NULLS IT** — Sheet parses **44% of 177** | `retracementPct` / `givebackPct` | REFETCH | ✓ | drawer — **hover only** |
| 19 | Cycle Classification | PRODUCED | `computedCycle.current.phase` | REFETCH | ✓ | drawer |
| 20 | Cycle Reasoning | NEW WORK | prose. The arithmetic gives numbers, not narrative | MOMENT | — | drawer |
| 21 | Recent Major Runs | PRODUCED | `priorCycles[]` with dates and advances | REFETCH | ✓ | drawer |
| 22 | Historical Runner Notes | PRODUCIBLE | status is produced; the notes are prose over it | MOMENT | — | drawer |
| 23 | Split History | PRODUCIBLE | `reverseSplitHistory` from filings; `daily_bars.adjustment` | REFETCH | ✓ | drawer |
| 24 | Daily Resistance | PRODUCIBLE | `priceLevels` | REFETCH | ✓ | drawer |
| 25 | Daily Support | PRODUCIBLE | `priceLevels` | REFETCH | ✓ | drawer |
| 26 | 8-K / 6-K | PRODUCED | collected; 378 and 225 in the window | REFETCH | — | drawer |
| 27 | Registration / Prospectus | PRODUCED | S-1/S-3/F-1/F-3/424B/EFFECT all collected | REFETCH | — | drawer |
| 28 | Offerings / ATM / PIPE | PRODUCED | `supplyLedger` types ATM, PIPE, RECENT_OFFERING | REFETCH | ✓ | drawer |
| 29 | Warrants / Convertibles | PRODUCED | `supplyLedger` WARRANTS, CONVERTIBLES | REFETCH | ✓ | drawer |
| 30 | Other Share Structure | PRODUCED | `supplyLedger` OTHER_ISSUED_SHARES | REFETCH | — | drawer |
| 31 | Structure Source URLs | PRODUCED | `evidenceSourceIds` | REFETCH | **+** | drawer — link list |
| 32 | Warning Flags | PRODUCED | `structuralWarnings` | REFETCH | — | drawer |
| 33 | Overall Priority | NEW WORK | as Priority | MOMENT | — | **—** · would need one |
| 34 | Analyst Notes | NEW WORK | free prose | MOMENT | — | drawer |
| 35 | Float Quality | PRODUCIBLE | `structureClassification` + `supplyBound`; "quality" of a float needs a float | MOMENT\* | ✓ | drawer |
| 36 | Overhang / Float | NEW WORK | the ratio needs a float. `supplyBound` is a **lower bound** substitute, not this | MOMENT\* | ✓ | drawer |
| 37 | Supply Evidence | PRODUCED | `supplyLedger` + cited sources | REFETCH | — | drawer |

### Design annotation — `screen`, filled 2026-09-06

**Measured, not recalled.** Every sheet field on `MomentumTicker` and
`StructuralResearch` was cross-referenced against every `.tsx` in `components/`,
and the ambiguous ones traced to the surface that renders them. Two of my own
assumptions were wrong before I checked, and both are below.

#### THE COLUMN DESCRIBES THE CURRENT SURFACE. IT DOES NOT PROPOSE A NEW ONE.

Both directions, because a populated column reads as a design brief and it is
not one:

- **An empty cell is not an argument for DROPPING a field.** A field no surface
  renders can still be the only witness to a question nobody has asked yet, and
  three of the four empty cells are quantities the board shows LIVE and the
  Sheet merely froze. **Nothing here outranks `live?` in the retirement order.**
- **A full cell is not an argument for PROMOTING one.** `screen` records where a
  field is presented TODAY — **hover and detail included. A field visible on
  hover is RENDERED**, not pending.

**STANDING CONSTRAINT, from the trader on 2026-09-06: no material change to what
the board presents.** *"the commentary and analysis was just a hover show… i
dont want to materially change what is presented. that should stay the same."*
Commentary and analysis live in the hover, where they already live. **Anything
that would spend header space goes to Integration and then to him as a proposal
with a reason — never as a consequence of a retirement decision.**

#### FOUR CELLS ARE EMPTY AND NONE OF THEM ASKS FOR A BUILD

`F`/`6` **AH Price** and `7` **AH %** — no surface renders them. `33` **Overall
Priority** — confirmed rendering nowhere; `overallPriorityRaw` and
`overallPriorityBucket` are parsed and read by no component.

**That is a fact about the surface and NOT a request for one.** Overall Priority
is one of the six judgement fields the trader ruled to keep, and keeping a
judgement does not mean giving it chrome. It rides the existing pattern with the
other five.

#### THE PM AND AH COLUMNS ARE FROZEN COPIES OF WHAT THE BOARD SHOWS LIVE

I expected `T`, `U`, `V` to be empty and they are not, for a reason that changes
how they should be read. **During premarket the board's live price IS the PM
price, its *Gap* IS the PM %, and its volume IS the PM volume.** Same for the AH
columns after the bell — `G` renders as the board's *Move*.

**So nothing disappears from the screen when those columns go.** What
disappears is the FROZEN-AT-A-MOMENT property, which is precisely R&D's
`MOMENT*` and is already accounted for there. The screen column would have
double-counted a loss the `live?` column already records.

#### SEVEN COLUMNS ARE ALREADY MERGED PAIRWISE INTO ONE RENDERED FIELD

`rows.ts` folds `Priority`+`Revised Priority` into one field with `isRevised` and
`originalRaw`; `Catalyst`+`PM Catalyst` into `catalyst.original`/`.latest`; and
`Warning Shot`+`PM Warning Shot` into `warning.original`/`.current`/`.source`.

**So the surface already renders the LATEST of each pair and keeps the original
beside it.** A retirement plan counting these as separate fields to reproduce
would build six things where three exist — and the pairing is a Sheet-shaped
distinction, not a desk-shaped one.

#### TWO FIELDS REACH THE TRADER ONLY ON HOVER — AND THAT IS NOT AUTOMATICALLY A DEFECT

`N` and `18` **Flush From High %** render inside `cycleDetail`, a `title`
attribute. §10 forbids content reachable only by hover, and the Move label was
caught by that rule before.

**But these are MEASUREMENTS, not commentary**, so the trader's hover ruling —
which is about commentary and analysis — does not obviously cover them. Recorded
as an open question rather than a finding. **Either way the fix would be a
material change to the board and therefore a proposal, not a tidy-up.** Flagged;
not fixed; not mine to decide.

#### Scope check, per the instruction

`lib/research/effect.ts` remains imported only by its own test, so the catalyst
taxonomy renders nowhere and changes no cell here. **Checked rather than
assumed** — the field being built is not the field being read, which is the
error this desk has made four times.

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

### R&D — the closed-grammar rule applied to all 64, derived from the code. 2026-09-07.

**Integration asked which OTHER fields are at risk by their semantics. Measured
against the parsers instead, and the answer is narrower than a semantic guess:
ONLY THE NUMERIC ONES CAN FAIL THIS WAY.**

**`parseNumber` is the only fully anchored parser on this path.** Every other
one is a SUBSTRING or PREFIX matcher and is **deliberately narration-tolerant:**

    parseNumber        ^...$  closed grammar          <- THE ONLY ANCHORED ONE
    parseDateValue     .match(/\d{4}-\d{2}-\d{2}/) anywhere, then Date.parse
    cycleState         .includes('BACKSIDE') etc
    structureState     .includes('DIRTY FLOAT') etc
    priorityBucket     /^([ABC])/ — prefix-anchored, tolerates a trailing clause
    proseCell          text, cannot fail

**CONFIRMED RATHER THAN ASSERTED — the non-numeric census, same live snapshot:**

    catalystTimestamp / reportDateValue / floatSourceDate     226/226   100%
    all prose and URL fields (notes, analystNotes, ...)       226/226   100%
    overallPriorityBucket                                     216/226    96%
    cycleState                                                193/226    85%

> **So the at-risk set is EXACTLY the nine numeric fields, and there is no
> unmeasured tail to predict over.** The narration that kills a number is
> invisible to a substring matcher — **the Sheet's model narrating everything is
> only a defect where the parser is anchored.**

**THE THREE UNMEASURED NUMERIC FIELDS ARE THE PM SET — T, U, V.** Not written
tonight because the market is shut. **By the rule they carry identical risk to
the AH set, which measures 54..76%**, and they are the fields he reads at 07:00.
**Predicted at risk, unmeasured, and named so nobody reads a blank as a pass.**

**A SECOND-ORDER FINDING THAT IS NOT THIS DEFECT AND MUST NOT BE FILED AS IT.**

    floatQualityRaw    211/226 present   100% carries text
    floatQualityState  226/226 present    51% classified

**`structureState` recognises exactly three phrases** — `DIRTY FLOAT`, `UNKNOWN`,
`CLEAN` — so 111 of 226 written float-quality cells classify as `UNCLASSIFIED`
**with their text intact.** That is a **vocabulary gap in a tolerant matcher**,
not an anchored-grammar null: **the value reaches the desk and is not
understood**, which is a different failure with a different fix. Field 35.

### R&D — parse census against the live Sheet. 2026-09-07.

**Pre-registration and full results:
`docs/rnd/2026-09-07-sheet-parse-census-preregistration.md`. Rates only; no cell
contents left this desk.**

**A THIRD FIELD REACHES THE DESK AS NOTHING, AND IT WAS NOT ON ANYONE'S LIST.**

    field                          TODAY (n=7)        RESEARCH (n=226)
    M / 17  Recent Run High         0/7    0.0%        61/190   32.1%   <== NEW
    N / 18  Flush From High %       1/7   14.3%        77/177   43.5%
    I / 9   Float                   4/7   57.1%       129/188   68.6%
            float cell "; N SO"                        10/188    5.3%
    12      Shares Outstanding                        103/185   55.7%
    8       AH Volume                                  82/152   53.9%
    6       AH Price                                  131/192   68.2%
    7       AH %                                      130/172   75.6%
    E / 5   RTH Close               7/7  100.0%       221/224   98.7%

**Float first, Flush second, Recent Run High third — three of three are the same
shape**, a number with a level or date travelling beside it.

**THE RULE IS PREDICTIVE FROM THE PARSER, NO SAMPLING NEEDED.** `parseNumber` is
a fully anchored regex over a closed vocabulary — digits, `( - + $ , . K M B %`
and whitespace. **`approx 12M` nulls; so does `~4.0M`, `>12M`, `12M est.`,
`12.0M*`.** Any field whose natural expression carries anything else is at risk
**before it is ever observed failing.**

**WHAT THESE NUMBERS DO NOT SAY.** `0 of 7` is not 0% — the 95% upper bound is
**35.4%**, and every TODAY figure is a seven-row figure. **`recentCycleHigh` at
32.1% of 190 is what makes the TODAY zero credible**, not the zero itself.
Explicit `Unknown` cells (34..74 per RESEARCH field) are **separated and not
counted as failures** — an honest Unknown is the Sheet working. One snapshot,
market shut.

**AND A CORRECTION TO WHERE THIS LANDS.** The verdict column reads *"the desk
produces an equivalent today"* — **a statement about the DESK, not about the
Sheet.** A parse rate cannot move it: `Recent Run High` arriving as nothing says
nothing about whether the desk can compute a cycle high, and `97b4caa` made that
arithmetic.

> **So no verdict is amended here.** Two different axes, and collapsing them
> would repeat the error this census exists to catch. **The finding is stronger
> kept separate: a field the DESK PRODUCES and the SHEET NULLS is one he is
> already living without** — the cheapest retirement on the table, and there are
> at least three of them.
>
> **If this belongs as a `parse?` column rather than a section, that is
> Integration's to add** — the table's structure is not mine to change.

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
