# Session reports: Design's part

**Design-tmi, 2026-09-27. A DESIGN, not a build.** It goes to Research, who
links it from `design.md`, and it reaches him only as part of Integration's
whole design, never on its own.

The brief asks three things: **where each report lives, how it arrives at the
session boundary and what the reader sees if it has not, and how a reader
tells a fresh report from a stale one.** The prose itself (voice, sources, the
checker) belongs to Research, Marketing and Commercial. This file only covers
the surface the prose appears on.

*Opened for this, not remembered:* `DashboardShell.tsx:425-513` (layout order),
`DeskAssessmentStatus.tsx` (the header's next-checkpoint line),
`AssessmentHistory.tsx` (the selector and the frozen snapshot board),
`lib/desk/schedule.ts` (`relevantUntil`, `generatedLate`, `highValue`).

---

## 1. Where it lives

**A REPORT IS PROSE READ ONCE PER SESSION, NOT A TABLE WATCHED ALL SESSION.**
That rules out both neighbours as its home:

- **Not the checkpoint selector.** `AssessmentSelector` *replaces* the live
  board with a frozen one. A report read that way would take the board away
  at exactly the minute it is needed. At 07:00 the report and the board have
  to be visible together.
- **Not a modal on arrival.** The report lands at a session boundary, which
  is the moment the reader is busiest. Anything that covers the board then,
  even for a second, costs more than it gives.

**THE DESIGN: ONE LINE ON THE BOARD, AND A READING PANEL BESIDE IT.**

```
┌ HEADER ──────────────────────────────────────── Next 07:00 premarket ┐
├ FOCUS (0 px when empty) ────────────────────────────────────────────┤
├ BRIEFING  Premarket · 07:02 · 3 names to watch, 1 real catalyst  Read ┤  <- new, 1 row
├ DISCOVERY ──────────────────────────────┬─ READING PANEL (on Read) ──┤
│                                        │  Premarket briefing        │
│   the live board, unchanged            │  written 07:02 · data 07:00│
│                                        │  covers $1–$20             │
│                                        │  ── Moved overnight ──     │
│                                        │  NAME  sentence…           │
└────────────────────────────────────────┴────────────────────────────┘
```

- **The briefing line** sits between Focus and Discovery, one row, the full
  width of the board. It holds the report's kind, when it was written, and
  **one headline sentence written by the writer and passed by the checker.**
  It is not a summary Design generates. A line at the top of the board is
  what the reader sees without looking for it.
- **Read** opens the report in **the same right-hand slot the ticker drawer
  uses.** Every ticker named in the report is a link that opens that name's
  dossier in the same place, so reading a report and checking a name are one
  motion. The board stays visible and live throughout.
- **Once the report has been read, the line collapses** to kind + time, which
  is a per-viewer convenience kept in browser storage. It never disappears
  while the report is current, because a line that is missing reads the same
  as a report that never arrived.
- **Sections use fixed headings taken from his request**, so each report has
  the same shape every day and can be scanned. The words are Marketing's and
  the structure is Design's. Into RTH, for example: *moved in premarket · up
  and back down · held · real catalysts · watch into the open*. An empty
  section is **stated, never hidden**: "Nothing in our sources for this
  section." (constraint 2's wording).
- **Printing.** A report is the one thing on this desk someone would print.
  `@media print` renders the reading panel on its own, with the metadata
  header in section 3. Cheap, and it follows his standing preference.

**THE BAND A REPORT COVERS IS NOT THE BAND THE READER IS VIEWING, AND THE
PANEL MUST SAY SO.** Reports are written once for everyone; boards are per
viewer now that users set their own range (`4b7fca4`). A report over
`$1–$20` read by someone viewing `$0.50–$10` names tickers that are not on
their board. The panel header prints the report's band. A named ticker outside
the reader's current range still opens its dossier, and carries a quiet
qualifier, `not in your range`, rather than looking like a mistake. **Which
band a report is written over is not Design's call; see "Open for the whole
design".**

## 2. Arrival, and what the reader sees before it

**THE LINE HAS SIX STATES. EVERY ONE IS WORDED, AND NONE OF THEM IS A BLANK
OR A SPINNER WITH NO TEXT.**

| State | The line reads | Condition (an observable, not a clock guess) |
| --- | --- | --- |
| **Due later** | `Premarket briefing · due 07:00` | scheduled, `now < scheduledFor` |
| **Being written** | `Premarket briefing · being checked` | due, and no report has passed the checker yet |
| **Published** | `Premarket · 07:02 · <headline>` | a checked report exists for this slot |
| **Late** | same, plus the `late` qualifier | published after its tolerance. The same rule and word as `generatedLate` today |
| **Missed** | `No premarket briefing today` + a reason in trader words | past `relevantUntil` with nothing published |
| **Over** | moves into *Earlier today*, see §3 | the session it prepares has ended |

- **AN UNCHECKED DRAFT NEVER RENDERS, IN ANY STATE.** A report is either
  checked or absent. "Being checked" is honest about the wait, and it has no
  partial text to leak. If the checker strikes every sentence in a section,
  that section reads as empty (above). The strikes themselves go to
  diagnostics, never to the trader.
- **MISSED IS NEVER FILLED WITH YESTERDAY'S REPORT.** The worst failure for
  this surface is a Friday report showing on Monday with no mark on it. It
  reads as current, and nothing about it looks wrong. The reason line uses the
  existing health lights' vocabulary ("the research engine was offline"), so
  a missed report and a red light tell the same story.
- **Arrival is in the app only.** The briefing line changes, and the header's
  existing `Next` line gains the report's time (it already shows the next
  checkpoint). **No push, no email, no sound.** Those send something to a
  person outside the app and are a separate decision. None of the brief
  asks for them.
