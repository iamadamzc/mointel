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
