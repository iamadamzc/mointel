Continue from the current repository state and deployed commit `43c3ad2`. Do not revert the completed coverage or conflict-taxonomy work.

There are now two precisely separated tasks. Complete them in order.

## Phase 1 — Make `AUTO_SOURCE_GAP` reach the live read model

The deployed classifier supports `AUTO_SOURCE_GAP`, but `lib/dashboard/merge.ts:125` does not supply `autoLatestSourceAt`. That leaves both the new `autoBehindSheet` condition and the existing `sheetStale/AUTO_NEW_EVIDENCE` path dead in the live dashboard.

Inspect the types and call chain, then pass the correct timestamp.

Do **not** use the newest timestamp from all AUTO evidence. Derive the newest **catalyst-relevant** evidence timestamp by:

1. Reading `dossier.catalyst.evidenceSourceIds`.
2. Matching those IDs to `intelligence.evidence`.
3. Taking the newest valid `publishedAt` from that subset.
4. Falling back conservatively only if the existing schema lacks catalyst evidence IDs.

A newer structural filing must not make stale catalyst coverage look current.

Handle timestamp precision carefully. XOS Sheet time is currently:

`2026-08-17; exact time Unknown`

AUTO’s newest catalyst evidence is August 13. That is enough to establish AUTO is behind. If Sheet and AUTO are on the same calendar date but one has unknown time, do not manufacture an ordering that the data cannot support.

Add tests at the actual dashboard merge/read-model call site, not only the lower-level comparison function.

Required assertions:

* XOS becomes `AUTO_SOURCE_GAP` in the same object returned by `get_ticker`.
* The detail states that Sheet references fresher evidence absent from AUTO.
* SGLY’s structure disagreement remains `INTERPRETATION_DIFFERENCE`.
* Catalyst timestamp logic does not relabel unrelated structure conflicts.
* A newer non-catalyst filing does not conceal an older AUTO catalyst evidence set.
* Existing `AUTO_NEW_EVIDENCE` behavior works when AUTO is genuinely newer than Sheet.

Run tests, lint, typecheck and build. Deploy through the established workflow only if all gates pass.

Then verify through MCP:

* `get_ticker("XOS")`
* `get_ticker("SGLY")`
* `get_diagnostics`

Do not proceed to Phase 2 until XOS returns `AUTO_SOURCE_GAP` live.

## Phase 2 — Repair the actual source-discovery failure

The established production evidence is:

* Discovery attempted 39 of 42 issuers.
* Only 4 resolved a company source.
* XOS discovery ran repeatedly after the GlobeNewswire publication.
* XOS still has no IR, newsroom, press-release-index or feed URL.
* All 22 stored XOS sources are SEC-derived.
* Four post-publication collection passes added no non-SEC source.
* The August 17, 4:30 PM ET GlobeNewswire release remains absent.
* XOS analysis version 41 and its evidence fingerprint remain unchanged.

Treat the approximately 10% source-resolution rate as the root collector incident.

Trace one XOS discovery pass completely:

1. Query construction.
2. Search/provider invocation.
3. Returned candidates.
4. URL normalization and redirects.
5. Candidate scoring.
6. Domain and authority validation.
7. Rejection reasons.
8. Registry persistence.
9. Press-release-index discovery.
10. Release extraction and source persistence.

Establish whether the GlobeNewswire or company-source candidate was never returned, returned and rejected, fetched unsuccessfully, parsed unsuccessfully or discarded before persistence.

Use logs, database state and focused instrumentation. Do not infer the internal failure merely because the source is absent.

Implement the smallest general fix using existing discovery and provider abstractions. Do not hardcode XOS, its URLs or GlobeNewswire incident data.

The corrected flow must be able to:

* resolve an issuer’s official IR/newsroom or authoritative release source;
* locate a current original release;
* persist it with publication time and authority;
* include it before evidence fingerprinting;
* generate a changed fingerprint;
* queue a superseding analysis only when the effective evidence set changes.

## Coverage semantics

Review the deployed `companySourceKnown` coverage condition carefully.

A known IR/newsroom URL alone must not prove complete current coverage. Distinguish:

* company source location known;
* current source check attempted;
* check completed successfully;
* newest release timestamp observed;
* check failed or timed out.

`coverageIncomplete` may be false only when the required current-source checks completed successfully for the applicable observation window.

If a company source is known but fetch or parsing fails, coverage remains incomplete.

Persist or expose enough state to support that distinction.

## Remaining tests

Add the tests previously omitted:

### KTCC

Confirm the August 6 reporting-date release is discoverable as newer company information but is not inflated into a strong momentum catalyst.

### HCM and IVF

Confirm fresh announcements filed as SEC exhibits continue to work without requiring duplicate newswire evidence.

### Unchanged evidence

Confirm repeated collection with the same effective sources does not create another fingerprint, AI call or analysis version.

### XOS full path

Create an end-to-end research fixture with:

* SEC evidence through August 13;
* an August 17 original company/newswire release;
* an existing SEC-only dossier;
* a later discovery pass.

Expect:

* source persistence;
* changed evidence fingerprint;
* new analysis version;
* `supersedesId` pointing to version 41 or its fixture equivalent;
* fresh catalyst interpretation;
* resolved `AUTO_SOURCE_GAP`;
* no duplicate reanalysis on the next unchanged pass.

## Observability

The collector currently computes `discoveryRan`, `discoveryDetail` and `discoveryTrigger` and discards them. Preserve and expose sanitized diagnostic state sufficient to answer:

* Did company-source discovery run?
* Which trigger caused it?
* Did it resolve a source?
* Did the source fetch succeed?
* What is the newest observed company-source timestamp?
* Why was a candidate rejected?
* Did the evidence fingerprint change?
* Was reanalysis queued or suppressed?

Do not expose credentials, prompts, source bodies or environment values.

## Final live verification

After all gates pass and deployment completes, verify:

* `get_ticker("XOS")`
* `get_recent_events`
* `get_diagnostics`
* current Discovery

The completed incident requires all of the following:

* XOS’s GlobeNewswire/company release is stored as evidence.
* AUTO no longer says August 13 earnings were the latest event.
* A superseding XOS analysis exists.
* The fingerprint changed.
* `supersedesId` is populated.
* Coverage accurately reflects the completed source checks.
* The live conflict is either resolved or accurately classified.
* SGLY remains a genuine interpretation conflict.
* Market and assessment workers remain healthy.

Finish with the precise discovery failure, the exact fix, files changed, tests run, live MCP evidence and anything still unresolved.
