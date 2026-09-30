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

**🔒 REGISTRATION AMENDED 2026-09-30, BEFORE ANY CHANGE TO THE STRIKE LOGIC AND BEFORE RUN 2 (Integration's order call after run 1).** *Precision (Integration's catch): `e67a91b` changed `applyStrikes` in `check.ts` 34 s before this amendment (`2f75143`), but only how an emptied section renders, not which lines are struck. The strike-logic fix is `1c47bfb`, after both amendments.*
- **N = 3 checker runs per draft**, the full checker (rules + model) each time, same model, same prompt, same rows.
- **SYMMETRIC:** a keyed defect line counts as STRUCK only if **all 3** runs strike it; a control line counts as ADMITTED only if **all 3** runs admit it. **An unstable verdict fails either way.** A run that returns `CHECKER_FAILED` counts as not striking a keyed line AND as striking every control line.
- **PASS = 18/18 keyed lines struck in all 3 runs AND 0 control lines struck in any run.** Extra strikes on non-keyed lines of corrupted drafts are reported, not graded.
- **Run 2 uses a FRESH set, authored by Marketing INFORMED, BLIND TO THE CHECKER** (Integration's ruling: Marketing has read run 1's causes in this document, not the checker, its fix or the new sha). It is hash-locked before release and released only after the freeze. Checkpoints: 2026-09-22 (ids 475 / 461 / 471 / 474), the $1–$20 range. Run 1's set is spent: its controls have been read.
- **Set 2's composition, and each part is reported SEPARATELY:** (a) six-class defects, keyed as in run 1; (b) **REGRESSION CONTROLS**: keyed clean lines carrying each of run 1's four struck forms (a change note said "since the last check"; "no catalyst … on file" / no research on file; the report kind's own frame; the ruled red-backside "exit-and-avoid" reading); (c) **ORDINARY CONTROLS** in the v3 voice. **(b) and (c) must BOTH be 0 strikes on every run.** PASS = every (a) line struck in all 3 runs AND 0 strikes in any run on (b) or (c).
- Everything else is as registered: one checkpoint per report, the rows re-read from the store, $1–$20, the harness committed before any call, and the raw output committed before it is read.

**✅ RUN 2, 2026-09-30: PASS AS REGISTERED (as amended).** *Set 2: Marketing, informed, blind to the checker (`defect-set-2.md`, sha verified; locked `764ba14`). Checker v2 frozen at `1c47bfb`. Harness `25ec0a0`, committed before any call. Raw output `d7c5df4`, committed before it was read. 2026-09-22 checkpoints 475 / 461 / 471 (474 unused by the author), $1–$20, terra, N = 3, $0.62.*
- **Defects: 18/18 keyed lines struck in ALL 3 runs**, every class. The model struck all 54 line-runs; the rules also struck 39 of them. **Regression controls (run 1's four forms): 0 strikes in 9 control-runs. Ordinary controls: 0 strikes.** No extra strikes on corrupted drafts; no `CHECKER_FAILED`.
- **WHAT THIS DOES NOT SHOW, and it travels with the result:** it is one day's checkpoints, three report kinds (no after-hours report was seeded), and 21 drafts written by one author. The four fixes were written knowing run 1's causes, so the regression controls test that those fixes took, not that nothing else is missing; the ordinary controls are the independent evidence of admission. N = 3 bounds instability on THESE lines only. It says nothing about live drafts' strike rate, which goes to diagnostics.
- **The bar gates "anything live"; it is not a ship.** Still unbuilt before reports can go live: `GET /api/reports` and the range config (Research), the 20:05 checkpoint and per-range top-N storage (Ops). The ship is his yes.

**❌ RUN 1, 2026-09-30: FAIL AS REGISTERED.** *Set: Marketing's blind `defect-set.md` (sha verified; `67406d5`). Checker `cdc77af`. Harness and predictions `82b07ae`, committed before any call. Raw output `dbb2889`, committed before it was read. $1–$20, terra, one run per draft, $0.24.*
- **Defects: 18/18 keyed lines STRUCK**, every class 3/3. The model struck all 18; the rules alone struck 13.
- **Controls: 5 false strikes on 3 controls, so FAIL.** (i) "lost $X support since the last check" ×2 (model): the checker's prompt never says every stored note is a change since the previous checkpoint. (ii) "no catalyst, structure or cycle on file" (rule, **PREDICTED in `82b07ae`**): the bare-"no catalyst" rule also matches Marketing's approved "no catalyst on file". (iii) 433-C headline "going into the last hour" at 14:30 (model): the prompt never says the report's own kind is a supported frame. (iv) "an exit-and-avoid read rather than a setup" (model, struck as advice): the ruled long-only definition of red-backside (`commercial.md` §6) is not in the prompt.
- **INSTABILITY, reported:** 423-C's headline "Two names led the premarket" passed in the control and was struck in all 6 of its variants: same line, same rows, different verdicts. **One run is not a stability claim, and this run shows why.**
- **Post hoc, labelled:** all four admission failures trace to a ruled source the checker was never given, not to the specimens. **Nothing ships on run 1.** A run 2 on THIS set would be fitted (its controls are now read), so run 2 needs a fresh blind set.

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

**✅ WRITER SIZED 2026-09-30, MEASURED (Research, provider `OpenAiReportModel`; four real 09-29 checkpoints from the read-only prod copy, one per kind, `$1–$20`, 12 names each, `gpt-5.6-luna`, one call each, no latch map and no live feed, so these are token counts and NOT shippable reports):**

| report | checkpoint | input tok | output tok | latency | cost |
| --- | --- | ---: | ---: | ---: | ---: |
| premarket | #551 recap 22:00 | 2,370 | 2,385 | 19.9 s | \$0.0033 |
| into RTH | #556 09:25 | 2,284 | 2,444 | 19.8 s | \$0.0034 |
| into power hour | #566 14:30 | 2,256 | 1,375 | 11.3 s | \$0.0021 |
| after-hours | #569 16:00 | 2,246 | 2,189 | 17.6 s | \$0.0031 |

**Writer ≈ \$0.003 per report, \$0.012 per range-session, ≈ \$3 a year per range** (priced at luna's \$0.20 / \$1.20 per Mtok as recorded above; 0 cached, so no cached-rate question). **The estimate's SHAPE was wrong and its total was not:** input is ~2.3k, not ~10k (the sheet is compact), and output is 1.4–2.4k, not ~800. How much of that output is reasoning was not captured on this run; the provider now records `reasoningTokens`. **Latency 11–20 s per writer call**, against into-RTH's 5-minute window: the writer alone fits with room. The checker's cost and latency are unmeasured until its semantic half exists.
**Not the pass bar, reported only:** the deterministic checker struck **0 of 84** draft lines, and no draft used a banned word. **One sheet defect found and fixed:** the giveback change note (a STATE: the current distance from the high, written when it first crosses the threshold) was printed under "since the previous checkpoint" as "down 15.7% off its session high", and the draft read it as a 15.7% fall since the last read. ~~The note now reads "slipped to 15.7% under its session high".~~ **The note is now DROPPED from the writer's sheet:** the re-worded version was struck by the checker as a claim about another checkpoint (voice run below), and its number is already the sheet's "now N% under it". **Voice, for Marketing and Design, not a defect:** faithful to the sheet, but it reads as a table in sentences ("Ranked #5 in this range; price \$1.37, …") rather than an assistant's briefing.

**✅ CHECKER BUILT AND SIZED 2026-09-30 (`lib/desk/reports/check.ts`).** Deterministic rules first, on every line, and the model cannot overrule them: numbers traced to the row (`verify.ts`), a rank or clock time from another checkpoint, "prior close" on the after-hours basis, the never-use wording, and a line leaning on another. Then a model reading of the store's own fields, never the writer's sheet: a verdict for EVERY line, and a missing, duplicate or unknown verdict is `CHECKER_FAILED`. Strikes are applied by `applyStrikes`.
**Sized on the same four drafts, rows re-read from the store, `gpt-5.6-terra`: 3.7–4.3k in, 0.6–0.9k out, 5.4–9.1 s, ≈ \$0.015–0.019 per report, \$0.069 spent.** **Writer + checker ≈ \$0.02 a report, ≈ \$0.08 a range-session, ≈ \$20 a year per range; ≈ 17–29 s end to end, inside into-RTH's 5 minutes.** The model struck 1 line, FFAI's old giveback wording, with the right reason. **That is NOT independent evidence:** its guidance on that note was written knowing the defect. **The pass bar (`43c1b7c`) has NOT run**; it needs a seeded set, routed to be written blind to the checker.
**✅ DESIGN ANSWERED BOTH (Design-tmi `local_72b49119`, message 2026-09-30, recorded here by Research; queued, NOT built, because `applyStrikes` is in the `check.ts` frozen for the pass-bar run):**
- **(1) "SANG SANG": the surface KEEPS the ticker lead; the writer's text never repeats its own ticker** and opens on what the name did. Rule (a) still holds, since the surface supplies the subject. **The checker adds nothing:** a line opening with its own ticker is a style miss, not a false claim. *Research's build: the writer's SHAPE bullet. Marketing told.*
- **(2) The emptied section KEEPS its heading and gets a NEUTRAL line that claims nothing about our sources** (Design's placeholder: "No line for this section in this report."; Marketing owns the words). **NOTHING_LINE is reserved for the writer's own checked absence. A section whose NOTHING_LINE was struck ALSO gets the neutral line, not a drop.** This supersedes Research's drop in `cdc77af`. *Research's build: `applyStrikes`, AFTER the pass-bar run. Design changes its surface's `lines.length === 0` render the same way.*

**TWO QUESTIONS FOR DESIGN, found by the run:**
1. **The surface already prints each line's ticker as its lead** (`SessionReports.tsx`, report lines), **and the writer is told to name the ticker in the text**, so a faithful line renders "SANG SANG was up…". Which one gives? *Research's lean: the writer stops repeating it.* The checker requires neither. *A first version struck every line that omitted its ticker (12 true premarket lines); withdrawn before commit.*
2. **"A section left empty, for any reason, reads NOTHING_LINE" publishes a FALSE absence when the strike removed a line about a name that IS in the rows.** For example, a "Held into the close" line struck for saying "will" leaves "Nothing in our sources for this section." while the store holds a name that held. *Research's lean: a section emptied by strikes is DROPPED, and NOTHING_LINE exists only as a line the writer wrote and the checker passed.* **Built as ruled for now, with one addition flagged:** a section whose own NOTHING_LINE was struck is dropped, not refilled, because refilling it would re-publish the refused claim.

**VOICE RUN 2026-09-30, writer prompt v2 (Marketing's VOICE block, `d44dc95`, applied verbatim), same four checkpoints, writer then checker: 5 of 52 lines struck, all by the model.** Headline "remain close to their session highs" ×2 and SDEV "remains at \$3.35" were struck as implying another checkpoint; KMRK's garbled catalyst clause was struck; and FFAI's re-worded giveback note was struck, which is why the note is dropped. The rank moved to the end of the line; most lines still walk the fields. \$0.089 spent. **For Marketing: the VOICE block's own vocabulary ("still leading") is a word the checker strikes as cross-checkpoint.** Design's ticker question (1 below) is unchanged by v2: the SHAPE bullet still asks the text to name the ticker.

**VOICE RUN v3, 2026-09-30 (Integration's order; writer v3 + checker `1c47bfb`, same four 09-29 checkpoints, one run each, no prompt change; harness `c705efc`, raw `caecad3` committed before it was read; \$0.090): 1 of 52 lines struck**, the #551 headline ("two decliners"; the rows show three: CLRO, BNKK, SCYX). **No persistence words, and no line opens with its ticker or its rank.** #551 as a trader reads it: `voice-run-v3-2026-09-30/report-551-as-read.txt`.
**ONE DEFECT THE CHECKER CANNOT SEE, found by reading:** every #551 line says "…from the regular-session close of \$3.59, now 15.1% under it", where "it" reads as the CLOSE, but the 15.1% is the distance from the SESSION HIGH. The numbers are right and the referent is wrong. **Its source is Research's sheet line** "session high: \$6.01; now 15.1% under it", which the writer copies. **Proposed, not done (this pass allows no prompt change):** the sheet says "now 15.1% under its session high". *Checked, NOT a defect:* "ran to \$6.01" in the after-hours report. SANG's stored high was \$5.17 at 16:00 and \$6.01 at 22:00, so it was set after the close (YMT: \$3.11 → \$3.68).

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

## 🕑 HIS 20:05 / 20:30 RULING — DESIGN, NOT BUILT. Answers to A–D, and B does not hold as stated

> ***"why is the run at 10pm if the ah closes at 8? the run should be at 805, then the day starts at 830 pm with a fresh report on ah."***

**C — ADOPT INTEGRATION'S PROPOSAL: keep the 22:00 checkpoint AND the 22:00 trading-date roll unchanged; add a ~20:05 "after-hours complete" checkpoint, publish the premarket report from it at ~20:30, and publish a 22:00 FILINGS UPDATE into the same slot.** *Design's surface already supports an update in a slot and shows the newer one.* **The paid day's boundary is a billing concept and does not require the internal roll to move.**

**⚠️ B — THE PREMISE IS NOT CONFIRMED, AND WHAT IS CONFIRMED STRENGTHENS C RATHER THAN WEAKENING IT.** *Integration's understanding was that EDGAR accepts filings until 22:00 ET, so a 20:05 report would structurally miss 20:00–22:00 filings.*

**What the code says** (`session.ts:301-307`, quoted not paraphrased): the two hours exist because *"the desk is still watching filings against it"*.

**What I could confirm, from eCFR 17 CFR 232.13(a)(2):**

> *"all filings submitted by direct transmission commencing after 5:30 p.m. Eastern ... shall be deemed filed as of the next business day."*

⇒ **A filing transmitted between 20:00 and 22:00 is NOT a filing against the session that just ended. Its official date is the NEXT business day.** *So the 22:00 window is a **visibility** window, not a same-day-filing window — the desk sees those documents early, it does not capture them for that session.*

**What I could NOT confirm: the 22:00 operating-hours figure itself.** *Tried the EDGAR filer FAQ, technical specifications, search-filings and filer-information pages; the hours are not stated on any of them, and I am not asserting a number I could not source.* **It belongs in the EDGAR Filer Manual, which I did not reach.**

⇒ **This makes C stronger, not weaker: if the window is about SEEING filings early rather than DATING them, an update into the same slot serves it exactly as well as moving the roll would — and at a fraction of the risk.**

**✅ A — ANSWERED BY OPS FROM PRODUCTION: 20:05 STANDS, WITH ~5 MINUTES OF MARGIN.** *And the measurement is built the right way round, which is why it is quotable.*

```
population   bars ts 19:00-19:59 ET, tracked symbols, ~9-11k rows/day, 09-22..09-25
method       received_at is overwritten on every upsert, so it is the LAST-WRITE time
             historical-source rows EXCLUDED (a restart backfill would fake late corrections;
             there were 0 in window anyway)
result       p99 last-write lag 0.3-0.4s, max ~30s
             last write to ANY 19:xx bar: 20:00:00.04-.18 ET
             0 written after 20:05 on all four days
limits       four ordinary weekdays, no half day, last write only
```

  **THE POSITIVE CONTROL IS WHAT MAKES THE ZERO MEAN SOMETHING, and I verified its load-bearing claim rather than accepting it.** *Ops's control: the session guard tests the BAR's timestamp, not its arrival, so a 20:03 correction to a 19:59 bar WOULD have been written — it could have appeared and did not.* **Confirmed at `engine.ts:1013-1018`: `inSessionWindow(ts)` parses the OBSERVATION's `ts` and compares it to the session bounds. Arrival time is never consulted.** *Had the guard tested arrival, a late correction would have been rejected BY THE GUARD and its absence would have proved nothing — the check would have been blind to exactly the case it was run for.*
  **This seat asked the right question and Ops asked a better one.** *I said "ask how late the last correction lands, not whether the bars arrived." Ops did that AND built a control for the answer being an artefact of the instrument — which is the half I did not specify.*

**⚠️ WHAT THIS SEAT COULD NOT ANSWER, KEPT BECAUSE IT EXPLAINS WHY IT WENT TO OPS:** *The local store holds two sessions and its last-bar timestamps are contaminated by the roll itself — `2026-08-18`'s latest bar is stamped `08:23 ET the next morning`, a premarket bar filed under the prior trading date.* **That is a production measurement and it is Ops's.**
  **What I can name is the actual risk, which is not initial delivery: a minute bar for 19:59 closes at 20:00 and arrives within seconds. The exposure is LATE `updatedBar` CORRECTIONS**, which the desk already absorbs because `upsertMinuteBars` is an upsert. *So the question for Ops is not "have the bars arrived" but **"how late does the last correction land"** — and if it is routinely past 20:05, the fix is to move the checkpoint, not to weaken the report.*

**D — MATCHES HIS ORIGINAL REQUEST.** *"Then one for going into Power Hour an don for AH"* → premarket ~20:30 (from 20:05, + the 22:00 filings update), into RTH from 09:25, power hour from 14:30, into AH from 16:00. **The 16:00 report goes INTO after-hours; the 20:30 report says what after-hours DID and opens the paid day. They are different reports about the same window and neither duplicates the other.**

**AND ONE CONSEQUENCE WORTH HAVING FOR THE N-RANGES TIMING PROBLEM: the premarket report now has ~25 MINUTES of head-room (20:05 → 20:30), against the 5 minutes into-RTH has at 09:25.** *So N writer+checker pairs are far less risky on the report that opens the paid day than on the one before the open — which is the report the latency measurement should target first.*

## ✅ THE WRITER'S CLOCK IS `completedAt`, NEVER `scheduledFor` — and the measurement says why that matters

**Design's point, and it is right: the panel prints `checkpoint.completedAt` as the data time, so a writer saying *"at 09:25"* from the SCHEDULE clock puts a different time in the prose than the one printed beside it.** *Measured on 474 completed checkpoints in the production snapshot:*

```
lag scheduled -> completed    median 10.5s   p90 18.1s   p99 20.0s
over 60s: 4 of 474
```

**⚠️ SO IN THE ORDINARY CASE THE TWO CLOCKS AGREE TO THE MINUTE — AND THAT IS EXACTLY WHAT MAKES IT DANGEROUS.** *A ten-second lag never changes a minute-resolution time, so a writer taking the schedule clock would be right on ~99% of reports and nobody would ever see the rule was broken.*

**THE CASE WHERE IT BITES IS REAL AND IS IN THE DATA — three COMPLETE checkpoints, all flagged `generated_late`, none a catch-up:**

| checkpoint | session | finished after its schedule |
| --- | --- | --- |
| `RTH_CLOSE` | 2026-08-17 | **1.59 h** |
| `STRUCTURAL_REFRESH` | 2026-08-19 | **1.36 h** |
| `PREMARKET_0700` | 2026-08-19 | **0.53 h** |

*(A fourth, a 10.75 h `NEXT_DAY_RECAP`, is `MISSED_SUPERSEDED` and would produce no report at all.)*

⇒ **A report from that `RTH_CLOSE` saying "at 16:00" would be describing data captured at 17:35.** **And `late: boolean` does not save it** — the flag would be true, the reader would know the report was late, **and the TIME IN THE PROSE would still be wrong by an hour and a half.** *A stale report is the one where the time is the only thing that would tell you so.*

**RULE: the writer takes every stated time from `checkpoint.completedAt`. The schedule clock names the SLOT, never the data.** *And the second-pass time check — recorded in `verify.ts` — verifies a stated time against `completedAt`, which is what makes "at 09:25 over 14:30 rows" catchable rather than merely forbidden.*

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
