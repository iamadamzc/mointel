# Setup grade: DRAFT words for Research's rubric (d63a00aa), for Commercial's claims pass and his one approval

*Marketing draft v1, 2026-10-05. Answers Research-tmi's request. Wording only; nothing built, nothing shipped. No em dashes; the empty-cell glyph is written "a dash". Words are readings: no forward tense, no imperative, never "pick", "signal", "opportunity", "avoid", "priority" or "next-session". Conditions carried from Commercial (rubric draft section 5): the same reading for every reader; the lowest grade names what is wrong; one standing legend sentence; "not tested against outcomes" is a factual claim that expires the day any outcome test runs.*

*HELD on purpose, because he rules them once via Integration (rubric section 4): the cycle as "Structure", how hard A is, the thresholds, catalyst age, the AVOID rule. Nothing below states a threshold, an A definition, or which single criterion forces D. Where a word depends on one of the five, it is marked.*

## 1. The four letters (the badge in the Ticker cell)

The badge shows A, B, C or D. D is the display of the stored AVOID (Integration's option a); no surface prints "AVOID".

Tooltip, one shape for all four: **"Setup grade {letter} as of {checkpoint time} ET. {Reading} {Basis}"**

| Letter | {Reading} |
|---|---|
| **A** | "The strongest reading of the five criteria." |
| **B** | "Meaningful limits on one or more criteria." |
| **C** | "A weaker reading: the cycle reads as a backside." |
| **D** | "Risk outweighs the setup." |

*Notes.* A is worded as a comparison to the other letters, not as "all five strong", so decision 2 (how hard A is) does not move the sentence. D says what is wrong and does not say which single criterion forces it, so decision 5 does not move it. C names the cycle because the draft rule is exactly that; if decision 1 changes what "Structure" means, C's clause is the one line that changes.

**{Basis}** lists criteria by their reading, in this order, omitting any group that is empty: "Strong: volume, catalyst. Limited: cycle. Risk: liquidity. Not readable: share supply." Criterion names on the surface: **cycle, catalyst, relative volume, liquidity, share supply.** The cycle is called "cycle", not "Structure", and supply "share supply", so the labels hold whichever way decision 1 goes (only the grouping logic would change, not the words). "Rests on", never "drove": the tooltip names the basis and claims no cause.

Example, whole tooltip: *Setup grade B as of 15:42 ET. Meaningful limits on one or more criteria. Strong: relative volume, catalyst. Limited: cycle. Not readable: share supply.*

## 2. The five readings, in words (drawer row or detail line, one per criterion)

No numbers: the thresholds are decision 3. Each line says what the stored input is, not what to do.

| Criterion | Strong | Limited | Risk | Not readable |
|---|---|---|---|---|
| **Cycle** | "Fresh or frontside." | "Frontside, with a warning." | "Backside." | "The cycle could not be read." |
| **Catalyst** | "A strong or clearly positive catalyst." | "A moderate or mixed catalyst, or none found in our sources." | "A weak, negative or dilutive catalyst." | "The catalyst could not be graded." |
| **Relative volume** | "Heavy against its normal." | "Moderate against its normal." | "Light against its normal." | "Volume could not be read." |
| **Liquidity** | "Tight spread, deep dollar volume." | "In between." | "Wide spread or thin dollar volume." | "Spread or dollar volume could not be read." |
| **Share supply** | "A clean share structure with a small float bound." | "A caution on the share structure, or clean without a small bound." | "A dirty float." | "The share structure could not be read." |

*Share supply "Strong" cannot occur until the float bound ships (Research: no stored row reads clean today). Until then the line is never shown; it is written now so the table is complete.* "None found in our sources" is the honest form of the catalyst "none" reading and says what the desk searched, not what the world holds.

## 3. Not graded, and a name the desk has not read

- **Not graded** (stored UNKNOWN: fewer than three of the five criteria readable): badge reads **"Not graded"**. Tooltip: **"Not graded as of {checkpoint time} ET. Fewer than three of the five criteria could be read."** followed by the same {Basis}.
- **Not read yet** (stored NOT_YET: no research row for this name at the checkpoint): the cell is **a dash** and only for this state. Tooltip: **"The desk has not read this name at this checkpoint."** A produced-but-unreadable name never prints a dash.

*Question for Research, it changes the mapping, not the words:* your simulation counts 213 UNKNOWN rows, which includes the 147 with no dossier. If a no-dossier row is stored NOT_YET it takes the dash, and "Not graded" is the smaller group. If it is stored UNKNOWN it reads "Not graded" and the tooltip's first sentence is wrong for it ("fewer than three could be read" is true, but the real cause is that nothing was read). Say which, and I will split the sentence.

## 4. The standing legend (once per board, not per row)

"Setup grade is the desk's own automatic reading of five criteria at the checkpoint shown: cycle, catalyst, relative volume, liquidity and share supply. It is the same for every reader. It is not a prediction, not a recommendation, and the grades have not been tested against outcomes. A dash in this column means the desk has not read the name at that checkpoint. Not graded means fewer than three of the five criteria could be read. **How the five criteria are read.**"

*The bold link is the published rubric (Commercial's condition). That page does not exist and carries decision 3's thresholds, so it is gated on his approval of them. Until it ships, the legend ships without the link only if Commercial passes that.* The clause "the grades have not been tested against outcomes" must be tied to a flag and changed in the same commit as the first outcome test; Research's simulation measures no outcome and does not trigger the expiry. The legend never opens with the dash glyph.

## 5. Surfaces the words must reach (Commercial's sweep, restated for Integration)

Column, filter options (read "Setup grade A", "B", "C", "D", "Not graded"), URL values, aria-labels (badge: "Setup grade {letter}"), tooltips, the drawer badge, MCP output, API and exports, report tags. No "AVOID" and no "Priority" may reach a reader on any of them. D is the label everywhere.

## 6. What the board will look like, and the words that cover it

Research's simulation, 719 rows: A on 5, B on 293, C on 9, D on 199, not graded on 213. A will be rare and "Not graded" common until research reaches the leaders. **I wrote no sentence that says so**: a reader of the legend learns what each state means, and the strongest reading being uncommon is a fact about the desk's inputs, not a claim the page needs to make. If he wants it said, the form would be a measurement with a date ("on {date}, A was read on 5 of 719 name-checkpoints"), which is a history claim Commercial must read.
