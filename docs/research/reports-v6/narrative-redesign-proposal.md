# Reports v6: the narrative redesign, PROPOSAL (nothing built, nothing run)

*Research seat `local_98e3e9a1`, 2026-10-03. On his verdict on the four v6 samples, typed to Integration at 2026-10-03T15:07:30Z (transcript `24ec00be`, verified at his turn), and Integration's four orders. Marketing writes the target examples; this seat decides what the fact sheet carries. Spend is his: the side-by-side below waits on his yes.*

## His words, the clauses this answers

- "first one is VERY hard to unerstand. very confusing. this does not read well." (PREMARKET)
- "No need to put $1-20 range everytime. if you're going to do that dont make it part of the narrative. just put it somewhere."
- "the narrative summary is still drastically lacking."
- "what are the prompts being used and what models." (Answered by Integration: writer `gpt-5.6-luna`, checker `gpt-5.6-terra`, `lib/research/config.ts:183-184`; prompts `SYSTEM_V6` and `NARRATIVE_RULES` in `lib/desk/reports/writerV6.ts`.)

## Why PREMARKET reads badly: the sheet, not mainly the model

The v6d narrative (`0ae09059`), as published:

> In the $1.00 to $20.00 range, 2,935 traded on the day, with 1,214 up and 1,577 down. 9 ran past 50 percent off the prior close, and 0 of those closed the regular session at or below the prior close. Fresh news in our sources covered 7 of the 12 names the desk covers. 3 in-range names with no regular-session close were not in these counts, and the desk carries 12 names into the next session.

Each sentence words one sheet line, and the sheet hands the model its definitions as if they were phrases:

