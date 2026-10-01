# First live session reports: line-by-line audit, 2026-09-30

READ-ONLY audit of the first three PRODUCTION session reports (#585, #588, #591) against the stored rows they were written from. Not committed.

## Inputs

| Input | What | Sha |
| --- | --- | --- |
| `docs/ops/report-audit-q1-q5-2026-09-30.json` | Q1 session_reports (payload + diagnostics), Q2 desk_assessments 585/588/591, Q3 desk_assessment_tickers (81 rows), Q5 research_analysis_versions (40 rows); box clock of the read 2026-10-01T02:06:27Z | 5c55e489 |
| `docs/ops/report-audit-q4-latches-2026-09-30.json` | ticker_session latches for 09-30 (27 symbols, the names of 585/588), read 2026-10-01T01:28:24Z, before the 22:00 ET roll; every ah_* value predates 00:00Z, so it also holds for #591 | 88d694fd |
| Code | `lib/desk/reports/{pipeline,facts,path,research,totals,writerV5,check,traced}.ts`, `lib/research/time.ts` at the LIVE release | e8822583 |
| Contract | `docs/research/session-reports/design.md` sections 7 and 8 (not present at e8822583; read on disk at main) | working tree |

## How to read this

- HOLDS: traced to the named stored field and value. WRONG: contradicted by the named stored value. NOT CHECKABLE: the value needed is not in Q1 to Q5; what is missing is named.
- Every published line is split into its claims. The company line and the price path are computed by code, not written by the model. They are still printed, so each line carries them as claims (one claim per company part printed, one claim for the three path points and their basis). Section headings are printed too and are counted as one claim per line under them.
- Dossier ids ("avid") are the `analysis_version_id` on the checkpoint's own Q3 row, as `pipeline.ts` reads them; nothing here uses a later row.
- No published line states a percent, a rank, a volume or an RVOL figure, so the percent-basis and rank rules were exercised only through the computed path. Every path point equals its checkpoint's own stored values, on the basis its kind uses: `reference_close` (PRIOR_SESSION) to `session_high` to `price` for #585/#588; `ah_reference_close` (CURRENT_SESSION, today's close) to `ah_high` to `price` for #591, with `price_at` inside 16:00 to 20:00 ET.
- Mechanical sweeps over all 34 published lines and the overall line: no em dash (U+2014 or entity), no buy/sell/enter/exit/will/confirmed wording, no "still/remains/continues". Every shares-outstanding count carries its as-of date and is called "not a float". Every number and dated value in the text was found in its own dossier, apart from the items marked NOT CHECKABLE.

## Summary

| Report | Lines published | Claims checked | HOLDS | WRONG | NOT CHECKABLE | Strikes | Strikes right | Strikes false |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| #585 INTO_POWER_HOUR | 12 | 188 | 185 | 0 | 3 | 0 | 0 | 0 |
| #588 AFTER_HOURS | 11 | 170 | 167 | 2 | 1 | 1 | 1 | 0 |
| #591 PREMARKET for 2026-10-01 | 12 | 174 | 166 | 3 | 5 | 1 | 1 | 0 |
| All three | 35 | 532 | 518 | 5 | 9 | 2 | 2 | 0 |

Counts include the claims reconstructed for the two struck lines (their text is not stored). In the published copy, no sentence written by the model is contradicted by its stored row or dossier. The WRONG claims are three section headings, which the checker never sees (see below), and the two struck lines.

## #585 INTO_POWER_HOUR, 2026-09-30, checkpoint RTH_INTERVAL 14:30 ET (completed 18:30:08Z)

Published 2026-10-01T01:25:41.178Z, late=true, headline=null (v5 writes none), watchCount=12. Writer gpt-5.6-luna (prompt 5), checker gpt-5.6-terra (prompt 3).

### Report-level claims

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Names = the in-range top 12 of checkpoint 585 ($1 to $20, day latch), in rank order | HOLDS | Q3 585 in-range by price or Q4 qualified_price/qualified_at <= 18:30:08Z: TGE 1, CMCT 2, CHGA 3, LGHL 4, CNTB 5, GOW 6, VBIO 7, ANTA 8, BIYA 9, AURE 10, SEED 11 (latch 1.01), HBNB 12; excluded AHG, NIVF, LIQT (latch below $1) |
| Opening count (watchCount) 12 | HOLDS | 12 distinct tickers in the published lines |
| Frame "Into power hour" | HOLDS | Q2 585 RTH_INTERVAL scheduled_for 18:30:00Z = 14:30 ET |
| late = true | HOLDS | published 01:25:41Z = 21:25 ET, after the 15:00 ET serves-by |

### 1. TGE (section "Into power hour"; Q3 585 band rank 1; dossier 2600, generated 2026-09-30T15:59:53.361Z)

> The September 30, 2026 1H 2026 results release reported US$22.8 million of net profit, EPS of US$0.56 up 366.7%, and US$30.8 million of revenue from contracts with customers up 35.8%; the desk grades the company-specific earnings event strong and reads it as plausibly explaining the move that has happened. The structure is dirty float, with no float the desk can independently verify, registered resale possibly active for 57,401,944 shares effective June 3, 2026, and warrants possibly active for 16,220,000 shares effective June 3, 2026. The name sits yellow, frontside warning.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Company name "Generation Essentials Group" | HOLDS | avid 2600 companyName="Generation Essentials Group" |
| Country Cayman Islands | HOLDS | avid 2600 country="E9" (EDGAR code, decodes to Cayman Islands) |
| Path $0.83 to $1.9 to $1.46, from prior close | HOLDS | Q3 585 TGE reference_close=0.83, session_high=1.9, price=1.46, reference_basis=PRIOR_SESSION |
| Event date September 30, 2026 | HOLDS | avid 2600 catalyst.eventTimestamp=2026-09-30T09:14:02Z (05:14 ET, Sep 30) |
| "1H 2026 results release" | HOLDS | 2600 catalyst.summary: "furnished its 1H 2026 results on September 30" |
| US$22.8 million net profit | HOLDS | 2600 summary |
| EPS US$0.56, up 366.7% | HOLDS | 2600 summary: "EPS of US$0.56 (up 366.7%)" |
| US$30.8 million revenue from contracts with customers, up 35.8% | HOLDS | 2600 summary |
| Company-specific earnings event graded strong | HOLDS | 2600 catalystGrade=STRONG; Q3 585 TGE catalyst=STRONG |
| Fit: plausibly explaining the move that has happened | HOLDS | 2600 plausiblyExplainsMove=true |
| Structure dirty float | HOLDS | 2600 structureClassification=DIRTY_FLOAT; Q3 585 TGE structure=DIRTY_FLOAT |
| No float the desk can independently verify | HOLDS | 2600 floatConfidence=UNKNOWN, displayedFloat=null |
| Registered resale, possibly active, 57,401,944 shares, effective June 3, 2026 | HOLDS | 2600 supplyLedger[0] REGISTERED_RESALE POSSIBLY_ACTIVE 2026-06-03 amountShares=57401944 |
| Warrants, possibly active, 16,220,000 shares, effective June 3, 2026 | HOLDS | 2600 supplyLedger[1] WARRANTS POSSIBLY_ACTIVE 2026-06-03 amountShares=16220000 |
| Sits yellow, frontside warning | HOLDS | Q3 585 TGE cycle=YELLOW_FRONTSIDE_WARNING |

### 2. CMCT (section "Into power hour"; Q3 585 band rank 2; dossier 2593, generated 2026-09-30T14:19:53.881Z)

> The September 29, 2026 announcement titled CMCT Declares Preferred Stock Dividends is the only fresh company item in the supplied coverage, but its dividend amount and payment terms are missing; the desk grades the catalyst unknown and does not read it as explaining the move. The structure is dirty float, with no float the desk can independently verify, 2,947,493 shares outstanding as of August 6, 2026 (the outstanding count, not a float), preferred conversion known active for 30,555 shares effective September 9, 2026 and 50,660 shares effective September 2, 2026, other issued shares not yet active for 250,000 shares, and shelf capacity possibly active effective November 22, 2022. There is no cycle conclusion.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Company name "Creative Media & Community Trust Corp" | HOLDS | avid 2593 companyName="Creative Media & Community Trust Corp" |
| Country United States | HOLDS | avid 2593 country="TX" (EDGAR code, decodes to United States) |
| Path $1.92 to $3.9399 to $2.7, from prior close | HOLDS | Q3 585 CMCT reference_close=1.92, session_high=3.9399, price=2.7, reference_basis=PRIOR_SESSION |
| Announcement dated September 29, 2026 | HOLDS | avid 2593 eventTimestamp=2026-09-29T12:00:00Z (08:00 ET, Sep 29); summary "September 29, 2026 announcement" |
| Titled "CMCT Declares Preferred Stock Dividends" | HOLDS | 2593 summary quotes the title |
| The only fresh company item in the supplied coverage | HOLDS | 2593 whyTradersMayCare: "the only fresh company announcement in the supplied catalyst coverage" |
| Dividend amount and payment terms missing | HOLDS | 2593 summary and unknowns[0] |
| Catalyst graded unknown | HOLDS | 2593 catalystGrade=UNKNOWN; Q3 585 CMCT catalyst=UNKNOWN |
| Fit: not read as explaining the move | HOLDS | 2593 plausiblyExplainsMove=false |
| Structure dirty float | HOLDS | 2593 DIRTY_FLOAT; Q3 585 CMCT structure=DIRTY_FLOAT |
| No float the desk can independently verify | HOLDS | 2593 floatConfidence=UNKNOWN |
| 2,947,493 shares outstanding as of August 6, 2026, not a float | HOLDS | 2593 sharesOutstanding=2947493, sharesOutstandingDate=2026-08-06 |
| Preferred conversion, known active, 30,555 shares, effective September 9, 2026 | HOLDS | 2593 supply PREFERRED_CONVERSION KNOWN_ACTIVE 2026-09-09 30555 |
| Preferred conversion, known active, 50,660 shares, effective September 2, 2026 | HOLDS | 2593 supply PREFERRED_CONVERSION KNOWN_ACTIVE 2026-09-02 50660 |
| Other issued shares, not yet active, 250,000 shares | HOLDS | 2593 supply OTHER_ISSUED_SHARES NOT_YET_ACTIVE amountShares=250000 |
| Shelf capacity, possibly active, effective November 22, 2022 | HOLDS | 2593 supply SHELF_CAPACITY POSSIBLY_ACTIVE 2022-11-22 |
| No cycle conclusion | HOLDS | Q3 585 CMCT cycle=UNKNOWN |

### 3. CHGA (section "Into power hour"; Q3 585 band rank 3; dossier 2609, generated 2026-09-30T17:31:29.840Z)

> The September 29, 2026 definitive proxy calls a special stockholder meeting and secondary coverage describes multiple issuance proposals; the September prospectus registers up to 5,000,000 ELOC put shares at a fixed $2.00 per share, making the desk grade the catalyst moderate / mixed / secondary and read it as supply-sensitive rather than explanatory of the move. The structure is dirty float, with no float the desk can independently verify, an equity purchase agreement known active for 5,000,000 shares effective September 18, 2026, and two warrant lines possibly active for 1,000,000 shares each. There is no cycle conclusion.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Company name "Change Agents Corporation." | HOLDS | avid 2609 companyName="Change Agents Corporation." |
| Country (none printed) | HOLDS | avid 2609 country=null |
| Path $1.96 to $3.6199 to $2.24, from prior close | HOLDS | Q3 585 CHGA reference_close=1.96, session_high=3.6199, price=2.24, reference_basis=PRIOR_SESSION |
| September 29, 2026 definitive proxy calls a special stockholder meeting | HOLDS | avid 2609 summary; eventTimestamp=2026-09-29T12:00:00Z |
| Secondary coverage describes multiple issuance proposals | HOLDS | 2609 summary |
| September prospectus registers up to 5,000,000 ELOC put shares at a fixed $2.00 | HOLDS | 2609 summary |
| Catalyst graded moderate / mixed / secondary | HOLDS | 2609 catalystGrade=MODERATE_MIXED_SECONDARY; Q3 585 CHGA catalyst same |
| Read as supply-sensitive, not explanatory of the move | HOLDS | 2609 whyTradersMayCare "supply-sensitive setup"; plausiblyExplainsMove=false |
| Structure dirty float | HOLDS | 2609 DIRTY_FLOAT; Q3 585 CHGA structure=DIRTY_FLOAT |
| No float the desk can independently verify | HOLDS | 2609 floatConfidence=LOW (displayedFloat not carried to the writer by design) |
| Equity purchase agreement, known active, 5,000,000 shares, effective September 18, 2026 | HOLDS | 2609 supply EQUITY_PURCHASE_AGREEMENT KNOWN_ACTIVE 2026-09-18T17:00Z (13:00 ET Sep 18) 5000000 |
| Two warrant lines, possibly active, 1,000,000 shares each | HOLDS | 2609 supply WARRANTS POSSIBLY_ACTIVE 1000000 (x2) |
| No cycle conclusion | HOLDS | Q3 585 CHGA cycle=UNKNOWN |

### 4. LGHL (section "Into power hour"; Q3 585 band rank 6; dossier 2610, generated 2026-09-30T18:00:58.078Z)

