Treat the repeating Alpaca HTTP 400 loop as a separate production incident on deployed SHA `56c2f3c`, schema v19.

The market worker is repeatedly sending the invalid symbol `OBSERVED PM` to the RTH close-capture endpoint:

`[demand] RTH close capture failed: Alpaca HTTP 400: {"message":"code=400, message=invalid symbol: OBSERVED PM"}`

Production recorded 1,799 occurrences in 30 minutes—approximately one failed REST request per second and potentially about 86,000 failed calls per day.

The evidence indicates that the Google Sheet TODAY-tab parser read presentation cells as tickers. Its output included valid symbols mixed with:

* `TICKER`;
* `OBSERVED PM`;
* prices such as `$123.19`;
* percentages such as `+95.66%`;
* volumes such as `20.48M`;
* other values from the surrounding grid.

Do not patch only the literal string `OBSERVED PM`. Fix both the ingestion defect and the permanent-error retry loop.

## Capture the current state

Before mutating anything, capture:

* the exact Google Sheet tab, requested range and raw returned grid;
* the parser’s inferred header row and ticker column;
* the complete current set of Sheet-derived pins;
* all invalid or non-symbol entries currently pinned;
* any legitimate pins and their provenance;
* the path from Sheet synchronization through focus-list persistence into RTH close capture;
* the retry call site and why a permanent HTTP 400 is attempted every second;
* Alpaca request counts and invalid-symbol errors over the previous 30 minutes and previous 24 hours;
* current market-worker PID, start time, trading date and health.

Do not print credentials or unrelated Sheet content.

## Apply an immediate bounded mitigation

After capturing the evidence, stop the failing request loop without stopping unrelated services.

Quarantine or remove only entries that can be proven invalid. Preserve legitimate tickers and pins from other sources. If a market-worker restart is required, it is authorized because the market is closed; restart only that service after the fix is ready.

Do not repeatedly retry the same permanently invalid symbol while diagnosis continues.

## Fix TODAY-tab parsing

Parse the TODAY tab structurally:

1. Locate the intended table and exact normalized `TICKER` header.
2. Read only the ticker column beneath that header.
3. Never scan arbitrary strings from other columns or surrounding summary areas.
4. Normalize case and whitespace.
5. Deduplicate symbols.
6. Validate candidates against the application’s canonical Alpaca/universe symbol set before they become pins.
7. Use a light syntax check only as an initial rejection layer; do not rely solely on a simplistic letters-only regex that could reject legitimate provider-supported class or special symbols.
8. Reject headers, prices, percentages, volume abbreviations, labels, blank cells and formulas that do not resolve to a known symbol.
9. If the expected table/header cannot be identified unambiguously, fail closed and retain the last known-good Sheet-derived pin set. Do not reinterpret the entire grid and do not replace valid pins with junk or an accidental empty set.
10. Preserve provenance so a Sheet refresh replaces only Sheet-derived pins and does not erase manual, market-generated or other legitimate focus entries.

Prefer an explicit configured range or named range if one already exists or can be introduced without breaking the current Sheet workflow.

## Add a downstream safety boundary

Every external market-data request must validate its symbols immediately before calling Alpaca, even if upstream ingestion should already have validated them.

For RTH close capture:

* remove or quarantine unknown symbols before constructing the request;
* emit one structured diagnostic per rejected symbol and source version, not one log line per second;
* classify Alpaca HTTP 400 `invalid symbol` as permanent for that symbol and payload;
* do not apply transient retry behavior to a permanent 400;
* if one invalid symbol poisons a batch, isolate it and allow the remaining validated symbols to proceed;
* cap retries and logging;
* expose rejected-symbol count, source, value, first-seen time and last-seen time in diagnostics without exposing unrelated Sheet data.

A malformed Sheet entry must never reach the Alpaca client, and an unexpected invalid-symbol response from Alpaca must still terminate safely.

## Repair production state

After deploying, rebuild the Sheet-derived focus set through the corrected parser. Do not hand-edit unrelated database state.

Verify that the resulting list contains only actual ticker symbols expected from the TODAY table. Show which invalid entries were removed and confirm that legitimate tickers such as CAST, TNON, RDAC and EHGO were preserved if they remain in the source table.

Do not retain `TICKER`, `OBSERVED PM`, currency values, percentages, volume strings or other presentation cells as symbols.

## Regression tests

Use a fixture matching the real TODAY-tab layout and prove that:

* the exact ticker column is selected;
* `TICKER` is treated as a header, not data;
* `OBSERVED PM` is rejected;
* currency, percentage, volume and numeric cells are rejected;
* valid tickers are preserved;
* whitespace, casing and duplicates normalize correctly;
* legitimate provider-supported symbol formats are validated through the canonical universe;
* reordered non-ticker columns do not change the result;
* a missing or ambiguous ticker header fails closed;
* a malformed refresh retains the previous valid Sheet-derived set;
* refresh replaces only Sheet-derived pins;
* manual or other-provenance pins survive;
* invalid symbols never reach the mocked Alpaca client;
* a permanent Alpaca invalid-symbol 400 is not retried;
* one bad member does not prevent valid members of a batch from completing;
* repeated worker cycles do not reproduce the once-per-second loop;
* logs and diagnostics are bounded.

Run the complete test, lint, typecheck and production-build gate.

## Deployment and verification

Deploy through the existing AWS CLI/SSH path. Preserve rollback target `372f5eb` and the existing pre-v19 backup. A schema change is unnecessary unless durable pin provenance or quarantine state genuinely requires one; if it does, follow the normal backup and migration procedure.

After deployment verify:

* deployed SHA and schema;
* database integrity and consistency;
* focus list contains only validated symbols;
* zero requests containing `OBSERVED PM` or other presentation values;
* zero new invalid-symbol 400s for a sustained observation window;
* the prior approximately one-request-per-second failure rate falls to zero;
* valid RTH close capture still works;
* Alpaca REST traffic returns to its intended level;
* all services are healthy;
* SIP remains LIVE/STREAMING when applicable;
* research state, XOS and ENRD remain intact.

Do not delay this repair merely to wait for the next `INTERVAL_RECHECK`. Once the incident is resolved, check the next naturally occurring recap/re-look job for a non-NULL `INTERVAL_RECHECK` trigger and populated `tool_config`. Do not manufacture a model call solely to verify attribution.

Return the exact parsing failure, invalid entries found, operational mitigation, parser contract, downstream safety behavior, tests, deployed SHA, any market-worker restart, before/after Alpaca request rate, cleaned focus list and natural interval-attribution result if one becomes available.
