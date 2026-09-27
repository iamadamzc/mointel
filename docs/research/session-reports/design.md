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

## ✅ HIS RULINGS, 2026-09-27 — BUILD APPROVED, AND THE SHAPE CHANGED

> ***"1 set ranges, 2 yes, 3 yes."***

**1 — SET RANGES, NOT PER-USER RANGES.** *A few fixed ranges (the example put to him: under \$1, \$1–\$20, \$20–\$50), **one written-and-checked report per range per checkpoint.** A user reads the report for their chosen set range; the board stays freely adjustable.* **2 — Commercial scopes price-based pricing tiers, document only. 3 — BUILD APPROVED**: Research builds the writer and checker, Design the panel, Ops the process.

**⚠️ THIS MULTIPLIES EVERYTHING BY N AND THE DESIGN ABOVE WAS WRITTEN FOR N=1.** *Every cost, latency and failure figure below predates the ruling; where they disagree with this section, this section is right.*

| | per session | per year | against today's \$6.99 |
| --- | ---: | ---: | ---: |
| N=1, writer+checker on `terra` | \$0.22 | \$55 | +3.1% |
| **N=3, `terra`** | **\$0.66** | **\$166** | **+9.4%** |
| **N=3, `luna`** | **\$0.066** | **\$17** | **+0.9%** |
| N=5, `terra` | \$1.10 | \$277 | +15.7% |

**⚠️ THE RANGE LIST IS CONFIGURATION, NOT CONSTANTS. Commercial's tier scope may redraw the boundaries**, so the set is a list read at runtime. **Build and test against `\$1–\$20` first — his own range, and the default.**

**⚠️ TIMING IS NOW N WRITER+CHECKER PAIRS AGAINST THE SAME 5 MINUTES.** Into-RTH has 09:25→09:30. *The ranges are INDEPENDENT — no report reads another's rows — so they can run concurrently and the wall clock need not scale with N.* **But that is a claim about a thing not yet built: MEASURE IT, and if they cannot all finish, say WHICH GIVES rather than letting the last one arrive late unannounced.**

**Each range's report RANKS INSIDE ITS OWN RANGE** — the reason he chose set ranges over filtering one wide report. **Stored ordinals computed over another band are OMITTED** (`4766ea2`).

---

## 🔒 PRE-REGISTERED — WHAT THE CHECKER MUST DO TO PASS, WRITTEN BEFORE THE TEST RUNS

*Required by Integration's constraint and by §4 of this document. **Recorded BEFORE building the checker so the bar cannot move to meet the result.** A criterion written after seeing the number is not a criterion.*

**THE TEST.** Take real checked reports. Corrupt each with ONE seeded defect. Run the checker. **It passes only if it strikes the corrupted sentence.**

**THE SIX DEFECT CLASSES, each drawn from a real error made during this design rather than invented:**

| # | seeded defect | the real instance it comes from |
| --- | --- | --- |
| 1 | a number changed to one not in any stored field | — |
| 2 | a number taken from a DIFFERENT checkpoint's row | Marketing's `TCRT "+38.8% premarket"`, correct number, wrong row |
| 3 | a percent stated against the wrong basis | the 22:00 recap is `CURRENT_SESSION`, the other three `PRIOR_SESSION` |
| 4 | an absence claim the data cannot support | *"dropped off the board"* — unwritable under a 25-row cutoff |
| 5 | a rank asserted that is true of another checkpoint | my own *"IMCC #1 at every checkpoint"* — it is #4 at the recap |
| 6 | an unobservable cause given for a missing report | *"the market was quiet"* rather than *"the 09:25 assessment did not complete"* |

**PASS = 6/6 STRUCK, and a FALSE-PASS RATE OF 0 ON THE SEEDED SET.** *Anything less does not ship. A checker that catches five of six is not 83% safe — it is a checker with one blind class, and class 5 is the one I personally produced.*

**AND THE CONTROL, WITHOUT WHICH THE ABOVE IS WORTHLESS: run the checker on the UNCORRUPTED reports too. It must strike NOTHING.** *A checker that strikes everything scores 6/6 on the corrupted set and is useless. **This desk shipped a guard that refused everyone once already** — test that it ADMITS before believing that it refuses.*

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

**⚠️ THREE RULES A HIDDEN STRIKE LIST FORCES ONTO THE WRITER — Design's, and (b) is the one that stops a silent removal telling a lie:**

