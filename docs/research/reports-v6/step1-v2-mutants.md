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

## Result (runner `cf74003f`, raw `eafe0608`, read after its commit)

**11 of 11 killed, every count as predicted** (M1: 2, all others: 1, the same tests named above). Source restored (`restored: true`). Control M0 (no edit): 0 failed.

**One miscount of mine, in this doc's header and the runner's comment:** the file holds **9** tests (4 existing + **5** new), not 10 (4 + 6). The control read 9; the predictions are per mutant and unaffected.

Gate in Ops's slot (2026-10-03): `tsc --noEmit` 0; `eslint` on the 5 changed files 0; `vitest tests/desk/` 29 files, 404 passed.

## Fix round: F12b in three states (Integration's review, 2026-10-04), predictions written BEFORE the run

**Defect (Integration's catch):** `moversWithoutFresh` counted every covered mover whose status was not FRESH_FOUND, so a mover with NO dossier (not yet researched) counted as "no fresh news found". Fixed: no fresh = `NONE_FOUND` or `SECONDARY_STALE`; plus `moversNotResearched` (no dossier) and `moversUnclear` (`CONFLICTING`, `UNKNOWN`). The recap v2 fixture gains NEW (covered mover, no dossier) and UNC (covered mover, UNKNOWN). File now 9 tests (unchanged count).

| # | Mutant | Predicted failing tests | Which |
|---|---|---|---|
| M12 | F12b back to "status is not FRESH_FOUND" | 1 | recap v2 (moversWithoutFresh 3, not 1) |
| M13 | `moversNotResearched` reads 0 | 1 | recap v2 |
| M14 | UNCLEAR set empty | 1 | recap v2 |

M1 to M11 are re-run unchanged; each prediction above stands (the new fixture rows sit below the leaders, are not split candidates, and are not after-hours gainers).

**Result (raw `0c8b8035`, read after its commit): 14 of 14 killed, every count as predicted** (M1: 2; M2 to M14: 1 each). Control M0: 9 tests, 0 failed. Source restored. Gate at `25c366e2` in Ops's slot 2026-10-04: `tsc` 0; `eslint` 0 on 4 files; `vitest tests/desk/` 403 of 404, **the one failure is `releaseRetention.test.ts` "refuses every weekday start that would run inside 07:00-10:00 ET"**, Ops's deploy-preflight test: it imports nothing from `lib/` (it execs the preflight script), the diff `e3e83fee..25c366e2` touches only the narrative files, and the same file passed in the 2026-10-03 run. Failed twice on 2026-10-04 (in the suite, and alone). Cause not measured; reported to Ops. **Measured by Ops (2026-10-04):** this branch predates `f869ee0d` (origin/main, 2026-09-28), which cut the test from 7 sampled minutes to 3; the 7-minute copy runs about 25 s solo against a 30 s budget, and the PC was at 88-93% CPU. Load, not a defect. Cherry-picked as `0c0c2ff4`.

Known weakness, stated before the run: the older-high test's two assertions also pass when `context` is null, so a mutant that drops the context entirely is caught only by the recap v2 test.
