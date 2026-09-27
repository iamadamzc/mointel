# Session reports — design

*Research seat, lead. Opened 2026-09-27 on his ruling. **DESIGN ONLY: no code,
no ship, no model spend beyond sizing.** Nothing reaches him until the whole
document is assembled, including the three seat files linked at the bottom.*

**HIS REQUEST, verbatim, and it is the spec:**

> *"one thing i do want to implement is truly a report to start each session. the
> premarket report covers the stocks to watch based on AH activity, but in a true
> report narrative fashion. something that makes people feel like they have
> asssitants working for them. the going into RH, another report, in a "voice" of
> an assistant saying these are the tickers that moved in PM, what went up and
> back down, what held, the real catalysts, and what to keep an eye on for RH
> pop. Then one for going into Power Hour an don for AH."*

**His ruling on the shape:** one writer and one checker, **not** a multi-agent
team; four seats briefed; **a design comes back to him before anything is
built.**

---

## 1. WHAT THIS LAYER IS, AND THE ONE THING IT MAY NEVER DO

**It is PROSE OVER FACTS THAT ALREADY EXIST.** `worker/desk-assessments.ts`
makes **zero model calls, structurally**; `lib/desk/assessment.ts` states that
every change fact is deterministic and that it *"never invents a narrative"*.
**This layer reverses none of that.** The facts stay deterministic and the prose
may only restate them.

**THE DESK ALREADY WRITES SENTENCES, which is the seam this builds on rather
than beside.** `assessment.ts:308` produces `changeSummary` — *"ACME: structure
unknown → CLEAN; new source evidence on file."* **That is deterministic prose
generated with no model.** The report layer's job is narrative ORDER and VOICE
over a set of those, plus the stored numbers behind them.

> **THE RULE THIS LAYER LIVES OR DIES BY: a report may contain no fact that is
> not already in the store. It is a RE-ARRANGEMENT, never an inference.**

---

## 2. THE WRITER AND THE CHECKER

**Two calls, and their independence is the whole design.**

```
WRITER    reads the stored assessment rows + the accepted dossiers
          for the tickers in scope, and writes the narrative.

CHECKER   reads THE STORE AGAIN, independently, plus the writer's draft.
          For each sentence: does a stored fact support it? Strike what does not.
```

**⚠️ THE CHECKER MUST RE-READ THE STORE, NOT THE WRITER'S INPUT SUMMARY.** A
checker handed the writer's own input can only confirm that the writer used what
it was given; it cannot catch a fact the writer invented that *looks* like the
input. **Two readers of one source is a check. One reader and one echo is not.**
*This desk has recorded that shape before: a peer confirming from what you told
it returns your own sentence with a second name on it.*

**WHY NOT A MULTI-AGENT TEAM, beyond his ruling: every additional writer is
another independent chance to invent, and the checker's cost scales with the
number of sentences it must trace.** One writer is one surface to verify.

**THE CHECKER'S OUTPUT IS A STRIKE LIST, NOT A REWRITE.** If the checker may
rewrite, it becomes a second writer and nothing verifies *it*. It returns the
sentences that fail and the report ships without them.

---

## 3. THE FOUR REPORTS AND WHAT EACH READS

**⚠️ CORRECTION TO THE ROUTED MAPPING, AND IT IS A TIMING DEFECT: a report must
be built from the checkpoint BEFORE the moment it describes, or it arrives after
that moment has started.**

| report | moment it serves | checkpoint it reads | note |
| --- | --- | --- | --- |
| **Premarket** | before 04:00–09:30 | `NEXT_DAY_RECAP` 22:00 + `PREMARKET_0700` | 07:00 is well before the open |
| **Going into RTH** | before 09:30 | `OPEN_SPIKE_ASSESSMENT` 09:25 | 5 minutes of head-room |
| **Going into power hour** | before **15:00** | **`RTH_INTERVAL` at 14:30 — NOT 15:00** | *the routed mapping said 15:00, which IS power hour; a report built from it arrives inside the hour it was meant to precede* |
| **After-hours** | after 16:00 | `RTH_CLOSE` | it describes a session that has ENDED, so it is the one report that may be built from the moment itself |

**The 14:30 correction is the "know which EVENT your reading brackets" rule:** a
reading taken at the boundary describes the moment rather than preceding it.
**The RTH interval runs 10:00 every 30 minutes (`schedule.ts:80-81`), so 14:30
exists and needs no new checkpoint.**

**WHAT EACH REPORT READS, per ticker, all already persisted
(`assessmentRepo.ts:59-96`):** `price`, `percentChange`, `rvol`, `rvolRank`,
`ahPercentChange`, `ahVolume`, `ahParticipation`, `ahRank`, `sessionHigh`,
`sessionLow`, `referenceClose` **and `referenceBasis`**, `cycle`, `catalyst`,
`structure`, `warnings`, `changedFields`, `changeSummary`.

**`referenceBasis` is not optional decoration.** It says whether a percent change
is measured against the PRIOR session's close or the CURRENT one. **A report that
says "up 40%" without knowing which is the frame is the "a value with no frame"
defect in a sentence a paying stranger reads.**

**His "what went up and back down, what held" is ALREADY COMPUTABLE** from
`sessionHigh` against `price` per ticker — the giveback. **No new measurement is
needed for the narrative he actually asked for.**

---

## 4. COST, SIZED

