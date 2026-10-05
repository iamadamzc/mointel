# Float, two ways, on 10 stocks: PRE-REGISTERED (written before any code ran or any number was read)

*Research seat `local_ab66f9f3`, 2026-10-05 (UTC). His ruling, typed to Integration 2026-10-04T23:49:48.587Z, verified at his own turn: "1, take 10 stocks and do both a and b and report results." (a) and (b) are the two float options in `docs/research/sheet-reproduction/proposal-2026-10-04.md` section 3. Integration's conditions (its message, same evening): pre-register; per-name report; agreement defined; minimal harness, no production change; the price stated to Integration before the run; Commercial's source allow-list and vendor-aggregator ban for (b); flag (b) above the filed count and (a) below (b). Results go to Integration, then to him.*

## The 10 names, fixed by rule

From the store snapshot `A:/mointel/data/market-prod-2026-10-02.db` (read-only), the most recent trading date whose `NEXT_DAY_RECAP` checkpoint (the 22:00 ET recap) the report reader accepts: `readReportInputs(db, 'PREMARKET', date, { min: 1, max: 20 })` (`lib/desk/reports/pipeline.ts:117`), so the same reader, range, latch rule and 12-name cap the reports use; its names in in-range rank order. A name qualifies when its checkpoint dossier (`analysis_version_id`) carries a `cik`. Take the first 10 qualifying names. If fewer than 10, continue with the previous complete recap checkpoint, skipping names already taken. No name is added or removed by hand. The checkpoint ids and every skipped name with its reason are printed in the raw output.

## Arm (a): the SEC upper bound (no model)

    bound = filed shares outstanding  minus  max( Section 16 direct holdings , large-holder holdings )

- **Denominator:** the latest `dei:EntityCommonStockSharesOutstanding` in SEC `companyfacts` for the CIK, with its date (the cover-page count; the desk's own share count matched SEC's figure 193 of 193 times, `docs/sheet-removal-plan-2026-10-03.md` decision 1(a)). None: the bound is UNKNOWN (no share count).
- **Section 16 holdings:** every Form 3, 4 and 5 (and amendments) in the issuer's EDGAR `submissions` listing, filed within 24 months before the run. Per reporting owner (by owner CIK), the LATEST filing's DIRECT, non-derivative holdings of common stock (`sharesOwnedFollowingTransaction` and holding rows with `directOrIndirect = D`). Indirect holdings are NOT subtracted (two insiders can report the same indirect block; leaving it in can only make the bound higher, the safe direction). Derivatives (options, warrants) are not shares and are not subtracted.
- **Large holders:** 13D and 13G filings in the same listing whose primary document is XML (a structured cover page): per reporting person, the latest aggregate amount beneficially owned. Subtracted when the filing is a 13D, or a 13G showing 10 percent or more of the class. A 13G under 10 percent stays in the float. A cover page that is not XML is NOT parsed and NOT subtracted (logged per filing). **Not assumed:** which form-type names EDGAR uses and whether structured cover pages exist for these issuers. A dry run (SEC listings only, no model) prints every 13D/13G form type and primary-document name found for the 10 names before the parse is written against them; if no structured cover page exists, this family is empty and the result says so.
- **The two families are never summed.** The bound subtracts the LARGER of the two totals, so one holder appearing in a Form 4 and a 13D (under the same or a different CIK) is never counted twice. Looser, still a true upper bound.
- **Basis:** a holding is subtracted only when the snapshot's `daily_bars` for the ticker PROVE one split basis from the holding's filing date to the share count's date: bars exist on or before the holding's date and every bar in that span carries the same `split_factor`. A factor change in the span (a split between them), or bars that do not reach back to the holding's date (basis unproven), means the holding is NOT subtracted (logged with the reason). A pre-split holding subtracted from a post-split count is the one way this bound goes too low, so an unproven basis is treated as that case. *(Added before any code ran or any number was read, on writing the harness.)*
- **Reported per name:** the denominator and its date; every holding considered (owner, owner CIK, form, accession, filing date, shares, subtracted yes/no and why); the two family totals; the bound; whether the bound is under the desk's low-float line (10,000,000, `LOW_FLOAT_CEILING`, `lib/research/float.ts:443`).

