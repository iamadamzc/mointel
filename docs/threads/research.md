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

**00. A live catalyst miss on RCON this morning: RESOLVER found no durable
company source and added nothing, so a wire release produced no re-analysis.**
*Handed over by Ops 2026-08-25, traced not guessed. Read-only evidence below.*

RCON sat on his board at rank **7**, **+24.04%**, reading `CATALYST UNKNOWN`
while a PR Newswire release had gone out at **08:00 ET**.

The pipeline fired correctly and came back empty. Job id **1224**, discovered
`2026-08-25T12:04:05Z` = **08:04 ET** — four minutes after the wire — trigger
`ENTERED_TOP_N`, completed 29 seconds later as `PARTIAL`. Its collector report:

```
{"discoveryMode":"RESOLVER","companySourceDetail":"no durable company source located",
 "companySourceUrl":null,"companySourceShape":null,"modelCalls":1,"sourcesAdded":0,
 "fingerprintChanged":false,"state":"COVERAGE_INCOMPLETE"}
```

`sourcesAdded: 0` → `fingerprintChanged: false` → no new
`research_analysis_versions` row → `research_dossiers` still points at
`2026-08-19T11:58:05Z`, `analysis_version` 1, `gpt-5.6-terra`. Six days old.
That is the whole chain, and the board reading is the last link in it.

**It is not the stranding defect.** `rcon_stranded = 0`. That was the standing
hypothesis when this came to Ops and it is wrong for this ticker.

**Scope — a class, but a narrow one.** Today: 55 `PARTIAL`, 14 `COMPLETE`, none
queued or stalled. **Of the 55 PARTIAL, 45 produced a fresh analysis today.**
RCON is one of the **10 that did not**. So `PARTIAL` is normal and usually still
yields analysis; the failure is narrower than "PARTIAL is broken", and the 10
are the population worth looking at.

**The first question.** RCON's job today ran `discoveryMode: RESOLVER`; its
08-20 job ran `DISCOVERY`. RESOLVER appears to depend on locating a durable
company source, and when it cannot it adds zero sources and stops at one model
call. A release distributed by a paid wire should not be reachable only through
an issuer newsroom URL. Whether RESOLVER should fall back to DISCOVERY on
`no durable company source located`, or whether wire coverage belongs on a path
that does not depend on issuer resolution at all, is Research's design call —
Ops is not going to specify it from outside.

**What Ops did not do:** no re-queue, no forced reanalysis. That is a live-data
action inside his trading window and it belongs to this thread, not to Ops.


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

### What Phase C would actually populate on the board, measured 2026-08-24

*Prompted by Design's Top-50 readout — "51 unknown" against a 51-row board.
Measured before the claim that Phase C fixes it hardens into a scoping decision.*

`filedShares` populates exactly where **research has run**, because
`SEC_COMPANY_FACTS` is collected per researched ticker and not per ranked symbol.
So coverage tracks rank steeply. Against ranked names on 2026-08-21:

| | current count (≤45d) | dated count | nothing |
| --- | --- | --- | --- |
| **Top 12** | 5 | 5 | 2 |
| **Top 50** | 16 | 12 | 22 |
| Top 200 | — | — | 147 have no count at all |
| all 2,821 ranked | — | — | only 201 have one |

**So at Top 50 this turns "51 unknown" into roughly 28 populated and 22 still
blank — not a filled column.** At Top 12, which is nearer the 7–10am working
set, 10 of 12 carry a count. Board-wide it is 7%.

**The 12 dated ones are not failures under the platform's own framing.** *"Supply
bounded at X, filed as of 2024-12-31"* is story; the date does the honest work
and the reader can discount it. What must not happen is those 12 being rendered
indistinguishably from the 16 current ones — that would be the signal-shaped
version of this, and it is why `asOf` ships beside the count rather than behind
it.

**And it is a supply bound, not a float.** It cannot make a *float* sort
meaningful, because it is not the quantity that sort is over. Whether a supply
bound deserves its own control is Design's and the trader's.

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

### Re-priced 2026-08-24: the consequence is on the board, not in a table

*Chain found by Integration, closed by Ops, verified here against the production
snapshot. I had this item filed as low priority on the wrong reasoning.*

**What I wrote was "ten stale rows nothing will pick up", priced as a refresh
rather than as coverage — on the CRGO/MYSZ pair, n=2.** That framing said the
consequence was invisible. It is not:

    Friday 22:00 ET recap queues 8 jobs  →  none ever claimed (started_at NULL)
    → never re-analysed → ensureDailyHistory never ran → the partial Friday bar
    never healed → readDailyBars now HIDES it → the series ends Thursday
    → a cycle computed one session stale, on today's board

Verified: all ten are `QUEUED` with `started_at` null — eight queued
`2026-08-22T02:00:06Z` on `INTERVAL_RECHECK`, plus CRGO and MYSZ from the 18th.
**Eight of the ten carry a stale tail.** `ADXN`, `LSTA` and `ZKH` each hold 101
bars, 100 finished, newest finished `2026-08-20` against a tape at `2026-08-21`,
and all three were on the board.

**It is not a short-series problem, and that is the part worth keeping.**
`resolveCycle` needs two bars and these have a hundred. The phase is computed on
*complete data that is one day old*. Short series is the plausible guess, it
would have looked right, and Design explicitly declined to guess — which is the
only reason the real cause was found two nights upstream in a queue nobody had
connected to the cycle column.

**My own fix is what made it visible**, and that is not an argument against the
fix. Before `ecb7a74` these symbols computed a cycle on a partial bar — a running
high and a part-day volume — which is worse. Hiding it was right. What the fix
did was move the silence from the data to the timestamp, and `163ef90` closes
that with `asOfTradingDate` on `CycleHistory`.

**Not an incident**: it self-corrects the moment each name is re-analysed for
any other reason, and all three were on the board, so likely the same morning.
**But the blast radius was mis-stated**, and the reason is worth more than the
correction: *n=2 was two rows from a date nothing else touched, so the sample
could not contain the consequence.* The pair generalised to ten, and the ten did
not behave like the pair.

**The health half is answered and shipped** — `a3464d8`, live on Ops's next
deploy. `publishHealth` counts `readJobsForDate(db, MAX(trading_date))`, so the
ten stopped being counted the moment the date rolled. **The number was never
wrong. It was answering a different question well**, and `stalledJobs` asks the
other one rather than blurring this one.

*The same scoping is in boot recovery — `readOrphanedJobs(db, bootDate)` — so a
row claimed and abandoned mid-job is requeued on the next boot ONLY if the
trading date has not rolled. Across a roll it is stranded permanently and
silently. Zero such rows exist today, which is why this is counted rather than
fixed.*

