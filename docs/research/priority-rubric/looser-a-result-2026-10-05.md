# Looser A rule: simulation result (exploratory, $0, nothing changed)

*Research-tmi, 2026-10-05. Named in the recommendation Integration put to him ("approve the draft now and have Research simulate the looser one"); he approved the badge draft as drafted (verified at his own turn, transcript 125cfd6b, 2026-10-05T21:22:37.844Z), so the approved rule stands and this is information for a later decision, not a change. Script `looser-a.ts` committed at `860395a3` before it ran; output `looser-a-out-2026-10-05.json`. Same 719 stored in-range recap rows (31 checkpoint dates, 2026-08-17 to 2026-10-01), graded by the approved library function `priorityGrade`.*

**The looser rule:** A when catalyst is STRONG and volume is STRONG, no reading is RISK anywhere, and at least four of the five are readable. Every other rule is unchanged; only rows the approved rule grades B can move.

| Grade | Approved rule | Looser A |
|---|---|---|
| A | 5 | **45** |
| B | 293 | 253 |
| C | 9 | 9 |
| AVOID (D) | 199 | 199 |
| NOT_YET | 147 | 147 |
| UNKNOWN | 66 | 66 |

40 rows move from B to A. That is about 1.5 A names per recap checkpoint (45 over 31 dates), against about one every six checkpoints under the approved rule.

**What it says and does not say.** The approved rule's A is rare because it needs all five criteria readable and four of them STRONG, and two inputs are mostly missing (the cycle reads UNKNOWN on 73 percent of researched rows; supply cannot read STRONG until the float bound ships). The looser rule drops both requirements, which is why it admits 40 more: it grades A on a catalyst and a volume reading with four criteria readable, and that is a different claim from the one the approved A makes. Neither rule has been tested against outcomes. Fixing the cycle input would move the approved rule's A count; this table does not show by how much.
