# Citation residual: count RESULT, as registered (`5441204f`)

*Seat `local_5f4bfcf8`, 2026-10-01. Script `count.ts`, raw `count-raw.json`, local copy `data/market-prod-2026-09-29.db` (2,495 versions, 1,122 current), run 1.6 s, read-only.*

**Controls:**
- The fixture control passed.
- The copy holds **221** four-digit occurrences in CURRENT versions, more than 0, so the count could see a present case.

**What the shipped cut leaves, CURRENT versions: 294 occurrences in 66 versions** (all versions: 1,297 in 220). They are 3 or 4 digits only (73 and 221); none have 1 or 2.

| Class | Occurrences | Of which year-like (1900 to 2099) |
|---|---|---|
| M: in the version's own `source_ids` | 289 | 17 |
| T: another `research_sources` id of the same ticker | 5 | 0 |
| S: another ticker's source id | 0 | 0 |
| N: not a source id at all | 0 | 0 |

**Decision rules, as registered:**
1. **ADOPTED.** M covers **272 of 277** non-year occurrences (98.2%; the bar was 90%). The rule: strip a lone 1-to-4-digit bracket whose value is in the version's own cited ids.
2. **NOT WIDENED.** T is 5 of 277 (1.8%; the bar was 10%). Those 5 stay visible after the rule:
   - WFF `[1002]`, `[998]`
   - DUOT `[1172]`
   - CAST `[3909]`
   - EHGO `[9957]`
3. **All 17 year-like M occurrences were read by hand. Every one is a citation, not a year.** Each sits after a sentence stop, e.g.:
   - VOGX "...equivalent to outstanding shares or float. [1918]"
   - BLND "...must not be treated as float. [2040]"
   - GRAN "...and is not a current float figure. [2007]"
   - TDTH "...or adjusted share amount. [1902]"

   Full list in `count-raw.json` (`handRead.MY`). These become test cases.
4. **N with a year-like value: 0.** No real bracketed year exists in the current text, so the rule eats none.
5. **`businessDescription`: 0 occurrences**, so the report company line (`companyText`, no ids) keeps today's pattern. No change is needed there.

**Fields:** the occurrences sit in structure warnings (96), supply terms (40), reverse-split history (23), eligibility (21), cycle warnings (18), and catalyst text (28 across summary, why-traders-care and unknowns), among others. All of them are in the dossier, which reaches the board's research panel.

## The build, checked

**Where it lives:** `lib/research/citations.ts`.
- `withoutCitations(text, citedIds?)` removes a lone short bracket only when it holds a cited id.
- `withoutCitationsDeep` collects the value's own `evidenceSourceIds` (`citedSourceIds`).
- **No call site changes.** The write (`guardrails.ts:262`) and the board's dossier (`merge.ts:322` on the cut) already pass the whole dossier. The report company line passes plain text and keeps today's behaviour.

**Tests and mutants:** 22 tests in `tests/research/citations.test.ts`, including both of Integration's controls. Five mutants, each killed exactly the number of tests predicted:

| Mutant | Predicted | Killed |
|---|---|---|
| Ignore membership | 2 | 2 |
| No ids collected | 1 | 1 |
| Nested ids not collected | 2 | 2 |
| Stops dropped | 3 | 3 |
| String vs number lookup | 3 | 3 |

**On the copy** (`verify.ts`):
- The collected ids equal the stored `source_ids` on **2,495 of 2,495** versions.
- After the rule, current versions keep **5** lone short brackets, exactly the T class predicted (WFF 2, DUOT, CAST, EHGO); all versions keep 19, which is T's total.

**Gate** (Ops's slot, about 14:37Z): `tsc` 0, full suite 213 of 213 files, 3,194 tests.

**Production re-count** (Ops `b2fc64b6`, 14:41Z, the same `verify.ts`):
- Ids equal on **2,707 of 2,707** versions.
- Current versions: **293 in 66 versions before, 6 after** (the local 5, plus RPGL v2694, newer than the copy).

**What this does not show:** production may differ from the 09-29 copy. Ops re-counts on production, on the built rule, before it ships.
