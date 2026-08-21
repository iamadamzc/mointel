Continue development of:

`A:\mointel`

Repository:

`https://github.com/iamadamzc/mointel`

Current Phase 3 checkpoint:

`59bfa1d`

Phase 1 built the persistent research repository and versioned dossier architecture.

Phase 2 built the SEC/EDGAR structural evidence collector.

Phase 3 built the public catalyst evidence collector, canonical source clustering, low-cost Luna source discovery, and evidence-change detection.

Phase 4 must now turn those collected sources plus deterministic Alpaca market context into the product's actual intelligence fields.

This phase is the **interpretation layer**.

Do not redesign the Demand Engine.

Do not modify the Daily RVOL methodology.

Do not change the SEC or catalyst collector architecture unless required to fix a correctness issue discovered during interpretation testing.

Do not add new public-source crawling.

Do not let the interpretation model independently bypass the Phase 2/3 evidence store.

First inspect the complete existing implementation and preserve all passing behavior.

# OBJECTIVE

Build the first production-shaped **Automatic Intelligence Interpreter**.

The desired flow is:

```text
Alpaca Demand Engine
        +
SEC Structural Evidence
        +
Canonical Catalyst Evidence
        +
Historical Market Context
        ↓
Compact Evidence Bundle
        ↓
GPT-5.6 Terra
        ↓
Strict Structured Dossier
        ↓
Deterministic Validation / Guardrails
        ↓
Versioned Research Dossier
        ↓
SHEET / AUTO Merge
        ↓
Dashboard
```

New Discovery names should stop at:

`ANALYSIS PENDING`

only while collection/interpretation is actually underway.

They should ultimately display real:

* Catalyst
* Structure
* Momentum Cycle

with evidence provenance.

# CORE PRODUCT QUESTIONS

For each relevant ticker, Phase 4 should answer:

1. **Why is it moving?**
2. **Is there a fresh catalyst?**
3. **What kind of catalyst is it?**
4. **What supply may realistically interact with the move?**
5. **Is the displayed float trustworthy?**
6. **Is the structure CLEAN, CAUTION, DIRTY FLOAT, or UNKNOWN?**
7. **Where is the stock in its momentum cycle?**
8. **What are the principal structural warnings?**
9. **What material evidence supports each conclusion?**
10. **What remains unknown or unresolved?**

Do not generate buy/sell instructions.

Do not generate personalized trading advice.

# MODEL ARCHITECTURE

Use the existing `ResearchInterpreter` abstraction or create a compatible model-agnostic abstraction if not yet present.

Default full interpreter:

`OPENAI_RESEARCH_MODEL=gpt-5.6-terra`

Optional escalation:

`OPENAI_ESCALATION_MODEL=gpt-5.6-sol`

Low-cost source change detection remains:

`OPENAI_CHANGE_DETECT_MODEL=gpt-5.6-luna`

Phase 4 normal interpretation uses **Terra**.

Luna does not produce final dossiers.

Sol is used only through explicit escalation criteria described later.

Do not hardcode model strings in business logic.

# NO WEB SEARCH IN NORMAL INTERPRETATION

Normal Terra interpretation must NOT invoke web search.

Phase 3 owns source discovery.

Terra receives only evidence already persisted in our evidence store plus deterministic market summaries.

If evidence is incomplete:

return UNKNOWN / PARTIAL / low confidence.

Do not allow Terra to bypass our evidence pipeline and search for its own unsupported facts.

This separation is mandatory for:

* provenance
* caching
* cost control
* repeatability
* backtesting
* determining whether an error came from collection or interpretation

# EVIDENCE BUNDLE

Build a compact deterministic `ResearchEvidenceBundle`.

Do not send raw filing dumps.

Do not send thousands of minute bars.

The bundle should contain enough evidence to reason accurately while remaining token-efficient.

At minimum:

## Identity

* ticker
* issuer/company
* CIK
* domestic/foreign status
* exchange/security classification
* evidence confidence

## Current Demand State

* current price
* reference RTH close
* percent change
* cumulative trading-day volume
* Daily RVOL
* RVOL rank
* prior RVOL rank / rank change if available
* session high
* session low
* bid
* ask
* spread / spread %
* halt state
* LULD bands where available
* session phase
* discovery qualification time
* qualified price
* latch state