> The September 30, 2026 Form 6-K reported a sale of all Solana holdings and part of the Bitcoin holdings to acquire approximately 38,102 additional HYPE tokens, leaving about 232,900 HYPE tokens valued at approximately $20.1 million; the desk grades the treasury action strong and reads it as plausibly explaining the move that has happened. The structure is caution, with no float the desk can independently verify, convertibles known active effective September 28, 2026, and other issued shares not yet active effective August 18, 2026. The name is red, backside, with most of the advance given back.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Company name "Lion Group Holding Ltd" | HOLDS | avid 2610 companyName="Lion Group Holding Ltd" |
| Country Cayman Islands | HOLDS | avid 2610 country="Cayman Islands" |
| Path $4.51 to $9.79 to $4.275, from prior close | HOLDS | Q3 585 LGHL reference_close=4.51, session_high=9.79, price=4.275, reference_basis=PRIOR_SESSION |
| September 30, 2026 Form 6-K | HOLDS | avid 2610 eventTimestamp=2026-09-30T09:15:01Z; summary "disclosed in the company's Form 6-K" |
| Sold all Solana and part of Bitcoin holdings | HOLDS | 2610 summary |
| Approximately 38,102 additional HYPE tokens | HOLDS | 2610 summary |
| About 232,900 HYPE tokens valued about $20.1 million | HOLDS | 2610 summary |
| Treasury action graded strong | HOLDS | 2610 catalystGrade=STRONG; Q3 585 LGHL catalyst=STRONG |
| Fit: plausibly explaining the move | HOLDS | 2610 plausiblyExplainsMove=true |
| Structure caution | HOLDS | 2610 CAUTION; Q3 585 LGHL structure=CAUTION |
| No float the desk can independently verify | HOLDS | 2610 floatConfidence=UNKNOWN |
| Convertibles, known active, effective September 28, 2026 | HOLDS | 2610 supply CONVERTIBLES KNOWN_ACTIVE 2026-09-28 |
| Other issued shares, not yet active, effective August 18, 2026 | HOLDS | 2610 supply OTHER_ISSUED_SHARES NOT_YET_ACTIVE 2026-08-18 |
| Red, backside, most of the advance given back | HOLDS | Q3 585 LGHL cycle=RED_BACKSIDE (ruled reading) |

### 5. CNTB (section "Into power hour"; Q3 585 band rank 7; dossier 2613, generated 2026-09-30T18:29:43.342Z)

> The September 30, 2026 8-K reported topline Phase 2 COPD results for rademikibart, including an 81% statistically significant reduction in treatment failure through Week 4 versus placebo, significant reductions in new moderate-to-severe exacerbations, symptom improvements, and no new safety signals; the desk grades the clinical-data event strong and reads it as plausibly explaining the move that has happened. The structure is caution, with no float the desk can independently verify, 62,974,309 shares outstanding as of July 31, 2026 (the outstanding count, not a float), and registered resale known active for 6,130,000 shares effective June 1, 2026. There is no cycle conclusion.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Company name "Connect Biopharma Holdings Ltd" | HOLDS | avid 2613 companyName="Connect Biopharma Holdings Ltd" |
| Country United States | HOLDS | avid 2613 country="CA" (EDGAR code, decodes to United States) |
| Path $0.992 to $2.08 to $1.2292, from prior close | HOLDS | Q3 585 CNTB reference_close=0.992, session_high=2.08, price=1.2292, reference_basis=PRIOR_SESSION |
| Dated September 30, 2026 | HOLDS | avid 2613 eventTimestamp=2026-09-30T07:05:05Z; summary |
| Form named "8-K" | NOT CHECKABLE | not in 2613 summary/why/unknowns; needs the titles of research_sources 116713, 116730 |
| Topline Phase 2 COPD results for rademikibart | HOLDS | 2613 summary |
| 81% statistically significant reduction in treatment failure through Week 4 vs placebo | HOLDS | 2613 summary |
| Reductions in new moderate-to-severe exacerbations, symptom improvements, no new safety signals | HOLDS | 2613 summary |
| Clinical-data event graded strong | HOLDS | 2613 catalystGrade=STRONG; Q3 585 CNTB catalyst=STRONG |
| Fit: plausibly explaining the move | HOLDS | 2613 plausiblyExplainsMove=true |
| Structure caution | HOLDS | 2613 CAUTION; Q3 585 CNTB structure=CAUTION |
| No float the desk can independently verify | HOLDS | 2613 floatConfidence=UNKNOWN |
| 62,974,309 shares outstanding as of July 31, 2026, not a float | HOLDS | 2613 sharesOutstanding=62974309, date 2026-07-31 |
| Registered resale, known active, 6,130,000 shares, effective June 1, 2026 | HOLDS | 2613 supply REGISTERED_RESALE KNOWN_ACTIVE 2026-06-01 6130000 |
| No cycle conclusion | HOLDS | Q3 585 CNTB cycle=UNKNOWN |

### 6. GOW (section "Into power hour"; Q3 585 band rank 8; dossier 2579, generated 2026-09-30T13:32:34.752Z)

> The September 25, 2026 business-combination closing and concurrent PIPE were older news rather than a fresh catalyst; the transaction included approximately $50 million of preferred shares and warrants alongside an approximately $20 million private placement, and the desk grades the news weak / negative / dilutive while reading it as plausibly explaining the move that has happened. The structure is caution, with no float the desk can independently verify, PIPE known active effective September 25, 2026, warrants possibly active for 980,392 shares effective August 11, 2026, and other issued shares possibly active for 18,981,618 shares effective August 11, 2026. There is no cycle conclusion.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Company name "GOWell Energy Technology" | HOLDS | avid 2579 companyName="GOWell Energy Technology" |
| Country (none printed) | HOLDS | avid 2579 country=null |
| Path $1.8099 to $3.18 to $2.505, from prior close | HOLDS | Q3 585 GOW reference_close=1.8099, session_high=3.18, price=2.505, reference_basis=PRIOR_SESSION |
| Business-combination closing September 25, 2026 | HOLDS | avid 2579 summary; eventTimestamp=2026-09-25T20:04:25Z (16:04 ET Sep 25) |
| Concurrent PIPE | HOLDS | 2579 summary "Concurrently, it completed ... closing PIPE" |
| Older news, not a fresh catalyst | HOLDS | 2579 catalystStatus=SECONDARY_STALE |
| About $50 million of preferred shares and warrants | HOLDS | 2579 summary |
| About $20 million private placement | HOLDS | 2579 summary (funded October 2025, see misleading) |
| Graded weak / negative / dilutive | HOLDS | 2579 catalystGrade=WEAK_NEGATIVE_DILUTIVE; Q3 585 GOW catalyst same |
| Fit: plausibly explaining the move | HOLDS | 2579 plausiblyExplainsMove=true |
| Structure caution | HOLDS | 2579 CAUTION; Q3 585 GOW structure=CAUTION |
| No float the desk can independently verify | HOLDS | 2579 floatConfidence=UNKNOWN |
| PIPE, known active, effective September 25, 2026 | HOLDS | 2579 supply PIPE KNOWN_ACTIVE 2026-09-25 |
| Warrants, possibly active, 980,392 shares, effective August 11, 2026 | HOLDS | 2579 supply WARRANTS POSSIBLY_ACTIVE 2026-08-11 980392 |
| Other issued shares, possibly active, 18,981,618 shares, effective August 11, 2026 | HOLDS | 2579 supply OTHER_ISSUED_SHARES POSSIBLY_ACTIVE 2026-08-11 18981618 |
| No cycle conclusion | HOLDS | Q3 585 GOW cycle=UNKNOWN |

Misleading: The $20 million private placement was funded in October 2025 (2579 summary); "the transaction included ... alongside" reads as part of the September 25 deal.

### 7. VBIO (section "Into power hour"; Q3 585 band rank 9; dossier 2587, generated 2026-09-30T14:02:44.760Z)

> The September 30, 2026 announcement with Shear Kershman Laboratories reported successful formulation of an oral-mucosal, needle-free version of Entolimod; the desk grades the company-issued development legitimate positive and reads it as plausibly explaining the move that has happened, while lacking a quantified commercial or clinical outcome. The structure is caution, with no float the desk can independently verify, an equity purchase agreement possibly active, convertibles possibly active, and warrants of unknown status. There is no cycle conclusion.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Company name "Valion Bio, Inc." | HOLDS | avid 2587 companyName="Valion Bio, Inc." |
| Country United States | HOLDS | avid 2587 country="TX" (EDGAR code, decodes to United States) |
| Path $2.83 to $4.39 to $3.115, from prior close | HOLDS | Q3 585 VBIO reference_close=2.83, session_high=4.39, price=3.115, reference_basis=PRIOR_SESSION |
| Announcement dated September 30, 2026 | HOLDS | avid 2587 eventTimestamp=2026-09-30T11:47:47Z (07:47 ET) |
| With Shear Kershman Laboratories; oral-mucosal, needle-free Entolimod formulated | HOLDS | 2587 summary |
| Company-issued development | HOLDS | 2587 whyTradersMayCare "company-issued, same-day development" |
| Graded legitimate positive | HOLDS | 2587 catalystGrade=LEGITIMATE_POSITIVE; Q3 585 VBIO catalyst same |
| Fit: plausibly explaining the move | HOLDS | 2587 plausiblyExplainsMove=true |
| Lacks a quantified commercial or clinical outcome | HOLDS | 2587 unknowns[0] |
| Structure caution | HOLDS | 2587 CAUTION; Q3 585 VBIO structure=CAUTION |
| No float the desk can independently verify | HOLDS | 2587 floatConfidence=UNKNOWN |
| Equity purchase agreement possibly active | HOLDS | 2587 supply EQUITY_PURCHASE_AGREEMENT POSSIBLY_ACTIVE |
| Convertibles possibly active | HOLDS | 2587 supply CONVERTIBLES POSSIBLY_ACTIVE |
| Warrants of unknown status | HOLDS | 2587 supply WARRANTS UNKNOWN |
| No cycle conclusion | HOLDS | Q3 585 VBIO cycle=UNKNOWN |

### 8. ANTA (section "Into power hour"; Q3 585 band rank 10; dossier 2560, generated 2026-09-30T11:22:34.367Z)

> The August 19, 2026 Q2 earnings event is not a fresh catalyst: secondary coverage reported EPS of $(0.47) versus a $0.01 estimate, sales of $12.206 million versus a $14.300 million estimate, and Q3 sales guidance of $10 million–$12 million versus a $15.650 million estimate, while the company release reported facilitated-loan TVL of $1.353 billion and margin-loan TVL of $969 million; the desk grades the context moderate / mixed / secondary and does not read it as explaining the move. The structure is caution, with no float the desk can independently verify, 23,980,257 shares outstanding as of December 31, 2025 (the outstanding count, not a float), and shelf capacity possibly active effective August 11, 2026. There is no cycle conclusion.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Company name "Antalpha Platform Holding Co" | HOLDS | avid 2560 companyName="Antalpha Platform Holding Co" |
| Country (none printed) | HOLDS | avid 2560 country=null |
| Path $2.29 to $3.49 to $2.35, from prior close | HOLDS | Q3 585 ANTA reference_close=2.29, session_high=3.49, price=2.35, reference_basis=PRIOR_SESSION |
| August 19, 2026 Q2 earnings event, not fresh | HOLDS | avid 2560 eventTimestamp=2026-08-19T07:01:21Z; catalystStatus=SECONDARY_STALE |
| EPS $(0.47) vs $0.01 estimate | HOLDS | 2560 summary |
| Sales $12.206 million vs $14.300 million estimate | HOLDS | 2560 summary |
| Q3 sales guidance $10 million to $12 million vs $15.650 million estimate | HOLDS | 2560 summary |
| Facilitated-loan TVL $1.353 billion; margin-loan TVL $969 million | HOLDS | 2560 summary |
| Estimate comparisons are secondary coverage; TVL from the company release | HOLDS | 2560 summary |
| Graded moderate / mixed / secondary | HOLDS | 2560 catalystGrade=MODERATE_MIXED_SECONDARY; Q3 585 ANTA catalyst same |
| Fit: not read as explaining the move | HOLDS | 2560 plausiblyExplainsMove=false |
| Structure caution | HOLDS | 2560 CAUTION; Q3 585 ANTA structure=CAUTION |
| No float the desk can independently verify | HOLDS | 2560 floatConfidence=UNKNOWN |
| 23,980,257 shares outstanding as of December 31, 2025, not a float | HOLDS | 2560 sharesOutstanding=23980257, date 2025-12-31 |
| Shelf capacity, possibly active, effective August 11, 2026 | HOLDS | 2560 supply SHELF_CAPACITY POSSIBLY_ACTIVE 2026-08-11 |
| No cycle conclusion | HOLDS | Q3 585 ANTA cycle=UNKNOWN |

### 9. BIYA (section "Into power hour"; Q3 585 band rank 11; dossier 2596, generated 2026-09-30T15:01:55.850Z)

> The September 29, 2026 Form 6-K reported $756,805 of sales, a $0.54 basic/diluted loss per share, and total comprehensive loss of $2.37 million versus $4.71 million in the comparative period, alongside $4.06 million of net proceeds from common-stock issuance; the desk grades the filing moderate / mixed / secondary and reads it as plausibly explaining the move that has happened, though financing supply complicates the interpretation. The structure is dirty float, with no float the desk can independently verify, 1,185,835 shares outstanding as of December 31, 2025 (the outstanding count, not a float), an equity purchase agreement known active effective March 26, 2026, registered resale not yet active for 50,000,000 shares, and shelf capacity not yet active. There is no cycle conclusion.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Company name "Baiya International Group Inc." | HOLDS | avid 2596 companyName="Baiya International Group Inc." |
| Country United States | HOLDS | avid 2596 country="NY" (EDGAR code, decodes to United States) |
| Path $2.05 to $3.18 to $2.085, from prior close | HOLDS | Q3 585 BIYA reference_close=2.05, session_high=3.18, price=2.085, reference_basis=PRIOR_SESSION |
| September 29, 2026 Form 6-K | HOLDS | avid 2596 summary; eventTimestamp=2026-09-29T16:28:32Z (12:28 ET) |
| Sales $756,805 | HOLDS | 2596 summary |
| $0.54 basic/diluted loss per share | HOLDS | 2596 summary |
| Total comprehensive loss $2.37 million vs $4.71 million | HOLDS | 2596 summary |
| $4.06 million net proceeds from common-stock issuance | HOLDS | 2596 summary |
| Graded moderate / mixed / secondary | HOLDS | 2596 catalystGrade=MODERATE_MIXED_SECONDARY; Q3 585 BIYA catalyst same |
| Fit: plausibly explaining the move | HOLDS | 2596 plausiblyExplainsMove=true |
| Financing supply complicates the interpretation | HOLDS | 2596 whyTradersMayCare (restated) |
| Structure dirty float | HOLDS | 2596 DIRTY_FLOAT; Q3 585 BIYA structure=DIRTY_FLOAT |
| No float the desk can independently verify | HOLDS | 2596 floatConfidence=UNKNOWN |
| 1,185,835 shares outstanding as of December 31, 2025, not a float | HOLDS | 2596 sharesOutstanding=1185835, date 2025-12-31 |
| Equity purchase agreement, known active, effective March 26, 2026 | HOLDS | 2596 supply EQUITY_PURCHASE_AGREEMENT KNOWN_ACTIVE 2026-03-26 |
| Registered resale, not yet active, 50,000,000 shares | HOLDS | 2596 supply REGISTERED_RESALE NOT_YET_ACTIVE 50000000 |
| Shelf capacity, not yet active | HOLDS | 2596 supply SHELF_CAPACITY NOT_YET_ACTIVE |
| No cycle conclusion | HOLDS | Q3 585 BIYA cycle=UNKNOWN |

