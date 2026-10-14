# Writer v7 test: result (2026-10-13)

His yes: "yes, run the writer test" (Integration chat 5544e519, uuid 07dd71ab, 2026-10-13T00:20:53.034Z, verified). Harness `878b706a` (committed before any call), Integration's replay of `da769fee`, raw `e6e6dcd9` (committed before it was read). Run 2026-10-13T01:10:33Z to 01:20:24Z. 12 stored inputs (store copy of 2026-10-07; 10-02, 10-05, 10-06; four kinds), four arms, terra checking every arm. **Spend $4.77 of the $7 stop.** Figures come from `tabulate.py` and the probes named below, run on the raw.

## What it found

**1. v7 as built is worse on truth: about 29 percent of lines struck against 8 to 10 percent for v6.**

| Arm | Lines struck | Summary struck | Name lines struck (other than the after-hours-high clause) | Number errors | Lines saying "in our sources" | Clock times | Summary length | Cost |
|---|---|---|---|---|---|---|---|---|
| v6, luna | 16 of 156 (10.3%) | 1 of 12 | 15 of 144 (15) | 2 | 12 of 144 | 7 | 82 words | $0.54 |
| v7, luna | 45 of 156 (28.8%) | 11 of 12 | 34 of 144 (7) | 14 | 8 of 144 | 0 | 161 words | $0.57 |
| v6, Opus 5.5 high | 12 of 156 (7.7%) | 0 of 12 | 12 of 144 (12) | 1 | 48 of 144 | 90 | 91 words | $2.04 |
| v7, Opus 5.5 high | 45 of 155 (29.0%) | 7 of 12 | 38 of 143 (13) | 5 | 24 of 143 | 0 | 134 words | $1.62 |

**2. Two causes, both in my prompt design, not in the voice.**
- **Name lines: an after-hours high the checker cannot see.** On the late evening report the card's path starts at the regular-session close and its high is the after-hours high. v7's sheet handed the writer "off the after-hours high"; the checker is given the row's session high only, so it struck the clause as unsupported: 27 of luna's 34 struck lines and 25 of Opus's 38, all on that report. Without that clause, v7's name lines are struck 7 times (luna) against v6's 15, and 13 (Opus) against 12.
- **The Summary: it pulled facts from the name sheets.** Freed from v6's templates, both writers put catalyst details, dates and figures from the name sheets into the Summary, which the checker allows only from the Summary's own facts: luna's Summary was struck in 11 of 12 reports (31 dates not in a named catalyst, 14 numbers not given, 9 unsupported claims, and deal words such as "entered" and "sell", which the deal exception allows only in a name's own line); Opus's in 7 of 12. The Summary also doubled in length.

**3. The voice measures moved as intended, except repetition.** v7 never wrote a clock time (v6: 7 and 90); it used the three ruled state phrases exactly every time (v6 almost never used two of them); and fewer lines said "in our sources" (luna 8 against 12, Opus 24 against 48). But the most repeated 4-word sequence ROSE (share of a report's lines: luna 0.71 against 0.44, Opus 0.63 against 0.56), and the top sequence is "from the prior close". **v7's sheet gave every name the same move words** ("up from the prior close; off the high"), which is the mistake v6 made with its news phrases, in a new place.

**4. A measure of mine was invalid.** `tabulate.py` counted "a figure in a name line with a card path" (52, 52, 57, 50), but its pattern also matched catalyst figures ("$15 million", "100% of the Target Company"), which are allowed. A move-percent pattern (`movepct.py`, run on the raw) finds 1 to 3 per arm, all arms alike; of the examples it printed, one v6 luna line restates a move (OLOX "up 112.5% from the reference" close) and the rest are filing figures or "since the previous checkpoint" notes. Move percents are rare in every arm, so that prediction cannot tell v6 from v7.

**5. The blind pairs are not blind as built.** In 7 of the 10 pairs one side's Summary was struck (shown as "no Summary: the checker struck it") and the other side's was not; v6's Summary was struck at most once in 12, so a missing Summary marks v7. The pairs file is in the raw, key separate and unopened by anyone else; it should not go to him as a fair read of the voice.

## Against the predictions (`predictions.md`)

1. Repetition falls: **failed** (rose; cause in finding 3).
2. "in our sources" falls: **held**.
3. No figure, no clock in v7 lines: clock **held** (0); figure **not measured validly** (finding 4); move percents are rare in every arm (1 to 3).
4. Ruled phrases near exact: **held** (100 percent).
5. Struck share within 5 points: **failed** (about 29 against 8 to 10 percent).
6. Number errors at or below v6: **failed** (14 against 2; 5 against 1), all in the Summary.
7. Cost about $5 under $7: **held** ($4.77).
8. No prompt mismatch: **held** (dry run and paid run).

## What would fix it (prompt version 3; no checker change)

1. **Drop the move and high words from the name sheet.** The card prints the move, the checker cannot verify an after-hours high, and the identical words became the new repeated phrase.
2. **Fence the Summary to its own facts again,** without v6's templates: only the narrative facts block; no dates, figures or deal wording from the name sheets; a catalyst clause for fresh names only, as given.
3. **Say the deal-word exception is for a name's own line only.**

Then Commercial reads the text, the same test runs again (about $5, his yes), and the pairs go to him only if both sides' Summaries survive in every pair (or the pairs show the writers' drafts before the checker).
