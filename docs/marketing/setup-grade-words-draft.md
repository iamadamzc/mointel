# Setup grade: DRAFT words v2 for Research's rubric (d63a00aa), for his one approval

*Marketing draft v2, 2026-10-05, applying Commercial's claims read section 6 (be0bdaca, four required changes). Changes from v1, so Commercial diffs only these: (1) B reads "One or more criteria read below the strongest, or could not be read."; (2) A reads "The highest grade on these criteria."; (3) relative volume reads heavy, moderate or light "on the desk's scale", not "against its normal"; (4) the dash state and its legend sentence are gone; a no-dossier name is "Not graded", with two cause strings; plus the legend ships without the rubric link, and "not tested against outcomes" is deleted at expiry, never replaced. Answers Research-tmi's request. Wording only; nothing built, nothing shipped. No em dashes; the empty-cell glyph is written "a dash". Words are readings: no forward tense, no imperative, never "pick", "signal", "opportunity", "avoid", "priority" or "next-session". Conditions carried from Commercial (rubric draft section 5): the same reading for every reader; the lowest grade names what is wrong; one standing legend sentence; "not tested against outcomes" is a factual claim that expires the day any outcome test runs.*

*HELD on purpose, because he rules them once via Integration (rubric section 4): the cycle as "Structure", how hard A is, the thresholds, catalyst age, the AVOID rule. Nothing below states a threshold, an A definition, or which single criterion forces D. Where a word depends on one of the five, it is marked.*

## 1. The four letters (the badge in the Ticker cell)

The badge shows A, B, C or D. D is the display of the stored AVOID (Integration's option a); no surface prints "AVOID".

Tooltip, one shape for all four: **"Setup grade {letter} as of {checkpoint time} ET. {Reading} {Basis}"**

| Letter | {Reading} |
|---|---|
| **A** | "The highest grade on these criteria." |
| **B** | "One or more criteria read below the strongest, or could not be read." |
| **C** | "A weaker reading: the cycle reads as a backside." |
| **D** | "Risk outweighs the setup." |

*Notes.* A is the top of the scale and claims nothing about how many criteria are strong, so decision 2 (how hard A is) does not move the sentence, and it stays true while share supply cannot yet read strong. B covers an unreadable criterion as well as a limited one. D says what is wrong and does not say which single criterion forces it, so decision 5 does not move it. C names the cycle because the draft rule is exactly that; if decision 1 changes what "Structure" means, C's clause is the one line that changes.

**{Basis}** lists criteria by their reading, in this order, omitting any group that is empty: "Strong: volume, catalyst. Limited: cycle. Risk: liquidity. Not readable: share supply." Criterion names on the surface: **cycle, catalyst, relative volume, liquidity, share supply.** The cycle is called "cycle", not "Structure", and supply "share supply", so the labels hold whichever way decision 1 goes (only the grouping logic would change, not the words). "Rests on", never "drove": the tooltip names the basis and claims no cause.

Example, whole tooltip: *Setup grade B as of 15:42 ET. One or more criteria read below the strongest, or could not be read. Strong: relative volume, catalyst. Limited: cycle. Not readable: share supply.*

## 2. The five readings, in words (drawer row or detail line, one per criterion)

No numbers: the thresholds are decision 3. Each line says what the stored input is, not what to do.

| Criterion | Strong | Limited | Risk | Not readable |
|---|---|---|---|---|
| **Cycle** | "Fresh or frontside." | "Frontside, with a warning." | "Backside." | "The cycle could not be read." |
| **Catalyst** | "A strong or clearly positive catalyst." | "A moderate or mixed catalyst, or none found in our sources." | "A weak, negative or dilutive catalyst." | "The catalyst could not be graded." |
| **Relative volume** | "Reads heavy on the desk's scale." | "Reads moderate on the desk's scale." | "Reads light on the desk's scale." | "Volume could not be read." |
| **Liquidity** | "Tight spread, deep dollar volume." | "In between." | "Wide spread or thin dollar volume." | "Spread or dollar volume could not be read." |
| **Share supply** | "A clean share structure with a small float bound." | "A caution on the share structure, or clean without a small bound." | "A dirty float." | "The share structure could not be read." |

*Share supply "Strong" cannot occur until the float bound ships (Research: no stored row reads clean today). Until then the line is never shown; it is written now so the table is complete.* "None found in our sources" is the honest form of the catalyst "none" reading and says what the desk searched, not what the world holds.

## 3. Not graded (stored UNKNOWN: fewer than three of the five criteria readable)

The badge reads **"Not graded"**. There is no dash state: nothing in the rubric produces NOT_YET, and a no-dossier name has volume and often liquidity readable, so the desk read what it could. Two strings, one per cause, because the second alone would imply the desk tried and failed on a name it never researched:

- **No research on the name at the checkpoint:** "Not graded as of {checkpoint time} ET. The desk has no research on this name at this checkpoint, so fewer than three of the five criteria could be read."
- **Researched, but too little readable:** "Not graded as of {checkpoint time} ET. Fewer than three of the five criteria could be read."

Both are followed by the same {Basis} line. If Research later defines a real NOT_YET, the dash returns with Research's definition and a string true of it, and comes back to Commercial first.

**Open, Research and Commercial's, not settled here.** Research has now defined NOT_YET as "no research row at that checkpoint (nobody looked)" and says a no-dossier row is NOT_YET, 147 of the 213, with 66 UNKNOWN (a dossier, fewer than three readable). The rubric's rule 1 as drafted still stores a no-dossier row UNKNOWN, so the rubric text has to change before the dash can mean anything. If it does, the dash returns for the 147 only, with a string true of Research's definition and NOT the v1 string ("has not read this name"), which Commercial found false because volume and liquidity are read from market data with no dossier. My proposal for that string, for Commercial to read first: **"The desk has no research on this name at this checkpoint."** and a legend sentence "A dash in this column means the desk has no research on the name at that checkpoint." Until Commercial passes both, the page ships the two "Not graded" strings above.

## 4. The standing legend (once per board, not per row)

"Setup grade is the desk's own automatic reading of five criteria at the checkpoint shown: cycle, catalyst, relative volume, liquidity and share supply. It is the same for every reader. It is not a prediction, not a recommendation, and the grades have not been tested against outcomes. Not graded means fewer than three of the five criteria could be read."

*No link and no "see the rubric" placeholder: the published rubric page carries decision 3's thresholds and, when it exists, comes to Commercial before it ships. "The grades have not been tested against outcomes" is tied to a flag and changed in the same commit as the first outcome test; at expiry the clause is DELETED, never replaced with a result (any statement of how grades did is an outcome claim and goes back to Commercial). Research's simulation measures no outcome and does not trigger the expiry.*

## 5. Surfaces the words must reach (Commercial's sweep, restated for Integration)

Column, filter options (read "Setup grade A", "B", "C", "D", "Not graded"), URL values, aria-labels (badge: "Setup grade {letter}"), tooltips, the drawer badge, MCP output, API and exports, report tags. No "AVOID" and no "Priority" may reach a reader on any of them. D is the label everywhere.

## 6. What the board will look like, and the words that cover it

Research's simulation, 719 rows: A on 5, B on 293, C on 9, D on 199, not graded on 213. A will be rare and "Not graded" common until research reaches the leaders. **I wrote no sentence that says so**: a reader of the legend learns what each state means, and the strongest reading being uncommon is a fact about the desk's inputs, not a claim the page needs to make. If he wants it said, the form would be a measurement with a date ("on {date}, A was read on 5 of 719 name-checkpoints"), which is a history claim Commercial must read.
