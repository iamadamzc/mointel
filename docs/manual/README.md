# Manual — source pages

**As of 2026-09-22 10:04 UTC.** Every constant these pages state was re-verified
against code on that date and all still hold — see *Keeping them true* below.

Pages written to explain the desk to the trader, kept because he asked for them
to be preserved for a manual: *"what you have described is important for later
for a manual. with the images. preserve it."*

**The figures are drawn in CSS, not linked as image files.** Every sparkline,
bar height and colour on these pages is rendered from the desk's own tokens
(`app/globals.css`) at the desk's own scale — so the figures survive as long as
the file does, with nothing to go missing and no asset to re-export. Open any
page directly in a browser; they are self-contained.

| Page | Explains |
| --- | --- |
| `reading-the-flat-line.html` | Why a flat sparkline beside a huge RVOL is the Now column's most useful state, and why it read as absence |
| `the-blue-sky-ceiling.html` | What the blue-sky level is and is not, why a quarter of names refused with a sentence that named the wrong cause, and why the all-time high is knowable but still the wrong number on a reverse-split name |
| `after-a-restart.html` | Why a restart used to leave a session high below the price that printed, where the premarket hole was, and why the order of the rebuild is the whole of the fix |

**One figure on `the-blue-sky-ceiling.html` is deliberately NOT to scale**, which
is the one exception to the paragraph above and is labelled as such on the
figure itself. A ceiling at a cumulative split factor of 600 cannot be drawn
beside a $1.71 price on one axis, and that impossibility is the argument the
figure is making.

## Keeping them true

**These pages state numbers that live in code.** When one of these changes, the
page is wrong and nothing will fail.

*`reading-the-flat-line.html`* — verified against `lib/market/activity.ts:176-177`:

- the active line (`activeTradesPerMinute`, 300/min) — sets full bar height
- the dead line (`deadRatio`, 10× → 30/min) — the 1.4px figure is derived from it
- the window and its lag (`deadMinutes`, `settleMinutes`) — the "five minutes
  ending one minute ago" sentence
- the desk palette in `app/globals.css`

*`the-blue-sky-ceiling.html`* — the eight in its closing table, verified against
`lib/market/blueSky.ts`, `lib/research/history.ts` and
`lib/research/historyFetch.ts`:

- `MIN_SESSIONS` 40, `MAX_SPIKE_RATIO` 1.6, `MIN_CORROBORATING_SESSIONS` 2,
  `NEAR_CEILING` 0.9, `IN_PLAY_PCT` 25 — the four guards and the in-play band
- `SAME_BASIS` 0.01 — how far two split factors may drift and still be one basis
- `DEEP_HISTORY_YEARS` 10, `DEEP_HISTORY_RANK` 10 — how deep a full-history pass
  reaches and how far down the board it is worth buying

*`after-a-restart.html`* — verified against `lib/market/session.ts:142,148` and
`worker/runtime.ts`:

- the session window, 04:00–20:00 ET (`sessionStartUtc`, `sessionEndUtc`) — the
  coverage figure's entire axis is drawn from it, so a change moves every bar
- the daily bar's own window, 09:30–16:00 plus the closing cross — the hole in
  that figure is the difference between the two
- the focused set, `internalRank × 4` with a floor of 100, which is **200 at the
  default** — a derived number, not a literal, and `RVOL_INTERNAL_RANK` moves it

## What is NOT a constant

**Both pages state measurements, which are dated on them and will not
re-verify.** These are readings of named files on a named day, not standing
properties of the desk. If any of them is quoted again it needs taking again,
against a store whose date is named:

- *blue sky* — 7,173 of 7,173 rows labelled split on the local store, 24,429 of
  24,429 in `data/market-prod-2026-08-23.db`, 68 of 256 symbols (27%) holding
  more than one fetch date. All 2026-09-22.
- *after a restart* — 1,481 of 7,936 rows reading low and 1,160 of those highs
  printed before 09:30, after the 21:05Z restart on **2026-09-18**; and the
  daily bar's volume looking regular-session-only in 3 of 2,747 rows.

**One of those is a target as well as a reading.** The 1,481 is the count the
fix exists to drive to zero, and the page says so. It has not been retaken since
the mechanism shipped — when it is, the page's closing section is the part to
update, and the two counts must cover the same population or they do not
compare.

*A page that explains a scale is a second copy of that scale. It is worth having
anyway — but it is a copy, and copies go stale silently.*
