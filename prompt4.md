Continue development of:

`A:\mointel`

Current Phase 2 checkpoint:

`67696e1`

Phase 1 built the persistent research repository.

Phase 2 built the SEC/EDGAR structural evidence collector.

Phase 3 should build the **public catalyst evidence collector**.

Do not implement dossier interpretation yet.

Do not classify catalyst grade, structure, Dirty Float, or momentum cycle in this phase.

The objective is:

`live Discovery ticker`
→ `identify issuer`
→ `collect fresh/recent public catalyst evidence`
→ `persist source-grounded evidence`
→ `determine whether the source set changed`
→ later Phase 4 interprets it

## PRINCIPLE

Separate:

FACT / SOURCE DISCOVERY

from:

INTERPRETATION.

Phase 3 should answer:

* What company-originated/public sources exist?
* What was published?
* When?
* Is the source current or historical?
* Is it company-originated, SEC-originated, newswire-originated or secondary discovery?
* Has anything materially new appeared since the last check?

Phase 3 must NOT answer:

* Is this a strong catalyst?
* Is this bullish?
* Does this explain the move?
* Is structure clean/dirty?
* Is this frontside/backside?

Those come later.

## SOURCE PRIORITY

Use this hierarchy:

1. SEC filing/exhibit
2. Company Investor Relations / company newsroom
3. Original established newswire release
4. Other company-originated source
5. Reliable secondary public discovery source

Preserve authority/provenance.

Do not let an aggregator replace an available original source.

## SEC EXHIBIT CATALYSTS

Extend Phase 2 evidence collection to identify catalyst-bearing exhibits associated with current filings.

Examples:

* earnings releases
* press releases
* merger announcements
* clinical/trial announcements
* contract announcements
* financing announcements
* acquisition announcements
* operational updates

For relevant 8-K/6-K filings, inspect filing metadata/index and identify likely exhibits such as:

* EX-99.1
* EX-99.2
* other clearly release-bearing exhibits

Do not fetch every exhibit blindly.

Persist exhibit source independently from the parent filing while linking it to:

* parent accession
* parent form
* exhibit filename/type
* publication/furnished timestamp where determinable

## COMPANY IR REGISTRY

Extend issuer_registry with reusable company-source metadata.

Support at least:

* investorRelationsUrl
* newsroomUrl
* pressReleaseIndexUrl
* RSS/feed URL if available
* source discovery method
* last verified timestamp
* confidence

Once an issuer's official IR/news source is established, reuse it.

Do not rediscover it on every refresh.

## DIRECT COMPANY SOURCE FETCHING

Build a bounded CompanySource collector.

It should support common patterns such as:

* company newsroom pages
* IR press-release lists
* RSS/Atom feeds
* structured release index pages

Do not build a broad crawler.

Fetch only:

* known issuer source pages
* release index/feed
* individual recent releases relevant to the current time window

Persist:

* title
* URL
* publication timestamp
* fetched timestamp
* source owner
* source type
* normalized content hash
* source fingerprint
* limited evidence excerpt
* source authority

Do not store entire copyrighted release archives.

## NEWSWIRE DISCOVERY

Support original releases from established newswires when the issuer uses them.

Examples may include PR Newswire, GlobeNewswire, AccessWire and similar services.

However:

Do NOT bulk scrape these sites.

Do NOT assume public visibility grants commercial redistribution rights.

Prefer:

* issuer-provided direct link
* SEC exhibit containing the release
* company IR link to the original release
* targeted public search discovery

Persist the original URL and limited evidence metadata/excerpt.

## WEB DISCOVERY PROVIDER

Build a pluggable source-discovery abstraction.

Example:

`CatalystSourceDiscoveryProvider`

Implement an OpenAI web-search-backed provider using the existing server-side Responses API configuration.

This provider is for:

**finding candidate public sources**

not interpreting them.

Use:

`OPENAI_CHANGE_DETECT_MODEL`

for this source-discovery/change-detection layer where practical.

Do NOT use Terra for a full analysis in Phase 3.

The output must be strict structured JSON containing candidate source metadata such as:

* title
* URL
* publisher/source owner
* publication timestamp if located
* source type
* why it appears relevant to the issuer/ticker
* whether it appears company-originated/original
* search confidence

Do not ask the model whether the catalyst is strong, bullish, weak, fresh enough to trade, etc.

The model is functioning as a source locator.

## CHEAP-FIRST RULE

Preserve this order:

1. deterministic source-state comparison
2. direct SEC/IR/feed checks
3. only if needed, low-cost web discovery
4. no Terra interpretation in Phase 3

An elapsed refresh interval alone must NOT trigger a model/web-search call.

If known sources have not changed and there is no reason to suspect missing evidence:

perform zero model calls.

Add a test for this.

## CATALYST EVIDENCE WINDOW

For active morning research, search enough history to distinguish:

* same-day catalyst
* after-hours prior-session catalyst
* prior-day catalyst
* stale/recycled catalyst

Do not impose a single hard 24-hour window that prevents historical context.

Use separate concepts:

`activeFreshnessWindow`

and:

`contextLookback`

Suggested configurable defaults may be used, but keep them explicit and reversible.

The collector should preserve timestamps and let Phase 4 decide freshness classification.

## TIME NORMALIZATION

Normalize all source times into:

* original timestamp/timezone when known
* UTC
* America/New_York display time

Do not silently treat date-only releases as precise timestamps.

Represent precision:

* EXACT
* DATE_ONLY
* INFERRED
* UNKNOWN

This matters in premarket because an 08:15 release and yesterday's release are very different.

## DUPLICATE / SYNDICATED RELEASES

The same company announcement may exist as:

* SEC exhibit
* IR release
* PR Newswire version
* mirrored/aggregated version

Do not treat all copies as separate catalysts.

Preserve each legal/public source record, but create a deterministic or probabilistic `sourceClusterId` / event cluster linking copies of the same underlying announcement.

Use:

* normalized title
* publication time
* content hash / similarity
* issuer
* SEC exhibit relationship
* canonical/original-source preference

Do not delete duplicate source records.

We need provenance and canonical-source selection.

## CANONICAL SOURCE

For each clustered announcement, identify the best canonical source based on authority:

SEC exhibit / company IR / original newswire before secondary mirror.

Store:

* canonicalSourceId
* cluster confidence

Do not make interpretation claims.

## CHANGE DETECTION

Calculate a catalyst evidence fingerprint.

Inputs should include material source state such as:

* source IDs
* content hashes
* timestamps
* canonical clusters

If fingerprint is unchanged:

do not invoke web search or later interpretation merely because polling time elapsed.

If a new source appears:

record a deterministic:

`CATALYST_SOURCE_CHANGE`

event.

Do not yet label it bullish/strong/etc.

## POLLING

For currently relevant names:

Default:

`CATALYST_SOURCE_POLL_SECONDS=60`

for deterministic known-source checks.

Web discovery should run less often and only when necessary.

Make configurable:

`CATALYST_WEB_DISCOVERY_MINUTES`

Use a reasonable prototype default.

Do not automatically perform web search at every interval.

## RESEARCH JOB INTEGRATION

Reuse Phase 1 research_jobs.

Phase 3 source collection should fit the existing job lifecycle.

A ticker should be capable of having:

* SEC sources ready
* catalyst sources ready
* interpretation not yet run

Do not force `COMPLETE` to mean interpreted dossier exists.

Use explicit evidence readiness state where necessary.

## SOURCE TABLES

Reuse `research_sources`.

Do not create a competing source database.

Extend metadata/schema only where necessary.

Support source types such as:

* SEC_FILING
* SEC_EXHIBIT
* COMPANY_IR
* COMPANY_NEWSROOM
* NEWSWIRE
* SECONDARY_DISCOVERY

Keep source authority explicit.

## LIVE ACCEPTANCE SET

Use current/live Discovery names where available.

At minimum test several from the live desk, preferably a mix such as:

* SLE
* CRGO
* IVF
* MYSZ
* GRNQ
* KMDA

Do not hardcode them.