Misleading: The 1,185,835 count predates the 1-for-10 reverse split of July 10, 2026 (2596 structuralWarnings[0] says so); dated correctly, but on a pre-split basis.
Misleading: 585 calls $2.37 million "total comprehensive loss" (2596), 588 calls the same figure "net loss" (2616). One dossier mislabels it; sources 112828, 112829 decide which.

### 10. AURE (section "Into power hour"; Q3 585 band rank 13; dossier 2045, generated 2026-09-22T10:30:15.455Z)

> No catalyst found in our sources. The September 21, 2026 Form 3 discovery item and the September 11, 2026 Form 6-K do not establish a fresh operating, financing, or commercial event, and the desk does not read the coverage as explaining the move. The structure is caution, with no float the desk can independently verify, 37,600,000 shares outstanding as of June 30, 2026 (the outstanding count, not a float), an ATM known active effective December 23, 2025, registered resale possibly active effective December 23, 2025, PIPE possibly active effective October 10, 2025, and warrants of unknown status effective June 30, 2026; there is no cycle conclusion.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Company name "Aurelion Inc." | HOLDS | avid 2045 companyName="Aurelion Inc." |
| Country (none printed) | HOLDS | avid 2045 country=null |
| Path $1.107 to $1.73 to $1.0831, from prior close | HOLDS | Q3 585 AURE reference_close=1.107, session_high=1.73, price=1.0831, reference_basis=PRIOR_SESSION |
| "No catalyst found in our sources." | HOLDS | avid 2045 catalystStatus=NONE_FOUND, grade NONE; Q3 585 AURE catalyst=NONE |
| Form 3 discovery item | HOLDS | 2045 summary "secondary-discovery listing for a Form 3" |
| Form 3 item dated September 21, 2026 | NOT CHECKABLE | no such date in 2045 summary/unknowns/supply (2026-09-21 appears only as the cycle asOfTradingDate, not shown to the writer); must be a cited source published_at: research_sources 86001 or 64332 |
| Form 6-K dated September 11 | HOLDS | 2045 summary "a September 11 Form 6-K" |
| Year 2026 on that Form 6-K | NOT CHECKABLE | summary gives no year; research_sources 64332 published_at |
| Neither establishes a fresh operating, financing or commercial event | HOLDS | 2045 summary |
| Fit: not read as explaining the move | HOLDS | 2045 plausiblyExplainsMove=false |
| Structure caution | HOLDS | 2045 CAUTION; Q3 585 AURE structure=CAUTION |
| No float the desk can independently verify | HOLDS | 2045 floatConfidence=UNKNOWN |
| 37,600,000 shares outstanding as of June 30, 2026, not a float | HOLDS | 2045 sharesOutstanding=37600000, date 2026-06-30 |
| ATM, known active, effective December 23, 2025 | HOLDS | 2045 supply ATM KNOWN_ACTIVE 2025-12-23 |
| Registered resale, possibly active, effective December 23, 2025 | HOLDS | 2045 supply REGISTERED_RESALE POSSIBLY_ACTIVE 2025-12-23 |
| PIPE, possibly active, effective October 10, 2025 | HOLDS | 2045 supply PIPE POSSIBLY_ACTIVE 2025-10-10 |
| Warrants, unknown status, effective June 30, 2026 | HOLDS | 2045 supply WARRANTS UNKNOWN 2026-06-30 |
| No cycle conclusion | HOLDS | Q3 585 AURE cycle=UNKNOWN |

Misleading: Dossier 2045 was generated 2026-09-22 (cycle as of 2026-09-21), eight days before this checkpoint; "no catalyst found" and the fit are a September 21 read, and the line does not say so.
Misleading: The 37,600,000 figure includes pre-funded and primary warrants (2045 structuralWarnings[1]: "not a clean common-share-only count").

### 11. SEED (section "Into power hour"; Q3 585 band rank 14; dossier 2608, generated 2026-09-30T17:31:22.575Z)

> The September 30, 2026 Form 6-K concerned a disposition of an equity interest in Xinjiang Originbo Seed Limited; secondary coverage described a sale of roughly 70.5% for about $15 million/RMB108 million with a leaseback of production assets, making the desk grade the catalyst moderate / mixed / secondary and read it as plausibly explaining the move that has happened. The structure is dirty float, with no float the desk can independently verify, 11,924,349 shares outstanding as of January 30, 2026 (the outstanding count, not a float), shelf capacity possibly active effective December 19, 2025, and convertibles possibly active effective July 16, 2026. There is no cycle conclusion.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Company name "Origin Agritech LTD" | HOLDS | avid 2608 companyName="Origin Agritech LTD" |
| Country China | HOLDS | avid 2608 country="F4" (EDGAR code, decodes to China) |
| Path $0.932 to $1.12 to $0.78, from prior close | HOLDS | Q3 585 SEED reference_close=0.932, session_high=1.12, price=0.78, reference_basis=PRIOR_SESSION |
| September 30, 2026 Form 6-K | HOLDS | avid 2608 summary; eventTimestamp=2026-09-30T07:08:15Z |
| Disposition of an equity interest in Xinjiang Originbo Seed Limited | HOLDS | 2608 summary |
| Secondary coverage: roughly 70.5% stake for about $15 million / RMB108 million with a leaseback | HOLDS | 2608 summary |
| Graded moderate / mixed / secondary | HOLDS | 2608 catalystGrade=MODERATE_MIXED_SECONDARY; Q3 585 SEED catalyst same |
| Fit: plausibly explaining the move | HOLDS | 2608 plausiblyExplainsMove=true |
| Structure dirty float | HOLDS | 2608 DIRTY_FLOAT; Q3 585 SEED structure=DIRTY_FLOAT |
| No float the desk can independently verify | HOLDS | 2608 floatConfidence=UNKNOWN |
| 11,924,349 shares outstanding as of January 30, 2026, not a float | HOLDS | 2608 sharesOutstanding=11924349, date 2026-01-30 |
| Shelf capacity, possibly active, effective December 19, 2025 | HOLDS | 2608 supply SHELF_CAPACITY POSSIBLY_ACTIVE 2025-12-19 |
| Convertibles, possibly active, effective July 16, 2026 | HOLDS | 2608 supply CONVERTIBLES POSSIBLY_ACTIVE 2026-07-16 |
| No cycle conclusion | HOLDS | Q3 585 SEED cycle=UNKNOWN |

Misleading: Price $0.78 in a $1 to $20 report: admitted by the day latch (Q4 SEED qualified_price=1.01 at 11:09Z), as ruled; nothing beside the name says so.

### 12. HBNB (section "Into power hour"; Q3 585 band rank 16; dossier 2597, generated 2026-09-30T15:32:32.793Z)

> The September 25, 2026 Form 6-K furnished a company announcement, but the supplied exhibit contains only risk-factor language and does not disclose the underlying event, terms, or material figures; the desk grades the catalyst unknown and notes that the September 19–20 secondary articles are not verifiable from supplied excerpts. The structure is caution, with no float the desk can independently verify, 234,032,386 shares outstanding as of December 31, 2025 (the outstanding count, not a float), registered resale possibly active effective June 6, 2025, and acquisition shares of unknown status for 1,987,239 shares. There is no cycle conclusion.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Company name "Hotel101 Global Holdings Corp." | HOLDS | avid 2597 companyName="Hotel101 Global Holdings Corp." |
| Country (none printed) | HOLDS | avid 2597 country=null |
| Path $4.65 to $5.28 to $5.1, from prior close | HOLDS | Q3 585 HBNB reference_close=4.65, session_high=5.28, price=5.1, reference_basis=PRIOR_SESSION |
| September 25, 2026 Form 6-K furnished a company announcement | HOLDS | avid 2597 summary; eventTimestamp=2026-09-25T11:30:14Z |
| Exhibit holds only risk-factor language; no event, terms or figures | HOLDS | 2597 summary |
| Catalyst graded unknown | HOLDS | 2597 catalystGrade=UNKNOWN; Q3 585 HBNB catalyst=UNKNOWN |
| September 19 to 20 secondary articles not verifiable | HOLDS | 2597 summary |
| Structure caution | HOLDS | 2597 CAUTION; Q3 585 HBNB structure=CAUTION |
| No float the desk can independently verify | HOLDS | 2597 floatConfidence=UNKNOWN |
| 234,032,386 shares outstanding as of December 31, 2025, not a float | HOLDS | 2597 sharesOutstanding=234032386, date 2025-12-31 |
| Registered resale, possibly active, effective June 6, 2025 | HOLDS | 2597 supply REGISTERED_RESALE POSSIBLY_ACTIVE 2025-06-06 |
| Acquisition shares, unknown status, 1,987,239 shares | HOLDS | 2597 supply ACQUISITION_SHARES UNKNOWN 1987239 |
| No cycle conclusion | HOLDS | Q3 585 HBNB cycle=UNKNOWN |

### Struck lines

None: diagnostics.run.strikes is empty (12 lines checked, 12 published).

## #588 AFTER_HOURS, 2026-09-30, checkpoint RTH_CLOSE 16:00 ET (completed 20:00:13Z)

Published 2026-10-01T01:26:10.124Z, late=true, headline=null (v5 writes none), watchCount=11. Writer gpt-5.6-luna (prompt 5), checker gpt-5.6-terra (prompt 3).

### Report-level claims

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Names = the in-range top 12 of checkpoint 588 (day latch); 11 published + VBIO struck | HOLDS | Q3 588: TGE 1, CMCT 2, CHGA 3, GOW 4, LGHL 5, CNTB 6, VBIO 7, ANTA 8, BIYA 9, AURE 10, SEED 11 (latch 1.01), HBNB 12 |
| Opening count (watchCount) 11 | HOLDS | 11 distinct tickers survive the strike |
| late = true | HOLDS | published 01:26:10Z = 21:26 ET, after the 20:00 ET serves-by |

### 1. TGE (section "Fresh catalysts"; Q3 588 band rank 1; dossier 2600, generated 2026-09-30T15:59:53.361Z)

> The September 30 results reported US$22.8 million of net profit, EPS of US$0.56, up 366.7%, and US$30.8 million of revenue from contracts with customers, up 35.8%; the desk grades the company-specific release strong and reads it as plausibly explaining the move that has happened. No float the desk can independently verify, with registered resale, possibly active, 57,401,944 shares, effective June 3, 2026, and warrants, possibly active, 16,220,000 shares, effective June 3, 2026. The desk places it at yellow, frontside warning, and the source bundle does not reconcile the differing revenue measures in its primary and secondary coverage.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Fresh catalysts" | HOLDS | 2600 catalystStatus=FRESH_FOUND |
| Company name "Generation Essentials Group" | HOLDS | avid 2600 companyName="Generation Essentials Group" |
| Country Cayman Islands | HOLDS | avid 2600 country="E9" (EDGAR code, decodes to Cayman Islands) |
| Path $0.83 to $1.9 to $1.54, from prior close | HOLDS | Q3 588 TGE reference_close=0.83, session_high=1.9, price=1.54, reference_basis=PRIOR_SESSION |
| September 30 results | HOLDS | avid 2600 eventTimestamp=2026-09-30T09:14:02Z |
| US$22.8 million net profit | HOLDS | 2600 summary |
| EPS US$0.56, up 366.7% | HOLDS | 2600 summary |
| US$30.8 million revenue from contracts with customers, up 35.8% | HOLDS | 2600 summary |
| Company-specific release graded strong | HOLDS | 2600 catalystGrade=STRONG; Q3 588 TGE catalyst=STRONG |
| Fit: plausibly explaining the move | HOLDS | 2600 plausiblyExplainsMove=true |
| No float the desk can independently verify | HOLDS | 2600 floatConfidence=UNKNOWN |
| Registered resale, possibly active, 57,401,944 shares, effective June 3, 2026 | HOLDS | 2600 supply REGISTERED_RESALE |
| Warrants, possibly active, 16,220,000 shares, effective June 3, 2026 | HOLDS | 2600 supply WARRANTS |
| Yellow, frontside warning | HOLDS | Q3 588 TGE cycle=YELLOW_FRONTSIDE_WARNING |
| Bundle does not reconcile the differing revenue measures | HOLDS | 2600 unknowns[0] |

### 2. CNTB (section "Fresh catalysts"; Q3 588 band rank 8; dossier 2613, generated 2026-09-30T18:29:43.342Z)

