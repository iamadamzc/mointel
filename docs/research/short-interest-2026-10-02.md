# Short interest: how it is derived, how stale it is, where it would fit

*Seat `local_5f4bfcf8` (Research-tmi), 2026-10-02. Code and public method only; no build.*

- **His question** (typed to Integration-tmi 22nd, relayed 2026-10-02): "i want to do some research around short interest. wonderin if we should include it. where could we get it from. how is it derived. is there any free source (does alpaca have?)"
- **Split** (Integration's order): Commercial takes sources and licensing. This doc takes derivation, staleness, where it would fit in the desk, and what we already hold.
- **Every number below comes from a page opened today.** Sources are listed at the end, and "read" means opened, not recalled.

## 1. How it is derived and reported

**Who reports.** FINRA member broker-dealers report their total short positions, in all customer and proprietary accounts, to FINRA under FINRA Rule 4560. Positions count if they come from a short sale as defined in Reg SHO Rule 200, or from a sale marked long that left the account net short. FINRA adds up all members' reports and publishes one industry-wide figure per security. Coverage is exchange-listed and OTC equities.

**Cadence: twice a month, as of a settlement date.**

- **Mid-month:** positions held on the settlement date of the 15th, or the settlement date before it when the 15th is not one.
- **End of month:** positions held on the last business day of the month on which trades settle.
- **What a position counts:** only short sales that have settled by that date. Settlement is one business day after the trade, per the SEC footnote in FINRA's 2026 filing. So a figure "as of the 15th" reflects trades made through the business day before it.

**Lag.** Members file by 6:00 p.m. ET on the second business day after the settlement date. FINRA publishes on the seventh business day after it. FINRA's 2026 schedule, read today:

| Settlement date | Members due | Published |
|---|---|---|
| Tue Sep 15 | Thu Sep 17, 6 p.m. | Thu Sep 24 |
| Wed Sep 30 | Fri Oct 2, 6 p.m. | Fri Oct 9 |
| Thu Oct 15 | Mon Oct 19, 6 p.m. | Mon Oct 26 |

**A pending change, read and found withdrawn.** In May 2026 FINRA filed SR-FINRA-2026-012. It would have moved reporting to weekly, filed one business day after settlement and published five business days after it. FINRA's filing page now says "This filing has been withdrawn". The page shows no date and I did not read the withdrawal document. **The cadence today is twice a month.**

**What FINRA publishes per security** (FINRA's glossary, read today):

- **Current short:** shares short as of this cycle's settlement date.
- **Previous short:** shares short as of the last cycle's settlement date.
- **Change and % change:** between the two cycles.
- **Average daily volume:** total volume divided by the trading days from the day after the previous settlement date to the current settlement date. That is, the volume over the cycle that just ended, not recent volume.
- **Days to cover:** short interest divided by that average daily volume, to two decimals. FINRA prints 1.00 for any value at or below 1, and N/A when volume is zero.

**% of float is not a FINRA number.** No published field divides by float or by shares outstanding. Any "% of float" a site shows is computed by that site, against its own float. For us that runs straight into our float rules:

- The desk has no float of its own. Every float on the board is the Sheet vendor's number, which the desk does not vouch for (`lib/research/float.ts:4-9`).
- The supply copy's rule is "The denominator is SHARES OUTSTANDING, never float" (`lib/dashboard/supply.ts:8-12`). Float can never exceed shares outstanding, so dividing by the filed count can only understate the true ratio. Calling that "of float" would turn a guaranteed lower bound into a false point estimate.

The honest form uses the same rule: **short interest divided by the dated, filed shares outstanding**, printed as a lower bound ("at least N% of float", or "N% of shares outstanding"), with both dates shown. **Corrected in the addendum below:** it is a lower bound ONLY when no shares were issued, and no split happened, between the count's date and the settlement date. The addendum gives the gate; when the gate fails, no percentage is printed.

**Two things that look like short interest and are not:**

- **FINRA's daily short sale volume files.** They are free and posted by 6:00 p.m. ET on the trade date. They count the VOLUME of trades marked short, not positions held. They include only publicly disseminated trades reported to FINRA's own facilities. FINRA's notice says this data is not intended to equate to, and does not equate to, the bi-monthly short interest (paraphrased; the original sentence is in the notice). A market maker filling a customer's long sale from a flat or short book reports the trade as short, so the volume overstates shorting.
- **The SEC's Form SHO short-position data (Rule 13f-2).** Its compliance is exempt until **2 January 2028** (SEC order 34-104303, 3 December 2025, after a Fifth Circuit remand). So no Form SHO data exists to use before 2028. The related securities-lending public data (Rule 10c-1a) is exempt until 29 March 2029.

## 2. How stale it is, and how to label it honestly

- **At its freshest,** the published figure describes positions settled seven business days earlier, from trades one business day before that.
- **It then stays the newest figure** until the next publication, about two weeks later. On Thu Oct 8 the newest figure still describes Sep 15 positions, 23 calendar days earlier. Today (Fri Oct 2) the newest is also Sep 15 (published Sep 24), 17 days old.
- **So at 07:00 to 10:00 ET on any day,** the figure is between about 7 business days and about 3.5 calendar weeks old. It never describes today.
- **What that means for a fresh mover:** a name running today on news since the settlement date shows the short interest from before the run. The days-to-cover figure is worse. Its divisor is the PRIOR cycle's average volume, so for a name trading many times its usual volume today, FINRA's days to cover describes a different stock.

**Labelling rules this implies** (proposals, his to accept):

1. **Always print the settlement date beside the number**, for example "Short interest 2.1M sh as of Sep 15", and never call it current. A number with no date reads as today's.
2. **Print FINRA's days to cover only as FINRA's,** with its date. Do not recompute it against today's volume: that divides a stale numerator by a live denominator and yields a number that never existed.
3. **% of float only as the lower bound** from the filed share count, with both dates, per `supply.ts`, and only under the addendum's gate (no issuance and no split between the two dates).
4. **Show the change from the previous cycle** with both dates, because a direction is less damaged by age than a level.

## 3. Where it would fit, if he wants it

**As a derived, dated field on the dossier, never model-written.** `StructureFindings` (`lib/research/types.ts:499-541`) already carries derived optional fields (`supplyBound`, `supplyPair`, `supplyOverhang`) that the model's schema does not produce. The field would be:

`structure.shortInterest?: { settlementDate, publishedDate, sharesShort, previousSharesShort, avgDailyVolume, daysToCover, source: 'FINRA' }`

It would be filled by code from FINRA's file, never by the model.

The surfaces, from cheapest to most invasive:

| Surface | What changes | Readers touched |
|---|---|---|
| **Drawer detail** (cheapest) | One dated line in the structure section | `components/AutomaticIntelligence.tsx`; `lib/dashboard/deskRead.ts` (`buildStructureSummary`); `lib/mcp/tools.ts:258-273` |
| **Board Risk chip** | A new branch in `resolveRisk` (`lib/dashboard/risk.ts`), which runs in a fixed order: DIRTY_FLOAT, SUPPLY_OVERHEAD, STRUCTURE_UNKNOWN, STRUCTURE_CAUTION, STRUCTURE_CLEAN. A short-interest branch would have to say where it sits against supply overhead. The Risk chip shows one outcome, so placing it there is a product call. | `risk.ts`; the report tags inherit it unchanged (v6 `lib/desk/reports/tags.ts` runs the board's `resolveRisk`) |
| **Report tag** | Comes free with the Risk chip | v6 `tags.ts`; Design's tag row |
| **Report prose** (not proposed) | v6's writer no longer restates structure, and the checker would need a number allowance for it | `lib/desk/reports/research.ts`, `traced.ts`, `writerV6.ts`, `check.ts` |

Wording constraints already in the reports:

- The report checker bans "shortable", "short it" and "short the" as trade language (`check.ts:134`).
- The writer tells the model "The reader is long-only" (`writerV6.ts:167`).
- Neither ban matches "short interest". A report line about it would still need a checker rule tying its number and date to the field.

## 4. What we already store or fetch that relates

- **Nothing short-related is stored.** No column, field or surface for short interest, days to cover, borrow, Reg SHO or FINRA exists in the code. The only hits are the wording bans above.
- **Alpaca:**
  - The desk calls `/v2/assets`, but its `AlpacaAsset` type declares only symbol, name, exchange, status, tradable and class (`lib/market/alpaca/rest.ts:34-41`).
  - Alpaca's assets reference (read today) also returns `shortable` (true or false), `marginable`, and `borrow_status` (easy or hard to borrow). These are borrow availability at Alpaca, not short interest, and the desk reads none of them.
  - No short-interest field appears on that endpoint. Whether any other Alpaca product carries short interest is Commercial's sourcing question; this page does not answer it.
- **SEC filings:** the forms we fetch (8-K through SC 13G and 144, `lib/research/sec/forms.ts:109-171`) carry no short positions. The supply ledger is the other side of the book: shares the ISSUER may sell (ATMs, shelves, warrants), not shares traders have sold short.
- **Shares outstanding:** we already derive the filed count with its date (`dei:EntityCommonStockSharesOutstanding`; `FiledShareCount.asOf`; current for 45 days, `float.ts:92`). That is the denominator for the honest lower-bound ratio in section 1. **So the only new input is FINRA's file.**

## Not in this doc

- **Licensing and the source choice** are Commercial's. Pointers for that review:
  - FINRA's data page speaks of "non-commercial use".
  - FINRA's filing says the aggregate is published "free of charge, on finra.org".
  - Those are two different statements about two different things, and the redistribution terms need reading.
- **Whether short interest predicts anything for his names** is not studied here. If he wants that, it is a separate pre-registered measurement, his call.

## Sources (opened 2026-10-02)

- FINRA, About Equity Short Interest: finra.org/finra-data/browse-catalog/equity-short-interest
- FINRA, Equity Short Interest Data Glossary: finra.org/finra-data/browse-catalog/equity-short-interest/glossary
- FINRA, Short Interest Reporting, 2026 schedule: finra.org/filing-reporting/regulatory-filing-systems/short-interest
- FINRA, SR-FINRA-2026-012 notice, 91 FR 28699 (May 18, 2026), text extracted locally; and its filing page, status "withdrawn": finra.org/rules-guidance/rule-filings/sr-finra-2026-012
- FINRA, Daily Short Sale Volume Files: finra.org/finra-data/browse-catalog/short-sale-volume-data/daily-short-sale-volume-files
- FINRA, Understanding Short Sale Volume Data (Information Notice 051019): finra.org/rules-guidance/notices/information-notice-051019
- SEC, Release 34-104303 (Dec 3, 2025), Rule 13f-2 / Form SHO and Rule 10c-1a exemptions: sec.gov/files/rules/exorders/2025/34-104303.pdf, text extracted locally
- Alpaca, Get Assets reference: docs.alpaca.markets/reference/get-v2-assets-1

---

## Addendum, 2026-10-02: measures for "heavy / deep / concentrated"

- **His words** (typed to Integration-tmi 22nd, relayed 2026-10-02): "i dont want borrow data for the sake of having it. understanding short interest is a read for longs. if its heavy/deep/concentrated it makes long plays more volatile."
- **Integration's ask:** which measures express each of the three words; how fresh each can be in the 07:00 to 10:00 ET window; which can be stated as a fact and which only as a dated estimate; and how one compact read could appear, drawer first.
- **Scope:** method only, no build. This describes what each measure shows, not whether the read is right.
- **Sources:** Commercial's `docs/commercial/2026-10-02-short-interest-landscape.md` (`d5da7c08`) for what each source carries and may be shown; this doc's sections 1 and 2 above for FINRA's numbers.

### The measures, word by word

| His word | Measure | What it shows | Source and freshness at 07:00 to 10:00 ET | Statable as |
|---|---|---|---|---|
| **heavy** | **Short interest as % of shares outstanding** | Shares short against the share count | FINRA short interest is 7 business days to about 3.5 weeks old (section 2). Filed shares outstanding is dated and counts as current for 45 days (`float.ts:92`) | A **dated fact** in the form "at least N% of float", but **only under the gate below**. Otherwise not stated |
| **heavy** | **Shares short, and the change since the previous report** | The size, and whether shorts built or covered between two settlement dates | FINRA, the same two dates | A **dated fact**, with both dates |
| **deep** | **Days to cover (FINRA's)** | How many days of the PRIOR cycle's average volume the short position equals | FINRA, same age as short interest; its divisor is the cycle before the settlement date | A **dated fact, labelled as FINRA's**. Never recomputed on today's volume (section 2, rule 2) |
| **concentrated** | **No public measure exists** | Who holds the shorts, and how few holders hold how much | FINRA publishes one aggregate per security. Form SHO is exempt until 2 January 2028, and even it is aggregated per security. Securities-lending dissemination (Rule 10c-1a) is exempt until 29 March 2029 | **Not statable.** Nothing available measures concentration among holders |
| (scarcity of lendable shares, often read as a proxy for "concentrated") | **Alpaca `borrow_status`** (easy or hard to borrow) and `shortable` | Alpaca's own classification of the symbol, live | Alpaca, live at read time. Commercial: not described as account-specific anywhere read, unconfirmed by a second source | A **fact about Alpaca at a time** ("hard to borrow at Alpaca, 08:31 ET"), never a market-wide fact |
| (same) | **Borrow fee / locate quote** | The cost and quantity to borrow | Alpaca's locate quote, live, hard-to-borrow names only. **Alpaca's own words: "account-specific"** (Commercial section 8) | Only as **this account's quote at a time**. Never "the borrow fee" |
| (same) | **Utilization** (shares on loan divided by lendable supply) | How much of the lendable pool is already lent | Vendor-defined and vendor-computed. No regulatory public source (10c-1a above). Commercial could not read Ortex or S3 terms | Only as **a named vendor's estimate, with its definition**. Unsourced today |

### The gate on "% of float" (a correction to section 1's lower bound)

Section 1 said that short interest divided by the filed shares outstanding is a lower bound on % of float. **That holds only if the share count did not grow, and did not split, between the count's date and the short-interest settlement date.** The two failures:

- **Issuance after the count's date** (an ATM, an offering, a warrant exercise): the true float can exceed the old count. Dividing by the old count can then OVERSTATE % of float, so the figure is no longer a bound.
- **A split between the two dates:** FINRA reports positions in post-split shares, while the count is pre-split. A 1-for-20 reverse split makes the ratio about 20 times wrong. `float.ts:226-235` already rules on this exact case for floats: "a denominator that may be wrong in an unknown direction cannot support any arithmetic about it". It declines to split-adjust, because `reverseSplitHistory` is model-extracted prose.

**The gate, in the desk's existing terms.** State "at least N% of float" only when all three hold:

1. the filed count is current under `FILED_SHARES_CURRENT_DAYS` (45 days);
2. the count is dated ON OR AFTER the short-interest settlement date, or the supply ledger shows no KNOWN_ACTIVE or POSSIBLY_ACTIVE issuance between the two dates;
3. no split is recorded after the count's date.

**Otherwise print shares short and days to cover alone, with no percentage.** Condition 2's ledger test relies on model-extracted ledger entries; a count dated on or after the settlement date avoids that dependence.

### One compact read, drawer first

One line in the structure section, every number dated, built by code from stored fields and never written by the model. An example of the shape (all numbers illustrative):

> Short interest 2.1M sh as of Sep 15 (FINRA, 17 days old), at least 14% of float (shares out Sep 30 10-Q), 3.2 days to cover (FINRA, on Aug 29 to Sep 15 volume), up 40% since Aug 29. Hard to borrow at Alpaca, 08:31 ET.

- **When the gate fails:** "Short interest 2.1M sh as of Sep 15 (FINRA, 17 days old), 3.2 days to cover (FINRA). Not stated as % of float: shares issued since the last filed count."
- **The age goes in the line itself.** A short interest figure read without its date reads as today's.
- **Borrow fee and utilization stay out of the line** until a source that may be displayed carries a market-wide figure. The account-specific locate quote is not that.
- **Board chip and report tag come after the drawer, if ever.** The ordering question in section 3 stands. A chip saying "heavy short interest" would need a threshold, and choosing it is a product call. The data does not supply one.

### What the data cannot answer

- **Whether heavy or deep short interest makes long plays more volatile** is not shown by any of these measures on its own. They describe the short position, not the price behaviour that follows it.
- If that is ever wanted as a measurement, it is a separate pre-registered study, his call. It is not proposed here.
