# Thread: Research Pipeline

**Owns what the desk knows and what it pays to know it.** Evidence collection,
source resolution, the interpreter, dossier quality, and the OpenAI bill.

Last worked: **2026-08-21**. Written up 2026-08-23.

## Why this is its own thread

Every one of these arrived looking like a production incident and was actually a
research-pipeline decision about cost:

| Date | What happened |
| --- | --- |
| 2026-08-18 | 403 research jobs in a day, >12M input tokens — duplicate recovery and qualification work |
| 2026-08-19 | Interpreter dead on an empty OpenAI balance; diagnosis cost a live API probe |
| 2026-08-20 | 6.68M input tokens drained the balance again |
| 2026-08-21 | Whole Top 12 dark from 04:00–08:00 ET; 58 failed jobs across 21 tickers, 112 model calls, 0 tokens |

Ops kept absorbing these. The fix is always in `lib/research/`.

## Scope

- `lib/research/` — queue, retry policy, provider errors, interpreter
- Source resolution and catalyst collection; the resolver-first path and the
  urgent first-qualification path for a newly qualifying Top-12 name
- Dossier grading and honesty: `UNKNOWN` and `PARTIAL` are real verdicts, not
  failures
- Model selection and token budget

Background on how the pipeline was built and why:
[../RESEARCH-MILESTONE-PLAN.md](../RESEARCH-MILESTONE-PLAN.md).

## Not this thread

- Deploying → [ops.md](ops.md)
- How dossiers are *presented* → [design.md](design.md)
- **The market archive and the market-structure question** →
  [rnd.md](rnd.md). Split out 2026-08-23: this thread generates incidents, and a
  thread owning both an incident stream and an open research question will only
  ever work on the incidents. This thread's job is that the pipeline produces
  honest catalyst grades at a defensible cost. What those grades *mean* is R&D.

## State as of 2026-08-21

Research is running normally after a manual recovery at 08:11 ET. Seven of the
board's twelve names carried a fresh grade within minutes; IBG recovered on its
own and the two failures around the release were the credit refresh propagating.

Token ceiling is now **10M** (up from 4M on the 19th).

Diagnosis of the 21st took a single query, because `372f5eb` records
`credit_balance_exhausted` rather than a bare `HTTP 429`. That was worth it.

Recovery was done **by criteria, never by ticker name** — `last_error LIKE 'HTTP
429%'` **and** on today's Top 12 or focus list **and** no analysis today. Seven
released, twenty-one obsolete movers correctly left blocked. Repeat that pattern
if it happens again.

## Open items

**0. The three-arm prompt run: the data is here, and the symbol list needs
cutting to six.** *Delivered by Ops 2026-08-23.*

A consistent snapshot of the production store is at
**`data/market-prod-2026-08-23.db`** — `VACUUM INTO`, so it includes what was
sitting in the WAL, 106 MB, `integrity_check` ok, schema v21, 4,882
`research_sources` across 258 tickers and 325 analysis versions. Point
`MARKET_DB_PATH` at it explicitly. It is deliberately **not** named
`data/market.db`, so nothing picks it up as a live store by default, and
`/data/` and `*.db` are both gitignored.

Run it locally. Nothing was deployed and `1df1d75` does not need to be: the arms
run against this file, which is the whole point of the copy.

**Three of the nine names have no stored evidence in production either** —
checked before handing it over, and it is not a casing artifact (no `LIKE` match
and no analysis versions either):

| | OLOX | PMI | DXST | CDTG | BTCS | BTOG | PLAG | CYPH | GAUZ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sources | 33 | 22 | 23 | 23 | 22 | 18 | **0** | **0** | **0** |

So the run is **six names × three arms = 18 interpretations**, not 27, and the
stated floor of "nine names at minimum" cannot be met from stored sources. It
must not be met by collecting, either — that would void the comparison by the
design's own rule. Either accept six, or extend to other names on the 2026-08-21
board that *do* have sources, chosen before looking at results rather than after.

Worth someone's attention separately, and not chased by Ops: `CYPH` was ranked
**37 by RVOL and 14 on the after-hours board on 2026-08-21** while carrying zero
evidence rows. A name that reaches the board with nothing collected against it is
either a collection gap or a qualification gap, and it bears directly on Q1's
"the desk stopped being able to see catalysts" branch.

Two corrections to the run brief, both from reading the code:

- **It writes.** `interpretTicker` calls `saveAnalysisVersion`
  (`lib/research/interpret/pipeline.ts:342`), so each arm persists a new analysis
  version. Against a local copy that is fine and intended; it is the reason this
  was never going to run against production, where 18–27 dossiers from a variant
  the code labels *UNDER TEST, NOT ADOPTED* would have reached Monday's board.
- **"No rate-limit exposure" holds for SEC and newswire but not for Alpaca.**
  `worker/research-interpret.ts:140` calls `ensureDailyHistory` per symbol, which
  reaches `rest.getBars()` (`lib/research/historyFetch.ts:49`). It short-circuits
  on `already current`, so it may mostly no-op — but on the server it would have
  been drawing on the live desk's REST budget.

**10. The prior-free re-derivation. One run, not two — and it must be pinned to
the snapshot.** *Reconciled by Integration 2026-08-23, after R&D and this thread
recorded what read as two separate runs. **This charter carries the run**;
[rnd.md](rnd.md) carries why Q1 needs it.*

R&D's recommended prior-free re-derivation over 2026-08-17 to 08-21 **is** the
pass this thread scoped. Same window, same mechanism, same purpose. It was never
a fifth thing, and the trader is approving **one** cost, not two.

Three corrections that came with the reconciliation, all narrowing it:

- **One arm, not three.** `T` is dead — variant B is rejected. And R&D needs no
  control: it wants uncontaminated grades to *use as a variable*, not a
  comparison. The pass is the prior-free arm alone.
- **58 tickers, measured rather than estimated.** Only names that sat on a TODAY
  snapshot during the window could have carried a prior; the rest are clean by
  construction and re-deriving them buys nothing. The union of the five archived
  daily tabs is 71, of which 58 have collected evidence in the snapshot.
- **Cost: 0.65M input, 0.23M output**, at the 11.2k/3.9k per interpretation
  measured on 2026-08-23. Model spend only.

**The free alternative is withdrawn and should not be revived.** Restricting Q1
to ticker-days with no TODAY row costs nothing and is selection on the dependent
variable: TODAY is the Sheet's own $2-$10 watchlist, and 82% of the names that
ran 50%+ sit inside that band. The clean subsample is depleted of exactly the
population Q1 is about. This thread offered it; R&D's objection killed it and
was right.

### The condition that binds, and is not a property of the code

**Pin the run to `data/market-prod-2026-08-23.db`.** `readSources` does not
filter by date — `activeOnly` is its only option — so a replay bundles *every*
source a ticker has, including sources collected **after** the session being
replayed. Run against a freshly taken database next week, the re-derived grades
would carry look-ahead, and **Q1 would be invalid in a way nobody would see**:
the grades would look ordinary and would have been formed from news that had not
happened yet.

It is safe today **by accident of timing, not by design** — exactly one source,
across one ticker, in that snapshot was published after 21 August. If this run
slips and someone re-takes the snapshot, either re-check that count or add
as-of source filtering first.