- **Timing belongs to Research.** Design needs one thing from the contract:
  every report slot carries `scheduledFor` and `relevantUntil` **exactly as
  checkpoints already do** (`schedule.ts:48-73`), so the six states are a
  pure function of stored fields and the current instant. The same rule as
  the header phase: *derive it, never trust a stored label.*

## 3. Fresh versus stale

**STALENESS IS SESSION MEMBERSHIP, NOT AGE.** A premarket report 90 minutes
old at 08:30 is current; one 12 hours old from yesterday is not. **No age
threshold can separate those two.** "Current" means *the session this report
prepares is the session in progress, or the next one*. It is a predicate, not
a number, the same shape as the graveyard's presence test.

**EVERY REPORT CARRIES THREE TIMES, AND THE PANEL PRINTS ALL THREE:**

```
Into-RTH briefing · for Mon Sep 28
data as of 09:20 ET · written 09:23 ET (4m ago)
covers $1–$20 · 50 names with live trade data
```

- **Data as-of is the one that matters, and it is not the publish time.** A
  report about 09:20 prices published at 09:23 describes 09:20. Two report
  times that differ by a few minutes are harmless; showing only one of them
  makes the reader assume they are the same.
- **THE PROSE IS FROZEN, LIKE THE SNAPSHOT BOARD, AND FOR THE SAME REASON.**
  `AssessmentSnapshotBoard` merges no live data into a checkpoint because
  doing so *"would look like a record and behave like a lie"*. A report
  saying "held $4.10" beside a live price of $3.20 is two true numbers from
  two instants. **So a price in a report always carries its time
  (`$4.10 at 09:20`), and the live price is one click away in the dossier,
  never inline in the sentence.**
- **When the session is over, the report moves** from the briefing line into
  an *Earlier today* list inside the panel (today's reports, newest first, plus
  last night's after-hours report). A past report is labelled by the session
  it prepared, never by "current".
- **A weekend or holiday gap is named, not counted**, using the rule he
  already approved for promoted rows: a Monday premarket report built on
  Friday's after-hours says `since Fri close`, not `3d`.
- **The "live trade data" count is on the header because of constraint 5.**
  The writer may narrate trade-level activity only for names with trades
  capture (the top 50 by rank). The reader deserves to know that a quiet
  sentence about a name may mean *we did not have its trades*, not *nothing
  happened*. The count says so in one clause, with no footnote.

## 4. What this needs from the contract, and nothing more

For each report Design reads: `kind`, `tradingDate` / `targetTradingDate`,
`scheduledFor`, `relevantUntil`, `dataAsOf`, `publishedAt`, `band` (min/max),
`liveCoverageCount`, `headline`, and `sections[]` of
`{ heading, lines[] of { ticker | null, text } }`. **Checked text only.** A
missing report is an **absent row plus the schedule entry**, never a row with
empty text. *Two states, not a value and an absence dressed as one.*

## 5. Open for the whole design, not Design's to answer

- **WHICH PRICE BAND IS A REPORT WRITTEN OVER?** The default `$1–$20`, the
  whole recorded `$0.25–$50`, or one report per band? It changes what every
  report says and what it costs. **This is a product decision and belongs in
  the block that goes to him.** Design's surface works under any answer
  because the band is printed.
- **Does a report count as a checkpoint?** If Research writes reports from
  checkpoints, a missed checkpoint means a missed report. The reason line in
  §2 then names the checkpoint, and it must not claim a cause it cannot see.

## 6. Build order when he approves (for sizing, not a plan)

1. The briefing line with its six states, driven by schedule entries alone.
   It can ship before any prose exists and read *due 07:00* honestly.
2. The reading panel in the drawer slot, ticker links, frozen prose, the
   three-times header.
3. *Earlier today*, print stylesheet, `not in your range`.

**Each step is visible and verifiable on the live board on its own**, so none
of it has to ship ahead of the thing it depends on.