- **(a) ONE SELF-CONTAINED LINE PER TICKER. No "it", no "also", no "the same name".** *Anaphora means a strike can orphan the line after it.*
- **(b) "NOTHING HAPPENED" EXISTS ONLY AS A WRITTEN, CHECKED LINE.** An empty section always reads *"Nothing in our sources for this section"*. **Without this, striking the only held name publishes "nothing held" BY OMISSION** — and that is the one case a hidden strike list gets wrong, because the reader cannot tell a checked absence from a removed presence.
- **(c) A STRUCK HEADLINE IS NOT REPLACED.** *A replacement is a second draft nothing verified.*

**THE STRIKE RATE IS THE QUALITY MEASURE AND GOES TO DIAGNOSTICS.** *It is also the input to the false-pass test: a checker whose strike rate is near zero on live drafts is either reading a writer that never errs or is not reading at all, and only corrupted-draft testing separates those.*

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
| **Premarket** | before **04:00** | **`NEXT_DAY_RECAP` 22:00 — ALONE** | *see below; 07:00 was wrong for two independent reasons* |
| **Going into RTH** | before 09:30 | `OPEN_SPIKE_ASSESSMENT` 09:25 | 5 minutes of head-room |
| **Going into power hour** | before **15:00** | **`RTH_INTERVAL` at 14:30 — NOT 15:00** | *the routed mapping said 15:00, which IS power hour; a report built from it arrives inside the hour it was meant to precede* |
| **After-hours** | after 16:00 | `RTH_CLOSE` | it describes a session that has ENDED, so it is the one report that may be built from the moment itself |

**⚠️ AND THE SAME DEFECT WAS IN MY OWN FIRST TABLE. Design caught it: the premarket report serves a session that opens at 04:00, so building it from the 07:00 checkpoint arrives THREE HOURS INTO the session it was meant to start.** *I corrected the routed 15:00 mapping and then made the identical error one row above it.*

**TWO INDEPENDENT THINGS SETTLE IT AT 22:00, AND NEITHER IS A PREFERENCE:**

1. **HIS WORDS ASSIGN THE CONTENT.** *"the premarket report covers the stocks to watch **based on AH activity**"* — after-hours is complete at 20:00 and recapped at 22:00. **A 07:00 report would be about PREMARKET activity, which is the into-RTH report's job in his own next sentence.** *Building it from 07:00 both arrives late AND duplicates the next report's material.*
2. **THE CODE AGREES, AND THIS IS THE STRONGER HALF. `NEXT_DAY_RECAP` carries `target_trading_date` = the NEXT session** — verified in the store: `tradingDate=2026-09-22, TARGET=2026-09-23`. **The trading date rolls at 22:00** (`checkpointDates.ts:12`), so **the 22:00 recap is the FIRST checkpoint of the new session.** *A report built from it is literally what he asked for: "a report to start each session."*

⇒ **PREMARKET = 22:00 RECAP. `PREMARKET_0700` is at most an UPDATE**, which Design's surface already supports as a second published report in the same slot.

**The 14:30 correction is the "know which EVENT your reading brackets" rule:** a
reading taken at the boundary describes the moment rather than preceding it.
**The RTH interval runs 10:00 every 30 minutes (`schedule.ts:80-81`), so 14:30
exists and needs no new checkpoint.**

**✅ ONE CHECKPOINT PER REPORT — established by Marketing reading the store first-hand, and it SIMPLIFIES the writer/checker contract rather than constraining it.** *His "what went up and back down" arc lives INSIDE A SINGLE ROW — `session_high` against `price` — so no report needs to reach across checkpoints to tell it.*
  ⇒ **Anything not in the report's own checkpoint is exactly what the checker strikes**, which makes the checker's job a row lookup rather than a timeline reconstruction.
  **✅ RULED 2026-09-27, AND THE REASON IS NOT THE RULE'S CONVENIENCE: NO CROSS-CHECKPOINT READS.** Marketing asked whether a report may say *"it dropped off the board"* — `TCRT` is #6 at the close and absent from the 22:00 recap. **It may not, because the desk cannot tell that from a rank cutoff.**
  **EVERY checkpoint stores EXACTLY 25 ROWS, max rank #25** — verified on both: `16:00 rows=25 maxRank=#25 TCRT #6` / `22:00 rows=25 maxRank=#25 TCRT ABSENT`. **So absence from the recap means "not in the top 25 at 22:00", NOT "left the board". `TCRT` may be #26.** *An absence bounded by a storage cutoff is the same shape as every other defect this desk found this week: several causes collapsing into one observation.*
  ⇒ **"Dropped off the board" is unwritable. "Not in the top 25 at the recap" is true, weaker, and still a cross-checkpoint claim — so the one-checkpoint rule stands and loses nothing worth having.** *If a genuine "left the board" beat is ever wanted it needs a stored event, not an inference from absence.*

  *Consequence for Design's contract: `dataAsOf[]` and `checkpoints[]` now always carry ONE entry. The array shape was built for the premarket 22:00 + 07:00 pairing, which this retired — **keep it, because an update republished into the same slot is still a second entry**, but nothing reads a second one today.*

