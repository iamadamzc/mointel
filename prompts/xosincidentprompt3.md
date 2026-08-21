Continue Phase 2 from the clean repository state at:

`bdcc608`

Nothing from the unsuccessful draft remains in the tree. Phase 1 is deployed and verified. Do not revisit it.

## Confirmed root cause

`resolveCompanySources()` is never invoked by the production research worker.

It is called only by:

`worker/research-catalyst.ts`

That is the standalone `npm run research:catalyst` diagnostic, not the production path.

Production uses:

`worker/research.ts`
→ `collectSecEvidence`
→ `collectCatalystEvidence`

The production consequence is confirmed:

1. `collectCatalystEvidence` reads `issuer_registry`.
2. Normal production never populates the registry’s IR/newsroom/feed fields.
3. `knownSourceUrl` remains null.
4. Deterministic known-company-source collection never runs.
5. The only non-SEC route is general web discovery.
6. For XOS, that provider returned one Reddit thread and did not return the GlobeNewswire original or Xos IR page.
7. The incomplete SEC-only evidence proceeded to interpretation.

The approximately 4-of-39 issuer-source resolution rate results primarily from this dead production path. The four resolved issuers appear to have been populated by manually running the diagnostic.

## New live reproduction: ENRD

Add ENRD as a second incident fixture.

At **6:30 AM ET on August 18**, GlobeNewswire published:

**Einride Partners with Tesla for the World’s Largest Tesla Semi Deployment**

Live production then did the following:

| Time ET | Event                                                          |
| ------- | -------------------------------------------------------------- |
| 6:30:01 | ENRD new HOD $7.61; RVOL rank 162                              |
| 6:31:01 | ENRD spikes to $10.53; rank 13                                 |
| 6:32:00 | ENRD enters Top 12 at #5                                       |
| 6:32:09 | Source-change event adds four sources, all SEC; newest July 21 |
| 6:32:53 | AUTO analysis 77 completes                                     |

AUTO correctly returned:

* Catalyst: UNKNOWN
* Latest identified event: July 21 Flipturn acquisition
* Catalyst coverage: SEC-only
* `coverageIncomplete: true`
* Structure: CAUTION
* Cycle: UNKNOWN
* Version: 1
* `supersedesId: null`

ENRD is important because it proves:

* production orchestration is fast;
* the research queue is not the problem;
* this is not stale-dossier reuse;
* this is not reanalysis suppression;
* this is not an unchanged fingerprint;
* this is not an interpretation error;
* the same company-source discovery failure affects brand-new intake.

Einride has an established official investor-relations site and press archive. AUTO also missed Einride’s July 24 official announcement that it would report first-half results on August 18. Therefore, the failure is not explained only by a two-minute search-indexing delay for the new Tesla release.

## Required production repair

Move issuer-source resolution into the production collection architecture so every caller benefits.

The correct location should be inside or directly owned by `collectCatalystEvidence`, after the collection report/context exists and before deterministic known-company-source collection.

Do not duplicate the call independently across workers.

However, do not call `resolveCompanySources()` on every polling pass.

The prior draft correctly caused seven `catalystCollector.test.ts` failures because it introduced an unbounded model-call regression for unresolved issuers. Preserve what those tests protect.

## Interval and cost gating

Reuse the existing discovery interval/spacing policy rather than inventing a second timer.

Resolution must follow these rules:

* No resolver model call before discovery is due.
* At most one source-discovery/resolution model call per ticker per eligible collection pass unless an existing explicit retry policy allows otherwise.
* A successfully resolved issuer must not invoke the resolver again on normal polls.
* An unresolved issuer must receive a cooldown before another resolution attempt.
* Normal rapid research polls must not repeatedly spend model calls.
* Existing general catalyst web discovery must remain available as a fallback.
* Resolver attempts and general discovery must share a bounded discovery budget rather than silently doubling model calls.

Inspect the existing resolved/unresolved interval tiers and use the same helper or predicate if possible.

Do not guess at new cooldown values if existing policy already defines them. If a new value is genuinely required, document the cost and latency tradeoff and choose the smallest configuration addition.

## Preserve the fallback path

Do not accidentally replace general catalyst discovery with endless failed IR-resolution attempts.

If source resolution fails, preserve a bounded path to general catalyst discovery on an eligible pass.

Design the state transition so an unresolved issuer can receive both capabilities over time without receiving two uncontrolled model calls on every poll.

Tests must demonstrate this explicitly.

## Candidate authority validation

The XOS provider returned:

* URL: Reddit
* Model-declared kind: SECONDARY
* `classifyHost`: null

A secondary result may remain a discovery clue, but it must not:

* become authoritative company evidence;
* prove coverage complete;
* masquerade as COMPANY or NEWSWIRE;
* or prevent continued search for an original source.

Tighten validation so:

* Recognized newswire authority requires a recognized newswire host.
* Company authority requires either a registry-known official domain or another positively validated official-company relationship.
* A model-declared COMPANY or NEWSWIRE source with an unrecognized host cannot be trusted solely because the model assigned that kind.
* Unclassified Reddit, social and aggregator hosts remain SECONDARY at most.
* Secondary sources may be used to locate an original source, but the original should be persisted whenever found.

Do not reject arbitrary legitimate company IR domains merely because they are not in a global static allowlist. Registry/domain validation should establish company authority.

