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

**It also states three measurements, which are dated on the page and will not
re-verify.** 7,173 of 7,173 rows labelled split on the local store, 24,429 of
24,429 in `data/market-prod-2026-08-23.db`, and 68 of 256 symbols (27%) holding
more than one fetch date. Those are readings of two files on 2026-09-22, not
standing properties of the desk — if they are quoted again they need taking
again, against a store whose date is named.

*A page that explains a scale is a second copy of that scale. It is worth having
anyway — but it is a copy, and copies go stale silently.*
