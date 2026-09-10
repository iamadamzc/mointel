# Manual — source pages

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

## Keeping them true

**These pages state numbers that live in code.** When one of these changes, the
page is wrong and nothing will fail:

- the active line (`activeTradesPerMinute`, 300/min) — sets full bar height
- the dead line (`deadRatio`, 10× → 30/min) — the 1.4px figure is derived from it
- the window and its lag (`deadMinutes`, `settleMinutes`) — the "five minutes
  ending one minute ago" sentence
- the desk palette in `app/globals.css`

*A page that explains a scale is a second copy of that scale. It is worth having
anyway — but it is a copy, and copies go stale silently.*
