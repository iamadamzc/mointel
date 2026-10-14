# L6 build plan: restate across listed splits (2026-10-14)

*Research-tmi, written before any L6 code, on branch `research/split-restate-on-3c2815ca` (3c2815ca, L7's head, with the split-ratios branch merged, `948c0fd7`). His yes on the substance: "yes to all three" (uuid 8e3e419f, item 3); his words approved: "1, aprove" (uuid 386a5600, relayed by Integration, to verify at his turn). Ships tomorrow evening (Integration: no deploy may start after 03:40 ET tonight). Rules: Commercial reads 98 (R1 to R4), 104, 108; read at 3c2815ca: `floatJob.ts`, `insiderBound.ts` 225 to 347, `splitProof.ts`, `floatRun.ts` 30 to 52, `alpaca/rest.ts` 323 to 348.*

## Today (read in the code)

- Count span (count date, D]: `splitSinceCount = withAnnouncedSplits(splitProofFromBars(...), announcedSplits, count.asOf, D)` (`floatJob.ts:243-244`); anything but NONE is CANNOT_VERIFY / SPLIT_SINCE_COUNT (`insiderBound.ts:330`).
- Holdings: h0 is the latest holding on or before the count's date. A holding is subtracted only when `splitProofR0` over [h0 date, count date] is NONE and no announced split falls in that span (`floatJob.ts:240-241`); otherwise it is refused, not subtracted (`insiderBound.ts:338-342`). **This is already read 108's required rule for holdings dated before the count.** L6 keeps it unchanged and pins it with a test.
- The job stores ex-dates only; `getSplits` drops rateless rows. `getCorporateActionsRaw` (`rest.ts:323`) keeps them, with the group.

## What L6 adds

1. **Fetch (R2):** the float job asks `getCorporateActionsRaw` for forward_split, reverse_split, unit_split, stock_dividend, stock_merger, stock_and_cash_merger, spin_off. Stored as `announcedActions: {group, exDate, oldRate, newRate}[] | null` (null = the fetch failed). `announcedSplits` (ex-dates) is still filled, so R-A's refusal is unchanged. An old row without `announcedActions` restates nothing.
2. **One function for the job and the reader** (`splitRestate` for the float, beside `splitProof.ts`): over the span (from, D], returns NONE_LISTED, REFUSE (with why) or RESTATE {factor, splits}. REFUSE when: any non-split share-changing action in the span (R2); any split without both rates; an ex-date ON `from`; an ex-date older than 9 months before D (Commercial's cutoff; with the 90-day count age it can bind only when a count is too old anyway); for the count, its FILING date on or after an ex-date while its as-of date is before (R3). Factor = product of new/old (shares side; R4).
3. **The count (R1, 1 percent):**
   - bars NONE and nothing listed: as today (no restatement).
   - listed splits and bars UNPROVEN (null factors): RESTATE, `provenByBars: false` (the triangle stays).
   - listed splits and bars FOUND: RESTATE only if the bars' price step over the span (first factor / last factor) equals the announced old/new product within 1 percent: `provenByBars: true` (no triangle); a mismatch REFUSES.
   - listed splits and bars NONE: the sources disagree: REFUSE.
   - nothing listed and bars FOUND or UNPROVEN: REFUSE (R1: an empty list is not NONE).
   - REFUSE keeps today's CANNOT_VERIFY / SPLIT_SINCE_COUNT (the face prints the filed count with the triangle, FILED_COUNT_RULE).
4. **Holdings when the count is restated:** each used holding's h0 is restated by the count's factor (no split between its date and the count, by the rule above), and hD by the splits after hD's own date; a REFUSE (for example hD dated ON an ex-date) refuses that holding (not subtracted). The smallest title is chosen AFTER restating. A holding refused today stays refused.
5. **The cell:** PRODUCED carries `restated: {factor, provenByBars, splits: [{exDate, oldRate, newRate}]} | null`; the range check compares the bound to the restated count. The reader (`floatRead.ts`) calls the same function at its later D.
6. **The projection for Design:** `toFloatBound` carries `restated` (bool), the splits as `{ from, to, exDate }` for the hover ("1-for-10" is from 1, to 10 for a reverse split), and `provenByBars`. Names sent to Design with the first build commit.

## Tests (each mutant with a predicted kill count)

The read-108 holding rule; R1 (empty list with UNPROVEN bars stays CANNOT_VERIFY); R2 (a stock dividend in the span refuses); R3 (a count filed after the ex-date refuses); R4 orientation on the real YAAS rows and one API response per direction; the 1 percent agreement and a mismatch; the 9-month cutoff; a rateless split; an ex-date on the count date; holdings restated (a 1-for-10 with an insider: the bound is never below the true one); the reader and the job agree at a later D; an old row restates nothing; the projection.

## Size

About 6 hours of Research, then Design about 1.5 hours, Ops's gate, the float job's deploy and a re-run. Not tonight.