### Fitted after the list run (raw `019f6d30`; element names read, no amount read), before the full run

- **What exists:** for all 10 names the large-holder filings are `SCHEDULE 13D`, `SCHEDULE 13D/A`, `SCHEDULE 13G`, `SCHEDULE 13G/A`, every one with a structured `primary_doc.xml` (two schema versions, `X01` and `X02`, with the same element names for the fields used). No legacy text cover page in the 24-month window.
- **Fields:** 13D: each `reportingPersonInfo` gives `reportingPersonName`, `aggregateAmountOwned`, `percentOfClass`. 13G: each `coverPageHeaderReportingPersonDetails` gives `reportingPersonName`, `reportingPersonBeneficiallyOwnedAggregateNumberOfShares`, `classPercent`. The filer is `filerCredentials/cik`.
- **Joint filings are not summed:** members of a group each report the group's aggregate, so a filing's amount is the LARGEST of its reporting persons', never their sum. Filings that share a reporting person's name (normalised) are one group; per group, the latest filing's amount is used (an amendment supersedes, including down to zero). A 13G group is subtracted only when its latest `classPercent` is 10 or more. Groups are then summed across the issuer: two unrelated groups that never name each other are counted separately, which is the one residual double-count path, and it is listed per name for a by-hand read.
- **Basis** applies to large holdings exactly as to Section 16 holdings.

## Arm (b): the model-researched float

- One call per name to `gpt-5.6-terra` (the desk's research model) through the OpenAI Responses API, raw HTTP, with the `web_search` tool and an **allow-list of domains**: `sec.gov` and the five newswires the desk already classifies (`prnewswire.com`, `globenewswire.com`, `accesswire.com`, `businesswire.com`, `newsfilecorp.com`). Company investor sites cannot be listed in advance and are therefore not reachable; vendor float aggregators are excluded by the allow-list itself, and the prompt also names the ban (stockanalysis.com and every float or screener page).
- The model returns JSON: the float in shares or null; a state, PRODUCED or UNKNOWN; the source URL and title it took the number from; the as-of date; HOW the number was obtained (stated in the source as a share count, or computed, with the arithmetic); and a reason when UNKNOWN. The prompt says: never estimate without a source, never use market cap, UNKNOWN is a correct answer.
- **Reported per name:** everything returned, plus the call's input, cached and output tokens and its web-search call count.

## Columns beside both arms

- **Filed share count**, the arm (a) denominator (the same number in both columns, so every flag reads against one denominator).
- **The Sheet's float, where one exists**, as a reference column only, read once at run time through the desk's own Sheet provider, read-only; blank when the Sheet has no row for the name.

## What counts as agreement, and the flags

Per name, exactly one of:

| Verdict | Meaning |
|---|---|
| CONSISTENT | both produced, and (b) <= (a) <= filed count. The true float is at most (a), so a sound (b) must sit at or under it |
| A_BELOW_B | both produced, (a) < (b): one of them is wrong; listed for a by-hand read of which |
| B_ABOVE_FILED | (b) > the filed count: impossible for a float; (b) is wrong |
| ONLY_A / ONLY_B / NEITHER | one or both returned UNKNOWN |

Also reported, not as pass or fail: for CONSISTENT names, (b) / (a); for each arm, how many of 10 it produced and how many fall under 10,000,000; for (a), how much of the subtraction came from each family.

**No pass line.** This is ten names: it shows how each arm behaves and fails, not a rate. It is reported as counts with every row listed.

## Price, stated before the run (to Integration)

- (a): SEC only, no cost.
- (b): web search is **$10.00 per 1,000 calls plus search content tokens billed at model rates** (developers.openai.com/api/docs/pricing, read 2026-10-04, no login). Terra: $2.00 per million input, $12.00 per million output (rate card). Planned at up to 60,000 input tokens, 4,000 output tokens and 8 searches per name: up to about $0.25 per name, **about $2.50 for the 10**. The harness prices each call from its own usage as it runs and **stops before any call that could take the total past $5.00**.

## Discipline

- The harness is committed before it runs; its raw output is committed before it is read.
- The run waits for Ops's slot, and (b) waits for Integration's acknowledgment of the price.
- Read-only on the snapshot; nothing in production changes; no package is installed.
