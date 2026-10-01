# Resistance levels ("mark your chart"): spec

*Research, 2026-09-29. Owners: the computation and this spec are Research's; the
history store, the fetch worker, the 15m rollup job and any table are Ops's;
the section is Design's. Routed as a build by Integration (19th). The ship to
the board is his yes, enumerated by literal sha.*

## His rulings this rests on (verified at his own turns)

| ruling | where |
| --- | --- |
| "left, up, mark the top. if there are multople tops within the same 2-3c, mark it near the middle … these become areas of resistance" | the 18th Integration seat's transcript `ffac4a37` (`local_92208da3`), 2026-09-29T22:05:23Z |
| "a, show all 7": show every candidate level, his lines always among them | Research's transcript `8cd59d1e`, 2026-09-29T22:44:18Z |
| "i just want these levels drawn … you can confirm … that these are indeed resistance levels": they are **labelled resistance levels** | `8cd59d1e`, the turn after 22:56:28Z |
| ~~"6–12 months of daily candles. last 30days 15m"~~ (windows SUPERSEDED by the row below); still standing: "If the nearest major historical peak is two years back and just above today's price, I'd still mark it"; "You don't need to mark every candle back to the stock's listing"; today's run tops count; premarket uses prior sessions | `845dd4cb`, 2026-09-29T22:33:08Z |
| "yes, build the history store" (all band names, downloaded once, kept, 15m forward from our own capture, re-fetched on a split) | `845dd4cb`, 2026-09-29T23:00:48Z |
| **"5m candles for today only. 15m for anything older. up to 39 days. and dailys beyond."**: the windows | `8cd59d1e`, after this spec's first version (`e543a75`) |

**The label is his ruling, not a measurement.** No test here showed that these
levels turn price back more than other prices (`research.md`, 009edef). The one
morning he showed (SLXN, 70% vs 59%) is an illustration. Nothing in code, copy
or docs may say "measured" or "tested" about them. **There is no strength or
highlighting field.** That question was withdrawn; the only tag is timeframe.

## 1. The levels, at one moment for one name

**Inputs at compute time `t`:** `L` = the last trade price, meaning the latest
1m close at or before `t`. Completed candles only, meaning a candle whose end is
≤ `t`.

