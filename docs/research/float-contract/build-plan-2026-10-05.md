# Float JOB: build plan (nothing built yet)

*Research-tmi `local_dd23765d`, 2026-10-05. Order from Integration-tmi (27th): the float job first. Inputs read whole: the contract (`contract-2026-10-05.md`), `validate.ts` (the validated fetch and audit path), `state-table-r1.ts`, the R1 registration, `insiderBound.ts`, `splitProof.ts`, `compactBound.ts`. The worker map (where the research job fetches SEC data, the schema pattern, the bar readers) came from a read-only search of `worker/research.ts`, `lib/research/sec/*`, `lib/market/store/db.ts` and `lib/research/history.ts`; every line I build against I open myself first. No rule in the contract changes except the one named in section 3, which waits on Integration.*

## 1. What the job reproduces, exactly

The validated pipeline is `validate.ts` `collect()`. The job is that function moved into `lib/`, with the audit removed and nothing else changed:

1. **Count:** `dei:EntityCommonStockSharesOutstanding` only, from companyfacts, rows FILED on or before the as-of date; the latest period end; at that end the latest filed date; one accession or `COUNT_SPLIT_ACROSS_FILINGS`. This is NOT the shipped `latestSharesOutstanding` (`lib/research/sec/companyFacts.ts`), which sorts across four concepts and would pick `CommonStockSharesIssued` on a tie. Reusing it would change the validated count, so the job carries its own selector, a pure function with tests.
2. **Holdings:** Forms 3, 4, 5 (and /A) from the submissions listing, filed in the 730 days before the as-of date (the shipped `selectFilingsByFamily` drops 3/4/5, so the job lists them itself from the same parsed submissions); `parseSection16`, `holdingsAsOf` as on main.
3. **Holding split proof: R0, as validated** (`validate.ts` `splitProof`): no span is NONE; bars that do not reach the holding's date, any null factor, or a non-positive factor are UNPROVEN; a factor range of 1.25 or more is FOUND. R1 is registered for the count-to-checkpoint span only. Calling `splitProofFromBars` with the count's date as its checkpoint date would differ from R0 twice: it would TOLERATE a null factor on the count date's own bar (R0 refuses it), and it would REFUSE a holding dated on the count date (one bar; R0 subtracts it, no span). So R0 stays, as a pure function beside R1 in `splitProof.ts`, with tests that pin those two differences.
4. **Count split proof: R1** (`splitProofFromBars`), the registered rule, over the bars from the last bar on or before the count's date through the as-of date (the `state-table-r1.ts` reader).
5. **Ledger:** the supply ledger of the dossier the same research job just saved; null when the job saved none (state `ISSUANCE_NOT_CHECKED`). **Contract 5(ii) confirmed as asked:** the dossier type has no marker for whether research reached the supply section (`lib/research/types.ts`, `supplyLedger: SupplyBlock[]` at 512, no completeness field), so an empty ledger reads as "looked, no flag" (PRODUCED is possible). That limit is the contract's, stated there; it is not new.
6. **Issuance rule:** the contract's, KNOWN_ACTIVE plus POSSIBLY_ACTIVE (section 5), stored on the row by name so a later ruling is a constant change. Still open for him via Integration; the state table puts both rules side by side (3 against 5 names of 71 at 90 days).
7. **Max age 90 days** (his ruling), its own constant, not `FILED_SHARES_CURRENT_DAYS`.

## 2. Where it runs, what it stores