This is written down here because it will not hold on its own. Nothing in the
code enforces it, no test covers it, and the snapshot's filename is the only
thing standing between a valid result and a plausible invalid one.

### RETRACTED 2026-08-23: the prior was never shown to move the grade

*Retracted by Research; enumerated here by Integration, because the claim stood
for several hours and was copied into four documents across three threads while
it stood.*

**What is withdrawn:** "removing the Sheet's prior changed the catalyst grade on
2 of 6 names against a control variance of 0 of 6". At **four runs per arm**,
**0 of 6** tickers are stable-in-both-arms-but-different. The two reported as
moved are the two that vary *within the control set anyway*. The original figure
came from single runs and could not separate the prior's effect from the model's
own variance.

**What survives, and it is not small.** `sheetPrior` **does** reach the
interpreter on every call — that is a code fact, traced through `bundle.ts:426`
to `buildInput` at `:102` and `JSON.stringify(bundle)` at `:107`, on the main
path called at `:188`. **The exposure is confirmed. The effect is not
demonstrated.** Those are different statements and the second does not erase the
first.

**Do not over-correct to "there is no problem".** A null at n=6, on a field now
known to be 2-of-6 unstable on identical evidence, is a weak instrument. It says
the earlier positive was indistinguishable from noise; it does not say the prior
is inert. The honest state is **unmeasured**, not **clean**.

**A second revision travels with it and has its own consequences.**
`catalystGrade` was reported **stable at 0 of 6** on fixed evidence, off two
runs. Four runs make it **2 of 6 unstable**. Any argument resting on catalyst
being the stable field needs re-examining — including R&D's reasoning that its
52% stored-record figure is dominated by real evidence change *because* catalyst
moved on the identical 29 pairs and catalyst was stable. That premise is weaker
than when it was written. R&D has been told directly.

**Where the retracted claim was copied**, so nobody has to rediscover it:
`design.md` (the two-graders finding and the comparison table), `rnd.md` (the
Q1 register row and the ANSWERED block), and
`docs/rnd/2026-08-23-outcome-capture.md`. Each thread owns its own correction;
this list exists so the enumeration is not repeated three times.

**Corrected: `design-audit-report.md` §11 was NOT one of them, and I named it as
the most important site.** Design checked rather than accepting the trace. That
line predates the finding and states the cautious version — *"whether it
changes the output needs a run"* — so **the design authority was never
contaminated**. An enumeration exists to stop people re-doing the search, which
makes a wrong entry in it worse than no entry: it sends someone to edit a
document that was right.

Design amended it anyway, for the opposite reason and a good one: it implied
the question was open pending a run, when the run has since happened and was
inconclusive. Left as it stood, someone would have re-commissioned it.

**Does the re-derivation still make sense?** Yes, and its justification changes
rather than disappears. It no longer *removes a demonstrated contamination*; it
*produces grades whose provenance is not in question*, which is what R&D needs
either way. What weakens is the urgency, not the value.

**14. Float: derived from filings, shipping with its own confidence signal. One
piece of work, not two.** *Decided by Integration 2026-08-24 under the
order-and-process delegation, with the route reversed from what Integration
recommended earlier.*

**The reversal, and the evidence that caused it.** I recommended the vendor
route first, on the grounds that it *reproduces the number already on the
board, so nothing changes*. **58 hand-pulled names then showed that number is
arithmetically impossible on one name in six**, and on ADRs the unit test fires
on 8 of 11. "Reproduces what is on the board" turned out to mean "reproduces
something demonstrably broken", and no vendor publishes its rules, so there is
no reading under which StockAnalysis is safer than Scanz.

So: **derive from filings, as the trader originally chose.** Not because the
data is better — that is unproven — but because **it is the only route where
the rules are visible and a failure is detectable.**

**And it is one project, not a float followed by a check.** Deriving from
filings puts shares outstanding in hand at the moment float is computed, so the
consistency test is free rather than plumbed. More important, **the signal is
what makes the derived number honest**: it lets the desk say *I cannot compute
this one* instead of guessing, which is the whole difference between this and a
vendor.

Ships with, non-negotiably:

- **`float_basis` from the first row**, per R&D's rule. Never retrofitted.
- **`float > shares_outstanding` → refuse — BUT ONLY WHEN THE DENOMINATOR IS
  CURRENT.** *Qualifier added by Research 2026-08-24 before the build, and
  accepted by Integration under the delegation. Without it the rule inverts the
  signal.* The filed share count is old for much of the universe — measured
  across 209 issuers: **39% over 180 days, median 82 days**, oldest STG at 3,065
  days. A company that has issued shares since its last filing **legitimately**
  has a float exceeding the filed count.

  **And the error runs the wrong way: the rule fires hardest on the names that
  dilute hardest**, because those are the ones whose count has grown since
  filing. The desk would go blind on pillar 5 precisely where supply risk is
  highest — an inverse correlation with what the field is for.

  So: **carry the denominator's age, and on a stale one report *cannot verify*
  rather than refusing.** Same honest answer the design is built around. And
  `shares_outstanding_as_of` ships beside the count per R&D's basis rule — a
  count without its date is a different quantity from a count with one.

  **`YJ` is the single best test case**: oldest-five staleness at 2,790 days
  *and* the ADR the classification records as ordinary. It fails on both axes at
  once.
- **Ratio under ~2% → refuse as a probable unit mismatch.** Cannot be gated on
  `ADR_ADS`: YJ is an ADR the classification records as ordinary, so the test
  stands on the ratio alone.
- **A derivative must not inherit its underlying's float.** `ENRDW` carried
  ENRD's verbatim, and warrants are exactly what a low-float runner's structure
  contains.
- **No split component.** Splits do not discriminate — all 9 flagged names have
  one and so do 13 of 25 clean ones. A split term would be the part that
  misleads.

**Open and unsettled inside it**, flagged by R&D and not to be quietly resolved:
13G filers are passive institutions whose shares belong in the float. Subtract
them and float is understated across the board — a false positive on pillar 5,
which is the dangerous direction.

Design renders it afterwards, including what a **refused** float looks like on a
row. That is a real design question and it is not this thread's.

**11. Is `CYCLE_CHANGED` stable, or is it structure again?** *Found by Design
2026-08-23, assigned here by the trader. It sat unowned between three threads
for several hours, which is the only reason it needed routing.*

Design found that `CYCLE_CHANGED` is gated **identically** to
`STRUCTURE_CHANGED` in the desk's diff, and that nobody has ever measured
whether the cycle classification is reproducible. Structure turned out to move
**2 of 6 on byte-identical evidence**. Cycle has had the same scrutiny applied to
it as structure had before this morning: none.

**Try to answer this for free before spending anything.** The control arm already
run on 2026-08-23 produced two complete passes over identical evidence — that is
exactly the design this question needs, and if those dossiers were stored whole,
the cycle field is already sitting in them. Read it out before proposing a run.
Structure's answer came from that same data as a by-product.

Two things to carry over from how structure was answered, both of which stopped
that result being misread:

- **Report the base rate beside the flip rate.** Structure takes three values
  across 1,459 rows with the mode at 60% of the mass, and that is what makes
  1-in-3 large rather than small. A flip rate without the field's resolution
  cannot be judged.