**AND ONE OMISSION MARKETING MADE THAT BELONGS IN THE CONTRACT: it declined to narrate `TRADING → UNKNOWN` as a halt.** *That transition is a loss of halt OBSERVABILITY, not a halt event.* **With `halt_state` `UNKNOWN` on 10,408 of 13,825 rows, "went to UNKNOWN" is the desk losing sight of a name, and reporting it as an event would be an absence of observation published as an absence of trading.**

**⚠️ AND A CLAIM OF MINE THAT THIS RULE KILLED: I wrote "IMCC was #1 at every checkpoint" AFTER moving the premarket source to 22:00, where it is #4.** Verified: `22:00 #4 · 09:25 #1 · 14:30 #1 · 16:00 #1`. *It was true of the original four moments and became false the moment I changed the mapping — **and I had the disproving line in my own hands**: I quoted the recap's `changeSummary`, `"IMCC: rank #1 → #4"`, in the same message that asserted #1 throughout.* **A fact repeated after the frame it was measured in has moved. The checker would have struck it, which is the argument for the checker.**

**WHAT EACH REPORT READS, per ticker, all already persisted
(`assessmentRepo.ts:59-96`):** `price`, `percentChange`, `rvol`, `rvolRank`,
`ahPercentChange`, `ahVolume`, `ahParticipation`, `ahRank`, `sessionHigh`,
`sessionLow`, `referenceClose` **and `referenceBasis`**, `cycle`, `catalyst`,
`structure`, `warnings`, `changedFields`, `changeSummary`.

**⚠️ THE FOUR REPORTS DO NOT SHARE ONE PERCENT BASIS, AND THE PREMARKET ONE IS THE ODD ONE OUT — a constraint created by moving it to 22:00. Measured on the snapshot:**

| checkpoint | `reference_basis` | what the percent MEANS |
| --- | --- | --- |
| **22:00 recap** → premarket report | **`CURRENT_SESSION`** (25/25) | **movement since TODAY'S close — i.e. the after-hours move** |
| 09:25 → into RTH | `PRIOR_SESSION` (25/25) | from the prior close |
| 14:30 → power hour | `PRIOR_SESSION` (25/25) | from the prior close |
| 16:00 → after-hours | `PRIOR_SESSION` (25/25) | from the prior close |

  *Snapshot-wide: `PRIOR_SESSION` 11,203 · `CURRENT_SESSION` 622.*
  **PROVEN ON ONE ROW RATHER THAN INFERRED: at 22:00, `IMCC` carries `percent_change = -25.1%` and `ah_percent_change = -25.1%` — IDENTICAL, against `reference_close = $4.23`, the day's own close.** *At the recap the headline percent IS the after-hours move.*
  ⇒ **THE PREMARKET REPORT SAYS "since today's close" or "in after-hours", NEVER "from the prior close". A writer applying one wording rule across all four reports gets that one wrong**, and it would be wrong by the width of a whole session: `IMCC` closed **+155.9% from the prior close** and was **−25.1% in after-hours** on the same evening.
  **AND THE BASIS CONFIRMS THE MAPPING RATHER THAN COMPLICATING IT.** His premarket report is *"based on AH activity"* — **the 22:00 checkpoint is the only one whose percent measures exactly that.** *The intent and the stored basis agree, which is a better reason to trust the 22:00 source than the scheduling argument that got us there.*

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

## ✅ CONFIRMED — A \$20–\$50 REPORT IS A MINUTE-BAR REPORT BY CONSTRUCTION, NOT BY MEASUREMENT

*Integration's reading, put to this seat to confirm or refute by opening the code. **Confirmed, every link, with lines.** It decides what a non-default tier can ever contain and it goes to him beside Commercial's tier scope.*

