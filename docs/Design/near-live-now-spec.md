# The near-live `Now` column: spec

**Design seat, written 2026-09-29 01:50 UTC (2026-09-28 21:50 ET), clock read via zoneinfo.**

**His ruling, verified at his own turn** (Integration's session, 2026-09-29T01:38:17Z):
*"yes build the near-live now column"*. That answered Integration's block, which
said Design specifies what the column shows and how it sorts, brings that back to
him, and that the build comes after the price-range release. **The rolling
60-second window is rejected, his words: *"yes i rejected the 60s."* Nothing here
reintroduces it.**

This file is the spec. The choices that are his are in "What he decides" and are
marked as his. Everything else is Design's or Research's and does not go to him.

## HIS ANSWER, 2026-09-29T02:30:43Z, to Design directly, verbatim

> *"same exact pattern as the previous minute format, except now it will show
> the last minute in 10 sec increments instead of 5 min in 1 min increments."*

**Binding content:** the cell keeps its shape, a number above bars. **The bars
become the last minute as six 10-second buckets**, replacing five 1-minute
slots. **The number is the newest completed 10 s bucket, counted, not
scaled:** "the same pattern" means the number is the last slot of the bars, as
today's is the last settled minute of its bars. That settles the unit question
below as (A), and settles more than it asked: the SPARKLINE changes grain too.

~~**What cannot match "same exact" yet:** … the first version draws the six
bars neutral, with no price points … Design's reading, not a question for him
unless he objects.~~ **HE OBJECTED, 2026-09-29T02:32:20Z, to Design, verbatim:
*"that's not what i want. i want the trade counts, dots and direction
color."*** A bars-only interim is REFUSED. The first version carries all three:
the count, the price points and the direction colour, at 10 s.

**What that requires, and it reorders the work.** `trades.db` holds COUNTS
only, so the capture must also record a PRICE per 10 s bucket (the last trade
price in the bucket; the dots are those prices, and direction and the flat band
are judged on them against the spread, as today). That is an engine change in
the MARKET WORKER, so it takes effect only on a **market-worker restart**, which
is his to approve. **The same restart carries the membership intervals**
(Research's (2)), so the measured `0` arrives with it and the counts-only
interim is no longer needed for this column. **Order: Research builds price per
bucket + intervals → he approves the restart → Ops restarts outside his window
→ Design builds the cell on real 10 s prices. Nothing of the cell ships before
the restart.**

**Research's field, final shape:** the last SIX completed buckets, oldest
first: `nowBuckets: Array<{ bucketEnd: string; trades: number | null; price:
number | null }> | null`. `trades: null` = not measured (no interval covers the
bucket whole); `0` = measured, silent; `price: null` = no trade in the bucket
(the dot is simply absent, as a minute with no trade is today). Whole field
`null` = no live feed → the settled-minute fallback, muted. Plus
`tradeCapture.asOf` as before.

**"The last six" means SIX CONSECUTIVE WALL-CLOCK SLOTS,** `[E−60s, E)` in
10 s steps, where `E` is the newest completed 10 s boundary ≤ `asOf`. It never
means the six newest rows: rows exist only when a trade prints, so a quiet
name's six newest rows can span minutes and would draw as adjacent bars. The
spacing is time, not sequence, as `sparkline.ts` says for minutes. Every name
on one snapshot shares the same six `bucketEnd`s, which is what lets the
column sort fairly.

**Research's scope, received 2026-09-29 (Research-tmi), approved for Design's
side:** per bucket, trades + last price + last ts, where "last" is the greatest
trade ts, after the engine's price-validity guard. Membership intervals are
opened and closed on (stream ACK ∩ highRes), closed on disconnect, and
heartbeated each flush. Ops adds trades.db schema v2 (`last_price`, `last_ts`,
`feed_intervals`, meta `last_flush_ms` = `asOf`). Research's part is estimated
ready by Wed 10-01; the restart could be Thu/Fri, at Ops's proposed time with
his approval of that time.

## What exists today, opened, not recalled

- The column prints `tradesLastMinute(row.demand)`, the last SETTLED slot of
  `activityWindow`: trades in the last completed minute, 60–120 s behind
  (`DiscoveryBoard.tsx:191-199`, the `now` sort entry; the cell at ~`:961-976`).
  The header's sub-line is `sparklineLagLabel()`.
- The capture is live and recording (Ops, ~01:50Z): `engine.ts` buckets every
  trade into **10-second wall-clock buckets** (`TRADE_BUCKET_MS`), the worker
  writes them to `trades.db` on every 1 s flush (`worker/runtime.ts:1523`,
  `persistTradeBuckets`), and **the filling bucket is re-written each flush and
  settles at its final count.** A settled bucket stays in memory for a 20 s grace,
  so a late print lands in its own bucket.
- **Buckets exist only for names with a live trade feed** (the high-res set:
  pinned, ranked-and-alive within the active board's cap, the after-bell daytime
  leaders and the daytime-latched, capped at 250; `engine.ts` ~2119-2200). **A
  subscribed name that prints nothing in ten seconds also has no row.** So in
  `trades.db`, "no row" means three different things: zero trades, no feed, or
  capture stopped.

## What the column shows, with his choice marked

**The number: trades in the most recent COMPLETED 10-second bucket.** Not the
bucket still filling: that one resets every ten seconds, so every name reads near
zero just after each boundary, and a sort on it would reshuffle the board every
ten seconds on noise. The completed bucket is 10–20 s behind, plus the poll. That
is the 10–20 s he was offered.

> **HIS CHOICE — the unit the number is printed in.**
>
> - **(A) Trades in the last 10 seconds, as counted.** `142`. Literally what
>   happened. The figure is about a sixth of today's per-minute numbers, so
>   anything he remembers as "a busy minute" reads smaller.
> - **(B) The same count as a per-minute pace, ×6.** `852/min`. Keeps the scale
>   he is used to and matches the minute bars under it. But it multiplies ten
>   seconds of noise by six, and it prints a minute-shaped number that nobody
>   counted over a minute: a 10-second burst of 50 reads `300/min`.
>
> **Recommendation: (A).** It never claims a measurement the desk did not take.
> The sort order is identical either way, so this is only about how the number
> reads.
>
> **SETTLED (A) by his 02:30:43Z answer above.**

**The header stays `Now`** (his ruling, 2026-09-25). Its sub-line changes from the
minute lag to the new grain: `last 10s` under (A), `10s pace` under (B). The
tooltip and the sort caption (`metric`) change with it. ~~**The minute sparkline
under the number stays as it is.** It shows the shape of the last half hour in
minutes, which is a different question from "busiest now", and the unit label
keeps the two from reading as one quantity.~~ **SUPERSEDED by his 02:30:43Z
answer above: the bars under the number become the last minute as six 10 s
buckets, with price dots and direction colour.** *(Struck 2026-09-29 by the
successor Design seat; this line predated his answer and contradicted it.)*

## Rows that have no live count

The server says which of these a row is. The board never infers it from absence:

| The row is | The cell shows | Sort |
| --- | --- | --- |
| Live feed, counted | the count | by the count |
| Live feed, **zero trades in the bucket** | `0` | as zero, a real measurement |
| **No live feed** (outside the high-res set — this includes a name ranked 8th in his custom range but outside the global top 50) | the last settled MINUTE figure, muted, with its own unit (`/min`) | **after every live row, never interleaved** |
| **Capture not current** (worker down, capture stalled, after 20:00) | `—` on every row, and the header sub-line says `not live` | column unsortable until it recovers; the `Now` chip says why |

**Why no-feed rows never interleave with live rows:** a 10-second count and a
60-second count are different grains, roughly six to one for the same activity.
Sorted together, every no-feed name would outrank a live one. That rule is the one
line of the rejected 60 s design that still holds, and it is kept.

**Why "capture not current" blanks every row rather than showing the last
counts:** a count that stopped updating still looks like a live count. The failure
has no symptom: the board would sort confidently on numbers from whenever capture
stopped. Blanking is the visible state.

## What Research is asked for (the data side)

> **SUPERSEDED — the field is `nowBuckets` (six buckets with trades and price),
> stated in "HIS ANSWER" at the top. The single-bucket `nowTrades` shape below and
> the counts-only interim after it were written before his 02:30:43Z and
> 02:32:20Z answers; he refused an interim, and Research struck it (`58dd735`,
> `cf3dbc2`). Kept below, not deleted, as the record of what was considered.**
> What still holds from this section: the board never infers zero from absence,
> and the `not live` threshold on `tradeCapture.asOf` is Research's to set and
> state.

**Ask the producer for the answer, not the rows.** The board should not open
`trades.db` or work out which absences are zeros. Per `DemandState`:

```ts
nowTrades?: {
  /** Trades in the most recent COMPLETED 10 s bucket. 0 is a measurement. */
  count: number;
  /** That bucket's END, ISO. The board shows the age; it never recomputes it. */
  bucketEnd: string;
} | null;
// null  = no live feed for this name, so no count exists; the board falls back to
//         the settled-minute figure it already has.
// absent (undefined) = an older payload; the board keeps today's minute column.
```

And once per snapshot: **`tradeCapture.asOf`**, the time of the newest flush the
web tier read. The board shows `not live` when it is older than a threshold
**Research sets and states** (suggested: 3 buckets, 30 s). The zero-vs-no-feed
decision needs "was this name subscribed for the whole bucket", which only the
server can answer. `DemandState.highRes` is current membership, not membership
during the bucket; a name that joined mid-bucket should read `null`, not a low
count.

### The interim Research proposed, ACCEPTED by Design (2026-09-29)

**Research, opened in code:** a bucket row exists only when a trade arrives
(`engine.ts:1500-1505`), and high-res membership is a boolean with no join time
(`engine.ts:2202`). So from `trades.db` today a silent WATCHED name and an
unwatched one are both "no row", and a name's first bucket after joining is a
partial count. **A measured zero needs membership intervals** (engine to
`trades.db`, Ops's schema v2), which need a **market-worker restart** that rides
the next one he approves.

**Interim, no restart: counts only.** A row with a bucket shows its count. **Every
"no row" reads as no live data**, i.e. the muted settled-minute fallback, sorted
after live rows. That includes a watched name that was silent for ten seconds.
**It is wrong only toward absence, never toward a fake 0**, and a silent name sorts
at the bottom of the live rows either way, so the order he sees barely moves.
Known residue, stated rather than hidden: **a name's first bucket after it gains a
feed can read low**, for one bucket. The `0` row in the table above arrives with
the intervals.

## Scope, sequencing, size

- **Design:** `DiscoveryBoard.tsx` (the `now` sort entry, cell — number above six
  10 s bars with dots and direction colour — header sub-line, tooltip),
  `lib/dashboard/view.ts` (the sort value: live rows first, then no-feed rows by
  their minute figure, then unmeasured), the 10 s sparkline model beside
  `sparkline.ts`, `MISSING_NOUN.now`, and tests. The Focus cards, if they print
  the minute figure, follow the same field. **About a day and a half**, after
  Research's field exists on real post-restart data.
- **Research:** `nowBuckets` and `tradeCapture.asOf`, from per-bucket last price
  and membership intervals the ENGINE records. ~~No market-worker change and no
  restart (Research, `c9cf9b1`).~~ **A market-worker change, so a restart**
  (`58dd735`); Research's target Wed 10-01 ET.
- **Ops:** `trades.db` schema v2; propose the restart time, which he approves.
  ~~Confirm `bucketsWritten` is rising in production. Due 09-29 between 04:00 and
  07:00 ET, already scheduled.~~ *(Still due as a capture check; no longer the
  gate for the cell.)*
- **Order:** after the price-range release (his ruling). Research's field can be
  built first and ships inert, since the board ignores a field it does not read.
  **Design does not start the cell until the field carries real 10 s prices.**

## Not in this spec, on purpose

- ~~A 10-second sparkline. It could be built from the same buckets later; nobody
  has asked for it.~~ **He asked for it (02:30:43Z); it is the bars. Struck.**
- Changing what RVOL means. `Now` stays the correction beside RVOL, not a
  replacement for it.