For each test ticker report:

* issuer
* known IR/newsroom source
* SEC exhibit sources
* company-source releases found
* original newswire sources found
* secondary discovery sources found
* canonical source clusters
* latest source timestamp
* source fingerprint
* second-run network/model behavior
* total model/web-search calls
* collection latency

## SPECIFIC VALIDATION QUESTIONS

For each test ticker determine factually:

1. Was there a same-day or recent company-originated announcement located?
2. Where was the original/canonical public source?
3. Was it also present as an SEC exhibit?
4. Were duplicate/syndicated copies clustered rather than counted independently?
5. Did a second unchanged pass avoid unnecessary web/model calls?

Do not answer whether the source is a "good catalyst" yet.

## NO FRESH CATALYST FOUND

Do NOT produce the final phrase:

`NO FRESH CATALYST FOUND`

in Phase 3.

That is an interpretation conclusion and belongs in Phase 4 after coverage is considered.

Phase 3 may instead expose factual collection state such as:

* NO_RECENT_SOURCE_LOCATED
* RECENT_SOURCE_LOCATED
* COVERAGE_INCOMPLETE
* SOURCE_DISCOVERY_FAILED

## DATA RIGHTS / STORAGE

Do not persist full copyrighted releases unless they are SEC-filed public documents we need for evidence processing.

For IR/newswire/web sources store:

* metadata
* canonical URL
* hashes
* limited excerpts/evidence windows

Preserve enough evidence for Phase 4 but not an unnecessary content mirror.

## ERROR STATES

Handle:

* IR site unavailable
* robots/access restrictions
* malformed RSS
* dynamic JS-only IR pages
* web search unavailable
* model unavailable
* publication timestamp unavailable
* issuer has no identifiable IR site

Do not fail SEC evidence merely because an IR source cannot be collected.

Represent coverage honestly.

## TESTS

Add tests for at least:

1. SEC exhibit linked to parent filing
2. probable release exhibit selection
3. irrelevant exhibit exclusion
4. IR registry persistence
5. known IR source reused
6. RSS parsing
7. release-list parsing
8. exact/date-only timestamp handling
9. source authority ordering
10. syndicated release clustering
11. distinct releases not incorrectly clustered
12. canonical source selection
13. source fingerprint stability
14. new source changes fingerprint
15. unchanged evidence = zero web/model calls
16. web discovery only used when required
17. strict web-discovery schema
18. web result with invented/invalid URL rejected
19. secondary source cannot override original source
20. limited excerpt storage
21. research source dedupe
22. source records retain legal/provenance identity
23. catalyst polling does not re-run interpretation
24. missing IR source degrades gracefully
25. no OpenAI key still permits SEC/direct-source collection
26. no final catalyst-grade classification occurs in Phase 3

## OBSERVABILITY

Logs should remain concise.

Examples:

`[catalyst] SLE known IR source checked — unchanged`

`[catalyst] XYZ new release located 07:12 ET`

`[catalyst] XYZ clustered 3 copies → canonical COMPANY_IR`

`[discovery] XYZ web source search used — 2 candidate URLs`

Do not log entire release contents.

## DIAGNOSTIC

Extend:

`npm run research:diagnose`

to include:

* SEC collector
* company-source collector
* IR registry
* web discovery provider
* change-detection state
* model availability

## SECURITY

Do not expose:

* OpenAI key
* SEC config
* Alpaca keys
* Google keys

to client bundles or logs.

## VALIDATION GATE

Run full:

* tests
* lint
* typecheck

Test against live/current research database.

Verify a second pass across unchanged test tickers produces minimal/zero OpenAI web-search usage.

Stop before Phase 3 commit.

Report:

* files changed
* schema changes if any
* live tickers tested
* sources found by ticker
* canonical source clusters
* duplicate/syndication cases
* model/web-search call count
* first-run latency
* second-run latency
* second-run network calls
* any sites that could not be accessed directly
* any timestamps with uncertain precision
* tests/lint/typecheck
* any material deviations from this specification

Do not begin Phase 4 interpretation until reviewed.