> The September 30 Phase 2 COPD readout reported an 81% statistically significant reduction in treatment failure through Week 4 versus placebo, plus fewer new moderate-to-severe exacerbations, symptom improvements, and no new safety signals; the desk grades the clinical-data catalyst strong and reads it as plausibly explaining the move that has happened. No float the desk can independently verify, with 62,974,309 shares outstanding as of July 31, 2026 (the outstanding count, not a float), and registered resale, known active, 6,130,000 shares, effective June 1, 2026. The desk places it at no cycle conclusion, with regulatory sufficiency, further trial needs, and commercial value not established.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Fresh catalysts" | HOLDS | 2613 catalystStatus=FRESH_FOUND |
| Company name "Connect Biopharma Holdings Ltd" | HOLDS | avid 2613 companyName="Connect Biopharma Holdings Ltd" |
| Country United States | HOLDS | avid 2613 country="CA" (EDGAR code, decodes to United States) |
| Path $0.992 to $2.08 to $1.1, from prior close | HOLDS | Q3 588 CNTB reference_close=0.992, session_high=2.08, price=1.1, reference_basis=PRIOR_SESSION |
| September 30 Phase 2 COPD readout | HOLDS | avid 2613 summary; eventTimestamp=2026-09-30T07:05:05Z |
| 81% statistically significant reduction in treatment failure through Week 4 vs placebo | HOLDS | 2613 summary |
| Fewer new moderate-to-severe exacerbations, symptom improvements, no new safety signals | HOLDS | 2613 summary |
| Clinical-data catalyst graded strong | HOLDS | 2613 catalystGrade=STRONG; Q3 588 CNTB catalyst=STRONG |
| Fit: plausibly explaining the move | HOLDS | 2613 plausiblyExplainsMove=true |
| No float the desk can independently verify | HOLDS | 2613 floatConfidence=UNKNOWN |
| 62,974,309 shares outstanding as of July 31, 2026, not a float | HOLDS | 2613 sharesOutstanding, date 2026-07-31 |
| Registered resale, known active, 6,130,000 shares, effective June 1, 2026 | HOLDS | 2613 supply REGISTERED_RESALE KNOWN_ACTIVE |
| No cycle conclusion | HOLDS | Q3 588 CNTB cycle=UNKNOWN |
| Regulatory sufficiency, further trials, commercial value not established | HOLDS | 2613 unknowns[0] |

### 3. BIYA (section "Fresh catalysts"; Q3 588 band rank 12; dossier 2616, generated 2026-09-30T19:32:59.644Z)

> The September 29 H1 FY2026 results showed net loss of $2.37 million versus $4.71 million in the comparative period, basic/diluted loss per share of $(0.54) versus $(96.15), and reported sales of $756,805; the desk grades the fresh result moderate / mixed / secondary and reads it as plausibly explaining the move that has happened, while noting ongoing losses and financing-related dilution risk. No float the desk can independently verify, with 1,185,835 shares outstanding as of December 31, 2025 (the outstanding count, not a float), an equity purchase agreement, possibly active, effective March 26, 2026, registered resale, not yet active, 50,000,000 shares, and shelf capacity, not yet active. The desk places it at no cycle conclusion.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Fresh catalysts" | HOLDS | 2616 catalystStatus=FRESH_FOUND |
| Company name "Baiya International Group Inc." | HOLDS | avid 2616 companyName="Baiya International Group Inc." |
| Country Cayman Islands | HOLDS | avid 2616 country="Cayman Islands" |
| Path $2.05 to $3.18 to $1.97, from prior close | HOLDS | Q3 588 BIYA reference_close=2.05, session_high=3.18, price=1.97, reference_basis=PRIOR_SESSION |
| September 29 H1 FY2026 results | HOLDS | avid 2616 summary; eventTimestamp=2026-09-29T16:28:32Z |
| Net loss $2.37 million vs $4.71 million | HOLDS | 2616 summary "Reported net loss was $2.37 million versus $4.71 million" |
| Loss per share $(0.54) vs $(96.15) | HOLDS | 2616 summary |
| Sales $756,805 | HOLDS | 2616 summary ("accompanying coverage reported") |
| Graded moderate / mixed / secondary | HOLDS | 2616 catalystGrade=MODERATE_MIXED_SECONDARY; Q3 588 BIYA catalyst same |
| Fit: plausibly explaining the move | HOLDS | 2616 plausiblyExplainsMove=true |
| Ongoing losses and financing-related dilution risk | HOLDS | 2616 summary and whyTradersMayCare |
| No float the desk can independently verify | HOLDS | 2616 floatConfidence=UNKNOWN |
| 1,185,835 shares outstanding as of December 31, 2025, not a float | HOLDS | 2616 sharesOutstanding=1185835, date 2025-12-31 |
| Equity purchase agreement, possibly active, effective March 26, 2026 | HOLDS | 2616 supply EQUITY_PURCHASE_AGREEMENT POSSIBLY_ACTIVE 2026-03-26 |
| Registered resale, not yet active, 50,000,000 shares | HOLDS | 2616 supply REGISTERED_RESALE NOT_YET_ACTIVE |
| Shelf capacity, not yet active | HOLDS | 2616 supply SHELF_CAPACITY NOT_YET_ACTIVE |
| No cycle conclusion | HOLDS | Q3 588 BIYA cycle=UNKNOWN |

Misleading: Same pre-split share count as #585 (1-for-10 reverse split July 10, 2026, per 2616 structuralWarnings[0]).
Misleading: Country line reads Cayman Islands here (2616 country="Cayman Islands") and United States in #585 (2596 country code NY): same company, two countries, three hours apart.

### 4. SEED (section "Fresh catalysts"; Q3 588 band rank 14; dossier 2608, generated 2026-09-30T17:31:22.575Z)

> The September 30 Form 6-K concerned a disposition of an equity interest in Xinjiang Originbo Seed Limited; secondary reports described a roughly 70.5% stake sale for about $15 million/RMB108 million with a leaseback of production assets, so the desk grades the catalyst moderate / mixed / secondary and reads it as plausibly explaining the move that has happened. No float the desk can independently verify, with 11,924,349 shares outstanding as of January 30, 2026 (the outstanding count, not a float), shelf capacity, possibly active, effective December 19, 2025, and convertibles, possibly active, effective July 16, 2026. The desk places it at no cycle conclusion, and the primary filing excerpt does not provide the transaction terms, conditions, closing status, or accounting impact.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Fresh catalysts" | HOLDS | 2608 catalystStatus=FRESH_FOUND |
| Company name "Origin Agritech LTD" | HOLDS | avid 2608 companyName="Origin Agritech LTD" |
| Country China | HOLDS | avid 2608 country="F4" (EDGAR code, decodes to China) |
| Path $0.932 to $1.12 to $0.7848, from prior close | HOLDS | Q3 588 SEED reference_close=0.932, session_high=1.12, price=0.7848, reference_basis=PRIOR_SESSION |
| September 30 Form 6-K, disposition of an equity interest in Xinjiang Originbo Seed Limited | HOLDS | avid 2608 summary |
| Secondary: roughly 70.5% stake for about $15 million / RMB108 million with leaseback | HOLDS | 2608 summary |
| Graded moderate / mixed / secondary | HOLDS | 2608 catalystGrade; Q3 588 SEED catalyst=MODERATE_MIXED_SECONDARY |
| Fit: plausibly explaining the move | HOLDS | 2608 plausiblyExplainsMove=true |
| No float the desk can independently verify | HOLDS | 2608 floatConfidence=UNKNOWN |
| 11,924,349 shares outstanding as of January 30, 2026, not a float | HOLDS | 2608 sharesOutstanding, date 2026-01-30 |
| Shelf capacity, possibly active, effective December 19, 2025 | HOLDS | 2608 supply SHELF_CAPACITY |
| Convertibles, possibly active, effective July 16, 2026 | HOLDS | 2608 supply CONVERTIBLES |
| No cycle conclusion | HOLDS | Q3 588 SEED cycle=UNKNOWN |
| Primary excerpt lacks terms, conditions, closing status, accounting impact | HOLDS | 2608 unknowns[0] |

Misleading: Price $0.7848 in a $1 to $20 report, admitted by the day latch (Q4 SEED qualified_price=1.01 at 11:09Z), as ruled.

### 5. CMCT (section "Mixed or stale context"; Q3 588 band rank 2; dossier 2593, generated 2026-09-30T14:19:53.881Z)

> The newest company item, at 08:00 ET, September 29, 2026, announced preferred stock dividends, but the evidence provides no dividend amount, payment terms, or economic significance; the desk grades the catalyst unknown and does not read it as explaining the move. No float the desk can independently verify, with 2,947,493 shares outstanding as of August 6, 2026 (the outstanding count, not a float), preferred conversion, known active, 30,555 shares, effective September 9, 2026, preferred conversion, known active, 50,660 shares, effective September 2, 2026, and other issued shares, not yet active, 250,000 shares. The desk places it at no cycle conclusion, with shelf capacity, possibly active, effective November 22, 2022.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Mixed or stale context" | HOLDS | 2593 catalystGrade=UNKNOWN (mixed); status FRESH_FOUND, so "mixed" not "stale" |
| Company name "Creative Media & Community Trust Corp" | HOLDS | avid 2593 companyName="Creative Media & Community Trust Corp" |
| Country United States | HOLDS | avid 2593 country="TX" (EDGAR code, decodes to United States) |
| Path $1.92 to $3.9399 to $2.93, from prior close | HOLDS | Q3 588 CMCT reference_close=1.92, session_high=3.9399, price=2.93, reference_basis=PRIOR_SESSION |
| Newest company item | HOLDS | avid 2593 summary "The newest company item" |
| At 08:00 ET, September 29, 2026 | HOLDS | 2593 eventTimestamp=2026-09-29T12:00:00.000Z = 08:00 ET (exactness: see misleading) |
| Announced preferred stock dividends | HOLDS | 2593 summary |
| No dividend amount, payment terms or economic significance | HOLDS | 2593 summary, unknowns[0] |
| Catalyst graded unknown | HOLDS | 2593 catalystGrade=UNKNOWN; Q3 588 CMCT catalyst=UNKNOWN |
| Fit: not read as explaining the move | HOLDS | 2593 plausiblyExplainsMove=false |
| No float the desk can independently verify | HOLDS | 2593 floatConfidence=UNKNOWN |
| 2,947,493 shares outstanding as of August 6, 2026, not a float | HOLDS | 2593 sharesOutstanding, date 2026-08-06 |
| Preferred conversion, known active, 30,555 shares, effective September 9, 2026 | HOLDS | 2593 supply |
| Preferred conversion, known active, 50,660 shares, effective September 2, 2026 | HOLDS | 2593 supply |
| Other issued shares, not yet active, 250,000 shares | HOLDS | 2593 supply |
| No cycle conclusion | HOLDS | Q3 588 CMCT cycle=UNKNOWN |
| Shelf capacity, possibly active, effective November 22, 2022 | HOLDS | 2593 supply SHELF_CAPACITY |

Misleading: "08:00 ET" is 12:00:00.000Z. Noon-UTC event times recur across dossiers (CMCT, CHGA, DKI, MI), which looks like a date-only placeholder. The writer sheet labels any instant with a clock as "(exact)". Whether 08:00 is real needs research_sources 118584 published_at and precision.

### 6. GOW (section "Mixed or stale context"; Q3 588 band rank 6; dossier 2579, generated 2026-09-30T13:32:34.752Z)

> This is not a fresh catalyst: the September 25 business-combination closing and Nasdaq listing event was accompanied by a preferred-share-and-warrant PIPE; the desk grades the older or secondary news weak / negative / dilutive and reads it as plausibly explaining the move that has happened, while treating financing supply and conversion terms as material structural considerations. No float the desk can independently verify, with pipe, known active, effective September 25, 2026, warrants, possibly active, 980,392 shares, effective August 11, 2026, and other issued shares, possibly active, 18,981,618 shares, effective August 11, 2026. The desk places it at no cycle conclusion, and the PIPE share count, warrant count, exercise prices, conversion mechanics, resale eligibility, and lock-up restrictions are not available.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Mixed or stale context" | HOLDS | 2579 catalystStatus=SECONDARY_STALE |
| Company name "GOWell Energy Technology" | HOLDS | avid 2579 companyName="GOWell Energy Technology" |
| Country (none printed) | HOLDS | avid 2579 country=null |
| Path $1.8099 to $3.47 to $3.16, from prior close | HOLDS | Q3 588 GOW reference_close=1.8099, session_high=3.47, price=3.16, reference_basis=PRIOR_SESSION |
| Not a fresh catalyst | HOLDS | avid 2579 catalystStatus=SECONDARY_STALE |
| September 25 business-combination closing | HOLDS | 2579 summary; eventTimestamp 2026-09-25T20:04:25Z |
| Nasdaq listing event | HOLDS | 2579 summary (trading under GOW scheduled from September 28, see misleading) |
| Accompanied by a preferred-share-and-warrant PIPE | HOLDS | 2579 summary |
| Graded weak / negative / dilutive | HOLDS | 2579 catalystGrade; Q3 588 GOW catalyst=WEAK_NEGATIVE_DILUTIVE |
| Fit: plausibly explaining the move | HOLDS | 2579 plausiblyExplainsMove=true |
| Financing supply and conversion terms are material structural considerations | HOLDS | 2579 whyTradersMayCare |
| No float the desk can independently verify | HOLDS | 2579 floatConfidence=UNKNOWN |
| PIPE, known active, effective September 25, 2026 | HOLDS | 2579 supply PIPE |
| Warrants, possibly active, 980,392 shares, effective August 11, 2026 | HOLDS | 2579 supply WARRANTS |
| Other issued shares, possibly active, 18,981,618 shares, effective August 11, 2026 | HOLDS | 2579 supply OTHER_ISSUED_SHARES |
| No cycle conclusion | HOLDS | Q3 588 GOW cycle=UNKNOWN |
| PIPE share count, warrant count, exercise prices, conversion, resale, lock-up not available | HOLDS | 2579 unknowns[0] |

Misleading: "the September 25 ... Nasdaq listing event": the stored summary dates the closing September 25 and trading under GOW from September 28.

### 7. ANTA (section "Mixed or stale context"; Q3 588 band rank 11; dossier 2560, generated 2026-09-30T11:22:34.367Z)

