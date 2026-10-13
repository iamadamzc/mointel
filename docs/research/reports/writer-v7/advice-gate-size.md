# No word strikes: read 82's advice gate (ii), the night scan (iii), and their cost. SIZE ONLY (2026-10-13)

*Research-tmi. For Integration, to put the cost to him. Nothing here is built or run. Inputs: his rule "i recommend we dont strike words..." (uuid c6b4168d) and "1 yes, 2 yes run the test" (uuid 71876cfd); Commercial reads 82 (`db4f572d`) and 82a (`2f1136cb`); the advice probe (`b7578fe9`); the writer test raw (`e6e6dcd9`). Costs are estimates from measured per-check costs, not quotes.*

## What already stands

- **The checker is told to strike advice today** (check.ts:638, every line, the live v6 checker). The probe: terra struck 11 of 11 planted advice sentences with no struck word, in both passes (22 of 22), placebo 0. Each terra check cost $0.037 to $0.046.
- **Em dash, measured:** 0 of 623 texts in the 10-13 test's 48 drafts contain one (control: the same count finds 2,059 lines in research.md). A comma replacement that keeps the clause would have changed no line in that run.

## (i) The independent two-question read

Read 82 (2)(i): every line and the Summary, two yes/no questions with the quoted phrase (does it tell, suggest or imply an action on a security; does it predict or promise a price or an outcome), a carve-out for a company's or counterparty's own action stated as a fact, with six examples from the 46 real deal lines.

- **Option A, recommended: in the same checker call.** The two questions and the carve-out go into the checker's system prompt as their own section, and the verdict schema gains two booleans and a quoted phrase per line. About 1,200 characters (about 300 input tokens, estimate): about $0.0006 a report on terra, under $0.10 a month at 105 reports. Read 82 says "by the checker model", which this is.
- Option B: a separate call per report with the lines only. About 3,000 input tokens: about $0.01 a report, about $1 a month.
- Build (either): checker prompt, schema, parser, the strike, tests, mutants. About 4 hours (estimate).

## (ii) The pre-registered gate, before the word list is switched off

- **Seed set, at least 40 sentences**, written by Research and read by Commercial before the run: the explicit and soft forms read 82 names ("worth a look", "one to watch", "time to take profits", "a name to keep an eye on", "dip buyers", "good entry", "stand aside", "cheap", "poised to", "sell into strength", "worth buying on the dip", "entry at") and compounds ("agreed to sell ... so sell into strength"). Committed before any call.
- **Must pass: the 46 real deal lines** (`tests/desk/fixtures/deal-fact-lines-2026-10-12.json`, `dealFacts`), at least 95 percent.
- **Method:** as the advice probe. Planted sentences are appended to unstruck lines of replayed stored drafts (at most 10 per report, so about 5 planted reports). The 46 deal lines are checked in the drafts they came from (the 10-12 reports test raw). Each set runs 3 times, with an unplanted placebo per report.
- **Pass:** every seeded sentence struck in all 3 runs, and at least 44 of 46 deal lines passed in every run. A single miss keeps a narrow deterministic backstop of the unambiguous imperative shapes until the read is changed and re-run (read 82).
- **Cost:** about 33 terra checks (3 runs x about 11 reports), about $1.50 (estimate from $0.037 to $0.046 a check). Stop $3. Build: about 3 hours.

## (iii) After switch-off: 30 days of a nightly scan by a different model

- Each night, every report stored that day (session_reports, struck text kept since 51da1b30) is read by a model other than terra with the same two questions; every hit goes to Integration by the next morning; one change restores the word list.
- **Model and cost:** Claude Opus 5.5 at $4 / $20 per Mtok (the price the 10-12 harness took from the bundled reference). About 4,000 input and 300 output tokens a report, about $0.022 a report, **about $2.30 for the 30 days** at 105 reports. luna would cost under $0.30 for the 30 days, but it is the same vendor as the checker. A cheaper Claude model is possible; I have not read its price, so I give none.
- Key: the Reports or Tests workspace key on the box, which Ops would place (the box holds no Anthropic key today, as far as this seat knows; not opened).
- **Build:** a script and a systemd timer (Ops), the hits file and the morning message. About 5 hours for Research plus Ops's deploy (estimate).

## Order and total

1. Prompt v3 aligned with the voice doc (6992c911), re-gated (no spend).
2. (i) built and tested (no spend).
3. (ii) the gate run: **about $1.50, stop $3** (his yes).
4. On a pass, the word strikes come out with the em dash replaced, which ships on his go by sha. (iii) starts the same night: **about $2.30 for 30 days** (his yes).
5. The writer v7 re-test (about $5, stop $7, his yes) can run on the new checker after step 4, so it measures the product as it would ship.

Total new spend about $4 (gate and scan), plus the writer re-test about $5. Build about 12 hours of Research plus Ops's deploy of the scan (estimates).
