# Short interest grades on his names: RESULT

> **SUPERSEDED HEADLINE (2026-10-02, the same day): read RUN 3 at the end first.**
>
> This run's "size graded on 8 of 426 (about 98% not graded)" took every input as of FINRA's SETTLEMENT date, and paired each checkpoint with a report not yet published on that date.
>
> The label is shown at a later VIEW time, so that framing was too strict. It was the seat's error.
>
> Run 3 measures at view time and finds size gradable on **18% (strict) to 34% (reconciled)** of pairs. The rest of this section is kept as the record of what ran.

*Seat `local_5f4bfcf8` (Research-tmi), 2026-10-02. Registration: `docs/research/short-interest-label-design.md` section 5 and amendments (`e09750ab`). Harness `43170c3d` + `390aedfc` (credential read fix, before any data). Raw output `822fcdb5`, committed before it was read. INTERNAL: aggregates of FINRA numbers, private repository only.*

## What ran

- **Settlements:** six, 2026-06-30 to 2026-09-15.
- **Names:** top 12 in $1 to $20 of the four report checkpoints, over the 20 checkpoint dates 2026-08-18 to 2026-09-15, on the local 09-29 production copy. That gives **434 (name, settlement) pairs over 407 tickers**.
- **FINRA:** 2,345 rows; 8 pairs had no row.
- **SEC:** 394 requests.
- **Positive control:** met (size graded for at least one pair).

## Registered result

| Dimension | Graded | Spread | Over half (re-draw rule) |
|---|---|---|---|
| **Size** | **8 of 426** | under 5%: 7; Elevated: 1; empty: "5% to under 10%" and Heavy | under 5% (n = 8, too few to mean anything) |
| **Depth** | 426 | Shallow 326 (77%), Moderate depth 35, Deep 37, Very deep 28 | **Shallow** |
| **Trend** | 1 | Building 1 | n = 1 |

**Why size was graded for only 8:** 418 pairs failed the gate (first failing reason).

| Reason | Pairs |
|---|---|
| Filed count older than 45 days | 214 |
| No filed count in SEC companyfacts | 97 |
| No research as of the settlement | 79 |
| Possible issuance since the count | 27 |
| Split since the count | 1 |

## Checked before believing it (the instrument, not just the answer)

- **Stale counts are real, not a bug.**
  - 124 of the 214 come from 20-F filers. Foreign issuers report shares outstanding annually, so their median count age is 243 days.
  - Most of the rest are 10-Q filers whose newer quarter was not yet FILED on the settlement date. The no-look-ahead rule refuses a count that was not public yet.
- **"No filed count" is real, not a lookup failure.**
  - Spot-checked CATO, CAST and ENRD. The CIK resolves (dossier and SEC map agree) and companyfacts returns HTTP 200, but it carries no undimensioned `dei:EntityCommonStockSharesOutstanding`; CATO's dei block holds only `EntityPublicFloat`.
  - CATO has two share classes, which is consistent with class-split facts being excluded from companyfacts. That reason is NOT verified.
  - **Side finding:** the desk's own float verdict uses the same source, so these issuers also get "no filed count" there.
- **A looser age rule barely helps** (exploratory, upper bound before the other gates):

  | Count age allowed | Extra pairs admitted (of 214) |
  |---|---|
  | 90 days | 27 |
  | 120 days | 45 (mostly 10-Q) |
  | 180 days | 71 |

  At 120 days, size would be graded for at most about 12% of pairs.

## Exploratory, NOT registered (labelled so)

- **Size with the gate switched off** (329 pairs with a count):

  | Measure | Value |
  |---|---|
  | Median | 0.68% of shares outstanding |
  | p75 | 3.75% |
  | p90 | 8.09% |
  | Under 5% | 267 (81%) |
  | 5 to 10% | 36 |
  | 10 to 20% | 16 |
  | 20% or more | 10 |

  For comparison, the market-wide median read earlier was 3.4% (third-party, Sep 15). His names carry LESS short interest than the typical stock. The ungated figures can be off for issuers that diluted or split since their count, which is exactly what the gate exists for.
- **Days to cover:**

  | Measure | Value |
  |---|---|
  | Median | **1.00** (FINRA prints 1.00 for any value at or below 1) |
  | p75 | 2.72 |
  | p90 | 7.07 |
  | At FINRA's 1-day floor | 233 of 426 (55%) |

  No line can split that floor, because FINRA does not publish below it.
- **Change between reports** (all 426):

  | Measure | Value |
  |---|---|
  | p10 | -51% |
  | p25 | -26% |
  | Median | -2% |
  | p75 | +27% |
  | p90 | +138% |

  Building or Falling at ±25% would apply to about half the pairs, so trend spreads. But the registered rule shows trend only at size 5% or more, so in practice it almost never appears.
- **FINRA flags:** split flag on 19 pairs (the trend gate added before the pull covers these); revision flag on 1.

## What it means (for his decision; no change is made by this seat)

