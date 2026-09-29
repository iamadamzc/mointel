# Post-restart check — the Now column's worker wiring

*Research, written 2026-09-29 for the market-worker restart he set for **tonight
at 20:15 ET** (his turn in Ops's session, transcript `a36b4a67`,
2026-09-29T11:04:49Z: "tonight at 20:15"). The six items were pre-registered
in `docs/threads/research.md` ("POST-RESTART CHECK") BEFORE the restart; this
file only turns them into commands. **Nothing here changes a pass condition.**
No unit test constructs `MarketRuntime`, so the worker wiring is proven here or
not at all.*

**All reads are read-only** (`sqlite3 -readonly`) on `/var/lib/mointel/trades.db`,
which is small and separate from `market.db`. Ops runs them and returns the RAW
rows to Research and Integration; Research grades them.

## When each item can run

The restart lands **after** the after-hours session closes (20:00 ET), so
nothing trades until 04:00 ET on 09-30.

| item | tonight after 20:15 | 22:00 roll tonight | premarket 09-30, from ~04:30 ET |
| --- | --- | --- | --- |
| 1 flush clock | **yes** | | yes (repeat) |
| 2 open intervals vs high-res | | | **yes** |
| 3 `last_price` on buckets | | | **yes** |
| 4 `/api/market` shape | | | **yes** |
| 5 reconnect closes | | | yes, if the log shows any reconnect |
| 6 date roll | before and after 22:00 | **yes** | |

**A check with nothing to see has not passed.** Each item below carries its
positive control. If the control is empty, report the item UNTESTED, not
passed. This matters most for item 6 tonight: with no trading after 20:00,
there may be no open intervals at the roll.

---

## 1. The flush clock advances

Two reads at least 5 s apart:

```sh
sqlite3 -readonly /var/lib/mointel/trades.db \
  "SELECT CAST(value AS INTEGER) AS last_flush_ms,
          CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) AS wall_ms,
          CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) - CAST(value AS INTEGER) AS lag_ms
     FROM trades_meta WHERE key = 'last_flush_ms';"
```

**Pass:** `last_flush_ms` is larger on the second read, and `lag_ms` ≤ 5000 on
both. **Fail** (no row, frozen value, or lag > 5 s) means the flush clock is not
wired.

## 2. Open intervals match the high-res set, and the board's #1 has one

At one moment, as close together as you can take them:

```sh
sqlite3 -readonly /var/lib/mointel/trades.db \
  "SELECT COUNT(*) AS open_rows FROM feed_intervals
    WHERE trading_date = '2026-09-30' AND closed_ms IS NULL;"
```

From `/api/market`, read the way you normally read it on the box:

```sh
jq '{fetchedAt, highResCount: .health.highResCount,
     top: ([.demand[] | select(.highRes)] | sort_by(.rvolRank // 1e9) | .[0] | {symbol, rvolRank})}'
```

Then check the top name has an open interval:

```sh
sqlite3 -readonly /var/lib/mointel/trades.db \
  "SELECT symbol, opened_ms, last_seen_ms, closed_ms FROM feed_intervals
    WHERE trading_date = '2026-09-30' AND symbol = '<top.symbol>' ORDER BY opened_ms;"
```

**Pass:** `open_rows` ≈ `highResCount`, and `<top.symbol>` has a row with
`closed_ms` NULL. **Positive control:** `highResCount` > 0. **Fail:**
`open_rows` = 0 with `highResCount` > 0 means the ACK hook or the high-res hook
is not firing.

## 3. Every bucket written after the restart carries a price

```sh
sqlite3 -readonly /var/lib/mointel/trades.db \
  "SELECT COUNT(*) AS rows, SUM(last_price IS NULL) AS null_price, SUM(last_ts IS NULL) AS null_ts
     FROM trade_buckets WHERE trading_date = '2026-09-30';"
```

**Pass:** `null_price` = 0 and `null_ts` = 0. **Positive control:** `rows` > 0.
All of 09-30's rows are post-restart. **Fail:** any NULL means the engine's
price is not reaching the store.