- **Noise on identical input and movement in the stored record are different
  measurements.** R&D's 1,248 stored pairs and this thread's 6 fixed-evidence
  pairs answered different questions about structure and were nearly quoted
  against each other. If cycle gets both, label which is which in the same
  sentence as the number.

**ANSWERED 2026-08-23, and it cost nothing** — the control dossiers were stored
whole, so `cycleClassification` was already in them. Across **4 identical
control runs over byte-identical evidence, 6 tickers**, all three fields from
the same data and therefore comparable:

**Two units, and they are not interchangeable — labelled after conflating them
cost a conclusion.** *Per-ticker* is the fraction of tickers returning more
than one value across four draws. *Pairwise* is computed over all 36 pairs from
the same runs, and **pairwise is the only one comparable to a churn rate
measured between two observations.**

| Field | Per-ticker (of 6, across 4 draws) | Pairwise (of 36 pairs) |
| --- | --- | --- |
| `cycleClassification` | 2 of 6 | **17%** |
| `structureClassification` | 3 of 6 | **25%** |
| `catalystGrade` | 2 of 6 | **17%** |

**~~Structure transitions in the record carry essentially no information.~~
Struck, not softened.** That conclusion came from setting structure's 52%
stored churn against a "50% floor" — but 3-of-6 per-ticker is not 50% pairwise,
it is **25%**. Against a 25% floor the implied real-change rate is nearer
**27%**, not the ~4% that produced the claim. The catalyst version moves too:
17% floor rather than 33%.

**And the thing that made it look robust was the tell.** It was believed
*because* 50% and 52% were nearly identical — an agreement so exact that six
names cannot support it. A coincidence that good is a reason to check the
units, not a reason to trust the result.

Cycle is the same order as structure. It has been running with no more
reliability than the field the desk has already acted on.

**REINSTATED 2026-08-23 on 236 versions. Direction flips happen, and my
original framing was right.** *This is the second reversal of this item and it
reverses my own retraction. The struck text below stood for under an hour.*

Measured across **5 draws per stored analysis on byte-identical as-of evidence,
236 archive-backing versions**, prior-free, single model — **not** a production
checkpoint-pair rate:

- **46% of cycle classifications are not reproducible.** Unanimous 5/5 on 127
  (54%), 4/5 on 65, 3/5 on 36, 2/5 on 8.
- Of the **109 that vary**, 81 vary only between a class and `UNKNOWN` — but
  **28 vary between two directions**: 17 `RED_BACKSIDE`↔
  `YELLOW_FRONTSIDE_WARNING`, 11 `GREEN_FRESH_FRONTSIDE`↔
  `YELLOW_FRONTSIDE_WARNING`, and **0** `GREEN`↔`RED`.

**The 17 are the ones that matter: 7.2% of versions.** Frontside against
backside is the distinction the playbook acts on, and on identical evidence the
same model returns one or the other depending on the draw. What survives of the
softening is only that the instability is **one step on the scale, not end to
end** — nothing goes `GREEN` straight to `RED`.

Base rate beside it: cycle is `UNKNOWN` on 75% of 325 stored dossiers, so 7.2%
is measured against a field that is usually silent. **Among versions that do
commit to a direction, the flip rate is correspondingly higher.**

Structure from the same run, since the desk has acted on it: **45% unanimous,
mean agreement 84% — the least reproducible of the three.**

**What I got wrong, and it is not the sample.** Research's six-name result came
with an explicit caveat: *"I can say none occurred, I cannot say they do not
happen."* I recorded that caveat **and struck my framing anyway**. An
underpowered null means a claim is **unresolved**, not **refuted**, and the
difference is exactly the width of this reversal. The correct action was to
mark the framing unproven and leave it standing, not to strike it and tell
Design the milder version as settled.

It is the mirror of the retraction problem in [integration.md](integration.md):
there, a retraction reached too little; here, it reached too far. Both come from
treating one measurement as the last word on a claim.

The struck text, kept so the reversal is legible:

**~~A trader will read it as the stock having turned. My framing above was
wrong and Design must not be given the stronger version.~~** Both cycle flips are
**classified-to-`UNKNOWN`**, not direction flips — OLOX
`YELLOW_FRONTSIDE_WARNING`↔`UNKNOWN`, CDTG `RED_BACKSIDE`↔`UNKNOWN`. Nothing in
this sample reads as a reversal. What a trader would see is a **badge appearing
and disappearing** — the desk ceasing to be sure, not the market turning. Still
noise presented as change, and materially milder than what I wrote.

**And the base rate limits how much the null can carry.** Across 325 stored
production dossiers, `cycleClassification` is `UNKNOWN` **243 times — 75%**;
`YELLOW_FRONTSIDE_WARNING` 56, `GREEN_FRESH_FRONTSIDE` 15, `RED_BACKSIDE` 11.
Only a quarter of dossiers carry any direction at all, and just 4 of 24
observations in the sample were classified. **So: no direction flip occurred,
and that is not evidence that they do not happen.** Research stated the limit
rather than letting the null read as reassurance, which is the right call and
the reason this answer is trustworthy.

Settling the direction-flip question would need a targeted run on the 25% whose
cycle is classified. That is spend, it is not urgent, and it sits with the
trader alongside the other open cost decisions.

**The finding that travels furthest is not about cycle.** `catalystGrade` is
**2 of 6 unstable on byte-identical evidence**. It was reported stable at 0 of 6
off two runs; four runs say otherwise. Anything resting on "catalyst is stable
on fixed evidence" needs revisiting — see the retraction note in item 10.

**13. Cycle migration: the order, and who owns each step.** *Decided by
Integration 2026-08-23 under a standing delegation of order-and-process calls.
Research proposed the sequence and reversed its own first proposal before
anyone acted on it.*

**Step 1 — wire `resolveCycleHistory` into the pipeline. Research. Do it.**
Additive, both values coexist, nothing breaks, and Design switches when ready.
The alternative leaves a pure function wired into nothing, which rots and whose
correctness nobody can check against real data.

**Step 2 — switch the readers. Split, not handed over whole.** Research listed
these as Design's; two are not:

| Surface | Owner |
| --- | --- |
| `components/AutomaticIntelligence.tsx`, `TickerDrawer.tsx` | Design |
| `lib/dashboard/deskRead.ts`, `intelligence.ts`, `merge.ts` | Design |
| `lib/data/cycleLevels.ts` | **Research** |
| `lib/research/merge/sheetAuto.ts` | **Research** |

`sheetAuto.ts` sits inside the apparatus Design is *deciding about*, which is
not the same as owning the file. And `cycleLevels.ts` is the Sheet data layer —
Research's, and the place its own best consequence lands: a computed cycle high
is `CURRENT_CYCLE` **by construction** with a start date bounding it, so most of
that file's classification guesswork disappears rather than being ported.

**Step 3 — delete the five model fields. Research, and NOT bundled into step
2.** Two reasons. A schema change is not Design's, and it reaches the store Ops
deploys. And step 3 must follow step 2 **deployed and verified**, not merely
merged — delete the fields while the switch still has a defect and there is no
fallback to read. Still one schema change, just not adjacent to the switch.

