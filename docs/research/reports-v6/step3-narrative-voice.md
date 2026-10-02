# Reports v6, step 3: the opening narrative's voice, length and templates

*Marketing-tmi, 2026-10-02. Written against the pre-registered facts (`prereg-narrative-facts.md`, `76d02b5f`) and Integration's scope calls. The model words the GIVEN numbers; it never counts and never names a ticker no fact gives. This file fixes the words; Research's prereg fixes which numbers exist.*

## Register (the narrative inherits the report voice)

- Plain and declarative, present tense for the checkpoint's frame. His "uncomplicate it": a short read, not a stat dump.
- Every number is a given fact; every ticker is in the given facts; it states nothing else (prereg rule). No adjective a fact does not define ("busy", "quiet", "hot") = seed N8.
- F3 is catalyst FOUND, never causation: "had fresh news in our sources", never "fresh news drove the move" = seed N5.
- No theme or sector claim in v6 (F8 is v6.1) = seed N6. The template has no sector slot.
- No em dashes. No buy/sell, even descriptively. No "the real catalyst", no "clearly", no landing-clause tic. "none we could find" is the register for a zero catalyst count (a claim about our sources, not the market).
- Direction is never implied past the fact: a leader with a negative percent does not "lead up"; a count is not dressed as good or bad.

## Length

- **Intraday** (into RTH, into power hour, after hours): one breath, about two short sentences.
- **Recap** (premarket): a short paragraph, three to four short sentences. Still tight.

## Facts available per kind (from the prereg)

- **Intraday:** F1 (breadth), F2 (leader), F3 (fresh count). No F6/F7/F9 (recap only).
- **Recap (premarket):** F1 (breadth, 16:00 regular-session basis), F6 (50% movers), F7 (give-back), F3 (fresh count), F9 (tracking = the covered names), G (footnote: in-range traded names with no 16:00 close). No F2 leader line (the recap is about the cohort, not one name).

## F1 window wording, data-driven

The words MUST follow the row's `count_window` (prereg F1), never a fixed phrase:
- regular-session window -> "today" / "on the day"
- after-hours window -> "after hours"
- session-to-date (intraday) -> "so far today"

A window label that does not match the row's `count_window` is a defect (see proposed seed N10).

## Intraday template

Slots are given facts. `{window}` from `count_window`; `{P}` and its frame from the leader row's `reference_basis` (never a generic "up P%").

> Across $1 to $20, {traded} traded {window}, {up} up and {down} down. {LEADER} leads, up {P} percent {basis}. {nfresh} of the names the desk covers had fresh news in our sources.

Variants:
- Leader percent negative: "{LEADER} tops the board, down {P} percent {basis}." Never "leads up" on a negative.
- `nfresh` = 0: "None of the names the desk covers had fresh news we could find."
- `nfresh` = 1: "One of the names the desk covers had fresh news in our sources."
- Number agreement throughout ("1 traded", "1 up").

## Recap template (premarket), his shape

> Across $1 to $20, {traded} names traded {window}, {up} up and {down} down. {n50} ran past 50 percent off the prior close, and {nrt} of those gave the entire move back by the close. {nfresh} had fresh news in our sources. Into the next session the desk is carrying these {ntrack} names.

- **"gave the entire move back by the close"** is the F7 definition: a 50% mover that closed the regular session at or below its prior close. Shown in the step-5 sample so he sees the definition (Integration).
- **F9 line** heads the ticker detail, it does not re-list it (Integration's wording call): "the desk is carrying these {ntrack} names", framed as what the desk covers, never "your watchlist" or "pinned".

Variants (the writer picks by the given numbers):
- `n50` = 0: "No name ran past 50 percent off the prior close." Omit the give-back clause (nothing to give back).
- `n50` >= 1, `nrt` = 0: "...ran past 50 percent off the prior close, and none of those gave the entire move back by the close."
- `n50` = 1: "One name ran past 50 percent off the prior close, and it gave / it did not give the entire move back by the close."
- `nfresh` = 0: "None of them had fresh news we could find."
- `ntrack` = 1: "Into the next session the desk is carrying one name."
- **G footnote**, shown only when `G` > 0, as a quiet trailing sentence, never hidden (prereg): "{G} in-range names had no regular-session close and are not in these counts." When `G` = 0, omit.

## Per-line tags (Design option B), from the stored enums (verified first-hand)

- **Cycle** (comma form): `GREEN_FRESH_FRONTSIDE` -> "green, fresh / frontside"; `YELLOW_FRONTSIDE_WARNING` -> "yellow, frontside warning"; `RED_BACKSIDE` -> "red, backside"; `UNKNOWN` -> no chip.
- **Grade** (`catalyst.grade`): `STRONG` -> "strong"; `LEGITIMATE_POSITIVE` -> "legitimate / positive"; `MODERATE_MIXED_SECONDARY` -> "moderate / mixed / secondary"; `WEAK_NEGATIVE_DILUTIVE` -> "weak / negative / dilutive"; `NONE` -> no grade chip; `UNKNOWN` -> no grade chip.
- **Explains the move** (`plausiblyExplainsMove`): true -> "fits the move"; false -> "doesn't fit the move"; null -> "fit not established".
- **Supply** (`structure.supply[]`), chip = {type} {amount or $capacity} ({form}), never "sell"/"selling". Types: `SHELF_CAPACITY` -> "shelf"; `ATM` -> "ATM"; `REGISTERED_RESALE` -> "registered resale"; `RECENT_OFFERING` -> "recent offering"; `WARRANTS` -> "warrants"; `CONVERTIBLES` -> "convertibles"; `EQUITY_PURCHASE_AGREEMENT` -> "equity line"; `PIPE` -> "PIPE"; `PREFERRED_CONVERSION` -> "preferred conversion"; `ACQUISITION_SHARES` -> "acquisition shares"; `OTHER_ISSUED_SHARES` -> "other issued shares". `registrationStatus` is free-text hedged prose, NOT chip material.
- **Float footer** (once, not per row): "The desk cannot independently verify float for these names." A verdict, never a number. Design places it.

## Seed-class review (N1 to N8), and proposed additions before the freeze

N1 to N8 cover: wrong F1 count, wrong F6/F7 count, wrong leader or percent, wrong F3 count, F3 as causation, a theme/sector claim (F8), a ticker no fact names, an adjective no fact defines. Good coverage. Three gaps I propose adding before the freeze, since the narrative now carries facts N1 to N8 do not reach:

- **N9: a wrong F9 tracking count, or a tracked ticker not in the covered set.** N7 catches a stray ticker, but not a wrong `ntrack` number (e.g. "carrying 10 names" when 12 are covered).
- **N10: an F1 window label that does not match `count_window`** ("after hours" when the row is the regular session, or the reverse). The window is now a data-driven slot, so a mismatch is a real defect.
- **N11 (harder, omission): G greater than zero but the narrative omits the G footnote.** Tests the "never hidden" rule. Omission defects are harder to seed and check; include only if the checker can assert the footnote's presence when G > 0.

## Open items this voice rests on

- Integration's breadth-basis call (recap = regular session, 16:00 basis), which the prereg carries as a proposed amendment. The window wording and the day-vs-after-hours framing depend on it.
- Ops's `count_window` read, which sets the F1 window words per kind.
- Research confirming F1 can read the 16:00 latched `ticker_session` values for the recap.
