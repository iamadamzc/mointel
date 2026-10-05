# Split-proof replay: RESULT

*Research-tmi, 2026-10-05. Pre-registration `split-proof-prereg-2026-10-05.md` (`a21ee1b4`); script `split-replay.ts` (`ea89900a`); raw `validation-out-2026-10-05/split-replay.json` committed at `c8b7254d` before it was read. $0, read-only on the local scratch copy of the store. Controls passed (the planted 2-for-1 step does not read NONE under R1, R2 or R3; the planted 1.05 step reads NONE under R1); R0 reproduces the recorded proof for all 30 names; the one name R0 found a split for (MI) is not NONE under any rule, so no rule is disqualified; the one name R0 proved clean (CAMP) stays NONE under all of them.*

## 1. Counts, of the 30 names with a filed count

| Rule | NONE | FOUND | UNPROVEN |
|---|---|---|---|
| R0 (as built) | 1 | 1 | 28 |
| R1 (tolerate the checkpoint date's own bar, with a price guard) | 6 | 6 | 18 |
| R2 (tolerate the last three sessions, guarded) | 7 | 6 | 17 |
| R3 (tolerate any null bar, guarded) | 10 | 8 | 12 |

**FOUND rises from 1 to 6 to 8:** R0 stopped at the first null and never looked at the factors that were there. Five more names have a split-sized step in the stored factor across their span (a real split since the count, so their count is in the wrong units), and the earlier rule hid them as "unproven". That is a finding about the baseline, not only about the new rules.

**R4 (dossier `reverseSplitHistory`, report only):** 15 of the 30 dossiers carry some entry; none carries a date inside the span. It is free text with no coverage evidence, so an empty or undated list proves nothing and R4 produced no NONE. **FINRA's flag** was not run: it is published at settlement dates about a week late, so it cannot cover the last two weeks of any span by construction.

## 2. What it does to the column (registered state table, all 36 names)

PRODUCED, by rule and issuance rule and maximum age:

| Split proof | KNOWN_ACTIVE, 45d | KNOWN_ACTIVE, 90d | KNOWN + POSSIBLY, 45d | KNOWN + POSSIBLY, 90d |
|---|---|---|---|---|
| R0 | 0 | 0 | 0 | 0 |
| R1 | 1 | 3 | 0 | 1 |
| R2 | 1 | 3 | 0 | 1 |
| R3 | 1 | 5 | 0 | 2 |

(120 days equals 90 on this draw: no count is between 91 and 120 days old.) **Even the most permissive proof leaves a number for 5 of 36 names at best (14 percent), and 1 of 36 at the 45-day maximum.** After the split proof, the gates that remain are issuance (14 names flagged under KNOWN_ACTIVE, 21 under the wider rule), splits actually found (6 to 8), and the age of the count (at 90 days, 1 to 3 names still fail on age under these rules).

## 3. What is and is not established

- R1 is the smallest change that explains the largest unproven group: 15 of the 28 had their only null on the checkpoint date's own bar. It moves 5 names from UNPROVEN to NONE, with a price guard that refuses a split-sized step. It does not make the column useful.
- **A replay on 30 names is not a validation of a rule.** No rule goes into the contract until the fresh-draw re-run (validation amendment 3).
- The draw is four consecutive recap days with counts mostly dated early August. A draw from days just after a filing cluster would age better and change the age row, not the split row.

## 4. For the decision (his, via Integration)

The choice on offer is no longer "45, 90 or 120 days". On this evidence the cell shows a number for under a seventh of names under every variant I replayed, and for one name in thirty-six at the 45-day maximum that Commercial's face depends on. He may reasonably decide the column is "Cannot verify" for most names at launch, or that the issuance and age rules need to come first; I am not recommending a rule from 30 names.