**The reason those ten sat unexamined for days is the part worth keeping, and it
is Ops's:** `queuedJobs: 0` was CORRECT, so nothing about it invited a check. **A
false number would have been investigated within the hour.** A correct number
answering the wrong question is the more expensive failure, because it survives
every review that a wrong one would not.

**Still open**, and the only part of this item that is: **why the jobs are never
claimed.** Everything else recorded here is downstream of that.

**One thing recorded as unresolved rather than assumed.** Design observed `NO RUN`
×3 on a 12-row board; Ops analysed 14 `NO_CYCLE` across 28 intelligence entries
and found 11 genuine, 3 stale. **Whether Design's three are the stale three or
three of the eleven is unknown** — different populations, and a 3 meeting a 3 is
exactly the coincidence that reads as confirmation. Nobody has asked the narrower
question and nothing operational turns on it.

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

### The deletion plan is a list of READERS

*Design found `worker/desk-assessments.ts:275` on 2026-08-24; it was named nowhere
in this plan. Enumerated properly here so step 3 is not a search.*

**`dossier?.cycle.X` guards only `dossier`.** With `cycle` deleted and `dossier`
present, `.X` is a TypeError, not a null — and `cycle: CycleFindings`
(types.ts:550) is **not optional**, so the compiler will not warn at the call
site. `?? null` never runs.

**`worker/desk-assessments.ts` has FOUR such sites, not one**, and `:239` fires
before `:275`:

| line | reads |
| --- | --- |
| 239 | `cycle.currentCycleHigh` |
| 240 | `cycle.historicalResistance` |
| 275 | `cycle.cycleClassification` |
| 308 | `cycle.cycleWarnings` |

The throw is inside `captureAssessment` **before** `insertAssessmentTickers`, so
the checkpoint's ticker rows are never written. It would fire for every ticker
carrying a dossier at every checkpoint. **`desk_assessments` is append-only and
begins 2026-08-17 — a deletion that turns every checkpoint into a recorded error
destroys the one category no run can buy back.** The writer must store the
computed phase **in the same commit as the deletion**, never after.

**Genuine dossier readers, by owner:**

| Owner | Site |
| --- | --- |
| Research | `worker/desk-assessments.ts` :239 :240 :275 :308 |
| Research | `lib/research/merge/sheetAuto.ts` :381 :384 — the cycle conflict comparison |
| Research | `lib/research/interpret/guardrails.ts` — the FIEE checks; they go with the fields |
| Research | `lib/research/interpret/pipeline.ts:404`, `worker/research-interpret.ts` — log lines |
| Design | `lib/dashboard/intelligence.ts:80` |
| Design | `components/AutomaticIntelligence.tsx` — giveback, formerRunner, majorRuns, warnings, resistance |
| Design | `components/TickerDrawer.tsx` — `recentMajorRuns`; **unverified** whether sheet or dossier |

**Not affected, and they look like they are.** `lib/data/rows.ts:178,180` are
Sheet *column indices* (`RESEARCH` 18 and 20). `lib/data/priceLevels.ts:547` and
`lib/data/cycleLevels.ts:177` read `StructuralResearch` — the Sheet's row, not the
dossier. A grep on field name alone reports all three as blockers.