As designed, the label would read **"size not graded" on about 98% of his names**, and depth would read **Shallow on 77%** (55% at FINRA's floor). The label would carry almost no information on the names he trades.

The data shows why. His names mostly carry little short interest relative to shares outstanding, and under a day of normal volume to cover. Many are foreign issuers with no current filed share count.

**Options:**

1. **Exception-only display.** Show the line only when it says something unusual: Elevated or Heavy size (under the gate), or Deep or Very deep depth. Otherwise show nothing, with a legend line that is true in BOTH silent cases. **CORRECTED (Integration, local_54f1341f):** the first version said silence means "nothing notable on FINRA's latest report". That is false for the ~98% of pairs where size was NOT GRADED: there, silence means "not measurable", not "nothing notable". The constraint: the legend must not imply an absence, e.g. "No line does not mean no short interest: a line appears only when FINRA's latest report shows a large or slow-to-cover position we can measure." The words are Marketing's. **In practice, with Commercial R6 (board chip SIZE ONLY):** size almost never grades, so the board chip almost never shows, and the drawer's depth line (Deep or worse, about 15%) carries the read.
   - Exploratory scale: depth Deep or worse on 65 of 426 (15%).
   - Size 10% or more on 26 of 329 ungated, far fewer gated.
2. **Size from a different share count.** No other source the desk can cite has been measured; the vendor float stays desktop-only.
3. **Relax the size gate** (for example 120 days with the count's age printed): at most about 12% graded. It does not reach foreign filers.
4. **Drop size, keep depth and trend:** trend without size is shown on tiny positions, where a few thousand shares make a large percentage. That would need a share-count floor of its own, which is not measured.
5. **Park the label.** On his names it says little today.

The re-draw rule fires for depth (Shallow at 77%), but the main cause is FINRA's 1.00 floor, which no re-drawn line can split. So the proposed re-draw is option 1, not new depth lines.

---

## RUN 3, 2026-10-02: as of the label's VIEW time (the corrected measurement)

*Pre-registered in `prereg-rerun.md` "RUN 3" (`7947f51f`) before its data. Harness `c4169952`. Raw `01fe7fcf`, committed before it was read.*

**The intermediate re-run** (`24df1ca2`, source B plus reconciliation, still as of the settlement) **is superseded by this run.**

- It is kept for the record.
- Its finding that mattered: 245 of 426 pairs failed ONLY because no dossier existed as of the settlement. The name was typically first researched after the settlement, on the day it reached the board. That is what exposed the wrong as-of point.

**What ran:** 436 pairs, of which 422 have a FINRA row and 180 are foreign. Each settlement is the latest PUBLISHED by the view date (07-31, 08-14 or 08-31). All inputs are as of that date.

**Pairs graded for size, out of 422 (foreign out of 180 in brackets):**

| Count source | STRICT (45 days, any active supply blocks) | RECONCILED (120 days, only continuous issuance blocks) |
|---|---|---|
| A, SEC companyfacts | 63 (1) | 111 (9) |
| B, dossier | 51 (13) | 123 (31) |
| **COMBINED (later as-of date)** | **77 (13)** | **144 (33)** |

**First-failing reasons, COMBINED RECONCILED:**

| Reason | Pairs |
|---|---|
| Count older than 120 days | 122 |
| No count from either source | 74 |
| Continuous issuance (ATM or equity line) active | 51 |
| No research as of the view date | 19 |
| Split since the count | 12 |

**Findings:**

- **Source B against source A:** where both exist with as-of dates within 3 days, they agree EXACTLY on 193 of 193. The dossier's count appears to be the filed figure.
- **Source B is fresher:** median count age 45 days, against 107 for A. It reaches more foreign issuers (31 graded against A's 9, reconciled).
- **Reconciliation (his screenshot's case)** changed the count on 6 graded pairs.
- **Exercise risk:** 4 graded pairs carry a KNOWN_ACTIVE warrant, convertible or preferred block. For those, exercises since the count could make "at least" overstate.
- **Size spread where graded (COMBINED RECONCILED, 144):**

  | Grade | Pairs |
  |---|---|
  | under 5% | 115 (80%) |
  | 5% to under 10% | 19 |
  | Elevated | 5 |
  | Heavy | 5 |

  The over-half rule fires on "under 5%". His names mostly carry little short interest relative to shares outstanding, as the exploratory figure in the first run also showed.
- **Pairs whose count is dated on or after the settlement:** 66.

## Options re-scored (for him; no change made here)

**RECOMMENDATION CHANGED 2026-10-02, after the Ortex look (`docs/research/ortex-comparison/comparison-2026-10-02.md`): HOLD the display decision.** Exception-only on FINRA alone shows NO line on SDEV, the most crowded of the five (Ortex: 12% of float, 195% borrow, 1.6% available; FINRA Sep 15: 2.39% of the filed count). What would decide it: a pre-registered matched-date FINRA vs Ortex comparison on a fixed name set, after Commercial reads Ortex's terms for research use.

1. **Exception-only display (WITHDRAWN as a recommendation, see above).** A line only at Elevated or Heavy size (graded), or Deep or Very deep depth. Size exceptions appear on about 10 of 422 pairs (2.4%); depth exceptions, Deep or worse, on about 15% (first run). The legend must hold in both silent cases, per Integration's correction: no line means either nothing large OR not measurable, never "nothing notable".
2. **COMBINED RECONCILED as the size source** (dossier count when fresher, plus completed offerings, 120 days, refusing only on active ATMs or equity lines): size gradable on about a third of his names, 18% of foreign issuers. If a grade is shown, this is the measured best of the variants tried.
3. **STRICT:** gradable on 18%. Safer for "at least", much less coverage.
4. **Park the label.**

**Not decided here:** whether the RECONCILED variant's 120 days and its four exercise-risk pairs are acceptable for an "at least" claim. That is Commercial's and his reading of the floor guarantee.
