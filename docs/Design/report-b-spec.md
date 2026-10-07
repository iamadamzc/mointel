# Report window, option B: the surface (Design's step 3 answer for reports v6)

*Design seat `local_dfce21d4`, 2026-10-02 (clock read via zoneinfo before commit: 02:55:55 UTC). Answers Design's three questions in Research's step 1 (`docs/research/reports-v6/step1-proposal.md` section 5) and Integration's order: B's surface, fixed against Marketing's guardrails, so the v6 writer can target it. Code read on the production line `2a625a5b`. Words in quotes below are PROPOSED; Marketing owns every word a reader sees and may replace any of them.*

**His words** (verified by Research at his turn, Integration's `1bfab363`, 2026-10-02T02:34:22Z): "there's still no opening narrative and no design element, its hard to read, this was brought up." And 2026-10-01T01:44:16Z: "an opening with a general narrative of the session which is being reported on, then down to the details of the tickers."

**What already answers part of "hard to read":** option (A), in tonight's second release (`840741d3`): a card per name, the path as three labelled prices, figures set apart, model-written headings hidden. B builds on A's cards; nothing below undoes them.

## The one principle: the report speaks the board's language

**Every tag is the board's own Why or Risk output, computed from the AS-OF dossier.** A name must read the same on the board and in the report (audit §10, Trust: "No two surfaces show a different value for the same field at the same moment without an explicit reconciliation"). The board's words already pass Marketing's guardrails: supply is capacity ("SUPPLY OVERHEAD 6.13M sh", `risk.ts:165`), never "sell"/"selling"; float is only ever a verdict. So the mock's "FREE TO SELL" and "SELLING" chips go, and with them the need for a second vocabulary.

**For Research:** compute the tags onto `ReportLine` from the as-of dossier with the same rules the board uses (`lib/dashboard/why.ts`, `lib/dashboard/risk.ts`), exported or shared, not re-implemented. If a rule cannot run on the as-of dossier as is, say which, and Design adapts the surface rather than inventing a third wording.

## Page order, top to bottom

1. **Title row**, as today: kind and date ("After-hours briefing · for Wed, Sep 30").
2. **THE SESSION: the opening narrative.** Directly under the title, above everything else. Replaces today's `overall` line for all four kinds (Research's order call). A small label "THE SESSION" (11 px, uppercase, ink-3, as the board's labels), then the paragraph: 16 px, line height 1.6, ink-2, measure 680 px, figures in white semibold with the same figure rule the cards use (`figureSegments`). At most three sentences (Research's "one breath"). **Absent, not empty:** no narrative from the store means no block and no label, never a placeholder sentence. **SUPERSEDED 2026-10-07 (Integration's order on his "the report still does not have an intro narrative"): the block always shows; a null narrative prints a designed absence line under the label, true whether the checker struck it or there was nothing to say (words Marketing's; placeholders in `OPENING_WORDS`). The narrative prints plain in ink, not with figure emphasis (54e2a407). Built at `6e56a8da`.**
3. **The watch line**, as today ("We're watching 11 names into after-hours."), now the lead-in to the cards, 14 px ink. It is not a heading and stays.
4. **Sections, now COMPUTED** (Research's fix (a)): a section label above its cards, 11 px uppercase ink-3 with its count ("FRESH NEWS · 4"; words Marketing's, mapping Research's). An emptied section renders nothing, as in (A). Until (a) ships, (A)'s single list stands.
5. **Cards**, one per name (below).
6. **Footer:** one line, 12 px ink-3, the float statement once for the whole report (below).

## A card

```
TGE   Generation Essentials Group. Cayman Islands.            feed not recorded
Catalyst A   not the move   SUPPLY OVERHEAD 73.6M sh
$0.8300 PRIOR CLOSE  ->  $1.90 HIGH  ->  $1.54 AT 16:00 ET      +85.5% vs prior close
                                                               18.9% under the high
-----------------------------------------------------------------------------
The catalyst story, one or two sentences, figures in white.
One line on what is unresolved, 13 px ink-3.
```

- **Header row:** unchanged from (A).
- **Tag row (new), left to right, at most three marks:**
  1. **Catalyst grade**, as the board's Why cell prints it: "Catalyst" + the letter, the letter in the board's tone (`WHY_TONE`). The grade's age is left out: the story carries the event date, and an age measured from the checkpoint would disagree with the board's age the next morning.
  2. **"not the move"**, only when `plausiblyExplainsMove` is false, in the board's warn style (`DecisionCells.tsx:456`). True and null print nothing, **exactly as the board does today.** If Marketing wants null told apart from true (the house rule: N states, not a value and an absence), that changes the board and the report together, one decision, never the report alone. And "no catalyst found" where the board prints it.
  3. **The Risk chip**, the board's (`resolveRisk`): label + value + tone. One chip only. This is the card's one saturated element (audit §8: one saturated element per row, by precedence).
- **Path:** unchanged from (A).
- **Prose:** the writer stops restating what the tags show (grade, explains, supply, float). What is left: the catalyst story (15 px, ink-2, figures white) and one unresolved line (13 px, ink-3). This is mock B's cut, and it shrinks the checker's scope (Marketing's fresh defect set; Research's re-freeze).

## Research's three questions, answered

1. **Where the narrative and the tags sit:** narrative under the title as "THE SESSION", replacing `overall`; tags in one row between the card's header and its path. Above.
2. **Which tags:** catalyst grade (with "not the move" / "no catalyst found" as the board prints them) and the Risk chip. **No cycle tag.** The path already shows the computed cycle facts (prior close, high, at the checkpoint, percent under the high), the same arithmetic the board's Cycle column prints ("OFF HIGH $1.90 -> $1.54"). A tag from the dossier's `cycleClassification` ("yellow, frontside warning") would be a second, model-written cycle vocabulary beside the board's computed one, which is the disagreement audit §10 forbids; the board's own cycle filter dropped the model classes for arithmetic (`view.ts`, the Cycle filters comment). **If Marketing or he wants the classification kept, it goes in the prose in the comma form, never as a tag.** No shares-outstanding tag either: the guardrail (always dated, never near "float") is easiest kept by not printing it in a tag at all.
3. **Float:** **drop the per-row tag; say it once in the footer.** A mark identical on every row says nothing and costs a slot on each (the board removed its FLOAT UNKNOWN chip for exactly this, `risk.ts`, the comment above STRUCTURE CAUTION). Proposed footer: "Float: the desk cannot independently verify a float for any name in this report." If one day a name HAS a verified float, it becomes that card's tag and the footer drops that name from "any".

## What this asks of whom

| Seat | Ask |
|---|---|
| **Research** | Tag fields on `ReportLine` computed with the board's rules (shared code); `narrative` replacing `overall`; computed section headings; the writer prompt without grade/explains/supply/float restatements |
| **Marketing** | The words: the "THE SESSION" label, the narrative's voice, section heading names, the footer line; and whether null vs true on "explains the move" should become three states on BOTH surfaces |
| **Design** | Build the surface on the contract once Research's fields exist; render it on the step-5 sample (real output, stored data) at 1,280 and 1,024; then the cut |

## Not decided here

- Whether a revised mock goes to him before step 5. Design's view: no. Step 5 IS the first sight, on real output, and a mock with invented text is what made "B" carry three guardrail breaks last time.
- Colour of the grade letter in the report: the board's tone is used as is. Changing it is a board decision.

## Reconciled with Marketing's step 3 and Research's step 1c (added 2026-10-02, clock 02:59:15 UTC)

Marketing's tag words (`docs/research/reports-v6/step3-narrative-voice.md`, `6cca5549`, "Per-line tags") were written at the same minute as this spec and without it. Research's step 1c (`49ebf469`) confirms the board's `resolveWhy`/`resolveRisk` run on the as-of dossier through one adapter.

**Taken from Marketing, as written:**
- **Float footer:** "The desk cannot independently verify float for these names." (replaces Design's proposed wording).
- ~~**The recap's F9 line is the seam** between the narrative and the cards ("Into the next session the desk is carrying these {N} names"). **On the recap it REPLACES the watch line**, so N is never stated twice in two voices. On the three intraday kinds the watch line stays as the lead-in.~~ **SUPERSEDED 2026-10-02 (Research): checker v6 does not require the F9 line and the narrative can be null on any kind, so the watch sentence stays on EVERY report, recap included; N may be stated twice. Built at 301ac033.**

**Open, for Integration (Design and Marketing disagree; facts first):**

| Tag | Board prints today | Marketing's report words | The difference |
|---|---|---|---|
| Grade | A letter: STRONG and LEGITIMATE_POSITIVE both "A", MODERATE "B", WEAK and NONE both "C" (`why.ts:484-486`) | four words ("strong", "legitimate / positive", ...); NONE and UNKNOWN no chip | finer than the board; on NONE the board says "C" and the report says nothing |
| Explains the move | "not the move" when false; nothing for true or null | "fits the move" / "doesn't fit the move" / "fit not established" | three states and different words for the same false |
| Cycle | a computed badge from price arithmetic (OFF HIGH, DAY 1) | the dossier's classification, comma form | two cycle vocabularies; Design's spec has no cycle tag (the path is the cycle) |
| Supply | one chip, SUPPLY OVERHEAD or DIRTY FLOAT + total shares (`resolveRisk`) | one chip per block, typed: "{type} {amount or $capacity} ({form})" | several chips per card against one aggregate; audit section 8's one-saturated-element rule |

**FINAL, Integration 2026-10-02 (reverses the line below): Design's recommendation ADOPTED.** One vocabulary: v6 tags render through the board's functions via Research's adapter (board words in the report, including "not the move"); Marketing's clearer words become ONE later change to both surfaces, checked by Design at the 1,024 floor (owed: Design, trigger v6 live). No cycle tag; supply as the board's aggregate chip; float footer and the recap's F9 seam as Marketing wrote them; ~~dirty float with no number~~ **no float number on any chip (corrected below)**.

~~**RULED by Integration (order call, 2026-10-02):** explains-the-move in the REPORT uses Marketing's three states, "fits the move" / "doesn't fit the move" / "fit not established", in v6; the BOARD keeps "not the move" inside v6. One vocabulary on both surfaces, if wanted, is Design's own small board change AFTER v6 (owed: Design, trigger v6 live). Grade, cycle and supply: still open with Integration.~~

**Design's recommendation:** the tags render THROUGH the board's functions (Research's adapter), so any wording change is made in those functions and both surfaces change together. Where Marketing's words are better (they are clearer than a bare letter), adopt them on BOTH surfaces as one change, checked against the board's 1,024 floor (the Why cell has no room for "legitimate / positive"; its hover does). What Design argues against is a report-only vocabulary: a reader who sees "A" on the board and "legitimate / positive" in the report for the same name at the same moment has to reconcile two systems, which is the defect audit section 10 names.

~~**Research's step 1c question (dirty float):** keep `displayedFloat` null in reports, as proposed. The chip then reads "DIRTY FLOAT" with no float number, which is the verdict-only form the guardrail asks for; no different words needed. The report and board can differ on a dirty-float name only in that value, and the footer already says the float is unverified.~~

**CORRECTED (Research 7e0b9436; Design read `risk.ts` on `2a625a5b`):** the float number is printed by the **NO FLAG FOUND** chip (`STRUCTURE_CLEAN`, `risk.ts:249`: `"{N} float"` when `displayedFloat` is non-null), NOT by DIRTY FLOAT, which prints supply shares (`risk.ts:153`, `"{N} sh supply"`) and reads the same on both surfaces. **Rule unchanged: keep `displayedFloat` null in reports.** Effect: a clean name's chip reads "NO FLAG FOUND" with no value in the report, where the board may show "{N} float". That is the only Risk-chip difference between the surfaces, and the footer states the float is unverified.

**Research's step 1c differences (sheet inputs absent in reports):** accepted. The report's grade and headline are the desk dossier's; on a name the Sheet grades differently, the report's letter can differ from the board's. That is a true difference of source, and the Sheet is a migration artefact (audit section 11, item 1); it is not a reason to freeze the Sheet onto checkpoints.

## Marketing's words, received after the final call (2026-10-02)

- **Label:** "THE SESSION", kept.
- **Float footer, FINAL (Marketing's later message supersedes its step-3 line):** "The desk cannot independently verify a float for any name in this report."
- **Computed section headings, grouped by catalyst status, "LABEL · count":** FRESH_FOUND "FRESH NEWS"; SECONDARY_STALE "OLDER NEWS"; NONE_FOUND "NO CATALYST FOUND"; CONFLICTING "MIXED SIGNALS"; NOT_ANALYZED "NOT YET RESEARCHED"; UNKNOWN "UNCLEAR". Order: fresh first (Marketing: the grouping that serves him most). The order of the rest is Research's mapping to state.
- **Explains the move:** Marketing's message still cites the three-state call; Integration's final call (above) reverses it, so the board's "not the move" stands in v6. Integration relayed the reversal to Marketing.
- **Seam for v6.1:** he floated a "what to watch" block (the model's hedged themes from the dossiers). If it is scoped it sits DIRECTLY UNDER "THE SESSION", above the F9 line / watch line, visibly marked as a read, not a verified fact. v6's layout leaves that slot empty: nothing between the narrative and the seam line today.
