Act as a senior product-design firm conducting a professional UI/UX audit of the current Momentum Intelligence Live Desk.

This is not a generic website review. Evaluate it as a specialized, real-time decision-support product for active U.S. small-cap momentum traders and scalpers. The interface must help a trader understand, within seconds:

* What requires attention now?
* Why is the stock moving?
* Is the catalyst legitimate and fresh?
* How clean or dangerous is the share structure?
* What hidden or practical selling supply may exist?
* Where is the stock in its momentum cycle?
* What has materially changed since the previous assessment?
* Which warning matters enough to affect how the trader treats the stock?

The product is not intended to replace charts, Level 2, scanners, order entry or a broker. Its advantage is derived structural intelligence: catalyst interpretation, Dirty Float, Chop Risk, Flush Risk, momentum cycle, live structural confirmation and concise explanations of meaningful changes.

## Assignment

Conduct a complete, evidence-based assessment of the current page as it actually exists.

First inspect the live interface without allowing the source code to shape your initial impression. Use the application at realistic desktop dimensions and capture screenshots of the full page and important states. Interact with filters, tables, cards, drawers, tooltips, sorting, navigation and any other available controls. Then inspect the relevant source code to understand behavior, component structure, data states and implementation constraints.

Do not modify the application during this phase. The goal is to produce a professional design assessment and a specific redesign brief that can be handed to the product and engineering team.

Do not assume that an existing element belongs on the page simply because it has already been built. Identify information and controls that should be retained, revised, combined, moved, progressively disclosed or removed.

## Users and operating conditions

Evaluate the product primarily for an active momentum trader using multiple screens before and during the U.S. trading session. The user may glance at this page for only a few seconds while simultaneously watching scanners, charts, Level 2 and Time & Sales.

Consider these operating states:

* Early premarket, including sparse or incomplete data
* Active premarket around 6:00–9:25 AM ET
* The final pre-open assessment
* Regular-hours momentum
* After-hours discovery and next-day preparation
* A quiet market with few qualifying stocks
* A highly active market with many rapidly changing stocks
* A ticker that has not yet been researched
* Research in progress, partial results, stale results and failed research
* A material catalyst or structural classification changing while the page is open
* A ticker returning after a prior momentum run

The page must remain useful in every state and must clearly distinguish unavailable, pending, stale, partial and genuinely negative findings.

## Evaluation framework

Assess the interface across the following dimensions:

**Product usefulness:** Determine whether every visible element helps the trader make sense of the live momentum universe. Flag content that is technically valid but not useful at the moment or location where it appears.

**Information architecture:** Evaluate whether the page is organized around the trader’s workflow rather than the underlying data model. Determine what belongs in the persistent market view, ticker row, primary-focus area, detail drawer or a secondary research view.

**Visual hierarchy:** Assess what attracts attention first, second and third. Determine whether prominence matches trading relevance. Important risk changes and live developments should not compete equally with metadata, status information or low-value decoration.

**Scanability and cognitive load:** Evaluate whether the trader can compare multiple tickers quickly without reading paragraphs. Examine column count, row height, wrapping, terminology, repeated labels, icon dependence, color dependence and the effort required to connect related facts.

**Decision relevance:** Identify values that lack context, fields that describe data without explaining why it matters, and classifications that fail to communicate their supporting reason.

**Real-time behavior:** Evaluate update visibility, timestamps, freshness, changing states, alerts, movement between ranks and whether the interface communicates what changed without becoming noisy.

**Risk communication:** Review the treatment of Dirty Float, Structure, Chop Risk, Flush Risk, Live Confirmation, dilution/overhang and Momentum Cycle. Determine whether these concepts are distinct, understandable and visually proportionate. Identify duplication or contradictory signaling.

**Catalyst presentation:** Evaluate freshness, source quality, catalyst grade, headline, explanation and the distinction between a real catalyst, secondary catalyst, recycled news and no fresh catalyst.

**Table and drawer design:** Determine which information must remain visible for comparison and which information should be available on demand. Evaluate whether opening a ticker creates a useful investigative progression or merely repeats the row with more text.

**Filtering and prioritization:** Assess whether filters reflect how traders actually narrow the universe. Identify missing filters, unnecessary filters, unclear defaults and controls that consume more space than their value justifies.

**Language and labeling:** Flag jargon, ambiguous labels, overlong explanations, inconsistent terminology and language that sounds like internal system status rather than user-facing intelligence.

