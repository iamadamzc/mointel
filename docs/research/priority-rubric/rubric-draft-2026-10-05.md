# Priority rubric: DRAFT for Marketing's words and his one approval (nothing built, nothing shipped)

*Research-tmi `local_f6ef479a`, 2026-10-05. His rulings, verified in the proposal addendum: Priority is computed from the five criteria in his recap prompt ("2, a.", 2026-10-04T23:49:48.587Z); shown as a badge on the ticker with a tooltip (2026-10-05T00:00:00.915Z); the lowest grade displays as "D" over a stored AVOID (Integration's option a); he approves the rubric once. Inputs read: the recap prompt's grade definitions (`docs/After-Hours Momentum Recap.md`, lines 20 to 24), `lib/research/interpret/catalystGrades.ts`, the checkpoint row (`desk_assessment_tickers`, `db.ts:621-677`), Commercial's wording conditions (claims read, sections 1 and 4). Simulation: `simulate.cjs` and `simulate-out-2026-10-05.json`, read-only, on the local scratch copy of the store (719 in-range rows on the 31 completed recap checkpoints, 2026-08-17 to 2026-10-01); $0.*

**Every threshold below is a product choice, not a finding.** The recap prompt names the five criteria and gives no numbers. Where a number appears I give the stored distribution beside it so the cut can be seen, and I say what I would move.

## 1. The five readings, from values stored on the checkpoint row

Each reads STRONG, LIMITED, RISK, UNKNOWN (the desk looked and could not tell) or NOT_YET (no research row at that checkpoint). Rule of the house: a missing input is UNKNOWN or NOT_YET, never a default.

| Criterion | Stored input | STRONG | LIMITED | RISK |
|---|---|---|---|---|
| **Structure** (the cycle) | `cycle` | GREEN_FRESH_FRONTSIDE | YELLOW_FRONTSIDE_WARNING | RED_BACKSIDE |
| **Catalyst** | `catalyst` (the grade) | STRONG, LEGITIMATE_POSITIVE | MODERATE_MIXED_SECONDARY, NONE | WEAK_NEGATIVE_DILUTIVE |
| **Volume** | `rvol` | at least 10 | 2 up to 10 | under 2 |
| **Liquidity** | `spread_pct`, `volume` x `price` | spread at most 1 percent AND dollar volume at least $5M | in between | spread over 5 percent OR dollar volume under $0.5M |
| **Tradable supply** | `structure` (the label), later the float bound | CLEAN, with the float bound at or under 10M (needs the bound; none exists yet) | CAUTION, or CLEAN without a bound at or under 10M | DIRTY_FLOAT |

UNKNOWN: the stored value is UNKNOWN, or (volume, liquidity) the input is null. NOT_YET: the column is null because no dossier existed at the checkpoint. Structure reads the cycle only and Tradable supply reads the structure label only, so DIRTY_FLOAT is counted once, not twice.

Where the cut sits, on the 719 rows: `rvol` p10 2.0, p25 3.2, p50 11.4, p75 73, p90 302; `spread_pct` (507 rows have one) p10 0.40, p25 0.72, p50 1.57, p75 4.2, p90 8.3; day dollar volume p10 $0.51M, p25 $2.0M, p50 $9.7M, p75 $47.8M, p90 $173M.

## 2. The grade from the five readings

Read top to bottom; the first that applies:

1. **Fewer than three criteria readable** (STRONG, LIMITED or RISK): stored UNKNOWN, no letter. A grade built on two criteria would be a guess.
2. **Liquidity RISK or Tradable supply RISK:** AVOID, displayed D. These are the two the recap prompt names for it ("structural, liquidity, or supply risk").
3. **Structure RISK (the cycle is a backside):** C. The recap prompt's C is "BACKSIDE / OPPORTUNISTIC".
4. **All five readable, Structure STRONG, Catalyst STRONG, Volume STRONG, Liquidity STRONG, Tradable supply not UNKNOWN:** A.
5. **Otherwise:** B. A RISK on Catalyst or Volume alone lands here, as "meaningful limitations", not AVOID.

Stored as the existing PriorityBucket enum (`A`, `B`, `C`, `AVOID`) plus UNKNOWN and NOT_YET. The five readings are stored WITH the grade on the checkpoint row (`desk_assessment_tickers`), frozen with it, so the tooltip never recomputes. Time in the tooltip is the checkpoint's stored `completed_at` in ET.

## 3. What the simulation shows (719 rows; a draft's rules on history, not a test of the grades)

| | Rows | Share |
|---|---|---|
| A | 5 | 0.7 percent |
| B | 293 | 40.8 percent |
| C | 9 | 1.3 percent |
| AVOID (D) | 199 | 27.7 percent |
| UNKNOWN (fewer than three readable) | 213 | 29.6 percent |

Readings by criterion (STRONG / LIMITED / RISK / UNKNOWN / NOT_YET): Structure 29 / 107 / 17 / 419 / 147; Catalyst 104 / 292 / 64 / 112 / 147; Volume 380 / 266 / 73 / 0 / 0; Liquidity 158 / 235 / 114 / 212 / 0; Tradable supply 0 / 332 / 123 / 117 / 147.

Three things this says that he should see before approving:

1. **A almost never occurs under these rules (5 of 719), and the cause is inputs, not thresholds.** Tradable supply cannot read STRONG at all: no stored row has structure CLEAN (CAUTION 332, DIRTY_FLOAT 123, UNKNOWN 117, the other 147 null), and the float bound that would let it read STRONG does not exist yet. And the cycle reads UNKNOWN on 419 of the 572 rows that have a dossier (73 percent), so Structure cannot discriminate either. Loosening A to "no RISK anywhere and Catalyst and Volume STRONG" is the lever; I have not simulated it.
2. **Nearly a third of rows get no letter** (213), mostly the 147 with no dossier at that checkpoint plus rows where cycle and structure are both unknown. That is the honest face of coverage, and it means the badge will often read "not graded" on the leaders until research reaches them.
3. **AVOID is more than a quarter of rows (199),** driven by Liquidity RISK (114) and Tradable supply RISK (123, every DIRTY_FLOAT). This is the rule the recap prompt states, so I applied it; the share is large because DIRTY_FLOAT is common (123 of 572 researched rows, 22 percent).

## 4. Decisions for him (the rubric is his to approve once)

1. **Does the cycle belong in "Structure"?** The recap prompt's priorities name "structure" and separately classify FRESH / FRONTSIDE / BACKSIDE. I read Structure as the cycle. If he means the share-structure label, Structure and Tradable supply collapse into one criterion and the cycle goes straight to C.
2. **How hard should A be?** Draft: all five readable and the four named STRONG. Alternative: A needs only Catalyst and Volume STRONG with no RISK anywhere and at least four readable. The draft yields 5 A names across 31 checkpoints (about one every six checkpoints); the alternative yields more and is not simulated.
3. **The thresholds in section 1** (rvol 10 and 2, spread 1 and 5 percent, dollar volume $5M and $0.5M). Moving a cut moves the shares in section 3; the quantiles above are the guide.
4. **Does catalyst age count?** The draft grades the KIND of catalyst only (his 09-29 grade definitions say age is arithmetic). If a STALE catalyst should cap Catalyst at LIMITED, that is a one-line addition using the freshness bands; not in the draft.
5. **AVOID on a Liquidity or Supply RISK alone,** as the recap prompt reads, or only when both conditions hold. The draft follows the prompt.

## 5. Wording constraints carried (Commercial), for Marketing

The grade is the desk's READING of the five criteria at the checkpoint, the same for every reader, with no forward tense and never "opportunity", "pick" or "signal"; the lowest grade names what is wrong ("risk outweighs the setup"), never an imperative; one standing legend sentence, with the rubric published. **The legend's "not tested against outcomes" is a factual claim that expires the day any test of the grades runs; whoever runs one changes the sentence in the same commit.** This simulation applies the rules to history and measures no outcome, so it does not trigger the expiry.

## 6. What this draft does not do

It does not read any outcome. It does not use the float bound (it does not exist yet; Tradable supply gains a STRONG reading when it ships). It stores nothing and changes no surface. Overhang / Float and the Warning Shot are separate rows of the field contract.
