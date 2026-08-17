Continue development of:

`A:\mointel`

Repository:

`https://github.com/iamadamzc/mointel`

Current reported head:

`b226372`

This milestone addresses the most obvious current product gap:

The live Alpaca Demand Engine is discovering names that correctly appear on the Discovery Board, but newly discovered tickers currently show:

`NOT YET ANALYZED`

for:

* Cycle
* Catalyst
* Structure

We now want the application itself to perform the public-source research that has previously been done manually and written into the Google Sheet.

Do NOT redesign the Demand Engine.

Do NOT change the Daily RVOL definition.

Do NOT replace Alpaca.

Do NOT remove Google Sheets.

First inspect the entire existing architecture and reuse the current:

* SQLite WAL store
* Alpaca worker
* Demand Engine
* security classification
* desk events
* dashboard state merge
* Google Sheet provider
* ticker drawer
* one-command startup if present
* tests

Preserve all existing passing behavior.

# OBJECTIVE

Build **Automatic Public Intelligence Research**.

The system should evolve from:

`Alpaca discovers ticker → NOT YET ANALYZED`

into:

`Alpaca discovers ticker`
→ `research job queued`
→ `public evidence collected`
→ `evidence interpreted`
→ `ticker dossier persisted`
→ `dashboard updated automatically`

Conceptually:

```text
                           ┌─ SEC / EDGAR ─────────────┐
                           ├─ Company IR / releases ──┤
                           ├─ Public news discovery ──┤
                           │                          ↓
Alpaca → Demand Engine → Research Queue → Evidence Store
                                       → Intelligence Engine
                                       → Ticker Dossier
                                              ↓
Google Sheet Research ─────────────────→ State Merge
                                              ↓
                                          Dashboard
```

The system should analyze each ticker once and persist the result.

It must NOT perform a separate identical analysis for every browser refresh or every user.

# CORE PRINCIPLE

Separate:

**FACT COLLECTION**

from:

**INTERPRETATION**

Facts should come from public sources and deterministic parsing wherever possible.

AI should interpret complicated evidence.

AI must NOT invent facts that were not present in supplied evidence or properly sourced public search results.

Every material conclusion must retain provenance.

# NEW RESEARCH WORKER

Create a separate long-running research worker.

Suggested command:

`npm run research`

It should read demand/discovery state directly from the existing local state architecture rather than requiring the browser to initiate research.

Do not run research jobs from React components.

Do not expose source credentials or model credentials to the browser.

If a combined:

`npm run desk`

command already exists, extend it to include the research worker.

If it does not exist yet, do not unnecessarily redesign process management, but document how to run:

Terminal 1:

`npm run dev`

Terminal 2:

`npm run market:alpaca`

Terminal 3:

`npm run research`

The worker should survive normal dashboard reloads.

# AUTOMATIC QUEUE TRIGGER

Automatically queue research for newly discovered common-equity/ADR tickers.

Default:

`RESEARCH_AUTO_RANK=12`

Any eligible ticker entering the live Top 12 that does not have adequate current research should be queued automatically.

Do NOT require the ticker to already exist in Google Sheets.

Do NOT require a catalyst.

Do NOT require a minimum percentage gain.

Do NOT silently discard wide-spread or low-absolute-volume names.

All Top-12 unknown names should eventually be researched.

However, queue ordering should prioritize the names most likely to matter first.

Use a SOFT priority score, not a hard qualification filter.

Reasonable inputs include:

* RVOL rank
* absolute percentage movement
* absolute session volume
* spread quality
* whether it is already latched
* whether it is already in the TODAY Sheet
* recency of discovery

For example, a #4 ticker with +45%, 500K shares and a tight spread should normally begin research before a #3 ticker with 58K volume and a 31% spread.

But the #3 ticker must still remain queued.

Do not convert this into another scanner threshold system.

Make the queue logic explicit and testable.

# RESEARCH JOB STATES

Persist explicit states such as:

