# L6 recall measure: result (2026-10-13)

*Research-tmi. Commercial read 98 (0): measure the announced list independently before the build. Script and predictions before the run (`f819e974`; `--creds-root` added after a first attempt that refused before reading anything), raw committed before it was read past its summary lines (`047e08c0`). The 10-07 store copy and Alpaca REST GETs; no spend.*

## What it found

**K is large: 944 steps of 1.25 or more between consecutive bars with a split factor, over 421 symbols** (1,252,697 bars carry a factor; window 2016 to 2026-10-07).

**Recall: 771 of 944 (81.7%) have an Alpaca split row for the same symbol within one day. It is much better for recent years:**

| Ex-year | Bar-detected | Listed by Alpaca | Recall |
|---|---|---|---|
| 2026 | 311 | 295 | 94.9% |
| 2025 | 207 | 183 | 88.4% |
| 2024 | 156 | 125 | 80.1% |
| 2023 | 117 | 87 | 74.4% |
| 2016 to 2022 | 153 | 81 | 52.9% |

**The misses are not date offsets:** none of the 173 has an Alpaca split row within 7 days. 83 are symbols with no Alpaca split at all in the window, 90 have one elsewhere. 123 of the 173 are steps of 10 or more, and the 2026 misses read as real reverse splits with clean ratios (BRNX 7, then 5, then 6; MEDS 50; PARA 20; SDEV 5; YFOR 50, then 30; 16 in all). Some may be listed under another symbol after a ticker change; not checked.

**Orientation (R4): all 771 matches are price-side**: Alpaca's old/new equals the bar factor's step (a 1-for-30 is old 30, new 1, and the price factor falls by 30). So shares change by new/old. None share-side, none neither.

**Rateless rows: 0** of 800 split rows returned.

**R2: the API accepts unit_split, stock_dividend, stock_merger, stock_and_cash_merger and spin_off**, and returned rows under spin_offs, stock_dividends, stock_mergers and unit_splits for these symbols (65 rows). Those are the names the build uses.

## What it means for option (a)

Option (a) restates on Alpaca's list alone where the bars cannot prove the span. On this measure that list misses about 1 bar-detected split in 20 for 2026 and about 1 in 9 for 2025. A missed split leaves the count on the old basis, so a forward split missed makes the bound too low (false); a reverse split missed makes it too high (true but loose). This measure counts only spans where the bars DO have factors; the spans (a) is for have none, and whether Alpaca's coverage differs there is not measured.

So read 98's bar for (a) is not met by this list as it stands: the page could claim at most "about 95 percent of recent splits", and a missed forward split publishes a false number. Options for Integration and Commercial:
- **(a) as ruled, with the page's caveat** naming the rate, and only for spans inside the recent window (e.g. ex-dates in 2026); or
- **(b): restate only where the bars prove the span** (1 of 20 cells on 10-07); or
- **(a) plus a second source** for spans without bar factors (none identified; the SEC filings could name a split, which the stated-count read already opens for some names).

## Against the predictions

1. K small: **failed** (944).
2. Recall at least 90%: **failed overall** (81.7%); 2026 alone 94.9%.
3. Few rateless: **held** (0).
4. All price-side: **held** (771 of 771).
5. R2 names accepted with rows: **held**.
