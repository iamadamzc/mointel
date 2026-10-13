# v7's evening recap Summary: the fix, and what wiring v7 takes (SIZE ONLY, 2026-10-13)

*Research-tmi, for his decision via Integration (ruling after the re-test result `9748a74d`). Nothing built, nothing run. Read: the two struck Summaries' strikes in raw `f71c48c2`; `lib/desk/reports/writerV7.ts` at `38a1130a`.*

## The cause, from the strikes

In both evening recap (PREMARKET) reports, v7's Summary named tickers the recap's narrative facts do not name, then brought in their catalyst figures and dates:
- 2026-10-02: "Intraday, VCIG ranked first, followed by ZNB, SILO, AMOD, SMTK and CYCU", then their deal sizes and share counts (11 figures not given, 3 dates in no named catalyst).
- 2026-10-06: LCFY, not named in the facts, with its figures (3).

The prompt already says it (`writerV7.ts:206`): "never mention a name the narrative facts do not name". luna did not obey it in the recap, where the name lines below are the intraday board. The checker struck every such Summary, so nothing false would publish; the report publishes without a Summary. The fix is in the writer.

## Option 1: the prompt, recap only (recommended first)

Put the rule where the recap Summary is written: "This is the evening recap. The Summary names ONLY the names in the narrative facts; the names below it are the board's and are not the session's story", and give the recap's narrative-fact names as a list the Summary may use. About 1 hour plus Marketing's and Commercial's read of the sentence (no voice change).

**Re-check:** v7 only, the 3 stored PREMARKET inputs, 3 runs each: 9 reports, luna writer, the shipping Claude checker. About **$1.60**, **stop $2.50** (the same per-report reservation; one failed call costs its worst case, $0.81). Pass: no Summary struck for a name outside the facts in 9 of 9; any other Summary strike is reported. His yes on the spend.

## Option 2: if the prompt alone does not hold

Hide the board's names from the Summary's part of the recap sheet (the writer sees the narrative facts first, the name sheets after a clear break), or drop the Summary in the recap and keep the name lines. About half a day; the same re-check.

## Wiring v7 into production, after a pass

`runReport` builds the v6 prompt for every report (the harness swaps it). Wiring is: the pipeline builds `buildWriterPromptV7` from the same inputs, the stored versions name writer prompt v7, the pipeline and job tests move to v7's prompt (v6 stays in the repo), tsc, lint, the full gate. **About half a day of Research**, then Ops's gate and a normal release (no restart of the market worker), his go by sha. The copy (Marketing's voice, the rating sentence) is already read by Marketing and Commercial; the recap sentence above is the only new text.

## Commercial read 100 (re-count of the raw, every published v7 line read): no blocking finding; four prompt notes for the same change

1. "no fresh company-specific positive event" (ZNB, three reports): "positive" is an evaluation no fact defines; tell the writer to drop it unless the source says it.
2. "rather than an operating or transaction-development catalyst" (JONE) is the desk's classification; acceptable only if the research summary says it.
3. "Never confirmed" is ignored six times, all attributed and true: drop the rule from the prompt or accept the drift (the word is no longer struck).
4. The recap Summary naming tickers outside its facts: the fix above. Wire v7 for the recap only after it and one re-check.
And: watch the failed Claude checks in week one; send Commercial any that are a refusal on content rather than a malformed reply.

Notes 1 to 3 are a few lines in the same prompt change; they add nothing to the size.

## Total

Option 1 plus wiring: about a day, and about $1.60 of spend. If option 1 fails its re-check, option 2 adds half a day and another about $1.60.