* NOT_QUEUED
* QUEUED
* COLLECTING
* SOURCES_READY
* ANALYZING
* COMPLETE
* PARTIAL
* FAILED
* STALE

Use names consistent with the codebase.

The dashboard should no longer display generic:

`NOT YET ANALYZED`

once a ticker has actually been queued.

Instead show trader-friendly states such as:

`ANALYSIS PENDING`

`COLLECTING SOURCES`

`ANALYZING`

`PARTIAL ANALYSIS`

`ANALYSIS FAILED`

Do not make the user guess whether anything is happening.

# RESEARCH PRIORITY / CONCURRENCY

Default:

`RESEARCH_CONCURRENCY=2`

Do not launch twelve deep analyses simultaneously.

Top-12 research should begin within seconds of discovery.

Use bounded concurrency.

If more names arrive, queue them.

Preserve results if a ticker leaves Top 12 before its research completes.

Do not cancel useful research merely because rank changed.

# DATABASE / PERSISTENCE

Extend the existing SQLite abstraction.

Do not create a competing database.

Add normalized tables or equivalent structures for at least:

## research_jobs

* id
* ticker
* tradingDate
* status
* priority
* reason
* queuedAt
* startedAt
* completedAt
* retryCount
* error
* evidenceFingerprint

## issuer_registry

* ticker
* company name
* CIK
* exchange
* country / foreign issuer status when known
* CIK confidence
* SEC mapping source
* lastVerifiedAt

## research_sources

Each source should have:

* id
* ticker
* sourceType
* title
* URL
* publishedAt
* fetchedAt
* accession number when applicable
* SEC form when applicable
* source authority
* content hash
* short extracted text / evidence
* metadata
* active/current status where meaningful

Do not duplicate identical source documents.

## research_dossiers

Persist normalized final analysis.

Support versioning.

Do not overwrite the previous dossier without retaining enough information to reconstruct what changed.

## research_analysis_versions

At minimum retain:

* ticker
* generatedAt
* evidenceFingerprint
* model
* analysis version
* dossier JSON
* source IDs
* supersedes ID

We eventually need:

`ticker → structure → live behavior → outcome`

for research validation.

Design accordingly.

# SOURCE AUTHORITY

Use this evidence hierarchy:

1. SEC / EDGAR
2. Exchange
3. Company Investor Relations / company-originated release
4. Original established newswire
5. Reliable market-data/reference source
6. Secondary public search/discovery

Do not let a secondary aggregator override a primary filing.

Store source authority explicitly.

# SEC / EDGAR — PRIMARY STRUCTURAL SOURCE

Automate direct SEC collection.

Use official SEC resources.

## TICKER / CIK MAPPING

Use:

`https://www.sec.gov/files/company_tickers_exchange.json`

as one mapping source.

SEC itself warns that ticker/CIK/exchange associations are updated periodically and are not guaranteed complete.

Therefore:

* validate ticker
* compare company name
* compare exchange where useful
* store mapping confidence
* do not blindly accept an obviously mismatched registrant

Normalize CIK to ten digits when required.

## SUBMISSIONS API

Use:

`https://data.sec.gov/submissions/CIK##########.json`

for filing history.

## COMPANY FACTS

Where useful, use:

`https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json`

Possible uses include candidate shares-outstanding facts.

Do not assume all issuers expose every desired fact through XBRL.

Do not treat Company Facts as a public-float API.

Never substitute shares outstanding for float.

## SEC REQUEST POLICY

Require an environment variable:

`SEC_USER_AGENT`

Example in `.env.example`:

`SEC_USER_AGENT=Momentum Intelligence Trading Desk contact@example.com`

Do NOT hardcode a fake email.

If SEC_USER_AGENT is missing, disable SEC automated fetching with a clear diagnostic instead of sending an anonymous bot.

Use a GLOBAL SEC request limiter.

Although SEC's published ceiling is 10 requests/second, configure our application more conservatively.

Default:

`SEC_MAX_REQUESTS_PER_SECOND=5`

