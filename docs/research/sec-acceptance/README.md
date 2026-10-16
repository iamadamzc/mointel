# Stored SEC acceptance times: scope (2026-10-16)

*Research-tmi (local_dd23765d), for Integration 42nd's ruling (a defect fix under the date fixes; no build). Read only: no write, no model call, no spend. Production d772ba25. Data: the two PC store copies (`market-prod-2026-10-07.db`, `slim-2026-10-14.db`) and each stored accession's EDGAR index header, fetched once on 2026-10-16: 8,540 headers, 0 errors (`headers-2026-10-16.jsonl`, made by `fetch_headers.py`). Tool: `scripts/sec-acceptance-scope.ts`. Full output: `scope.txt`. The 25-row sample: `sample-25.md`.*

## The defect

The collector stores EDGAR's submissions-JSON `acceptanceDateTime` verbatim (`lib/research/sec/submissions.ts:116`, `sec/collector.ts:452`); an exhibit inherits it as INFERRED (`catalyst/collector.ts:472`). That JSON value is wrong for a share of filings, and the way it is wrong changed around 2026-10-02. The filing's own index header (`ACCEPTANCE-DATETIME`, Eastern) is the authority.

**How each stored row compares with its header, by the day it was fetched** (10,446 distinct timed SEC rows, both copies):

| Fetched | Off | Shape |
|---|---|---|
| 09-08 to 10-01 | 2 to 7 percent a day | 4 h EARLY: Eastern clock written with a Z |
| 10-02 on | 18 to 93 percent a day, rising (10-14: 166 of 297; 10-15: 13 of 14) | 4 h LATE in summer, 5 h late in winter: true UTC plus the Eastern offset, a double conversion |
| All | 858 of 10,446 (8.2 percent) | -4 h 275, -5 h 5, +4 h 514, +5 h 64 |

EDGAR's JSON today shows the late shape (checked: XLAB's 8-K, 13G and Form 3; four winter filings at +5 h; Integration opened two in the browser), so **every SEC filing collected now is likely stored 4 h late**. Fetched on 10-05, 0 of 350 were off. The cause on EDGAR's side is not known; the header is right in every case read.

**The 25-row sample** (seed 20261016, drawn from 1,535 EXACT SEC_FILING rows published since 09-01 in the two copies): 9 of 25 off. That population's rate, measured in full: **355 of 1,535, 23.1 percent**. The sample's 36 percent is inside its sampling error. Quote the population figures.

## (i) The collector fix

- **Read acceptance from the filing header**, never the JSON: `https://www.sec.gov/Archives/edgar/data/{cik}/{accession without dashes}/{accession}-index-headers.html`, the line `ACCEPTANCE-DATETIME>YYYYMMDDHHMMSS`. It is Eastern local time; convert with the US daylight rule (EDT UTC-4 from the second Sunday of March 02:00, EST UTC-5 from the first Sunday of November 02:00).
  - The `.hdr.sgml` file carries the same field. The header page was used for all 8,540 reads here and is small (a few KB).
- **If the header read fails**: store the filing DATE with UNKNOWN precision, as rows were before 2026-09-07. Never the JSON instant, which is wrong a share of the time and gives no sign of it.
- **Cost**: one more request per stored filing source, through the same rate-limited `SecClient`. The research worker has no per-run SEC cap; the float nightly does not read acceptance, so its 20,000 cap is untouched. Volume: about 275 filing rows a day in these copies (10,446 over 38 days).
- **Also**: the `SEC_SUBMISSIONS` source's `publishedAt` takes the newest filing's JSON acceptance (`sec/collector.ts:247`). It should take the same header value, or its filing date.

## (ii) Exposure today

