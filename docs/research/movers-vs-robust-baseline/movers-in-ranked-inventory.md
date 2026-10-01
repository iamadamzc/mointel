# Movers IN the board's rows: every reader, and what changes

*Seat `local_5f4bfcf8`, 2026-10-01. Every file:line below was opened by this seat; nothing is from a subagent. Code read: main at `4c478072` (UI and readers), and the movers branch `aaebfc42` (`readModel.ts`, `rangeCapture.ts`). No build.*

**His ruling**, verified at his turn: a queued input in Integration's session `1bfab363`, 2026-10-01T15:36:50.813Z.

> "if something is labeled as moving it should just be ranked based on all other parameters normally not placed in a separate group. it wont show on RVOL which is fine, but it will show on gap and now, etc."

This reverses the branch's "movers kept OUT of `discovery.ranked`" (`readModel.ts:614`, `:648` on `aaebfc42`). The floor is still open with him.

**The one assumption the answers rest on:** movers join `ranked` AFTER the ranked rows, never interleaved by position. Most of the "unchanged" answers below depend on it.

## The board (`components/DiscoveryBoard.tsx`, `lib/dashboard/view.ts`)

| Reader | file:line | With movers in the rows |
|---|---|---|
| Sort, then cut Top 12/25/50 | `DiscoveryBoard.tsx:308-309` (sorts all rows, then `slice(0, size)`) | **As he asked.** Under GAP, PM MOVE, PRICE or FLOAT, a mover sorts like any row and appears in the Top N if its value earns it. |
| RVOL / rank sort | `view.ts:327-343` (`rank` = `row.telemetry.rvolRank`), `:344-362` (`rvol`) | A mover carries its true rank (e.g. 120) or none, so it sorts after the 50 ranked rows. **Top 50 under the RVOL sort never shows one**, as he said ("it wont show on RVOL which is fine"). |
| Tie-break | `view.ts:487-493` (ties fall to rank, then ticker) | Unchanged. A mover tie-breaks on its true rank; null sorts last (the sort's stated contract, `view.ts:452`). |
| Missing-value count | `view.ts:430-446` (counts rows with no value for the key) | **Changes under the rank sort.** An unranked mover counts as "missing" there. A count, not an error. |
| Caption | `DiscoveryBoard.tsx:403-406` ("Daily RVOL rank · band · top N of rankedCount") | The caption still says "Daily RVOL rank" and `rankedCount` while some rows are movers. **A wording question for Design.** |
| Rank cell | (the cell renders the rank the sort reads) | A mover shows its true rank (#120) or nothing. Design decides whether that, plus a "moving" label, is the right signal. |
| **NOW sort** | `view.ts:472-475` (live 10 s rows first, then minute-grain rows, then none); `engine.ts:2183` (live capture subscribes to rank <= 50 and alive), `:2212` (or latched and alive) | ~~Does NOT work as he expects. ... a mover ranked below 50 that never latched has no 10 s capture.~~ **CORRECTED (Integration's catch; `liveband-result.md`):** a name latches the first time it is ranked at ANY rank in band (`engine.ts:1781-1791`), so nearly every mover is latched. The live set is then about the **top 250 by rank** (cap, `:2215-2222`). Movers get the NOW attach (`readModel.ts:575`, then `:596`, branch). **At 10% + 500k, 76 to 82% of movers rank 250 or better and ARE live on NOW.** The rest sort below every live row under NOW. Only those would need the market-worker change and its restart. |
| WHY and RISK cells | `lib/dashboard/why.ts:182`, `:192` ("Not researched yet."), `risk.ts:99-125` (both keyed on research status) | A mover is usually unresearched: automatic research takes `rvol_rank <= 12` only (`researchRepo.ts:136`; `research/config.ts:19`). **It reads "Not researched yet."** Any on-demand research path is NOT checked. |

## Other readers of the rows

| Reader | file:line | With movers appended after the ranked rows |
|---|---|---|
| Rows built from `ranked` | `lib/dashboard/merge.ts:568-570` | Movers become rows. Their row data exists (the branch puts movers in `demand`, `readModel.ts:652-653` per the earlier read). |
| Filters | `components/DashboardShell.tsx:377-380` | They apply to movers like any row. |
| Event-feed "top ranked" | `DashboardShell.tsx:404` (`merged.discovery.slice(0, rank)`, rank 12) | **Unchanged IF there are 12 or more ranked rows**, because it slices by position. With fewer ranked rows, as in a narrow set range or early premarket, a mover would count as top-ranked. |
| MCP board tool | `lib/mcp/tools.ts:185-210` (`slice(0, limit)`, limit at most 50) | Same position rule: unchanged with 50 ranked rows, movers included when fewer. |
| MCP events | `tools.ts:311` | Same as the event feed. |
| Review diagnostics | `lib/review/diagnostics.ts:565` (`topN = slice(0, discoveryRank)`) | Same position rule. |
| Header counts | `readModel.ts:630-637` (branch: from the server summary, falling back to `ranked.length`) | Unchanged while the summary carries the counts. **The fallback would count movers as ranked.** |

## Must stay excluded (Integration: "unless he says otherwise"), and do

| Reader | file:line | Why movers never reach it |
|---|---|---|
| Checkpoints (`desk_assessment_tickers`) | `worker/desk-assessments.ts:185-194` | It reads `ticker_session` by `rank <= captureCount` directly, never the board read. |
| Range capture | `lib/desk/rangeCapture.ts:10-12`, `:56-57` (branch) | `rankInRange` over `readRangeCandidates` directly, not `readModel`. |
| Reports | built from checkpoint rows (above) | Same as checkpoints. |
| Automatic research | `researchRepo.ts:111-140` | `rvol_rank <= 12` from `ticker_session`. |
| After-hours board | `readModel.ts:569-570` (branch: movers only when `board === 'DAILY_RVOL'`) | Movers are never added after the bell. |

## What this means for the build (decisions, not code)

1. ~~NOW needs a market-worker change to rank movers fairly.~~ **CORRECTED:** most movers (76 to 82% at 10% + 500k) are already live on NOW. A market-worker change (and restart) would add only the rest, the ones ranked worse than about 250. His call whether that remainder is worth a restart.
2. **Movers come last in `ranked`**, so the position-based readers above stay as they are; one test should lock it.
3. **A mover is usually unresearched**, so its WHY reads "Not researched yet." His call whether a moving name triggers research. That is a research-queue change with a model-bill cost.
4. **Design:** the caption, and the rank cell beside a "moving" label.