## 4. The web tier serves it

```sh
jq '{fetchedAt, asOf: .health.tradeCapture.asOf,
     on:  ([.demand[] | select(.highRes)]     | sort_by(.rvolRank // 1e9) | .[0]
            | {symbol, n: (.nowBuckets | length), ends: [.nowBuckets[]?.bucketEnd]}),
     off: ([.demand[] | select(.highRes | not)] | .[0]
            | {symbol, hasKey: has("nowBuckets"), nowBuckets})}'
```

**Pass:** `on.n` = 6, and its `ends` are consecutive and 10 s apart. `off`
has `nowBuckets: null` (key present). `asOf` is within 30 s of `fetchedAt`.
**Note:** if the key is ABSENT everywhere, the capture could not answer
(`c657830`). That fails item 4, and it points at the web read rather than the
worker.

## 5. A reconnect closes intervals and re-opens them only after the ack

Only if `journalctl -u mointel-market` shows a stream reconnect after the
restart. Give the disconnect time (`D_ms`) and the reconnect's `subscription`
ack time (`A_ms`), then:

```sh
sqlite3 -readonly /var/lib/mointel/trades.db \
  "SELECT symbol, opened_ms, last_seen_ms, closed_ms FROM feed_intervals
    WHERE trading_date = '<date>'
      AND ((opened_ms < <D_ms> AND (closed_ms IS NULL OR closed_ms > <D_ms>))
           OR (opened_ms > <D_ms> AND opened_ms < <A_ms>))
    ORDER BY opened_ms;"
```

Return the raw rows. Research grades them against the pre-registered condition:
closed AT the disconnect, and re-opened only after the ack. No tolerance is
set here, because none was pre-registered. No reconnect means UNTESTED, which
is fine to report.

## 6. The date roll (22:00 ET tonight), Ops's addition at its owner review

**Before 22:00**, the positive control:

```sh
sqlite3 -readonly /var/lib/mointel/trades.db \
  "SELECT COUNT(*) AS open_old FROM feed_intervals
    WHERE trading_date = '2026-09-29' AND closed_ms IS NULL;"
```

**If `open_old` = 0, item 6 is UNTESTED tonight**, because there is nothing for
the roll to close. Report that, and it re-runs at the next roll with open rows
(22:00 on 09-30 at the latest).

**After 22:00:**

```sh
sqlite3 -readonly /var/lib/mointel/trades.db \
  "WITH closed AS (SELECT closed_ms FROM feed_intervals
                    WHERE trading_date = '2026-09-29' AND closed_ms IS NOT NULL
                      AND closed_ms >= <roll_ms> - 5000),
        opened AS (SELECT opened_ms FROM feed_intervals
                    WHERE trading_date = '2026-09-30' AND opened_ms <= <roll_ms> + 5000)
   SELECT (SELECT COUNT(*) FROM feed_intervals WHERE trading_date = '2026-09-29' AND closed_ms IS NULL) AS old_open_left,
          (SELECT COUNT(*) FROM closed) AS closed_at_roll,
          (SELECT COUNT(*) FROM opened) AS opened_at_roll,
          (SELECT COUNT(DISTINCT closed_ms) FROM closed) AS distinct_close_instants,
          (SELECT COUNT(DISTINCT opened_ms) FROM opened) AS distinct_open_instants,
          (SELECT MIN(closed_ms) FROM closed) AS close_instant,
          (SELECT MIN(opened_ms) FROM opened) AS open_instant;"
```

`<roll_ms>` comes from the worker log's roll line.

**Pass:** `old_open_left` = 0; `closed_at_roll` = `opened_at_roll` = `open_old`;
both `distinct_*` = 1; and `close_instant` = `open_instant`. **Fail** means the rollover path is
broken, and no unit test reaches it.

---

**A fail on items 1–3 blocks Design's Now cell from shipping, and it does not
require a rollback.** The board keeps its minute column while the field is
absent or null. **No worker rollback below `9508fb9` is possible after this
restart**, because a v1 worker refuses the v2 file.
