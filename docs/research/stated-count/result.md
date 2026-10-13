# Newer stated share counts in later filings: survey (2026-10-13)

*Research-tmi. SIZE ONLY, for his question (via Integration 39th): "is there any other filing or documentation we should be reading? this seems obvious, why would this not be in our process??" Script `scripts/stated-count-survey.ts` committed before its run (`5828b475`); run 2026-10-13T15:17:17Z to 15:25:09Z, 916 SEC requests at 2 a second (production shares the SEC user agent; no pushback seen), no model, no spend. Raw: `raw/table.txt`, `raw/rows.json`.*

**Population:** a fixed sample of 100 of the 474 names ranked in the top 12 of any checkpoint from 2026-09-09 that have a dossier (store copy of 2026-10-07; sample ordered by a hash of the ticker, fixed before any read). 78 have an SEC cover-page share count; 2 have no CIK; 2 failed to read.

**Method:** for each name, every filing after the date the cover count was filed, newest first, up to 25 a name; in each, a common-share count taken only from a sentence that carries its own date ("N shares of common stock ... outstanding as of DATE", "As of DATE, there were N shares of common stock ... outstanding"). **Control** (`--control`): the matcher finds EZRA's real sentences (1,679,936 as of August 26; 1,601,770 as of August 6) and refuses a sale and a warrant count: 5 of 5.

| Form | Names with a later filing | Later filings | Opened | Not opened | Names with a NEWER stated count | Newer by > 30 days | Differs from the cover by > 10% |
|---|---|---|---|---|---|---|---|
| 8-K | 42 | 456 | 187 | 269 | 2 | 1 | 1 |
| 424B1-5 | 31 | 158 | 77 | 81 | 6 | 6 | 5 |
| S-1/S-3/F-1/F-3 (+/A) | 32 | 113 | 73 | 40 | 8 | 5 | 5 |
| DEF/PRE 14A/14C | 12 | 46 | 17 | 29 | 6 | 6 | 4 |
| SC 13D/13G (+/A) | 3 | 61 | 4 | 57 | 0 | 0 | 0 |
| 10-Q/10-K (+/A) | 5 | 39 | 9 | 30 | 0 | 0 | 0 |
| 6-K | 30 | 418 | 338 | 80 | 0 | 0 | 0 |
| 20-F/40-F | 13 | 23 | 19 | 4 | 0 | 0 | 0 |
| The desk's stored news and press releases | | | | | 0 | 0 | 0 |
| **Any form** | | | | | **12 of 78** | **9** | **7** |

**What it says.** About 1 name in 6 has a newer stated count than the cover, and for about 1 in 9 the cover is more than 30 days stale. The forms that carry it are registration statements, prospectuses and proxies, more than 8-Ks. Two cover counts were years old (FFAI 2021, MSS 2024) where the filings state much smaller counts after reverse splits, so a stale cover can be off in either direction.

**Limits.** A lower bound: 590 later filings were not opened (the 25-a-name cap; busy filers), and the matcher reads only the two sentence shapes above, in English, for common stock. One sample, one day.

**Cost of reading the forms that matter (estimate):** 8-K and 424B (his yes) about 1 day in the float tool; adding S-1/S-3/F-1 and proxies is the same matcher on two more form families, about half a day more, and about 1 to 3 more reads a name on the days such a filing appears. 13D/13G, 10-Q/10-K bodies, 6-K and the news store added nothing here.