**Scope corrected by Design 2026-08-23, verified by grep rather than inferred.**
Four surfaces were missing from step 2, all Design's under the split above:
`components/DiscoveryBoard.tsx`, `lib/dashboard/view.ts`,
`components/MarketSummary.tsx`, `components/FilterBar.tsx`.

`DiscoveryBoard.tsx` is the one that changes the size of the work. It renders
the Cycle badge on the primary board and reads `conclusions.cycle.tone === 'neg'`
at `:405` to set `backside`, **which drives colour precedence for the entire
row**. It is the audit's §6 eight-column board, and the only cycle surface a
trader sees during 07:00-10:00.

**And step 2 contains a design decision, not just a switch.** `CycleFilter` is
`'ALL' | 'FRESH' | 'WARNING' | 'BACKSIDE'` (`view.ts:10`) — the old model's
classes. The arithmetic phases are six, and **only `BACKSIDE` survives by name;
`FRESH` and `WARNING` have no arithmetic counterpart at all.** Six phases do not
map onto three buckets, so the filters cannot be relabelled and someone must
decide what a trader filters cycle *by*. That is Design's to make and Design
flagged it so a build session does not discover it mid-flight and guess.

**Ordering call (Integration): make it now, inside the migration — do not defer
it to audit §9 item 13.** Design noted the collision with item 13's
workflow-filters rewrite and that it is better done once than twice, which is
right about the *design* and wrong about the *timing*: step 3 deletes the model
fields, so a decision is forced before then regardless, and item 13 is unstarted
Phase 2 work. Deferring means shipping a filter referencing classes that no
longer exist. **Make it minimal and reversible rather than a full taxonomy, and
let item 13 inherit it** — item 13 re-cuts every filter anyway, so cycle being
already correct costs it nothing.

**Working-tree note rather than a blocker:** `lib/archive/` is modified in the
tree. It is disjoint from this work, but a gate run may go red in
`tests/archive/` on changes that are not Research's. Stage by explicit path and
do not chase a failure there.

**0a. `worker/research.ts` never exits on SIGTERM, so every deploy SIGKILLs it.**
*Handed over from Ops 2026-08-23, found on live evidence. One line to fix.*

`worker/research.ts:193` registers `process.on('SIGTERM', stopHeartbeat)` where
`stopHeartbeat = () => clearInterval(heartbeat)` — it clears the timer and then
falls back into `for (;;)`. It never exits, so systemd waits out its 30s stop
timeout and sends `SIGKILL`. That happened on all three of today's deploys —
08:04, 19:38, 20:16 — while `mointel-market` and `mointel-assess` recorded zero
such failures.

**The handler is worse than no handler.** Node's default `SIGTERM` action is to
terminate; installing a listener overrides it. `worker/desk-assessments.ts` has
no signal handler at all and stops cleanly for exactly that reason. The intended
tidy-up is what disabled the exit.

Fix: mirror `worker/alpaca.ts:143` — cleanup, then `process.exit(0)`.

**Why it is worth more than 30 seconds a deploy.** A `SIGKILL` mid-job abandons
an in-flight model call — tokens spent, nothing recorded — and can leave a
claimed row with no process behind it. That makes it a candidate mechanism for
item 2 below, the ten `QUEUED` rows the health endpoint does not see. Possibly
unrelated; worth eliminating first, since it is one line.

**1. Billing-class failures should not consume the retry budget.** This is the
one concrete piece of unfinished code in the project.

`evaluateRetry` in [`../../lib/research/retry.ts`](../../lib/research/retry.ts)
releases a blocked ticker only when the *evidence fingerprint* changes. A
billing failure does not change evidence, so a name that fails three times on an
empty balance stays hard-blocked after you top up — and the whole board needs a
manual release.

`BILLING_ERROR_CODES` already exists in
[`../../lib/research/providerError.ts`](../../lib/research/providerError.ts) and
tags these correctly. Excluding billing-class failures from the attempt count
makes a top-up self-healing.

**Done 2026-08-23 in `2433470`, and now deployed.** Ops shipped it as part of
`fd9556f` on 2026-08-23; the research worker restarted onto it, so the exemption
is live in production. Billing failures back off and record but never become
terminal, so a top-up heals the board on its own; backoff is capped at fifteen
minutes so an exempt failure cannot schedule a name past the close.

Worth doing next, and deliberately not built here: **the cooldown is per-ticker
when the fact is global.** "The account is empty" is one truth, and twenty-one
tickers each discovering it separately is twenty-one probes for one answer. A
single global gate would be strictly better.

**2. Ten QUEUED jobs the health endpoint does not see.** *Handed over from Ops,
2026-08-23 — found while verifying a deploy, not investigated here.*

`research_jobs` on production holds `QUEUED` 10, `COMPLETE` 120, `PARTIAL` 619,
`FAILED` 215, while `/api/health` reports `research.queuedJobs: 0` and
`state: IDLE`. Either those ten are abandoned rows from an earlier trading date
that nothing will ever pick up, or the health count is scoped in a way that
hides real backlog. Both are worth knowing, and they want opposite fixes.

Related and probably the same scoping question: `research.lastCompletedAt` read
`2026-08-21T22:25:11.901Z` before the worker restarted and `null` after, while
`max(completed_at)` in the store still returns that same timestamp. No job ran in
between. Ops did not dig further — it is display logic over this thread's data.

**3. Interpreter tiering was designed but never exercised.** `Terra` is the
default full research model. The abstraction was deliberately preserved so `Sol`
could take difficult or conflicting dossiers and `Luna` could do low-cost change
detection. Nothing routes to them today, and cheap change detection is the
obvious lever on a 6M-token day.

**5. The Sheet is written by a ChatGPT scheduled task, and the desk calls it a
human review.** *Handed over by Integration 2026-08-23, after the trader said
he has never reviewed anything in the Sheet and does not put anything into it.
The label question is Design's; the merge semantics are this thread's.*

Verified in the code, not inferred: the desk's access is
`spreadsheets.readonly` and `drive.metadata.readonly`
(`lib/data/providers/googleSheets.ts:22`), and **nothing in `lib/`, `worker/`
or `app/` writes to the Sheet**. So the input is produced entirely outside this
system, by an automation no charter mentions and no thread owns.

That makes `SHEET` provenance not hollow but **mislabelled**.
`lib/dashboard/language.ts:23` renders `SHEET_ONLY` as *"only the human review
reached a conclusion"*, and `lib/dashboard/intelligence.ts:171` as
*"Human-reviewed research only"*. Both describe another model's output. This
thread's first working rule is that facts come from deterministic parsing and
the model only interprets, with `UNKNOWN` preferred to a fabricated
classification. A surface that reports one model's output as human review is
the same defect wearing a label.

**The question that decides how far it reaches, and it is not answered here.**
`lib/research/merge/sheetAuto.ts:361` only *compares* the Sheet's catalyst
bucket against the automatic grade — that is conflict detection and it changes
nothing. But `lib/research/merge/sheetPrior.ts:57` reads
`catalystGrade: ticker.catalyst.gradeRaw`, and the file is named for a prior.
**If that prior reaches the interpreter's context, the automatic catalyst grade
is influenced by the ChatGPT task's output rather than independent of it.** Read
`sheetPrior` and settle it plainly, because two other threads are downstream:
R&D's Q1 treats the stored catalyst grade as its independent variable, and the
conflict apparatus Design is deciding whether to delete rests on the two being
independent.