```
engine.ts:1713-1714   priceEligible = price !== null && (inPriceRange(price) || latched)
engine.ts:1755-1762   latched   = true  ONLY inside inPriceRange      (the single setter)
engine.ts:1958-1962   ahLatched = true  ONLY inside inPriceRange      (the single setter)
engine.ts:2152-2156   high-res arm 1: rank <= internalRank AND alive, over `ranked`
engine.ts:2165-2172   high-res arm 2: after the bell, daytime rvolRank <= discoveryRank
engine.ts:2174+       high-res arm 3: latched AND alive
engine.ts:2185        capped at highResMax ?? 250, pinned first
```

**A name trading ENTIRELY in \$20–\$50 while QUALIFY stays at his \$1–\$20 is never `inPriceRange`, therefore never latched and never `ahLatched`, therefore never `priceEligible`, therefore NEVER RANKED — so it satisfies no high-res arm except `pinned`.**

⇒ **NO LIVE FEED AND NO 10s CAPTURE, ZERO BY CONSTRUCTION.** *Not "unmeasured crowding" — a load test would only ever report on names that CROSSED UP from inside the band, which is a different population and would read as reassurance.*

**AND THE SAME CHAIN GOVERNS THE 10s CAPTURE**, because `af998eb` gates accumulation on `runtime.highRes`. **So the \$20–\$50 tier has no sub-minute data either — the thing he commissioned most recently does not reach the tier he has just asked for reports on.**

**WHAT THAT MEANS FOR THE BUILD, and it is not a blocker:**
- **The \$20–\$50 report is honest and thin. Its `liveFeed` flags will say so — IF they read the engine's actual set** rather than inferring from rank, which is the gap recorded below.
- **In-range RANKING (`4b7fca4`) gives that report a sensible order. LIVE-FEED ALLOCATION DOES NOT FOLLOW IT.** *Two different questions that look like one: what a report RANKS is now per-range; what the desk OBSERVES is still allocated over the qualify band.*
- **This is the price-band split behaving exactly as designed** — `capturePriceMin/Max` widens ADMISSION so those names have minute bars, and qualification stays narrow so they never crowd his board. **The thinness is the intended trade, stated rather than discovered.**

**⚠️ ONE THING I CHECKED THAT COULD HAVE MADE IT WORSE, AND DID NOT: arm 2 compares `rvolRank <= discoveryRank`, and `null <= 12` is TRUE in JavaScript.** *If that arm iterated every ticker, an after-hours-only name with a null daytime rank would be admitted by coercion.* **It does not — `engine.ts:2166-2167` filters `rvolRank !== null` before sorting.** *The `as number` casts are safe because both arms iterate pre-filtered arrays. Verified rather than assumed, because a silent null-coercion into a capped set is exactly the defect that would never show up as an error.*

## 5. FAILURE MODES

**⚠️ CORRECTED 2026-09-27 — "ONLY THE TOP 50 GET A LIVE FEED" IS WRONG, AND IT REACHED THIS DOCUMENT AND THE PAYLOAD CONTRACT.** *Integration's brief said it, this seat repeated it twice, Commercial found it, and I verified `applyHighResSelection` (`engine.ts:2121`) myself.* **The set is:**

```
pinned names
+ top internalRank (50) by rank AND alive
+ after the bell, the daytime top discoveryRank
+ EVERY LATCHED name still alive -- qualified at any point today
capped at highResMax ?? 250, pinned first, then by rank
```

  **So a name outside the top 50 that qualified earlier and is not DEAD DOES have a feed.** *And the aliveness test fails OPEN: only a positive `DEAD` gives up a subscription, because `'UNKNOWN'` means the engine looked and could not say.*

**⚠️ AND THE DESIGN GAP INTEGRATION ASKED ME TO CONFIRM IS REAL, AND NARROWER THAN IT LOOKS: `high_res` IS PERSISTED — ON THE LIVE ROW, NOT ON THE CHECKPOINT.** `ticker_session.high_res` exists (`db.ts:121`, read at `repo.ts:656`). **`desk_assessment_tickers` has no such column.**

  ⇒ **A report written AT its checkpoint can read the live set. A report built later — a catch-up, or any re-render from stored rows — CANNOT RECOVER what the set was at that moment**, because the live row has moved on. **Inferring it from rank is the same defect in code, and it is wrong in both directions: it misses latched-and-alive names and it over-claims for a dead name still inside the top 50.**

  **THE FIX IS ONE COLUMN ON THE ASSESSMENT TICKER ROW, FROZEN AT CAPTURE — and that is Ops's, because it defines and migrates a table.** *Until it exists: **`liveFeed` is omitted rather than guessed**, and `coverage` reports `withLiveFeed` only for a report written at its own checkpoint. **An unknown feed state must not render as `false`** — that is an absence of observation published as an absence of data, which is the defect this whole layer is built to avoid.*