## Historical Market Context

Create deterministic summaries, not raw arrays.

Include enough context for:

* recent major run(s)
* recent peak
* meaningful retracement
* prior-day/session momentum
* known former-runner characteristics
* reverse-split-adjusted historical prices where necessary
* historical resistance

Do not silently label a historical high as current-cycle high.

## Catalyst Evidence

Include:

* canonical source clusters
* source IDs
* authority level
* source type
* publication timestamp + precision
* canonical title
* compact relevant excerpt
* SEC exhibit relationships
* known duplicate/syndicated copies
* coverage status
* latest source timestamp
* source-discovery confidence

## Structural Evidence

Include:

* relevant SEC forms
* source IDs/accessions
* filing dates/effective dates
* targeted structural evidence windows
* shares outstanding facts with dates
* registration statements
* prospectuses
* EFFECT / RW
* offerings
* ATM
* PIPE
* warrants
* convertibles
* equity purchase agreements
* preferred conversion
* registered resale
* recent issuance
* acquisition consideration shares
* reverse splits
* holder restrictions
* Form 144 / ownership evidence where material
* evidence coverage manifest

## Existing Sheet Intelligence

When available include existing human-reviewed Sheet fields as a separate evidence section.

Do NOT present Sheet conclusions to Terra as unquestioned facts.

Label them explicitly:

`HUMAN_REVIEWED_PRIOR_ANALYSIS`

Include:

* Sheet catalyst
* Sheet catalyst grade
* Sheet structure
* Sheet cycle
* Sheet warnings
* Sheet float quality
* Sheet analyst notes

This allows comparison without creating circular evidence.

# STRICT STRUCTURED OUTPUT

Use OpenAI Structured Outputs / strict JSON schema.

Do not parse prose.

Version the schema explicitly.

Example concept:

`AUTOMATIC_DOSSIER_SCHEMA_VERSION=1`

The output should include all fields below.

# CATALYST OUTPUT

Return:

* catalystStatus
* catalystType
* catalystGrade
* catalystSummary
* eventTimestamp
* freshness
* whyTradersMayCare
* plausiblyExplainsMove
* catalystConfidence
* catalystEvidenceSourceIds
* catalystUnknowns

## Catalyst Status

Allowed:

* FRESH_FOUND
* SECONDARY_STALE
* NONE_FOUND
* CONFLICTING
* UNKNOWN

## Catalyst Type

Allowed:

* NEWS_DRIVEN
* FLOW_DOMINANT
* SECONDARY_STALE
* NONE_IDENTIFIED
* UNKNOWN

Important:

Do NOT classify FLOW_DOMINANT simply because no fresh news was located.

FLOW_DOMINANT requires:

* no sufficient fresh company catalyst located
* AND strong objective live demand evidence

If source coverage is incomplete, prefer UNKNOWN over confident FLOW_DOMINANT.

## Catalyst Grade

Allowed normalized values:

* STRONG
* LEGITIMATE_POSITIVE
* MODERATE_MIXED_SECONDARY
* WEAK_NEGATIVE_DILUTIVE
* NONE
* UNKNOWN

Map in UI to existing product language:

🔥 STRONG

🟢 LEGITIMATE POSITIVE

🟡 MODERATE / MIXED / SECONDARY

🔴 WEAK / NEGATIVE / DILUTIVE

— NONE

## Exact no-catalyst language

If and only if:

* adequate coverage was achieved
* no sufficiently fresh catalyst was located
* evidence supports that conclusion

the human-readable catalyst summary should state exactly:

`NO FRESH CATALYST FOUND`

Do not use this conclusion where coverage is incomplete.

# STRUCTURAL OUTPUT

Return:

* sharesOutstanding
* sharesOutstandingDate
* displayedFloat
* displayedFloatDate
* floatConfidence
* structureClassification
* structuralSummary
* supplyLedger
* structuralWarnings
* reverseSplitHistory
* registrationStatus
* structuralConfidence
* structuralEvidenceSourceIds
* structuralUnknowns

