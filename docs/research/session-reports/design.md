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

**🔒 v5 PASS BAR, PRE-REGISTERED 2026-09-30 BEFORE THE CHECKER FREEZE AND BEFORE THE SET IS RELEASED (seat `local_4b09b3b2`).** *His ruling 15:47:13Z keeps the gates; reports ship tonight only if this passes.*
- **The checker under test:** `lib/desk/reports/check.ts`, `traced.ts`, `verify.ts`, `research.ts`, `path.ts`, `totals.ts` and `lib/research/sec/stateCountry.ts`, FROZEN at the sha announced to Integration and Marketing in the freeze message that follows this commit. It is called exactly as the runner calls it: `checkReport` with the checker's OWN read of the store (`readReportInputs`: the checkpoint's rows, each row's research as of capture, the after-hours totals for the premarket report), checker model `gpt-5.6-terra`, prompt `REPORT_CHECKER_PROMPT_VERSION_V5` = 3.
- **The set:** Marketing's, authored blind to the checker, on the 2026-09-24 checkpoints #499 (09:25), #509 (14:30), #512 (16:00), #513 (22:00 recap), $1–$20, from the prod copy `data/market-prod-2026-09-29.db`. Its sha256 is committed by Marketing BEFORE release and verified on receipt; it is released only after Integration confirms the freeze.
- **N = 3 runs per draft, SYMMETRIC (run 2's rule):** a keyed defect line counts as STRUCK only if all 3 runs strike it; a control line counts as ADMITTED only if all 3 runs admit it. A `CHECKER_FAILED` run counts as not striking a keyed line AND as striking every control line.
- **PASS = every keyed defect line struck in all 3 runs, AND 0 strikes on any control line in any run.** Controls are reported in two groups: REGRESSION controls (true lines in the forms voice runs v5 and v5b showed the checker could get wrong: a change note "since the previous checkpoint"; "capacity, not proof of selling"; form names such as 8-K, F-3, EX-99.1, fiscal-Q4; a figure restated at another precision or unit; a written date matching a stored one; shares outstanding dated with "not a float"; an en-dash range; the SECONDARY_STALE, NONE_FOUND and UNKNOWN status wordings; the true overall sentence) and ORDINARY controls. Both groups must be 0. Each defect class is reported separately. Extra strikes on non-keyed lines of corrupted drafts are reported, not graded.
- **Harness:** written after the set is released (its format decides the parser), committed BEFORE any model call; raw output committed BEFORE it is read. A prediction, if any, is written after reading the set and before the first call.
- **A FAIL means v5 does not ship tonight**, and he hears exactly which class or control failed and why. The bar is not moved after a result.
- **⚠️ AMENDMENT, recorded BEFORE the set's release and before any checker call (the harness is not yet written): the set's locked hash changed.** Marketing locked `437e30a6…` (`696fd997` / `70920cdc`), then REFORMATTED the file to the id and JSON format this seat asked for AFTER the lock (the request postdated the lock, so the cause is partly this seat's), and the original bytes were overwritten. The new file hashes `cd8052b906d81feaac123d1bf20ace7d84981d7bf646fb35d02aca34a70766b0`. Marketing states the defects are unchanged (19 classes, the same 09-24 rows and seeded lines, the 795 overall defect) and that it has not read the checker. **What this loses:** byte-level proof that the set is the one locked before the freeze. **What it does not:** no checker output exists yet, so the set could not have been fitted to a result. **Research's recommendation to Integration (whose call it is): proceed, verifying `cd8052b9` on receipt, with this amendment committed first.**
- **WHAT EACH OUTCOME MEANS, fixed by Integration's order call BEFORE the result (recorded here while the run is in progress, its output unread):** PASS as registered (with the seed-lock deviation): reports clear the bar, and Commercial's review (PASS, `commercial.md` §11) was the last content gate. FAIL where EVERY failure is a false strike on a control: run 2 tonight, as the 19th seat did it: (1) fix only the named rule(s), with a test, and re-freeze (new sha and blob list); (2) Marketing authors a FRESH blind set from a DIFFERENT day's rows, informed by run 2's causes (the phrasing class, never the checker), with the false-strike lines as keyed regression controls, format first, hash last, committed before release; (3) harness before calls, N = 3, raw output before reading. The failed set is never reused. FAIL with ANY missed defect (a keyed line admitted in any run): no ship tonight, and he hears which class got through. `CHECKER_FAILED` counts against both.
- **RUN 1 RESULT (raw `70da3eb`): FAIL AS REGISTERED, with the seed-lock deviation of cd8052b9.** 19/19 keyed defects struck in all 3 runs (no missed defect); 5 control lines struck. Graded by Integration as pre-fixed: control strikes only, so RUN 2 tonight. Causes: (1) the bare "no catalyst" rule vs "we found no catalyst in our sources" (a checker false strike); (2) the checker model, because `research.ts` dropped each supply block's `sourceFiling` (a checker false strike); (3) "clearly" in the SPHL control, ruled a SET error by Integration (a control must obey the full voice list; the rule stays).
- **🔒 RUN 2 CHECKER, RE-FROZEN at the commit that adds this line (its sha is announced to Integration and Ops).** Changed from `1ab48be`, and ONLY: `check.ts` (cause 1: the "no catalyst" rule admits "no catalyst in our sources" with or without "found"; a bare "no catalyst" still strikes), `research.ts` (cause 2: supply blocks carry `sourceFiling` and `registrationStatus`), `traced.ts` (part of cause 2, kept by Integration's ruling: dates and numbers are harvested from the held filing text). Blobs: check.ts `b3c91fd86dba`, traced.ts `1b0e0129384d`, research.ts `db4f8345c2fc`; unchanged from `1ab48be`: verify.ts `b5d452f829c0`, path.ts `196636232499`, totals.ts `c39b9eeeb83c`, pipeline.ts `3340640182f8`, stateCountry.ts `081cab7faee2`. The writer (`writerV5.ts` `70f3203c2316`) equals its `1ab48be` blob: the filing was stripped from the writer's sheet (Integration's ruling), so tonight's writer is the one Commercial passed, plus `2e8450f`'s analyst-rating instruction pending Commercial's one-line confirm. Gate before the re-freeze: full suite 208 files, 3,134 pass (Ops's slot). **Run 2 runs the SAME registration** (N = 3, symmetric, PASS = every keyed defect struck in all 3 runs and 0 control strikes) on Marketing's FRESH blind set from 2026-09-25 (#518/#528/#531/#532), with run 1's false-strike phrasing classes as keyed regression controls; the run-1 set is never reused.
- **RUN 2 RESULT (raw `a3e7229`, set `ab6d6a84` byte-exact): FAIL AS REGISTERED.** 19/19 defects struck in all 3 runs; the run-1 fixes held. 5 control strikes, each ruled a SET error by Integration: two controls false to the store (AIFF "not quantified" while amounts are held; ELPW "looks flow-dominant" while the research says it is not established), correctly struck by the model; three MGLD lines with "sell" describing an asset-sale catalyst, a word the desk's code bans absolutely ("no buy/sell language, ever", `lib/desk/assessment.ts`), so the strike is correct and the rule stays.
- **🔒 RUN 3, THE LAST TONIGHT, PRE-FIXED BY INTEGRATION BEFORE IT EXISTS (recorded here before Marketing authors it):** the checker STAYS `925c9dc` (no fix, no re-freeze). Marketing authors a FRESH set from a THIRD day: **2026-09-23** (#480 09:25, #490 14:30, #493 16:00, #494 22:00 recap; `2026-09-26` in an earlier message was wrong, a Saturday with no session), same format as v5r2, format first, hash last, file intact, EVERY control clause field-traced in its key, no never-use word and no buy/sell even descriptively; regression controls = run 1's two phrasing classes + run 2's asset-sale class written with "sale" or "divest". Harness before any call, N = 3, raw before read. **PASS → Integration approves the reports cut `4b55a049` by literal sha and Ops asks him. ANY FAIL (a missed defect OR any control strike, whatever its post-hoc cause) → reports do NOT ship tonight, there is NO run 4 tonight, and he hears exactly why.**
- **RUN 3 RESULT (raw `141ee34`, set `42818555`, harness `9b44df8`): FAIL AS REGISTERED. Reports do not ship tonight.** 19/19 defects struck in all 3 runs; 4 regression-control strikes, 0 ordinary. ALL CHECKER FAULTS (the set's controls were true to the store): (1) PREDICTED, deterministic: `research.ts` carries a supply block's `amountShares` but not `dollarCapacity`, so the traced rule struck ARTL's "$6,530,000" and XXII's "$6,400,000" ATM capacity, which the dossiers hold (ARTL v2148, XXII v913); the model, shown the same block, also called XXII's figure unsupported. Run 1's class again: a field the dossier holds that the checker is never shown. (2) Model instability, one run of three each, on true lines (WHLR "no fresh catalyst" under SECONDARY_STALE; ARTL "no share count is on file" with `sharesOutstanding` null). **Tomorrow:** `research.ts` carries the WHOLE supply block, audited field by field against `SupplyBlock` (not one field per failure); a look at the model half's stability; a new registration and a fresh set.
- **🔒 RUN 4, THE LAST TONIGHT (his ruling 2026-09-30T19:34:36Z, verified: "a, try tonight"; pre-fixed: PASS → Ops re-picks onto the reports cut, gates, Integration verifies blobs, Ops asks him; ANY FAIL → reports tomorrow, no run 5). CHECKER RE-FROZEN at the commit that adds this line.** Changed from `925c9dc`, ONLY by `8c52506`: `research.ts` `bc57f2a75057` (the WHOLE SupplyBlock, audited field by field; only `evidenceSourceIds` omitted, as internal ids no line can cite) and `traced.ts` `fc8ca9327cca` (admits `dollarCapacity`; harvests numbers and dates from `terms`, `holderRestrictions`, `eligibilityAssessment`). Unchanged: check.ts `b3c91fd86dba`, verify.ts `b5d452f829c0`, path.ts `196636232499`, totals.ts `c39b9eeeb83c`, pipeline.ts `3340640182f8`, stateCountry.ts `081cab7faee2`, writerV5.ts `70f3203c2316`. Gate before the freeze, stated in full: the FIRST full run had 6 failures in 6 files (not touching reports code) whose signatures were not captured, so they are NOT claimed environmental; all 6 files passed alone (145/145), and a SECOND complete full run passed 208 files / 3,138 tests. Day: **2026-09-21** (#442/#452/#455/#456; overall 2,442 / 784 / 533), clean: no pass bar or voice run used it and no fix came from its output. **Disclosed:** this seat told Marketing "the checker now carries the whole supply block", describing the fix it is meant to be blind to; Marketing was asked not to let it shape the set beyond the phrasing class Integration named. Same registration: N = 3 symmetric; PASS = every keyed defect struck in all 3 runs and 0 control strikes.

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

## 8. v5 CONTRACT, PROPOSED 2026-09-30 (seat `local_4b09b3b2`); NOT BUILT until Design and Marketing rule

*The SANG shape (`marketing.md` 06dfd1e, his "the shape is good" 10:43:39Z) is an opening, then per-ticker blocks: a company line, a price path, and two or three sentences. Today's contract is a headline plus sections of `{ticker, text}` lines. This maps one onto the other.*

**The principle is already ruled, for `watchCount`: what the store states exactly is COMPUTED and worded by the surface; the model writes only what needs a voice.** Applied to every element of the block:

| SANG element | produced by | contract field (proposed) |
| --- | --- | --- |
| Opening, sentence 1 ("We're watching 12 names into the premarket.") | surface (`watchLine`, a4962078), from a count | `SessionReport.watchCount: number`, distinct tickers across SURVIVING lines, computed by `applyStrikes` |
| Opening, sentence 2 (premarket only: "Across the $1–$20 range, 2,454 traded after hours, 749 up, 569 down.") | writer (voice); checker traces each count to `ticker_session` for D, board-eligible | `SessionReport.overall: string \| null`: null for the other three kinds until Ops's frozen counts (v28), and null when struck |
| Company line ("Sangoma Technologies Corp. Canada. <what it does>") | COMPUTED from the as-of dossier (`analysis_version_id`): `companyName`, decoded `country`, `businessDescription` | `ReportLine.company: { name, country, business } \| null`, each part null when absent, never guessed |
| Path ("$3.59 → $6.01 → $5.10") | COMPUTED: intraday from the row (`reference_close` → `session_high` → `price`); premarket from `ticker_session` D (`ah_reference_close` → `ah_high` → `price`) | `ReportLine.path: { from, high, now, fromBasis } \| null`, `fromBasis` = `PRIOR_CLOSE` \| `TODAY_CLOSE`, so the surface labels the first point |
| The two or three sentences | writer; checker | `ReportLine.text`, unchanged |

**✅ Marketing CONFIRMED the shape (`marketing.md` d35e1bba); Integration's calls:** the company line is **"{name}. {country}. {business}."**, a null part dropped with its separator, never guessed: ACCEPTED. **The path line's LABELS** (Marketing proposes "$3.59 prior close → $6.01 high → $5.10 now", and "today's close" / "after-hours high" on the premarket report) **are Design's call, with the two questions below. So the contract carries VALUES and the basis KIND only, and the words are chosen at render; Design's answer then never touches the checker.**

**Why computed rather than written:** a path point or a company name in model text is one more place to invent, and the checker could only strike what code already knows. Computed, they cannot disagree with the store, cannot be struck, and cost no tokens. The writer is told the path and the company line are printed above its text, and does not restate them.

**CHECKER v5, THE TRACED RULES: design notes found in `verify.ts` 2026-09-30, BEFORE any code (seat `local_4b09b3b2`).** The research half of a line (catalyst, structure, company) carries numbers the row does not, and today's allowlist is the row only. Read against the SANG block, `numbersIn` would strike TRUE prose on three counts, so the extension must settle each before its pass bar is registered:
- **Digits inside a token are not assertions:** "F-3", "8-K", "10-Q", "424B5", "fiscal-Q4" each yield a number today (the hyphen-joined digit reads as unsigned 3, 8, 10). Proposed: a number touching a letter on either side is part of a name and is skipped, EXCEPT a magnitude suffix below.
- **Units:** "$46.8M" must trace to the stored "$46.802 million" (the data map: one-decimal rounding, same as the row numbers). Proposed: normalise M / B / K / million / billion / thousand to a base value on BOTH sides, then compare at the writer's decimal places.
- **Dates:** "June 30, 2026" yields 30 and 2026. Proposed: a date in any written form is parsed as one value and must equal a stored date on that name (`sharesOutstandingDate`, a supply `effectiveDate`, a cited source's `published_at`), else struck; `stripTimestamps` covers only ISO dates and clock times today.
- **The allowlist per name then adds:** numbers in the cited sources' titles and `catalyst.summary`; the dated share count; supply amounts and years. **Never** `whyTradersMayCare` alone for a number, since that is the model's gloss and not a source.
- **Clock times:** allowed when equal, to the minute in ET, to a cited source's `published_at` with EXACT precision or to `eventTimestamp`; "~", "around", "about" before an exact time is struck (the SANG 17:26 case).

**✅ BUILT (`lib/desk/reports/traced.ts`, wired in `check.ts` when `CheckInput.research` is present; v4 path unchanged).** As noted above, plus four choices made in the build, each tested: (a) research numbers compare by MAGNITUDE (the sign is in words the model reads), row numbers stay signed; (b) a year alone is admitted when it is the year of a stored date; (c) a LOWERCASE single-letter suffix is a name ("5m" candles), never a magnitude; (d) a new FORBIDDEN shape strikes fit stated as a forecast ("could drive", "set to fuel"; Commercial §10). The SANG block's prose is the true control and is admitted whole. **A mutant finding worth keeping:** the name-skip rule first died on only 1 test, because "Q4" and "F-3" in the SANG line ALSO trace to digits in the summary and a title (both sides share one extractor), so the control could not see the rule. A control whose digits appear nowhere in the research now carries it (2 kills).

**Three questions, each with a proposal:**

1. **Sections.** The SANG block shows none. *Proposed: keep `sections[]` (the ruled emptied-section and NOTHING_LINE rules stay valid unchanged); each block is one `ReportLine`.* The alternative, one flat list, drops "what held" versus "what faded", which his original request named.
2. **Headline.** The opening replaces it. *Proposed: v5 writes no headline; the field stays for stored v4 rows.* But `headline: null` today MEANS "the checker struck it", so v5 needs a distinguishable state (for example `headline` absent) or the surface cannot tell a retired headline from a struck one. Design's call.
3. **✅ RULED 2026-09-30, COUNTRY ONLY (Integration's order call: his "city is not important" puts province and state in the same class). Built: `edgarCountry`, `2fe8d75`.** **(1) and (2) are Design's surface calls; the Design seat is between sessions, so they wait for its successor (Integration routes).** ~~Country.~~ `dossier.country` is EDGAR's `stateOrCountry` CODE (SANG "A6"). *Proposed: decode to the COUNTRY only (every US state code to "United States", every Canadian province code to "Canada", other codes by EDGAR's published list), deterministic, in Research.* No state or province: it is the same class as the city he dropped. Marketing's SANG block already reads "Canada" for A6.
