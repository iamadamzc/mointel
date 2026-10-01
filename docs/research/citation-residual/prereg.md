# Citation residual: PRE-REGISTERED count, committed BEFORE it runs

*Seat `local_5f4bfcf8` (Research-tmi), 2026-10-01. Owner by his "a, keep the seat"; order call Integration `313a2485`. The cut `2a625a5b` ships tonight as gated; this is the follow-up, which ships after tonight.*

## The residual, from code

`lib/research/citations.ts:20-22` and `:37-38`: the pattern KEEPS a bracket holding one bare number of 1 to 4 digits ("[2026]", "[4460]", "[1]"). Ops counted 4-digit ones in production (`6a6d6a8a`): 65 of 1,178 current versions, 303 occurrences, 59 versions with a value outside 1900 to 2099. **This count covers 1 to 4 digits**, because the pattern keeps all of them.

## What a membership rule can see, from code

- A version's `research_analysis_versions.source_ids` is the union of its blocks' `evidenceSourceIds` (`pipeline.ts:384-391`).
- The ticker's `research_sources` rows are every source the desk holds for it, a wider set than the ones cited.
- Of the three strip sites, two receive the whole dossier: the write, `guardrails.ts:262`, and the board's dossier, `merge.ts:322` on the cut. **The report company line** (`sessionReports.ts:136`, `companyText`) receives name, country and business text only, with no ids.

## The count

**Data:** local read-only copy `data/market-prod-2026-09-29.db`; every `research_analysis_versions` row; CURRENT = `research_dossiers.current_version_id`.

**Token:** every match of `\[(\d{1,4})\]` in any string inside the stored dossier JSON (keys and non-strings ignored), after the CURRENT pattern has run, so only what the shipped cut leaves.

**Each occurrence goes in exactly one class:**
- **M:** the value is in that version's `source_ids`.
- **T:** not M, but the value is a `research_sources.id` with the same ticker.
- **S:** neither M nor T, but the value is some `research_sources.id` (another ticker's).
- **N:** none of the above.

Each class is split further by **Y**, a value from 1900 to 2099, and reported by field and by digit count.

**Positive control, so a broken instrument cannot read as "nothing to do":**
- The same code, run on fixture strings, classifies `[2833]` with `source_ids [2833]` as M, `[2026]` with `source_ids []` as N and Y, and `[115982]` as removed already (not counted).
- On the copy, the count of 4-digit occurrences in CURRENT versions must be greater than 0. If it is 0, the result is UNTESTED, not "clean".

## Decision rules, fixed now

1. **The proposed rule R is "strip a lone 1-to-4-digit bracket when its value is in the version's own `source_ids`".** It is adopted for the two dossier sites if M covers at least 90% of the non-Y occurrences in CURRENT versions.
2. If T holds 10% or more of the non-Y occurrences, the rule widens to the ticker's `research_sources` ids. That needs a read per version, and its cost is stated.
3. **The Y occurrences in M** (a year-like value that is a cited id) are listed in full with 40 characters of context each and read by hand: id or year. Each one becomes a test case.
4. **The Y occurrences in N** are expected to be real years or footnotes. They are listed and read by hand; R keeps them.
5. **The report company line** has no ids. Its rule is decided from the `businessDescription` field's own occurrences: if it has none in CURRENT versions, the company line keeps today's pattern. Otherwise the choice between passing ids into the company line and a year-range fallback goes to Integration with the count.

## What this does not show

Production may differ from the 09-29 copy. Ops's production count is the reference for size, and this count is for classes. A rule passed on the copy is re-counted by Ops on production before it ships.