**Visual system:** Review typography, spacing, density, alignment, contrast, color semantics, badges, borders, surfaces, icons, empty space and consistency. Color should reinforce meaning without becoming a wall of competing red, yellow and green signals.

**Accessibility and interaction quality:** Include contrast, type size, click targets, keyboard behavior, focus states, tooltip discoverability, color-blind interpretation, scrolling, sticky elements and drawer usability.

**Trust and provenance:** Evaluate whether the page gives enough evidence, source attribution, timestamps and confidence information to support trust without overwhelming the primary interface.

## Required workflow tests

Simulate at least these tasks and report where unnecessary effort or confusion occurs:

1. Identify the three stocks that most deserve attention right now.
2. Determine why the top-ranked stock is moving.
3. Determine whether its apparently low float may be misleading.
4. Compare the structural and flush risk of two active stocks.
5. Identify what changed on a ticker since the last assessment.
6. Find the evidence supporting a Dirty Float classification.
7. Distinguish “not researched yet” from “researched and no problem found.”
8. Determine whether displayed information is fresh enough to act on.
9. Use the page after hours to prepare for the next morning.
10. Handle a fast market containing many simultaneous movers.

For each test, record the path, friction, uncertainty and whether the interface produces a clear answer.

## Required deliverable

Produce the assessment in Markdown with the following structure:

### 1. Executive verdict

Give a direct professional assessment of the current experience. Explain what the interface currently does well, where it falls short and the most consequential design problem.

### 2. Intended user workflow

Describe the optimal workflow for this product from market discovery through ticker investigation and ongoing monitoring. Compare that workflow with what the current interface encourages.

### 3. Current-page hierarchy

Describe what the page currently emphasizes versus what it should emphasize. Identify misplaced, oversized, undersized, duplicated and low-value elements.

### 4. Detailed findings

Create a findings table with:

* Finding ID
* Severity: Critical, High, Medium or Low
* Page area/component
* Observed problem
* Evidence from the interface
* User consequence
* Specific recommendation

Avoid generic recommendations such as “make it cleaner” or “improve the hierarchy.” State exactly what should change and why.

### 5. Element disposition

Inventory the major visible components and classify each as:

* Keep
* Revise
* Combine
* Move
* Progressively disclose
* Remove

Explain the proposed treatment.

### 6. Recommended information architecture

Define what belongs in:

* Global header
* Market/session summary
* Primary-focus area
* Main momentum table
* Persistent ticker row
* Expanded ticker drawer
* Live-change/event stream
* Secondary research or evidence view

Include a proposed ordering for table columns and drawer sections.

### 7. Recommended screen design

Provide a concrete screen-level redesign brief. Describe the layout, hierarchy, approximate density, sticky behavior, spacing, visual grouping and interaction model. Be specific enough that a designer or frontend engineer could build it.

Include separate recommendations for a normal market, sparse/empty state, research-pending state, stale-data state and high-activity state.

### 8. Visual and interaction system

Recommend a restrained semantic system for typography, badges, status colors, risk levels, momentum cycle, freshness and interactive states. Explain where text should replace color or icons.

### 9. Prioritized redesign plan

Divide recommendations into:

* Immediate corrections: high-impact changes that can be made without rethinking the entire product
* Structural redesign: changes to hierarchy, navigation or component responsibilities
* Later enhancements: valuable improvements that should wait until the core workflow is proven

For each item, include expected user benefit and approximate implementation complexity.

### 10. Acceptance criteria

Define observable criteria for determining whether the redesigned page is better. Include time-to-identify the primary ticker, time-to-understand its catalyst and structural risk, comparison efficiency, status clarity and reduction of unnecessary visible information.

### 11. Decisions requiring product input

List only genuine product questions that cannot be resolved from the interface, repository or existing project requirements. Do not use this section to defer design judgment that you can reasonably make.

## Standards for the assessment

Use screenshots and specific component references as evidence. Separate observed facts from design judgment. Preserve genuinely effective parts of the current interface, but do not protect existing implementation choices.

Prioritize fast comprehension, comparison, attention management and trust over visual novelty. Treat density as useful when information is well structured; do not assume that more whitespace automatically improves a professional trading tool.

Benchmark against strong real-time financial, operations and intelligence interfaces where helpful, but do not simply imitate Bloomberg, scanners or consumer investing applications. This product has a different job.

End with a concise description of the recommended experience in this form:

“When the trader opens the Live Desk, they should immediately see ___; within five seconds they should understand ___; when they investigate a ticker, they should be able to confirm ___ without ___.”
