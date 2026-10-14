# Sheet step 1 effect read: result (2026-10-14)

*Research-tmi. Script and predictions `37055b9a` committed before the data; raw `4d384426` committed before it was read. Ops's export, taken before A5: 237 research versions (2026-10-08T08:01:15Z to 2026-10-14T02:01:43Z) and 237 INTERPRETATION usage rows; 0 unparseable, 0 replay rows, 0 held out.*

## For him, plainly

**The switch-off worked, and it touched very little.** Before it, the Sheet's opinion reached the research model in 10 of 104 versions (about 1 in 10). After it, in 0 of 133. Whether it changed any grades cannot be told from this data: only 2 of the names that used to get the Sheet's opinion were researched again afterwards. Nothing in the read argues against removing the Sheet (A4, A5).

## Against the predictions

1. **The flag held: HELD, and the check could have failed.** The detector saw a prior in 10 BEFORE versions (it must, or the check is blind), and 0 of 133 AFTER versions carried one. 6 AFTER versions had a Sheet snapshot that the flag withheld. Metadata keys present on all 237 rows.
2. **Input tokens: NOT DECIDED.** Only 2 TREATED single-call versions after the flag (median 12,139 against 10,661 before; CONTROL went 12,922 to 13,274). Two versions are no measurement.
3. to 5. **Agreement and grade change: NOT DECIDED** by the minimum registered before the data ("if either arm has fewer than 15 tickers present in both BEFORE and AFTER_CLEAN, predictions 3 to 5 are NOT DECIDED"): TREATED 2 tickers in both windows, CONTROL 8. The change shares (TREATED grade 50% of 2 pairs, CONTROL 37.5% of 8) are printed in the raw and say nothing at this size.
6. **The escalation path: 3 AFTER versions** were escalated with a structure conflict against the Sheet (an upper count), so the escalation model may have seen the Sheet's conclusion in up to 3 versions after step 1 (`pipeline.ts:338-347` at e0da6adf). A5 removes that path (Ops `2b80620a`, reviewed).
7. **The confound as a positive control: not readable** at this size either; the AFTER_ALL window adds 1 CONTROL ticker.

## What it means for A4 and A5

- Step 1 did what it said (no leak in 133 versions), so the switch-off is not hiding a defect.
- The Sheet's reach was small before it: about 1 version in 10 carried its opinion, and 7 of those 10 disagreed with the desk on at least one field (CONFLICT 7, AGREE 3).
- The effect of removing it on grades is not measurable here and is bounded by that reach.

**Not covered:** whether the Sheet's opinion was right where it disagreed; and names the research no longer revisits (the AFTER windows are 1.3 and 2.3 days).