# STRUCTURE CLASSIFICATION

Allowed:

* CLEAN
* CAUTION
* DIRTY_FLOAT
* UNKNOWN

Use existing product meanings.

## CLEAN

Requires affirmative evidence that the available structure has been reasonably reconciled and no material identified overhang or float-quality issue exists.

Absence of a detected warning is NOT enough for CLEAN.

## CAUTION

Use where:

* latent financing exists
* registration/resale potential exists
* warrants/convertibles are material but activity/eligibility is uncertain
* float data is unresolved
* significant structural concerns exist without enough evidence for DIRTY_FLOAT

## DIRTY_FLOAT

Use where displayed float may materially understate practical selling supply or the structural setup creates a meaningful discrepancy between apparent scarcity and available/potentially available selling supply.

DIRTY_FLOAT must be evidence-based.

Potential evidence can include:

* registered resale supply materially large relative to displayed float
* significant recently issued/unrestricted shares
* warrant/convertible supply
* financing/equity line
* post-split issuance distortion
* other structural supply inconsistent with apparent low float

Do not claim seller behavior as fact without evidence.

## UNKNOWN

Use where key structure cannot be reconciled.

Unknown is preferable to false precision.

# SUPPLY LEDGER

Return structured blocks.

Each block:

* type
* sourceId
* sourceAccession if SEC
* shareAmount if actually known
* dollarCapacity if only dollars are known
* registrationStatus
* effectiveDate
* exercisePrice / conversionTerms if known
* restrictions
* holder/context
* eligibilityClassification
* confidence
* evidenceSummary

Allowed eligibility classifications:

* KNOWN_ACTIVE
* POSSIBLY_ACTIVE
* NOT_YET_ACTIVE
* UNKNOWN

The interpreter must not infer a share count from a dollar shelf unless actual issuance/pricing terms permit it.

# DETERMINISTIC STRUCTURAL GUARDRAILS

After Terra returns output, validate it in software.

Do not rely on prompt compliance alone.

Enforce:

### Shares outstanding is NOT float

If source only supports shares outstanding:

displayedFloat must remain null/unknown.

### Market cap is NOT float

Reject any model output using market cap as float.

### Dollar shelf is NOT share count

A `$30M shelf` cannot become `X shares` without pricing/terms supporting conversion.

### EFFECT is NOT active selling

Registration effectiveness is not proof that securities are currently being sold.

### Registered resale is NOT confirmed seller activity

Legal ability to sell ≠ confirmed selling.

### Warrants are not automatically active supply

Consider exercise terms, registration and eligibility.

### Historical resistance is NOT currentCycleHigh

Never allow a 52-week high or old run high to populate currentCycleHigh merely because it is the highest known number.

### No warning found ≠ CLEAN

If evidence coverage is incomplete, CLEAN must be rejected/downgraded.

### UNKNOWN ≠ zero

No null structural value may become zero.

### Volume cannot prove absorption

High turnover alone may not change DIRTY_FLOAT to CLEAN.

Phase 4 must not infer overhang absorption.

If output violates guardrails:

attempt one constrained Terra repair using explicit validation errors.

If still invalid:

reject the dossier or escalate according to rules below.

# MOMENTUM CYCLE OUTPUT

Return:

* cycleClassification
* cycleSummary
* currentCycleHigh
* currentCycleHighConfidence
* currentGivebackPct
* historicalResistance
* formerRunnerStatus
* recentMajorRuns
* cycleWarnings
* cycleConfidence
* cycleEvidenceSourceIds
* cycleUnknowns

Allowed classification:

* GREEN_FRESH_FRONTSIDE
* YELLOW_FRONTSIDE_WARNING
* RED_BACKSIDE
* UNKNOWN

## GREEN — FRESH / FRONTSIDE

Early/current move remains structurally intact without a major momentum failure.

## YELLOW — FRONTSIDE WITH WARNING

Still frontside but meaningful concern exists such as:

* extension
* prior flush
* Dirty Float
* dilution
* former-runner status
* reverse split
* unusual spread
* overhead resistance
* failed continuation

## RED — BACKSIDE

Use where a substantial momentum failure is already observed:

* major flush
* lower highs
* failed continuation
* heavy retracement
* repeated failure
* material loss of prior momentum structure

A new gap does not automatically reset an old momentum cycle to GREEN.

# CURRENT CYCLE HIGH

Preserve the semantic fix from the FIEE issue.

`currentCycleHigh` must represent the high of the current defined momentum cycle.

It must NOT come from:

* 52-week high
* historical resistance
* old run high

unless that historical event is genuinely part of the currently defined cycle.

If no trustworthy current-cycle boundary exists:

currentCycleHigh = null

and currentGivebackPct = null.

It is acceptable for:

`SESSION HIGH`

to exist separately while:

`CURRENT CYCLE HIGH`

remains unknown.

# FORMER RUNNER

Return:

* NONE
* FORMER_RUNNER
* FORMER_SUPERRUNNER
* UNKNOWN

Material former-runner context should include evidence such as:

* extreme prior momentum expansion
* repeated halts
* major squeeze
* large prior collapse
* repeated recycled momentum cycles

Do not label every historically volatile stock a former superrunner.

# AI SOURCE-GROUNDING RULE

Every material conclusion must cite evidence source IDs.

Examples requiring source IDs:

* fresh earnings catalyst
* shelf registration
* registered resale
* warrant balance
* convertible balance
* reverse split
* offering
* PIPE
* shares outstanding
* acquisition shares
* merger
* clinical result
* contract announcement

Reject unsupported claims.

A model conclusion such as:

`ATM available`

with no source ID must not be accepted.

# CLAIM VALIDATOR

Create deterministic claim validation.

At minimum check:

* cited source ID exists
* source belongs to the ticker
* source content/evidence reasonably contains terms/concepts supporting the claim
* dates do not contradict the model output
* numeric amounts are not invented or materially transformed without basis

Do not attempt full natural-language theorem proving.

But perform enough verification to catch obvious unsupported claims.

If material claim support is weak:

* lower confidence
* remove claim
* repair
* escalate

rather than accepting it.

# CONFIDENCE

Use explicit confidence levels, e.g.:

* HIGH
* MEDIUM
* LOW

or an equivalent existing normalized structure.

Confidence must reflect:

* evidence completeness
* source authority
* conflicting evidence
* age of evidence
* interpretation uncertainty

Do not let model confidence override deterministic coverage status.

# SOL ESCALATION

Use `OPENAI_ESCALATION_MODEL` only when needed.

Possible escalation conditions:

1. Terra fails structured validation after one repair attempt.
2. Material SHEET / AUTO conflict remains unresolved.
3. Structural evidence contains multiple competing financing/registration instruments whose interaction is genuinely ambiguous.
4. High-value ticker has LOW-confidence structure because evidence conflicts rather than merely being absent.
5. Numerical share/supply reconciliation is internally inconsistent.

Do NOT escalate simply because:

* ticker is rank #1
* RVOL is high
* price move is large

Cost/intelligence tier should respond to complexity, not excitement.

Persist:

* whether escalation occurred
* escalation reason
* model used

# SHEET VS AUTO MERGE

Do not overwrite Google Sheet research.

Google Sheet remains human-reviewed historical/current research.

Automatic analysis is separate.

Create explicit merge/provenance states:

* SHEET
* AUTO
* SHEET_AUTO_AGREE
* CONFLICT
* AUTO_NEWER
* SHEET_NEWER

or equivalent.

For a ticker with no Sheet research:

AUTO is authoritative for the application, subject to confidence.

For a ticker with Sheet research:

compare:

* catalyst
* structure
* cycle

Do not force agreement.

# CONFLICT CLASSIFICATION

When Sheet and AUTO disagree materially, categorize the reason where possible:

* SOURCE_DIFFERENCE
* TIMING_DIFFERENCE
* INTERPRETATION_DIFFERENCE
* SHEET_STALE
* AUTO_INCOMPLETE
* POTENTIAL_SHEET_ERROR
* UNKNOWN

Do not automatically assume AUTO is correct.

Display both underlying conclusions in the drawer.

# AUTOMATIC QUALITY COMPARISON

For all tickers where Sheet and AUTO both exist, persist an evaluation record or comparable structured data containing:

### Catalyst comparison

* Sheet
* AUTO
* agreement
* reason

### Structure comparison

* Sheet
* AUTO
* agreement
* reason

### Cycle comparison

* Sheet
* AUTO
* agreement
* reason

This becomes an early validation dataset for the automatic system.

# VERSIONING

Every accepted automatic dossier must append a new `research_analysis_versions` record.

Do not overwrite old analysis.

Persist:

* schema version
* evidence fingerprint
* evidence source IDs
* Terra model
* Sol model if escalated
* generated timestamp
* prompt/version identifier
* validation result
* repair count
* escalation reason
* token usage
* latency

Update `research_dossiers` only as the pointer to current accepted version.

# EVIDENCE FINGERPRINT

Do not reinterpret identical evidence.

If the Phase 2/3 material evidence fingerprint has not changed:

* do not invoke Terra
* reuse the existing dossier

Market price movement alone should NOT normally re-run full structural/catalyst interpretation.

A separate future live-behavior engine will handle dynamic Chop/Flush/Live Confirmation.

Cycle may eventually need event-driven reevaluation, but do not create high-frequency full-dossier calls in Phase 4.

# TIME TO INTELLIGENCE

Instrument the full research pipeline.

For every new automatically researched ticker capture:

* first Top-12 entry
* research queued
* source collection started
* SEC sources ready
* catalyst sources ready
* interpretation started
* dossier accepted
* dashboard-visible timestamp

Calculate:

`Top-12 entry → dossier available`

and its subcomponents.

Persist/report this.

This is a key product metric.

# JOB STATES

Extend/use the current job lifecycle.

Trader-facing progression should approximately be:

* ANALYSIS PENDING
* COLLECTING SOURCES
* ANALYZING
* INTELLIGENCE AVAILABLE
* PARTIAL INTELLIGENCE
* RESEARCH CONFLICT
* ANALYSIS FAILED

Avoid exposing excessive internal implementation states.

# DASHBOARD INTEGRATION

Do not redesign the full UI.

The Discovery Board should now populate automatic intelligence.

For a newly discovered ticker:

Before:

`Cycle: NOT YET ANALYZED`

`Catalyst: NOT YET ANALYZED`

`Structure: NOT YET ANALYZED`

During research:

show compact unified status:

`ANALYSIS PENDING`

or:

`ANALYZING`

Once complete:

show normal fields.

Examples:

Cycle:

`GREEN — FRESH / FRONTSIDE`

Catalyst:

`🔥 STRONG`

Structure:

`CAUTION`

or:

`DIRTY FLOAT`

Add a subtle source indicator:

`AUTO`

`SHEET`

`SHEET + AUTO`

`CONFLICT`

Do not make AUTO visually louder than the actual intelligence.

# DISCOVERY BOARD PRIORITY

Do not let interpretation completion change RVOL rank.

Demand ranking remains deterministic.

Research enriches names; it does not redefine RVOL.

# TICKER DRAWER

For AUTO dossiers show:

## WHY IT IS MOVING

* catalyst summary
* catalyst grade
* event time
* freshness
* why traders may care
* source links

## STRUCTURAL INTELLIGENCE

* structure classification
* float
* float confidence
* shares outstanding
* supply ledger
* warnings
* reverse split
* registrations
* financing
* evidence links

## MOMENTUM CYCLE

* cycle
* reasoning
* current cycle high
* current giveback
* historical resistance
* former runner
* recent major runs

## EVIDENCE / PROVENANCE

Show:

* analysis source
* generated time
* model
* confidence
* SEC accession/source links
* company/newswire links
* analysis version

Do not show raw chain-of-thought.

# NO CHOP / FLUSH AUTOMATION YET

Do not implement:

* automatic Chop Risk
* automatic Flush Risk
* Live Confirmation
* Dirty Float absorption/cleaning
* Effective Float Turnover

Those are future phases.

We need to validate static/semi-static dossier quality first.

# LIVE ACCEPTANCE TEST

Use actual current Discovery names if available.

Prior live candidates included names such as:

* SLE
* CRGO
* IVF
* MYSZ
* GRNQ
* KMDA

