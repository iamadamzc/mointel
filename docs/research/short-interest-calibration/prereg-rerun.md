# Short interest calibration RE-RUN: a second share-count source and a reconciled count

*Seat `local_5f4bfcf8` (Research-tmi), 2026-10-02. PRE-REGISTERED before any data is pulled for this re-run. Order: Integration-tmi (local_54f1341f), on HIS question: he showed a dossier STRUCTURAL WARNING reporting "55,406,688 ordinary shares outstanding ... as of June 30, 2026", which "predates the completed 11,111,111-share August registered direct offering", and asked why we say we lack share counts when the desk computes them from SEC filings.*

**What the first run missed (`a0f880c0`):** it took the count ONLY from SEC companyfacts `dei`. The as-of dossier also carries `structure.sharesOutstanding` and `structure.sharesOutstandingDate` (`lib/research/interpret/schema.ts:125-126`), which the interpreter extracts from filings, including 6-K, 20-F and prospectuses. The first run read the dossier only for CIK and the supply ledger. "None measured" for option 2 was therefore wrong. The correction is Integration's.

## Fixed now, before any data

**The same as the first run:**

- the 434 (ticker, settlement) pairs: the same window, checkpoints, range, top 12 and six settlements;
- the same FINRA rows (re-pulled, same query);
- the local 09-29 copy;
- no look-ahead.

**Count sources, each AS OF the settlement S:**

| Source | What it is |
|---|---|
| **A, filed** | As the first run: the newest-period companyfacts share fact with `filed` on or before S |
| **B, dossier** | The latest `research_analysis_versions` row for the ticker with `generated_at` on or before S. It uses `structure.sharesOutstanding` (a number above 0) and `structure.sharesOutstandingDate`, read as a date (ISO `YYYY-MM-DD` first, else `Date.parse`; unparseable means B is unusable for that pair, reason `B_DATE_UNPARSEABLE`). B is unusable if the date falls after S. |
| **COMBINED** | Whichever of A and B has the LATER as-of date; on a tie, A. |

**THE RECONCILED COUNT (his screenshot's case), applied to whichever count is used:**

- reconciled = count + the sum of `amountShares` over the as-of dossier's supply-ledger blocks that are DISCRETE issuances:
  - type RECENT_OFFERING, PIPE, ACQUISITION_SHARES or OTHER_ISSUED_SHARES;
  - with `amountShares` not null;
  - with `effectiveDate` parseable, after the count's as-of date and on or before S;
  - with status not NOT_YET_ACTIVE.
- **His example under this rule:** 55,406,688 (June 30) + 11,111,111 (August, RECENT_OFFERING) = 66,517,799, as of S.
- **Not added, ever:** ATM and EQUITY_PURCHASE_AGREEMENT (continuous issuance, amount sold unknown); WARRANTS, CONVERTIBLES and PREFERRED_CONVERSION (issued only on exercise, unknown); SHELF_CAPACITY (capacity, not shares); REGISTERED_RESALE (resale of shares already outstanding).

**Two gate variants, reported side by side.**

| Variant | Age limit (base count's as-of to S) | Not graded when |
|---|---|---|
| **STRICT** (the first run's gate, plus reconciliation) | 45 days | any as-of ledger block is KNOWN_ACTIVE or POSSIBLY_ACTIVE, EXCEPT the discrete issuances already added by reconciliation |
| **RECONCILED** | 120 days (one quarterly cycle plus filing lag) | an ATM or EQUITY_PURCHASE_AGREEMENT block is KNOWN_ACTIVE or POSSIBLY_ACTIVE (continuous issuance the count cannot follow) |

- **Both variants:** no as-of dossier means not graded (the issuance check needs it); a FINRA split flag between the count's as-of date and S means not graded.
- **RECONCILED, also reported:** how many graded pairs carry a KNOWN_ACTIVE WARRANTS, CONVERTIBLES or PREFERRED_CONVERSION block. For those, exercises since the count date could make the ratio overstate, so "at least" is not guaranteed for them.

## Reported, per source (A, B, COMBINED) and per variant

1. Pairs graded, and pairs not graded by first-failing reason.
2. The same for FOREIGN pairs: the as-of dossier's `foreignIssuer === true`, OR source A's form is 20-F, 40-F or 6-K.
3. Count age distribution (S minus the base count's as-of date): p10, p25, p50, p75, p90, per source.
4. **Agreement of B with A** where both exist and their as-of dates are within 3 days of each other: |B - A| / A, as median, p90, and the counts within 1%, within 5% and over 20%. B is model-extracted, so its error against the filed fact is MEASURED here, not assumed.
5. The size-grade spread among graded pairs, per variant, using COMBINED.
6. **His screenshot's case:** whether a pair exists whose count was reconciled by a completed offering, and how many pairs reconciliation changed.

**Not changed:** depth (FINRA's days to cover) and trend are as in the first run; the re-run reports them only as the first run did.

**Discipline:** harness committed before the pull; raw output committed before it is read; FINRA numbers stay in this private repository.

**Then:** the options go to him again, re-scored on these counts. No grade lines change in this run.

## RUN 3, PRE-REGISTERED after the re-run's result and BEFORE its own data: the as-of point is the LABEL'S VIEW TIME

**Why.** Both earlier runs took every input as of the SETTLEMENT date S. But the label is shown at a later VIEW time, after FINRA publishes, when the name has been researched and newer counts may be filed. The no-look-ahead point is therefore the view time, not S. The re-run showed what that costs: 245 of 426 pairs failed only because no dossier existed as of S, typically because the name was first researched after S, on the day it reached the board.

Both runs also paired a checkpoint date d with the latest settlement ON OR BEFORE d. FINRA publishes 7 business days after settlement, so that pairing used a report not yet public on d. That is look-ahead in the other direction. **Both runs were the seat's error, not a rule anyone set.** Integration's "dossier as of the settlement only" follows from my framing, and run 3 corrects it.

**Fixed now:**

- **View time v:** the checkpoint date d on which the name was in a report's top 12 (same window, checkpoints, range and top 12 as before).
- **Settlement for v:** the latest settlement whose FINRA PUBLICATION date is on or before v. Publication dates are from FINRA's 2026 schedule, read 2026-10-02 (`docs/research/short-interest-2026-10-02.md`): 07-31 published 08-11; 08-14 published 08-25; 08-31 published 09-10. A settlement whose publication date was not read is not used.
- **Unit:** a distinct (ticker, settlement) pair. Its view time is the EARLIEST d that maps to it, the most conservative availability.
- **Inputs as of v:**
  - the dossier is the latest version with `generated_at` on or before the end of v;
  - source A is the newest-period fact with `filed` on or before v;
  - source B is from that dossier, with a date on or before v.
- **Gates, sources, variants and reconciliation:** exactly as above, with the count's as-of date compared to S. A count dated ON OR AFTER S has age 0 or less and passes the age and issuance checks, because nothing could be issued between S and a later count without that count including it.
- **Reported:** the same tables as the re-run, per source and variant, all pairs and foreign pairs, plus the number of pairs whose count is dated on or after S.