**`components/TickerDrawer.tsx` is the FOURTH false positive**, resolved by
Integration and confirmed here. It types the prop `research: StructuralResearch |
undefined` (`:35`) — the Sheet's row — and `:708` reads `research?.recentMajorRuns
?? ''`. Ten of ten sites are now classified: six real, four false.

**Design's tell, which beats a type lookup: read the FALLBACK.** `?? ''` is a
string default. `StructuralResearch.recentMajorRuns` is a `string`
(`lib/data/types.ts:183`); the dossier's is a `string[]`
(`lib/research/types.ts:535`). A string default on the dossier's field would have
to be `?? []` and then joined. **The shape of the fallback identifies the source,
and unlike a type lookup it survives a grep** — it is visible on the matched line
itself.

**All four false positives are ONE collision, not four near-misses.**
`StructuralResearch` carries `cycleClassificationRaw`, `cycleState`,
`cycleReasoning` and `recentMajorRuns` within four lines of each other — the
Sheet has a full cycle vocabulary using the dossier's words. No grep on a field
name can separate them.

**And it cuts both ways.** Design's own cutover grepped for `cycleClassification`
and `conclusions.cycle` and missed three surfaces saying `ticker.cycle.display`.
It searched the dossier's names and missed the Sheet's; this inventory searched
by name and nearly reported the Sheet's as the dossier's. **Same collision,
opposite direction, both directions cost something.**

This is the desk's existing rule from the float work — *when two threads can each
be right about the same word, the word needs a companion column rather than a
footnote* — reaching a second pair. Here it cost search time instead of a wrong
number, which is the cheap version.

**The rule this produced, and it is general:** a field deletion is owned by
whoever deletes it, across every module that reads it, and **a deletion plan is a
list of readers rather than a list of writers.** This one was found by a thread
that owns none of the three files involved. **Build it by TYPE or by CALL SITE,
never by name.**

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

**16. `computedCycle` is gated behind an evidence check and should not be.**
*Shipped live in `161f15f` on 2026-08-24, found immediately after. Structural fix
deferred to a fresh session by Integration; no mitigation pass.*

`interpretTicker` returns on the reuse path at pipeline.ts:183 when the evidence
fingerprint is unchanged. `computedCycle` is assigned at :365, after the model
call. So:

- a name whose filings have not moved **never gains a cycle at all** — it reads
  CYCLE NOT ESTABLISHED indefinitely, not until re-analysis
- and for names that do re-analyse, the stored cycle **freezes at the last
  filing**. `STAK` would carry `DAY_ONE` from 24 July for the rest of that week.

**The defect is the gate, not the ordering.** A cycle position is derived from
price and moves every session; filings do not. Putting a price-derived value
behind an evidence-change check is wrong on its own terms, and I did it by wiring
it where the model's cycle used to live without asking whether that was the right
home for something computed from bars.

**The fix is to compute it at READ time, not to move the assignment.** It is a
pure function over daily bars — cheap, always current, and it should never have
been frozen into an append-only store. Design's surfaces keep reading
`dossier.computedCycle` unchanged provided the read path populates it.

Two boundaries the next session has to respect rather than discover: the read
path is `lib/market/store/researchRepo.ts`, which became **Ops's** in the
2026-08-24 split, and **Design** cut over to the field hours before this was
found.

**The consequence nobody had seen, and the reason this is an item rather than a
commit note.** Ops built a Monday instrument on this field — counting dossiers
carrying a `computedCycle`, 0 to 231, as a research progress meter, on the sound
reasoning that a heartbeat proves a process exists while this proves it is doing
work. With the defect, **flat at 0 is the expected reading of a healthy system**,
so its stalled condition would have been a false positive at 04:00 with every
other signal corroborating it. Retired before it ran.

That is the third observable in one day that could not distinguish the thing from
its failure, after the replay reporting 123 stable versions having made no model
calls, and a check that passed because the fixed and unfixed code render
identically at CLOSED phase. **Ask what makes a field appear before treating its
absence as signal.**

**A second defect found while checking the backfill, and it is worse than the
first because it does not self-heal.** `ensureDailyHistory` short-circuits when
`latestDailyBarDate(symbol) === today` (historyFetch.ts:32). A daily-bar fetch
during a live session can return a **partial bar for that session** — running
high, partial volume — which is then stored dated today. From that moment
`MAX(trading_date) === today`, so every later call returns *"already current"* and
**the partial bar is locked in for the rest of the day.** A corrective pass cannot
fix it; nothing refetches.

`resolveCycle` then treats an in-progress session as a completed one: relative
volume understated, a cycle start possibly missed, retracement measured against a
high that has not finished forming. So a single re-analysis during a session
poisons that symbol's daily history until the date rolls — **not one wrong
computation, a wrong session**.

`today` is computed in UTC, so the lock releases at 20:00 ET rather than at the
session boundary, which is its own small wrongness inside the same three lines.

**This is not specific to any backfill.** The live path has it: any interpretation
running during market hours can pin a partial bar.

**Ops escalated this to Monday-urgent and it is not next-session work.** Recorded
at `2830ca3` in [ops.md](ops.md); repeated here because a defect written up in one
charter and escalated in another is how a thread ends up the last on the desk
still reading its own item as deferred.

The reason is exposure, not code. `computedCycle` shipped in `161f15f`, so from
Monday's open every re-analysis of a moving name calls `ensureDailyHistory`, and
**no symbol holds a bar dated today, so every one fetches.** It was latent only
while nothing re-analysed mid-session with a cycle depending on the bars, and that
stopped being true the moment the cycle shipped.

**What decides the size is unverified and cannot be tested tonight:** whether
Alpaca returns a partial `1Day` bar during premarket. The market is closed, so a
call now proves nothing about 08:00 UTC. Ops explicitly declines to claim it
either way and so do I.

**A backfill does not inoculate against this.** Run before 08:00 UTC it stores
bars dated 2026-08-21, which is not today — so the guard does not short-circuit
and Monday's live re-analyses refetch exactly as they would have. The backfill
populates the column; it does nothing about the lock-in.

**Fixed 2026-08-24 in `952f9e1` and `e9e0a9e`. It was not preventive — the store
was already poisoned.** Ops checked read-only and I reproduced it from the
snapshot: **133 rows written mid-session**, and **42 of them are Friday's, being
every single symbol whose latest bar is Friday.** Not a latent defect after all;
one that had already fired 133 times.

**The first commit made it worse before it made it better, and the reason is
worth keeping.** Moving the cache test from `stored === today` to
`stored >= settled` protects a pre-existing partial: such a row is dated today,
so a date-only test skips it and keeps skipping while `settled` catches up.
Traced through an actual week, a partial Monday bar survives Monday evening,
Tuesday premarket and all of Tuesday's session — the exact window where it does
harm — where the `=== today` test it replaced would have refetched it Tuesday
morning.

**The date cannot answer the question.** A row dated today and written at noon is
a session in progress; the same row written after the session ended is complete.
Only `fetched_at` separates them, and it was already on the row. The cache test
now skips a bar only when it is **both** recent enough **and** finished — written
at or after its own session end — so a partial fails whatever date it carries and
`ON CONFLICT DO UPDATE` overwrites it. **The guard heals what it inherits rather
than only preventing more.**

**A limit on the `latestDate` discriminator, which is Ops's and should not be
rediscovered.** `CycleArc.latestDate` flags a cycle computed from a bar dated the
*current* trading date — an unfinished session, computed today. It says nothing
about a cycle computed from a bar that was unfinished **when it was captured**: a
partial Friday bar carries a prior date and reads clean. `e9e0a9e` removes the
case, but the stamp never covered it.

**And a new member of the family, from my own tests.** Four of the six guard
tests failed on the first run and the bug was in the *test*: the ET-to-UTC helper
formatted the hour as a string, so 22:00 ET became `"26:00"` and produced an
Invalid Date. It failed as a **wrong answer** rather than as a broken test. **A
test helper that cannot express the boundary it is testing** is the same defect
as an observable that cannot distinguish a thing from its failure, one level down
— and it is the level nobody reviews.


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

### Correction: the as-of hazard had no victim, and the archive is why

I told Integration the overlay mattered because **R&D's Q1 apparatus would have
been the first reader of a stored cycle and would have got today's bars
silently**. That is **wrong**, and it was wrong in the safe direction. Verified
here rather than taken on the relay:

`lib/archive/cycles.ts:26` imports `resolveCycle` directly and computes from
bars. `cycleAsOf(series, tradingDate)` bounds itself — `series.filter(bar =>
bar.tradingDate <= tradingDate)` at `:51`, then `:53` requires the last bar to
BE the requested date, so a gap returns null rather than a stale shape. **The
archive never reads `computedCycle` off a stored version.** It is not a reader,
so it could not have been the first one.

Confirmed independently: `computedCycle` has exactly two reads —
`lib/dashboard/cycle.ts:131` and `lib/dashboard/deskRead.ts:528` — and two
writes, `lib/market/readModel.ts:633` and `lib/research/interpret/pipeline.ts:365`.

**This makes the claim stronger, not weaker, and changes why the overlay is
right.** Not that it saved R&D from a silent look-ahead — nothing was exposed.
The as-of hazard was real as a *general property*: any read-time computation
replacing a stored value breaks the boundary for any historical reader. It had
**no current victim**. The overlay keeps the boundary intact for the first reader
that ever wants one, and `lib/archive/` is the worked example of what that reader
looks like — it already satisfies the constraint by computing from bounded bars
rather than trusting a stored field.

Ops's phrasing, worth keeping verbatim: **"that looked like a problem and is the
opposite."**

The general form: *naming a specific victim makes a hazard concrete, and a
concrete claim is checkable — which is how this got caught.* Had I written
"prospective, no reader today" the sentence would have been true and nobody
would have found that the strongest evidence for it was a module I had not read.

---

**17. The resolver re-ask leak does not exist. The bill is somewhere else.**

I filed "resolver re-asks cost money for issuers that never resolve" as an open
item on inference from the 4-of-74 resolution rate. Measured against the
production snapshot for 2026-08-19..21, it is **wrong**:

| RESOLVER calls for one ticker | tickers |
| --- | --- |
| 1 | 169 |
| 2 | 6 |

169 of 175 tickers were asked exactly once. The six repeats each fall on two
different days — precisely what a 24-hour negative cooldown permits. The cooldown
in `irRegistry.ts` works. **There is no re-ask leak, and I should have measured
before filing rather than after.**

**What the spend actually is:**

| stage | calls | input tokens | share |
| --- | --- | --- | --- |
| DISCOVERY | 216 | 7,862,324 | 56% |
| RESOLVER | 181 | 3,853,202 | 28% |
| INTERPRETATION | 312 | 2,024,072 | 14% |
| ESCALATION + RECOVERY | 19 | 246,683 | 2% |

**The desk spends 84% of its input tokens finding evidence and 14% reading it.**

**And discovery is not waste, which was my second wrong guess.** Attributing by
`metadata.discoveredBy` — an exact marker, not a time window — discovery bought
112 sources across 50 tickers. Against every `source_ids` array in
`research_analysis_versions`:

| path | sources | ever cited | |
| --- | --- | --- | --- |
| deterministic (free) | 4,770 | 1,772 | 37% |
| DISCOVERY (paid) | 112 | 62 | **55%** |

Paid sources are cited *more* often than free ones. Nor do repeat calls decay:
productive rate by ordinal runs 22%, 15%, 22%, 33%, 25%. **Capping repeats would
cut cited evidence roughly in proportion to spend.** The obvious fix is wrong.

*Limit, stated: **the attribution window is 5 minutes.** 36 of the 112 sources
did not match a call inside it, so the per-ordinal table rests on 76. The
citation table above does not depend on that attribution and is exact.*

*R&D's note, and it is right: this is the same shape as its own 30-session cap —
a source taking six minutes reads as unattributed exactly as a split 57 sessions
back reads as no split. **36 unattributed is a fact about a threshold, not about
the pipeline**, and the window belongs beside the number so nobody later reads
"outside what I looked at" as "did not happen."*

**So the lever is not frequency, it is depth.** A discovery prompt is ~254
tokens and a discovery call bills ~43,000; the retrieved page content is
essentially the entire price. `f46cfaa` wires `searchContextSize` into discovery
— it reached only the resolver — and leaves it unset, so nothing changes yet.

**What I am NOT doing: picking a value.** `low` vs `medium` trades catalyst
quality against roughly half the desk's model bill, and the audit's finding that
642 of 935 Sheet citations sit on never-collected domains says coverage is
already the weak side. That is a measurement, not a preference, and the honest
form is a live A/B with the ledger's `tool_config` distinguishing the arms.

**NOT a replay, and the word has now been wrong in both directions.** *Corrected
2026-08-24 after Integration caught me reintroducing it.*

`worker/research-replay.ts` replays **interpretation** from stored evidence.
`search_context_size` governs the **hosted web search inside discovery**, and a
web search cannot be replayed from stored evidence — it needs live calls. So
**design A is alternation on the live desk**, not a harness run.

That distinction decides which caveats attach, and they are opposite:

| | `research-replay.ts` | design A, live alternation |
| --- | --- | --- |
| makes new web-search calls | no | **yes — that is the point** |
| marginal token cost | interpretation only | **zero; the desk makes these calls anyway** |
| `ensureDailyHistory` runs first | **no, and correctly so** | yes, as production always does |
| bounds in the bundle | **understated where partials exist** | finished, like any live pass |
| the 08-20 `ticker_session` hole | must exclude it | not in the window |

**So neither the bound caveat nor the 08-20 exclusion applies to design A**, and
both apply to anything built on the harness. I stated the opposite once in each
direction on 2026-08-24; the reason it was easy is that "replay" reads as *any
controlled re-run*, and this desk has two kinds. **Name the harness, not the
word.**

**The outcome variable is CITATION RATE, not catalyst quality** — R&D's call and
it settles a problem I had not solved. Quality needs a grader, and this desk's
grader is 45% irreproducible, so a quality comparison would measure the grader.
Citation is countable and exact, and the 55%-against-37% above shows it already
discriminates between two collection paths. **Low against medium on cited-source
rate decides it with no model judging a model.**

**Which it could not have done until `f46cfaa`.** Discovery's `toolConfig` was
the hardcoded literal `web_search:default` — the column that exists to tell two
configurations apart returned one string for every call ever made. The resolver's
was dynamic, so the ledger looked populated for both. **The existing test
asserted the constant and passed**, in a file whose header says a ledger without
the configuration cannot tell a saving from a coverage loss. Another observable
that could not distinguish a thing from its failure.

**One asymmetry I looked at and am leaving alone.** An unresolved ticker
rechecks every 10 minutes, a resolved one every 30 — the desk pays three times
as often for the names it knows least, and nearly everything is unresolved.
That reads like a defect and the yield data says it is not: repeats stay
productive. `collector.ts` already defends it in a comment, on XOS, whose Air
Force release arrived on an interval pass months after the resolver gave up.
Recorded so the next person does not re-derive it as a saving.

---

**18. Two definitions of a finished bar, and only the writer had one.** *Closed
at `ecb7a74`. Found by Integration, from Ops's post-deploy note beside my own
overlay — a seam between two of my commits four apart on the same night.*

`ensureDailyHistory` refuses to STORE a bar written before its own session
ended. `overlayLiveCycle`, the evidence bundle and the interpretation pipeline
all computed from **whatever was stored**. One definition in the write path,
none in the read path.

**The failure is not staleness.** 42 symbols hold a partial *Friday* bar. From
Monday's open the board renders before those symbols are re-analysed — board
render and re-analysis are independent — and a partial bar for an **ended**
session is understated volume and a high that never finished forming, read as a
completed session. **The date is honest and only the contents are not**, so a
latest-date discriminator cannot see it.

**Fixed in `readDailyBars`, not in the overlay.** Fixing the overlay would have
left the bundle and the pipeline on the old behaviour — two definitions becoming
four. All four callers now inherit one.

**Measured before choosing, because the obvious fix had a way to be wrong.**
Filtering is only safe if unfinished bars sit at the tail; a gap mid-series
moves `dailyRvol`'s 20-session baseline with no tell. All 133 partials in
production and all 49 locally are their symbol's latest bar, one per symbol,
**none mid-series** — and that is structural rather than lucky, since a bar can
only be written unfinished on the day it is newest and any later fetch heals it.
So this truncates and cannot punch a hole. It also re-queries when the filter
drops rows, so a caller asking for 20 sessions does not silently get 19.

**Two things the tests said that I did not expect to hear.**

The null-`fetched_at` branch **could not be written as a test**: the column is
`NOT NULL` and holds no nulls in either database. An untestable branch is a
branch guarding a condition that cannot arise, so it went. The *reachable*
failure is an unparseable stamp — the column is `TEXT` and nothing constrains
its shape — and that is tested instead.

And **an existing fixture was itself a partial bar**, stamped `12:00Z` on its own
trading date, which is 08:00 ET. The as-of test using it passed while proving
nothing, because the bar it asserted was invisible had been invisible for the
wrong reason. Restamped after session end. *A fixture that accidentally
satisfies the thing under test is the same species as an observable that cannot
vary — it passes, and it is not evidence.*

**The framing, which is Integration's borrowed back from my own guard:** one
concept doing both jobs, because they are the same question asked twice. It
turned out to be asked **four** times, and three callers never got the answer.

---

**19. `ticker_session` has a hole on 2026-08-20, and it bounds any
`research-replay.ts` run over that window.** *Observed 2026-08-24 while checking a claim of my own that turned
out to be wrong. Not Research's table — routed to Integration. Recorded here
because it constrains this thread's own replays.*

| trading_date | rows | ranked | % ranked |
| --- | --- | --- | --- |
| 2026-08-17 | 8,613 | 2,821 | 32.8 |
| 2026-08-18 | 8,625 | 2,736 | 31.7 |
| 2026-08-19 | 8,653 | 2,797 | 32.3 |
| **2026-08-20** | **4,165** | 2,787 | **66.9** |
| 2026-08-21 | 8,688 | 2,821 | 32.5 |
| 2026-08-24 | 8,653 | 0 | 0 |

**4,452 symbols present on both 08-19 and 08-21 have no 08-20 row at all.** The
*ranked* count is normal — 2,787 against ~2,800 — so ranking ran fine over what
was there and the shortfall is the unranked tail. **178 of the missing were
ranked on an adjacent day**, so a small number of names the desk was actually
watching have a one-day hole.

**Why it matters here rather than only to capture:** any per-symbol series across
17–21 August has a gap in the middle on the 20th, and this thread has now been
caught once by exactly that shape — a gap mid-series moves a windowed measure
with no tell. The `search_context_size` replay in item 17 would run over this
window. **It must either exclude 08-20 or state that it did not.**

*Cause not established and not chased. `ticker_session` capture is Ops's, and
`mointel-market` must not be interrupted.*

**Also: 2026-08-24 carries 8,653 rows with 0 ranked**, which is the normal shape
for a date that has been seeded but has not traded. Recorded because I asserted
the opposite to another thread without checking, and the file that disproved it
had been open in front of me all evening.

---

**20. The three facts the model question needs, and the input-only view is
misleading in a specific way.** *Asked by R&D through Integration 2026-08-24.
Answered from `model_usage`, 2026-08-19..21.*

| stage | calls | input | cached | output | out/in |
| --- | --- | --- | --- | --- | --- |
| DISCOVERY | 216 | 7,862,324 | 8.5% | 184,774 | 0.024 |
| RESOLVER | 181 | 3,853,202 | 14.1% | 144,436 | 0.037 |
| INTERPRETATION | 312 | 2,024,072 | 12.9% | 547,171 | **0.27** |
| ESCALATION | 14 | 172,298 | 4.2% | 51,243 | 0.30 |
| RECOVERY | 5 | 74,385 | 12.1% | 3,136 | 0.042 |

**R&D was right that input-only can be wrong by a wide margin, and here it
reorders the stages.** Weighting output at 5× input:

| | input only | input + 5×output |
| --- | --- | --- |
| DISCOVERY | 56% | 47% |
| RESOLVER | 28% | **25%** |
| INTERPRETATION | 14% | **26%** |

**Interpretation overtakes the resolver.** The input-only view understates it by
nearly a factor of two, because interpretation is the only stage that *writes* —
0.27 output per input against discovery's 0.024, an 11× difference in shape.

**Caching cannot swamp the comparison, and the reason matters more than the
number.** R&D's concern was that a stable prefix priced at ~0.1× would dominate
any per-token difference between providers. Measured: **8.5% on discovery, 10.6%
overall, and the largest cached prefix on any discovery call is 4,951 tokens
against a 36,399-token average.** The authored prompt is ~254 tokens, so the
cacheable part is the tool and schema preamble and nothing else. **The 36,400
tokens are retrieved page content, unique to each call and inherently
uncacheable** — there is no stable prefix to cache, and a provider swap cannot be
credited or blamed for one.

So the instrument does not swamp the effect here. It is still the right question
to have asked; the answer is just that this particular confound is absent.

**The resolver DOES depend on provider-hosted web search.** `worker/research.ts:114`
injects `OpenAiCompanySourceResolver`, which sends `tools: [{ type: 'web_search' }]`
— same file as the discovery provider, which is why one grep of `lib/research/`
finds a single file and undercounts the dependency. **So the resolver's share
joins discovery's category: 84% of input, or 72% output-weighted, is
search-dependent.**

**And `RESEARCH_RESOLVER_SEARCH_CONTEXT` is NOT a dead knob.** Both it and
`RESEARCH_DISCOVERY_SEARCH_CONTEXT` are consumed at `worker/research.ts:120` and
`:110`. The grep that suggested otherwise covered `lib/`; the consumer is in
`worker/`. *Worth keeping as a near-miss: the evidence for "this configuration
does nothing" and the evidence for "I did not search where it is used" look
identical from inside the search.*

---

**21. Deep history: the cost, measured. His trigger makes the safe design the
cheap one.** *Scoped by the trader 2026-08-24; costed here, not designed.*

**THE TRIGGER RATE IS 3%, AND THAT IS THE WHOLE ANSWER.** Under top-10-by-RVOL,
across 2026-08-14..21:

| | |
| --- | --- |
| new names entering the top 10 per session | **9.5 of 10** — near-total turnover, so a cache amortises nothing |
| of 60 top-10 slots, above their stored 90-session ceiling | **2** (`NTWO`, `BTCT`) |
| deep fetches actually needed per morning | **~0.4** |

**97% of the time the desk already holds a bar that disproves blue sky, so no
deep fetch happens at all.** The two that trigger are `NTWO` at 11.80 over 10.74
and `BTCT` at 1.77 over 1.48 — and `BTCT` is the name he reported, so the trigger
fires on exactly the case that prompted it.

**COST PER FETCH IS ONE CALL.** `AlpacaRestClient.getBars` already paginates —
`do { … } while (pageToken)` at `rest.ts:202` with `limit: 10000` — so ten years
of daily bars, ~2,520 rows, returns inside one page. No new infrastructure and no
paging to write.

**STORAGE IS NOISE.** Measured through `dbstat`: `daily_bars` is 3,006,464 bytes
over 24,429 rows = **123.1 B/row**. Ten years is ~310 KB per symbol. At 0.4
fetches a morning that is roughly **31 MB a year**. Even deep-fetching every new
top-10 name daily lands near 465 MB.

### The split-basis problem costs nothing, if the windows are not decoupled

**35% of researched tickers carry a `reverseSplitHistory` entry** (80 of 231),
and R&D measured 33.5% of symbol-dates on a pre-split basis. A walk back through
years on a small cap meets a split about a third of the time.

The desk is safe today only because **the fetch window and the retention window
are the same ninety sessions**, so every fetch rewrites the whole stored range
and a split self-corrects. `adjustment` is a literal, so the guard that should
catch a mixed basis cannot fire.

**So do not decouple them. Refetch the full depth on every deep check.** That
keeps the coincidence that protects the desk today and makes it deliberate, and
it is affordable *only* because the trigger rate is 3%. **His scoping is what
makes the correct approach the cheap one.**

### The early exit is unnecessary, and it was the dangerous part

His exit condition is sound — the first prior bar above price ends the question.
But it exists to avoid a cost that does not exist here: **one call returns the
whole history, so every bar is in hand and the ceiling falls out for free.**

That dissolves two costs Integration raised. The early exit yields a boolean
where the ladder needs a level — moot, we have every bar. And splits terminate
the walk falsely, stopping at a pre-split artifact and reporting it as the
ceiling — **which was the sharpest objection, and it disappears with the
mechanism.**

*Was unverified. Probed and confirmed below. It is the one assumption in this: that Alpaca serves ten years
of daily bars on this account's plan. Everything above is measured; that is not,
and it wanted one probe before anyone built.*

### Probe result, 2026-08-24 19:xx ET — and it changes the design

**The plan is not the limit.** `AAPL` returned **2,513 rows, the full ten years**,
in 701ms. `BTCT` returned 1,608 (6.4y) and `NTWO` 414 (1.7y) — **those are their
listing histories, not a cap**, which is exactly what the control was for. The
one unverified assumption in item 21 holds.

**But depth alone produces a number nobody can use.** `BTCT`, split-adjusted:

| lookback | ceiling |
| --- | --- |
| the desk today, 90 sessions | **$1.80** — reads as blue sky |
| all history, 1,607 sessions | **$14,249.94** on 2020-03-31 |

That 2020 bar **traded four shares** and is arithmetically correct: BTCT is a
serial reverse-splitter, so adjusted history is an exponential decay — 14,249 →
1,164 → 160 → 3.80 → 4.91 → 5.55 → 1.70 by year.

**A liquidity floor does not rescue it.** Dollar volume is the split-invariant
measure (a reverse split multiplies price by N and divides volume by N, so
`close × volume` is unchanged), and even at a **$25M** floor the ceiling is
**$2,561.94**. Those sessions genuinely traded. The prices are real and
economically irrelevant, because the shares that traded at them were consolidated
out of existence.

### Split dates are recoverable exactly, from price data alone

Fetch the same window twice, `adjustment: 'raw'` and `adjustment: 'split'`. The
ratio `split ÷ raw` is the cumulative factor still to apply from that date, and
it **steps at each split**. `BTCT`:

    2022-05-06   factor 600 -> 20    1-for-30
    2023-08-24   factor  20 -> 1     1-for-20
    cumulative today: 1.0000, and 30 x 20 = 600 checks out

**No model, no prose, no corporate-actions endpoint.** This is the deterministic
version of the thing `float.ts` refuses to do from `reverseSplitHistory`.

### So the lookback boundary is the most recent reverse split

| BTCT, current high $2.75 | ceiling |
| --- | --- |
| desk today, 90 sessions | $1.80 — **blue sky, wrongly** |
| **since the 2023-08-24 split, 751 sessions** | **$26.58 on 2024-11-13** |
| since the 2022 split | $48.80 |
| all history | $14,249.94 |

**$26.58 is the answer.** Two years of post-consolidation history, shares that
still exist in that form, and **ten times the current price** — so the trader's
*"this is not bluesky territory"* was right, and by an order of magnitude.

**Three things this closes at once.** The lookback never spans a split, so the
mixed-basis hazard largely evaporates; the cumulative factor is the **basis
stamp** the `adjustment` literal was supposed to be; and `filedShares` can now be
split-adjusted deterministically, which is the `EBON`/`ZOOZ`/`ICCM` problem.

**Cost impact: two calls per deep check instead of one.** At 0.4 checks a
morning that is still nothing.

---

**22. Why the recap jobs are never claimed. Item 2's last question, answered.**
*Diagnosed 2026-08-25. Not fixed — findings first, per Integration.*

**The worker claims for ONE trading date and that date only ever moves forward.**
`worker/research.ts:251` computes `tradingDate = MAX(trading_date) FROM
ticker_session` fresh each cycle, and `claimQueuedJobs` filters
`WHERE trading_date = ? AND status = 'QUEUED'` with no other condition. Nothing
ever lowers `MAX`. **A job not claimed before the date rolls is unreachable
forever** — there is no path back to it, no sweep, and no error.

**The 22:00 recap queues on the wrong side of that door.** It enqueues with
`tradingDate: scheduled.tradingDate` — the session it is summarising, `D` — at
the end of `D`.

**Proved on the 2026-08-17 batch, which is the clean case.** Eight jobs, ids
41–48, all queued at the same instant, all priority 0, so `ORDER BY priority
DESC, queued_at ASC, id ASC` makes it a straight run through the ids:

| ids | claimed |
| --- | --- |
| 41, 42 | 02:00:19.968Z |
| 43, 44 | 02:02:05.048Z |
| 45, 46 | 02:02:34.213Z |
| **47, 48** | **never** |

Pairs, because `DEFAULT_CONCURRENCY = 2`. **The worker was alive, was claiming,
and stopped mid-batch** — which rules out the desk being down and rules out
anything about those two tickers. They were simply next when the door shut.

The next claim for any date is `2026-08-18T08:00:00Z` — **04:00 ET, premarket** —
and it is for `2026-08-18`. So the roll happened during the gap and there was no
work for the new date until the board qualified names six hours later.

**The counts follow: 2 stranded of 8 on 08-17, 8 on 08-21, 6 on 08-24.** Not a
fixed number — whatever remained in the batch when the roll landed.

*Limit, stated: I could not observe the `ticker_session` seed time directly.
`updated_at` is overwritten on every write, so `MIN(updated_at)` is the earliest
LAST write rather than the insert. The roll time is inferred from claim
behaviour, which is strong but indirect.*

**Two shapes worth keeping.** The queue is a one-way door with no dead-letter
path, so its failure is silent by construction — the same family as
`queuedJobs: 0` being correct and scoped. And a batch queued at the boundary is
a **race whose loser is permanent**, which is why it recurs nightly rather than
converging.

---

**23. Derived float: coverage and cost. Scoping only.** *Asked by Integration
2026-08-25 after the trader said go. Measured, not designed.*

**The hypothesis was that small caps would have little ownership data, making
this narrow. The opposite is true.** Sampling 40 researched issuers' SEC
submission indexes:

| | issuers with it |
| --- | --- |
| **Any Form 3/4/5** | **39 of 40 — 98%** |
| Any 13D/13G | **28 of 40 — 70%** |
| SC 13G | 70% · SC 13D | 50% |

**So the derivation has plenty to subtract on nearly every name.** It is not
cheap-and-narrow; it is a real parsing problem across the population.

**Volume, from 30 issuers:** median **12** 13D/G and **14** Form 3/4/5 all-time,
max 764 on one name. Restricted to the **last 12 months** — which is what a
CURRENT holdings picture needs — the median is **8** ownership filings and the
max 45.

**Fetching is not the constraint.** ~10–15 documents per issuer for current
state, so a 231-ticker backfill is roughly 2,500–3,500 requests: about six
minutes at SEC's 10/second. **`FAMILY_POLICIES.OWNERSHIP maxFetch: 1` is the
only thing stopping it, and zero ownership forms have ever been collected** —
not one Form 3, 4, 5, 13D or 13G across 231 researched tickers.

**The cost is PARSING.** Forms 3/4/5 are XML `ownershipDocument` and yield to
deterministic extraction. 13D/13G cover pages are the harder half and the place
where an estimate would start creeping in.

**Which is the argument for Integration's instruction rather than a caveat on
it:** store filed shares, insider holdings, 13D blocks and 13G blocks as four
numbers each with its own source and date, and let "float" be whichever
subtraction someone asks for. The trader said he does not know what a passive
13G block means for float — **storing the components is what stops that question
having to be answered before anything ships.**

---

**24. `stalledJobs`'s predicate is not importable, so its tests cannot fail with
it.** *Disclosed in `2906a59` rather than discovered later. Small, unowned, no
clock.*

The query lives in `worker/research.ts`'s `publishHealth`, which is a process
entry point. `tests/research/stalledJobsScope.test.ts` therefore **reproduces**
the predicate instead of importing it — so the five tests pin the BOUNDARY and
would not fail if someone edited the worker's copy.

That matters more than it looks, because the boundary is the whole point: `<`
rather than `<>` is what stops the field reporting the recap fix as the disease.
A future edit could restore `<>` and every test would stay green.

**The fix is to lift it into `lib/market/store/researchRepo.ts` beside the other
job queries** and have both the worker and the tests call it. Kept out of
`2906a59` deliberately — that commit had a same-day deadline and a refactor
riding inside a deadline change is how the deadline gets missed.

*Stated in the test file too, so five green tests are not read as covering the
worker.*

---

**25. Newswire poll: the scoping. A deterministic path to RCON's release does
not exist on public endpoints.** *Asked by Integration 2026-08-25 after the
trader chose the poll over the resolver fallback. Probed read-only; nothing
built.*

### What each wire actually offers

| wire | per-ticker or per-company feed? |
| --- | --- |
| **GlobeNewswire** | **YES** — `/RssFeed/keyword/{term}`, valid RSS, robots-permitted. 20 items on a busy term, 0 for `RCON`. |
| **PR Newswire** | **NO.** `llms.txt` names only chronological and topical streams. Per-company pages are HTML behind a name→slug lookup. |
| Business Wire | RSS requires an opaque per-feed token. |
| Newsfile, Accesswire | no public feed at the documented paths (404). |

**RCON's release was on PR Newswire** — the one wire with no per-company feed. So
the case that prompted this is the case the clean mechanism does not cover.

**The chronological PRN feed is polleable but carries no ticker.** 20 items
spanning **7 minutes**, so a poll must beat that or items are silently missed
(~4,100 releases a day). Matching would be **company name against title**, with
nothing to disambiguate — Q3's collision problem with no ticker to resolve it.

### The aggregator looked like the answer and is rate-limited

`stocktitan.net/news/{TICKER}/` is ticker-keyed, covers every wire in one
request, is permitted by robots (`/news/` allowed, `/search` disallowed), and
carries `datetime="2026-08-25T12:00:00.000Z"` — **RCON's release, exact to the
second**. It satisfies every requirement including the mandatory timestamp.

**It returned HTTP 429 after two requests.** A per-ticker poll of even the top 12
is a 12-request burst. **Not viable without an agreement or an API**, and I
stopped probing rather than characterise someone's rate limit by exhausting it.

*So coverage — Q5, how many of the 177 have a wire presence — is UNMEASURED. The
sample returned 2 of 12 and that is a throttle artefact, not a finding.*

### Trigger cost, which the mechanism decides rather than the other way round

| trigger | population per session |
| --- | --- |
| `qualified` | **~2,800** |
| top 50 | 50 |
| top 12 | 12 |

Per-ticker polling on `qualified` is ~200,000 requests a day and is out on
volume alone. Firehose polling is **population-independent** — one request per
interval regardless — so the earlier trigger is free under a firehose and
impossible under a per-ticker poll. **The mechanism decides the trigger; costing
them separately was the wrong shape and that is my correction to make, not
Integration's.**

### What this means

**A deterministic, public, ticker-keyed newswire poll covering RCON's case does
not exist.** The options that do:

- **GlobeNewswire keyword RSS only** — clean, cheap, deterministic, and misses
  PR Newswire, which is where today's release was.
- **PRN chronological firehose plus name matching** — covers PRN, population-free,
  and matches on title text with no ticker.
- **A commercial wire feed** (Cision/PRN and GlobeNewswire both sell one) — the
  only route that is both deterministic and ticker-keyed. **Not free, and that
  is a decision rather than an engineering task.**

**The constraint holds under all three:** a polled item is EVIDENCE and never a
`companySource`. None of these touches `classifyCollectionPoint`.

### Superseded 2026-08-25: the trader supplies the headlines instead

**Nothing above was built and this is why.** He decided to supply headlines for
every board name from his own news service — the one he reads in Scanz — and
have the desk track them against what it found on its own. **No wire
integration, no resolver fallback, no spend.**

**So item 25 is a measurement waiting on data rather than a dead end.** A reader
finding a costed integration here should know it was not abandoned on cost: it
was overtaken by a cheaper way to answer the question underneath it.

**The question underneath it, in his words: "the majority of them do not have
news."** If that is right, every option costed above was solving the wrong
problem — GlobeNewswire RSS, the PRN firehose, a commercial feed and the
`+19%`-to-`+41%` resolver fallback all assume there is a release to find. **His
feed tests that against real board names**, where my own coverage sample died on
a `429` after two requests and went into this item as UNMEASURED.

**What the tracking must capture, recorded before any of it exists.**

**Ticker and publication timestamp, and nothing else.** Asking for less is what
gets it supplied daily. The timestamp because an old release must not present as
today's catalyst, and a headline with no time cannot be placed against a session.
If the wire name is ever needed, derive it.

**The desk's own state AT THAT TIMESTAMP** — Integration's addition and the one
that turns a tally into a diagnosis. Four outcomes, and only the first two are
coverage:

| what the desk held when his headline published | |
| --- | --- |
| nothing, and never found it | **coverage failure** |
| nothing then, found it later | **latency failure** |
| found it, graded it low | judgement, not coverage |
| found it, but the board showed an older dossier | plumbing |

**RCON IS THE LATENCY CASE — SETTLED BY OPS 2026-08-25, TWO HOURS.**

    08:00 ET  PR Newswire release
    08:04 ET  detected, ENTERED_TOP_N. RESOLVER's turn. Re-asks a six-day-old
              recorded no. sourcesAdded 0, no new version.
    09:00 ET  he is watching it: rank 7, +24%. Board reads CATALYST UNKNOWN.
    10:01 ET  FRESH_FOUND, NEWS_DRIVEN, LEGITIMATE_POSITIVE, HIGH, explains=true.
              eventTimestamp 12:00:00Z -- the wire minute exactly. Sources 10 -> 13.

**The alternation did not prevent the answer. It delayed it by two hours** — and
the very next eligible pass ran `DISCOVERY` and got it in one call. **The single
paid call went to the wrong tier on the only pass that mattered.**

*That is a worse finding than coverage, not a lesser one.* A name entering top N
on a wire release is exactly where the rotation is most likely to be mid-cycle
and least able to afford a wasted pass — **the gate is latency-generating
precisely on the names that are moving.**

**And it sets a bar the structural answer has to clear.** The `DISCOVERY`
fallback WOULD have fixed RCON, since the resolver reported no durable source on
that same pass. So the expensive option is the one demonstrably known to work,
and *"wire coverage decoupled from issuer resolution"* must now match its
**latency**, not merely its coverage: an answer within minutes of the wire, not
within the next eligible pass.

**What I got wrong, and it is worth separating from what I got right.** I filed
RCON as latency on no evidence, Integration caught it, and I retracted to
unsettled. **The retraction was the correct move and it happened to point away
from the correct answer** — ruling out `never looked` genuinely was not evidence
for `found it later`, and the fact that it turned out to be `found it later`
does not make the original guess sound. The lesson survives the outcome. What is established is that the pipeline fired at 08:04 — four
minutes after an 08:00 wire — ran `RESOLVER`, and returned zero sources. **That
rules out `never looked`. It is not evidence for `found it later`**, which
requires a later pass to have actually picked the release up. If none ever does,
RCON is a coverage failure arriving through a mechanism that fired on time.

*Caught by Integration. It is the same shape this thread has been naming in other
people's work all week: **an observation that rules out one cause is not evidence
for a specific other one.** Settled by one question — is RCON's newest analysis
still `2026-08-19T11:58:05Z`? — asked after the session rather than during it,
because during it the answer is only "not yet".*

**And record WHEN it was found, not whether.** Found at 08:10 and found at 15:00
are both "later", and only one of them was any use on a name he was watching at
09:00.

**Keep the collector reports.** The whole distinction above exists only because
`{"discoveryMode":"RESOLVER","modelCalls":1,"sourcesAdded":0}` was recorded per
job. Without it, a lookup that fired and came back empty is indistinguishable
from one that never ran — and the investigation goes hunting a feed that was
working.

**A gap in the feed must read as a gap, never as a clean week.** This is a manual
feed and manual feeds thin out; that is not a criticism of him, it is what they
do. So **what he supplied and what he supplied nothing for are recorded
separately** — otherwise a quiet week flatters the desk, which is the
correct-but-narrow-number failure this thread has now hit three times.

**It must mean something at n=20**, not require a month before it says anything.

### The rotation's real defect: 51% of resolver turns spend nothing and achieve nothing

*Found while scoping Integration's fix shape, 2026-08-25. Larger and cleaner
than RCON, and measured rather than reasoned.*

`collector.ts:788` stamps the turn as spent **unconditionally** — outside the
`try`, after the resolver branch, regardless of whether a model call was made:

    registry.lastDiscoveryAt   = now.toISOString();
    registry.lastDiscoveryMode = 'RESOLVER';

So when the 24-hour negative cooldown inside `resolveCompanySources` fires and
returns `reused stored negative result` at `modelCalls: 0`, **the pass is still
consumed and the interval clock still restarts.**

**Measured across stored collector reports:**

| pass outcome | count |
| --- | --- |
| DISCOVERY, made a call | 387 |
| **RESOLVER, made NO call** | **130** |
| RESOLVER, made a call | 123 |
| no discovery mode | 84 |

**130 of 253 resolver turns — 51% — spend nothing, learn nothing, and cost a
pass.** The cooldown saves the money and keeps the delay, which is the wrong half
to save: on a name that is moving, the pass is the scarce thing.

**So Integration's fix shape is necessary and not sufficient.** *"Do not spend
the paid call re-asking a question with a recent recorded negative"* is already
true — that is what the cooldown does. **The missing half is that a resolver turn
which makes no call must not consume the pass**; it should fall through to
`DISCOVERY` in the same run rather than deferring it by a full interval.

**A LIMIT ON THE RCON CHAIN, stated because the mechanism is tempting and
unproven.** RCON's 08:04 pass DID make a call — its negative was six days old, so
the cooldown had expired. The next pass ran `DISCOVERY` and answered
immediately, **but the gap was ~117 minutes and the unresolved discovery
interval is 10.** So the two-hour delay is **not** explained by the interval
reset alone; it depends on when the next job was queued for RCON, which is board
cadence and not visible in this thread's snapshot. **The rotation put the call on
the wrong tier — that is established. That the rotation caused the full two hours
is not.**