Do not hardcode them.

Analyze whichever current names are actually relevant.

For each live automatically analyzed ticker report:

* RVOL rank at discovery
* percent change
* absolute volume
* queue time
* sources-ready time
* interpretation-start time
* dossier-ready time
* total time to intelligence
* Terra call count
* Sol escalation count/reason
* catalyst result
* structure result
* cycle result
* confidence
* evidence source count
* unsupported claims rejected/repaired
* Sheet comparison if available

# EXISTING SHEET COMPARISON SET

Also run AUTO against all current Sheet tickers where adequate source evidence exists.

At minimum compare several known names, preferably including:

* FIEE
* NWTG
* XPON
* WETO
* IPST
* TRUG

if they are still present and evidence collection supports them.

Do not hardcode their expected answers.

Report agreement/disagreement.

For FIEE specifically confirm the existing regression:

* `$10.59` remains historical resistance
* it never becomes currentCycleHigh
* the old `41.3%` historical-distance field never becomes current-cycle giveback

# IMPORTANT STRUCTURAL TEST CASES

The Phase 2 live evidence already surfaced meaningful registrations/prospectuses for:

* SLE
* IVF
* IPST
* CRGO
* CANF
* MNDR

Use these or equivalent live cases to test whether Terra correctly distinguishes:

* registration capacity
* effective registration
* actual issued shares
* possible resale
* active supply
* unknown status

Do not tell Terra the expected classification.

Evaluate what it returns against source evidence.

# COST CONTROL

Log:

* input tokens
* output tokens
* cached input if reported
* model
* duration
* estimated API cost where practical

Do not call Terra for unchanged evidence.

Do not call Sol unnecessarily.

Use compact evidence bundles.

Measure average cost per initial ticker dossier.

Report it.

# MODEL PROMPT VERSIONING

Create a version identifier, for example:

`INTERPRETER_PROMPT_VERSION=1`

Persist it with analysis versions.

Do not silently change interpretation prompt behavior without versioning.

# REPAIR PATH

If Terra returns invalid output:

1. deterministic validator produces explicit validation errors
2. one Terra repair request gets:

   * original structured output
   * exact validation errors
   * same evidence bundle
3. revalidate
4. if still materially invalid:

   * escalate to Sol if escalation criteria apply
   * otherwise mark PARTIAL/FAILED

Do not loop indefinitely.

# TESTS

Add substantial automated tests.

At minimum:

1. compact evidence-bundle generation
2. raw full filing is not sent
3. Terra cannot invoke web search
4. unchanged fingerprint = zero Terra calls
5. structured schema enforcement
6. source ID exists
7. wrong-ticker source ID rejected
8. unsupported material claim rejected
9. shares outstanding cannot become float
10. market cap cannot become float
11. dollar shelf cannot become share count
12. EFFECT cannot become confirmed selling
13. registered resale cannot become confirmed active selling
14. warrants require eligibility/context
15. unknown structure cannot become CLEAN solely from missing warnings
16. incomplete coverage rejects CLEAN where appropriate
17. 52-week high cannot populate currentCycleHigh
18. FIEE regression
19. unknown currentCycleHigh means unknown currentGiveback
20. high turnover cannot imply absorption
21. catalyst NONE requires adequate coverage
22. incomplete coverage cannot produce confident NO FRESH CATALYST FOUND
23. FLOW_DOMINANT requires live-demand evidence
24. Catalyst source IDs mandatory
25. Structural source IDs mandatory
26. supply ledger source IDs mandatory
27. Terra invalid output repair
28. one repair max
29. Sol escalation criteria
30. high RVOL alone does not trigger Sol
31. analysis version append-only behavior
32. supersedes chain
33. Sheet remains unmodified
34. AUTO new ticker populates dashboard
35. Sheet/AUTO agreement state
36. Sheet/AUTO conflict state
37. conflict reason persistence
38. stale Sheet handling
39. time-to-intelligence timestamps
40. token/cost metrics persisted
41. partial dossier display
42. model failure preserves prior accepted dossier
43. research worker restart safely resumes jobs
44. no secrets in client bundle

# OBSERVABILITY

Use concise logs.

Examples:

`[interpret] SLE Terra started evidence=18 sources`

`[interpret] SLE validation failed: EFFECT cannot imply active selling`

`[interpret] SLE Terra repair succeeded`

`[interpret] XYZ escalated → Sol reason=STRUCTURAL_CONFLICT`

`[research] SLE dossier accepted catalyst=STRONG structure=CAUTION cycle=GREEN confidence=MEDIUM 18.7s`

Do not print full evidence bundles by default.

Do not print secrets.

# RESEARCH HEALTH

Extend research health to include:

* interpreter availability
* Terra model
* Sol escalation availability
* queued
* collecting
* analyzing
* complete
* conflicts
* failures
* average recent analysis latency
* last successful dossier

# DIAGNOSTICS

Extend:

`npm run research:diagnose`

to verify:

* SEC collector
* catalyst collector
* Terra interpreter
* strict schema
* validator
* SQLite analysis versioning
* Sheet/AUTO merge
* dashboard dossier availability

No sensitive values printed.

# SECURITY

Verify:

* OpenAI keys are server/worker only
* no prompts/evidence containing credentials
* no `.env.local`
* no database
* no cached filings
* no model keys
* no Google/Alpaca credentials

are committed.

# VALIDATION

Run:

* full tests
* lint
* typecheck
* production build if the current workflow supports/uses it

Run live interpretation against current Discovery names.

Run AUTO comparison against existing Sheet names.

Manually inspect several ticker drawers.

Specifically inspect at least:

1. fresh catalyst + relatively simple structure
2. no recent source / incomplete coverage
3. significant registration/prospectus evidence
4. foreign issuer
5. Dirty Float candidate
6. Sheet/AUTO overlap
7. Sheet/AUTO conflict if one exists

# PHASE 4 DEFINITION OF DONE

Phase 4 is complete when:

1. Terra interpreter exists
2. evidence bundle is compact and source-grounded
3. no normal interpretation web search occurs
4. strict structured output works
5. deterministic validator works
6. repair path works
7. Sol escalation works only where appropriate
8. catalyst classification works
9. structure classification works
10. supply ledger is populated
11. provisional momentum cycle works
12. former-runner output works
13. currentCycleHigh semantics remain correct
14. every material conclusion has source IDs
15. unsupported claims are rejected/repaired
16. automatic dossiers are versioned
17. unchanged evidence does not re-run analysis
18. Sheet/AUTO merge works
19. conflicts are visible
20. new Discovery names populate Cycle/Catalyst/Structure automatically
21. evidence/source links appear in ticker drawer
22. time-to-intelligence is measured
23. token/cost usage is measured
24. prior accepted dossier survives failures
25. no Google Sheet write occurs
26. tests pass
27. lint passes
28. typecheck passes
29. build passes
30. no secrets/data artifacts committed

# STOP BEFORE COMMIT

Do NOT commit Phase 4 automatically.

When complete, stop before commit and give me a full report containing:

## Architecture

* interpreter components
* validator components
* merge components
* dashboard integration

## Live Analysis Results

For every live ticker analyzed:

* rank
* time to intelligence
* source count
* Terra calls
* repair calls
* Sol escalation
* catalyst
* structure
* cycle
* confidence

## Sheet vs AUTO

For overlapping names:

* Sheet catalyst
* AUTO catalyst
* catalyst agreement/conflict
* Sheet structure
* AUTO structure
* structure agreement/conflict
* Sheet cycle
* AUTO cycle
* cycle agreement/conflict
* classified reason for differences

## Structural Accuracy Review

Report any cases where the validator caught:

* false float
* unsupported seller claim
* dollar shelf conversion
* EFFECT overstatement
* historical high/current cycle confusion
* unsupported supply amount

## Cost

* total Terra calls
* total Sol calls
* total input/output tokens
* average initial dossier cost
* average latency

## Reliability

* tests
* lint
* typecheck
* build
* failed analyses
* partial analyses
* unresolved evidence problems

## Deviations

Explain any material implementation decision that differed from this specification and why.

Do not begin Chop Risk, Flush Risk, Live Confirmation, Overhang Absorption, or any next phase until this interpretation layer has been reviewed.
