# Resizable columns: scope

**Design seat, written 2026-09-29 01:50 UTC (2026-09-28 21:50 ET), clock read via zoneinfo.**

> **BUILD APPROVED, DISCOVERY ONLY. His words to Design, 2026-09-29T02:41:45Z:
> *"2 yes discovery only"*,** answering "Build resizable columns as: drag any
> column edge on the Discovery board, remembered in this browser?" So it is
> option (A), with every guardrail below, widths in this browser, and **not the
> Researched names table.** It ships after the range release.

**His words, verified at his own turns** (Integration's session):
*"whatever happened to being able toadjust the column sizes?"* (01:20:52Z), then
*"yes scope resizable columns"* (01:26:07Z). **No resize mechanism has ever
existed in this repo.** There is no `col-resize` anywhere in git history, and no
commit mentions resizing before 06224ad. If he remembers one, it was in another
tool.

## How the tables size their columns today, opened

- **Discovery** (`DiscoveryBoard.tsx:546`) is `table-fixed`. Fixed widths:
  change mark 24, Ticker 112, Price·Move·VWAP 172, RVOL/PART 68, Now 68,
  Cycle 152, and Float 84 only while sorted by float. **Why and Risk have no
  width; they split whatever is left.** Headers are NOT sort targets; sorting is
  the chip row above the table.
- **Researched names** (`MomentumTable.tsx:149`) is `table-fixed` with the same
  pattern (Pri 62, Ticker 112, …, Why/Risk flexible). **Its headers ARE sort
  buttons**, so a resize handle there shares an edge with a click target.
- **Graveyard**: a small fixed table, opened rarely. Not worth resizing.
- **The audit's responsive width bands (§11 item 4: optional columns appearing
  at 1,920 px+) were never built.** No column appears or disappears with window
  width today, so there is nothing for a user width to fight. If the bands are
  built later, a user width applies to a column only while it is on screen.
- **The floor is tight.** At the 1,024 px floor the Discovery table is 982 px
  inside 1,014, so **32 px of headroom** (measured on the live board, recorded at
  `DiscoveryBoard.tsx:936-947`). At the floor, resizing mostly moves width
  between columns. At 1,440 px and up there is real room.

## The options

> **HIS CHOICE 1 — what he can resize.**
>
> - **(A) Drag any column edge, remembered in this browser.** Recommended.
>   Standard spreadsheet behaviour: drag a header edge, double-click it to fit
>   the column's content, and one `Reset widths` control puts everything back.
> - **(B) Two or three density presets** (Compact / Comfortable), the audit's
>   §9 item 24. Simpler, and it cannot produce a broken layout, but it does not
>   let him widen the one column he cares about, which is what he asked.
>
> **Recommendation: (A)**, with the guardrails below. (B) answers a different
> question.

> **HIS CHOICE 2 — which tables.**
>
> - **Discovery only** (recommended first). It is the surface he watches.
> - **Discovery and Researched names together.** About half a day more, and the
>   researched table's sort-button headers need the handle kept clear of the
>   click.

> **HIS CHOICE 3 — whether widths follow his login.** See "Where widths are
> remembered". Recommendation: in this browser now; they move to his account when
> sign-in ships, with no change to how resizing works.

## The behaviour of option (A), which is Design's to get right

**Interaction**
- A 6 px handle on each header's right edge, `col-resize` cursor, visible on
  hover and on keyboard focus.
- **Drag** sets that column's width. **Double-click** fits it to the widest
  content currently on screen, measured at render. **`Reset widths`** sits beside
  `Top 12/25/50` and restores every column.
- **Keyboard:** each handle is a focusable separator (the WAI-ARIA window-splitter
  pattern). ←/→ move it 8 px, Shift+←/→ 32 px, Enter fits, Delete resets that
  column, and the width is announced.
- On the researched table a drag never triggers the sort: the handle is outside
  the sort button and swallows its own pointer events.

**Guardrails**
- **A column can never go narrower than its own header in the SORTED state**,
  caret included, measured per column. That is the `Now` defect from
  2026-09-25 (the head was 17 px short of its own word whenever it was the
  active sort, and the caret leaned into `RVOL`), made impossible rather than
  remembered.
- **No horizontal scroll, ever.** Widening one column takes the width from Why
  and Risk, down to a floor (~120 px each). Past that the handle stops. It does
  not push the table past the window, which would bring back the audit's
  first-rank defect (fields off the right edge, the ticker lost on scroll).
- **Why and Risk stay the flexible columns.** If he sizes both, Risk takes the
  remainder.
- **On a narrower window, stored widths shrink proportionally** to fit. They are
  never discarded, so they return when the window grows.
- The Float column keeps its own stored width and takes its space from Why/Risk
  when it appears, as it does today.

**Where widths are remembered**

| | This browser (recommended now) | His account |
| --- | --- | --- |
| Works today | Yes | No: production has no per-user sign-in yet (the cut-over is built, not shipped) |
| Server work | None | A preferences store, plus the sign-in cut-over first |
| Follows him to another machine | No | Yes |
| When it gets there | With this build | When sign-in ships; the stored widths move to the account then |

It is the same answer the price-range control got, for the same reason. **No
server change, so no deploy risk to capture.**

**What it does not change**
- The sort chips, the sort caret, and the `Now` header and its tooltip.
- The price-range control (`5e8b13c`), which lives in the toolbar and has no
  column. A range change does not touch widths.
- Anything printed in a cell. Width only decides how much of it shows before the
  ellipsis.

## Size, files, seats

- **Design only.** No server, payload or deploy-risk surface.
- `lib/dashboard/columnWidths.ts`: the pure width model (clamps, the Why/Risk
  remainder, proportional shrink, per-column minimums), fully unit-tested.
- `components/ColumnResizeHandle.tsx`: pointer and keyboard handling.
- `DiscoveryBoard.tsx`: a `<colgroup>` driven by the model instead of per-`Th`
  width classes, and the reset control.
- Browser storage behind try/catch, falling back to today's widths.
- **Discovery only: about 1.5 days, including tests and a live check at 1,024,
  1,280 and 1,920. Plus the researched table: about 2 days.**
- **Order: after the price-range release** (Integration's sequencing, not
  objected to), because both change the same board.