- **Path:** `worker/research.ts`, after `interpretTicker` returns (after `saveAnalysisVersion`), inside its own try/catch: a float failure logs and never fails the research job. Submissions and companyfacts are re-requested through the same `SecClient`, whose cache (64 MiB LRU, 30-minute lifetime, per the search; `client.ts` not yet opened by me) should serve both from the collection minutes earlier; I have not measured that. No new schedule, no model call, $0.
- **Table** (new, schema version bump to 29, created in `SCHEMA`, added to no mode-switch delete list because it holds public facts like the other research tables): `research_float_bounds`, primary key `(symbol, as_of_date)`: cik, count shares, count as-of, count filed date, accession, form; holdings JSON (owner CIK, name, shares, as-of, accessions, the per-holding proof); refused holdings JSON; split-since-count proof; issuance rule; max age; state; reason; bound; computed_at. Upsert on the key (a second run the same day replaces the first).
- **RSS, for Ops's ship question** (Ops, 2026-10-05: a peak RSS on a representative name set is needed before any ship ask; under about 500 MB is covered by the swap and headroom, near 1 GB is a new conversation with him): the job logs `process.memoryUsage().rss` before and after each name, and a $0 dry run over a stored name set reports the peak, names per cycle and the cache bound in bytes. Run in an Ops slot, not tonight.

## 3. The one open design question: which date a row stands for (to Integration before the reader is built)

The contract says the state is read from the row alone and the age is measured to the checkpoint's date. The research job runs when a name is researched, often in the evening; the board he reads 07:00 to 10:00 ET is the next trading date. If the reader shows only a row whose as-of date is today's, every name researched the evening before and not again that morning reads "not researched yet" in his window (how many that is, I have not measured), which is false of the definition the face is for.

- **(A) As the contract reads:** a row counts only on its own date. Simple; the morning board goes mostly dark until a name is re-researched.
- **(B) Recommended:** the row stores the FETCHED INPUTS (count, holdings with their proofs) as of the job's date; the reader (board, checkpoint writer, reports) takes the newest row on or before the display date D and recomputes `floatCell` AT D: age to D, the R1 proof from the count's date through D on the stored bars, and the ledger of the dossier current at D. Every gate is re-run, so reusing a row can only move it toward "Cannot verify", never toward a number: a split overnight, an older count, or a newly flagged issuance each refuse. What is reused is only the fetch, and the two ways a fetch goes stale are both on the safe side (a later count is not seen: the older one ages out at 90 days; a late Form 4 is not seen: the bound stays higher). The contract sentence "the state is read from the row alone" changes to "the state is computed from the row, the stored bars and the dossier, at the display date"; faces and reasons do not change.

Until this is answered I build only what both share: the selector, R0, the bar reader, the job function, the table and its repo.

## 4. Build order, each its own commit, mutants predicted before the tests are read

1. `selectFiledCount` (pure) and `splitProofR0` (pure), with tests.
2. The span bar reader (`lib/research/history.ts`), with a test on a store fixture.
3. The table, repo (`write`, `readLatestOnOrBefore`), schema 29.
4. `computeFloatBound` (the job function: fetch, parse, compute, write), with fakes for `SecClient`.
5. The call in `worker/research.ts`.
6. The payload type `FloatBound` for Design (section 5) and the reader, after section 3 is answered.

Gate for every commit: `tsc --noEmit` AND `eslint` on every file type in the commit, AND vitest on the touched tests, in an Ops slot.

## 5. The payload for Design (draft, mine to define; Design builds against what is committed)

From the retired seat's reply as Design relayed it, checked against the contract: `floatBound: { state: 'PRODUCED' | 'UNKNOWN' | 'CANNOT_VERIFY', reason: FloatCellReason | null, bound: number | null, countAsOf: string | null, countFiled: string | null, subtractedHolders: number }`, carried as `MarketSnapshot.floatBounds?: Record<string, FloatBound | null>`. **Changes from the relayed shape:** NOT_YET is not a value of `state`; it is the absence of a row, so a symbol absent from the record (or null) is NOT_YET and only that. `reason` is null exactly when `state` is PRODUCED. `bound` is the raw shares, non-null exactly when PRODUCED; the face is `compactBound(bound)` and the date is `countAsOf` (the filed count's date, contract section 3). Holding detail for the tooltip (owner, form, accession, date) is a later field, not in the first cut.