**Established 2026-08-23: it is not one task, it is four, and they are live.**
The trader produced a report from the ChatGPT side listing four weekday tasks
writing the workbook at **22:00, 06:10, 09:25 and 16:15 ET**, and describing a
substantial corpus — 204 `RESEARCH` rows, 96 `ARCHIVE`, 148 graded `OUTCOMES`,
nine dated tabs. **The Sheet is not a fossil and it is not empty.** What is
false is only the word *human*.

**Read that report's own §13 before using any of it.** It was written with no
access to this repository and with the MomoIntel connection expired — the
`chatgpt-mcp-7d` session Ops revoked. It is **first-hand on the Sheet and
second-hand on this application**; its architecture section comes from readouts,
not from the code, and it says so. Treat its Sheet numbers as evidence and its
claims about our pipeline as hearsay to check. It also calls the Sheet's output
*human conclusions* throughout, so the mislabel is not confined to our side.

**~~The timing collision.~~ Wrong, and retracted by Integration 2026-08-23.**
The claim was that because three of the four task times are this desk's
checkpoints and the tasks run 11-18 minutes late, a checkpoint reads a Sheet
stage before it has been written — `STRUCTURAL_REFRESH` at 06:10 seeing `T:AA`
blank. It is left here rather than deleted because it was written as *concrete
and checkable*, and it was checked, and it was false. Three separate reasons,
any one of which sinks it:

- **No checkpoint reads the Sheet.** `lib/desk/` mentions the spreadsheet once,
  in the historical comment at `schedule.ts:5`. Assessments are built from the
  market store.
- **The merge is not on the checkpoint clock.** The Sheet reaches it only
  through the research worker's poll loop — `loadSheetPriors()` at
  `worker/research.ts:213`, `POLL_MS` default 5000 — decoupled from the
  schedule entirely.
- **The overnight clear misses the fields that matter.** `T:AA` is the
  premarket block; Catalyst Grade is column J, Structure Flags P, Cycle D. The
  three fields the comparison uses survive it. What degrades falls back
  gracefully to the RTH values (`lib/data/rows.ts:264`), thinner rather than
  blank.

The checkpoint-time inheritance is still real and still worth knowing; it just
has no data consequence. What *was* found in that area is `sheetStale` — see
item 7.

**The migration has a hard dependency nobody had written down: float.**
*Raised by Research 2026-08-23, verified here.* `resolveDisplayedFloat`
(`lib/dashboard/merge.ts:143`) has exactly two branches — the Sheet's RESEARCH
tab, then its TODAY tab — and the type enumerates nothing else:
`displayedFloatSource: 'RESEARCH' | 'TODAY' | null` (`merge.ts:87`). There is no
third source in the tree.

So **every float on the desk is the Sheet's**, and float under 10M is one of the
five pillars the product exists to encode. `displayedFloatTurnover`
(`merge.ts:217`) and a branch of `risk.ts:174` hang off the same number. Retire
the Sheet without replacing it and pillar 5 leaves the product silently — every
float resolves null, which the code treats as a legitimate unknown rather than
an error.

This does not reverse the migration decision; it sequences it. **Nothing that
removes the Sheet ships before a float source replaces it.** The trader has
approved the direction for that replacement — derive float from SEC filings
already collected, shares outstanding less affiliate and restricted holdings
from SC 13D/13G and Forms 3/4 — and this thread is scoping it before writing
code. The surface that consumes it is Design's; the derivation is this thread's.

**~~Freshness is readable off the live desk without new code.~~ Also false,
also Integration's, corrected 2026-08-23.** `fetchSourceUpdatedAt`
(`lib/data/providers/googleSheets.ts:112`) does call the Drive API — and it
**403s with `SERVICE_DISABLED`**, because the Drive API was never enabled on
the Google Cloud project. The failure is caught and returns null, so
`meta.sourceUpdatedAt` is **always null** and nothing surfaces it. We cannot
currently see when the Sheet was last written. Enabling it is a console action
and has gone to [ops.md](ops.md), not here: it is not a code change.

**It was downgraded on 2026-08-23, and the downgrade is about the fix rather
than about the finding.** Ops checked the code and reported it a handled,
non-retrying condition — `googleSheets.ts:108` sets
`driveModifiedTimeAvailable = false` after the first failure so it stops
asking. That is correct, and it is correct **since `652d1a7`**. Before that
commit `loadSheetPriors` constructed a fresh provider every worker cycle, so
the flag reset to `true` on every call and the 403 **was** being retried
roughly 700 times an hour.

Recorded this way deliberately, at Research's request: **fixed**, not *never
happened*. The provider hoist is what made it harmless, and a later reader
should not take the downgrade as evidence the original finding was wrong. What
remains is only the missing timestamp — genuinely low value, one console
toggle, not worth a special trip.
Ops revoked a `chatgpt-mcp-7d` review session on 2026-08-23 that had been
unused since 19 August — a different path, almost certainly unrelated to a
Sheet writer, and named here only so nobody links them by coincidence later.

**4. `RESEARCH_RESOLVER_SEARCH_CONTEXT` stays at its current default.** Low-context
resolver searches were explicitly not enabled. Do not turn them on without
asking.

**6. Which of the 65 Sheet fields does the app have to absorb?** *Handed over from
Design, 2026-08-23.* Audit §11 item 1 is settled: **the Sheet is a migration
artefact and the trader's intent is for the application to absorb the four-task
workflow.** Design will not build a review workflow. But Design cannot say how
long "eventually" is, because the answer is about what the interpreter produces.

*Corrected the same day.* An earlier version of this item asked which fields are
"irreducibly human". **That framing was wrong and is retracted** — no human
writes any of it. `Analyst Notes`, `Warning Shot`, `Confirmation` and the rest
are task-authored, not human judgement, so the inventory is not
human-versus-machine. It is: **for each of the 65 fields, does this desk's
pipeline already produce it, could it, or would absorbing it mean building
something new?**

The measured shape: `lib/data/rows.ts` reads two tables and 65 fields — 28
columns on `TODAY!A:AA`, 37 on `RESEARCH!A:AK`. That inventory is the retirement
plan for the Sheet, and nothing after Phase 2 can be scheduled without it. Not
urgent — Design's Phase 2 proceeds without it — but it gates the phase after.

Distinct from item 5, which is about the input's reliability today.

**UPGRADED 2026-08-23 by the trader: this is now the critical path, not a thing
that gates the phase after.** He asked whether all four ChatGPT tasks still need
to run. Three of the four sit on desk checkpoint times and duplicate work the
application already does. **Tasks 1 and 2 cannot stop, because they are the only
writers of the desk's float** — `resolveDisplayedFloat` reads the RESEARCH tab
then TODAY, and task 1 is the sole writer of `TODAY!A:S` where float is column
I. So this inventory is what stands between the desk and retiring half its
ChatGPT workflow.

**The audit has two halves and the item only covered one.**

