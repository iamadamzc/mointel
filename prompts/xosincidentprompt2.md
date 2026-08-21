Begin **Phase 2 of the XOS research-quality incident** in a fresh Claude Code session.

Work from the current repository and deployed commit:

`bdcc608`

Do not revert or weaken the completed Phase 1 work.

## Current verified production state

Live MCP currently shows:

### XOS

* Catalyst conflict reason: `AUTO_SOURCE_GAP`
* Structure conflict reason: `SHEET_INCOMPLETE`
* AUTO analysis ID: 41
* AUTO generated: August 17, 2026 at 5:00:24 PM ET
* Evidence fingerprint: `7850c976206f2b510f283f1dab686adf2d48a158a3383104a52bc06644d039ef`
* `supersedesId`: null
* `coverageIncomplete`: false
* Evidence: eight SEC-derived sources, newest catalyst evidence August 13
* Missing: August 17 Xos U.S. Air Force announcement
* No superseding analysis exists

### SGLY

Its structure disagreement remains:

`INTERPRETATION_DIFFERENCE`

This is correct and must remain escalatable.

### Infrastructure

* Market: LIVE / STREAMING / FRESH
* Research worker: running
* Assessment scheduler: running
* Consistency checks: passing

## Production safety

The live Desk is entering the August 18 premarket assessment sequence.

Begin with read-only investigation. Do not restart or deploy the market, research or assessment workers during an active assessment or trading window.

Code and tests may be developed locally, but production deployment must use the established safe deployment procedure and must not interrupt live telemetry or scheduled assessments.

## Objective

Fix the actual source-discovery failure that caused AUTO to miss Xos’s original August 17 announcement.

The required outcome is not merely better conflict labelling. The system must:

1. Discover the original company/newswire source.
2. Persist it as evidence.
3. Include it in the evidence fingerprint.
4. Generate a changed fingerprint.
5. Create a superseding XOS analysis.
6. Interpret the Air Force agreement as the latest event.
7. Stop reporting August 13 earnings as the latest catalyst.
8. Avoid duplicate analysis when the source set is unchanged.

## Established production facts

Do not spend time rediscovering these unless repository evidence contradicts them:

* XOS’s `issuer_registry` row has null values for:

  * `investorRelationsUrl`
  * `newsroomUrl`
  * `pressReleaseIndexUrl`
  * `feedUrl`
* Discovery recently updated `lastDiscoveryAt`, so the discovery pass ran.
* Discovery was attempted for 39 of 42 issuers.
* Only 4 issuers resolved a company source.
* All 22 stored XOS sources are SEC-derived.
* Four XOS collection passes ran from approximately 20:59 UTC August 17 through 08:03 UTC August 18.
* All four occurred after the missing release was published.
* None added a non-SEC source.
* The original GlobeNewswire release was published August 17 at 4:30 PM ET.
* Phase 1 corrected future coverage calculation and live conflict classification.
* Existing XOS analysis metadata remains stale because no new analysis has been generated.

The approximately **10% issuer-source resolution rate** is the primary incident.

## Part 1 — Trace one XOS discovery pass completely

Locate the exact implementation and trace one real or faithfully replayed XOS pass through:

1. Discovery trigger.
2. Issuer identity and company-name inputs.
3. Query construction.
4. Search/provider invocation.
5. Raw candidates returned.
6. URL normalization and redirect handling.
7. Domain and authority validation.
8. Candidate scoring and rejection.
9. Issuer-registry persistence.
10. Press-release-index/feed discovery.
11. Release extraction.
12. Research-source persistence.
13. Evidence fingerprint calculation.
14. Reanalysis decision.

Report evidence at each stage.

Determine precisely whether the Xos source was:

* never returned by the provider;
* returned but rejected;
* rejected because of URL/domain rules;
* lost during normalization or redirects;
* fetched but not parsed;
* parsed but not persisted;
* persisted after fingerprinting;
* suppressed by an existing dossier;
* or missed for another demonstrated reason.

Do not infer the internal failure solely from the missing database row.

## Part 2 — Measure the broader resolution failure

Inspect the 39 attempted issuers and classify failures into a small, evidence-based taxonomy such as:

* provider returned no candidates;
* wrong company/entity match;
* official site found but IR page not found;
* IR page found but rejected;
* JavaScript-only page;
* redirect or canonicalization failure;
* fetch failure;
* parser failure;
* persistence failure;
* other demonstrated category.

Provide counts and representative examples.

Do not dump sensitive data, prompts, credentials or full page bodies.

Determine whether the 4-of-39 success rate results from one dominant defect or several independent limitations.

## Part 3 — Implement the smallest general repair

Use the existing source-discovery and research abstractions. Do not hardcode XOS, the incident URL or GlobeNewswire-specific conclusions.

The fixed flow must prefer:

1. Official company investor-relations/newsroom source.
2. Original established newswire release.
3. SEC filing or exhibit.
4. Reliable secondary discovery only as a route to an original source.

A secondary article may help locate a release, but the stored evidence should use the original source whenever available.

The implementation must safely handle:

