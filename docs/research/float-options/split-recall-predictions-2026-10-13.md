# L6 recall measure: predictions (2026-10-13)

*Research-tmi. Committed with `scripts/split-recall.ts` BEFORE it runs (Commercial read 98 (0): measure the announced list's recall independently, state K and the matches before the build). Store copy of 2026-10-07; Alpaca REST GETs only; no spend.*

1. **K is small.** Split factors are sparse in the store (19 of 20 split rows on 10-07 had null factors), so K is probably under 50 steps. If K is under 30, the most the page may claim from 100 percent recall is a lower bound near 90 percent (read 98).
2. **Recall:** at least 90 percent of the bar-detected steps have an Alpaca split row within one day. Misses, if any, I expect from ex-date offsets (a holiday or a late bar) rather than from absent rows.
3. **Rateless rows:** few or none among the matches.
4. **Orientation (R4):** every rated match is price-side (old/new equals the bar step), none share-side.
5. **R2:** the API accepts the other type names and returns some rows (stock dividends at least); if it refuses a name, the refusal names the bad one and the build uses only names the API accepts.