*Outputs — the 65 fields, as already scoped.* For each: does this pipeline
already produce it, could it, or would absorbing it mean building something new?

*Inputs — the sources, which nothing has looked at.* The tasks draw on SEC
EDGAR, exchange notices, issuer IR, newswires and market-data pages. The
workbook persists **928 URL appearances across 64 domains**, and the mix is not
what the source policy says: **float is sourced from StockAnalysis 157 times
against SEC 10.** So for each source class the tasks use, does this desk reach
an equivalent — and where it does not, is that a gap or a deliberate drop?

**The finding that makes the input half matter, and it lands on Phase C.** A
derived float built from SEC filings **will not match** the Sheet's float,
because the Sheet's is a vendor-displayed number and the derivation is a
filing-computed one. Those are different definitions of the same word. Audit
F-19 is already that contradiction on screen — SUGP showing `Float 0.70M
displayed` on the watchlist against `FLOAT Unknown` in the drawer. **Replacing
the Sheet's float is not a like-for-like swap and should not be planned as one.**

**PHASE C IS REOPENED.** It was paused on the reasoning that `supplyBound` may
answer the trading question often enough that an estimated float is not worth
its error bars. That was sound when nothing depended on it. It is now the
critical path to retiring the Sheet, which is a consideration the pause did not
weigh.

**TASK 3 IS SETTLED: NOTHING READS IT.** *Research, 2026-08-23, two independent
reasons rather than one.* `load()` requests exactly two ranges — `TODAY!A1:AA`
and `RESEARCH!A1:AK` — so **no dated tab is ever in a request** and nothing
written to one can reach the desk by any path. And the 09:25 block is bounded
out of TODAY: `sheetTable.ts` names this exact case in its own comment, that the
tab carries two legitimate tables with a `TICKER` header sharing four column
names. The watchlist is identified strictly by Ticker, Priority, Country of
Origin, Float, Structure Flags; the 09:25 table shares only the loose four, so
it fails the identity test and satisfies `isBoundaryRow` — **terminating** the
watchlist read rather than joining it. That is the `OBSERVED PM` fix doing the
job it was built for.

**And it fails closed, which is worth having in the record.** `locateTable`
returns null on zero *or more than one* identity match, and the provider throws
on null so the caller keeps its last good read. If stopping task 3 ever changed
the tab's shape in a way that confused the parser, the failure is a refusal to
read, not a bad read.

**Corrected before the decision went out, by R&D.** I framed stopping task 4 as
giving up the second grader. It is not. **`RESEARCH` is written by tasks 1 and
2 only** — verified in the report: task 1 *"appends/updates detailed RESEARCH"*,
task 2 *"updates RESEARCH"*, and task 4's outputs are the dated-tab scorecard,
`OUTCOMES` and `PATTERNS`. So the catalyst labelling R&D wanted for Q1 — 204
rows over 146 tickers with source URL and timestamp — **survives**, because
tasks 1 and 2 are staying for the float.

Two different things were being conflated under "second": the second *ledger*
of outcomes is task 4's, and it is strictly worse than tape-derived. The second
*grader* of catalysts is `RESEARCH`, and it is untouched.

**Explicit condition on stopping, from R&D: do not delete the corpus with the
task.** *Stopped* and *cleaned up* are two decisions and only one has been
taken. The dated tabs hold the stage calls **as made** at 22:00, 06:10 and
09:25, and a forecast recorded before its outcome is the category the archive
spec calls irreplaceable — nothing re-creates what somebody believed at the
time.

**R&D's annotation criteria, stated up front so the inventory can be shaped for
them:** is the field irreplaceable if not captured live; is it re-fetchable
later; does it have more than one possible definition; and **is it displayed
today — marked deliberately irrelevant.** That fourth is the annotation no other
thread will make: *a field no surface renders can still be the only witness to a
question nobody has asked yet.*

**It lives at [`../sheet-coverage-audit.md`](../sheet-coverage-audit.md).** *Integration's
call, made because the item did not name a home and a cold session would have
had to ask.* Not inside a charter: 65 rows with four annotation columns would
swamp one, and charters have to stay readable to be read.

**DONE, both halves, `a02262e`.** *Research, 2026-08-24.* Outputs: **39 of 64
already produced**, 10 producible from inputs the desk holds, **15 needing
capability it does not have** — and the 15 are less varied than the count
suggests. **Float and everything downstream is one problem wearing five names**
(TODAY col I; RESEARCH 9, 10, 11, 36). The rest is prose plus the A/B/C priority
grade, which is a judgement rather than a measurement.

**Nine fields moved from NEW WORK to PRODUCED during this session's own cycle
work.** Taken yesterday the inventory would have been materially wrong — so it is
re-run after any capability lands, not treated as settled.

*Count corrected: 64, not 65 — 27 on TODAY plus 37 on RESEARCH. If the missing
one is a column the parser does not read, that is its own answer and wants
confirming against the tab rather than the code.*

### The input half changed the Phase C decision, and it was made without this

**642 of 935 URL citations — 69% — sit on domains this desk has never collected
from. And nothing the tasks use is blocked:** `domainPolicy` refuses exactly one
class, the RFC 2606 placeholders.

| Domain | Cites | Policy | Desk has |
| --- | ---: | --- | ---: |
| `stockanalysis.com` | 505 | unclassified | **0** |
| `marketwatch.com` | 24 | unclassified | 0 |
| `tradingview.com` | 24 | unclassified | 0 |
| `finance.yahoo.com` | 14 | MIRROR (demoted, not refused) | 0 |

**So the answer to gap-or-drop is GAP, almost throughout, and it is DISCOVERY
rather than POLICY.** `stockanalysis.com` is the largest source in the workbook
and the origin of every float on the board; the policy would store it and the
desk simply never looks. That reframes the SEC-only bundle finding — 1,408 of
1,437 sources are SEC not because aggregators are refused but **because nothing
reaches them.** Same root as the resolver finding a usable newsroom for 4
issuers of 74.

**The consequence for Phase C, and it is the trader's:** the vendor route to a
float is **available and unblocked today**. He chose deriving from filings when
the alternative on the table was *"scrape stockanalysis.com"*, and at that point
**nobody had established that the desk's own policy would accept it.**

*Integration's read, added because the two are not alternatives:* the vendor
float **reproduces the Sheet's number**, so it retires the Sheet's float
dependency without changing what the desk shows — that is a **migration**
answer. The derived float is a **product** answer: a better number with
different provenance. Under R&D's `float_basis` rule both can exist. **So the
real question is sequencing, not choosing** — and the vendor route is what would
let tasks 1 and 2 stop soonest.

*Limit Research stated rather than let stand: it inventoried what the tasks
CITE, not what they READ. A task may consult a source it never links, so the
input half is a floor on their source use, not a census.*

**One table, not three.** *Integration's call.* Research produces both
inventories; Design annotates which of the 65 must survive on screen; R&D
annotates which it needs for the archive. **The table stays in one place and
Integration keeps it there** — a three-way coverage audit that lives in three
charters is precisely the failure this thread exists to prevent, and it would
not be discovered until someone retired a field another thread was reading.

