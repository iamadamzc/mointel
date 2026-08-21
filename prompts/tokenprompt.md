Reduce web-search token consumption without degrading catalyst coverage. Start from the current clean production SHA and confirm the deployed version before making changes.

The measured problem is established:

* DISCOVERY median input is approximately 44,591 tokens despite a worst-case authored request of roughly 930 tokens.
* RESOLVER median input is approximately 24,708 tokens despite an authored prompt of roughly 254 tokens.
* INTERPRETATION, which carries the actual evidence bundle but uses no web-search tool, has a median of only 9,521 input tokens.
* On August 20, 2,731,079 input tokens went to discovery or resolver calls that returned nothing.
* Seventeen of 59 tickers received two or three discovery passes, consuming approximately 1.97 million tokens.
* Forty-two discovery calls lacked a trigger, preventing attribution of 2.13 million input tokens.

The objective is to reduce unnecessary hosted web-search context and establish the evidence needed to optimize interval rechecks. Do not weaken immediate research for a genuine new momentum mover or suppress the later discovery path that recovered XOS.

## 1. Fix interval attribution

Pass an explicit trigger such as `INTERVAL_RECHECK` through the entire interval-discovery path:

* queue/job purpose;
* collector report;
* model-usage record;
* logs;
* diagnostics.

After this change, no new discovery or resolver model call may have a NULL trigger. Add a test covering the exact interval call path that produced the 42 unattributed calls.

Do not rewrite historical rows merely to make the prior data look complete.

## 2. Add a canonical blocked-domain policy

Add `filters.blocked_domains` to general discovery using only domains whose returned URLs are already rejected deterministically by `validateDiscovered`.

There must be one canonical domain-policy source shared by:

* the web-search tool configuration;
* URL normalization;
* `validateDiscovered`;
* tests.

Do not maintain separate lists that can drift. Normalize domains without protocols and account for subdomains. Enforce the API’s 100-domain maximum.

Before adding any domain, prove that the current validator rejects it in every applicable source role. Do not block:

* SEC or exchange sources;
* company domains;
* company IR or newsroom providers;
* PR Newswire, GlobeNewswire, AccessWire, Business Wire, or another accepted primary newswire;
* a domain that has ever supplied accepted catalyst evidence unless the existing acceptance was demonstrably erroneous.

Add regression tests proving that blocked domains match the deterministic rejection policy and that accepted company/newswire sources remain searchable.

## 3. Evaluate and conditionally deploy low-context resolver search

The resolver’s job is to identify a candidate durable company publication location. The application then fetches and validates the page independently, so the model’s source classification is not authoritative.

Test `search_context_size: "low"` against historical resolver cases before deploying it.

Use the previously observed medium-context results as the baseline; do not pay to rerun the medium side unnecessarily. Replay low context once for:

* all available August 19–20 cases where medium context found a subsequently validated durable source, up to the complete positive set;
* a representative stratified sample of negative cases;
* difficult issuer-site shapes, including JavaScript-rendered sites, redirects, newsroom indexes, press-release indexes, feeds, and false leaf pages.

For each case report:

* medium-context historical result;
* low-context candidate;
* whether the existing deterministic validator accepts it;
* whether it resolves to the same durable location, a different valid location, or no location;
* input, cached-input and output tokens;
* latency;
* false-positive or leaf-page behavior.

Deploy low context only if:

* it preserves at least 95% of the validated durable-source recall achieved by medium context;
* it introduces no validator-accepted false location;
* it does not increase leaf-page promotion;
* it produces a meaningful measured token reduction.

If it fails that gate, leave resolver context at medium and report the failure cases. Do not weaken the validator to make low context pass.

Record `search_context_size` and the domain-policy/configuration version in the collector report or model-usage diagnostics so future token comparisons identify the actual tool configuration.

## 4. Measure discovery recheck cadence without changing it yet

Do not change the production interval in this pass.

Reconstruct every repeated discovery sequence from August 19 and August 20. For each repeat call identify:

* ticker;
* call timestamp;
* elapsed time since prior discovery;
* session phase;
* board and rank at the time;
* trigger;
* prior catalyst state;
* whether a source was added;
* whether the evidence fingerprint changed;
* whether the analysis materially changed;
* whether a newer catalyst was found;
* event timestamp of any newly found catalyst;
* input tokens;
* whether the ticker remained relevant after the call.

Aggregate the marginal yield into elapsed-time bands:

* 0–30 minutes;
* 31–60 minutes;
* 61–90 minutes;
* 91–120 minutes;
* 121–180 minutes;
* over 180 minutes.

Simulate fixed minimum cooldowns of 60, 90, 120 and 180 minutes. For each policy report:

* discovery calls avoided;
* input tokens avoided;
* valid sources that would have been missed entirely;
* valid sources that would still have been found later;
* delay imposed on each late catalyst;
* analysis changes delayed;
* Top-12 coverage impact.

Also simulate an adaptive policy with these concepts, but do not implement it:

* active Top-12 ticker with no catalyst found;
* ticker with a credible fresh catalyst already established;
* ticker outside the current relevant board;
* ticker with a validated deterministic company source;
* genuine new material event that bypasses any interval cooldown.

Include XOS explicitly and show when its Air Force release would have been found under every candidate policy. A policy that eliminates that discovery or delays it beyond its useful trading window is unacceptable.

End the cadence analysis with a recommended policy based on measured marginal yield and catalyst delay. Do not deploy the cadence recommendation without a separate authorization.

## Delivery and deployment

Keep the attribution change, canonical blocklist, and resolver-context change as independently reviewable commits, but run one combined test and release cycle rather than three production deployments.

Run all tests, lint, typecheck and the production build. Deploy the first two changes and the resolver change only if its replay gate passes. Preserve market-worker continuity.

After deployment verify:

* no new discovery/resolver calls have NULL triggers;
* interval calls report `INTERVAL_RECHECK`;
* blocked domains are absent from returned search sources;
* accepted company and newswire sources still resolve;
* resolver calls report `search_context_size: low` if the gate passed;
* live resolver token usage declines relative to the medium-context baseline;
* discovery source-add and catalyst coverage remain intact;
* XOS and ENRD intelligence remains unchanged;
* schema, database integrity and consistency checks pass;
* market and research services remain healthy.

Return:

* commits and deployed SHA;
* exact blocked-domain set and its canonical policy location;
* low-versus-medium resolver replay table;
* recall, false-positive, token and latency results;
* whether low context was deployed;
* interval attribution proof;
* repeated-discovery marginal-yield analysis;
* cooldown simulations;
* XOS delay under every policy;
* recommended future cadence;
* post-deployment token and coverage diagnostics.