Current catalysts whose `eventTimestamp` rests on a stored SEC instant (equal to a cited EXACT or INFERRED SEC source's `published_at`), and how many of those instants are off:

| Copy | Current catalysts | With a stamp | Resting on an SEC instant | That instant off | Stamp already equal to the TRUE instant (AIXI's shape) | Trusted clock now / after repair |
|---|---|---|---|---|---|---|
| 10-07 | 1,263 | 1,061 | 335 | **67** | 3 | 578 / 581 |
| 10-14 | 140 | 118 | 46 | **12** | 4 | 76 / 80 |

The off names are listed in `scope.txt` (lines "off:").

## (iii) Replay over the recorded reports

At each published report's own time, with production's own readers: freshness band (`catalystFreshnessOf`, the prior close as the boundary), the event date and cited-source dates the writer and checker are handed (`eventWhen`, `sourceWhen`), and the board's age chip and hover clock (`relativeAge`, `eventWhen`).

**With source rows AND copied stamps repaired:**

| Copy | Name-reports | Changed | Bands | Event dates | Cited-source dates | Age chips | Hover clocks |
|---|---|---|---|---|---|---|---|
| 10-07 (20 reports) | 166 | 33 | **3** | 0 | 2 | 17 | 31 |
| 10-14 (9 reports) | 100 | 3 | 0 | 0 | 2 | 0 | 1 |

- **Bands, all RECENT to FRESH:** BIYA on reports 1 and 2 (09-30), SORA on report 8 (10-02). Their true filing times fall after the prior close.
- **Hover clocks** move by the offset, e.g. TGE 05:14 to 09:14. AIXI gains a clock it lacked (none to 16:31), because its stamp was right and its source wrong.
- **Cited-source dates:**
  - WFCF's EFFECT notice, 09-30 to 10-01.
  - NWGL's filing, 10-10 to 10-09.
- **No event date the writer was handed changes.**

**With ONLY the source rows repaired** (stamps left as written): 31 and 1 changed name-reports.
- 32 hover clocks are lost (a copied stamp no longer matches any source).
- **AIXI's event date flips to a FALSE 2026-10-02**: its copied stamp 00:31:13Z, read as a date only, is the UTC date.

So a source-only repair makes things worse. The repair must also fix stamps copied from an off source.

## (iv) Dry-run repair (no write)

| Copy | Timed SEC rows checked | Would change | By delta | By type |
|---|---|---|---|---|
| 10-07 | 10,261 | **580** (5.7 percent) | -4 h 312, +4 h 225, +5 h 38, -5 h 5 | SEC_FILING 360 of 7,901; SEC_EXHIBIT 220 of 2,360 |
| 10-14 | 1,650 | **429** (26.0 percent) | +4 h 371, +5 h 32, -4 h 26 | SEC_FILING 315 of 1,235; SEC_EXHIBIT 114 of 415 |

**Stamps to repair:** current catalysts whose stamp equals an off source's stored instant, 67 and 12 above. Their dossiers sit in `research_analysis_versions`, which is append-only.
- **Option A:** rewrite the stamp inside the current version only.
- **Option B:** write a new superseding version.

Either is a production write and **his** decision. These copies are stale (10-07 and 10-14). The real dry run must run on the box, and it reads about one header per distinct accession: 8,540 here, likely more there, about 25 minutes at 7 requests a second.

## (v) Size

**The collector fix (first, so no new wrong rows land):**
- `lib/research/sec/acceptance.ts`: header read, parse, Eastern to UTC. About 50 lines.
- `sec/collector.ts` wiring, plus the `SEC_SUBMISSIONS` row: about 20 lines.
- Tests:
  - parse
  - EDT and EST, plus the two switch days
  - header failure stores the date as UNKNOWN
  - the collector uses the header, not the JSON
  - the exhibit inherits
- Mutants, as usual.
- About 2 to 3 hours with the gate.

**The repair script (second), `scripts/repair-sec-acceptance.ts`:**
- Dry run by default; `--write` only on his go.
- Repairs the timed SEC source rows, plus copied stamps by option A or B.
- Resumable header cache, a before and after report, and an undo file of old values.
- About 150 lines plus 4 tests. About 2 to 3 hours with the gate, plus about 25 minutes of header reads on the box.

**Order:** the collector fix ships first. Otherwise a repair is undone by the next day's collection.