Do not exceed SEC policy even if multiple research jobs are active.

Use caching.

Use retries with bounded exponential backoff for transient failures.

Handle 403 and 429 without hammering SEC.

Do not crawl EDGAR indiscriminately.

Fetch only documents needed for active ticker research.

# RELEVANT SEC FORMS

For initial research, inspect recent filings for material forms including where applicable:

* 8-K
* 6-K
* 10-Q
* 10-K
* 20-F
* 40-F
* S-1
* S-3
* F-1
* F-3
* POS AM
* 424B3
* 424B4
* 424B5
* other relevant 424B prospectuses
* EFFECT
* RW
* 1-A / Reg A documents where relevant

Potentially relevant ownership/supply context may include:

* Schedule 13D
* Schedule 13G
* amendments
* Form 144

Do not fetch every document merely because it exists.

Prioritize the forms that matter for:

* current catalyst
* shares outstanding
* registrations
* resale eligibility
* recent financing
* dilution
* warrants
* convertibles
* equity purchase agreements
* ATM programs
* PIPEs
* reverse splits
* recent issued shares
* acquisition consideration shares
* holder restrictions

# FILING DOCUMENT FETCHING

For a relevant filing:

* identify accession number
* identify primary filing document
* inspect filing directory/index metadata when required
* identify material exhibits such as company press releases
* fetch only relevant documents
* convert HTML to normalized readable text
* cache extracted content by accession/document hash

Do not store giant duplicate raw HTML blobs unnecessarily.

Do not summarize a filing before retaining the actual source URL and accession.

# SEC POLLING AFTER INITIAL ANALYSIS

Once a ticker is active/relevant, poll its filing metadata for new filings.

Default:

`SEC_ACTIVE_POLL_SECONDS=60`

This is for the small active research population, not the entire 13,000-symbol market.

If a NEW relevant filing appears:

* store the source
* create a material-source-change event
* requeue structural analysis
* flag the ticker in the dashboard while reassessment is pending

Examples:

`NEW SEC FILING — 8-K`

`STRUCTURE REASSESSMENT PENDING`

Do not rerun AI merely because the submissions JSON was fetched again.

Use accession numbers/content fingerprints.

# CATALYST COLLECTION

Catalyst research needs to answer:

* What happened?
* When?
* Is it fresh?
* Is it material?
* Does it plausibly explain current attention?
* Is it positive, mixed, weak, negative or dilution-related?

Search priority:

1. same-day/recent SEC filing and exhibits
2. company-originated IR/news release
3. original established newswire
4. secondary discovery sources only if needed

## FRESHNESS

Collect recent potential catalysts broadly enough to distinguish fresh from stale.

For premarket, search at least back through the prior RTH close and enough earlier context to identify recycled news.

Do not automatically classify old news as fresh merely because it is the newest item available.

Retain:

* publication timestamp
* source
* source timezone when relevant
* first located time
* freshness classification

# COMPANY IR / ORIGINAL RELEASES

When a company IR/news URL is known:

* persist it in issuer_registry
* reuse it later

Do not rediscover the company's IR domain every analysis.

Where a direct company release is accessible, prefer it over an aggregator.

Do not create a broad uncontrolled web crawler.

# PUBLIC WEB SEARCH

For catalyst discovery and gaps that direct deterministic sources cannot answer, create a pluggable WebResearch provider.

Implement an OpenAI provider when credentials are available.

Use environment variables:

`OPENAI_API_KEY`

`OPENAI_RESEARCH_MODEL`

Do not hardcode a model throughout the codebase.

Example `.env.example` may use:

`OPENAI_RESEARCH_MODEL=gpt-5`

but configuration must remain replaceable.

Use the official OpenAI server-side SDK and Responses API.

Use the built-in web search tool for targeted public catalyst research where necessary.

Do NOT expose the API key to client JavaScript.

Do NOT print it.

Use:

`store: false`

when appropriate.

Persist the public source URLs/citations returned from web research.

Never invent a URL.