> This is not a fresh catalyst: the latest identified company event was the August 19 Q2 2026 earnings release, which carried adverse earnings, guidance, and loan-metric context; the desk grades it moderate / mixed / secondary and does not read it as explaining the move. No float the desk can independently verify, with 23,980,257 shares outstanding as of December 31, 2025 (the outstanding count, not a float), and shelf capacity, possibly active, effective August 11, 2026. The desk places it at no cycle conclusion, with no newer company-specific catalyst after the August 20 filing in the collected sources.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Mixed or stale context" | HOLDS | 2560 catalystStatus=SECONDARY_STALE |
| Company name "Antalpha Platform Holding Co" | HOLDS | avid 2560 companyName="Antalpha Platform Holding Co" |
| Country (none printed) | HOLDS | avid 2560 country=null |
| Path $2.29 to $3.49 to $2.56, from prior close | HOLDS | Q3 588 ANTA reference_close=2.29, session_high=3.49, price=2.56, reference_basis=PRIOR_SESSION |
| Not a fresh catalyst | HOLDS | avid 2560 catalystStatus=SECONDARY_STALE |
| August 19 Q2 2026 earnings release | HOLDS | 2560 summary; eventTimestamp 2026-08-19T07:01:21Z |
| Adverse earnings, guidance and loan-metric context | HOLDS | 2560 summary |
| Graded moderate / mixed / secondary | HOLDS | 2560 catalystGrade; Q3 588 ANTA catalyst=MODERATE_MIXED_SECONDARY |
| Fit: not read as explaining the move | HOLDS | 2560 plausiblyExplainsMove=false |
| No float the desk can independently verify | HOLDS | 2560 floatConfidence=UNKNOWN |
| 23,980,257 shares outstanding as of December 31, 2025, not a float | HOLDS | 2560 sharesOutstanding, date 2025-12-31 |
| Shelf capacity, possibly active, effective August 11, 2026 | HOLDS | 2560 supply SHELF_CAPACITY |
| No cycle conclusion | HOLDS | Q3 588 ANTA cycle=UNKNOWN |
| No newer company-specific catalyst after the August 20 filing | HOLDS | 2560 unknowns[1] |

### 8. HBNB (section "Mixed or stale context"; Q3 588 band rank 16; dossier 2597, generated 2026-09-30T15:32:32.793Z)

> This is not a fresh catalyst: a September 25 Form 6-K furnished an announcement whose available exhibit excerpt contains only risk-factor language, while the secondary September 19–20 articles cannot be verified from supplied excerpts; the desk grades the catalyst unknown. No float the desk can independently verify, with 234,032,386 shares outstanding as of December 31, 2025 (the outstanding count, not a float), registered resale, possibly active, effective June 6, 2025, and acquisition shares, unknown, 1,987,239 shares. The desk places it at no cycle conclusion, and the underlying company announcement is not disclosed.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Mixed or stale context" | HOLDS | 2597 catalystStatus=SECONDARY_STALE |
| Company name "Hotel101 Global Holdings Corp." | HOLDS | avid 2597 companyName="Hotel101 Global Holdings Corp." |
| Country (none printed) | HOLDS | avid 2597 country=null |
| Path $4.65 to $5.28 to $5.01, from prior close | HOLDS | Q3 588 HBNB reference_close=4.65, session_high=5.28, price=5.01, reference_basis=PRIOR_SESSION |
| Not a fresh catalyst | HOLDS | avid 2597 catalystStatus=SECONDARY_STALE |
| September 25 Form 6-K furnished an announcement; excerpt is risk-factor language only | HOLDS | 2597 summary; eventTimestamp 2026-09-25T11:30:14Z |
| September 19 to 20 secondary articles unverifiable | HOLDS | 2597 summary |
| Catalyst graded unknown | HOLDS | 2597 catalystGrade=UNKNOWN; Q3 588 HBNB catalyst=UNKNOWN |
| No float the desk can independently verify | HOLDS | 2597 floatConfidence=UNKNOWN |
| 234,032,386 shares outstanding as of December 31, 2025, not a float | HOLDS | 2597 sharesOutstanding, date 2025-12-31 |
| Registered resale, possibly active, effective June 6, 2025 | HOLDS | 2597 supply REGISTERED_RESALE |
| Acquisition shares, unknown, 1,987,239 shares | HOLDS | 2597 supply ACQUISITION_SHARES |
| No cycle conclusion | HOLDS | Q3 588 HBNB cycle=UNKNOWN |
| Underlying announcement not disclosed | HOLDS | 2597 unknowns[0] |

### 9. CHGA (section "No clear catalyst"; Q3 588 band rank 3; dossier 2609, generated 2026-09-30T17:31:29.840Z)

> The September 29 proxy called a special stockholder meeting and secondary coverage described multiple issuance proposals, while the effective September prospectus registered up to 5,000,000 ELOC put shares at a fixed $2.00 per share; the desk grades this moderate / mixed / secondary and does not read it as explaining the move. No float the desk can independently verify, with an equity purchase agreement, known active, 5,000,000 shares, effective September 18, 2026, and warrants, possibly active, 1,000,000 shares, plus warrants, possibly active, 1,000,000 shares. The desk places it at no cycle conclusion, and the evidence does not establish approval, issuance, or sales of the registered shares.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "No clear catalyst" | HOLDS | 2609 plausiblyExplainsMove=false (status is FRESH_FOUND, see misleading) |
| Company name "Change Agents Corporation." | HOLDS | avid 2609 companyName="Change Agents Corporation." |
| Country (none printed) | HOLDS | avid 2609 country=null |
| Path $1.96 to $3.6199 to $2.42, from prior close | HOLDS | Q3 588 CHGA reference_close=1.96, session_high=3.6199, price=2.42, reference_basis=PRIOR_SESSION |
| September 29 proxy called a special stockholder meeting | HOLDS | avid 2609 summary |
| Secondary coverage: multiple issuance proposals | HOLDS | 2609 summary |
| Effective September prospectus, up to 5,000,000 ELOC put shares at fixed $2.00 | HOLDS | 2609 summary |
| Graded moderate / mixed / secondary | HOLDS | 2609 catalystGrade; Q3 588 CHGA catalyst=MODERATE_MIXED_SECONDARY |
| Fit: not read as explaining the move | HOLDS | 2609 plausiblyExplainsMove=false |
| No float the desk can independently verify | HOLDS | 2609 floatConfidence=LOW |
| Equity purchase agreement, known active, 5,000,000 shares, effective September 18, 2026 | HOLDS | 2609 supply |
| Warrants, possibly active, 1,000,000 shares (twice) | HOLDS | 2609 supply WARRANTS x2 |
| No cycle conclusion | HOLDS | Q3 588 CHGA cycle=UNKNOWN |
| Evidence does not establish approval, issuance or sales | HOLDS | 2609 whyTradersMayCare |

Misleading: Filed under "No clear catalyst" although the stored status is FRESH_FOUND and the line itself names a fresh proxy graded moderate. True of the fit (false), but the heading reads as "nothing found".

### 10. LGHL (section "No clear catalyst"; Q3 588 band rank 7; dossier 2614, generated 2026-09-30T18:31:39.273Z)

> The September 30 disclosure described the sale of all Solana and part of the Bitcoin holdings to acquire approximately 38,102 HYPE tokens, bringing total HYPE holdings to approximately 232,900 tokens valued around $20.1 million; a September 29 senior secured convertible note added potential dilution, so the desk grades the catalyst moderate / mixed / secondary and reads it as plausibly explaining the move that has happened. No float the desk can independently verify, with convertibles, known active, effective September 28, 2026. The desk places it at red, backside, and the name was halted at this checkpoint; the conversion mechanics and potential share count are not available.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "No clear catalyst" | WRONG | avid 2614 catalystStatus=FRESH_FOUND, plausiblyExplainsMove=true; the line under it says the desk reads the disclosure as plausibly explaining the move |
| Company name "Lion Group Holding Ltd" | HOLDS | avid 2614 companyName="Lion Group Holding Ltd" |
| Country Cayman Islands | HOLDS | avid 2614 country="Cayman Islands" |
| Path $4.51 to $9.79 to $5.31, from prior close | HOLDS | Q3 588 LGHL reference_close=4.51, session_high=9.79, price=5.31, reference_basis=PRIOR_SESSION |
| September 30 disclosure | HOLDS | avid 2614 eventTimestamp=2026-09-30T09:15:01Z |
| Sold all Solana and part of Bitcoin; about 38,102 HYPE acquired | HOLDS | 2614 summary |
| Total about 232,900 HYPE, about $20.1 million | HOLDS | 2614 summary |
| Senior secured convertible note added potential dilution | HOLDS | 2614 summary |
| Note dated September 29 | NOT CHECKABLE | 2614 summary says only "one day earlier" than the September 30 disclosure; the deterministic trace passed it, so a cited source was published September 29 ET: research_sources 119541, 119558, 114766, 114783 |
| Graded moderate / mixed / secondary | HOLDS | 2614 catalystGrade=MODERATE_MIXED_SECONDARY; Q3 588 LGHL catalyst same |
| Fit: plausibly explaining the move | HOLDS | 2614 plausiblyExplainsMove=true |
| No float the desk can independently verify | HOLDS | 2614 floatConfidence=UNKNOWN |
| Convertibles, known active, effective September 28, 2026 | HOLDS | 2614 supply CONVERTIBLES KNOWN_ACTIVE 2026-09-28 |
| Red, backside | HOLDS | Q3 588 LGHL cycle=RED_BACKSIDE |
| Halted at this checkpoint | HOLDS | Q3 588 LGHL halt_state=HALTED |
| Conversion mechanics and potential share count not available | HOLDS | 2614 unknowns[2] |

Misleading: One line gives the note two dates: "a September 29 ... convertible note" and "convertibles, known active, effective September 28, 2026" (2614 supply; 2610 says the debenture was issued September 28). September 29 is at best the disclosure date.

### 11. AURE (section "No clear catalyst"; Q3 588 band rank 13; dossier 2045, generated 2026-09-22T10:30:15.455Z)

> No catalyst found in our sources. No float the desk can independently verify, with 37,600,000 shares outstanding as of June 30, 2026 (the outstanding count, not a float), atm, known active, effective December 23, 2025, registered resale, possibly active, effective December 23, 2025, pipe, possibly active, effective October 10, 2025, and warrants, unknown, effective June 30, 2026. The desk places it at no cycle conclusion, and the bundle does not establish a fresh company event or the live-demand conditions needed to classify the move as flow-dominant.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "No clear catalyst" | HOLDS | 2045 catalystStatus=NONE_FOUND |
| Company name "Aurelion Inc." | HOLDS | avid 2045 companyName="Aurelion Inc." |
| Country (none printed) | HOLDS | avid 2045 country=null |
| Path $1.107 to $1.73 to $1.12, from prior close | HOLDS | Q3 588 AURE reference_close=1.107, session_high=1.73, price=1.12, reference_basis=PRIOR_SESSION |
| "No catalyst found in our sources." | HOLDS | avid 2045 catalystStatus=NONE_FOUND; Q3 588 AURE catalyst=NONE |
| No float the desk can independently verify | HOLDS | 2045 floatConfidence=UNKNOWN |
| 37,600,000 shares outstanding as of June 30, 2026, not a float | HOLDS | 2045 sharesOutstanding, date 2026-06-30 |
| ATM, known active, effective December 23, 2025 | HOLDS | 2045 supply ATM |
| Registered resale, possibly active, effective December 23, 2025 | HOLDS | 2045 supply REGISTERED_RESALE |
| PIPE, possibly active, effective October 10, 2025 | HOLDS | 2045 supply PIPE |
| Warrants, unknown, effective June 30, 2026 | HOLDS | 2045 supply WARRANTS |
| No cycle conclusion | HOLDS | Q3 588 AURE cycle=UNKNOWN |
| No fresh company event; live-demand conditions for flow-dominant not established | HOLDS | 2045 whyTradersMayCare |

Misleading: Same as #585: an eight-day-old dossier (generated 2026-09-22), and a share count that includes warrants.

### Struck lines

Strike S1L3, reason UNSUPPORTED, by model. Checker's stated reason, verbatim: "VBIO's catalyst is graded legitimate positive, not moderate / mixed / secondary."

The struck text itself is not stored: diagnostics carry only id, reason, by and detail, and the payload drops struck lines. What follows is what the stored rows say about the claim the checker named.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Line is about VBIO (draft section 1 line 3, between CNTB and BIYA) | HOLDS | the detail names VBIO; VBIO is the only in-range name (Q3 588 rank 7) missing from the published lines |
| (Inferred from the detail) VBIO graded moderate / mixed / secondary | WRONG | avid 2615 catalystGrade=LEGITIMATE_POSITIVE; Q3 588 VBIO catalyst=LEGITIMATE_POSITIVE; the earlier 2587 is also LEGITIMATE_POSITIVE, so no stored version supports the grade |

