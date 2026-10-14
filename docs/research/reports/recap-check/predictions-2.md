# Recap re-check, second run (L13 (b)): predictions and the pass rule, before any model call (2026-10-14)

*Research-tmi. His "a and b" (Integration chat 9c4f0257, queued input 20c5c7db, origin human, 2026-10-14T01:28:56.955Z, verified at his turn), (b): "One more fix, then a second re-check of the recaps ... about $1.60 with a hard stop at $2.50". Integration's recommendation he answered: the recaps move to the new writer only if (b) passes. v7 version 8 = version 7 plus `RECAP_SHAPE_RULE` after the recap's ticker list (Marketing's wording; Commercial's read before the run). Same harness (`scripts/report-writer-recap-check.ts`), the same 9 reports (PREMARKET 2026-10-02, 10-05, 10-06, 3 runs each, store copy of 2026-10-07), luna writer, the Claude checker (Tests-TMI key, no fallback), HARD STOP $2.50; raw to `docs/research/reports/recap-check/raw-2`, committed before it is read. The first run: result `7f9210be`, raw `0374313a`.*

**The checker is the one this harness merged (`e56f27c0`) plus the H-verdict fix (`4fd8b7ab`, cherry-picked here as `f2919ed4`), i.e. the checker as it ships after tonight's release.** A stray H verdict no longer fails a check; any other malformed reply still does, and its raw is kept.

## The pass rule (stricter than the first run's: moving the recaps is the question now)

**PASS** only when all three hold:
1. **No off-list ticker:** no draft Summary names a ticker outside its list, and no published Summary is struck for one.
2. **No rank:** no draft Summary states a rank (`rankInSummary` is false in all 9).
3. **The Summary holds as v6's did:** at most 1 published Summary struck, for any cause. Baseline: v6's recap Summary was struck in 0 of 3 published recaps in L12 (raw `f71c48c2`); v7's in 2 of 2 (L12) and 5 of 7 (first run).

If fewer than 6 reports publish, 3 is **NOT DECIDED**. Every other strike, every failed check (with its raw reply), the judgement lines (read by hand) and the count sentence are reported. **FAIL** means the recaps stay on v6; option 2 (structural) would need a new word from him.

## Predictions

1. Off-list names in the draft Summaries: **0 or 1 of 9**.
2. A rank in a draft Summary: **0 or 1 of 9** (first run: 5).
3. The word "zero" for a count: **0 of 9**.
4. Summary struck: **1 to 3** of the published (other causes remain: a change note, a figure the facts do not give).
5. Failed checks: **0 or 1 of 9** (the first run's 2 were both the stray H verdict, now ignored).
6. Spend **$1.45 to $1.75**, all 9 run.
7. Count sentence: **9 of 9**.

My honest expectation is that rule 3 is the hard one: the first run's other strike causes (a change note, a figure from outside the facts) are not what this sentence addresses.
