# New-report notice, opening on the relevant report, and the priority badge: proposal

*Design-tmi (twelfth seat, `local_83b5b7ec`), 2026-10-07 (UTC date). For Integration's ruling on layout, inside his words (Integration 35th's relay, his turn 2026-10-07T23:58:21.075Z, verbatim): "let's build the priority badge. there should be some kind of onscreen notification regarding a new report. and when the system opens it should bring up the currently relevant report." Code read at the v6 release head `ea48b64b` (production `0097d163` merged with Research's v6): `components/SessionReports.tsx` (`BriefingLine`, `InlineBriefing`, `ReportWindow`), `components/DashboardShell.tsx` 230-243 and 340-500, `lib/dashboard/sessionReports.ts` `reportTimeline` 642-692. Nothing here is built. Every string in quotes is a PLACEHOLDER for Marketing, then Commercial.*

## 1. The priority badge: nothing of Design's to restack

At `ea48b64b` and at production `0097d163`, the badge is already built and shipped, hidden: `SetupGradeBadge` in the Ticker cell, its tooltip, the drawer section, the filter chip, the sort chip and the legend all render once `MarketSnapshot.setupGrades` is a map (`lib/dashboard/merge.ts:565-567`, `setupGradeWired`). **Nothing on the release head writes that map:** no grade columns in the store and no reader in `getMarketSnapshot` (searched `lib/market/store`, `lib/desk`, `worker`, `app` at `ea48b64b`). That is Ops's grade-columns work (ordered by Integration 35th, `d1f17e6a`).

What Design does when Ops lands it: (a) check Ops's stored shape against the client's `SetupGrade` type and `setupGradeView` (`lib/dashboard/setupGrade.ts`) before wiring, the float lesson (the provisional type did not match Research's and `.map` would have thrown); (b) a live read on a review link after 10:00 ET: a graded row, a no-grade row's aria-label, the filter and the sort.

## 2. The notice that a new report was published

**What exists.** The briefing line is one row between Focus and Discovery, always present while a report is current. It already knows "read": opening a report stores `kind:range:date@publishedAt` in the browser (`mointel.reportsRead`, last 20), and an unread published report shows its lead sentence on the line; a read one shows kind and time only. So the 10 pm edition, having a new `publishedAt`, is already unread when it lands. What is missing is anything that DRAWS THE EYE when a report arrives while the page is open.

**Options.**

| | What it is | Hides live data? | Cost |
|---|---|---|---|
| **A. The line itself** (RECOMMENDED) | When the current report is published and unread, the line takes an accent left border and tint and a small "New" mark before the kind; the line's height does not change. Opening it, or a "Dismiss" control on the line, marks it read and the line returns to normal. | No: it is the row already reserved for it. | Small: the read state exists. |
| B. A toast | A box in a corner for N seconds. | Yes: it sits over the board, and it can cover a row at the moment it matters. | Small, and against his "never hides live data". |
| C. The browser tab title | "(1) The Momentum Intelligence..." while a report is unread. | No. | Tiny. Helps when the tab is in the background, which A cannot. |

**Recommendation: A, plus C.** No sound, no motion, no auto-open mid-session (section 3).

**Which reports notify:** each of the five (16:00 after-hours, 8:30 pm evening, its 10 pm edition, 9:25 into-the-open, 2:30 power hour), on the first poll that sees it published and unread for the viewer's range. **The 10 pm edition:** notify only when `revisionOf` shows lines or the summary written for it; a "Published again" edition (nothing written, everything carried) updates silently, because a mark for a report that says nothing new spends the reader's attention on nothing. Its mark reads "Revised", not "New". Integration's call; the alternative is to mark every edition.

**Words needed from Marketing:** the mark ("New", "Revised"), the dismiss control's label and hover, the tab-title prefix if any, and whether the line's text changes when marked.

## 3. Opening on the currently relevant report

**"Currently relevant" already has a rule** in `reportTimeline`: the latest slot whose scheduled time has passed. With Research's slots that is: 09:25 into-the-open until 14:30; power hour until 16:00; after-hours until 20:05; the evening report from 20:05 until the next 09:25, its 10 pm edition shown first once published (the 8:30 one kept as superseded). This matches his example ("the evening report from 8:30 pm through premarket"). **Proposed: keep this rule; do not add a second one.**

**"When the system opens":** proposed meaning, the first page load of the board in a browser session. It never fires again on a poll or a tab switch (section 2 covers arrivals while open).

**Options for what opening does.**

| | What happens on load | Hides live data? |
|---|---|---|
| **A. Between sessions as today; during a session, the window opens** (RECOMMENDED, with the 07:00 to 10:00 exception below) | Off-hours with an empty board, the briefing already leads the page inline (his ruling B, 2026-10-05), so nothing changes. With a live board, if the current report is published and the viewer has not read it, the report window (the existing modal, the ticker-drawer pattern) opens on load; Escape or the close button returns the board, and the report is marked read. | Only until dismissed, and only at load, before the viewer was watching anything. |
| B. Never auto-open; the line's "New" mark only | Section 2 only. | No. Does not do what he asked ("should bring up"). |
| C. A docked, non-modal panel beside the board | The report beside the board instead of over it. | No, but at the 1,024 floor the board loses the panel's width (the 8 columns already use it), so it is a layout change of its own. Not recommended now. |

**The 07:00 to 10:00 ET exception (Integration's call, flagged):** the premarket and the open are the window the board exists for. A modal over the board at 08:55 on a reload costs the viewer the board until they close it. Proposed: inside 07:00 to 10:00 ET, opening on load is replaced by the line's mark (section 2). Without the exception, A applies at every hour.

**Where it opens:** the existing report window, not a page or route change. Between sessions, the existing inline briefing.

**When no report exists yet:**
- current slot CHECKING (due, not yet published) or DUE: nothing opens; the line says so (its existing words).
- current slot MISSED: nothing opens; the line gives the cause it has.
- **No fallback to an earlier report.** Auto-opening yesterday's evening report at 09:40 because today's into-the-open is late would put a stale report in front of the board as if it were current. The line's "Earlier today" button stays one click away.

## 4. Order and what is needed from whom

| Item | Needs | Then |
|---|---|---|
| Priority badge | Ops's grade columns and the `setupGrades` reader | Design: shape check, live read |
| Notice | Integration rules A+C and the 10 pm question; Marketing words; Commercial | Design builds on the v6 release head after v6 is verified live |
| Open on load | Integration rules A, B or C and the 07:00 to 10:00 exception; Marketing words (none new if A) | Same build, same head |

Both report items are client-only (`DashboardShell.tsx`, `SessionReports.tsx`, `lib/dashboard/sessionReports.ts`, browser storage for read state, which is already where it lives). No server or payload change.