| failure | what the report must do |
| --- | --- |
| **The checkpoint did not run** | say the session has no assessment at that time — **never fall back to an older checkpoint silently.** A report built from 09:25 that silently used 07:00 describes a market two hours gone. |
| **A stale dossier** | `catalyst` on the row is a stored grade; freshness is derived. **Use the desk's own derivation, not the stored word.** |
| **A holiday or a half day** | the checkpoint set differs; `previousTradingDate` is holiday-aware. **A report for a session that did not happen must not be generated at all.** |
| **The report is slower than its head-room** | **UNMEASURED, and it must be measured before anything promises "before the open".** Into-RTH has 5 minutes from 09:25, checkpoints already run late (`generatedLate`), and writer + checker is two sequential model calls. **Past 09:30 it publishes marked late rather than silently.** |
| **A name with no live feed** | **the live-feed set is NOT "top 50 by rank" — see the correction below.** A report must not narrate trade-level detail for a name that has none — and **must not imply the absence of activity when the absence is of observation.** |
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

- **`design-seat.md` — Design. LANDED (`23ebbb9`).** *One briefing line between Focus and Discovery; six worded arrival states; an unchecked draft never renders and a missed report is never filled with yesterday's; fresh-vs-stale is a predicate, not an age threshold.*
- **`marketing.md` — Marketing. LANDED (`33256f9`).** *Voice principles, the never-use list, the "we don't know" register, and two specimens written against real 2026-09-18 rows with every clause traced to a stored field.*
- **`commercial.md` — Commercial. LANDED (`3740d61`).** *Both flagged phrases ruled; the forward frame needs no new disclaimer; `terms.md` §7 already covers in-app.*
- **`facts-2026-09-18.md` — real stored facts for the specimens, pulled by this seat.** *A production SNAPSHOT on this disk, not production.*

*Research assembles; nothing goes to him piecemeal.*

**⚠️ EVERY SEAT FILE MOVED AFTER ITS SEAT CALLED IT FINISHED — all three, in one evening.** Design `5da8d47`→`23ebbb9`, Marketing `bf56acb`→`0f7f5b6`, Commercial `2cb28c2`→`3740d61`, and this file four times. **Each change was a correction rather than an addition, and each was found by a seat OTHER than the author.** *So "the doc is whole" is a statement with a shelf life: **quote the sha, never the word.** A reader given "whole" cannot tell which version was whole.*

---

## ✅ ASSEMBLED — ALL FOUR HALVES IN. THE ONE FINDING NO SEAT COULD SEE ALONE

**Commercial names the sharpest practical risk in the whole design, and Design had already closed it — independently, before it was named.**

> **Commercial (`commercial.md`):** *"the sharpest practical risk in this whole design, and it has nothing to do with legal wording... **The entire discipline in §3 (state, not action) can be defeated by truncation alone**: a compliant sentence ending in "...has not been priced out" reads as complete and inert; a banner that cuts it to "X is at its premarket high" and stops there reads as an implicit tip — not because anyone wrote it that way but because the medium removed the qualifying half."*
>
> **Design (`design-seat.md:105-107`):** *"**Arrival is in the app only.** ... **No push, no email, no sound.**"*

**⚠️ SO THE COMPLIANCE PROPERTY HOLDS ONLY BECAUSE OF A SURFACE DECISION IN A DIFFERENT SEAT'S FILE, AND NEITHER FILE SAYS SO.** *Design chose in-app-only for readerly reasons — a report is not an alert — and the effect is that Commercial's truncation risk cannot arise. **Add push later for a good product reason and the discipline breaks silently**, because the sentence that protected it lives in a document nobody re-reads when adding a notification.*

⇒ **RECORDED AS A COUPLING RATHER THAN A COINCIDENCE: any decision to push, email or otherwise excerpt a report re-opens Commercial's §4 and must go back to it.** *This is the "two correct guards" shape in its benign direction — and benign is exactly when nobody writes it down.*

**WHAT COMMERCIAL RULED, so the writer contract carries it:** *"keep an eye on for RH pop"* and *"one to watch"* are **struck as directive**, replaced by a descriptive-state pattern that **reuses `assessment.ts`'s existing rule rather than inventing a new one**. **The forward-looking frame itself needs no new disclaimer.**

