# v13 re-check: pass rule and predictions, before any model call (2026-10-15 UTC)

*Research-tmi (local_dd23765d). His "b" (Integration chat 7d32ed42, uuid 65ae2fbc-d2db-4142-bebd-986a4ffcf862, 2026-10-15T01:33:52.943Z, a user row, verified at his turn; the option it answered: "one more instruction plus a short re-test, then ship"), about $1.80, HARD STOP $4. Branch `research/counterparty-on-d45d01bd`: production a966a517 + the frame fix + v7 version 11 + the counterparty exception (4360b06c's two defects fixed: the checker clause's apostrophe, and the "shorter than v6" test half dropped, Integration agreed) + version 13's two lines, VERBATIM from Marketing c8de2a3f (Commercial read 140a). Checker prompt V6 17. This is the tree that would ship. Harness `scripts/report-v13-recheck.ts`: production's own intraday path, the checker that ships (Claude Opus 5.5 high, Tests-TMI key, no fallback). Raw to `raw/`, committed before it is read and sent to Commercial at once.*

**One run, two parts, each under its own stop:** this re-check (15 reports, STOP $4) and the counterparty check (`docs/research/reports/counterparty-check/predictions.md`, report 45 x 5, STOP $2), on the same literal. Combined, at most $6.

**A correction to the plan as relayed:** the v11 re-check's six struck Summaries came from **3** inputs, not 4: 2026-10-02 INTO_RTH (run 3), 2026-10-02 INTO_POWER_HOUR (runs 1 to 3), 2026-10-06 INTO_POWER_HOUR (runs 2 and 3). All three are re-run here, 3 times each.

## Inputs

- **Struck in v11, x3 (9 reports):** 2026-10-02 INTO_RTH, 2026-10-02 INTO_POWER_HOUR, 2026-10-06 INTO_POWER_HOUR (the 10-07 copy).
- **Others, x1 (6 reports), for the plain-words line (Commercial's advice, Integration adopted):** the three live 10-14 inputs (INTO_RTH, INTO_POWER_HOUR, AFTER_HOURS; Ops's slim copy), and the three earlier inputs with the most published lines carrying those words in the v11 raw: 2026-10-06 INTO_RTH (14 lines over 3 runs), 2026-10-05 INTO_RTH (10), 2026-10-06 AFTER_HOURS (4).

**Every measure is on the PUBLISHED report**, the draft beside it.

## The pass rule

**PASS** only when all hold:
1. **On the 9 struck-in-v11 reports: at most 1 published Summary struck**, for any cause.
2. **Across all 15: at most 2 published Summaries struck**, for any cause.
3. **No PUBLISHED Summary names a board name the narrative facts do not name** (v13 line 1): 0 of 15.
4. **The desk's own words in published lines (v13 line 2): 0.** The measure lists every published line or Summary with "the bundle", "bundle", "supplied", "collected sources/evidence/material", "the evidence", "excerpt(s)" or "SEC-only"; each is read by hand, and a hit that is not the desk's word for its material (a company that "supplied" units) is named and not counted. "our evidence" (the approved specimen's, Commercial read 140) is counted apart and is not a fail.
5. **The disclosure is kept (read 140a): by hand,** on every published line whose research unknowns say the search covered filings only ("SEC-only", "filings only", "non-SEC", "no company IR"; 11 such lines in the dry, the harness's FILINGS-ONLY count). The wider set (every line whose unknowns carry any of the desk's words; 127 in the dry) is counted and listed for Commercial's spot read, not read line by line. Where the research says the catalyst search covered filings only and the line speaks to coverage, it says "company filings only" (or the same fact in plain words); no such line states that coverage was complete or drops the limit while naming a finding. Commercial's own read of these lines decides it.
6. **Held from the v11 re-check:** no Summary struck for UNFRAMED_PERCENT; no draft with a report label; no PUBLISHED Summary with a change note plus "when" or a causal join; the count sentence in every unstruck published Summary; at most 1 failed check (MISSED or ERROR).
7. **Commercial's own read** of every published Summary and name line of the 15, as read 135 (d), with the raw sent before Research reads it.

If fewer than 12 of the 15 publish, the result is **NOT DECIDED** and goes to him as such. A PASS ships nothing by itself: the literal ships on his go by sha. His stated preference if (b) falls short (Integration) is to ship anyway; that is his call on the result, not this rule's.

**Reported, not pass conditions:** drafts naming another board name (the writer's behaviour before the checker); drafts with the desk's words; every Summary strike with its reason and detail; first-ranked name in the published Summary; name lines struck; "our evidence" count; the v11 counts on the same inputs beside these.

## The dry (stub models, $0), and what it proves

Each measure saw its planted case: the Summary naming a board name the facts do not (drafts 9 of 9 planted, each struck by the rule as NOT_SELF_CONTAINED, so PUBLISHED 0); the desk's words in a published line (9 planted, 9 counted); "company filings only" (3 planted, 3 counted). Limit: the PUBLISHED other-names count has no published present case, because the rule strikes every planted one first; it uses the same ticker match as the draft count, which did see them.

## Predictions (this seat's, before any call)

1. Struck on the 9 struck-in-v11 reports: **0 to 2** (the 10-02 INTO_RTH misdate was a model error that v13 does not address, about 1 in 3 there).
2. Struck across 15: **0 to 3**.
3. Published Summaries naming another board name: **0**; drafts doing so: **0 to 2**.
4. Published lines with the desk's words, before the hand read: **0 to 4** (v11 on the six "others" inputs: about 16 lines per run of each; the words come from the research's unknowns, which the writer still receives, so a prompt line lowers this but may not end it).
5. Disclosure lines: several (10-14 AFTER_HOURS's SOUL and IACQ, 10-05 INTO_RTH's SAIQ); **most** say "company filings only" or the plain-words equivalent; **none** claims complete coverage.
6. Held rules: as in v11 (0, 0, 0, 0, every unstruck has the count, 0 failed).
7. Spend **$1.90 to $2.60** for the 15 (v11 averaged $0.147 a report); with the counterparty's $0.60 to $0.95, **$2.50 to $3.55** combined.

My honest expectation: rule 3 passes (the struck v11 Summaries were struck, so no published one carried another name; the new line is aimed at the draft). Rule 4 is the one at risk, because the unknowns still reach the writer in the desk's own words.