Never treat AI text itself as a source.

The evidence source is the underlying SEC/company/newswire/public URL.

# OPENAI-OPTIONAL BEHAVIOR

The public-source collector must still function without OPENAI_API_KEY.

If no model key exists:

* SEC collection continues
* source storage continues
* deterministic extraction continues
* dashboard may show `SOURCES COLLECTED`
* interpretation remains `ANALYSIS UNAVAILABLE` or equivalent

Do NOT fabricate structure/catalyst classifications without the interpreter.

Do not crash the research worker.

# STRUCTURED MODEL OUTPUT

Use strict Structured Outputs / JSON Schema.

Do not parse free-form prose into product state.

Create a versioned schema.

The schema should return a normalized dossier containing at least:

## IDENTITY

* ticker
* company
* CIK when known
* country / foreign issuer context if known

## CATALYST

* catalystStatus
* catalystType
* catalystGrade
* summary
* eventTimestamp
* freshness
* whyTradersMayCare
* plausiblyExplainsMove
* confidence
* evidenceSourceIds

Catalyst Status should support:

* FRESH_FOUND
* SECONDARY_STALE
* NONE_FOUND
* CONFLICTING
* UNKNOWN

Catalyst Type should support concepts such as:

* NEWS_DRIVEN
* FLOW_DOMINANT
* SECONDARY_STALE
* NONE_IDENTIFIED

Do not claim FLOW_DOMINANT merely because no news was found.

There must also be strong live-demand evidence.

Catalyst Grade must map cleanly to our existing product language:

* STRONG
* LEGITIMATE_POSITIVE
* MODERATE_MIXED_SECONDARY
* WEAK_NEGATIVE_DILUTIVE
* NONE

If no fresh catalyst is located after the configured source search:

display exactly:

`NO FRESH CATALYST FOUND`

Do not substitute vague language.

# STRUCTURAL INTELLIGENCE

Return:

* sharesOutstanding
* sharesOutstandingDate
* displayedFloat if a sourced value actually exists
* displayedFloatSource
* floatConfidence
* structureClassification
* supplyLedger
* structuralWarnings
* reverseSplitHistory
* knownRegistrationStatus
* summary
* confidence
* evidenceSourceIds

## NEVER SUBSTITUTE MARKET CAP FOR FLOAT

This is absolute.

Shares outstanding is not float.

Market cap is not float.

Unknown float must remain unknown.

# SUPPLY LEDGER

Create structured supply blocks.

Each block should support:

* type
* amountShares if known
* dollarCapacity if only dollars are known
* source filing
* registration status
* effective date
* exercise/conversion terms when known
* holder restrictions when known
* eligibility assessment
* evidence
* confidence

Classify each block as:

* KNOWN_ACTIVE
* POSSIBLY_ACTIVE
* NOT_YET_ACTIVE
* UNKNOWN

Examples:

* registered resale
* ATM
* PIPE
* warrants
* convertibles
* equity purchase agreement
* acquisition shares
* recent offering shares
* shelf capacity
* preferred conversion
* other issued/unrestricted shares

Do not convert a dollar shelf into shares unless actual pricing/terms support it.

A shelf registration is capacity, not proof that shares were issued.

An EFFECT filing may establish registration effectiveness but does not prove that holders are currently selling.

Registered resale eligibility does not prove active selling.

Never state an unidentified seller is dumping shares as fact.

# STRUCTURE CLASSIFICATION

Normalized classification:

* CLEAN
* CAUTION
* DIRTY_FLOAT
* UNKNOWN

`CLEAN` requires enough evidence to support the conclusion.

Never classify a ticker CLEAN merely because no warning was found.

Use `UNKNOWN` where data is materially incomplete.

Use `CAUTION` where identifiable latent or unresolved supply exists but the Dirty Float standard is not established.

Use `DIRTY_FLOAT` where the displayed float may materially understate practical selling supply or structural conditions create a material mismatch with apparent low-float scarcity.

Separate:

**known supply evidence**