**COMMERCIAL'S §6 — THE DIRECTIONAL-LABEL RULING, AND A BETTER FORM OF IT THAN EITHER OF US WROTE.** It ruled that report copy must render a label's DEFINITION rather than its enum name, because he is long-only and a bare `BACKSIDE` can read as a short thesis. **Agreed — and the definition it wants ALREADY EXISTS IN CODE, so the writer must not compose its own.**

```
lib/dashboard/cycle.ts:99    `${pct(retracementPct*100)} of the move given back`
```

  ⇒ **The rule is not "write the definition", it is "USE THE EXISTING RENDERER"** — the same discipline as `language.ts` for labels, and it keeps one source of truth instead of a second phrasing that can drift from the first. *Marketing's specimen already satisfies it in substance: it prints "60% off its high" beside the label and frames it exit-and-avoid.*
  **⚠️ AND ONE CITATION CORRECTION, because it is the kind that propagates: Commercial verified against `lib/market/cycle.ts:456` / `:471`. The definitions are not there — that file computes the PHASE (`phase = 'BACKSIDE'` at `:445`). The human rendering lives in `lib/dashboard/cycle.ts`.** *There are two files named `cycle.ts` and they do opposite jobs: one decides the label, one says it in English. **Commercial read the engine and reported on the renderer**, which is exactly how a verified-looking citation goes wrong.* *Its RULING is unaffected and correct; only the receipt pointed at the wrong file.*

**AND COMMERCIAL SAID PLAINLY WHAT IT IS NOT: this is not a clearance.** *State-level adviser law is unchecked and counsel is his call.* **That sentence travels with this document to him — it is not a footnote to be assembled away.**

---

## 7. THE PAYLOAD CONTRACT — Design asked for it, and one field it requested cannot be honest

**Design's ask (its §4):** per report — `kind`, `tradingDate`/`targetTradingDate`, `scheduledFor`, `relevantUntil`, `dataAsOf`, `publishedAt`, `band`, `liveCoverageCount`, `headline`, and `sections[]` of `{heading, lines[] of {ticker|null, text}}`. **Checked text only; a missing report is an absent row plus its schedule entry, never a row with empty text.** *Agreed in full, and the last clause is the one that matters most — an empty-text row is a report that exists and says nothing, which is exactly the shape a reader cannot distinguish from a quiet session.*

**✅ SETTLED — COVERAGE AND THE RECEIPT, and Design's answer on the second is better than what this seat asked for:**

```
coverage      { named, withLiveFeed }   printed "5 of 7 names had live trade data"
              plus liveFeed: boolean PER LINE, so a named ticker without a feed
              carries a quiet "minute data" qualifier and the denominator reads line by line
checkpoints[] { id, type, completedAt }  one per checkpoint read. The reader never
              sees the id; the header names it by schedule label ("09:25 open
              assessment") and CLICKING IT OPENS that checkpoint in the frozen
              AssessmentSnapshotBoard.
```

  **The per-line `liveFeed` flag is the part I did not think to ask for: a header count tells a reader how much of the report is observed, and a per-line flag tells them WHICH SENTENCE is.** *Design also struck its own first example — "50 names with live trade data" — which was the desk's SUBSCRIPTION SIZE presented as a property of the report.*
  **AND THE RECEIPT CAN BE OPENED RATHER THAN ONLY PRINTED.** *I asked for a `checkpointId` so a claim could be verified; Design made it navigable to the frozen board the checkpoint actually produced. **A receipt you can open beats a receipt you can read**, and the surface for it already existed.*

**⚠️ WHY IT NEEDED A DEFINITION AT ALL, kept because the reasoning generalises:** It can only mean *"how many named tickers in THIS report had a live trades/quotes feed"* — the top-50 `internalRank` set (`engine.ts:2088`). **It is a property of the desk's observation, not of the session**, and a number with no frame beside prose is the defect this layer is most likely to produce. *Proposed: emit it as `{ named: n, withLiveFeed: m }` so the denominator travels with it and no surface has to reconstruct it.*

**AND ONE FIELD I WOULD ADD: `checkpointId` and `checkpointType`.** *Design's `dataAsOf` says WHEN; it does not say WHICH checkpoint, and my §5 forbids silently falling back to an older one. With the id on the payload, "this report was built from the 09:25 open-spike assessment" is verifiable by a reader rather than asserted by us.*
