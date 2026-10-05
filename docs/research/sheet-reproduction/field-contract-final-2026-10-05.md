# Field contract for the Sheet reproduction: FINAL for the Priority badge (S3) and the float cell; row status for the rest

*Research-tmi `local_f6ef479a`, 2026-10-05. Supersedes proposal section 5 (`proposal-2026-10-04.md`) where this file differs. His rulings, verified at his own turn (transcript 125cfd6b, origin human, 2026-10-05T21:22:37.844Z): "90 days, approve the badge draft, yes hand off". What each clause authorises is read from the question Integration put to him in the block just before it: the float maximum count age is **90 days**, with the date on the cell; and the Priority badge rules are approved **as drafted** (`priority-rubric/rubric-draft-2026-10-05.md`, rules 0 to 5, its section 1 thresholds, catalyst KIND only, AVOID on a liquidity or supply risk alone). Earlier rulings are in the proposal addendum. Design builds the surfaces from this file; Marketing owns every display word; Commercial passes claims.*

## 1. Unchanged from the proposal

Three states on every reproduced field (PRODUCED, UNKNOWN with a reason, NOT_YET: no row or no `producedAt`), explicit and never null; one `producedAt` per row, the older of its parts; stored values stay the desk's enums and Marketing's words are display only.

## 2. The Priority badge (S3): the interface

**Computed once, at the checkpoint, stored on the checkpoint row, never recomputed by a reader.** The grade and the five readings it came from are written with the row (`desk_assessment_tickers`) and frozen with it. Design reads these columns and does not apply any threshold itself.

| Column (new, `desk_assessment_tickers`) | Values | Meaning |
|---|---|---|
| `priority_grade` | `A`, `B`, `C`, `AVOID`, `UNKNOWN`, `NOT_YET` | the grade, or why there is none |
| `priority_basis` | JSON object of five keys, `structure`, `catalyst`, `volume`, `liquidity`, `supply`, each `STRONG`, `LIMITED`, `RISK`, `UNKNOWN` or `NOT_YET` | the five readings the grade rests on; the tooltip's slots ("strongest on", "risk outweighs the setup") read from it |
| `priority_rule` | text, now `rubric-2026-10-05` | which rule set produced it; the legend and any later outcome test cite it |

**Display (Marketing's words, `docs/marketing/setup-grade-words-draft.md`, Commercial-passed):** stored `AVOID` shows as "D"; `UNKNOWN` shows as the "Not graded" state; `NOT_YET` shows as the dash state. The tooltip's time is the parent checkpoint's stored `completed_at`, in ET. Rows written before this ships have the three columns null and read as `NOT_YET`.

**The rule (approved; verbatim logic of the rubric, rules in order, first that applies):**

0. no dossier at the checkpoint (`analysis_version_id` null): `NOT_YET`;
1. fewer than three of the five readings are STRONG, LIMITED or RISK: `UNKNOWN`;
2. liquidity RISK or supply RISK: `AVOID`;
3. structure RISK: `C`;
4. all five readable, structure STRONG, catalyst STRONG, volume STRONG, liquidity STRONG, supply not UNKNOWN: `A`;
5. otherwise `B`.

**The five readings, from stored checkpoint values:**

| Criterion | Input | STRONG | LIMITED | RISK |
|---|---|---|---|---|
| structure | `cycle` | GREEN_FRESH_FRONTSIDE | YELLOW_FRONTSIDE_WARNING | RED_BACKSIDE |
| catalyst | `catalyst` (grade) | STRONG, LEGITIMATE_POSITIVE | MODERATE_MIXED_SECONDARY, NONE | WEAK_NEGATIVE_DILUTIVE |
| volume | `rvol` | at least 10 | 2 up to 10 | under 2 |
| liquidity | `spread_pct`; `volume` x `price` | spread at most 1 percent AND dollar volume at least $5M | in between | spread over 5 percent OR dollar volume under $0.5M |
| supply | `structure` (label); later the float bound | CLEAN with a PRODUCED float bound at or under 10M (the bound does not ship yet) | CAUTION, or CLEAN without such a bound | DIRTY_FLOAT |

UNKNOWN: the stored value is UNKNOWN, or (volume, liquidity) the input is null. NOT_YET: a dossier-derived column is null. Structure reads the cycle only, supply reads the structure label only (DIRTY_FLOAT is counted once).

**Known limits, which Design should not paper over:** the stored `cycle` is the MODEL's classification, which reads UNKNOWN on 73 percent of researched rows (the board's live computed cycle is a different, better input; storing it is not ruled and not in this contract), and no stored row has structure CLEAN, so supply cannot read STRONG until the float bound ships. On 719 stored rows the rules gave A 5, B 293, C 9, AVOID 199, NOT_YET 147, UNKNOWN 66 (`priority-rubric/simulate-out-2026-10-05.json`). The badge will show "Not graded" or the dash often, and A rarely.

