# Source labels in the drawer: rules draft (for Marketing's words, then Commercial)

*Design-tmi (twelfth seat), 2026-10-09 (UTC date). Integration 36th accepted the fix: one label function for the drawer's three source lists, built from the evidence row's fields, duplicates shown once, the supply ledger's raw ids replaced. Next release. Code read at a1806612. Every string in quotes is a PLACEHOLDER for Marketing.*

## What is wrong today (seen on WORX, 2026-10-08)

1. Supply ledger lines end " · sources 161084, 161087": the raw evidence ids are the link text (`components/AutomaticIntelligence.tsx` ~614-636).
2. The supply groups list four links that all read "8-K, CURRENT REPORT": "{secForm}, {title}" where the title is EDGAR's generic primary-document description (`lib/research/sec/collector.ts:420`), with no date (~641-652).
3. "Sources the desk read" prints "Oct 5, EX-99.1: 8-K 2026-10-05T21:08:55.000Z": the stored exhibit title carries the full ISO time (`lib/research/catalyst/collector.ts:468`; Research changes the stored form going forward, but stored rows keep it).

## What an evidence row carries (lib/research/view.ts `EvidenceLink`)

`title`, `url`, `authority`, `sourceType`, `secForm`, `accession`, `publishedAt`, `publishedPrecision`. There is NO exhibit-type field: "EX-99.1" lives only at the front of the stored title (Research is asked to confirm or add one).

## Proposed rules (one function, every list)

1. **Date first, always**, from `publishedAt`, "Oct 5" (the year when it is not the reader's year), never a clock in the label. A row with no date: no date part, never "unknown".
2. **An SEC filing:** "{date}, {form}", then the filing's own description ONLY when it says more than the form: EDGAR's generic descriptions ("CURRENT REPORT", "QUARTERLY REPORT", the form's own name, and so on; Marketing and Design list them) are dropped. Example: "Oct 5, 8-K". A described one: "Oct 5, 8-K, notice of delisting" (lower case, as the drawer's other labels).
3. **An exhibit** (a title beginning "EX-"): "{date}, {exhibit} to {form}", e.g. "Oct 5, EX-99.1 to 8-K". Any timestamp after it is dropped. Words for "to" are Marketing's ("exhibit 99.1 to the 8-K" is the plainer reading).
4. **Not an SEC filing** (news, company release, market page): "{date}, {title}" as today, the title cleaned of citation tokens as today.
5. **Duplicates:** two rows that point to the same URL show once. Two DIFFERENT filings whose labels come out the same (two 8-Ks on Oct 5) both show, the second marked "(2)", so a reader is never told there is one filing where there are two.
6. **The supply ledger's ids** become these labels, joined with "; " after " · sources ", each still a link to the source.
7. **Never printed:** an id, an accession number, an ISO time, "null", an empty title.

## Words needed from Marketing

The generic-description list and its case; the exhibit form ("EX-99.1 to 8-K" or plainer); the duplicate marker ("(2)" or other); the separator in the supply ledger; whether the year shows when it is not the reader's year.