**Today's research spend is \$6.99/session, of which INTERPRETATION is ~60%
(\$4.22).** *Rates read first-hand 2026-09-25 from the published list; see
`research.md`.* **A report must not re-run interpretation. It reads what exists.**

```
per report:  writer   input ~10k tok (25 tickers x ~250 tok + dossier summaries)
                      output ~800 tok
             checker  input ~11k tok (the store again + the draft)
                      output ~300 tok (a strike list, not prose)
```

| model pair | per report | per session (x4) | per year (252) |
| --- | ---: | ---: | ---: |
| both on `gpt-5.6-terra` (\$2.00 / \$12.00) | **\$0.055** | **\$0.22** | **~\$56** |
| both on `gpt-5.6-luna` (\$0.20 / \$1.20) | **\$0.0055** | **\$0.022** | **~\$5.60** |

**So the whole feature is between \$6 and \$56 a year. It is not a cost
decision.** *State it anyway, because "sized not discovered" is the constraint —
and because the number being small is itself the finding.*

**⚠️ MODEL CHOICE IS A CORRECTNESS QUESTION, NOT A COST ONE, AND I WOULD SPLIT
THE PAIR.** The writer is prose-from-structured-facts, which a cheap model does
well. **The checker decides what ships to a paying stranger, and a checker that
rubber-stamps is worse than no checker at all** — it converts an unverified
report into a verified-looking one. *Proposed: writer on the cheap tier, checker
on the interpreter's tier, and the checker's false-pass rate measured on
deliberately corrupted drafts before it is trusted.* **Nobody has measured that,
and it must be measured before this ships.**

---

## 5. FAILURE MODES

| failure | what the report must do |
| --- | --- |
| **The checkpoint did not run** | say the session has no assessment at that time — **never fall back to an older checkpoint silently.** A report built from 09:25 that silently used 07:00 describes a market two hours gone. |
| **A stale dossier** | `catalyst` on the row is a stored grade; freshness is derived. **Use the desk's own derivation, not the stored word.** |
| **A holiday or a half day** | the checkpoint set differs; `previousTradingDate` is holiday-aware. **A report for a session that did not happen must not be generated at all.** |
| **A name with no live feed** | **only the top 50 by rank get trades/quotes and 10s capture (`engine.ts:2088`).** A report must not narrate trade-level detail for a name that has none — and **must not imply the absence of activity when the absence is of observation.** |
| **No catalyst found** | **"no catalyst found in our sources", never "no catalyst".** Coverage misses wire-only releases until the Benzinga collector ships: `AIFF` ran on a release the desk had in an API it already pays for and never queried. |

---

## 6. WHAT IS NOT DECIDED HERE

- **Where commentary ends and advice begins** — Commercial. *"What to keep an eye
  on" for a paying stranger is the edge, and it is not this seat's to draw.*
- **The voice, and the words it never uses** — Marketing.
- **Where the reports live and how a reader tells fresh from stale** — Design.
- **Which process runs it** — Ops owns `worker/`. **Not consulted tonight: Ops
  has his market-worker restart this evening.**

**And one constraint that is this desk's own record rather than taste: justify
every claim by a published claim or a measurement, never by his trading habits.**
*He is long-only; `BACKSIDE_RETRACEMENT` and `OFF HIGH` are exit and avoid
signals, never short entries. A report that reads them as shorting signals would
be inventing a strategy he does not trade.*

---

## SEAT FILES

- **`design-seat.md` — Design. LANDED (`5da8d47`).** *One briefing line between Focus and Discovery; six worded arrival states; an unchecked draft never renders and a missed report is never filled with yesterday's; fresh-vs-stale is a predicate, not an age threshold.*
- `marketing.md` — Marketing. *Voice framework in progress; specimens pending the facts file below.*
- `commercial.md` — Commercial. *Pending.*
- **`facts-2026-09-18.md` — real stored facts for the specimens, pulled by this seat.** *A production SNAPSHOT on this disk, not production.*

*Research assembles; nothing goes to him piecemeal.*

---

## 7. THE PAYLOAD CONTRACT — Design asked for it, and one field it requested cannot be honest

**Design's ask (its §4):** per report — `kind`, `tradingDate`/`targetTradingDate`, `scheduledFor`, `relevantUntil`, `dataAsOf`, `publishedAt`, `band`, `liveCoverageCount`, `headline`, and `sections[]` of `{heading, lines[] of {ticker|null, text}}`. **Checked text only; a missing report is an absent row plus its schedule entry, never a row with empty text.** *Agreed in full, and the last clause is the one that matters most — an empty-text row is a report that exists and says nothing, which is exactly the shape a reader cannot distinguish from a quiet session.*

**⚠️ `liveCoverageCount` NEEDS A DEFINITION OR IT WILL BE READ AS COVERAGE OF THE MARKET.** It can only mean *"how many named tickers in THIS report had a live trades/quotes feed"* — the top-50 `internalRank` set (`engine.ts:2088`). **It is a property of the desk's observation, not of the session**, and a number with no frame beside prose is the defect this layer is most likely to produce. *Proposed: emit it as `{ named: n, withLiveFeed: m }` so the denominator travels with it and no surface has to reconstruct it.*

**AND ONE FIELD I WOULD ADD: `checkpointId` and `checkpointType`.** *Design's `dataAsOf` says WHEN; it does not say WHICH checkpoint, and my §5 forbids silently falling back to an older one. With the id on the payload, "this report was built from the 09:25 open-spike assessment" is verifiable by a reader rather than asserted by us.*