from:

**live behavioral inference**

Do not infer absorption in this milestone.

Do not automatically change Dirty Float because cumulative volume is high.

# MOMENTUM CYCLE

For newly researched names, provide a provisional cycle assessment using BOTH:

* live/current Alpaca Demand State
* recent historical market data

Return:

* cycleClassification
* reasoning
* currentCycleHigh
* currentCycleHighConfidence
* historicalResistance
* formerRunnerStatus
* recentMajorRuns
* confidence
* evidence

Use existing product categories:

* GREEN_FRESH_FRONTSIDE
* YELLOW_FRONTSIDE_WARNING
* RED_BACKSIDE
* UNKNOWN

A new morning gap does NOT automatically make an old runner fresh again.

Major prior flushes, failed continuations and large retracement remain relevant.

# CURRENT CYCLE HIGH RULE

Preserve the semantic correction already implemented.

A:

* 52-week high
* old run high
* historical resistance

must NEVER silently become:

`currentCycleHigh`

Historical levels belong in:

`historicalResistance`

Current Cycle High should be populated only when the current cycle boundary/high is actually established.

Never reproduce the old FIEE bug where:

`$10.59 52-week proxy`

became Current Cycle High and generated a fake current-cycle flush percentage.

# LIVE MARKET CONTEXT PASSED TO RESEARCH

Include current Demand Engine facts in the evidence bundle:

* price
* reference RTH close
* percent change
* cumulative session volume
* Daily RVOL
* RVOL rank
* rank change
* session high
* session low
* bid
* ask
* spread
* security classification
* session
* qualification/latch state

Also provide recent Alpaca historical market context sufficient to identify:

* prior large runs
* recent cycle highs
* substantial retracement
* prior-session momentum

Do not dump huge raw bar arrays into the AI prompt.

Create deterministic summaries.

# FORMER RUNNER

Research and identify material former-runner characteristics.

Do not label every stock that previously moved 20% a "former runner."

Look for meaningful prior momentum behavior such as:

* major low-float expansion
* repeated halts
* extreme prior percentage run
* violent collapse
* recurring momentum cycle

Adjust historical prices for splits when required.

Keep historical market evidence separate from company catalyst evidence.

# SOURCE-GROUNDED AI REQUIREMENTS

The model must receive source IDs.

Every material conclusion must reference one or more source IDs.

Reject or downgrade analysis output containing unsupported material claims.

Do not allow:

`source: "SEC"`

without identifying the actual filing/source record.

Store:

* accession
* URL
* date
* form

where applicable.

# EVIDENCE FINGERPRINT / ANALYZE ONCE

Calculate an evidence fingerprint based on material source state.

If:

* SEC accession set unchanged
* catalyst source set unchanged
* structural facts unchanged
* relevant analysis inputs unchanged

do NOT call the model again merely because the dashboard refreshed.

Persist and reuse the existing dossier.

Reanalysis should be event-driven.

# REANALYSIS TRIGGERS

Requeue research when something material changes.

Examples:

* new relevant SEC filing
* new company release
* newly located fresh catalyst
* registration becomes effective
* new offering/prospectus
* material shares-outstanding change
* reverse split
* major financing disclosure

Do NOT rerun full structural analysis every minute because price changed.

Live-behavior reclassification will be a later subsystem.

# CATALYST REFRESH

For current Top-12 / active names, public catalyst discovery may need periodic refresh.

Default configurable interval:

`CATALYST_REFRESH_MINUTES=10`

Do not perform a full deep filing analysis each time.

Use a lightweight "has source evidence changed?" check first.

Only invoke interpretation again if new evidence exists.

# GOOGLE SHEET COEXISTENCE

Google Sheet research remains valuable as our human-reviewed laboratory.

Do NOT overwrite the Google Sheet.

Do NOT automatically push model analysis into Sheet cells.

Instead merge:

`Google Sheet dossier`

and:

`Automatic Research dossier`

in application state.

Explicitly preserve provenance:

* SHEET
* AUTO
* SHEET + AUTO
* CONFLICT

For an existing Sheet ticker:

If Sheet research exists and no newer material automatic evidence exists:

keep the Sheet classification as the current human-reviewed baseline.

If a new public filing/catalyst materially changes the evidence:

show:

`REASSESSMENT PENDING`

then allow current AUTO findings to be displayed with clear provenance.

Do not silently erase the original Sheet analysis.

If Sheet and automatic analysis materially disagree:

show:

`RESEARCH CONFLICT`

and preserve both interpretations for review.

# NEW TICKERS

For a ticker with no Sheet research:

Automatic Research becomes the dossier source.

This should resolve the current:

`NOT YET ANALYZED`

fields on new Discovery names.

The intended state progression is:

`NOT YET ANALYZED`

→ `ANALYSIS PENDING`

→ `COLLECTING SOURCES`

→ `ANALYZING`

→ actual:

* Cycle
* Catalyst
* Structure

# UI

Do not redesign the whole dashboard.

Modify the Discovery Board intelligently.

For new names, replace the three repetitive:

`NOT YET ANALYZED`

fields with accurate job state while research is underway.

When complete, render normal product classifications.

Add a subtle analysis-source indicator:

`AUTO`

`SHEET`

`AUTO + SHEET`

`CONFLICT`

Do not make this visually louder than the ticker/risk state.

# TICKER DRAWER — SOURCE EVIDENCE

For automatically researched names, add a source/evidence section.

Allow the user to see:

* SEC filings
* company release
* newswire
* analysis timestamp
* source freshness
* SEC accession
* URLs
* float confidence
* supply ledger

URLs must be clickable.

This is critical for trusting structural conclusions.

# OPTIONAL MANUAL RESEARCH ACTION

Add a small server-side action in the ticker drawer:

`REANALYZE`

or:

`REFRESH RESEARCH`

It should enqueue a job.

It must NOT call OpenAI directly from the browser.

Protect it with the existing local-only/auth approach.

Do not allow button spamming to create duplicate jobs.

# DESK EVENTS

Add deterministic research events such as:

* ANALYSIS_QUEUED
* ANALYSIS_COMPLETE
* ANALYSIS_FAILED
* NEW_SEC_FILING
* CATALYST_FOUND
* STRUCTURE_WARNING
* RESEARCH_CONFLICT

Only surface trader-material events prominently.

Do not flood Desk Events with internal fetch operations.

Examples:

`05:51:12 SLE ANALYSIS COMPLETE — fresh catalyst / structure caution`

`06:03:41 XYZ NEW SEC FILING — 424B5`

`06:04:17 XYZ STRUCTURE WARNING — new offering supply`

# RESEARCH HEALTH

Add a compact research-worker health state.

Possible values:

* OFFLINE
* IDLE
* WORKING
* DEGRADED
* ERROR

Show:

* queued job count
* current jobs
* last completed analysis
* SEC connectivity
* model availability

Do not expose keys.

# FAILURE BEHAVIOR

If SEC is unavailable:

* keep previous research
* mark source freshness degraded
* retry with backoff
* do not convert UNKNOWN into CLEAN

If model API is unavailable:

* continue source collection
* preserve existing dossiers
* mark interpretation unavailable
* do not fabricate

If web-search catalyst lookup fails:

* SEC/company-source conclusions can still be used
* mark catalyst search coverage incomplete

If a ticker has no SEC registrant match:

* do not fail the whole job
* record `NO SEC MATCH`
* continue with company/public catalyst research and market history
* keep structural confidence appropriately low

# COST CONTROL

This is a single-user prototype, but design efficiently.

Do not send every SEC filing in full to the model.

Deterministically extract the most relevant text first.

Use compact evidence bundles.

Cache filings and source results.

Use evidence fingerprints.

Do not analyze identical evidence repeatedly.

Log model-call metrics:

* ticker
* model
* duration
* input tokens when available
* output tokens when available
* estimated/actual call count