* issuer aliases;
* ticker collisions;
* renamed companies;
* redirects;
* canonical URLs;
* newswire company pages;
* publication timestamps and timezone;
* duplicate release URLs;
* the same release appearing through IR, newswire and SEC;
* foreign issuers;
* sources without RSS feeds.

Do not introduce uncontrolled broad web scraping. Respect existing request limits, timeouts, source allowlists and caching.

## Coverage state model

Review the deployed `companySourceKnown` behavior.

A stored IR/newsroom URL alone must not make current catalyst coverage complete.

Represent or derive these distinct states:

* source location unknown;
* source location known but not checked;
* current check completed successfully;
* check failed or timed out;
* check completed but parsing failed.

Coverage may be considered complete only when the required source checks completed successfully for the relevant observation window.

If a source URL is known but its fetch or parser failed:

`coverageIncomplete` must remain true.

Persist enough state to distinguish:

* `lastDiscoveryAt`
* discovery outcome
* resolved source type
* `lastCheckedAt`
* check result
* newest observed release timestamp
* failure/rejection reason

Use the smallest schema change compatible with current storage patterns.

## Fingerprint and supersession

A newly discovered material source must participate in the effective evidence fingerprint.

For XOS:

* the August 17 source must produce a fingerprint different from the current SEC-only fingerprint;
* the new analysis must supersede analysis 41;
* `supersedesId` must reference 41;
* `current_version_id` must point to the new analysis;
* the prior analysis must remain available historically.

Repeated collection with the same canonical effective sources must not:

* change the fingerprint;
* call the interpreter again;
* create another analysis version;
* or generate duplicate events.

## Required tests

### XOS end-to-end incident fixture

Start with:

* existing SEC-only dossier;
* evidence through August 13;
* original August 17 company/newswire release;
* a later discovery pass.

Expect:

* authoritative release discovery;
* source persistence;
* correct publication time;
* changed evidence fingerprint;
* a superseding analysis;
* `supersedesId` populated;
* August 17 Air Force agreement recognized as the newest event;
* no continued claim that August 13 earnings are the latest catalyst;
* updated coverage state;
* no duplicate version on the next unchanged pass.

Do not require an exact catalyst grade unless existing deterministic policy requires one. Require correct event identification, freshness and evidence provenance.

### Discovery failure

Given a known IR URL whose fetch or parser fails, expect:

* `coverageIncomplete: true`;
* failure state persisted;
* no gap-free or authoritative no-catalyst claim.

### KTCC

Confirm the August 6 reporting-date announcement can be discovered as fresher company information but is not promoted into a strong momentum catalyst.

### HCM and IVF

Confirm fresh SEC-filed announcements continue to work and are deduplicated if the same release is also discovered through IR/newswire.

### Unchanged evidence

Confirm no new fingerprint, AI call or dossier version when canonical evidence is unchanged.

### Conflict regression

Confirm:

* XOS remains `AUTO_SOURCE_GAP` until AUTO actually receives the fresher source.
* After AUTO receives and interprets the same event, the source-gap conflict disappears or becomes a genuine same-event interpretation comparison.
* SGLY structure remains `INTERPRETATION_DIFFERENCE`.

## Observability

The system currently computes and discards:

* `discoveryRan`
* `discoveryDetail`
* `discoveryTrigger`

Preserve and expose sanitized diagnostics sufficient to determine:

* whether discovery ran;
* why it ran;
* provider or source type attempted;
* number of candidates found;
* number accepted and rejected;
* summarized rejection reasons;
* whether a company source resolved;
* whether the latest source check succeeded;
* newest observed company-source timestamp;
* whether the fingerprint changed;
* whether reanalysis was queued or suppressed.

Do not expose credentials, raw prompts, full source text or environment values.

Add any MCP diagnostic fields through the existing sanitized diagnostic structure.

## Validation gates

Run:

* focused new tests;
* full test suite;
* lint;
* typecheck;
* production build.

Investigate any new failure. Do not attribute an unrelated failure to this work without evidence.

The existing timing-sensitive flake in:

`tests/market/migrationConcurrency.test.ts`

may be documented if it reproduces under parallel load, but do not fold an unrelated concurrency rewrite into this incident.

## Live deployment verification

After a safe deployment, verify through MCP:

* `get_ticker("XOS")`
* `get_recent_events`
* `get_diagnostics`
* current Discovery

Required live evidence:

* Xos August 17 original release stored.
* Non-SEC authority and source type visible.
* Correct publication timestamp.
* New fingerprint.
* New analysis ID.
* `supersedesId: 41`.
* `current_version_id` advanced.
* Updated catalyst conclusion.
* Updated coverage state.
* No unnecessary worker restart.
* Market and scheduler healthy.
* SGLY conflict unchanged.

Do not manually insert the XOS source or directly overwrite its conclusion to satisfy verification. The normal discovery and recollection path must produce the result.

Finish with:

1. Exact discovery failure.
2. Resolution-rate breakdown.
3. Smallest implemented repair.
4. Files and schema changed.
5. Tests and gates.
6. Before/after XOS evidence.
7. Fingerprint and version transition.
8. Observability added.
9. Any remaining source classes the collector still cannot handle.
