# Off-hours drawer and snapshot-board words: design for Integration (not built)

*Design-tmi, eleventh seat, 2026-10-06. Ruled by Integration 30th as queue item 3: every name on the briefing and on the snapshot board opens a drawer between sessions, built from what the checkpoint row and its cited dossier version carry, labelled as of that checkpoint, never live, three states for what it cannot show; the snapshot board's raw enums and emoji get Marketing's words in the same build. This file is the design to rule on before building. Code read at production `84b4d425`.*

## 1. Why names are dead off-hours (the cause, from the code)

`TickerDrawer` renders only with `selectedRow = merged.rows.get(ticker)` (`DashboardShell.tsx:301-303`), and `merged.rows` holds only Sheet tickers plus `market.demand` (`merge.ts` `mergeDesk`). Between sessions `demand` is empty, so only Sheet names open. The snapshot board's rows (`AssessmentSnapshotBoard`, `components/AssessmentHistory.tsx:90`, rows at :196) have no click handler at all. At Sheet step 4 the Sheet list is gone and no name opens.

## 2. What the drawer reads, and what a checkpoint can supply

| Drawer part | Reads from the row | Off-hours source | Off-hours state |
| --- | --- | --- | --- |
| Header: ticker, company line, price and % | `ticker`, `intelligence` (dossier identity), `telemetry` | checkpoint row `price`, `percentChange` (or `ahPercentChange` on an evening board); company from the cited version | PRODUCED, with "as of {checkpoint ET}" beside the price, never the live dot |
| Desk read, conflicts | `intelligence`, `intelligenceState`, `comparison`, `research` (Sheet), `displayedFloat`, `floatCheck` | cited version's dossier; no Sheet, no live float | from the version; the Sheet comparison is absent (no Sheet row in a frozen view) |
| Setup grade | `setupGrade`, `setupGradeWired` | the checkpoint row's stored grade (P4, once Ops stores it) | NOT_YET dash until the columns exist |
| Morning check, morning catalyst | `MarketSnapshot.morningRead` | unchanged: it is already frame-based and dated | as built |
| Level ladder | `levelMap` (distances from the LIVE price), `cycleLevels`, `blueSky` | none that is frozen: distances from a live price do not exist off-hours | NOT shown; one line: "Levels are measured from the live price and show on the live board." (words: Marketing) |
| Automatic intelligence (catalyst, structure, cycle text, evidence, risk in the evidence) | `intelligence` | the cited version (`analysisVersionId` on the checkpoint row), cleaned by `readableIntelligence` | PRODUCED as of the version's `generatedAt` (already how these sections date themselves) |
| Live market section (`Demand · Alpaca`: quote, LULD, freshness, RVOL rank) | `demand` | the checkpoint row's stored market facts: price, %, RVOL, AH %, AH volume, AH participation, spread %, session high and low, halt state | replaced by a "Market at {checkpoint ET}" block of those stored facts; quote, LULD and freshness are live-only and are not shown |
| Sheet sections (cycle, notes, verbatim) | `research` | none | absent (no Sheet row) |
| Float cell | `floatBound` | Research's `floatCellAt` for the checkpoint date with the checkpoint's own dossier version (`floatRead.ts` says exactly this) | after the float release; NOT_YET until then |

## 3. The build

1. **Server, one read per open, not per poll:** a route `GET {base}/api/assessments/{id}/ticker/{symbol}` (and the review twin) returning the stored checkpoint row for that symbol plus the cited version's `AutoIntelligence` through `readableIntelligence` (citation tokens and em dashes out, `tickerSourceIds` dropped), or `{ onCheckpoint: false }`. Uses `readAssessmentTickers` and `readAnalysisVersionsByIds` (the reports already read "the dossier a checkpoint saw" this way). Fetched when the drawer opens a frozen name, like the dossier fetch F-10 recommends.
2. **Client:** `DashboardShell` opens a FROZEN drawer when the name is not in `merged.rows` and a checkpoint is on screen (the carried or selected one). A pure builder turns the route's answer into a `DeskRow` with `demand: null`, `research: null`, the cited intelligence, and a new `frozen: { checkpointId, completedAt, label }` field the drawer reads to (a) show the not-live banner, (b) swap the market section, (c) hide the ladder with its line.
3. **Which checkpoint:** the one the main area shows (`AssessmentPanel.carried` off-hours, or the View choice). A briefing name not on that checkpoint gets the drawer header, the banner, and "This name was not on the {checkpoint ET} checkpoint." (words: Marketing), never a blank.
4. **Snapshot board rows** get the same click and keyboard target as live rows (F-02), opening the frozen drawer.
5. **Banner:** the drawer's top line reads the board's own words, "Snapshot, not live", plus "as of {checkpoint ET}", and Back to live closes the drawer and returns the board.

## 4. Snapshot-board words (same build)

The change column and the summary line print the stored `changeSummary`, which the checkpoint writer composes from RAW values (`lib/desk/assessment.ts:202-275`: `"TRADING → UNKNOWN"`, `"catalyst unknown → WEAK_NEGATIVE_DILUTIVE"`, `"cycle GREEN_FRESH_FRONTSIDE → RED_BACKSIDE"`). Stored text cannot be re-worded reliably after the fact. Proposal: render the column from `changedFields` plus the two rows' stored values (this checkpoint's row and the previous checkpoint's row for the name, one more read in the snapshot route), each part through the board's display words, and leave the stored `changeSummary` as the audit record. The cycle, catalyst and structure cells use the board's words without emoji (audit F-29). Marketing words: one line per change class (the classes `lib/desk/assessment.ts` writes into `changedFields`, listed for Marketing from the code at build time, not counted here), the halt states, and the empty-cell rule; Commercial reads.

## 5. What this needs ruled

1. The frozen drawer as above, including NOT showing the ladder off-hours (my recommendation: a ladder measured from a stale price would read as live).
2. The per-open route (one dossier per open) rather than adding dossiers to the snapshot board's payload.
3. Rendering the change column from `changedFields` and stored values, not the stored text.
4. Order: after the float release and the Confirmation build; Sheet step 4 waits on it.
