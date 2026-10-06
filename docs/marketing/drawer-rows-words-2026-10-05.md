# Drawer rows 4, 12, 14: words (Design builds; Commercial reads row 4's country hover and row 14's status strings)

*Marketing-tmi, 2026-10-05. For Design's drawer rebuild from the dossier. Read from source: `lib/research/sec/submissions.ts:131` (country is the SEC business address `stateOrCountry`), `lib/research/catalyst/collector.ts:455-486` (INFERRED precision), `lib/market/cycle.ts` (cycle start constants `CYCLE_START_MOVE_PCT` 0.2 and `CYCLE_START_RVOL` 5, `SUPERRUNNER_ADVANCE` 2.0, `resolveCycleHistory`). I did not read `isCycleStart` or the board's flush formula. No em dashes, no forward tense. The label "Former runner" is held for Integration.*

## Row 4: company line (drawer header; hover on the board's ticker)

Value: "{company name}. {country}". Hover on the country: "Country is where the company's business address is, from its SEC filings." (The SEC field is the business address, not the place of incorporation; a bare country beside a name reads as origin, so the hover says which.)
- (a) dossier, no name: "No company name in the desk's research for this name."
- (b) no dossier: "The desk has not researched this name."
- Country absent: the line shows the name alone, and the drawer's detail row reads "Country: not in the desk's research". Dropping it silently from the line is fine only if the detail row says it.

## Row 12: catalyst block

- Label for the sources list: "Sources the desk read". Each line: "{date}, {title}".
- Event time (all with the date rule):
  - With a clock: "Aug 17, 08:15 ET, 2h ago" (as today).
  - Date only: "Aug 17, time not stated".
  - Inferred: "Aug 17, 08:15 ET, time inferred". Hover: "The source does not state a time. This time was taken from something next to the event, such as the time the filing was accepted."
  - None: "No event time".

## Row 14: cycle block (computed from daily bars)

- **Cycle high:** "{price}, {date}". Hover: "Highest price since the current run began, from daily bars through {last bar date}'s close. Today's trading is not included."
- **Flush from high:** "{X}% below the cycle high, at {last bar date}'s close". HOLD: this wording is right only if the number is (high minus last close) divided by high. In `cycle.ts:355` the cycle's retracement is a share of the ADVANCE, not of the high. Design or Research states the formula; if it is the share of the advance, the string is "{X}% of the advance given back, at {last bar date}'s close".
- **Prior runs**, one line each: "{start date} to {high date}: up {X}% from the base close to the high, high was {N} sessions ago". Hover: "A run starts on a day the stock rose at least 20% on at least 5 times its usual volume."
  - Empty: "No earlier run in the history we hold."
- **Run history status** (label held; strings only):
  - NONE: "No run behind it in the history we hold."
  - Runner: "A run behind it: the largest advanced {X}% from base close to high."
  - Superrunner: "A run of 200% or more behind it: the largest advanced {X}%."
  - Unknown: "Cannot tell: not enough daily history."

**Defect to settle before the strings ship:** `resolveCycleHistory` counts the CURRENT cycle toward the status when it is over (BACKSIDE or SHADOW) but lists only completed cycles as prior runs. So the status can read "A run behind it" beside "No earlier run in the history we hold." Fix by listing the current run first, labelled "Current run, over", or by wording the empty state "No earlier run besides the current one." Design and Research decide which; Marketing words either.
