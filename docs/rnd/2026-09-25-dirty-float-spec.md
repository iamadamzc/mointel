# Spec — the dirty float: an anchor with a date, and what has been issued since

**Status: SPEC, from R&D to Research Pipeline (parse) and Design (render).
R&D owns the definition and the proof and builds neither.**

**His direction, 2026-09-25, and it is the founding concept of the product:**

> *"The concept of dirty float is really where this product was born out of. And
> if we can derive our own float, but at the same time, characterize that float
> and the structure and educate and inform the trader in an easy way at the same
> time, we should focus on doing all of that."*

**And his ruling on the shape, same day, which fixes the rendering before anyone
designs it:**

> *"float was x number as of x date and here's what's been issued since"*

---

## The finding this rests on: the numerator is built, the denominator is missing

Measured on the latest dossier per ticker, `market-prod-2026-08-23.db`, **n=231,
2026-08-17…08-21 — five sessions, and the SHAPE is what is asserted, not the
magnitudes:**

    supplyLedger non-empty        208   90.0%
    structuralWarnings present    231  100.0%
    reverseSplitHistory present    80   34.6%
    displayedFloat non-null         2    0.9%   <- the anchor

**657 supply blocks over 231 tickers, ~3 per name, 54.8% carrying a real share
count**, in exactly the dirty-float vocabulary: `WARRANTS` 132,
`REGISTERED_RESALE` 104, `SHELF_CAPACITY` 91, `OTHER_ISSUED_SHARES` 86,
`RECENT_OFFERING` 67, `ATM` 60, `CONVERTIBLES` 40,
`EQUITY_PURCHASE_AGREEMENT` 29, `PREFERRED_CONVERSION` 17, `PIPE` 16,
`ACQUISITION_SHARES` 15. **Each block already carries `sourceFiling`,
`registrationStatus`, `amountShares` and `dollarCapacity`.**

> **The desk already knows what is dirty about a float. It does not know the
> float.** *"8.6M warrants" is not information: against a 759k float it is **11x
> the float**; against a 50M float it is noise.* **With an anchor, the ~360
> blocks that already carry share counts become ratios immediately.**

## What to build

### 1. The anchor — parse it out of filings the desk already stores

Small-cap registration filings state the float **verbatim**, on the cover:

> *aggregate market value held by non-affiliates was **$2,542,600** based on
> **1,459,587** shares outstanding, of which **758,985** were held by
> non-affiliates at **$3.35** per share*

**`758,985` is the float.** Measured on stored excerpts, `market-prod-2026-08-23.db`:

    excerpts mentioning non-affiliates    196   over  80 of 258 tickers  (31%)
    a stated float extracted               —    over  38 tickers         (15%)

**THREE TRAPS, ALL DEMONSTRATED RATHER THAN THEORISED, AND THE FIRST HAS CAUGHT
THIS DESK REPEATEDLY:**

1. **The wrong number sits beside the right one.** The count after *"based on"*
   is **shares outstanding**, not float. Measured on these same excerpts: **median
   1.77x too large.** *It is silently plausible and it errs in the flattering
   direction.* **A widened pattern was wrong on 8 of 19 overlapping tickers in an
   earlier run, always larger.**
2. **Fields have different LOCALITY.** *"held by non-affiliates"* is
   self-labelling and safe to find anywhere in the excerpt; **a price is only
   meaningful inside the calculation it belongs to.** *A document-wide price
   search fabricated three floats in a previous run.* **Scope per field.**
3. **The parse is fragile and its output must be checked, not trusted.** Three
   measurements of the same 24 excerpts returned **5, 9 and 7** tickers. *A run
   for this spec produced a 57,000x outstanding/float ratio — an obvious
   artefact, and the reason the check below is mandatory rather than advisory.*

**THE FILING SUPPLIES ITS OWN CHECK, AND NOTHING SHIPS WITHOUT IT:**

    float_shares x price == public_float_value    (within rounding)

**A triple that fails is discarded, never surfaced.** *An extraction that cannot
verify itself is a fabricated number with a filing reference attached, which is
worse than an empty cell.*

### 2. The as-of date is not a caveat, it is part of the value

**Measured, newest stated float per ticker:**

    2026 H2 (<= 3 months)    7    19%
    2026 H1                  7    19%
    2025                    17    46%
    2024 or older            6    16%

**Only ~3% of researched issuers have a float filed within three months.**