| Sentence | Sheet line it words (`writerV6.ts:60-81`) | Fault |
|---|---|---|
| "In the $1.00 to $20.00 range" | `range:` | His ruling: out of the narrative |
| "9 ran past 50 percent off the prior close" | `ran past 50 percent off the prior close` | Reads as DOWN (Marketing, Design's catch; bundle item 6) |
| "0 of those closed ... at or below the prior close" | `of those, closed the regular session at or below the prior close` | The DEFINITION worded, not the phrase; "0" instead of "none" |
| "3 in-range names with no regular-session close ..." | the `noClose` line, with "state this number" | A data caveat inside the prose |
| "the desk carries 12 names" | `tracking` | Repeats the "12" of the sentence before |

And there is nothing in it about the names: the rules forbid it. `NARRATIVE_RULES` say "Word ONLY the given facts ... never add a fact, a theme, a sector or a reason" and "the only ticker the narrative may name is the given leader"; the recap has no leader. So the thinness is the RULES and the SHEET. A stronger writer would word the same five thin facts.

## What the store can supply, read off the 2026-10-02 snapshot today

For the 10-01 recap (checkpoint 611, 12 covered names, 11 with a dossier):

- **Per covered name, stored:** move (percent change), catalyst summary (text), grade (`catalystGrade`), whether the news fits the move (`plausiblyExplainsMove`), fresh / older / none found, event time.
  - Grades: 1 STRONG, 2 LEGITIMATE_POSITIVE, 5 MODERATE_MIXED_SECONDARY, 2 WEAK_NEGATIVE_DILUTIVE, 1 UNKNOWN.
  - Fits the move: 7 yes, 2 no, 2 unknown.
  - ~~Top movers among covered: AMOD +61.5%, SORA +27.9% (a non-binding MOU with Plume on an Asian joint venture), SSM +18.6%.~~ **WRONG FRAME, struck:** those are checkpoint 611's `percent_change`, whose basis at the 22:00 recap is TODAY'S CLOSE (the after-hours move), not the day. On the day (`rth_final_*` vs `previous_close`) AMOD closed -23.9%.
  - **The day's 50 percent movers (high at least 1.5x the prior close), in range, 9:** NXL (high +156.5%, close +76.4%), SSM (+130.3, +96.9), VEEA (+88.0, +59.9), SDEV (+75.3, +41.2), MEDS (+71.6, +27.4), WFCF (+70.0, +17.6), NAMM (+61.7, +35.1), AISP (+53.8, +19.4), EJH (+52.8, +26.1). **Covered by the desk: 5 of the 9** (NXL, SSM, NAMM, AISP, EJH), all with fresh news found.
- **Across checkpoints, stored:** the day's earlier checkpoints (592 to 610), so "new since this morning" and "dropped since this morning" are computable.
- **NOT available:**
  - Sector: `issuer_registry.sic_description` is empty for all 1,215 issuers (the SIC writer is unshipped, branch `research/sic-write`).
  - Catalyst-type themes: `catalystType` is coarse; all 7 fresh names on 10-01 are `NEWS_DRIVEN`.
  - A theme from the summaries would be a model judgment the checker cannot trace, so it is not proposed.

**A data note found here, not for this build:** WCT's 10-01 close reads -79.9% against a high of +2.0%, which looks like an unadjusted reverse split in `previous_close`; it counts in the recap's "down" breadth. Not measured further.

## Proposed sheet (the facts), for Marketing's examples to confirm

Removed:

- `range` (header carries it; Design places it).
- `noClose` leaves the prose: a computed footnote under the narrative, printed by the surface, never worded by the model.
- `tracking` as a sentence: the cards list the names; the count is in the header if Design wants it.

Reworded (paired phrase + definition, like F7, shared with the checker):

- F6: "ran at least 50 percent above the prior close" (bundle item 6).
- F7: "gave the entire move back", k = 0 as "none of them gave the entire move back" (bundle item 2).

Added (all computed from stored values, each traceable by the checker):

| Fact | Content | Kinds | Checker trace |
|---|---|---|---|
| F10 leaders | Recap: the covered names among the day's 50 percent movers, ordered by the day's high, up to 3, each with its high and close percent ON THE DAY (`rth_final_*`, never the checkpoint's `percent_change`, which at the recap is the after-hours move) and its catalyst summary to restate in one clause; plus how many of the movers the desk covers. Intraday: the leader plus up to 2 by rank, on the checkpoint's stated basis | all | number to the fact; clause to that name's dossier summary, as lines are traced today |
| F11 grade mix | Counts of covered names by grade, in the tag's words (positive / mixed / negative / strong / unknown) | all | count to the fact |
| F12 fit | How many covered names' news fits the move, and how many it does not | all | count to the fact |
| F13 change | Names new to coverage and names dropped since the reference checkpoint (recap: since the 07:00 premarket checkpoint; intraday: since the previous checkpoint) | all | tickers to the fact |

Rules diff (`NARRATIVE_RULES`):

- Strike "the only ticker the narrative may name is the given leader"; allow the tickers F10 and F13 give, no others.
- Keep: no cause words ("drove", "sparked"), no advice, no forecast, no adjective the facts do not define, never count.
- Recap: four to five short sentences; lead with the session (breadth and the 50 percent movers), then the leaders and what their news was, then the grade mix and fit, then what changed.
- The checker's prompt gains the new facts WORDED as the writer gets them (checker prompt 5's rule), and the forbidden-wording list is unchanged.

## The model question: a side-by-side, cost stated before any run

Measured on v6d PREMARKET (`v6-summary.txt`): writer 5,812 in / 2,894 out tokens; checker 19,819 in / 429 out. At the rate card's list rates (`docs/commercial/2026-09-07-model-rate-card.md`, uncached input):

| Writer | Writer cost | + checker (terra) | Per report |
|---|---|---|---|
| luna (today) | $0.0046 | $0.0448 | **$0.049** (measured $0.0494) |
| terra | $0.0463 | $0.0448 | **$0.091** |
| sol | $0.0811 | $0.0448 | **$0.126** |

The richer sheet adds roughly 1,000 input and 150 output tokens per report: under $0.004 on terra.

**Proposed side-by-side:** the new sheet and rules, the same stored facts (10-02 snapshot), all four kinds, writer luna vs writer terra, two runs each (to see run-to-run noise), checker terra throughout. 16 reports: **about $1.20.** Adding sol as a third arm: about $2.20. Harness committed before any call, raw output committed before it is read, as every run on this desk.

**Recommendation:** luna vs terra first. The fault is mostly the sheet, so the side-by-side should run AFTER the sheet changes; otherwise it measures two models wording the same thin facts.

## Sequence and what each step waits on

1. Marketing's target examples (PREMARKET and one intraday) against the list above. Waits on Marketing.
2. This seat finalises the sheet and rules to the examples; Integration reviews the diff. Then build, tests and mutants in an Ops slot (no model call).
3. The side-by-side. **Waits on HIS spend yes** (about $1.20, or $2.20 with sol).
4. Samples to Design and Marketing, then to him. The STEP-6 BUNDLE items 1 to 6 fold into step 2.
