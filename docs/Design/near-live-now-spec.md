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

**The header stays `Now`** (his ruling, 2026-09-25). Its sub-line changes from the
minute lag to the new grain: `last 10s` under (A), `10s pace` under (B). The
tooltip and the sort caption (`metric`) change with it. **The minute sparkline
under the number stays as it is.** It shows the shape of the last half hour in
minutes, which is a different question from "busiest now", and the unit label
keeps the two from reading as one quantity.

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

- **Design:** `DiscoveryBoard.tsx` (the `now` sort entry, cell, header sub-line,
  tooltip), `lib/dashboard/view.ts` (the sort value: live rows first, then
  no-feed rows by their minute figure, then unmeasured), `MISSING_NOUN.now`, and
  tests. The Focus cards, if they print the minute figure, follow the same field.
  **About a day**, after Research's field exists.
- **Research:** the field and `tradeCapture.asOf` above, read from `trades.db`
  in the web tier. No market-worker change and no restart (Research, `c9cf9b1`).
- **Ops:** confirm `bucketsWritten` is rising in production. Due 09-29 between
  04:00 and 07:00 ET, already scheduled.
- **Order:** after the price-range release (his ruling). Research's field can be
  built first and ships inert, since the board ignores a field it does not read.

## Not in this spec, on purpose

- A 10-second sparkline. It could be built from the same buckets later; nobody
  has asked for it.
- Changing what RVOL means. `Now` stays the correction beside RVOL, not a
  replacement for it.
