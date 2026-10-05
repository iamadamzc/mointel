# Setup grade: DRAFT words v3 for Research's rubric (d63a00aa), for his one approval

*Marketing draft v3, 2026-10-05. v2 to v3, on Research's rubric rule 0 (db44c74e: no dossier at the checkpoint stores NOT_YET, no letter; 147 NOT_YET and 66 UNKNOWN of 213): the dash state is back for NOT_YET only, with the string "The desk has no research on this name at this checkpoint." and a legend sentence about the dash; the first Not graded string (the no-research cause) is removed because rule 0 makes it unreachable. Integration relays that Commercial passed the parked dash string and legend sentence on exactly that condition; I could not find that pass in a committed claims read, so treat it as relayed, not seen, until Commercial's written pass is named by sha. v1 to v2, applying Commercial's claims read section 6 (be0bdaca, four required changes). Changes from v1, so Commercial diffs only these: (1) B reads "One or more criteria read below the strongest, or could not be read."; (2) A reads "The highest grade on these criteria."; (3) relative volume reads heavy, moderate or light "on the desk's scale", not "against its normal"; (4) the dash state and its legend sentence are gone; a no-dossier name is "Not graded", with two cause strings; plus the legend ships without the rubric link, and "not tested against outcomes" is deleted at expiry, never replaced. Answers Research-tmi's request. Wording only; nothing built, nothing shipped. No em dashes; the empty-cell glyph is written "a dash". Words are readings: no forward tense, no imperative, never "pick", "signal", "opportunity", "avoid", "priority" or "next-session". Conditions carried from Commercial (rubric draft section 5): the same reading for every reader; the lowest grade names what is wrong; one standing legend sentence; "not tested against outcomes" is a factual claim that expires the day any outcome test runs.*

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

**{Basis}** lists criteria by their reading, in this order, omitting any group that is empty, and inside each group in the legend's fixed order (cycle, catalyst, relative volume, liquidity, share supply): "Strong: volume, catalyst. Limited: cycle. Risk: liquidity. Not readable: share supply." Criterion names on the surface: **cycle, catalyst, relative volume, liquidity, share supply.** The cycle is called "cycle", not "Structure", and supply "share supply", so the labels hold whichever way decision 1 goes (only the grouping logic would change, not the words). "Rests on", never "drove": the tooltip names the basis and claims no cause.

**{checkpoint time}** prints as "15:42 ET" when the checkpoint is the same ET day as the reader's now, and with its date ("Oct 3, 20:05 ET") when it is an earlier day, so a grade stored last night never reads as an hour ago. A date is a fact about when the reading was taken, not a claim; Commercial sees it in the diff.

Example, whole tooltip: *Setup grade B as of 15:42 ET. One or more criteria read below the strongest, or could not be read. Strong: catalyst, relative volume. Limited: cycle. Not readable: share supply.*

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

## 3. Not graded and the dash (two stored states, two faces)

- **Not graded** (stored UNKNOWN: the desk has a dossier and fewer than three of the five criteria are readable): the badge reads **"Not graded"**. Tooltip: **"Not graded as of {checkpoint time} ET. Fewer than three of the five criteria could be read."** followed by the same {Basis} line.
- **No research** (stored NOT_YET, rubric rule 0: no dossier at the checkpoint, no letter): the cell is **a dash**, and only for this state. Tooltip: **"The desk has no research on this name at this checkpoint."** It says what is true of the research, not of the name: volume and liquidity are read from market data with no dossier, so the string does not say the desk has read nothing.

A produced-but-unreadable name never prints a dash, and a name with no research never reads "Not graded". Rule 0 makes the earlier "no research on the name" cause string for Not graded unreachable, so it is removed.

## 4. The standing legend (once per board, not per row)

"Setup grade is the desk's own automatic reading of five criteria at the checkpoint shown: cycle, catalyst, relative volume, liquidity and share supply. It is the same for every reader. It is not a prediction and not a recommendation. A dash in this column means the desk has no research on the name at that checkpoint. Not graded means fewer than three of the five criteria could be read."

*No link and no "see the rubric" placeholder: the published rubric page carries decision 3's thresholds and, when it exists, comes to Commercial before it ships.*

### 4a. The outcomes clause: DELETED 2026-10-05 (Research's outcome test, adae1e89; Commercial's ruling 6b, c26daa80)

"The grades have not been tested against outcomes" expired the day Research's test ran, and the legend above is the text with the clause deleted and nothing put in its place. It changes in the same commit that publishes the legend. Commercial's ruling: no result sentence in the legend (its caveats cannot fit one sentence and any short form overstates). Never say anywhere that the grades were "tested", "validated", "do not predict" or "did not work". If he wants the result published, it is a separate dated page that comes to Commercial first, with the population, the measure, the power limit, the untested A and C groups and the selection point; whether the desk publishes it is his decision, and Commercial recommends not now. The Option 2 sentence I drafted earlier is withdrawn: Commercial's requirements for a result page exceed one sentence.

## 5. Surfaces the words must reach (Commercial's sweep, restated for Integration)

Column, filter options (read "Setup grade A", "B", "C", "D", "Not graded"), URL values, aria-labels (badge: "Setup grade {letter}"), tooltips, the drawer badge, MCP output, API and exports, report tags. No "AVOID" and no "Priority" may reach a reader on any of them. D is the label everywhere.

## 6. What the board will look like, and the words that cover it

Research's simulation, 719 rows: A on 5, B on 293, C on 9, D on 199, not graded on 213. A will be rare and "Not graded" common until research reaches the leaders. **I wrote no sentence that says so**: a reader of the legend learns what each state means, and the strongest reading being uncommon is a fact about the desk's inputs, not a claim the page needs to make. If he wants it said, the form would be a measurement with a date ("on {date}, A was read on 5 of 719 name-checkpoints"), which is a history claim Commercial must read.
