# Resistance levels ("mark your chart"): spec

*Research, 2026-09-29. Owners: the computation and this spec are Research's; the
history store, the fetch worker, the 15m rollup job and any table are Ops's;
the section is Design's. Routed as a build by Integration (19th). The ship to
the board is his yes, enumerated by literal sha.*

## His rulings this rests on (verified at his own turns)

| ruling | where |
| --- | --- |
| "left, up, mark the top. if there are multople tops within the same 2-3c, mark it near the middle … these become areas of resistance" | Integration 19th's transcript `ffac4a37`, 2026-09-29T22:05:23Z |
| "a, show all 7": show every candidate level, his lines always among them | Research's transcript `8cd59d1e`, 2026-09-29T22:44:18Z |
| "i just want these levels drawn … you can confirm … that these are indeed resistance levels": they are **labelled resistance levels** | `8cd59d1e`, the turn after 22:56:28Z |
| "6–12 months of daily candles. last 30days 15m"; "If the nearest major historical peak is two years back and just above today's price, I'd still mark it"; "You don't need to mark every candle back to the stock's listing"; today's run tops count; premarket uses prior sessions | `845dd4cb`, 2026-09-29T22:33:08Z |
| "yes, build the history store" (all band names, downloaded once, kept, 15m forward from our own capture, re-fetched on a split) | `845dd4cb`, 2026-09-29T23:00:48Z |

**The label is his ruling, not a measurement.** No test here showed that these
levels turn price back more than other prices (`research.md`, 009edef). The one
morning he showed (SLXN, 70% vs 59%) is an illustration. Nothing in code, copy
or docs may say "measured" or "tested" about them. **There is no strength or
highlighting field.** That question was withdrawn; the only tag is timeframe.

## 1. The levels, at one moment for one name

**Inputs at compute time `t`:** `L` = the last trade price, meaning the latest
1m close at or before `t`. Completed candles only, meaning a candle whose end is
≤ `t`.

**Three ladders, one per timeframe.** For each, walk the candles backwards from
the newest completed one. The **first** candle whose high ≥ `L` starts the
ladder, and its high is the first mark. Each earlier candle whose high is
**greater than the last mark** is the next mark. Keep only marks > `L`. Marks
are **wick highs**, not bodies (his "top of it"; bodies recovered 3/5 of his
SLXN lines, wicks 5/5).

| ladder | candles | horizon |
| --- | --- | --- |
| 5m | 5m, rolled up from 1m | the current session and the previous one |
| 15m | 15m from the history store | the last 30 calendar days |
| daily | daily from the history store, split-adjusted | the last 12 months |

**Far back, the one extension:** if the daily ladder over 12 months yields no
mark (price is above every daily high for a year), continue the daily walk
further back through the stored daily history, and take **only the first daily
high > `L`**. That is "the nearest major historical peak … just above today's
price". Stop there, so it never walks to the listing. If no stored high exists
above `L`, the row says so (`aboveAllStored: true`). It is never called an
all-time high, because the store does not reach the listing (same rule as
`blueSky.ts`).

**Merge and cluster.** Pool the marks of all three ladders, sort them, and chain
neighbours whose **gap to each other** is ≤ `W`. **`W = 0.5% × L`** (his "2–3c"
at the $4–6 prices he trades most; a literal 3¢ would collapse sub-$1 names,
e.g. SLXN's four lines at $0.31 into one). Each chain is one level at
**(lowest top + highest top) / 2** ("mark it near the middle").

**Premarket:** nothing special is needed. Before the open, today's 5m ladder is
short and the previous session's 5m, 15m and daily tops carry the levels (his
"others trade on other sessions").

**Split basis:** every price in one computation must be on one basis. The 5m
ladder reads raw 1m bars, so if a split takes effect inside the 5m horizon, the
pre-split candles are **excluded** and the row carries `basisBreak`. The 15m and
daily ladders read the history store, which is split-adjusted and re-fetched on
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
  /** A split inside the 5m horizon excluded the pre-split candles. */
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

**Backfill:** Alpaca `15Min` for 30 days and `1Day` for 12 months,
`adjustment=split`, for all band names once, then on arrival for new names
(~620 requests for everything, measured sizes in `research.md`; no extra cost,
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
   was scored one timeframe per chart. The spec pools 5m + 15m + daily, and
   pooling can move a cluster's middle. A miss is therefore investigated per line
   (which tops merged) before it is called a defect.*
2. **BIYA is the store's positive control:** its lines (2.501 / 2.490 / 2.462 /
   2.421) come from August, which only the backfill holds. **Before the
   backfill: "no level near 2.42–2.50 from August". After: 2.421 and 2.501 from
   the daily ladder (08-25, 08-24 highs), and 2.462 / 2.490 from the 15m ladder.**
   A store that cannot reproduce BIYA has not backfilled.
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