**Who builds what:** Research writes the pure function `priorityGrade(row, dossier)` (new, `lib/research/`) and its tests; the checkpoint writer (`worker/desk-assessments.ts`, Ops/assess) calls it and stores the three columns, with a schema version bump; Design builds the badge and tooltip from the stored columns. **Not built yet:** the function, the columns, the writer call, the badge.

## 3. The float cell: the interface

The state and the reason come from `floatCell` (`lib/research/insiderBound.ts`, on main, tested). Contract: `float-contract/contract-2026-10-05.md`, with these changes by his ruling:

- **Maximum count age is 90 days** (was 45), enforced as a state: an older count is `CANNOT_VERIFY`, reason `COUNT_TOO_OLD`. The count's as-of date is now shown ON THE CELL FACE (Commercial 5i, `b757236d`), and wherever the number appears without a popover it carries "as of {date}" inline.
- **The split proof is changing** (R1: tolerate a missing price bar on the checkpoint day itself, price-guarded). It is a rule change registered before it is built (`float-contract/split-proof-r1-registration-2026-10-05.md`); the faces and states do not change.
- Faces and reasons as in the float contract: "≤ X" / "Unknown" / "Cannot verify" / "not researched yet", eight stored reasons, one meaning each; Marketing words each. Nothing may say the column is populated or the number verified; the validation says the arithmetic passed an audit (zero dangerous failures in 50 holdings), not that the issuance flags or the split proof are complete.

## 4. The 25 rows of proposal section 5: status

| # | Field | Status |
|---|---|---|
| 1 | Ticker list | CHANGED: no second table (his ruling); only a worker input (the market worker's pins), never rendered |
| 2 | Priority | FINAL: section 2 |
| 3 | Revised Priority | FINAL: the same rubric at the 09:25 checkpoint; "revised" when it differs from the evening grade, derived by the reader from the two stored grades |
| 4, 5 | Country, company; prices and volumes | FINAL: mapping unchanged |
| 6, 7 | Float; its source date | FINAL as to states and faces (section 3); the value awaits the build; date on the cell face at 90 days |
| 8, 9 | Shares outstanding; Float Quality | FINAL: mapping unchanged (Float Quality is `structureClassification`) |
| 10 | Overhang / Float | MOVING: computed against the float bound, so it exists only where the bound is PRODUCED; a lower bound on the ratio; not specified further, not in S3 |
| 11 to 19 | Supply evidence, catalyst, cycle, runs, splits, levels, structure, flags | FINAL: mapping unchanged (read from the dossier and the checkpoint) |
| 20 | Warning Shot | NOT DESIGNED: a new model schema field, priced at about $2 to $10 a month; not started; not in S3 |
| 21 | PM catalyst / update | FINAL: mapping unchanged |
| 22 | Confirmation | NOT SPECIFIED: the proposal says "small"; I have not specified it; not in S3 |
| 23, 24 | Notes; report date (`producedAt`) | FINAL |
| 25 | Sheet sync meta | removed (plan step 3) |

## 5. What Design can build now, and what waits

**Now:** the badge and tooltip from the section 2 columns (against fixtures until the columns ship); the float cell faces and popover from the `floatCell` states. **Waits:** real values in both (the function, the columns, the float build), and rows 10, 20 and 22.