## Source-resolution state

Persist enough state to distinguish:

* never attempted;
* attempted and resolved;
* attempted but unresolved;
* source known;
* source known but current fetch not attempted;
* current fetch successful;
* fetch failed;
* parser failed.

A known URL alone must not make current catalyst coverage complete.

The coverage decision must consider whether the required current-source check actually completed successfully for the applicable observation window.

## One-time production recovery

After the repair, recently attempted unresolved issuers such as XOS and ENRD may still be suppressed by their existing `lastDiscoveryAt`.

Provide a bounded, rate-limited recovery path for active unresolved issuers after deployment.

Acceptable approaches include an existing backfill/retry mechanism or a resolver-version-aware retry. Do not manually insert XOS or ENRD URLs into the database.

The recovery must:

* use the normal resolver;
* target only relevant unresolved issuers;
* respect rate and cost limits;
* avoid restarting live market processing;
* remain idempotent.

Do not scan the entire market universe unnecessarily.

## Required tests

### Existing cost tests

Restore all seven `catalystCollector.test.ts` expectations or update them only where the expected behavior intentionally changes.

Add explicit assertions for:

* zero resolver calls before the interval;
* one resolver call when due;
* no repeat call during cooldown;
* no resolver call after a usable source is known;
* no accidental extra general-discovery call in the same bounded pass;
* general discovery remains reachable after resolution failure.

### XOS

Fixture:

* existing SEC-only analysis 41;
* unresolved issuer registry;
* original August 17 company/newswire release;
* eligible discovery interval.

Expect:

* official source resolution;
* original release persistence;
* changed evidence fingerprint;
* new analysis version;
* `supersedesId` referencing analysis 41;
* Air Force agreement identified as the latest event;
* no continued claim that August 13 earnings are latest;
* no duplicate analysis on the next unchanged pass.

### ENRD

Fixture:

* newly qualifying ticker with no prior dossier;
* known official Einride press archive discoverable through the resolver;
* July 24 official release;
* August 18 6:30 AM Tesla release;
* SEC evidence ending July 21.

Expect:

* official source resolved;
* August 18 release collected;
* latest catalyst no longer July 21;
* evidence fingerprint includes the new release;
* catalyst interpretation receives the original source;
* repeated unchanged collection produces no second version.

Do not hardcode the expected catalyst grade. Require correct event identity, freshness, source authority and provenance.

### KTCC

Confirm the August 6 reporting-date release becomes discoverable but is not promoted into a strong momentum catalyst.

### HCM and IVF

Confirm SEC-filed fresh announcements continue to work and are deduplicated if the same release also appears through company/newswire collection.

### Authority validation

Test:

* recognized original newswire;
* registry-validated company domain;
* Reddit marked SECONDARY;
* model claims NEWSWIRE for an unrecognized host;
* model claims COMPANY for an unrelated domain;
* secondary clue leading to an original source.

### Unchanged evidence

Confirm identical canonical evidence does not cause:

* a new fingerprint;
* a new AI call;
* a new dossier version;
* or a duplicate event.

## Observability

The system currently computes and discards:

* `discoveryRan`
* `discoveryDetail`
* `discoveryTrigger`

Persist or expose them through sanitized diagnostics.

Include:

* resolver attempted;
* resolver outcome;
* cooldown/due decision;
* provider model-call count;
* candidates returned;
* accepted source authority;
* summarized rejection reasons;
* known company-source URL;
* current-source fetch result;
* newest observed company-release timestamp;
* fingerprint changed or unchanged;
* analysis queued or suppressed.

Do not expose prompts, credentials, raw source bodies or environment values.

## Scope control

Do not:

* modify Discovery or Daily RVOL;
* change the structural methodology;
* hardcode XOS, ENRD or specific release URLs;
* manually overwrite live conclusions;
* restart the market worker during trading;
* broaden this into the unrelated migration-concurrency flake;
* remove the Phase 1 source-gap comparison logic.

The `researchStatus: NO_RESEARCH_RECORD` wording observed for ENRD despite AUTO analysis 77 may be documented as a separate read-model issue. Do not let it expand this collector repair unless it blocks verification.

## Gates and deployment

Run:

* focused collector tests;
* all new incident fixtures;
* full suite;
* lint;
* typecheck;
* production build.

Deploy only through the established safe procedure and not during an active assessment or trading-sensitive window.

After deployment, use the bounded normal recovery path—not manual database edits—to recollect XOS and ENRD.

Verify with MCP:

* `get_ticker("XOS")`
* `get_ticker("ENRD")`
* `get_recent_events`
* `get_diagnostics`

Required live result:

* Official company/newswire sources resolved.
* XOS Air Force release present.
* ENRD Tesla release present.
* XOS fingerprint changed.
* XOS analysis supersedes 41.
* ENRD receives a new or superseding analysis only if evidence changed.
* Catalyst conclusions reference the actual current events.
* Coverage states reflect completed collection.
* No repeated resolver/model calls on normal polls.
* Market and assessment workers remain healthy.

Finish with:

1. Exact implementation defect.
2. Interval/cost design used.
3. Authority-validation rule.
4. Files and schema changed.
5. Test results.
6. Before/after XOS.
7. Before/after ENRD.
8. Model-call behavior before and after.
9. Live MCP verification.
10. Remaining source-resolution limitations.
