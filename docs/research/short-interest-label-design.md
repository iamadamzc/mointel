# Short interest label: design, mock sample, and the calibration fixed in advance

*Seat `local_5f4bfcf8` (Research-tmi), 2026-10-02. Design and mock only: no build, no FINRA pull.*

- **Order:** Integration-tmi 22nd, 2026-10-02.
- **Authority:** his word to Commercial, "registered. accepted exposure" (`88f2b7c9`, landscape §10.5), and his earlier "do our own assessment and present a label".
- **Conditions:** Commercial's landscape §10.2 and §11b.
- **Grades:** `docs/research/short-interest-classification-2026-10-02.md` (`9b1b1ec4`, revised `24613e8c`).
- **The build waits on:** the coverage check by the seat that holds his credential (does the FINRA Query API's consolidated dataset include Nasdaq- and NYSE-listed small caps?), then Commercial's §8 review, Marketing's words, Web's end-user wording adopted by him, and his yes.

## 1. The conditions, and how the label meets each

| Condition (§10.2 / §11b) | How the label meets it |
|---|---|
| Name FINRA as the source, with the settlement date | Every label line ends "Source: FINRA, settlement {date}" |
| No separate price for it | It rides inside the drawer and board like every other field; no plan or line item |
| End users non-commercial and no redistribution | Web's end-user wording, for his adoption; not this design's to write |
| **Show the label, not FINRA's numbers** | **Grade words and their BANDS only.** No shares short, no days to cover, no % change, no percentage of shares outstanding |
| Shares short over filed shares outstanding, a lower bound, never "of float" | The size grade is computed from exactly that, under the gate below. The words say "of shares outstanding", never "of float" |

**Why bands and not percentages.** A percentage of shares outstanding times the filed share count gives FINRA's shares short back. A band ("10 to 20% of shares outstanding") cannot be traced back to the number. That is the "substantially different" test Commercial reads in §10.2.

## 2. The grades (from the classification doc, unchanged)

**Size: shares short as a share of FILED shares outstanding.** This is a floor, so the grade can understate, never overstate.

| Shown as (FINAL wording, Marketing 2026-10-02, Commercial-approved R1 to R5) | Band |
|---|---|
| "under 5% of shares outstanding" | under 5% |
| "5% to under 10% of shares outstanding" | 5 to under 10% |
| "Elevated (10% to under 20% of shares outstanding)" | 10 to under 20% |
| "Heavy (20% or more of shares outstanding)" | 20% or more |

**Changed on Commercial's review (R1, `692ce434`):**

- The lowest grade had a word, "Normal". This measure can only understate: on a low-float name, 4% of shares outstanding can be most of the float. So "Normal" told a long reader the short side was unremarkable, in exactly the direction the floor cannot cover.
- The lowest grade is now the literal band, with no word.
- "Above normal" became "Moderate", because it leaned on the dropped "Normal". **Then dropped too** (Marketing, final): size "Moderate" collided with depth "Moderate depth" on one line, so the 5 to 10% grade shows its band with no word. Words remain only at the crowded end (Elevated, Heavy).
- Every size grade carries its band and its denominator INLINE on the drawer line, not only on hover.
- The words are Marketing's to tighten; the constraint is Commercial's.

**Depth: FINRA's days to cover, on normal volume.**

| Grade | Band |
|---|---|
| Shallow | under 3 days |
| Moderate depth | 3 to under 5 |
| Deep | 5 to under 10 |
| Very deep | 10 or more |

**Trend: change since the previous report.**

| Grade | Band |
|---|---|
| Building | up 25% or more |
| Falling | down 25% or more |
| Steady | otherwise |

A trend grade is shown only at 5% of shares outstanding or more.

**Trend is NOT graded across a split (added 2026-10-02, before any data, from FINRA's field list in Ops's `docs/ops/finra-coverage-2026-10-02.md`).** FINRA's `changePercent` compares the previous and current positions UNADJUSTED. After a 1-for-20 reverse split, a short position drops about 95% in shares with no change in shorting, and the label would read "Falling". So when the current cycle carries `stockSplitFlag = 'S'`, no trend grade is shown. The same flag on any cycle between the filed count's date and the settlement date also fails the size gate's split condition.

**The gate on size.** The size grade is computed only when all of these hold:

- the filed share count is current (within 45 days, `FILED_SHARES_CURRENT_DAYS`);
- it is dated on or after the settlement date, OR the supply ledger shows no active or possibly active issuance between the two dates;
- no split is recorded after the count's date.

Otherwise size is "not graded", with the reason.

**Freshness.** If the newest report held is older than FINRA's latest publication date, nothing is shown ("not current"). The cycle is twice monthly, published 7 business days after settlement (`docs/research/short-interest-2026-10-02.md`).

## 3. How it reads

**Drawer: one line, always shown when a current report is held.** The size grade carries its band and denominator inline (R1):

> **Short interest: Elevated (10% to under 20% of shares outstanding) · Deep · Building.** Source: FINRA, settlement Sep 15 (17 days ago).

> **Short interest: under 5% of shares outstanding · Shallow.** Source: FINRA, settlement Sep 15 (17 days ago).

**On hover, the bands behind each word.** Commercial's conditions on the hover:

- the SAME static definition for every name;
- never a position inside a band;
- never a band beside FINRA's number.

> Filed share count dated Aug 8. Shares outstanding include shares that do not trade, so the share of float sold short can be higher. Deep: 5 to under 10 days of normal volume to cover. Building: up at least 25% since the previous report.

(FINAL, Marketing: the size band is inline on the drawer line, so the hover does not repeat it; it keeps the floor caveat and the depth and trend bands.)

Marketing's read (2026-10-02): "5 to 10 days" was a content error (10 is Very deep), fixed to "5 to under 10"; the filed-count clause folded into brackets. The drawer line joins only the grades present and says "1 day ago" when the age is one day. **HIS RULING (typed to this seat, 2026-10-02): "Falling", not "Covering": "i like falling, because it's more congruent in the context of "interest". Interst is falling, not covering."** It names the position, not a mechanism: a drop in reported short interest can also come from positions moving into arranged-financing loans, which FINRA does not count (SR-FINRA-2026-012), so "Covering" would claim buying the data cannot show.

**Commercial PASS (13b, 2026-10-02, on 0acc4bcb):** R1 to R3 applied as required, no further change. **Open, cosmetic, for Marketing:** size "Moderate" and depth "Moderate depth" can share one drawer line ("Moderate (5 to 10% of shares outstanding) · Moderate depth"), so one of the two words may need to differ.

**Commercial 13c (on Marketing's words):** R4, the legend must say the grades are this desk's own, so FINRA is not read as their author. It is already met by the legend above ("Grades are this desk's own"); keep it in any rewording. R5, the chip carries the age: applied above. **The build wording for the drawer line is THIS design's, with the size band inline** (R1, Commercial's constraint). Marketing's main line, read before R1, dropped the band; any tightening must keep it.

**Legend, shown ONCE (R2 and R3, Commercial `692ce434`)**, wherever the label first appears (drawer section footer):

> Short interest data: FINRA (owner and source). The grades are this desk's own, computed from FINRA's reports and the company's filed share count. They describe short positions on the settlement date shown, not a prediction or a recommendation.

- Clause 2.3(a) requires FINRA to be identified "as the owner and source" of the data, derived data included. "Source: FINRA" on each line names only one of the two, so the legend carries both.
- The word "squeeze" appears nowhere in the label, the hover, the chip or the legend.

**Board chip: SIZE ONLY, at Heavy only, and ALWAYS with the settlement age** (Commercial R5, 13c; R6 via Marketing): "SHORTS: HEAVY · 17d" (days since settlement, the same number as the drawer; no denominator on the chip; touch has no hover, so the age cannot live only there). A bare chip reads as current. **No depth chip (R6):** days to cover divides by the PRIOR cycle's volume, so "Very deep" can overstate on a fresh high-volume mover, and a chip cannot carry the "on normal volume" basis the drawer carries. Very deep stays in the drawer's depth grade. No chip is not the same as a low grade, so the drawer always carries the full line.

**Report tag:** the same words as the drawer line, via the v6 tags, if Design wants it. Not in the first build. **When it enters the report layer, the settlement date and its age ("17 days ago") must survive any truncation** (Commercial, non-blocking).

**Borrow pairing ("hard to borrow at Alpaca") is out of the first build.** It needs notice to Alpaca under its terms (Commercial §8), a separate decision.

## 4. Mock sample

**Every short-interest input below is INVENTED.** The tickers are placeholders, deliberately not real names: an invented short interest on a real ticker would be a false record if this sample left the desk. The filed-count dates and gate outcomes are realistic shapes, not stored values.

| Placeholder | Invented inputs (never shown) | Drawer line | Board chip |
|---|---|---|---|
| AAAA | floor 26%, 12.4 days, +41% | **Short interest: Heavy (20% or more of shares outstanding) · Very deep · Building.** Source: FINRA, settlement Sep 15 (17 days ago). | SHORTS: HEAVY · 17d |
| BBBB | floor 14%, 6.2 days, +40% | **Short interest: Elevated (10% to under 20% of shares outstanding) · Deep · Building.** Source: FINRA, settlement Sep 15 (17 days ago). | none |
| CCCC | floor 3%, 1.4 days, -8% | **Short interest: under 5% of shares outstanding · Shallow.** Source: FINRA, settlement Sep 15 (17 days ago). | none |
| DDDD | ATM active since the filed count; 6.8 days; +5% | **Short interest: size not graded (shares issued since the last filed count) · Deep.** Source: FINRA, settlement Sep 15 (17 days ago). | none |
| EEEE | newest report held is the Aug 29 settlement, while Sep 15 is published | **Short interest: not current** (a newer FINRA report has been published and is not yet held). | none |
| FFFF | 1-for-20 reverse split after the filed count; 3.1 days | **Short interest: size not graded (a reverse split since the last filed count) · Moderate depth.** Source: FINRA, settlement Sep 15 (17 days ago). | none |

- On DDDD and FFFF, no trend grade appears, because size is not graded and the trend rule needs size at 5% or more.
- CCCC shows no trend grade for the same reason: it is under 5%.

## 5. Calibration on his names, PRE-REGISTERED now (runs only once the credential exists and coverage is confirmed)

- **Question:** do the provisional lines spread his own names across the grades, or do they pile into one? A grade nearly every name gets carries no information.
- **Data, fixed now:**
  - FINRA consolidated short interest via the Query API, under the API terms he accepted;
  - the 6 most recent settlement dates at the time of the run;
  - the names: every ticker in the top 12 of any report checkpoint (`desk_assessment_tickers`, in range, `assessment_rank <= 12`) over the 20 trading days before the latest of those settlement dates;
  - each name graded against the settlement nearest before its checkpoint date, with the gate applied exactly as in section 2.
- **Counts reported:**
  - names graded and names not graded (by gate reason);
  - for each of size, depth and trend, the count and share of names in each grade.
- **The rule, fixed now:** any grade holding **more than half** of the graded names in its dimension has its lines re-drawn. Re-drawn lines are proposed to him with the counts; they are not applied by this seat. No grade is judged on returns or price behaviour: this is a spread check only.
- **Positive control:** the run must grade at least one name in each size grade OR report which grades are empty. An empty grade is a finding, not a failure. A run that grades zero names is withheld and the instrument examined (a check that cannot see a present case is not evidence of absence).
- **AMENDMENTS, committed before any FINRA or SEC data is pulled (2026-10-02, after Ops's coverage check `91caa2f3`):**
  1. **Unit:** a distinct (ticker, settlement) pair. A name in the top 12 on several days that map to the same settlement is graded once for that settlement.
  2. **Settlement for a checkpoint date d:** the latest settlement on or before d.
  3. **Which checkpoints:** the four report checkpoint types (`pipeline.ts` SOURCE): NEXT_DAY_RECAP, OPEN_SPIKE_ASSESSMENT, RTH_INTERVAL scheduled 14:30 ET, and RTH_CLOSE; status COMPLETE.
  4. **"In range":** checkpoint row price in [$1, $20]; top 12 by `assessment_rank` among those rows.
  5. **The six settlements:** the six most recent with data at run time.
  6. **The window:** the 20 trading days (distinct checkpoint dates) up to and including the latest settlement date.
  7. **Store:** the local 2026-09-29 production copy, read-only.
  8. **Filed count as of settlement S (no look-ahead):** the newest-period share fact (`extractSharesOutstanding` order) whose `filed` date is on or before S. Gate condition 1: S minus its `asOf` is at most 45 days.
  9. **Gate condition 2 as of S:** the latest `research_analysis_versions` row for the ticker with `generated_at` on or before S.
     - No such row: not graded, reason "no research as of settlement".
     - Any supply-ledger block with status KNOWN_ACTIVE or POSSIBLY_ACTIVE: not graded, reason "possible issuance since the filed count", unless the count's `asOf` is on or after S.
  10. **Gate condition 3:** FINRA `stockSplitFlag = 'S'` on any pulled cycle with settlement after the count's `asOf` and on or before S.
  11. **Depth:** `daysToCoverQuantity` of 0 (FINRA's default when volume is zero) is not graded.
  12. **No FINRA row** for a pair: counted as "no FINRA row", not graded.
  13. **CIK:** from the as-of dossier when present, else SEC's current ticker map.
- **Raw output committed before it is read.** It contains FINRA's numbers, so it stays INTERNAL (Commercial, non-blocking): committed only to this private repository (verified private 2026-10-02), never copied to a customer surface, a public doc or a published artifact.

## 6. What this design does not decide

- **Where the chip sits among the Risk outcomes:** the ordering question in `docs/research/short-interest-2026-10-02.md` section 3; Design's and his.
- **The end-user non-commercial wording:** Web's draft, for his adoption.
- **Whether short interest predicts anything for his names:** not studied here; his call if ever.

## 7. BUILD SPEC ADDITIONS after the calibration (2026-10-02)

**Size source: COMBINED RECONCILED** (`docs/research/short-interest-calibration/result.md`, RUN 3), ACCEPTED by Commercial 13f (`b08f849a`) on three conditions. They are carried here verbatim in substance:

1. **The drawer line grades against "the filed share count (dated {date})", not "shares outstanding".** The date is inline whenever the count is older than 45 days. Example: "Short interest: Elevated (10% to under 20% of the filed share count, dated Jun 30) · ...".
2. **REFUSE (not graded):**
   - any name whose as-of ledger has a KNOWN_ACTIVE WARRANTS, CONVERTIBLES or PREFERRED_CONVERSION block (the 4 exercise-risk pairs of 144 in run 3);
   - any name with an active ATM or EQUITY_PURCHASE_AGREEMENT block (already the RECONCILED gate).
3. **120 days stays the pre-registered limit,** acceptable ONLY together with condition 1.

**Commercial's corrected premise, kept with the spec:** against a stale count, a grade of "or more" can overstate when shares were issued since; "under 5%" survives dilution. That is why conditions 1 and 2 exist.

**Count source rule:**

- COMBINED takes the dossier count (B) when its as-of date is later than the SEC companyfacts count (A), else A.
- Then add completed discrete issuances (RECENT_OFFERING, PIPE, ACQUISITION_SHARES, OTHER_ISSUED_SHARES with share amounts) dated after the count and on or before the settlement.
- All inputs as of the label's VIEW time.
- The settlement is the latest FINRA report PUBLISHED by then.

**Display mode is HIS and still open:** exception-only is recommended by Research, Commercial and Integration. Nothing is built until his answer.