**AND THERE IS A STRUCTURAL REASON IT IS ALWAYS STALE, which the design must
absorb rather than fight.** These numbers live in **fundraising documents** — of
38 extracted: 424B5 17, F-3 11, S-3 5, POS AM 2. **A company states its float
when it is about to raise money, and the raise is what changes it.** *The number
is published at the moment it begins to be wrong.*

> **That is precisely why his rendering is the correct one and not a compromise:
> *"float was X as of DATE, and here's what's been issued since"* is the only
> honest form, because the issuance since is not an afterthought — it is the
> correction to a number that was always going to be stale.**

### 3. The render — his words fix it

    float 758,985 · as of 12 May 2026 (424B5)
    issued since:  ATM $4.0M · warrants 2.1M @ $1.88 · registered resale 20.5M

**Per the existing bound rule in the Design archive: a figure that is not a
current float must never occupy the float slot unqualified.** *Here the date
carries that weight, and the ledger beneath it is the reason the date matters.*

**Design owns the layout. Two things R&D asserts about content:**
- **Every ledger line keeps its `sourceFiling`.** *The provenance is already
  stored; dropping it in the render turns an intelligence product back into a
  signal product.*
- **A ratio is a computed fact and must read as one.** *"registered resale 27x
  the float" carries its own reasoning; `DIRTY_FLOAT` as a bare label does not.*

## WHAT MUST NOT BE BUILT

> **DO NOT SHIP SHARES OUTSTANDING AS THE ANCHOR.** The earlier Phase C scope
> was exactly this. **It is a ceiling measured at median 1.77x the true float**,
> and **a 657-block ledger MULTIPLIES the error** — a name whose resale overhang
> is 27x the float would display at ~15x. **A wrong anchor is worse than no
> anchor.** *Shares outstanding may still be shown as its own labelled quantity;
> it may never be the denominator of a ratio.*

## How R&D will prove it — pre-registered, before the feature exists

**The claim under test is his, and it is falsifiable: a dirtier float behaves
worse.**

1. **Primary:** among board names carrying **both** an anchor and a ledger,
   contrast **high overhang-to-float ratio** against **low**, on
   `gain_open_30_pct` and on retracement from session high. **Session-paired,
   the same statistic the grade work used**, cut on the values available
   **before 09:30 ET** — never the end-of-day state.
2. **Ratio defined before any result is seen:** total `amountShares` across
   ledger blocks that are *registered or exercisable* (`REGISTERED_RESALE`,
   `ATM`, `WARRANTS`, `CONVERTIBLES`, `EQUITY_PURCHASE_AGREEMENT`,
   `PREFERRED_CONVERSION`), divided by the anchor float. **`SHELF_CAPACITY` with
   only a dollar figure is EXCLUDED** — converting a dollar shelf to shares
   without pricing terms is fabrication, and the schema already says so.
3. **A null counts.** If overhang-to-float does not separate outcomes, the desk
   still gains an honest float and the ratio is context rather than a warning —
   **and that is a result worth having, not a failure.**

**THE SELECTION PROBLEM, STATED BEFORE THE NUMBERS AND NOT AFTER.** **The names
that state a float are names that recently registered securities** — they are
*selected for* being diluters. **So this population is not a random sample of
the board, and a finding on it does not generalise to names with no anchor.**
*Any claim must be phrased over "names with a filed float", and the desk must
not quietly read it as "names".*

**POWER, HONESTLY:** the anchor is on ~15% of researched issuers and the ledger
on 90%, so the testable intersection is **roughly 15%** — and the anchor is
**partly re-derivable backwards**, since the filings are already stored and
parsing is retrospective. **Unlike every other instrument this register built
today, this one CAN be run on history**, which is the strongest argument for
doing the parse first.

## Ownership

- **Research Pipeline:** the parser, the self-check, and rejecting unverified
  triples. **Per-field locality is a requirement, not a style note.**
- **Design:** the render, in his words, with provenance retained.
- **R&D:** the ratio definition, the evaluation above, and the population caveat.

## Related

- [../threads/rnd.md](../threads/rnd.md) — the 90%/0.9% measurement, the stated-float parse traps, and the three-measurements-of-24-excerpts history
- [2026-09-25-catalyst-source-reach-spec.md](2026-09-25-catalyst-source-reach-spec.md) — the other half of what the desk cannot currently see
- [../threads/design-archive-2026-09.md](../threads/design-archive-2026-09.md) — the bound-never-occupies-the-float-slot rule
