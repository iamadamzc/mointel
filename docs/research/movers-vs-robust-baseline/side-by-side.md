# Big movers: the movers rule (A) vs a robust RVOL baseline (B)

*Seat `local_5f4bfcf8` (Research-tmi), 2026-10-01. DRAFT: three inputs are still owed and are marked PENDING. Nothing here ships anything; both options wait for his decision.*

**His question** (2026-10-01T12:42:22Z, Integration's transcript `1bfab363`): "we went pretty fast on that. was there a cost analysis? (not $, system cost, compatibility, design, etc.) does it make sense? we're slowly becoming a scanner doing that." **His requirement** (12:14:00Z): "VEEA is up 43% from close. it should absolutely show on the baord somewhere." **His ruling** (12:53:31Z): "yes, wait for the comparison."

- **(A) Movers rule, as built** (`research/movers` at `aaebfc42`, spec `d02cfb36`). The board stays the top 50 by RVOL, and up to 10 in-band names moving +20% or more that are not in it are added below, flagged as movers.
- **(B) Robust baseline.** RVOL stays the only principle, but its denominator becomes the MEDIAN of the prior 20 sessions (B1) or a 10% trimmed mean (B2) instead of the mean. `rvol.ts:4-14` pins the mean as the backtested definition, so B is a definition change and his call.

Evidence: A's replay (`docs/research/board-movers-replay-2026-10-01/`), and B's replay, pre-registered in `prereg-b.md` (`09d33239`) before any B number was computed (`replay-b.js`, raw `replay-b-raw.json`). Both replays use the same local copy (`market-prod-2026-09-29.db`), the same sessions (09-14 to 09-25, ten sessions) and the same checkpoints (08:00, 09:00, 09:25 and 10:00 ET). B's script reproduces A's 19 additions exactly.

## 1. Does it get big movers onto the board?

| | A | B1 (median) | B2 (trimmed) |
|---|---|---|---|
| The 19 big-mover rows A added (+20% or more, off the top 50) | all 19, by construction | **5 of the 12 that passed the gates** | **2 of 12** |
| Big movers still off the board on those checkpoints | 0 (the cap of 10 never bound) | A would still add **16** on top of B1, vs **18** on today's board (39 checkpoints) | not computed |

**Gates.** The copy holds no true per-day volumes for the universe, so B is computed from a proxy: each day's final `cumulative_volume`. A control arm, the MEAN of the same proxy, had to reproduce today's board to 45 of 50 names. It did on **39 of 40** checkpoints; 09-21 10:00 failed at 43 of 50, so USDE there is UNTESTED. Each name's proxy mean also had to sit within 10% of its stored baseline. **7 of 19 failed** (FTFT twice, BMGL, NCPL on 09-23, GDC, LGCL, USDE), mostly on splits or missing days, so they are UNTESTED, not misses.

**The named six:**
- **CMND** (09-17, +27.8%): in under B1 (31st) and B2 (26th).
- **AEHL** in on 09-17 under B1 (45th; B2 54th); out on 09-22 (282nd).
- **SVRN** (09-18, +35.3%) just misses (B1 52nd).
- **NCPL** (09-24, +35.6%) ranks LOWER under B1 (75th) than today (56th).
- **FTFT** UNTESTED (its proxy is off by 21%).
- **VEEA:** PENDING, see section 1a.

### 1a. VEEA today (an estimate, as registered)

VEEA's B1 denominator on the copy is **249,061 shares** (median of 20 copy dates, 09-01 to 09-29; 09-30 is not in the copy). The same 20 proxy days' mean is 13,416,864, matching the hand-off's 13.4M. *The hand-off's "median 346k" was from a window this seat has not checked; 249k is the registered one.* At 10:00 ET the 50th-place B1 RVOL on the nine tested replay days ran **2.24 to 4.16** (median 2.56). So VEEA clears every replay day's cut under B1 with about **1.04M shares by 10:00 ET**, and none of them below about 0.56M. **PENDING: Ops's read of VEEA's 04:00 to 10:00 ET volume (scheduled 14:03Z).**

## 2. What else it does to the board

| | A | B1 | B2 |
|---|---|---|---|
| Names on the 50 that change | none; 0 to 3 rows added, all at 09:25 or 10:00 | **11 to 23 per checkpoint, median 15** | 7 to 17, median 11 |
| What comes in | +20% movers only | of 613 entries (summed over 39 checkpoints), **395 are DOWN on the day**, 181 up 0 to 10%, 37 up 10% or more, 11 up 20% or more | not broken out |
| Thin names (top-50 names under 100k shares at t, median per checkpoint) | unchanged | 20 (vs 24 under the proxy mean) | 21 |

Under B the typical newcomer is a name that had one huge day inside its last 20 sessions and is now fading on ordinary follow-through volume. Example, 09-17 10:00: DLXY -53.7%, MEDS -22.9%, NAMI -34.0%, TGL -35.6%, VEEA +7.0%. A median makes that one day stop counting, so the next weeks' normal volume reads as high relative volume. The churn is measured B against the proxy mean, so it is the statistic, not the proxy.

## 3. System cost

- **A:** one extra query per `/api/market` build (`readTopMovers`, `repo.ts:1140-1164` on the branch: one date's rows, band, `percent_change >= 20`, `LIMIT 60`). Web tier only (`readModel` is imported only by the app routes, `lib/mcp/tools.ts` and `lib/review/diagnostics.ts`). **No market-worker restart.** Payload: at most 10 extra rows. **PENDING: Ops's timing on a copy (scheduled 14:10Z): cold, p50, p95, max, query plan.**
- **B:** no extra fetch. The baseline is rebuilt once per trading date from daily bars already fetched (`worker/runtime.ts:795-847`), and B changes one reduce (`rvol.ts:93-97`). **But it runs in the market worker** (Ops, verified here: `MarketRuntime`, `runtime.ts:202`, is what `worker/alpaca.ts` runs). So:
  - **Shipping B means a market-worker restart** on his word with no session in progress. That drops and reconnects the one SIP connection, and every release since 09-30 has avoided it.
  - **It applies only from the next baseline build:** existing rows for a date are never rebuilt (`runtime.ts:773-791`), and `worker/baseline.ts` builds for the current date only.
  - **The stored names say "average"** (`rvol_baseline.average_volume`, `baseline_average`), as does the RVOL column tooltip (`columnTitles.ts:68`, "against the average"). The drawer prints "average N shares" (`TickerDrawer.tsx:514-516`), and the board's formula text says "average volume over the previous 20" (`DiscoveryBoard.tsx:809-817`). Each needs a rename or an honest label.

## 4. Compatibility (every reader, by file; inventory in `readers-inventory.md`)

**A changes no existing reader.**
- `ranked` excludes movers (`readModel.ts:614`, branch); movers travel as their own list, `discovery.movers` (`:648`).
- The only other place a mover appears is the `demand` map, whose one UI reader is a price lookup (`DashboardShell.tsx:656`).
- Every downstream consumer reads `discovery.ranked` or queries `ticker_session` by `rvol_rank` directly: the dashboard (`merge.ts:568`), the MCP tools, review diagnostics, research triggers, checkpoints, reports and the archive. Movers carry no persisted rank, so none of them sees one.
- **Nothing renders movers until Design wires them** (its render pick on `558f5cb5` is still open).

**B changes the meaning of a value read across the desk.** The inventory counts, approximately, files that compute it (~9), persist it (~9), rank or select by it (~22), display it (~27) and compare it across time (~15). The ones that matter:
- **After-hours participation moves too.** It divides by the same baseline (`afterHours.ts:57-67`, `engine.ts:1678`, `:1919`), so the after-hours board changes, not only the daily one.
- **A research guardrail shifts.** `guardrails.ts:318-319` lets a catalyst stand as FLOW_DOMINANT only when `rvol >= 5`. RVOL rises under a median for spiky names, so more names pass. That is grade-affecting.
- **History splits at the change date.** Checkpoints (`desk_assessment_tickers.rvol`), `rth_final_rvol`, the archive's `final_rvol` (`lib/archive/coverage.ts:405-411`), the first-write latches (`repo.ts:863-866`, `:893-894`) and the RVOL bands in `worker/dead-while-ranked.ts:306-311` would mix mean-era and median-era values. The cycle fingerprint buckets `floor(log2(rvol))` (`lib/desk/assessment.ts:89-91`), so it flips if the change lands between checkpoints.
- **No test tells mean from median.** Every `buildBaseline` fixture uses a flat volume (`tests/market/rvol.test.ts:7`; one test zeroes a single day, which is excluded), so a B change needs a new test.
- **Already on a median:** the cycle module. `cycle.ts:845-858` computes its own RVOL from a MEDIAN and calibrated `CYCLE_START_RVOL = 5` to it. Its comment states that the stored `rvol` divides by the mean. So **the desk already runs two RVOL denominators.** B would make them one, and that comment would need updating.

## 5. Design: one principle on the board, or two

PENDING: Design-tmi's paragraph, to be inserted verbatim.

## 6. Product: does the board stay an RVOL board?

- **A:** the ordering stays RVOL, untouched. It adds a second reason for a row ("moving 20%+"), which is what a gainers scanner does. Measured size: 0 to 3 rows per checkpoint, none before 09:25 in the replay. Whether that second reason belongs on his board is the design question, not a measurement.
- **B:** stays one principle in name, but changes what the number means and about a third of the names. The names it brings in are mostly red, and it still leaves most big movers off (7 of the 12 tested). It does not reach the replay's big movers without A on top.

**What neither shows:** whether either ordering picks better trades. The backtest that fixed the mean was not re-run. The latch and the after-hours board were not replayed. Ten sessions.
