# Recap re-check (L13): predictions and the pass rule, before any model call (2026-10-14)

*Research-tmi. His yes: "yes to all three" (Integration chat 1f30f0a2, uuid 8e3e419f, 2026-10-13T21:36:56.972Z, verified at his turn), item 2. Stop $2.50 (he saw it at 2026-10-13T20:52:10.751Z, same chat). Harness `scripts/report-writer-recap-check.ts`. v7 version 7 on the 3 stored PREMARKET inputs (2026-10-02, 10-05, 10-06; store copy of 2026-10-07) x 3 runs = 9 reports, luna writer, the shipping Claude checker (Opus 5.5 high, word list off, no fallback, Tests-TMI key). Strings: Marketing PASS on all five; Commercial read 107 PASS as written, with two measures added (7 and 8 below).*

## The pass rule (the sizing `d40c5dff`, made measurable)

**PASS** when no Summary names a ticker outside the list its prompt gave it, read two ways, both required:
1. **From the draft:** `outsideList` is empty for every report whose writer returned a draft (the harness compares each name the writer was shown with the draft Summary, case-sensitive, whole word).
2. **From the checker:** no published report's Summary is struck for a name or figure from outside its facts (read off each strike's reason and detail in the raw).

Any other Summary strike, every name-line strike and every failed check is reported, and does not by itself fail L13. **FAIL** sends option 2 to him for a new word (it is not approved). If fewer than 7 of 9 reports are checked, measure 2 is **NOT DECIDED** on its own and the result says so.

## Predictions

1. Draft Summaries naming a name outside the list: **0 of 9** (I would not be surprised by 1).
2. Summary struck for any cause: **at most 2 of 9** (L12: 2 of 2 published v7 recaps, both for names from the list).
3. Checker calls that fail: **0 to 2 of 9** (L12: 3 of 23 overall, 1 of 3 v7 recaps; 10-05 failed then).
4. Name lines struck: **at most 4** in all 9 reports (L12 v7 recaps: 1 name line in 2 published reports).
5. Spend **$1.45 to $1.75**, all 9 run. A failed call charged its worst case ($0.81) can make the stop refuse the 9th; if so it is listed, not re-run.
6. Each Summary keeps the recap's shape (the counts and the named movers), not "ranked first in this range": **9 of 9** drafts do not contain "ranked first".

## Commercial read 107's two added measures (reported, each read by hand; not part of the pass rule)

7. Drafted lines with "positive" or "negative", or a catalyst kind ("rather than an ... catalyst", "operating", "transaction-development", "<word> catalyst" other than "no catalyst" and "fresh catalyst"), each beside its ticker's research summary: **at most 2 in all 9 reports**, and each one the research or the source states.
8. The covered-names count sentence ("names the desk covers ... fresh news") in the draft Summary: **9 of 9**.

## Limit stated now

Strings 2 to 5 (no judgement word, no catalyst kind, the "confirmed" cut, the specimen header) reach every report kind. This re-check reads only the recaps. The intraday kinds get no paid re-check before wiring; their gate is the tests and a stub dry run.