Do NOT log the prompt if it contains excessive filing content unless debug mode is explicitly enabled.

# AI MODEL CONFIGURATION

Do not couple business logic to a specific model string.

Use:

`OPENAI_RESEARCH_MODEL`

through an interpreter abstraction.

Design so another provider/model can replace OpenAI later without rewriting the research queue or dossier schema.

For example:

`ResearchInterpreter`

with:

`OpenAIResearchInterpreter`

and:

`NoopResearchInterpreter`

or equivalent.

# NO COMMERCIAL-SCRAPING ASSUMPTIONS

This local prototype may use public sources, but do NOT encode the assumption:

"publicly viewable = unrestricted commercial redistribution."

For each source adapter preserve:

* source owner
* URL
* access method
* content retained
* whether only derived facts are persisted

Do not build bulk scraping of:

* Yahoo Finance
* PR Newswire
* GlobeNewswire
* AccessWire

in this milestone.

Original releases can be discovered and referenced.

Do not copy entire copyrighted articles/releases into the product database.

Store source metadata and limited evidence needed for analysis.

We will separately evaluate commercial data rights before product launch.

# CURRENT MORNING LIVE ACCEPTANCE TEST

The user is currently running the system premarket and has live Discovery names that include names without Sheet research.

Use CURRENT live data if still available when implementing/testing.

At minimum validate automatic research on several newly discovered names, preferably including examples such as:

* SLE
* CRGO
* IVF
* MYSZ
* GRNQ
* KMDA

Do not hardcode these tickers.

They are acceptance-test examples only.

For each tested name, report:

* time discovered
* time queued
* source collection start
* SEC match
* SEC filings found
* catalyst sources found
* time interpretation started
* time analysis completed
* total latency
* resulting catalyst classification
* resulting structure classification
* resulting cycle classification
* confidence

For a name such as GRNQ with extreme spread/low absolute volume, verify:

* it is still researched
* its market-quality weakness does not disappear
* abnormal RVOL is NOT mislabeled as trade quality

# TESTS

Add substantial automated tests.

At minimum:

1. new Top-12 unknown ticker queues automatically
2. existing adequate dossier does not duplicate job
3. queue priority favors stronger participation without dropping lower-priority Top-12 name
4. ticker leaving Top 12 does not destroy active job
5. ticker/CIK mapping
6. SEC CIK mismatch handling
7. SEC user-agent required
8. SEC rate limiter
9. 429/403 backoff
10. submission parsing
11. accession dedupe
12. relevant form selection
13. filing text cache
14. companyfacts missing-data handling
15. shares outstanding never treated as float
16. market cap never treated as float
17. unknown float remains unknown
18. dollar shelf never blindly converted to shares
19. EFFECT does not imply active selling
20. registered resale does not imply active selling
21. supply-ledger statuses
22. structured AI-output validation
23. unsupported claim rejection/downgrade
24. source IDs required for material conclusions
25. evidence fingerprint prevents duplicate AI analysis
26. new relevant filing triggers reanalysis
27. unchanged filings do not trigger reanalysis
28. catalyst freshness logic
29. NO FRESH CATALYST FOUND exact output
30. old runner does not automatically become fresh because of new gap
31. 52-week historical high cannot become currentCycleHigh
32. existing FIEE historical-resistance regression still passes
33. Google Sheet data cannot be overwritten by AUTO analysis
34. SHEET/AUTO conflict preserved
35. missing OpenAI key still permits source collection
36. model error leaves prior dossier intact
37. manual reanalysis action dedupes
38. research status transitions
39. job restart/recovery
40. research credentials absent from client bundle

# OBSERVABILITY

Use concise logs such as:

`[research] SLE queued priority=... rank=4`

`[sec] SLE → CIK 000...`

`[research] SLE sources collected: 8 SEC / 2 catalyst`

`[ai] SLE analysis started`

`[research] SLE complete in 38.4s — catalyst=STRONG structure=CAUTION cycle=GREEN`