Verdict: RIGHT strike. No stored version of the VBIO dossier grades it moderate / mixed / secondary, so a line that did was unsupported. This is a writer error. The cost: VBIO (#7 in range, cycle YELLOW_FRONTSIDE_WARNING, a fresh catalyst) is absent from the report, and nothing tells the reader a name was removed.

## #591 PREMARKET for 2026-10-01, checkpoint NEXT_DAY_RECAP 22:00 ET (completed 02:00:14Z Oct 1)

Published 2026-10-01T02:01:10.160Z, late=false, headline=null (v5 writes none), watchCount=11. Writer gpt-5.6-luna (prompt 5), checker gpt-5.6-terra (prompt 3).

### Report-level claims

| Claim | Verdict | Stored value |
| --- | --- | --- |
| TGE, NCNA, LPA, DKI, CMCT, PWCM, CHGA, GOW, CTHH, CTGG are in range and inside the in-range top 12 | HOLDS | Q3 591 prices all within $1 to $20; with MI and HIT latched (see MI line and the struck line) the in-range order is TGE 1, HIT 2, NCNA 3, LPA 4, DKI 5, CMCT 6, MI 7, PWCM 8, CHGA 9, GOW 10, CTHH 11, CTGG 12 (BEPI 13 is cut by the cap). AHG (Q4 ah_qualification_price 0.9111), LESL (0.25) excluded correctly; MYND (not in Q4) cannot have latched in range, Q3 ah_high=0.47 |
| Opening count (watchCount) 11 | HOLDS | 11 distinct tickers survive the strike |
| late = false | HOLDS | published 02:01:10Z = 22:01 ET Sep 30, before the 04:00 ET Oct 1 serves-by |

### 1. TGE (section "Fresh and material news"; Q3 591 band rank 1; dossier 2624, generated 2026-10-01T01:09:05.170Z)

> A September 30 company filing reported unaudited 1H 2026 results with US$22.8 million net profit, EPS of US$0.56, revenue from contracts with customers up 35.8% to US$30.8 million, and hospitality revenue up 59.8%; secondary coverage gave a different sales measure of $65.864 million versus $87.429 million. The desk grades the fresh, news-driven catalyst strong and reads it as plausibly explaining the move that has happened, while noting that the revenue measures are not reconciled and the results are unaudited. The desk cannot independently verify float; caution structure includes registered resale, possibly active, 57,401,944 shares, effective June 3, 2026, and warrants, possibly active, 16,220,000 shares, effective June 3, 2026. The sheet places the name at a yellow, frontside warning.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Fresh and material news" | HOLDS | 2624 catalystStatus=FRESH_FOUND, grade STRONG |
| Company name "Generation Essentials Group" | HOLDS | avid 2624 companyName="Generation Essentials Group" |
| Country (none printed) | HOLDS | avid 2624 country=null |
| Business description | HOLDS | avid 2624 businessDescription (verbatim) |
| Path $1.55 to $2.07 to $1.57, from today's close | HOLDS | Q4 TGE ah_reference_close=1.55, ah_high=2.07; Q3 591 price=1.57 at 2026-09-30T23:59:59.900Z (inside 16:00 to 20:00 ET); basis CURRENT_SESSION |
| September 30 company filing | HOLDS | avid 2624 summary "furnished"; eventTimestamp 2026-09-30T09:14:02Z |
| Unaudited 1H 2026 results | HOLDS | 2624 summary, unknowns[1] |
| US$22.8 million net profit; EPS US$0.56 | HOLDS | 2624 summary |
| Revenue from contracts with customers up 35.8% to US$30.8 million | HOLDS | 2624 summary |
| Hospitality revenue up 59.8% | HOLDS | 2624 summary |
| Secondary sales measure $65.864 million vs $87.429 million | HOLDS | 2624 summary |
| Fresh, news-driven, graded strong | HOLDS | 2624 FRESH_FOUND / NEWS_DRIVEN / STRONG; Q3 591 TGE catalyst=STRONG |
| Fit: plausibly explaining the move | HOLDS | 2624 plausiblyExplainsMove=true |
| Revenue measures not reconciled; results unaudited | HOLDS | 2624 unknowns |
| Desk cannot independently verify float | HOLDS | 2624 floatConfidence=UNKNOWN |
| Caution structure | HOLDS | 2624 CAUTION; Q3 591 TGE structure=CAUTION |
| Registered resale, possibly active, 57,401,944 shares, effective June 3, 2026 | HOLDS | 2624 supply REGISTERED_RESALE |
| Warrants, possibly active, 16,220,000 shares, effective June 3, 2026 | HOLDS | 2624 supply WARRANTS |
| Yellow, frontside warning | HOLDS | Q3 591 TGE cycle=YELLOW_FRONTSIDE_WARNING |

Misleading: Company line business text prints a raw citation, "[Source 115982]", and 115982 is not among dossier 2624 source_ids [119113,118074,119118,115970,115972,119098].
Misleading: Country drops from Cayman Islands (#585, #588, dossier 2600 code E9) to none (2624 country=null).

### 2. NCNA (section "Fresh and material news"; Q3 591 band rank 3; dossier 2622, generated 2026-09-30T20:21:24.142Z)

> The company reported that the European Patent Office granted a composition-of-matter patent covering NUC-7738, an anti-cancer agent in the Phase 2 portion of the NuTide:701 study with Keytruda, and described the portfolio as having more than 85 issued patents worldwide. The desk grades the fresh, news-driven catalyst legitimate positive and reads it as plausibly explaining the move that has happened, while noting that the evidence provides no new clinical data or economic valuation. The desk cannot independently verify float; 20,809,854,947 as of December 31, 2025 is the outstanding count, not a float, with caution structure, atm, known active, effective June 24, 2025, shelf capacity, known active, effective June 24, 2025, and three warrant lines, possibly active, for 10,845,985 shares, 10,845,985 shares, and 8,393,050 shares. The sheet places the name at green, fresh / frontside.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Fresh and material news" | HOLDS | 2622 catalystStatus=FRESH_FOUND |
| Company name "NuCana plc" | HOLDS | avid 2622 companyName="NuCana plc" |
| Country United Kingdom | HOLDS | avid 2622 country="X0" (EDGAR code, decodes to United Kingdom) |
| Path $1.35 to $1.68 to $1.3101, from today's close | HOLDS | not in Q4 (production read ticker_session); equals the frozen Q3 591 NCNA ah_reference_close=1.35, ah_high=1.68, price=1.3101 at 2026-09-30T23:59:52.781Z; basis CURRENT_SESSION |
| European Patent Office granted a composition-of-matter patent covering NUC-7738 | HOLDS | avid 2622 summary |
| Anti-cancer agent in the Phase 2 portion of NuTide:701 with Keytruda | HOLDS | 2622 summary |
| More than 85 issued patents worldwide | HOLDS | 2622 summary |
| Fresh, news-driven, graded legitimate positive | HOLDS | 2622 FRESH_FOUND / NEWS_DRIVEN / LEGITIMATE_POSITIVE; Q3 591 NCNA catalyst same |
| Fit: plausibly explaining the move | HOLDS | 2622 plausiblyExplainsMove=true |
| No new clinical data or economic valuation | HOLDS | 2622 whyTradersMayCare, unknowns[0] |
| Desk cannot independently verify float | HOLDS | 2622 floatConfidence=UNKNOWN |
| 20,809,854,947 outstanding as of December 31, 2025, not a float | HOLDS | 2622 sharesOutstanding=20809854947, date 2025-12-31 |
| Caution structure | HOLDS | 2622 CAUTION; Q3 591 NCNA structure=CAUTION |
| ATM, known active, effective June 24, 2025 | HOLDS | 2622 supply ATM KNOWN_ACTIVE 2025-06-24 |
| Shelf capacity, known active, effective June 24, 2025 | HOLDS | 2622 supply SHELF_CAPACITY KNOWN_ACTIVE 2025-06-24 |
| Three warrant lines, possibly active: 10,845,985, 10,845,985, 8,393,050 shares | HOLDS | 2622 supply WARRANTS x3 |
| Green, fresh / frontside | HOLDS | Q3 591 NCNA cycle=GREEN_FRESH_FRONTSIDE |

Misleading: 20,809,854,947 is the ORDINARY share count; NCNA trades as ADSs and the dossier warns it "may not be directly comparable with ADS-denominated instruments without an ADS ratio reconciliation" (2622 structuralWarnings[0]). Beside a $1.31 ADS price it overstates the share base by the ADS ratio.

### 3. LPA (section "Fresh and material news"; Q3 591 band rank 4; dossier 2623, generated 2026-09-30T20:25:27.388Z)

> Secondary coverage reported the closing of the Parque Logístico Lima Sur sale to FIBRA Prime for $145 million. The desk grades the fresh, news-driven catalyst moderate / mixed / secondary and reads it as plausibly explaining the move that has happened, but no primary company release or SEC exhibit confirming the September 30 closing is in the collected sources. The desk cannot independently verify float; structure is unknown, and the evidence does not establish final net proceeds, taxes, debt repayment amount, or redeployment terms. No cycle conclusion is on file.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Fresh and material news" | HOLDS | 2623 catalystStatus=FRESH_FOUND |
| Company name "Logistic Properties of the Americas" | HOLDS | avid 2623 companyName="Logistic Properties of the Americas" |
| Country (none printed) | HOLDS | avid 2623 country=null |
| Path $2.86 to $3.5 to $3.2631, from today's close | HOLDS | not in Q4 (production read ticker_session); equals the frozen Q3 591 LPA ah_reference_close=2.86, ah_high=3.5, price=3.2631 at 2026-09-30T23:59:55.210Z; basis CURRENT_SESSION |
| Secondary coverage: closing of Parque Logistico Lima Sur sale to FIBRA Prime for $145 million | HOLDS | avid 2623 summary |
| Fresh, news-driven, graded moderate / mixed / secondary | HOLDS | 2623 FRESH_FOUND / NEWS_DRIVEN / MODERATE_MIXED_SECONDARY; Q3 591 LPA catalyst same |
| Fit: plausibly explaining the move | HOLDS | 2623 plausiblyExplainsMove=true |
| No primary release or SEC exhibit confirming the September 30 closing | HOLDS | 2623 unknowns[0] |
| Desk cannot independently verify float | HOLDS | 2623 floatConfidence=UNKNOWN |
| Structure unknown | HOLDS | 2623 structureClassification=UNKNOWN; Q3 591 LPA structure=UNKNOWN |
| Final net proceeds, taxes, debt repayment, redeployment not established | HOLDS | 2623 unknowns[1] |
| No cycle conclusion on file | HOLDS | Q3 591 LPA cycle=UNKNOWN |

### 4. DKI (section "Fresh and material news"; Q3 591 band rank 5; dossier 2625, generated 2026-10-01T01:10:13.383Z)

> A September 30 business update described Cine3.AI expansion preparations, a North American operating hub, and interactive-entertainment development without a signed contract or quantified commercial result; the same day, an F-1 described a proposed offering of up to 4,166,666 units or pre-funded units, each with a warrant. The desk grades the conflicting, news-driven catalyst weak / negative / dilutive and reads it as plausibly explaining the move that has happened, with the proposed offering creating substantial potential new share supply. The desk cannot independently verify float; dirty-float structure includes a recent offering, not yet active, 4,166,666 shares, warrants, not yet active, 4,166,666 shares, pipe, unknown, and other issued shares, possibly active, 2,400,000 shares, effective August 18, 2025; 2,097,587 as of September 15, 2026 is the outstanding count, not a float. The sheet places the name at red, backside, with most of the advance given back.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Fresh and material news" | HOLDS | 2625 freshness=FRESH (status CONFLICTING) |
| Company name "DarkIris Inc." | HOLDS | avid 2625 companyName="DarkIris Inc." |
| Country Cayman Islands | HOLDS | avid 2625 country="Cayman Islands" |
| Business description | HOLDS | avid 2625 businessDescription (verbatim) |
| Path $1.57 to $2.37 to $1.435, from today's close | HOLDS | Q4 DKI ah_reference_close=1.57, ah_high=2.37; Q3 591 price=1.435 at 2026-09-30T23:59:00.000Z (inside 16:00 to 20:00 ET); basis CURRENT_SESSION |
| September 30 business update | HOLDS | avid 2625 summary; eventTimestamp 2026-09-30T12:00:00Z |
| Cine3.AI expansion preparations, North American hub, interactive entertainment | HOLDS | 2625 summary |
| No signed contract or quantified commercial result | HOLDS | 2625 summary |
| Same day, F-1 for up to 4,166,666 units or pre-funded units, each with a warrant | HOLDS | 2625 summary |
| Conflicting, news-driven, graded weak / negative / dilutive | HOLDS | 2625 CONFLICTING / NEWS_DRIVEN / WEAK_NEGATIVE_DILUTIVE; Q3 591 DKI catalyst same |
| Fit: plausibly explaining the move | HOLDS | 2625 plausiblyExplainsMove=true |
| Proposed offering creates substantial potential new share supply | HOLDS | 2625 summary |
| Desk cannot independently verify float | HOLDS | 2625 floatConfidence=UNKNOWN |
| Dirty-float structure | HOLDS | 2625 DIRTY_FLOAT; Q3 591 DKI structure=DIRTY_FLOAT |
| Recent offering, not yet active, 4,166,666 shares | HOLDS | 2625 supply RECENT_OFFERING NOT_YET_ACTIVE |
| Warrants, not yet active, 4,166,666 shares | HOLDS | 2625 supply WARRANTS NOT_YET_ACTIVE |
| PIPE, unknown | HOLDS | 2625 supply PIPE UNKNOWN |
| Other issued shares, possibly active, 2,400,000 shares, effective August 18, 2025 | HOLDS | 2625 supply OTHER_ISSUED_SHARES 2025-08-18T20:30:48Z (16:30 ET Aug 18) |
| 2,097,587 outstanding as of September 15, 2026, not a float | HOLDS | 2625 sharesOutstanding=2097587, date 2026-09-15 |
| Red, backside, most of the advance given back | HOLDS | Q3 591 DKI cycle=RED_BACKSIDE |

Misleading: Company line business text prints raw citation ids "[96174, 96176, 119985]".

### 5. CMCT (section "Fresh and material news"; Q3 591 band rank 6; dossier 2593, generated 2026-09-30T14:19:53.881Z)

> The newest company item was a September 29 announcement declaring preferred stock dividends, but the supplied evidence has no dividend amount, record date, payment date, or other terms. The desk grades the fresh catalyst unknown and reads it as insufficient to explain the move. The desk cannot independently verify float; dirty-float structure includes preferred conversion, known active, 30,555 shares, effective September 9, 2026, preferred conversion, known active, 50,660 shares, effective September 2, 2026, other issued shares, not yet active, 250,000 shares, and shelf capacity, possibly active, effective November 22, 2022; 2,947,493 as of August 6, 2026 is the outstanding count, not a float. No cycle conclusion is on file.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Fresh and material news" | WRONG | for CMCT "material" contradicts avid 2593: catalystGrade=UNKNOWN and summary "does not establish that this routine-looking declaration is material"; the line under it says the news is insufficient to explain the move |
| Company name "Creative Media & Community Trust Corp" | HOLDS | avid 2593 companyName="Creative Media & Community Trust Corp" |
| Country United States | HOLDS | avid 2593 country="TX" (EDGAR code, decodes to United States) |
| Path $2.93 to $3.14 to $2.8, from today's close | HOLDS | Q4 CMCT ah_reference_close=2.93, ah_high=3.14; Q3 591 price=2.8 at 2026-09-30T23:59:55.419Z (inside 16:00 to 20:00 ET); basis CURRENT_SESSION |
| Newest company item: September 29 announcement declaring preferred dividends | HOLDS | avid 2593 summary |
| No dividend amount, record date, payment date or other terms | HOLDS | 2593 summary |
| Fresh catalyst graded unknown | HOLDS | 2593 FRESH_FOUND / UNKNOWN; Q3 591 CMCT catalyst=UNKNOWN |
| Fit: insufficient to explain the move | HOLDS | 2593 plausiblyExplainsMove=false |
| Desk cannot independently verify float | HOLDS | 2593 floatConfidence=UNKNOWN |
| Dirty-float structure | HOLDS | 2593 DIRTY_FLOAT; Q3 591 CMCT structure=DIRTY_FLOAT |
| Preferred conversion, known active, 30,555 shares, effective September 9, 2026 | HOLDS | 2593 supply |
| Preferred conversion, known active, 50,660 shares, effective September 2, 2026 | HOLDS | 2593 supply |
| Other issued shares, not yet active, 250,000 shares | HOLDS | 2593 supply |
| Shelf capacity, possibly active, effective November 22, 2022 | HOLDS | 2593 supply |
| 2,947,493 outstanding as of August 6, 2026, not a float | HOLDS | 2593 sharesOutstanding, date 2026-08-06 |
| No cycle conclusion on file | HOLDS | Q3 591 CMCT cycle=UNKNOWN |

### 6. MI (section "Fresh and material news"; Q3 591 band rank 7; dossier 708, generated 2026-08-28T10:15:12.243Z)

> The most recent material company-specific event in the record is an effective F-1 followed by an August 24 prospectus for a best-efforts unit offering, describing 279,600 units at $4.60 per unit, plus 158,357 pre-funded-warrant shares and 437,957 common-warrant shares. The desk grades the financing-related, news-driven catalyst weak / negative / dilutive and reads it as plausibly explaining the move that has happened; the documents establish an offering process but not completed sales. The desk cannot independently verify float; caution structure includes a recent offering, possibly active, 279,600 shares, effective August 21, 2026, warrants, possibly active, 158,357 shares, effective August 21, 2026, warrants, possibly active, 437,957 shares, effective August 21, 2026, a recent offering, known active, 720,779 shares, effective March 11, 2026, warrants, possibly active, 3,439,689 shares, effective November 28, 2025, and shelf capacity, possibly active, effective November 28, 2025; 14,318,410 as of December 31, 2025 is the outstanding count, not a float. No cycle conclusion is on file.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Fresh and material news" | HOLDS | avid 708 catalystStatus=FRESH_FOUND, freshness RECENT, summary "most recent material company-specific event" (all as of 2026-08-28, see misleading) |
| Company name "NFT Ltd" | HOLDS | avid 708 companyName="NFT Ltd" |
| Country Hong Kong | HOLDS | avid 708 country="K3" (EDGAR code, decodes to Hong Kong) |
| Path $2.16 to $2.4245 to $0.82, from today's close | HOLDS | not in Q4 (production read ticker_session); equals the frozen Q3 591 MI ah_reference_close=2.16, ah_high=2.4245, price=0.82 at 2026-09-30T23:59:00.000Z; basis CURRENT_SESSION |
| Most recent material company-specific event in the record | HOLDS | avid 708 summary |
| Effective F-1, then an August 24 prospectus for a best-efforts unit offering | HOLDS | 708 summary; eventTimestamp 2026-08-24T12:00:00Z |
| 279,600 units at $4.60 per unit | HOLDS | 708 summary |
| 158,357 pre-funded-warrant shares and 437,957 common-warrant shares | HOLDS | 708 summary |
| Financing-related, news-driven, graded weak / negative / dilutive | HOLDS | 708 NEWS_DRIVEN / WEAK_NEGATIVE_DILUTIVE; summary "financing/supply event"; Q3 591 MI catalyst same |
| Fit: plausibly explaining the move | HOLDS | 708 plausiblyExplainsMove=true |
| Offering process established, not completed sales | HOLDS | 708 whyTradersMayCare |
| Desk cannot independently verify float | HOLDS | 708 floatConfidence=UNKNOWN |
| Caution structure | HOLDS | 708 CAUTION; Q3 591 MI structure=CAUTION |
| Recent offering, possibly active, 279,600 shares, effective August 21, 2026 | HOLDS | 708 supply |
| Warrants, possibly active, 158,357 shares, effective August 21, 2026 | HOLDS | 708 supply |
| Warrants, possibly active, 437,957 shares, effective August 21, 2026 | HOLDS | 708 supply |
| Recent offering, known active, 720,779 shares, effective March 11, 2026 | HOLDS | 708 supply |
| Warrants, possibly active, 3,439,689 shares, effective November 28, 2025 | HOLDS | 708 supply |
| Shelf capacity, possibly active, effective November 28, 2025 | HOLDS | 708 supply |
| 14,318,410 outstanding as of December 31, 2025, not a float | HOLDS | 708 sharesOutstanding, date 2025-12-31 |
| No cycle conclusion on file | HOLDS | Q3 591 MI cycle=UNKNOWN |
| MI belongs in this $1 to $20 report at $0.82 (latch) | NOT CHECKABLE | admitted only by the evening latch; MI is not in Q4, so ticker_session ah_qualification_price / ah_qualified_at for MI are needed (Q3 591 MI ah_high=2.4245 shows it traded inside the range after hours) |

Misleading: Dossier 708 was generated 2026-08-28, 33 days before this checkpoint. "Fresh and material news", "most recent ... event in the record" and "plausibly explaining the move that has happened" are all August judgements. On the night it is printed, MI fell 62% after hours (Q3 591 ah_percent_change=-62.04, path 2.16 to 0.82), which the line never mentions.
Misleading: The 14,318,410 count predates the March 2026 issuance and the August offering, and a 1-for-5 to 1-for-200 consolidation was authorised (708 structuralWarnings[0], reverseSplitHistory).

### 7. PWCM (section "Fresh and material news"; Q3 591 band rank 9; dossier 2627, generated 2026-10-01T01:12:10.449Z)

> The company reported that its subsidiary fully repaid and terminated the Bitcoin-backed Arch Lending credit facility, released Bitcoin collateral, and achieved an approximately 94% reduction in total debt; the release described Mississippi expansion and an Oklahoma fleet upgrade expected to raise active mining hash rate 25% to approximately 964 PH/s. The desk grades the fresh, news-driven catalyst strong and reads it as plausibly explaining the move that has happened, while noting that the cash source for repayment and remaining total debt are not stated in the cited excerpt. The desk cannot independently verify float; structure is unknown, with warrants, unknown, and convertibles, unknown; 2,421,472 as of August 31, 2026 is the outstanding count, not a float. No cycle conclusion is on file.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Fresh and material news" | HOLDS | 2627 catalystStatus=FRESH_FOUND, grade STRONG |
| Company name "POWERCOMPUTE, INC." | HOLDS | avid 2627 companyName="POWERCOMPUTE, INC." |
| Country United States | HOLDS | avid 2627 country="FL" (EDGAR code, decodes to United States) |
| Business description | HOLDS | avid 2627 businessDescription (verbatim) |
| Path $1.13 to $1.52 to $1.04, from today's close | HOLDS | Q4 PWCM ah_reference_close=1.13, ah_high=1.52; Q3 591 price=1.04 at 2026-09-30T23:59:00.000Z (inside 16:00 to 20:00 ET); basis CURRENT_SESSION |
| Subsidiary fully repaid and terminated the Bitcoin-backed Arch Lending facility; collateral released | HOLDS | avid 2627 summary |
| About 94% reduction in total debt | HOLDS | 2627 summary |
| Mississippi expansion and Oklahoma fleet upgrade expected to raise hash rate 25% to about 964 PH/s | HOLDS | 2627 summary |
| Fresh, news-driven, graded strong | HOLDS | 2627 FRESH_FOUND / NEWS_DRIVEN / STRONG; Q3 591 PWCM catalyst=STRONG |
| Fit: plausibly explaining the move | HOLDS | 2627 plausiblyExplainsMove=true |
| Cash source and remaining debt not stated | HOLDS | 2627 unknowns[0] |
| Desk cannot independently verify float | HOLDS | 2627 floatConfidence=UNKNOWN |
| Structure unknown | HOLDS | 2627 structureClassification=UNKNOWN; Q3 591 PWCM structure=UNKNOWN |
| Warrants, unknown; convertibles, unknown | HOLDS | 2627 supply WARRANTS UNKNOWN, CONVERTIBLES UNKNOWN |
| 2,421,472 outstanding as of August 31, 2026, not a float | HOLDS | 2627 sharesOutstanding=2421472, date 2026-08-31 |
| No cycle conclusion on file | HOLDS | Q3 591 PWCM cycle=UNKNOWN |

### 8. CHGA (section "Fresh and material news"; Q3 591 band rank 12; dossier 2609, generated 2026-09-30T17:31:29.840Z)

> A September 29 definitive proxy called a special stockholder meeting, while secondary coverage described proposals for multiple stock issuances; a September prospectus registers up to 5,000,000 ELOC put shares at a fixed $2.00 per share. The desk grades the fresh, news-driven catalyst moderate / mixed / secondary but does not read it as explaining the move, because the evidence does not establish approval, issuance, or sales. The desk cannot independently verify float; dirty-float structure includes an equity purchase agreement, known active, 5,000,000 shares, effective September 18, 2026, and two warrant lines, possibly active, for 1,000,000 shares each. No cycle conclusion is on file.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Fresh and material news" | HOLDS | 2609 catalystStatus=FRESH_FOUND |
| Company name "Change Agents Corporation." | HOLDS | avid 2609 companyName="Change Agents Corporation." |
| Country (none printed) | HOLDS | avid 2609 country=null |
| Path $2.4 to $2.7 to $2.3, from today's close | HOLDS | Q4 CHGA ah_reference_close=2.4, ah_high=2.7; Q3 591 price=2.3 at 2026-09-30T23:59:53.605Z (inside 16:00 to 20:00 ET); basis CURRENT_SESSION |
| September 29 definitive proxy called a special meeting | HOLDS | avid 2609 summary |
| Secondary coverage: proposals for multiple stock issuances | HOLDS | 2609 summary |
| September prospectus, up to 5,000,000 ELOC put shares at fixed $2.00 | HOLDS | 2609 summary |
| Fresh, news-driven, graded moderate / mixed / secondary | HOLDS | 2609 FRESH_FOUND / NEWS_DRIVEN / MODERATE_MIXED_SECONDARY; Q3 591 CHGA catalyst same |
| Fit: not read as explaining the move | HOLDS | 2609 plausiblyExplainsMove=false |
| Because approval, issuance or sales are not established | HOLDS | 2609 whyTradersMayCare (the "because" link is the writer's; the facts hold) |
| Desk cannot independently verify float | HOLDS | 2609 floatConfidence=LOW |
| Dirty-float structure | HOLDS | 2609 DIRTY_FLOAT; Q3 591 CHGA structure=DIRTY_FLOAT |
| Equity purchase agreement, known active, 5,000,000 shares, effective September 18, 2026 | HOLDS | 2609 supply |
| Two warrant lines, possibly active, 1,000,000 shares each | HOLDS | 2609 supply |
| No cycle conclusion on file | HOLDS | Q3 591 CHGA cycle=UNKNOWN |

### 9. GOW (section "Fresh and material news"; Q3 591 band rank 13; dossier 2579, generated 2026-09-30T13:32:34.752Z)

> The company announced the September 25 closing of its business combination and a concurrent PIPE involving preferred shares and warrants, with Nasdaq trading scheduled to begin September 28; this is not a fresh catalyst, and the desk grades the secondary, stale news weak / negative / dilutive. The desk reads the event as plausibly explaining the move that has happened, while the preferred-and-warrant financing creates a structural supply and conversion question. The desk cannot independently verify float; caution structure includes pipe, known active, effective September 25, 2026, warrants, possibly active, 980,392 shares, effective August 11, 2026, and other issued shares, possibly active, 18,981,618 shares, effective August 11, 2026. No cycle conclusion is on file.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Fresh and material news" | WRONG | avid 2579 catalystStatus=SECONDARY_STALE, freshness=STALE; the line under it says "this is not a fresh catalyst" |
| Company name "GOWell Energy Technology" | HOLDS | avid 2579 companyName="GOWell Energy Technology" |
| Country (none printed) | HOLDS | avid 2579 country=null |
| Path $3.18 to $3.25 to $3, from today's close | HOLDS | Q4 GOW ah_reference_close=3.18, ah_high=3.25; Q3 591 price=3 at 2026-09-30T23:59:55.081Z (inside 16:00 to 20:00 ET); basis CURRENT_SESSION |
| Company announced the September 25 closing of its business combination | HOLDS | avid 2579 summary |
| Concurrent PIPE of preferred shares and warrants | HOLDS | 2579 summary |
| Nasdaq trading scheduled to begin September 28 | HOLDS | 2579 summary |
| Not a fresh catalyst; secondary, stale news | HOLDS | 2579 SECONDARY_STALE / freshness STALE |
| Graded weak / negative / dilutive | HOLDS | 2579 catalystGrade; Q3 591 GOW catalyst=WEAK_NEGATIVE_DILUTIVE |
| Fit: plausibly explaining the move | HOLDS | 2579 plausiblyExplainsMove=true |
| Preferred-and-warrant financing creates a supply and conversion question | HOLDS | 2579 whyTradersMayCare |
| Desk cannot independently verify float | HOLDS | 2579 floatConfidence=UNKNOWN |
| Caution structure | HOLDS | 2579 CAUTION; Q3 591 GOW structure=CAUTION |
| PIPE, known active, effective September 25, 2026 | HOLDS | 2579 supply |
| Warrants, possibly active, 980,392 shares, effective August 11, 2026 | HOLDS | 2579 supply |
| Other issued shares, possibly active, 18,981,618 shares, effective August 11, 2026 | HOLDS | 2579 supply |
| No cycle conclusion on file | HOLDS | Q3 591 GOW cycle=UNKNOWN |

Misleading: "scheduled to begin September 28" is future tense for a date two days before the report.

### 10. CTHH (section "Research gaps"; Q3 591 band rank 14; dossier none)

> Research is not on file at this checkpoint: no dossier or cycle read is available.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Research gaps" | HOLDS | Q3 591 CTHH analysis_version_id=null |
| Company line absent | HOLDS | Q3 analysis_version_id=null |
| Path $16.67 to $16.67 to $16.67, from today's close | HOLDS | not in Q4 (production read ticker_session); equals the frozen Q3 591 CTHH ah_reference_close=16.67, ah_high=16.67, price=16.67 at 2026-09-30T20:00:00.000Z; basis CURRENT_SESSION |
| Research not on file at this checkpoint: no dossier | HOLDS | Q3 591 CTHH analysis_version_id=null, intelligence_status=NOT_ANALYZED |
| No cycle read available | HOLDS | Q3 591 CTHH cycle=null |

Misleading: Path $16.67 to $16.67 to $16.67: price_at is exactly 16:00:00 ET (Q3 591 CTHH price_at=2026-09-30T20:00:00.000Z) with 200,886 after-hours shares and a zero move; the "now" point is the 16:00 print, not a later after-hours trade.

### 11. CTGG (section "Research gaps"; Q3 591 band rank 15; dossier none)

> Research is not on file at this checkpoint: no dossier or cycle read is available.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Section "Research gaps" | HOLDS | Q3 591 CTGG analysis_version_id=null |
| Company line absent | HOLDS | Q3 analysis_version_id=null |
| Path $16.18 to $16.33 to $16.15, from today's close | HOLDS | not in Q4 (production read ticker_session); equals the frozen Q3 591 CTGG ah_reference_close=16.18, ah_high=16.33, price=16.15 at 2026-09-30T20:32:00.000Z; basis CURRENT_SESSION |
| Research not on file at this checkpoint: no dossier | HOLDS | Q3 591 CTGG analysis_version_id=null, intelligence_status=NOT_ANALYZED |
| No cycle read available | HOLDS | Q3 591 CTGG cycle=null |

### Overall line

> Across the $1.00–$20.00 range, 2,570 traded after hours, 824 up, 539 down.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Range "$1.00 to $20.00" (printed with an en dash) | HOLDS | payload range {min:1,max:20} |
| 2,570 traded after hours | NOT CHECKABLE | ticker_session aggregate for 2026-09-30 joined to universe (totals.ts), read live at 02:00Z; not in Q1 to Q5 |
| 824 up | NOT CHECKABLE | same aggregate |
| 539 down | NOT CHECKABLE | same aggregate |

### Struck lines

Strike S1L2, reason UNSUPPORTED, by model. Checker's stated reason, verbatim: "The recent offering is stored with an effective date of March 27, 2026, not March 26, 2026."

The struck text itself is not stored: diagnostics carry only id, reason, by and detail, and the payload drops struck lines. What follows is what the stored rows say about the claim the checker named.

| Claim | Verdict | Stored value |
| --- | --- | --- |
| Line is about HIT (draft section 1 line 2, between TGE and NCNA) | HOLDS (inferred) | the only published dossier with a RECENT_OFFERING on 2026-03-27 is HIT (avid 2620: RECENT_OFFERING POSSIBLY_ACTIVE effectiveDate=2026-03-27T00:00:00.000Z, 5,600,000 shares); HIT is Q3 591 band rank 2 and, if latched, in-range #2; without it the 12-name set does not reconcile with the published 11 |
| HIT belongs in this $1 to $20 report at $0.79 (latch) | NOT CHECKABLE | HIT is not in Q4; needs ticker_session ah_qualification_price / ah_qualified_at for HIT (Q3 591 HIT ah_high=1.12 shows it traded inside the range after hours) |
| (Inferred from the detail) recent offering effective March 26, 2026 | WRONG | avid 2620 supply RECENT_OFFERING effectiveDate=2026-03-27T00:00:00.000Z, a calendar date stored as midnight UTC |

Verdict: RIGHT strike against the stored date, but the writer did not invent the error. It copied its fact sheet. `writerV5.ts` `longDate()` sends every value through `etDayAndClock` and so `eventEtDate`. That function keeps only a BARE `YYYY-MM-DD` as a calendar date. `2026-03-27T00:00:00.000Z` carries a clock, so it is converted to ET: 20:00 ET on March 26. The sheet therefore told the writer "effective March 26, 2026". The deterministic trace (`traced.ts` `datesOf`) uses the same conversion, so it ACCEPTED March 26. The model checker is shown supply dates raw, because `storedResearch` adds an "et" reading only to the event time and source times. It saw March 27 and struck the line. The two checkers disagree on the same field, and the in-range #2 name was dropped from the premarket report over a conversion artefact. I checked every shares date, event time and supply effectiveDate in the 22 dossiers behind the three reports. This is the only value whose ET calendar day differs from its UTC day, so the artefact touched only this line.

## Every WRONG claim

- #588 LGHL: Section "No clear catalyst". Stored: avid 2614 catalystStatus=FRESH_FOUND, plausiblyExplainsMove=true; the line under it says the desk reads the disclosure as plausibly explaining the move
- #588 VBIO (struck line S1L3, text not stored): catalyst graded "moderate / mixed / secondary" per the checker. Stored: avid 2615 catalystGrade=LEGITIMATE_POSITIVE, Q3 588 VBIO catalyst=LEGITIMATE_POSITIVE
- #591 CMCT: Section "Fresh and material news". Stored: for CMCT "material" contradicts avid 2593: catalystGrade=UNKNOWN and summary "does not establish that this routine-looking declaration is material"; the line under it says the news is insufficient to explain the move
- #591 GOW: Section "Fresh and material news". Stored: avid 2579 catalystStatus=SECONDARY_STALE, freshness=STALE; the line under it says "this is not a fresh catalyst"
- #591 HIT (struck line S1L2, text not stored, ticker inferred): recent offering "effective March 26, 2026". Stored: avid 2620 RECENT_OFFERING effectiveDate=2026-03-27T00:00:00.000Z. The writer sheet produced March 26 by converting midnight UTC to ET

A structural finding behind the three heading entries: section headings are never checked. `check.ts` `draftLines()` numbers the headline (H), the overall line (O) and every section LINE. It never includes `section.heading`, so headings reach print unread by both the rule checker and the model checker.

## Every source id needed

These rows (`research_sources` by id) would settle the NOT CHECKABLE claims and the open questions in the misleading list:

- 86001, 64332: AURE #585, the "September 21, 2026" Form 3 item and the year of the "September 11" Form 6-K (published_at).
- 116713, 116730: CNTB #585, whether the clinical release was an "8-K" (title).
- 119541, 119558, 114766, 114783: LGHL #588, "a September 29 ... convertible note" (published_at).
- 118584: CMCT #588, whether "08:00 ET" is a real time or a noon-UTC placeholder (published_at and published_precision).
- 112828, 112829: BIYA, whether $2.37 million is net loss (#588, dossier 2616) or total comprehensive loss (#585, dossier 2596).
- 115982: the citation printed in TGE's #591 company line, which is not among dossier 2624's source_ids.
- HIT's March 2026 offering date: the supply block's own evidenceSourceIds are not carried into reports. Dossier 2620's warning cites 119956 and 119963 for the March PIPE. These ids would show whether March 27 is the true date.

Not source rows, but also needed: ticker_session for 2026-09-30 (ah_qualification_price, ah_qualified_at) for MI and HIT (the latch that admits them), and the board-eligible after-hours aggregate behind the overall line (2,570 / 824 / 539).

## True but misleading to a trader

Cross-cutting:

- FIT HAS NO REFERENT IN THE PREMARKET REPORT. "Plausibly explaining the move that has happened" is the dossier's judgement of the move it saw when it was written. In #591 the printed path is the after-hours arc. GOW (dossier from 13:32Z Sep 30) is down 5.7% after hours, CHGA (17:31Z) 4.2%, CMCT (14:19Z) 4.4%. MI's dossier is from August. The line does not say which move it means.
- HEADINGS CONTRADICT THEIR LINES: #588 LGHL and CHGA sit under "No clear catalyst" with fresh catalysts, LGHL's read as explaining the move. #591 GOW sits under "Fresh and material news" over a line that says "this is not a fresh catalyst". #591 CMCT sits under "material" over a line that says the news is insufficient. Unchecked, as above.
- STRUCK NAMES VANISH SILENTLY: VBIO (#588, in-range #7) and HIT (#591, in-range #2) are gone. The opening count reads 11 and nothing marks a removal. This is by design in `applyStrikes`, but in #591 it cost the second-ranked name over a date artefact.
- LATCHED SUB-$1 NAMES: SEED at $0.78 / $0.7848 (#585, #588), MI at $0.82 (#591), HIT at $0.79 (#591, struck). These are as ruled by the latch, but the $1 to $20 range is the only frame printed.
- LATE: #585 (into power hour) published 21:25 ET, about six and a half hours after the session ended. #588 published 21:26 ET. Both carry late=true. Neither text claims a time.
- OVERALL LINE: "2,570 traded after hours, 824 up, 539 down" leaves 1,207 traded names with a zero or null after-hours change, and the sentence does not say so. Its population is board-eligible names priced in range at the read with NO latch, so it is a different set from the names listed (by design, `totals.ts`).

Per line:

- #585 GOW: The $20 million private placement was funded in October 2025 (2579 summary); "the transaction included ... alongside" reads as part of the September 25 deal.
- #585 BIYA: The 1,185,835 count predates the 1-for-10 reverse split of July 10, 2026 (2596 structuralWarnings[0] says so); dated correctly, but on a pre-split basis.
- #585 BIYA: 585 calls $2.37 million "total comprehensive loss" (2596), 588 calls the same figure "net loss" (2616). One dossier mislabels it; sources 112828, 112829 decide which.
- #585 AURE: Dossier 2045 was generated 2026-09-22 (cycle as of 2026-09-21), eight days before this checkpoint; "no catalyst found" and the fit are a September 21 read, and the line does not say so.
- #585 AURE: The 37,600,000 figure includes pre-funded and primary warrants (2045 structuralWarnings[1]: "not a clean common-share-only count").
- #585 SEED: Price $0.78 in a $1 to $20 report: admitted by the day latch (Q4 SEED qualified_price=1.01 at 11:09Z), as ruled; nothing beside the name says so.
- #588 BIYA: Same pre-split share count as #585 (1-for-10 reverse split July 10, 2026, per 2616 structuralWarnings[0]).
- #588 BIYA: Country line reads Cayman Islands here (2616 country="Cayman Islands") and United States in #585 (2596 country code NY): same company, two countries, three hours apart.
- #588 SEED: Price $0.7848 in a $1 to $20 report, admitted by the day latch (Q4 SEED qualified_price=1.01 at 11:09Z), as ruled.
- #588 CMCT: "08:00 ET" is 12:00:00.000Z. Noon-UTC event times recur across dossiers (CMCT, CHGA, DKI, MI), which looks like a date-only placeholder. The writer sheet labels any instant with a clock as "(exact)". Whether 08:00 is real needs research_sources 118584 published_at and precision.
- #588 GOW: "the September 25 ... Nasdaq listing event": the stored summary dates the closing September 25 and trading under GOW from September 28.
- #588 CHGA: Filed under "No clear catalyst" although the stored status is FRESH_FOUND and the line itself names a fresh proxy graded moderate. True of the fit (false), but the heading reads as "nothing found".
- #588 LGHL: One line gives the note two dates: "a September 29 ... convertible note" and "convertibles, known active, effective September 28, 2026" (2614 supply; 2610 says the debenture was issued September 28). September 29 is at best the disclosure date.
- #588 AURE: Same as #585: an eight-day-old dossier (generated 2026-09-22), and a share count that includes warrants.
- #591 TGE: Company line business text prints a raw citation, "[Source 115982]", and 115982 is not among dossier 2624 source_ids [119113,118074,119118,115970,115972,119098].
- #591 TGE: Country drops from Cayman Islands (#585, #588, dossier 2600 code E9) to none (2624 country=null).
- #591 NCNA: 20,809,854,947 is the ORDINARY share count; NCNA trades as ADSs and the dossier warns it "may not be directly comparable with ADS-denominated instruments without an ADS ratio reconciliation" (2622 structuralWarnings[0]). Beside a $1.31 ADS price it overstates the share base by the ADS ratio.
- #591 DKI: Company line business text prints raw citation ids "[96174, 96176, 119985]".
- #591 MI: Dossier 708 was generated 2026-08-28, 33 days before this checkpoint. "Fresh and material news", "most recent ... event in the record" and "plausibly explaining the move that has happened" are all August judgements. On the night it is printed, MI fell 62% after hours (Q3 591 ah_percent_change=-62.04, path 2.16 to 0.82), which the line never mentions.
- #591 MI: The 14,318,410 count predates the March 2026 issuance and the August offering, and a 1-for-5 to 1-for-200 consolidation was authorised (708 structuralWarnings[0], reverseSplitHistory).
- #591 GOW: "scheduled to begin September 28" is future tense for a date two days before the report.
- #591 CTHH: Path $16.67 to $16.67 to $16.67: price_at is exactly 16:00:00 ET (Q3 591 CTHH price_at=2026-09-30T20:00:00.000Z) with 200,886 after-hours shares and a zero move; the "now" point is the 16:00 print, not a later after-hours trade.

## What could not be determined

- The text of both struck lines. Diagnostics store only id, reason, by and detail, so each strike is judged on the claim the checker named.
- That the #591 struck line is HIT is inferred, though the inference is tight: it is the only dossier with that date, and only HIT reconciles the 12-name set.
- Whether MI and HIT were latched in range: they are not in Q4.
- The overall line's three counts.
- The source-dependent items listed above.
