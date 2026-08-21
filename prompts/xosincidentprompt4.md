Continue from commit:

`d8a872d`

Do not deploy yet. The Desk is live in premarket, and the repair is not production-active.

## Immediate defect

The urgent first-qualification path depends on:

* `materialEvent`
* `relevant`

But `worker/research.ts` does not pass either value into the collector.

Therefore:

* the new urgent path is dead in production;
* the pre-existing early material-demand check is also dead;
* current unit tests prove collector behavior only when values are injected manually;
* XOS and ENRD would behave exactly as before if this commit were deployed alone.

Fix the production event-to-worker-to-collector wiring before doing anything else.

## Use the actual triggering event

Do not recompute “material” from the ticker’s rank when collection begins. Rank may change between qualification and job execution.

Trace the research job from the event that created it and carry the original trigger metadata through the queue.

Use existing event semantics where possible, including:

* first Discovery qualification;
* first Top-12 or material rank entry;
* material acceleration/demand event;
* source-change reanalysis;
* ordinary background refresh.

`materialEvent` should be true only for a genuinely material demand episode, not every research job or every first sight of a ticker.

`relevant` should preserve the existing meaning used by the collector. Do not silently redefine it as “currently in the Top 12” unless that is already the intended contract.

Persist or carry enough trigger information for tests and diagnostics to show why the urgent path ran.

## Required production call-site tests

Add tests at the real `worker/research.ts` call boundary.

Prove:

1. A first material Top-12 entry passes `materialEvent: true`.
2. Background research passes `materialEvent: false`.
3. A later ordinary poll does not repeat the urgent episode.
4. A source-change reanalysis does not masquerade as first qualification.
5. Rank movement after job creation does not erase the original material trigger.
6. Existing job deduplication remains intact.

## Complete the missing resolver-success fixture

The current tests do not prove the central behavior:

`resolver returns official source → source is read → current release is collected in the same pass`

Inspect and document the actual provider contract used by `resolveCompanySources`.

Create an honest test double at that interface. Do not bypass the resolver by preloading the registry for this test.

Required scenario:

* issuer registry begins unresolved;
* production worker receives a first material qualification;
* resolver provider returns a validated official IR/newsroom location;
* deterministic source reader fetches that location in the same collection pass;
* a fresh release is extracted;
* the release enters the evidence set before fingerprinting;
* interpretation receives it during the same job.

This test must traverse the real worker-to-collector call path, not only invoke the collector directly.

## ENRD end-to-end fixture

Use ENRD as the main real-time reproduction:

* GlobeNewswire headline at 6:30 AM:
  `Einride Partners with Tesla for the World’s Largest Tesla Semi Deployment`
* first material qualification at 6:32 AM;
* SEC evidence stops at July 21;
* official Einride source is initially unresolved;
* resolver returns Einride’s official press/IR location;
* same-pass collection finds the August 18 release.

Expect:

* official source persisted;
* release collected in the 6:32 research cycle;
* latest catalyst is no longer July 21;
* fingerprint includes the August 18 release;
* analysis receives the fresh event;
* the next unchanged poll creates no duplicate version or AI call.

Do not hardcode ENRD or the release URL in production code.

## XOS supersession fixture

Use XOS to prove recovery of an existing stale dossier:

* existing analysis ID 41;
* SEC-only evidence through August 13;
* unresolved company-source registry;
* August 17 Air Force release available through the resolved official source;
* bounded recovery job or later eligible material refresh.

Expect:

* official source resolution;
* release persistence;
* changed fingerprint;
* new analysis version;
* `supersedesId` pointing to 41;
* current version advanced;
* no duplicate version on the next unchanged pass.

## Recovery path

The urgent exception cannot repair XOS or ENRD by itself because their `lastDiscoveryAt` values are already populated.

Implement a bounded recovery mechanism for relevant unresolved issuers affected by the newly activated resolver.

Do not manually clear database fields or insert URLs.

The recovery must:

* use the normal production resolver and collector;
* target only active/researched unresolved issuers;
* be rate-limited;
* be idempotent;
* respect the one-call interval design outside an explicit recovery pass;
* expose why it ran;
* avoid restarting the market worker.

A resolver-version-aware retry or existing backfill mechanism is preferable to destructive timestamp resets.

## Authority validation

Finish the source-authority rules before deployment.

Required behavior:

* recognized newswire host may be NEWSWIRE;
* registry-validated official domain may be COMPANY;
* Reddit and social hosts remain SECONDARY;
* unknown host cannot become COMPANY or NEWSWIRE solely because the model says so;
* secondary evidence cannot establish complete company-source coverage;
* secondary evidence may point toward an original source;
* original company/newswire source should be persisted when found.

Do not require every legitimate company domain to appear in a global static allowlist. Validate it against the resolved issuer identity and registry.

## Coverage state

A known URL alone must not establish complete coverage.

Distinguish at least:

* source unresolved;
* source resolved but not checked;
* source checked successfully;
* fetch failed;
* parsing failed.

`coverageIncomplete` must remain true when the required current source was not checked successfully.

Existing XOS analysis 41 may remain historically false because it was generated before the fix. The superseding analysis must contain the corrected state.

## Unchanged-evidence protection

Add explicit regression coverage proving identical canonical evidence does not generate:

* a new fingerprint;
* another interpreter call;
* another dossier version;
* another source-change event.

Deduplicate the same release appearing through IR, newswire and SEC.

## KTCC, HCM and IVF

Add the remaining fixtures:

* **KTCC:** August 6 reporting-date release is found but not inflated into a strong catalyst.
* **HCM:** fresh SEC-filed release continues working.
* **IVF:** fresh SEC-filed release continues working.
* If the same HCM/IVF release is also found through IR/newswire, it is deduplicated.

## Observability

Persist and expose sanitized versions of:

* discovery trigger;
* material-event decision;
* discovery mode;
* resolver attempted;
* resolver result;
* provider call count;
* resolved company-source URL/type;
* source-fetch result;
* parser result;
* newest company-release timestamp;
* fingerprint changed or unchanged;
* analysis queued or suppressed.

The collector already computes `discoveryMode` and `companySourceDetail`; stop discarding them.

## Cost acceptance criteria

Preserve:

* urgent unresolved success: one provider call;
* urgent unresolved failure: two-call ceiling for that first material episode;
* subsequent polls: at most one call per eligible interval;
* background first sight: no urgent exception;
* resolved issuer: no resolver call;
* cooldown unchanged.

Add production call-site tests enforcing these limits.

## Scope

Do not:

* deploy during premarket or RTH;
* restart the market worker;
* change Discovery/RVOL;
* revisit Phase 1;
* hardcode incident tickers or URLs;
* manually repair database records;
* expand into the unrelated migration-concurrency flake.

## Completion gates

Run:

* focused unit tests;
* worker/collector integration tests;
* XOS and ENRD fixtures;
* full suite;
* lint;
* typecheck;
* production build.

Do not call the repair complete merely because the collector tests pass. It is complete only when the production worker supplies the trigger and the resolver-success path is proven end to end.

After a safe deployment, run the bounded recovery and verify through MCP:

* `get_ticker("XOS")`
* `get_ticker("ENRD")`
* `get_recent_events`
* `get_diagnostics`

Required live outcome:

* XOS and ENRD official sources resolved;
* both missing releases stored;
* XOS supersedes analysis 41;
* ENRD catalyst updates from UNKNOWN;
* fingerprints change exactly once;
* coverage state is accurate;
* no repeated model spend;
* market and scheduler remain healthy.

Finish with the exact production trigger wiring, provider contract, recovery behavior, source-validation rule, coverage state, test evidence and live MCP result.