**Three windows that do not overlap, one ladder per window, merged.** His ruling
(`8cd59d1e`, after the spec's first version): *"5m candles for today only. 15m for
anything older. up to 39 days. and dailys beyond."*

| window | candles | covers |
| --- | --- | --- |
| today | 5m, rolled up from 1m | the current session only |
| older | 15m from the history store | the previous session back **39 calendar days** (read as calendar days; his words say "39 days") |
| beyond | daily from the history store, split-adjusted | older than 39 days, out to 12 months |

**In each window separately,** walk its candles backwards from the newest. The
**first** candle whose high ≥ `L` starts that window's ladder, and its high is the
first mark. Each earlier candle in the SAME window whose high is **greater than
the last mark** is the next mark. Keep only marks > `L`. Then **merge the three
windows' marks** and cluster them (below). Marks are **wick highs**, not bodies
(his "top of it"; bodies recovered 3/5 of his SLXN lines, wicks 5/5). Each mark
keeps its window, which becomes the level's timeframe tag.

**Why per-window and not one continuous walk (f6c41e4 said continuous, which was
this seat's addition, not his words):** on one continuous walk, a higher top
nearer to now hides every lower top further left. **His own BIYA chart marks
August tops at 2.42–2.50 although today's run printed 2.53–2.74 above them.** So
a higher recent top must not erase an older lower one across windows. Within a
window, the ladder is his "left and up".

**Far back, the one extension:** if the DAILY window's own ladder has no mark
(price is above every daily high from 39 days back to 12 months), continue
further back through the stored daily history, and take **only the first daily
high > `L`**. That is "the nearest major historical peak … just above today's
price". Stop there, so it never walks to the listing. If no stored high exists
above `L`, the row says so (`aboveAllStored: true`). It is never called an
all-time high, because the store does not reach the listing (same rule as
`blueSky.ts`).

**Cluster.** Sort the marks, and chain
neighbours whose **gap to each other** is ≤ `W`. **`W = 0.5% × L`** (his "2–3c"
is ~0.5% at $4–6; a literal 3¢ collapses sub-$1 names, e.g. SLXN's four lines
at $0.31 into one). Each chain is one level at
**(lowest top + highest top) / 2** ("mark it near the middle").

**Premarket:** nothing special is needed. Before the open, today's 5m window is
short, and the 15m and daily windows carry the levels (his
"others trade on other sessions").

**Split basis:** every price in one computation must be on one basis. The 5m
window is today only, from raw 1m bars; if a split took effect TODAY, the 15m and
daily windows (split-adjusted) are already on today's basis, so there is no mix.
If the store's basis stamp is older than a split it has not yet re-fetched, the
row carries `basisBreak` and the older windows are not walked. The 15m and
daily windows read the history store, which is split-adjusted and re-fetched on
a split (§3).

## 2. Row contract (for Design to build against now)

One row per board name, recomputed at each 5m candle close by the worker and
read by the web as-is: **never computed per poll** (the ~480 ms build budget).

```ts
type LevelTimeframe = '5m' | '15m' | 'daily';

interface ResistanceLevel {
  /** The level itself: the middle of its cluster. */
  price: number;
  /** The cluster's span: its lowest and highest contributing tops (equal for a single top). */
  low: number;
  high: number;
  /** Which ladders contributed, coarsest first. Display tag only; NOT a strength. */
  timeframes: LevelTimeframe[];
  /** How many candle tops merged into it. Descriptive, not a weight. */
  tops: number;
  /** END time (ISO, UTC) of the newest and oldest contributing candles: his platform's convention. */
  newestTopEnd: string;
  oldestTopEnd: string;
  /** True only for the single far-back daily peak beyond the 12-month horizon. */
  beyondHorizon?: true;
}

interface ResistanceLevels {
  symbol: string;
  tradingDate: string;
  /** The 5m candle close this was computed at (ISO, UTC). */
  computedAt: string;
  /** L: the price the ladders walked up from. */
  price: number;
  /** Levels above `price`, ascending. ALL of them: no cap, no filtering. */
  levels: ResistanceLevel[];
  /** No stored high above price at any depth. Never rendered as "all-time high". */
  aboveAllStored?: true;
  /** Oldest data each ladder could see, so the section can say how far back it looked. */
  horizon: { fiveMinFrom: string | null; fifteenMinFrom: string | null; dailyFrom: string | null };
  /** The store's basis is behind a split not yet re-fetched: only today's 5m window was walked. */
  basisBreak?: true;
}
```

**Absent, not empty:** a name the worker has not computed has no row. A
computed name with nothing above it has `levels: []` and `aboveAllStored: true`.
The two must not look alike.

## 3. The history store (Ops builds against this)

**Keying, the one trap:** store every candle by its **bucket START in UTC**, as
`minute_bars.ts` and Alpaca's own bars do. **Display** uses end = start + the
timeframe (his platform labels candles by END; proved on MSGY's crosshair
candle 09/25 15:00 = our 14:45–15:00 bar exactly). A store that keys rollups by
end and fetched bars by start is off by one candle at the seam, and nothing
fails.

**15m rollup from our 1m capture:** bucket start = floor(ts / 900 s) × 900 s,
UTC. Open = the first 1m open; high = max; low = min; close = the last 1m
close; volume = sum; trade count = sum; vwap = volume-weighted mean of the 1m
vwaps. Sessions 04:00–20:00 ET. **Completed buckets only**, meaning bucket end
≤ now. A bucket missing minutes (a restart gap, ~3.5 min per restart) is
written with `partial = 1`, since its high is a lower bound.

**Backfill:** Alpaca `15Min` for **39 days** and `1Day` for 12 months,
`adjustment=split`, for all band names once, then on arrival for new names
(~740 requests for everything at 39 days (was ~620 at 30); ~0.9 GB of 15m for all band names (was ~0.69 GB); no extra cost,
Commercial §9b). Forward 15m comes from the rollup, not a fetch.

**The split re-fetch trigger (new; today's code has none).** The daily path
establishes a basis once and then does not re-fetch after a later split (read
in `lib/research/historyFetch.ts`, `basisFetchDue`: "A split AFTER
establishment is not re-fetched here"). The trigger is an **OVERLAP CHECK**:
each daily append requests one already-stored session along with the new one.
If that session's split-adjusted close now differs from the stored close by
more than 0.5%, the basis moved. **Re-fetch that name's whole stored history
(daily and 15m) and replace it.** The overlap costs no extra request.
Secondary tripwire, logged only: today's first raw 1m open ÷ the previous
stored close ≥ 3 or ≤ 1/3.

**Stamp each row's basis** (a `split_factor` or a `basis_as_of`), so a reader
can refuse a mixed window. That is the same rule `daily_bars` already follows.

## 4. Verification read (pre-registered; run on the build's output)

1. **His 4 charts as fixtures**, at his chart moments (SLXN 17:40, NCI 17:58:28,
   MSGY 18:00, BIYA 17:55 ET on 09-29), must reproduce his lines at tolerance
   max($0.002, 0.5% of L). **Pass = recall ≥ 13 of his 14 lines on SLXN, NCI and
   MSGY** (the pre-build scorer's 13/14 at 0.5% clusters, as a regression floor).
   Extra levels are expected under "show all" and are not a failure. *The floor
   was scored one timeframe per chart. The spec merges today's 5m, the 15m and the
   daily windows, and merging can move a cluster's middle. A miss is therefore investigated per line
   (which tops merged) before it is called a defect.*
2. **BIYA is the store's positive control:** its lines (2.501 / 2.490 / 2.462 /
   2.421) come from 08-24 / 08-25, which only the backfill holds. **At the 09-29
   chart moment the 15m window reaches back 39 calendar days, to 08-21, so ALL
   FOUR come from the 15m window** (2.421 and 2.501 are also the 08-25 / 08-24
   daily highs, but the daily window starts before 08-21). **Before the
   backfill: no level near 2.42–2.50 from August. After: all four within
   tolerance, and today's 5m window adds today's run tops (2.42–2.74) as separate
   levels.** A store that cannot reproduce BIYA has not backfilled. **No
   located-date 15m fetch is needed or specified:** his "dailys beyond" ruling
   puts daily candles, not 15m, past 39 days.
3. **Rollup vs Alpaca:** for 20 names × 1 session, our 15m rollup vs Alpaca's
   `15Min` for the same buckets: the high must match to the cent wherever the
   bucket has no restart gap. Any mismatch is reported with the bucket.
4. **Keying:** one fetched bucket and one rolled-up bucket for the same start
   time must be the same row.

## 5. Cost and when it runs

Compute per name: measured ~0.5 ms for four ladders on stored bars (local,
prior), plus the read. At the 5m close for board names only (~25–90 names),
that is well under a second of worker time per 5 minutes. **The web reads one
row per board name.** The minute read must use the bounded query
(`ts >= (D−1)T00:00Z`, Ops's `loadMinuteBars` fix), never the all-sessions walk.

## 6. TONIGHT'S BUILD ON STORED DATA: PRE-REGISTERED 2026-09-30, BEFORE ANY LEVELS CODE (seat `local_4b09b3b2`)

*His ruling 2026-09-30T15:47:13Z (verified): levels go tonight. Integration's order calls (20th seat): the per-name API form, a pre-registered cost gate, levels built IN PARALLEL through a subagent in its own worktree, reviewed by this seat.*

**Where it runs (replaces §2's worker + table for tonight; the row contract is UNCHANGED):** `GET /api/levels?symbol=X` computes ONE name on request and memoizes the result per `(symbol, the latest completed 5m close)`. No worker change, no schema, no market restart. The computation is a PURE function over (1m bars, daily bars, `t`); the store read is a separate adapter, so the fixtures below test the same function the route runs.

**Windows on stored data (INTERIM, his approval pending via Integration; built so it can ship on his yes):** today = 5m rolled up from today's 1m bars; the 15m window = 15m rolled up from the stored 1m bars of the prior sessions the store retains (15 on the box), keyed by bucket START in UTC per §3; the daily window = `daily_bars` rows OLDER than the oldest stored 15m session, out to 12 months, then §1's far-back extension. **The daily window begins where stored 15m data ends, not at 39 days**, so no day falls in neither ladder. `horizon` states each ladder's oldest data. When the history store backfill lands, 15m reads it to 39 calendar days and daily begins beyond, per §1. **If he rules against the interim, the daily window starts at 39 days and the gap is stated in `horizon`.**

**Basis (refuse, never mix):** the stored 1m bars are RAW. If `daily_bars.split_factor` changes inside the 15m window, or two consecutive stored sessions' closes differ by a ratio ≥ 3 or ≤ 1/3, only today's 5m window is walked and the row carries `basisBreak`. Daily rows with a null `split_factor` (the basis is not established) are not walked: `horizon.dailyFrom` is null.

**Verification, pre-registered (a FAIL means it does not ship):**
1. **His charts, the pure function on Ops's CSVs** (`data/slxn-2026-09-29-minute-bars.csv`, `data/nci-msgy-biya-minute-bars.csv`, `data/nci-msgy-biya-daily-bars.csv`) at his chart moments (§4.1): **PASS = recall ≥ 13 of his 14 lines on SLXN, NCI and MSGY**, tolerance max($0.002, 0.5% of L). Extra levels are not failures ("show all").
2. **BIYA, reported and NOT a pass condition:** under the interim window its 2.421 and 2.501 are August DAILY highs and are EXPECTED as daily levels; its 2.462 and 2.490 need August 15m, which only the backfill holds, and are EXPECTED ABSENT. Any other outcome is investigated before shipping.
3. **Cost gate, on the prod copy** (`data/market-prod-2026-09-29.db`, read-only): the names at live rank ≤ 25 at the 2026-09-29 10:00 ET checkpoint, each computed COLD (no memo) at `t` = 2026-09-29 16:00 ET through the route's own store adapter: **PASS = p95 < 100 ms per name AND max < 250 ms**, on this desktop. n and the distribution are reported. It is a local prior, not a box reading: the box is read after deploy, with Ops.
4. **Absent vs empty (§2):** an uncomputed name has no row; a computed name with nothing above has `levels: []` and `aboveAllStored: true`. Both pinned by tests.

**The label is his, not a measurement (§ top).** No copy, comment or commit may call these levels measured or tested.

**§6 RESULT (desktop, item 3): FAIL AS REGISTERED.** The registered run (store cold on disk) gave p95 1,175 ms and max 1,380 ms per name against 100 / 250; warm reruns passed and are not counted. Fixture gate (item 1): PASS, 13/14.

## 7. THE BOX COST TEST: PRE-REGISTERED 2026-09-30, BEFORE IT RUNS (seat `local_4b09b3b2`; Integration's order call)

*Tonight the request path ships ONLY if this passes; the precomputed backup waits for tomorrow (its own desktop refresh gate failed as registered, 88.9 s against 60 s).*

- **Code:** branch `levels-request-path` at `8dfacf4` (the request path, the split-today tripwire, Design's 200 / JSON-null contract, one type definition in `lib/market/resistance.ts`).
- **Where and when:** production hardware, run by Ops ONCE, after 20:00 ET, in a gap between releases with nothing else running on the box, from a checkout of that sha outside the live release, against the LIVE `market.db` opened READ-ONLY (`fileMustExist`).
- **Command:** `npx tsx scripts/levels-cost.ts --db "$MARKET_DB_PATH" --live` (add `--date YYYY-MM-DD` for today's ET date if it runs after midnight ET). It needs `tsx` (a devDependency); Ops confirms it is present.
- **Names:** the top 25 by rank in `ticker_session` for today's trading date, either board (each name ranked by the better of `rvol_rank` and `ah_rank`), printed by the script. **`t`:** the latest completed 5-minute close, the route's own moment.
- **What counts:** the FIRST pass per name, the one the script makes; no rerun, no warm pass, no second invocation.
- **PASS = p95 < 100 ms AND max < 250 ms per name.** The script exits 0 on PASS and 1 on FAIL (or when nothing was timed). **A FAIL means the request path does not ship tonight.** n, the names, p50, p95 and max are reported as printed, and the result is not re-run to a different verdict.

**§7 RESULT (box, run ONCE by Ops 2026-10-01T00:34:18Z = 20:34 ET 09-30; `8dfacf4` staged by `git archive`, node_modules from the live release `89d39053` with identical package.json and lockfile; live `market.db` read-only; nothing else running; between release #2 and v28): FAIL AS REGISTERED, both clauses.** Graded by seat `local_f6fa4717` from Ops's printed output (`t` = 2026-10-01T00:30:00Z, trading date 2026-09-30, top 25 of 3,228 ranked on either board, first pass per name). **n = 25, p50 221.18 ms, p95 1,062.61 ms (LESL), max 2,042.41 ms (CNTB)** against p95 < 100 and max < 250; the grader recomputed all three from the 25 printed times (nearest rank: 13th and 24th of 25), and again from the verbatim log Ops committed with every row's horizon fields (`docs/ops/levels-cost-box-2026-10-01T0034Z.log`, `4ff85b3d`): identical. 2 of 25 names under 100 ms (MYND 26.41, ANTA 75.43); 11 of 25 over 250 ms. One row carried `basisBreak` (NIVF, 941.30 ms). Exit 1. **Consequence, as pre-registered: the request path does NOT ship tonight; levels `74fd7244` does not ship.** Not re-run. **What it says for the backup:** cold per-name compute on production hardware is 0.2 to 2 s, so any design that computes on the request path, or in any process that serves or ingests, is excluded by measurement, not only by the desktop result. The backup needs the NEW registration Integration ruled (production hardware, a non-blocking host, ONE storage: Ops's `history.db` `resistance_levels` table), and its refresh bar re-derived from these box timings.
