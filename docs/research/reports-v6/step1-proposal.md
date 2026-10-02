# Reports v6, step 1: what the narrative can say, the tags, the fixes (PROPOSAL, no build)

*Seat `local_5f4bfcf8`, 2026-10-02 (written ~02:5xZ, outside his window). Plan: `plan.md` (`e144d87c`). Every file:line here was opened on the PRODUCTION line (`2a625a5b`, the citation cut, which carries Ops's v28). Main does not have v28 (`computeRangeCounts` is absent there), **so v6 is built on the production line, not main.***

## 0. Marketing's constraints (relayed by Integration), checked against the code

| Constraint | Checked | Where |
|---|---|---|
| No session-level stored object, so the narrative is computed per checkpoint from the board rows | **TRUE.** Everything is per checkpoint: `desk_assessments`, `desk_assessment_tickers`, `desk_assessment_ranges` | `db.ts:621-665` (tickers); `assessmentRepo.ts:735-751` (ranges insert, keyed `assessment_id, range_key`) |
| Totals for the three non-premarket kinds come from Ops's frozen v28 counts, not the live table | **TRUE, and premarket should move too.** The frozen row holds eligible, traded, up and down per checkpoint and range (`computeRangeCounts`, `assessmentRepo.ts:696-733`). Today premarket alone reads the LIVE `ticker_session` (`totals.ts:39-58`, whose own header says "When v28 is on main, read that row instead"). v6 reads the frozen row for ALL FOUR kinds, so the writer and checker can never read different numbers. | as cited |
| "Plausibly explains the move" = `plausiblyExplainsMove`, read as of the checkpoint's `analysis_version_id` | **TRUE.** `ReportResearch.catalyst.plausiblyExplainsMove` (`research.ts:56`, filled at `:131`) is built from the version the checkpoint row names, and the checker re-reads the same version (`research.ts:38-39`) | as cited |

**Each kind's checkpoint** (`pipeline.ts:41-45`):

| Report | Checkpoint |
|---|---|
| PREMARKET | `NEXT_DAY_RECAP` 22:00 ET |
| INTO_RTH | `OPEN_SPIKE_ASSESSMENT` 09:25 |
| INTO_POWER_HOUR | `RTH_INTERVAL` 14:30 |
| AFTER_HOURS | `RTH_CLOSE` 16:00 |

**OPEN, a production read after 10:00 ET (asked of Ops):** which `count_window` each of those checkpoints froze (`AFTER_HOURS` vs `SESSION_TO_DATE`, chosen by the board at capture, `rangeCapture.ts`). That decides whether the premarket narrative's counts are the after-hours ones. Not assumed here.

## 1. The narrative: what the store can say, per checkpoint

**One limit decides the menu:** a checkpoint freezes the range-wide COUNTS (eligible, traded, up, down) and the TOP names' rows (rank, price, move, RVOL, volume, high, low, halt state, the research version), not every name. So "how many names in the range cleared +20%" is NOT stored. Only counts among the covered names are.

| # | Fact | Stored source (frozen at the checkpoint) | How the checker traces it | ILLUSTRATIVE example: made-up numbers, wording is Marketing's |
|---|---|---|---|---|
| F1 | **Breadth:** how many traded, how many up and down | `desk_assessment_ranges` eligible / traded / up / down | Exact integers against the frozen row | "Across $1 to $20, N names traded, U up and D down." |
| F2 | **The leader:** the top-ranked name, its move and its path | Its `desk_assessment_tickers` row (rank 1 in range), with `path.ts` as today | Ticker, percent and prices against the row, as the line rules already trace them | "XYZ led, up P% from $A to $B." |
| F3 | **Catalyst mix among the covered names** | Each covered name's as-of dossier: grade and status (`research.ts:49-51`) | Counts against the as-of versions | "Five of the twelve had fresh news behind the move; four had none we could find." |
| F4 | **The shape of the session** (one name or many), among the covered names | Covered rows' percent change | The count against the rows | "Three of the twelve were up more than 20%." |
| F5 | **Halts** among the covered names | `halt_state` on the rows | Count and names against the rows | "Two were halted at the checkpoint." |

**Recommendation for his "uncomplicate it", one breath:** at most THREE facts. Breadth (F1), the leader (F2), and ONE of F3 or F4, Marketing's pick. F5 only when non-zero.

- **No adjectives** the store cannot back ("busy", "quiet", "hot") unless Marketing defines each against a number.
- It replaces today's premarket-only `overall` line (`contract.ts:166-172`) for ALL four kinds. That is one field, so no second line.

## 2. Design's option B tags: each from a named field

| Tag | Field | Note |
|---|---|---|
| Catalyst grade | `catalyst.grade` (`research.ts:49`) | |
| Explains the move | `catalyst.plausiblyExplainsMove` (`:56`) | Three states: yes / no / not established (null) |
| Cycle | `desk_assessment_tickers.cycle` = the dossier's `cycleClassification` at capture (`desk-assessments.ts:291`) | Comma form is Marketing's mapping |
| Supply | `structure.supply[]`: status, amount, date (`research.ts:70-91`) | Board wording per Marketing's guardrail: never "sell"/"selling" |
| Float | **None to compute.** The writer prints ONE constant for every name, "no float the desk can independently verify" (`writerV5.ts:121`) | **QUESTION for Design and Marketing:** a tag that is the same on every row says nothing. Proposal: drop the per-row tag and say it once in the report's footer. |

The writer then stops restating what a tag shows. The checker is unaffected for tag fields (computed, not model text), but its seeds change.

## 3. The four queued fixes, by file

- **(a) Headings:** section headings are model text today (`writerV5.ts:218`, `:275-288`). v6 computes them from catalyst status and grade; the model writes lines only.
- **(b) Dates:** `writerV5.ts:67` takes the day from `etDayAndClock`, which shifts a midnight-UTC date-only value a day early. Date-only values are formatted as calendar dates, here and in `traced.ts`.
- **(c) Clocks:** `writerV5.ts:76` takes a clock from `etDayAndClock(eventTimestamp)`. v6 prints a clock only when a cited EXACT or INFERRED source carries that instant, and `traced.ts`'s clock rule (`:81-100`, `:151`) takes the same rule.
- **(d) Citations:** `reportResearch` cleans text with em-dash removal only (`research.ts:98-130`). v6 applies `withoutCitationsDeep` with the dossier's own ids (`citations.ts`, `a58aa866`, already gated and production-counted), plus a checker guard.

## 4. Pre-registrations to come (none of them a number yet)

- **Step 2, the stability probe:** written before any call.
- **The narrative's facts**, once Marketing picks: each fact's exact SQL and trace rule, committed BEFORE the writer prompt.
- **Pass bar seeds:** at least one false F1 count, one wrong leader, one false F3 or F4 count, one wrong tag.

## 5. Questions

- **Marketing:**
  1. Which third fact, F3 or F4?
  2. The voice and length (one breath).
  3. The words for each tag (cycle comma form; supply without "sell").
  4. The float footer line.
- **Design:**
  1. Where the narrative and the tags sit on B.
  2. Which tags.
  3. Float: drop the tag, or keep it?
- **Ops (a read after 10:00 ET):** `count_window` per checkpoint type since v28, and whether every report kind's checkpoint has a frozen ranges row.
