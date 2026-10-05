# Float wording batch: insider sales after the count, row reuse, the date shown (for Commercial's pass, then Integration, then him as one line)

*Marketing, 2026-10-05, amended after Commercial 5l (b867a589): FILINGS_NOT_REREAD string reworded to its requirements, FORM B carries 5l's holdings wording. Worded from `docs/research/float-contract/insider-sale-registration-2026-10-05.md` (d47b26ca, 53502953) and Commercial 5k (e0139dea), read as files. Replaces nothing in `float-page-draft.md` until Commercial passes it; the edits it makes to that file are listed in section 5. No em dashes. Everything below changes text he approved at 2026-10-05T16:01:43Z or adds a reason he has not seen, so it reaches him as one line (section 6).*

*Two forms, because the rule is not chosen: FORM A is true TODAY (Research: until S1 lands, no float surface says "at most" in the present tense). FORM B is for the day S1 (subtract the smaller of the count-date and display-date holdings) or S0 is built and passes. Commercial rules on A now; B is drafted so the swap is mechanical.*

## 1. FORM A: the claim dated to the count (true today)

The defect: a sale by an insider after the count date is still subtracted at the larger count-date holding, so today's float can be larger than the figure. The wording stops claiming the figure is today's float.

**Popover on the bound face** (replaces the v15 bound popover):
"No more than {X} shares as of {filed-count date}, when the filings line up. Computed from the company's filed share count, less insider holdings filed on {holding dates}. Filings read on {fetch date}. Lined up means: a filed count dated {filed-count date}, at most {90 days before D-label}, no share issuance the desk has flagged, no share split since the count, and holdings dated at or before the count. Insider sales after the count date are not reflected."

**Tooltip** (replaces v15 tooltip): "Computed from SEC filings: the latest filed share count we have, less the shares insiders hold directly (holdings as filed on {holding dates}). When the filings line up, the true float as of the count's date is at most this. Read how float numbers are made: **Are float quotes real?**"

**aria-label on the bound face** (Commercial 5m item 2: "as of" hangs on the claim, not the filings): "no more than {X} shares as of {filed-count date}, computed from SEC filings, when the filings line up".

**Off-popover string** (report text, MCP output, exports, stored copies; it travels, so it carries the date on the claim): "no more than {X} shares as of {filed-count date}, when the filings line up, from SEC filings".

**Legend** (Commercial 5m item 1; the float draft's legend line): "Float: computed from SEC filings. An upper bound as of the date shown, when the filings line up. The date is the filed share count's."

**Page, three edits:**
1. "How we do it", last sentence: "When the filings line up, what is left is the most shares that could be trading, and the true float is at most that number." becomes "When the filings line up, what is left is the most shares that could have been trading on the date of the count, and the true float on that date was at most that number."
2. "What you see in the cell", the bound bullet: "The float is no more than that, when the filings line up. The date of the filed count is shown beside it." becomes "The float as of that date was no more than that, when the filings line up. The date of the filed count is shown beside it."
3. "What a number does not tell you": "A name with nothing found may still have issued shares." becomes "A name with nothing found may still have issued shares, and insiders may have sold since the count. We subtract the holdings they reported as of the count's date, so shares an insider has sold since are not added back, and today's float can be larger than the figure. The figure is only as current as the filings under it."
4. Closing paragraph: "it is computed from filings, and when the filings line up it is the most shares that could be trading" becomes "it is computed from filings, and when the filings line up it is the most shares that could have been trading on the date of the count."

## 2. FORM B: for S1 or S0, once built and passed (do not use before)

Popover and tooltip return to the present tense ("The float is no more than {X} shares when the filings line up", "the true float is at most this"); the lined-up clause does NOT gain a "no sale" condition (Commercial 5o: under S1 a filed sale is counted, the insider is still subtracted at the smaller holding, so "no sale filed since the count" would be false of a name that shows a number; that clause was true only under S0); and the "Insider sales after the count date are not reflected." sentence is replaced by "A sale not yet filed cannot be seen." The page's sale paragraph is replaced by Commercial's sentence (5l), placed in "What a number does not tell you" beside the issuance sentence: "A sale not yet filed by the date the filings were read can still make the float larger than the bound." The holdings wording changes (Commercial 5l, three places that now say "dated at or before the count"): the popover's lined-up list reads "insider holdings as filed through {fetch date}, counting any sale filed since the count" in place of "holdings dated at or before the count"; the page says "we subtract the smaller of the shares an insider held at the count's date and the shares their latest filing shows" in place of "each holding ... dated at or before the count"; and the page line "A holding dated after the filed count ... is left out" goes. Under S0 the sentence changes again (an insider who filed a trade after the count is not subtracted); word it then. The page's "true float on that date" edits revert to v15. Research's section 2 limit is the source of the last two sentences: only sales filed by the date the filings were read can be seen.

## 3. New Cannot verify reason: FILINGS_NOT_REREAD (shown when a stored row is more than 4 days older than D)

**Popover:** "Cannot verify: the desk has not read this company's filings since {fetch date}."

Commercial 5l requirements, met: it names the last-read date; it says only that the desk has not read the filings since then (not that they are old, wrong or changed); it is not "not researched" or "not computed" (the desk did read them); it reads as a Cannot verify reason distinct from COUNT_TOO_OLD ("the latest filed share count is from {filed-count date}, too old to rely on"), which is about the company's count, not the desk's reading. **Page, "What you see in the cell" Cannot verify bullet:** "...the count is too old, the desk has not read the company's filings since the date given in the detail, shares may have been issued since, a split may have changed the share units, we did not check for issuance, or the figure did not pass our own sanity check."

Five Cannot verify strings in the file become six (count too old, issuance flagged, issuance not checked, split since the count, figure fails its check, filings not reread). The page's list gains one clause only.

## 4. The date label: "the checkpoint" or "the date shown"

Research: D is the checkpoint's date, fixed when the checkpoint is written, so a stored report or export carries its own D; the live board's D is the trading date it shows. So the lined-up clause reads **"at most 90 days before the checkpoint"** wherever the surface carries a checkpoint (reports, exports, stored copies) and **"at most 90 days before the date shown"** on the live board, with that date printed. `{D-label}` in section 1 stands for whichever applies. Design chooses the label by surface; the words are the two phrases above.

## 5. What this changes in `float-page-draft.md`, when Commercial passes FORM A

Section 1 bound popover, aria-label, off-popover string and legend line; section 1 Cannot verify list (one new string); section 2 tooltip; section 3 four page edits and the Cannot verify bullet; the header gets one change list. Nothing else.

## 6. The one line for him (Integration carries it)

"The float cell no longer says the figure is the float today. It says no more than {X} as of the filed count's date, notes that insiders may have sold since, shows when the filings were last read, and reads Cannot verify if they were read more than four days before the date shown. Reason: a sale by an insider after the count is not reflected, so the shares sold are still subtracted and today's float can be larger than the figure; a rule change that fixes it is being measured."

## 7. Open, not Marketing's

Integration 28th RULED the rule: S1, with S0 only if the measurement's controls fail (contract section 9a, 663dec5d). FORM B is S1's form; an S0 variant is worded only if the fallback is used. Still open and not Marketing's: the measurement (Research's section 4, not yet run); the 4-day span (Research's, frozen); Commercial's pass on FORM A, FILINGS_NOT_REREAD and the date label. FORM A ships if the float ships before S1 is built and passes.