**7. `sheetPrior` does reach the interpreter — the two reads are not
independent.** *Established in code by Design, 2026-08-23, and handed over
because the empirical half is this thread's.*

This is one of the two findings Integration named as gating the removal of the
conflict apparatus. The code path is confirmed:

`worker/research.ts:375` and `worker/research-interpret.ts:147` pass
`prior?.analysis` (from `lib/research/merge/sheetPrior.ts`) as
`priorHumanAnalysis` → `lib/research/interpret/pipeline.ts:198` →
`lib/research/interpret/bundle.ts:93`, where it is labelled
`HUMAN_REVIEWED_PRIOR_ANALYSIS` → into the prompt.

**Those two prompt sites understate the reach — corrected 2026-08-23, raised by
Research and verified from source here.** `openaiInterpreter.ts:95` is the
system prompt and `:146` is inside `buildAdjudicationInput` (`:142`), which
runs only on escalation. Citing those two makes it read as though the prior
reaches the model only on disputed fields. It does not. `priorHumanAnalysis` is
a **field on the bundle** (`bundle.ts:426`), and `buildInput` (`:102`)
serialises the whole bundle with `JSON.stringify(bundle)` at `:107` — the main
interpret path, called at `:188`. **The prior is in the context window of every
`Terra` call for any ticker carrying a TODAY row**, not just adjudications. The
contaminated surface, and this item's open question, are correspondingly
larger.

