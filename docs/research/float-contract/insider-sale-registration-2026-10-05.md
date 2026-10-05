# Insider sales after the count, and row reuse: REGISTRATION before the build (a rule change to the float contract)

*Research-tmi `local_dd23765d`, 2026-10-05. Written before any code for it and before the measurement in section 4 runs. Raised by Commercial 5k (`e0139dea`, read in full) and Integration 27th's conditions on option B (`36f8ea55`, his seat's ruling, not the owner's). $0.*

## 1. The defect, confirmed in the code

The contract (section 2) subtracts, per owner, "the holding with the latest as-of date that is at or before the count's as-of date". `holdingsAsOf` (`lib/research/insiderBound.ts:110`) does exactly that: every row dated after the cutoff is skipped. So an insider who SOLD after the count date is still subtracted at the larger count-date holding. The sold shares are now in public hands, the true float at the checkpoint is larger than the stored bound, and the cell's "at most" is false. This holds for every row, fresh or reused. The validation (`result-fresh-2026-10-05.md`) audited the arithmetic and the alignment to the count's date; it could not see this, and its pass says nothing about it.

**Two sentences of my own build plan (`09d262b9`, section 3) were wrong, as Commercial found:** "a later count is not seen: the older one ages out" (a later count with MORE shares means issuance since, and the stored bound is too LOW), and "a late Form 4 is not seen: the bound stays higher" (an unseen Form 4 reporting a disposition dated on or before the count means the subtracted holding is too LARGE, and the bound too LOW). Both are struck there.

## 2. The rule, frozen: S1, per owner and class, the SMALLER of the two holdings

D is the date the cell is computed for (section 3). Per owner and per class of direct common or ordinary shares:

- `h0`: the latest row dated on or before the count's as-of date (today's rule, `holdingsAsOf(filings, countAsOf, windowStart)`);
- `hD`: the latest row dated on or before D (`holdingsAsOf(filings, D, windowStart)`), over the filings filed on or before D;
- **subtract `min(h0, hD)`**, summed over the owner's classes; an owner or class with no `h0` is not subtracted (unchanged).

**Why it is an upper bound, when no shares were issued since the count** (the case the issuance flag exists for, and whose miss rate is still unmeasured): write the float at D as the count at D minus the insiders' holdings at D. With no issuance, the count at D is at most the stored count. A sale since the count makes `hD` smaller than `h0`, and S1 subtracts `hD`, the shares the insider still holds. A purchase or a grant makes `hD` larger, and S1 subtracts `h0`, which is no more than the insider holds. In every case the subtracted amount is at most what the insider holds at D, so the stored count minus it is at least the float at D. I have argued this, not tested it; the tests in section 5 pin each case.

**S0, the alternative Commercial named:** an owner with any row dated after the count's as-of date, on or before D, is not subtracted at all. Also safe, simpler, and gives up the holding of every insider who traded since the count, including buyers. The measurement reports both. **I recommend S1**; the choice of contract text is Integration's and Commercial's, and the face wording is Marketing's (a change to the approved float wording reaches him as one line before it ships, Integration's note).

**What neither can see, stated for the page:** a sale not yet FILED by D. A Form 4 is due shortly after the transaction (the Section 16 deadline, which I have not opened for this note, so no number of days is stated here), and some are filed late. So "no sale by a subtracted insider since the count" can only mean "no sale FILED by the date the filings were read".

## 3. Reuse (Integration's option B) and its two conditions

- **D is the checkpoint's date, fixed when the checkpoint is written** (Commercial 5k item 1, which is the contract's own rule): a stored report or export carries its own D; the live board's D is the trading date it shows, and Design and Marketing say "the date shown" if that is not a checkpoint.
- **Condition 1 (Integration): sales filed after the fetch.** The reader cannot fetch, so a reused row has read the filings only up to its own date. S1 at D therefore uses the filings read by the fetch date, and a sale filed between the fetch and D is not seen. That exposure is bounded only by condition 2.
- **Condition 2: a maximum reuse span, frozen here as 4 calendar days** between the row's fetch date and D. It covers a Friday-evening read for a Tuesday after a Monday holiday and nothing longer. Past it the reader does NOT reuse the row, and the cell reads **CANNOT_VERIFY with a new stored reason `FILINGS_NOT_REREAD`** ("the filings were last read on {date}"), never NOT_YET, because "not researched yet" would be false of a name the desk read last week. The new reason needs Marketing's words and Commercial's pass; until it has them the reader is not built.
- **The popover carries "Filings read on {fetch date}"** (Commercial 5k item 3), so a reused row cannot read as fresh.
- **The count is re-checked against reuse the same way:** a later 10-Q filed between the fetch and D is not seen; the 4-day span bounds that too, and the page's sentence about issuance already carries it.

## 4. The measurement, $0, before the build (committed raw only, no fetch)

Both committed validation draws (`validation-out-2026-10-05/names/` and `validation-out-fresh-2026-10-05/names/`) store every fetched Form 3/4/5 with all its parsed rows, through each name's checkpoint date. A script, committed before it runs, recomputes on each draw with D = the draw's checkpoint date, the R1 split proof read from the scratch store as in `state-table-r1.ts`, at 90 days, both issuance rules:

1. **How often it bites:** subtracted owners (today's rule) with a row dated after the count and on or before D; of those, how many show a SALE (`hD < h0`), and the shares involved.
2. **The state table** (PRODUCED, each refusal reason, UNKNOWN) under today's rule, S1 and S0; the PRODUCED counts are the coverage cost.
3. **The bound moves only up:** for every name, the bound under S1 is at least today's, and under S0 at least S1's. A single violation stops the report and is a defect.
4. **Controls, run first; the report is not read if either fails:** (i) a planted sale (a copy of one real subtracted owner with a later row at half the shares) must lower that owner's subtraction to the half under S1 and to zero under S0; (ii) a planted purchase (a later row at twice the shares) must leave S1's subtraction at the original and take S0's to zero.

**Amendment 1 (2026-10-05, written with the script, before any run):** a reproduction check: TODAY's subtraction rebuilt one class at a time must equal the raw file's recorded holdings, owner by owner, on every counted name, or nothing is written. It proves the class-by-class rebuild that S1 and S0 use is the same `holdingsAsOf` the validation ran, so a difference between the rules cannot come from the rebuild.

Raw output is committed before it is read. Nothing in this changes a face or a stored reason except `FILINGS_NOT_REREAD`, which waits as above.

## 5. The build, after the measurement and the contract text are settled

`holdingsAtBoth` (pure, `insiderBound.ts`): per owner and class, `h0` and `hD` with the rule's choice; the float job stores both holdings per owner so a reused row can be recomputed at D. Tests: a sale (subtract `hD`), a purchase (subtract `h0`), a grant (subtract `h0`), no later row (subtract `h0`), a later row after D (ignored), a class sold and another bought (per class, not per owner total). Mutants predicted in the commit that adds the tests.