Do not print full filing contents.

Do not print secrets.

# DIAGNOSTICS

Add:

`npm run research:diagnose`

It should report without exposing credentials:

```text
SQLite: OK
Demand state: OK
SEC_USER_AGENT: configured
SEC ticker map: OK
SEC submissions API: OK
OpenAI key: present / absent
OpenAI model: configured
Web research: OK / unavailable
Queue: OK
```

If OpenAI key is absent, that is not an SEC collector failure.

# README / ARCHITECTURE

Update documentation to reflect:

```text
Alpaca SIP
   ↓
Demand Engine
   ↓
Research Queue ─── SEC / Public Sources
   ↓
Evidence Store
   ↓
AI Interpretation
   ↓
Ticker Dossier
   ↓
State Merge ← Google Sheet Research
   ↓
Dashboard
```

Document:

* SEC environment setup
* OpenAI environment setup
* no-AI fallback mode
* queue behavior
* research freshness
* evidence provenance
* Sheet vs AUTO precedence
* source-rights caveat
* how to run research worker
* how automatic Top-12 analysis works

# DO NOT IMPLEMENT YET

Do NOT automate:

* Overhang Absorption conclusions
* Effective Float Turnover
* Dirty Float → Clean transition
* live Chop Risk model
* live Flush Risk model
* individualized buy/sell advice
* order execution
* broker integration
* billing
* customer accounts

Do not turn the AI output into a buy signal.

# SECURITY AUDIT

Before committing verify none of the following are tracked or included in the client bundle:

* `.env.local`
* APCA key/secret
* OpenAI key
* Google private key
* service-account JSON
* SEC contact email if user does not intend it public
* SQLite database
* cached filing contents
* local research logs containing sensitive configuration

# VALIDATION

Run all tests.

Run:

`npm run lint`

Run:

`npm run build`

Run:

`npm run research:diagnose`

Then test with:

1. Alpaca live Demand Engine
2. Google Sheet existing research
3. Automatic public research simultaneously

Verify:

* new Discovery name appears
* immediately becomes ANALYSIS PENDING
* research worker picks it up
* SEC/public evidence is collected
* dossier completes
* Discovery Board changes without Sheet modification
* ticker drawer shows evidence
* Sheet names remain intact
* no market-data calculations change

# DEFINITION OF DONE

Do not stop at scaffolding.

Milestone is complete when:

1. research worker runs continuously
2. new Top-12 names auto-queue
3. job states are visible
4. SEC ticker/CIK resolution works
5. SEC filing collection works
6. SEC rate limiting/compliance works
7. filing cache/dedupe works
8. supply ledger exists
9. catalyst discovery works
10. optional OpenAI interpreter works
11. structured output is enforced
12. every material conclusion has source provenance
13. automatic catalyst classification works
14. automatic structure classification works
15. provisional cycle classification works
16. new tickers no longer remain NOT YET ANALYZED indefinitely
17. results persist
18. evidence changes trigger reanalysis
19. unchanged evidence does not
20. Google Sheet remains unmodified
21. Sheet/AUTO provenance is visible
22. research conflict handling works
23. research worker health is visible
24. diagnostic command works
25. current live unknown Discovery names have been tested
26. tests pass
27. lint passes
28. production build passes
29. secrets/cache/database are not committed
30. changes are committed and pushed to main

When finished, give me:

* commit hash
* architecture implemented
* new tables
* new commands
* public sources actually used
* SEC request policy implemented
* OpenAI model/provider used, if configured
* number of live tickers analyzed
* initial analysis latency by ticker
* source counts by ticker
* catalyst classifications
* structure classifications
* cycle classifications
* any names with inadequate evidence
* any Sheet/AUTO conflicts
* total model calls
* token usage if available
* tests/lint/build status
* any implementation decisions that materially differed from this specification and why

Do not make new product-strategy decisions beyond this specification. If a public source cannot support a requested field, return UNKNOWN/PARTIAL with provenance rather than inventing the answer.