**The design is careful and that must be said**: the prior is presented as an
opinion and explicitly denied the status of evidence ("Do not adopt its
conclusions without support in the collected sources"), and adjudication
re-decides from sources rather than voting between two opinions.

**Two things remain true anyway.** First, `AUTO` has seen `SHEET`'s conclusion
before reaching its own, so whatever the UI shows, the two are not independent
opinions. Second, the prompt's own justification is now false: `:150` instructs
the model not to adopt the prior *"because a person wrote it"*. No person wrote
it.

**Two things measured since, from stored metadata in the local `market.db`, and
both change the weight of what was routed elsewhere:**

- **`AUTO_NEWER` has never fired.** Zero occurrences across 94 stored analyses
  carrying `sheetProvenance`. `SHEET_NEWER` appears 7 times. So the dead branch
  is dead by measurement rather than by reasoning, and the default fall-through
  is the one reaching the trader.
- **Half of all escalations are caused by the Sheet.** 14 escalations, 7 of them
  `SHEET_AUTO_CONFLICT` — more than any other single reason. Disagreeing with
  the ChatGPT tasks is the **largest driver of expensive-model spend on this
  desk**. This thread's charter makes cost a completion criterion, and that
  number was not previously known.

What Design cannot answer and this thread can: **does the prior actually change
the output?** That needs a run, not a read. Until it is answered, Design has
deferred §9 item 15 (single conflict signal) rather than reducing it — promoting
a conflict signal that may be an artefact would be worse than the buried one.

**8. The structure classification was shaped by the prompt, not by the market.**
*Found 2026-08-23 after the trader said every float reads as a dirty float.*

His observation was right and the cause was not what any of us guessed. Our own
classifier calls `DIRTY_FLOAT` on **17%** of dossiers and the Sheet independently
calls it on **19%** — those agree, and neither is over-firing. What the board
shows is the *Sheet's* text: every string in the RISK column of the screenshot he
sent matches `TODAY!R` verbatim, and three of those rows (PLAG, CYPH, GAUZ) have
no automatic dossier at all.

The real defect is on our side and it is the opposite shape. Across 94 dossiers
`CLEAN` was chosen **zero** times, and `CLEAN_REQUIRES_RECONCILIATION` never
fired once — so CLEAN was not proposed and downgraded, **it was never proposed**.
The prompt states only the negative rule and never says what would justify CLEAN,
while the guardrail holds a precise, satisfiable test the model is never shown.
`CAUTION`, the only verdict guarded by nothing, took 64%.

Shipped in `1df1d75`: a positive CLEAN criterion and a CAUTION definition as
`SYSTEM_PROMPT_B`, both switches defaulting off; `CAUTION_REQUIRES_IDENTIFIED_SUPPLY`;
and `supplyBound`, a deterministic floor under the supply-to-float ratio. **The
CAUTION rule moves 0 of 60 real CAUTION dossiers** — it is a backstop, not a
reclassifier, so the 64% will only move if the prompt moves it. That is what the
three-arm run in item 0 decides. **Nothing here has decided that B is better.**

The binding acceptance criterion is the trader's actual risk: **the `DIRTY_FLOAT`
rate must not fall.** If telling the model what CLEAN means stops it calling real
dirty floats dirty, B is wrong and gets reverted.

**9. The desk has no float of its own, and that is a blocker on retiring the
Sheet.** `resolveDisplayedFloat` (`lib/dashboard/merge.ts:143`) has exactly two
branches, `RESEARCH` and `TODAY`. Both are spreadsheet tabs. Every float number
on the board is the ChatGPT task's, sourced from stockanalysis.com. Of 1,437
collected sources, **1,408 are SEC** and there is no float source anywhere.

So `floatConfidence` is `UNKNOWN` on 93 of 94 dossiers. That is not timidity —
it is the correct answer, and the float rules must not be softened to make it go
away. The fix is collection.

The trader chose deriving float from filings we already reach: shares
outstanding minus affiliate and restricted holdings. **Settle this before writing
it: SC 13G filers are passive institutions and their shares ARE float.** Only
affiliates come out — officers, directors and 10% owners via Section 16, plus
13D control blocks. Subtracting 13G holders would understate float and
manufacture the false dirty-float calls this thread was asked to prevent.

Not started, and deliberately sequenced after the bound has run: `OWNERSHIP` is
`maxFetch: 1` with the rationale *"holder context only; not a supply proof"*, and
Forms 3/4/5 are not in the taxonomy at all, so this is real new collection with
real error bars.

**10. Volume can prove supply was NOT absorbed. It can never prove it was.**
*Raised by the trader, who asked whether N× turnover means the outstanding
shares have cycled through.*

It does not, and his own tape is the argument: IVF turned over its entire share
count **47.6 times** on 2026-08-17, TRUG 12.7x, MYSZ 12.2x. Ownership did not
rotate 47 times. Any "≥ N× ⇒ cycled through" rule would mark every real runner
clean on the day it runs hardest — and it is the inference
`NO_ABSORPTION_INFERENCE` already exists to block.

What survives is the bound: cumulative volume is an *upper bound* on what could
have been distributed, so volume **below** the overhang proves it cannot have
been absorbed, while volume above it proves nothing. Mirror of `supplyBound`,
which is conclusive when high. It will rarely bind on a runner; it binds on quiet
names carrying a large overhang, which is exactly where it is worth having.

Real absorption evidence is filings, not tape, and all of it is inside the SEC
surface already reached: 424B supplements reporting shares sold, 10-Q ATM
disclosure, **Form 144 (already collected, 12 of them)**, and 13D/G amendments
showing a stake fall. The trader's instinct that clean-versus-dirty should evolve
daily is right; the driver is filings plus the volume floor.

Seam: the tape half is R&D's, in `A:\trade_research\momentum\viscosity`. Its
SPEC §12.3 already lists "Active overhang and cumulative volume" as a future
structural model, gated on the tape model being evaluated first — a gate now
reached, since that line is closed. §373 wants flow as a fraction of float
*"where point-in-time float is trustworthy"*, and item 9 is why it is not.

**11. The resolver re-asks a question that has already failed.** For the seventy
issuers with no stored company source, `resolverDue` alternates with discovery
indefinitely, so every other paid pass buys a model call to re-ask "where does
this issuer publish" — and gets the same answer. Discovery must keep running
regardless (that is what found XOS), so the backoff belongs on resolution alone.

Deliberately not fixed on 2026-08-23: it is a scheduling change to paid calls and
it wants its own measurement rather than a late edit. `9ee0b4b` fixed the
adjacent correctness bug — `hasUsableSource` believed every legacy row because
`undefined !== null` — which had frozen all four "resolved" issuers on single
article pages that can never list a new release.

**12. The replay harness fabricated a result, and only a cost counter caught
it.** *2026-08-23. Recorded because the near-miss is more instructive than the
fix.*

`research-replay`'s first run reported **"123 version(s): 123 stable, 0 unstable,
43 differ from the stored grade"** and made no model calls at all. Clean,
internally consistent, and entirely invented. Its only tell was `tokens in=0
out=0` on the last line — a counter added for cost reasons, not correctness.

Two omissions compounded. A standalone worker does not get `.env.local`; that is
what `worker/env.ts` exists for and every other worker entry point imports it
first. Without `OPENAI_API_KEY` the interpreter fell back to `Noop`. Then
`interpretTicker` did the right thing for the wrong caller: with no interpreter
it returns the previously accepted dossier, because a desk is better served by
yesterday's verified analysis than by nothing. For a replay that is poison —
every version came back carrying `readCurrentAnalysis`'s dossier, the ticker's
**latest** analysis rather than the version being replayed, so multi-version
tickers compared their newest grade against each older one and manufactured 43
plausible changes from nothing.

Guarded in `ba7bc02`: load the env, **throw** rather than build a `Noop`, and
throw per version on `UNAVAILABLE` or `REUSED_UNCHANGED`. A replay that cannot
call a model has no answer and must say so.

**The general rule, which is why this is an item and not a commit note: a
degradation that is correct for the live desk can be a fabrication for an
analysis tool.** Every graceful fallback in `lib/research/` is worth re-reading
with that distinction in mind. Check the token line on any replay output before
believing it.

**14. Two numbers were wrong in ways their own plausibility hid.** *Both
corrected the same day; kept as a pair because the failure mode is identical.*

*The independence result.* I reported **"the prior moves the catalyst grade, 2 of
6 against a control variance of 0 of 6"** and it was retracted within the hour.
The 0-of-6 came from two control runs that happened to agree. With four runs per
arm, **0 of 6** tickers are stable-in-both-arms-but-different — and the two names
I had reported as moved are exactly the two that vary within the control set
anyway. Noise measured against too small an estimate of noise.

R&D's framing is the part worth keeping: contamination is a **bias**, which has
a direction and can be subtracted; what is actually there is **noise**, and
measurement error in an independent variable attenuates any association toward
zero — which is Q1's own hypothesis. A noisy catalyst measure produces a null
that looks like a finding.

*The unit error.* I reported "2 of 6" and "3 of 6" without saying what they
counted — the fraction of **tickers** returning more than one value across
**four** draws. R&D subtracted them from a **pairwise** churn rate. Computed
pairwise over all 36 pairs: catalyst **17%**, structure **25%**, cycle **17%**.
Structure against 52% churn is therefore ~27% real change, not the ~4% that
produced "structure transitions carry essentially no information" — a claim
struck rather than softened.

**Both errors survived because they looked right.** The 50%-versus-52% identity
made the structure conclusion feel robust; it was the coincidence that should
have prompted the check. **Label which measurement a number is in the same
sentence as the number**, and treat two independently derived figures landing
close as a prompt to verify they are the same quantity.

**15. The cycle is arithmetic now, and the model never had the number its label
needed.** *Built 2026-08-23 on the trader's instruction that this be
quantitative, not an AI call.*

`lib/market/cycle.ts` resolves cycle position from daily bars. Pure function, no
I/O, no model, no token cost. Why it exists, in measurements rather than
opinion:

- `currentCycleHigh` was established in **40 of 325** dossiers. The label was
  produced anyway, without the number it rests on.
- Re-running 236 stored analyses five times each on identical evidence returned
  a different `cycleClassification` **46%** of the time, and **17 versions
  flipped between backside and frontside** — the call the playbook acts on.
- `formerRunnerStatus` disagreed with itself on **43%** of versions.
- On every disagreement where both committed, the arithmetic is the better
  call: **8 to 0, one unclear.** `MYSZ` read `YELLOW_FRONTSIDE_WARNING` at 177%
  retraced, 54 sessions past its high.

**Every constant is the trader's rule, the desk's existing floor, or measured.**
Start day is 20% on 5× RVOL (his). Backside is half the *move* given back (his —
and it corrected a real bug: I had measured distance below the *high*, which on
a 20% mover puts the threshold below the base and never fires). `SHADOW_RVOL` is
the desk's own 2× eligibility floor. `SHADOW_SESSIONS = 3` and
`SHADOW_LIFETIME_SESSIONS = 10` are measured against production bars — a name
that just ran is 7× likelier to run again within a week, gone by ten sessions.
Only `SUPERRUNNER_ADVANCE = 200%` is a percentile choice, and
`largestPriorAdvancePct` ships beside it so no surface must accept it.

**SHADOW is the trader's idea and the one nobody would have derived.** A name
that ran a month ago and went quiet is not on the backside of anything — nothing
is unwinding — but its high is still overhead. Volume returning to normal is what
ends a cycle; sessions decide when the memory stops being useful. They are not
alternatives.

Wired additively in `91c9af1` as `dossier.computedCycle`, beside the model's
block. Migration order and ownership are item 13. **Step 3 — deleting the five
model fields — must follow Design's switch being deployed AND verified, and
Design's scope grew, so plan it as a separate later piece rather than something
queued behind the switch.**

## Working rules

- **Facts come from deterministic parsing; the model only interprets.** Never
  fabricate a classification to fill a gap — `UNKNOWN`/`PARTIAL` with provenance
  instead.
- **Shares outstanding is not float. Market cap is not float.** Unknown float
  stays unknown.
- **Credentials stay worker-side.** `tests/security.test.ts` enforces this.
- Cost is a completion criterion, not an afterthought: job count, model calls
  and tokens are part of "done".

## Opening message for a new chat

> This is the **Research thread** for the Momentum Intelligence desk at
> `A:\mointel`. Read `docs/threads/research.md` and `docs/threads/README.md`
> first.
>
> You own `lib/research/` — evidence collection, source resolution, the
> interpreter, dossier quality, and the OpenAI bill. You do not deploy; the Ops
> thread does. UI presentation belongs to the Design thread.
>
> The top open item is the billing-class retry exclusion in
> `lib/research/retry.ts` — billing failures consume the retry budget, so a
> top-up does not self-heal and the board needs a manual release. It has bitten
> twice. Start there: show me the change you would make and what it costs to
> test, but do not write it until I agree on the approach.
