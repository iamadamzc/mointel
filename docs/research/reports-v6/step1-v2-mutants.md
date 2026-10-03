# v6 narrative v2, build step 1: mutant predictions (written BEFORE any test ran)

*Research seat `local_ab66f9f3`, 2026-10-03. Code: `lib/desk/reports/narrative.ts` (v2 facts), `pipeline.ts` (passes the checkpoint rows and each dossier's `cycle.historicalResistance`). Tests: `tests/desk/reportNarrative.test.ts`, 6 new tests beside the 4 existing. Each mutant is applied alone, `reportNarrative.test.ts` is run, and the count of failing tests is compared with the prediction. A shortfall means a guard the tests cannot see.*

| # | Mutant (in `narrative.ts`) | Predicted failing tests | Which |
|---|---|---|---|
| M1 | the jump test always true (`jumped = true`) | 2 | split check (NOJUMP, R exactly 2, is left out); recap v2 (SSM, R 1.969, is within 5% of 2 and drops out of the leaders) |
| M2 | the ratio test always false (`nearRatio` returns false) | 1 | split check (REV and FWD counted) |
| M3 | factor evidence = any factor not 1 in the window, instead of two distinct factors | 1 | split check (FACTFAR left out) |
| M4 | `retention > KEPT_HALF` instead of `>=` | 1 | F15 (HALF, exactly 0.5, not kept) |
| M5 | recap leaders not filtered to covered names | 1 | recap v2 (BIG leads). NOT the older-high test: its context becomes BIG, whose older high is absent, so it still reads null |
| M6 | the basis vouch dropped (older high shown unvouched) | 1 | older-high gate (no-bars case shows 19.2) |
| M7 | the "above the session high" filter dropped | 1 | older-high gate (4 shown) |
| M8 | the after-hours pick does not skip names already named | 1 | recap v2 (NXL at 70 picked over AMOD) |
| M9 | the after-hours pick does not require basis CURRENT_SESSION | 1 | recap v2 (PRIOR at 90 picked) |
| M10 | intraday next names by rank instead of by move | 1 | intraday v2 (A, B, C instead of A, C, E) |
| M11 | open supply not de-duplicated | 1 | recap v2 (WARRANTS twice) |

Known weakness, stated before the run: the older-high test's two assertions also pass when `context` is null, so a mutant that drops the context entirely is caught only by the recap v2 test.
