# Thread: Research Pipeline

**Owns what the desk knows and what it pays to know it.** Evidence collection,
source resolution, the interpreter, dossier quality, and the OpenAI bill.

Last worked: **2026-08-27**. See **LIVE STATE** below before anything else.

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

## LIVE STATE — handover, 2026-08-27

*Written by the session retiring on low context. Everything below is what a
fresh Research session needs in order to act without asking me anything. If it
is not here it is not anywhere: I am not available to be asked.*

### Built and pushed — the first two rows are now LIVE

**Production is `97f5fbd`, deployed 2026-09-03 05:10 UTC** (Ops's record, its
own charter). **`3379809` and `268e438` are in it**, verified by ancestry here
rather than taken from the message. The table's old heading said *none are
deployed*; that was true when written on 08-27 and is the exact shape of a
stale opening line, so it is corrected rather than annotated.

| sha | what | gate |
| --- | --- | --- |
| `4ac30b5` | **re-trigger** — a dossier of any age no longer answers for this session | queued behind Ops's item **0f** |
| `9cf8872` | **rotation** — a resolver turn that made no call no longer burns the pass | ancestor of `4ac30b5`, same bundle |
| `dec0dd9` | **stalled-job retirement** — non-terminal jobs before boot marked `STALE` | already on origin, rides beneath |
| `bc15588` | **supply pair** — floor/total with the basis guard. **Inert until the backfill runs** | NOT in the `4ac30b5` bundle; next window |
| `664fdb7` | thread items 32–34, documentation only | n/a |
| `3379809` | **basis-fetch decoupling** — `basisFetchDue`, full-depth factor read, coverage-boundary refusal, `worker/basis-backfill.ts` | **LIVE in `97f5fbd`.** Behaviour NOT yet verified — see item 36 |
| `268e438` | **float-source content check** — `FLOAT_TERMS` over the field, not `Boolean()` | **LIVE in `97f5fbd`** |

**The four 08-27 rows above are on `origin/main`; check Ops's charter for which
of them rode the same bundle rather than assuming from this table.** The
no-deploy-until-0f freeze is **over**: 0f went live at `7f4aa91` and the
six-piece bundle followed at `97f5fbd`.

**The trader approved `4ac30b5` + `9cf8872` on a reason I gave him that was
false** (see item 33). He re-confirmed on the corrected facts. That approval is
good; do not re-litigate it.

### Pending decisions, and who holds each

| decision | holder | state |
| --- | --- | --- |
| **basis-fetch decoupling** | **LIVE** `3379809` in `97f5fbd` | approval was the trader's 2026-08-27 yes, relayed late. **Two things I said about it were wrong — item 36.** The v22 gate does not exist (production was already 22), and the 462 calls are being spent by the LIVE WORKER, not by the backfill Ops was asked to price. |
| `guardrails.ts:344` content check | **BUILT** `268e438`, 2026-09-02 | the trader's approval arrived via Integration the same day. The field's content now takes the same `FLOAT_TERMS` test as the excerpt. |
| deterministic float extractor | **PARKED** (trader, 2026-09-02: "park, but let's put it where we should") | scoped, unbuilt, 19 tickers. **Unparks with the derived-float decision, or when Q9's validation needs ground truth once capture data accumulates. Prerequisite first build when it wakes: the fixture set from R&D's recorded extraction traps** — three parsers disagreed across the whole plausible range, which is the argument no assertion can make. |
| Q9 capture build | Ops's schema gate | scoped, riders below |

### The basis fetch — the design, so you do not have to re-derive it

`bc15588` renders on zero rows because its basis check needs a per-session split
factor, and those exist only where `ensureDeepHistory` has run.
`deepHistoryDue` gates on **rank ≤ 10 AND a price above every stored high** — a
blue-sky breakout. Replayed over every stored ticker-session on the 08-23
snapshot: the gate would ever fire for **11 symbols**, 2 of which hold a
dossier, and **0 of the 55 rows that would render a pair.**

**The fix: decouple the dual-adjustment fetch from the blue-sky gate.** A basis
fetch should run once for any *researched* ticker; keep the blue-sky deep fetch
exactly as it is. Cost is **~231 symbols × 2 daily-bar REST calls**, one-off,
then only new names — splits are rare enough that it is close to once per ticker
forever. **Alpaca calls, not model calls.** Ops prices the volume before it runs.

**Do not weaken the guard to make the number appear.** The whole point is that a
wrong basis is invisible at 150%: 45.5% of rows in the 100–200% band carry a
reverse split and still look plausible.

**EXECUTED 2026-09-02, `3379809`, with two riders the design turned out to
need — both measured before building, neither weakening the guard:**

- **The pair reads its factors at FULL stored depth, not from the 90-bar cycle
  window.** The dates the basis check compares are filing dates, and on the
  08-23 snapshot **122 of 239 dated supply blocks (block-denominated) — and
  every dated block on 98 of 157 block-holding tickers (ticker-denominated) —
  sit beyond that window**; the filed denominator's median age is 82 days with
  39% over 180 (item 14's measurement). Factors clipped to the cycle window
  would hand the guard nulls for exactly the operands the fetch was approved to
  make comparable. `readSplitFactors` in `lib/research/history.ts`, `asOf`-
  bounded like the cycle bars.
- **`computeSupplyPair` refuses to extrapolate a factor past the series end.**
  `splitFactorAt` falls back to the nearest EARLIER session — right inside the
  series, wrong past its end: an operand dated after the last covered session
  would inherit that session's factor, and a split in the gap would make two
  incomparable operands read as COMPARABLE. Beyond coverage is
  `BASIS_UNVERIFIABLE`: a wrong answer becomes a missing one. Consequence a
  successor should expect rather than rediscover: **an established basis decays
  for actively re-analysed names** — operands dated after the establishment
  fetch go unverifiable, visibly, in the exclusion reasons. The honest fix if
  it starts to bite is a bounded re-fetch trigger, a new (small) spend
  decision, not a wider fallback.

**The predicate is the FACTOR, not the deep-source marker** — the shallow
refresh overwrites `source` on every row it touches while `split_factor` is
COALESCEd, so a source-based test would re-arm forever on any listing younger
than the shallow window. Pinned in `tests/research/basisFetch.test.ts`,
including the decoupling itself (due where `deepHistoryDue` says not-due).

**The rendered-coverage number does not exist yet and must not be promised.**
It is measurable only after the backfill runs on the migrated store and names
re-analyse — the stored pairs in old dossiers do not retroactively change.

### Numbers the trader has been given, and what they are denominated in

**He has these; do not contradict them without saying you are correcting them.**

- floor coverage **13/231 = 5.6%**, ticker-denominated. Ops's **17.4%** is
  block-denominated. **Both correct.** Always say which.
- total coverage **55/231 = 23.8%** — **UNGATED. With the guard he approved it
  is 0%.** He has the correction; it is item 34.
- share-count denominator on **91/231 = 39.4%** — the binding constraint. More
  filings buy nothing.
- extraction corpus: **188 sources / 77 tickers / 19 defensible under the strict
  pattern.** Mention-to-number is 25%.

### Standing constraints that are easy to lose

- **Strict extraction pattern ships; the widened one does not.** It is wrong on
  8 of the 19 it overlaps, always larger, and the 12 extra tickers are
  unverifiable by construction. Item 32 has the ratios.
- **`stalledJobs` 16 → 0 is a RECORDED EVENT, not a health reading.**
  `dec0dd9` retires stranded jobs at boot, so the count dropping proves the fix
  ran, not that the disease is gone. A first run cannot distinguish "retired 16"
  from "there were never 16"; only the retirement's own row does.
- **The model's float arm is nondeterministic and there is NO baseline to beat.**
  BEEM cites the same two sources with a float and without one twelve hours
  apart. Do not treat 7-of-574 as a rate to improve on; it is a coin flip.
- **R&D's derived-float work is blocked on a FIXTURE SET, not on data.** Three
  reasonable parsers gave three answers (~5, 9, 7) on the same 24 excerpts.
  Quotable meanwhile: floats ARE stated verbatim; coverage is single-digit
  tickers on R&D's store; name the parser with any figure.

### Naming — and the question that was still open

`c61c937` shipped. **`37377a2` decided BOTH Sheet row types rename together —
`StructuralResearch` → `ResearchTabRow`, `MomentumTicker` → `TodayTabRow` —
EXECUTING when the Q9 capture columns ship.** Renaming one and leaving the other
domain-shaped makes the pair more misleading, not less.

**R&D asked which reason the `structure.displayedFloat` no-rename stands on,
because "too costly now" invites a revisit and "deliberately misnamed forever"
does not. Answering it here, since it was mine to answer:**

**It stands on cost-now, and the revisit trigger is named: when a DETERMINISTIC
float source writes to that field.** Not the second reason. R&D withdrew its
1%-of-rows input once Ops's census showed proposals were being written, and my
own work points the same way — the extractor would fill `structure.displayedFloat`
with real, filing-stated values for 19 tickers. **A field about to be populated
properly is a field whose name matters more, not less.** So: keep the name now,
rename when the extractor lands, and treat that landing as the trigger.

### Q9 capture scope — all riders, so none is rediscovered

Scoped, waiting on Ops's schema gate. Must include: `sheet_float`; **~~stored
skew~~ BOTH CAPTURE INSTANTS, from which a consumer computes the skew —
corrected 2026-09-04, see below**; `displayedFloatSource` **travelling with the
value**; `filedShares` with its **filing date read against
`split_event_ratio`**; and the constraint that **the validation join runs
against whichever store the Sheet floats were captured into — production.** A
float without its date is a different quantity.

> **THIS SUMMARY LINE CONTRADICTED ITS OWN ITEM AND THE ERROR PROPAGATED.**
> Item 28 says *"the basis carries both capture instants and a consumer
> computes the skew"*; this line said **stored skew**, and a column spec was
> requested from it. **Skew is derived — storing it creates a value that can
> drift from the two instants it is computed from, which is the whole reason
> item 28 declined to store it.**
>
> *A summary line will be re-derived wrongly by someone reading only the
> summary — including by the thread that wrote both halves. This desk recorded
> that rule about a published figure; it applies to a handover's own index.*

### True only in this chat

- **The 237→238 bracket is dissolved.** Ops has accepted it and will not look
  for a commit again. Do not re-open it; item 32 is the record.
- **`push-release.sh` defaults to `HEAD` of the shared checkout**, so any commit
  by any thread retargets a deploy that names no ref — and the dirty-tree
  warning excludes `*.md`, so a docs commit does it silently. Ops recorded it at
  `a3a8da7` and is folding the fix into 0f. **Nothing of yours needs to act on
  it; do not re-report it.**
- **The trader has a standing habit request:** any snapshot or screenshot he
  sends should be read with its clock time, and his news-service News Count
  window is **fixed at four hours**. He supplies headlines for every mover so the
  desk can track catalyst-vs-no-catalyst; comparison is a filter on one cell —
  his count ≥ 1 AND the desk found nothing.

### Arrived after the handover — added by Integration 2026-08-27, then stood down

A question from R&D about by-stage output tokens briefly lived here and was
**withdrawn the same hour: it was already answered on 2026-08-24, in this
document, item 20** (*"Asked by R&D through Integration... Answered from
`model_usage`"* — the full by-stage table, output included). R&D's account of
the error and its resulting rule are at its `4c0d13d`. **Nothing is open for
you here**; these lines exist so nobody re-asks it. Q8 in R&D's register is
runnable and unblocked.

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

*Rewritten 2026-08-27 by the session retiring on low context. The earlier version
is in git history; it predates the deploy queue, the supply pair, and the
discovery that its "top open item" had already shipped.*

**This section carries only what does not change: who you are, what you own, and
what this thread has learned the hard way. Every live fact lives in LIVE STATE
and is deliberately not repeated here** — a charter that states the same thing
twice is a charter with one true copy and one that drifts. Verify this section
on its own before any handover: it is read first and doubted last.

> This is the **Research thread** for the Momentum Intelligence desk at
> `A:\mointel`. Read `docs/threads/research.md` **completely**, starting with
> the **LIVE STATE** section, then `docs/threads/README.md`.
>
> **First action, before anything else: title this session `Research`.** Peers
> find you by that title in `mcp__ccd_session_mgmt__list_sessions`. Until it is
> set, nobody can reach you. **Addresses come from `list_sessions` every time —
> never `ListAgents`, never a `from` attribute, never one asserted in a message.**
>
> **You own `lib/research/`, `lib/data/`, and most of `lib/market/`** —
> evidence collection, source resolution, the interpreter, dossier quality, and
> the OpenAI bill. `lib/market/store/` is Ops's. **You do not deploy**; Ops does.
> UI presentation is Design's. Work arrives through Integration; thread-to-thread
> traffic routes through it.
>
> **What to pick up first, and whether anything may deploy, are both in LIVE
> STATE — read it there, not here.** This paragraph would otherwise be the one
> part of the charter you read before you know enough to doubt it, describing a
> starting position that by definition no longer exists. If LIVE STATE and this
> message ever disagree, LIVE STATE is right and this message is stale.
>
> **Five practices that cost this session the most:**
>
> - **A claim of the form "X already handles this" is a claim about code.**
>   Write the assertion and watch it go red. Repeatedly, the test written to
>   CONFIRM something has disconfirmed it — the vacuous split test, the retry
>   brake the re-trigger was approved on, a bound whose 46→4 measurement was
>   the freeze reporting itself as success, and a log line that printed a
>   precondition where every reader saw a verdict. **This binds hardest when
>   the claim is one you are SENDING**: a reading asked to be trusted travels
>   further than a test, and arrives somewhere nobody can check it.
> - **Say what a number is denominated in.** 5.6% and 17.4% are the same fact
>   over tickers and over blocks. Units have cost this desk more than one
>   conclusion.
> - **A number without its basis is a different number.** Shares before a split
>   and shares after are not comparable; `float_basis` and the supply pair's
>   basis guard are the same rule twice. Unknown is not yes.
> - **Measure before promising, and re-measure after a design changes.** I gave
>   the trader 23.8% coverage for a design he then changed by approving a guard;
>   the guarded number is 0%.
> - **A property of the local store is not a property of the world.** The
>   snapshot on this disk is a file, and the desk runs somewhere else. Read off
>   it: *production's schema* (it was a version ahead, and the gate I announced
>   did not exist) and *the vendor's historical depth* (it was years deeper than
>   local retention, and I told another thread the data was unobtainable). **Both
>   read as facts about the system and were facts about a file.** When a claim is
>   about production, the vendor, or the market, the local store is evidence
>   about none of them — go and look, or say which you looked at.
>
> **Every reply ends with `## What I need from you` and nothing after it.**
> Credentials live in `A:\AWS_creds\` and are never printed, logged, committed
> or moved. Never `git add -A`; stage by explicit path.

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

---

**26. The re-trigger: a stale UNKNOWN dossier counts as an answer.** *Scoped
2026-08-25 after Ops established RCON was never re-asked. Not built.*

**The board loop is already level-triggered** — `queueDiscoveryResearch` runs
over current candidates every cycle. So the defect is not the trigger; it is a
skip that treats a six-day-old `UNKNOWN` as a satisfactory answer.

`queue.ts:167`:

    if (readCurrentAnalysis(db, candidate.ticker) && existingJob) {
      ... reason: 'dossier already accepted for this session'

**`readCurrentAnalysis` has no date filter.** It returns whatever
`research_dossiers.current_version_id` points at, of any age. **The reason string
names a condition the query does not check** — "for this session" appears
nowhere in the SQL.

So for RCON on 08-25: current analysis = the 08-19 `UNKNOWN`, existing job = the
08:04 `PARTIAL`, and it is skipped. **On every subsequent cycle, all morning.**
The three later jobs came from the checkpoint sweep, which is a different code
path and noticed nothing about RCON — it re-queues everything.

**The population split, from stored jobs:**

| board-triggered jobs per ticker-session | ticker-sessions |
| --- | --- |
| 0 | 50 |
| **1** | **238** |
| 2+ | 35 |

**The 35 are names with no dossier yet** — `readCurrentAnalysis` returns null, no
skip, re-queued freely until one lands. **The 238 are names that already had
one.** So the rule in practice: *a name the desk has ever analysed gets one board
job per session and is then frozen out, whatever that job produced.*

### Why fixing the rotation alone would have flattered itself

Integration's point and it is the reason to scope both. **RCON's single pass
happened to coincide with the wire**, so a rotation-only fix answers it at ~08:10
and the investigation closes. **A name whose wire lands ten minutes AFTER it
qualifies still waits for a sweep** — and nothing in the RCON case would show it.

| | buys |
| --- | --- |
| rotation fix — do not burn a pass on a re-ask | the ~10 minutes RCON's wasted pass cost |
| **re-trigger fix — re-queue a ranked name whose catalyst is still UNKNOWN** | **the rest** |

### The loop bound already exists, which is what makes this small

The obvious objection is a name with genuinely no news being re-queued forever.
**`evaluateRetry` already gates on the evidence fingerprint** — a re-queued name
whose evidence has not changed is deferred by the existing retry policy. So the
fix does not need a new brake; it needs to stop skipping before that brake is
ever consulted.

**Shape, not a build:** the skip should require what its message already claims —
a dossier **for this session** — or, more precisely, one that actually answers.
A current-session dossier reading `UNKNOWN` on a name that is still ranking is
the case worth re-asking, and the retry policy decides whether it is affordable.

### First data on the unmeasured question, 2026-08-26 premarket

The trader supplied his news service's board beside the desk's, same session.
**News Count (4h) = 0 on all nine of his top premarket movers** — WVVIP +106.9%,
YYGH +75.7%, PSNYW +69.4%, RDIB +68.4%, DAIC +44.6%, XPON +28.4%, SMTK +21.9%,
BRNX +16.6%, SDOT +12.8%.

**The desk says the same thing independently.** `NO FRESH NEWS` on RDIB, SMTK,
YI, PDC, ARKR, DAIC; `NO FRESH CATALYST FOUND` on SMTK, LBGJ, DAIC.

**Two sources that share no code and no data path agree there is nothing to
find.** That is the cross-check the `429` denied me, and it supports his call:
the desk is not missing news on these names — *there is no news*. RCON was the
exception rather than the rule, which is exactly what makes it worth fixing and
not worth building a wire integration for.

**THE WINDOW CAVEAT, and it would corrupt the tracking if it went unnoticed.**
His counter is **4 hours**. The desk's memory is longer, and on the same board it
reports `PSNYW C 15h` and `YYGH A 7d` — **both outside his window.** So a `0`
beside a desk catalyst is not a disagreement there; the two are measuring
different spans. **Any comparison must align the windows first**, or it will
score agreements and disagreements that are neither.

**The two windows, confirmed 2026-08-26. His is FIXED at 4 hours and rolling;
the desk's is 36** — `activeFreshnessHours`, chosen to cover *"a release from the
prior session's after-hours through this morning's premarket, which is the span a
morning gap can originate in."* A 9× difference, and his purpose is narrower on
purpose: at 05:00 ET a 4-hour window is *today's releases*.

**Which reduces the comparison to ONE cell.**

| his count | desk | reading |
| --- | --- | --- |
| 0 | no fresh catalyst | agree — nothing to find |
| 0 | catalyst 4–36h old | **expected**, not a disagreement. `PSNYW` at 15h is this |
| 0 | catalyst >36h | outside both. `YYGH` at 7d is this |
| **≥1** | **no fresh catalyst** | **the only cell that indicates a desk failure — RCON's shape** |

**So the tracking is not a tally, it is a filter**: every name where his count is
non-zero and the desk found nothing. Everything else is agreement or window
arithmetic, and counting it would bury the signal in noise the desk cannot act
on.

*A snapshot must carry its own clock time, because the window is
`[snapshot − 4h, snapshot]` and slides. A `0` at 05:00 says nothing about an
08:00 release.*

*Also visible on that board: `WVVIP` tops his scanner at +106.9% and is correctly
absent from the desk — `classifySecurity` reads it `PREFERRED`, `eligible=false`.
And `PSNYW` is the documented 1-of-369 residual from `b467154`, "Class C-1 ADS
(ADW)", classifying `ADR_ADS` and still board-eligible. Live at +69%, so the
known miss is not hypothetical.*

---

**27. The overhang ratio: measured before starting, and the numerator is the
blocker.** *Approved and unstarted. Nothing built.*

> **AS-OF, and every number below carries it: the production snapshot is named
> `market-prod-2026-08-23.db` but its versions run 2026-08-17 → 2026-08-21T22:25Z
> and stop.** Nothing here observes the four days since. The file's name is not
> its contents, and I quoted these figures for a day before noticing the gap.

**`supplyBound` HAD NOT RUN AS OF 2026-08-21.** The key is **absent** — not null
— on all 325 versions in range, and `1df1d75` shipped in the 08-23 build, so the
two agree and neither speaks for today.

*I first wrote this as "has never run — zero production observations". That was
wrong and Integration had already relayed the stronger version. **Ops's RCON
data settles it: versions were written on 2026-08-25 at 14:01Z and 16:31Z**, so
"nothing has been written" is dead. Whether the key is attached on those is
UNKNOWN FROM HERE and needs one query against the live store.*

**Simulated offline against real dossiers**, replicating `computeSupplyBound`
with a generous denominator (any collected company-facts row, not only a cited
one):

| | of 231 tickers |
| --- | --- |
| **would get a ratio** | **39 (17%)** |
| no filed share count | 46 |
| **no priced ACTIVE block** | **146 (63%)** |

**The numerator is the binding constraint, and it is by design.** Of 657 supply
blocks: `KNOWN_ACTIVE` **14%**, `POSSIBLY_ACTIVE` **56%**, `UNKNOWN` 24%,
`NOT_YET_ACTIVE` 6%. `computeSupplyBound` counts only `KNOWN_ACTIVE` *and* only
those carrying a share count — **67 of 657 blocks, 10% of the evidence.**

**So the design question is not presentational, and it is the one worth putting
to him.** A floor that says *at least this much supply is live* exists on 17% of
names. An estimate that admits `POSSIBLY_ACTIVE` — the 56% majority — would exist
on most names and could overstate. **Replacing a verdict that fires on 100% with
a floor available on 17% is a coverage regression**, and that is the trade, not a
rendering choice.

*That distinction is also the education he asked for: `DIRTY_FLOAT` is a
judgement, a floor is a proof, and an estimate is neither.*

**AND THE NUMERATOR HAS UNVALIDATED OUTLIERS.** Simulated, `HQ` returns
**250,000,000%** from a single priced block — six orders of magnitude, so it is a
unit error rather than an overhang, and the guardrail note about *"shelf capacity
converted to shares with no pricing or conversion terms"* names exactly that
shape. **A ratio built on this today would render it.** Any display needs a
sanity bound the verdict never required.

**`displayedFloat` is populated on 2 of 231 dossiers — 1% — AS OF 2026-08-21.**
R&D's 1-in-94 local figure agrees in shape, but **both carry an 08-21 as-of and
neither is a current number.** Quotable only with the date attached, which is the
`float_basis` rule turned on my own measurements. `floatConfidence` is `UNKNOWN`
on 229 of 231, same window.

**And the trader's original complaint remains answered.** `DIRTY_FLOAT` is **13%**
of 231 (was 17% of 94); `CAUTION` 54%, `UNKNOWN` 33%. The desk is not calling
every float dirty and never was — item 8 established the board was showing the
Sheet's text.

---

**28. Q9 capture scope: it is a network dependency, not a column.** *Scoped for
R&D via Integration 2026-08-27. Not trivial. Not built.*

**`worker/desk-assessments.ts` DOES NOT READ THE SHEET.** No `loadSheetPriors`,
no `resolveDisplayedFloat`, no `MomentumTicker`, no `StructuralResearch` — the
checkpoint path is entirely Sheet-free, and none of
`desk_assessment_tickers`' 33 columns carries a float or a share count.

**So capturing the displayed float at checkpoint means introducing a Google
Sheets call into the append-only writer**, which runs 19 times a session on a
schedule. That is the cost, and it is not the schema.

**What would be stored, and where each part comes from**

| field | source |
| --- | --- |
| `displayed_float` | `resolveDisplayedFloat(research, record).value` — `merge.ts:143` |
| `displayed_float_source` | the same call's `.source` — `RESEARCH` or `TODAY`, i.e. which tab |
| `float_source_date` | `StructuralResearch.floatSourceDate` — the Sheet's own as-of |
| `shares_outstanding` | `dossier.filedShares.shares`, already on the dossier since Phase C |
| `shares_outstanding_as_of` | `dossier.filedShares.asOf` |
| `float_basis` | `SHEET_VENDOR` today; the column exists so it need not be retrofitted |

**Note the two halves arrive from opposite directions.** Shares outstanding is
already in the store and needs no fetch. **Only the float needs the Sheet**, and
it is the half that is observable-once.

**Schema delta:** six columns on `desk_assessment_tickers`, `ADDED_COLUMNS`
entries, `SCHEMA_VERSION` 22 → 23. `lib/market/store/` is Ops's and the
`BUSY_SNAPSHOT` race lives there, so Ops gates it before it ships.

**The failure mode is the real design work.** A Sheet call can time out. The
checkpoint is append-only and cannot be re-run, so the rule has to be the one
`ensureDailyHistory` already follows: **report the failure, never block the
write.** A checkpoint that skipped because the Sheet was slow would lose the
whole row to save one field — and a null float must be distinguishable from *"we
did not ask"*, or the series records absence as a value.

### R&D's as-of-instant requirement, and what it exposes

**`float_basis` must record the SOURCE and the CAPTURE INSTANT, not the source
alone** — R&D's `float > SO` finding was valid only because both numbers came off
one panel at one moment, and a float and a share count read minutes apart on a
fast mover are not a ratio.

**Adding a column does not satisfy it, and that is the finding.** In the design
above the two halves are **asynchronous by construction**: the float comes from a
live Sheet read at checkpoint, the share count from `dossier.filedShares`,
written whenever that analysis last ran — **possibly days earlier.** They cannot
be made simultaneous, so the requirement cannot be met by capturing harder.

**What CAN be met is making the skew visible rather than hidden.** Three
instants, and conflating any two is the error:

| | |
| --- | --- |
| the float's own as-of | `StructuralResearch.floatSourceDate` — when the vendor computed it |
| the share count's own as-of | `filedShares.asOf` — the filing cover-page date |
| **the capture instant** | when the DESK read each — the assessment's `started_at` for the float, the version's `generated_at` for the shares |

**So the basis carries both capture instants and a consumer computes the skew.**
A ratio whose halves were observed four days apart is still recordable; what must
never happen is it reading identically to one observed at a single instant.
*Record the working, and let the reader judge what it is worth.*

*Most of the plumbing exists: `desk_assessment_tickers` already carries
`price_at` per ticker and `desk_assessments` carries `started_at`. Only the
float's own read instant is new, and it is one value per checkpoint rather than
per ticker.*

### Q9 COLUMN SPEC — names and SQL types, 2026-09-04. *Asked by Integration so Q9 can ride the activity migration. Names only; no writer, no build.*

**Eight columns across TWO tables, because one of them is per-checkpoint
rather than per-ticker.** All nullable, without exception: a timeout must
degrade to a null column and never to a failed checkpoint.

**On `desk_assessment_tickers` — per ticker:**

| column | type | what |
| --- | --- | --- |
| `sheet_float` | `REAL` | `resolveDisplayedFloat().value` — the Sheet's number |
| `sheet_float_source` | `TEXT` | `'RESEARCH'` or `'TODAY'`, which tab. **Travels with the value** or the series silently mixes two populations |
| `sheet_float_as_of` | `TEXT` | the VENDOR's own as-of, `StructuralResearch.floatSourceDate` |
| `shares_outstanding` | `INTEGER` | `dossier.filedShares.shares` |
| `shares_outstanding_as_of` | `TEXT` | `filedShares.asOf` — the filing cover-page date |
| `shares_outstanding_captured_at` | `TEXT` | the version's `generated_at`: when the DESK read the count |
| `float_basis` | `TEXT` | `'SHEET_VENDOR'` today |

**On `desk_assessments` — one value per checkpoint:**

| column | type | what |
| --- | --- | --- |
| `sheet_float_captured_at` | `TEXT` | when the Sheets read returned |

*Named `sheet_float_as_of` rather than item 28's `float_source_date`, to match
`shares_outstanding_as_of`: both answer "what date is this value's own", and
two names for one question is how the next reader concludes they differ.*

**`sheet_float_captured_at` is per-checkpoint because the read is** — one
Sheets call serves every ticker in the checkpoint. **And under fetch-before-
claim it is strictly EARLIER than `started_at`**, which is exactly why it
cannot be inferred from the row it sits beside.

**NOT A COLUMN: skew.** Two capture instants are stored and a consumer
subtracts them. See the correction above.

### `float_basis` will be a constant, and that is the fourth instance

**`'SHEET_VENDOR'` on every row until a second float source exists** —
identical in shape to the `adjustment: 'split'` literal, the
`web_search:default` `toolConfig`, and `activity` frozen by a missing
`DO UPDATE SET`. A `select distinct` will return one value and it will look
broken.

**It ships anyway, and the reason is the difference from those three:** R&D's
rule is that a basis comes from the FIRST row and is never retrofitted, and a
derived float is already scoped (items 14, 29). **This is a constant that is
known to become variable, where those three were constants nobody expected to
vary.** Recorded here so the next person to run that query finds the reason
instead of filing a defect — and so nobody writes a test asserting the
constant, which is what made the `toolConfig` case survive review.

### The naming pass, decided — two types, executed as one change

**R&D's second candidate is right and its sibling has the same defect.**
`StructuralResearch` names the Sheet's `RESEARCH` tab and reads as the research
pipeline's dossier; `MomentumTicker` names the `TODAY` tab and reads as the
desk's core ticker abstraction. **Both docstrings already say the truth** — *"One
row of the RESEARCH tab"*, *"One row of the TODAY tab"* — so only the names
disagree with the code around them.

**It has cost two threads a wrong inference in one week, measurably.** R&D
inferred a dossier-first architecture from `StructuralResearch` and was wrong.
This thread nearly filed three false positives in item 13's reader inventory,
because `StructuralResearch` carries `cycleClassificationRaw`, `cycleState`,
`cycleReasoning` and `recentMajorRuns` — the dossier's vocabulary, in Sheet-land.

**Decision: rename both, tab-shaped.** `ResearchTabRow` and `TodayTabRow`.

**Both or neither, and that is the part worth arguing.** Renaming one for its tab
and leaving the other as a domain-sounding name makes the pair *more* misleading
than it is now: a reader who learns that one is tab-shaped will reasonably infer
the other is not.

**Why this rename and not `structure.displayedFloat`'s.** These are TypeScript
types — 26 and 48 references, six and ten files, every one caught by the
compiler, **nothing persisted anywhere.** The dossier field is a key in an
append-only store and the model's output contract, where a rename means readers
carry both names forever. *The cost of a rename is not the number of call sites;
it is whether anything already written keeps the old one.*

**Executed as one pass when the capture columns ship**, per Integration, rather
than now — a 74-site rename on a shared `main` is merge friction bought for no
urgency. **`components/TickerDrawer.tsx` and `components/DashboardShell.tsx` are
Design's** and the change there is an import and an annotation; flagged rather
than done silently.

### The naming decision, made before the columns ship

**Renaming is not the cheap option and documenting is not the whole answer.** The
deciding fact is that the capture would make it **three**: `row.displayedFloat`
(Sheet, board), `structure.displayedFloat` (model, intelligence panel and risk),
and a new `desk_assessment_tickers.displayed_float` capturing the first.

**Decision, and each part has its own reason:**

**The new column is `sheet_float` / `sheet_float_source`, not `displayed_float`.**
It stores what `resolveDisplayedFloat` returns, which is the Sheet's value from
the `RESEARCH` tab or the `TODAY` tab and never anything else. **Naming it for
its source rather than its destination is what stops the collision growing**, and
it costs nothing because the column does not exist yet.

**`row.displayedFloat` keeps its name.** It is the float the board displays; the
name is accurate for this one and it is a derived view field, persisted nowhere.

**`structure.displayedFloat` is the misnamed one and it stays, documented.** Its
own docstring already says *"only ever a sourced float figure"* — so it is the
MODEL's sourced float, and `displayed` describes a destination it does not
control. But it lives in `AUTOMATIC_DOSSIER_SCHEMA`, which is the model's output
contract: renaming changes the shape the interpreter must produce, and every
stored dossier keeps the old key.

*The tempting argument is that the field is null on ~100% of rows so a rename
costs nothing — and it is nearly right. It is 2 populated of ~574, not zero. But
the cost was never the data; it is that a renamed key in an append-only store
means readers carry both names forever, which is a second collision bought to
settle the first.* **Rename it only if the dossier schema moves for another
reason**, and take it then.

**R&D's observable-once argument holds, with one qualifier worth having.** The
Sheet is overwritten by the ChatGPT tasks and keeps no history, so **what the
board displayed on a given day is genuinely unrecoverable.** But
`floatSourceUrls` points at stockanalysis.com, so the *vendor's* number may be
re-fetchable even when the desk's record of it is not. **Those are different
series** — *what the trader saw* versus *what the float was* — and Q9 should say
which it needs before this is built.

---

**29. Why `displayedFloat` is null on every dossier — and the float that IS in
reach.** *Answering Ops's question from the live-store measurement, 2026-08-27.*

**The model never proposes one. It is not being nulled.** `FLOAT_REQUIRES_SOURCE`
fired **0 times across 325 versions** — the only rules that fire at all are
`REGISTRATION_IS_NOT_SELLING` (69) and `NO_ABSORPTION_INFERENCE` (6).

**This is the second instance of item 8's exact shape in the same module.** There,
`CLEAN` was never chosen and `CLEAN_REQUIRES_RECONCILIATION` never fired — *"it
was not proposed and downgraded, it was never proposed."* Here the same is true
of the float, and the type's own docstring is again purely negative: *shares
outstanding is not float, market cap is not float.* **Nothing tells the model
what a float looks like when it sees one.**

### And it would not recognise one if it did

`FLOAT_TERMS` is `/\bfloat\b/i`. **The SEC does not call it that.** Across 4,289
excerpts carrying text:

| | |
| --- | --- |
| contain the literal word `float` | **55** — largely risk-factor prose, *"our liquidity and public float"* |
| contain `held by non-affiliates` / `aggregate market value` | **191** |
| — of those, a regulatory THRESHOLD ($700M / $75M / $250M) | **95** — S-3 eligibility and smaller-reporting-company tests, not a float |
| — **of those, an adjacent SHARE COUNT** | **29, across 20 tickers** |

**Those 29 are real, issuer-stated public floats**, from General Instruction
I.B.6 baby-shelf calculations in `424B5`, `F-3` and `S-3`. `MNDR` alone carries
four at different dates:

    3,326,123  →  2,657,640  →  2,398,640  →  2,136,640

**A dated, declining, issuer-stated float series — in filings the desk already
holds.** That is precisely the shape R&D's Q9 wants and it exists today for 20 of
231 tickers, about 9%.

**So item 9's "the fix is collection" stands, but the target is narrower and
cheaper than the ownership route.** Section 16 and 13D work needs new fetches and
new parsing; **this needs a regex over excerpts already stored.** It does not
solve float — 9% is not coverage — but it is more than the 0% on the board now,
and every one of those numbers is dated and citable.

*Not built. Recorded because I nearly reported "191 excerpts state the float",
which would have been wrong by a factor of six — 95 are the $700M threshold
boilerplate repeated, and the distinction is the whole finding.*

---

**30. The overturn check: stockanalysis.com exposes no float history.** *Run for
R&D 2026-08-27. The capture clock stands.*

Probed read-only, robots-permitted (`Disallow: /e/ /p/` only). `/statistics/`
carries a **current** Float cell and a prose change statement — *"the number of
shares has increased by 61…"* — and nothing dated. No `Shares Outstanding
History` page, no `shares-outstanding` path, **zero dated object arrays in the
payload.** `/financials/?p=quarterly` renders neither Float nor Shares
Outstanding server-side.

**So option (b) does not become real and R&D's argument holds:** float moves with
dilution, offerings, lockups and reverse splits — 35% of researched tickers carry
one — so a current fetch attached to a past date is **the latest state leaking
backwards, which is the `cycleAsOf` error in a new costume.**

*Limit: I checked the statistics and financials pages of one ticker and the
robots policy. I did not enumerate the site, and I stopped at five requests
rather than characterise someone's service by exhausting it.*

**R&D's two conditions, folded into the scope:** `displayedFloatSource` travels
with every captured number or the series silently mixes `RESEARCH` and `TODAY`
rows; and `filedShares` is worth taking now **but is the cover-page figure, not
retroactively split-adjusted** — so it ships with its filing date and must be
read against `split_event_ratio`. *Present is not usable.*

---

**31. There are TWO floats called `displayedFloat`, and Ops's 0/249 is about the
one nobody names.** *Correcting Integration's correction, 2026-08-27.*

`resolveDisplayedFloat` (`merge.ts:143`) is **Sheet-only** — `StructuralResearch.float`
then `MomentumTicker.float`, two tabs, no dossier. Integration is right and
R&D's dossier-first description was wrong.

**But the proposed reading — *"0/249 is true of a field the board never read"* —
is also wrong, and I checked before repeating it.** The dossier's
`structure.displayedFloat` IS read, by a different surface:

| field | resolved by | rendered by |
| --- | --- | --- |
| `row.displayedFloat` | `resolveDisplayedFloat`, **Sheet only** | `DiscoveryBoard.tsx:478` |
| `structure.displayedFloat` | the **model**, from cited evidence | `AutomaticIntelligence.tsx:334`, `deskRead.ts:359`, and `risk.ts:174` |

**Two different quantities under one name, on two surfaces, and the desk has been
quoting a coverage number without saying which.** Same collision as
`recentMajorRuns` and `split_factor` — the third instance, and the first where
both live in the SAME product rather than in two threads' tables.

**AND ONE OF THEM FEEDS A RULE THAT CANNOT DISCRIMINATE.** `risk.ts:172`:

    const floatUnknown =
      row.research?.structure.state === 'UNKNOWN_STRUCTURE' ||
      (structure !== null && structure.displayedFloat === null);

With the dossier field null on **100%** of dossiers, **the second disjunct is a
constant** — it never distinguishes anything, and `FLOAT UNKNOWN` reaches the
trader on every analysed name that gets that far down the chain.

*Not a defect.* Item 9 established that unknown IS the correct answer while the
desk has no float source. But a condition that cannot currently vary should say
so, or the next reader takes `FLOAT UNKNOWN` as a judgement about a particular
name rather than a statement about the whole desk.

---

**32. The float route never stopped, because it never worked.** *Investigated
2026-08-27 on Ops's instruction to find what broke it before rebuilding it. The
instruction was right and the hypothesis inside it was wrong.*

Ops found 7 floats in `research_analysis_versions`, all at ids 72–237, none since
2026-08-20, and bracketed the cause: *"whatever changed sits between id 237 and
id 238."* Three measurements say nothing changed.

**The drought predates every candidate change.**

| | |
| --- | --- |
| last float | id 237, `2026-08-20T16:32:32Z` |
| versions after it, in snapshot | 88, across **76 distinct tickers**, zero floats |
| ...before the earliest 08-21 commit was AUTHORED | **29, across 29 distinct tickers** |
| commits on 2026-08-20, all refs | **zero** |

`lib/research/interpret/` — the only thing that emits a float — has no commit
between 08-19 and 08-23. The four 08-21 resolver commits are innocent on
inspection too: `domainPolicy` blocks only `example.com`, and
`resolverSearchContext` ships defaulting to null.

**The same evidence produced a float and then did not.** BEEM is the control:

    165  2026-08-19T20:15Z  float 18,261,585   cites 12328, 12329
    178  2026-08-20T08:01Z  float NULL         cites 12328, 12329

Identical cited sources, both `active=1`, both excerpts containing "held by
non-affiliates". SGLY does the same inside one day. **You cannot bracket a coin
flip.**

**The evidence was always there, at twenty times the scale.** 188 active
`research_sources` whose excerpt states a public float, across **77 of the 231
researched tickers**. The model found four. A ~5% hit rate against evidence
already bought and stored — and 0-for-249 is what a 5% flip looks like, which is
why the bracket had nothing to find.

### Deterministic extraction gets 19 of 77, and widening it is a correctness loss

The literal pattern — no arithmetic, no division — yields a stated share count
for **19 tickers** with no paid call and no fetch. Widening it to bare "ordinary
shares" / "common shares" lifts that to 31 **and is wrong on 8 of the 19 it
overlaps**, always larger, because the gap clause bridges *"based on N shares
outstanding, of which M … held by non-affiliates"* and captures N:

| ticker | strict | widened | ratio |
| --- | --- | --- | --- |
| AIRE | 35,533,025 | 69,449,346 | 1.955 |
| ODYS | 8,659,280 | 16,357,327 | 1.889 |
| INDP | 5,757,149 | 8,258,597 | 1.434 |
| MNDR | 3,326,123 | 4,072,128 | 1.224 |

plus VSME, MYSZ, IMNN, GNPX. **This is R&D's own documented "based on" trap
(1.92× on NWTG) arriving by regex instead of by model.** GNPX errs by 0.1% and
looks correct; AIRE by 95%. **No magnitude check separates them** — a spot-check
on a low-affiliate name would have cleared the pattern that fails on 8 of 19.
The twelve extra tickers are **unverifiable by construction**: they are exactly
the ones with no strict match to disagree with.

### Two corrections taken

**Mine:** *"`FLOAT_REQUIRES_SOURCE` fired zero times, therefore the model never
proposes a float"* does not follow. A guard that never fires is equally
consistent with every proposal carrying a valid source — which is what these
seven are. Inferring behaviour from the silence of a check is the same error as
reading a constant as health.

**And `guardrails.ts:344` is a defect:** `Boolean(structure.displayedFloatSource)`
tests that the model wrote *something* in the source field, not that what it
wrote is a source. SGLY's string was *"Unverified secondary social-media claim;
not reconciled to SEC-reported outstanding shares."* **The model confessed, in
the field, that it had no source, and the guard read the confession as one.**

**The board consequence is worse than "since 08-20".** `displayedFloat` was
non-null on **7 of 574 production versions — 1.2%** — so `FLOAT_UNKNOWN` has
short-circuited `STRUCTURE_CLEAN` since the first day. **`NO FLAG FOUND` has
never been reachable in practice.** 08-20 is when the last 1% went.

---

**33. Writing the confirming test produced the disconfirming result. Three times
in one week.** *2026-08-27.*

The re-trigger fix (item 26) was scoped, recommended and approved on the premise
that **`evaluateRetry` already bounded the re-ask** because it gates on the
evidence fingerprint. It does not. `evaluateRetry` reads `research_retry_state`,
which `nextRetryState` writes **on failure**. A job that finishes and produces an
UNKNOWN dossier has not failed, records no state, and arrives as *"no prior
failure", allow*. **It is a failure policy, not a re-ask policy**, and the board
loop runs every 5s.

The premise passed through the scoping, into Integration's recommendation, and
out to the trader. **No step in that chain was where it could be caught** — a
premise only fails when something executes against it.

### The obvious bound was the same bug in the fix's clothes

Skip while the evidence fingerprint has not moved. Written, tested, and measured
as cutting the freed population from 46 ticker-sessions to 4 — which looked like
a tight bound and was **the freeze reporting itself as success.**
`collectCatalystEvidence` runs *inside job processing*, so a name with no job
collects nothing, its fingerprint can never move, and it never earns a job. **The
32 sessions it "bounded" were 32 names nothing was collecting for.** Thrown away.

**What shipped is a clock** (`4ac30b5`): a name already holding a dossier waits
the collector's own unresolved discovery interval, passed from config so the two
cannot drift. Below it the collector refuses to pay for discovery anyway, so
every re-ask is a pass that could learn something. **Model spend needs no bound
at the queue: `interpretTicker` returns `REUSED_UNCHANGED` on an unmoved
fingerprint without building a bundle or making a call.** The clock bounds job
rows, SEC polling and worker slots — not dollars.

**The three instances, because the pattern is the lesson:** the vacuous
rounding-artefact test in `splits.test.ts` (4.8% deviation against a 5%
tolerance, never reached the confirmation logic); the retry brake above; and the
46→4 measurement. **A claim of the form "X already handles this" is a claim about
code, and the cheapest possible test of it is to write the assertion and watch it
go red.**

---

**34. The supply pair: built, correct, and renders on zero rows.** *Built
2026-08-27 as `bc15588` after the trader chose a floor/total pair over either
pole. Not deployed.*

Floor = proven-live blocks. Total = every filed block with a share count. The gap
is the unproven supply made numeric, so a massive block that cannot be shown
active lands in the total rather than vanishing.

### The basis check is the reason it is a file and not a sum

A block's share count is stated on its filing's basis; shares outstanding on its
own period end. Dividing one by the other compares two different quantities
whenever a split sits between them — the `float_basis` rule again. The tell is a
clean gradient across the 55 tickers a pair would render for:

| total ratio band | rows | carrying a reverse split |
| --- | --- | --- |
| <50% | 21 | 28.6% |
| 100–200% | 11 | 45.5% |
| >500% | 7 | **71.4%** |

GNLN reads **169,106%**: a 424B3 from 2025-04-29 stating 1,169,711,239 shares
against 694,544 outstanding, behind a 1-for-8. **A magnitude threshold catches
that and misses the 100–200% band**, where nearly half the rows carry a split and
the number still looks plausible.

So the test is basis, not size, and unknown is not yes. Comparison is against the
**denominator's** basis rather than today's, so a name whose filings and share
count all predate a split stays internally consistent. `sourceFiling` is never
parsed for a date: it is free text a model wrote.

### And the coverage figure the trader approved on was for a different design

| | |
| --- | --- |
| FLOOR coverage (ticker-denominated) | 13 / 231, **5.6%** |
| TOTAL coverage, **ungated** | 55 / 231, **23.8%** |
| have a share-count denominator at all | 91 / 231, **39.4%** |
| have any supply block at all | 208 / 231, **90%** |

**~~The binding constraint is the denominator, not the numerator. More filings
buy nothing; the share count is the whole game.~~ WRONG, AND IT IS A COLLISION
OF MY OWN MAKING. Corrected 2026-09-04 — see item 45.**

**`91/231` is the MODEL'S TRANSCRIBED `structure.sharesOutstanding`. The
denominator `computeSupplyPair` actually divides by is
`bundle.reportedSharesOutstanding` — the deterministically parsed SEC
company-facts value — and that is available on 185 of 231, 80.1%.** Two
quantities called *the share count*, and I quoted the one the code does not
use.

**So the numerator IS the binding constraint, exactly as item 27 says**: of
231, 46 lack a count and **146 lack a priced `KNOWN_ACTIVE` block** — three
times as many. **Items 27 and 34 contradicted each other and 34 was the wrong
one.** *"More filings buy nothing" is the dangerous half: it argues against
collecting the very evidence that is actually short.*

**Then the guard takes 23.8% to zero.** The basis check needs a split factor per
session, and those exist only where `ensureDeepHistory` has run — gated on rank
≤ 10 **and** a price above every stored high. Replayed over every stored
ticker-session:

| | |
| --- | --- |
| symbols the deep gate would EVER fire for | 11 |
| …that also hold a dossier | 2 (0.9%) |
| rows that would render a pair | 55 |
| …where deep history could have run | **0** |

**I gave him 23.8% before he chose the guard, and the guard he chose makes it
0%.** He chose correctly; the number was for the previous design. The fix is to
decouple the dual-adjustment fetch from the blue-sky gate — two REST calls per
symbol, close to once per ticker forever — which is a separate commit and a
separate spend. **Shipped inert and said so, rather than weakening the guard to
make a number appear.**

**Note also two units in play for the same fact:** Ops's 17.4% is
block-denominated, this 5.6% is ticker-denominated. Both correct. Whichever
reaches the trader has to say which.

### A cross-store check that passes on content

657 supply blocks, 93 `KNOWN_ACTIVE`, 67 of those priced — identical in my
snapshot and Ops's live store, arrived at independently. Worth recording after an
earlier "agreement" that turned out to be ids 1–94 matching ids 1–94.

---

**35. The news one-cell instrument holds zero persisted observations, answered
so R&D's scorecard can exclude it honestly.** *Asked by R&D via Integration
2026-09-02; answered from a grep, not from memory.*

Nothing in `lib/` or `worker/` records what the trader supplies from his news
service — no table, no capture path; the only `headline` code is the desk's own
assessment headline and the catalyst clusterer. The single existing dataset is
the 2026-08-26 premarket comparison, which lives as **prose in item 26**: nine
tickers, all agreement cells, zero failure cells, not queryable rows.

Definitions given with the answer, for whenever it IS built: one observation is
one **(snapshot clock-time, ticker) pair**, valid only when the snapshot's
clock time is legible — the 4h window rolls, so a count without its instant is
uninterpretable. And **supplied-nothing days are currently indistinguishable
from no-news days**, because nothing records what he supplied at all; the
manual-feed caveat in item 25 is a design requirement, not an implemented
distinction. Building the capture is a decision that sits with the trader; the
spec is items 25/26.

---

**46. Per-field, per-task: TASK 2 IS RETIRABLE AND TASK 1 IS NOT — with one
caveat I cannot close from code.** *Asked by Integration 2026-09-04 after the
trader corrected the four-tasks figure to two. Enumerated by search over what
the desk READS, not over what the Sheet holds.*

**Integration's hypothesis is CONFIRMED, and by a stronger mechanism than it
expected: the desk-side replacements for task 2's fields are not merely built,
they are ALREADY WIRED as fallbacks.** Stopping it degrades those fields to the
desk's own values rather than to null.

| field the desk reads | replacement | wired? |
| --- | --- | --- |
| **`float`** (TODAY col I, and the RESEARCH branch) | **NOT EXIST** | — |
| `catalyst.latest` (T:AA) | `dossier.catalyst.summary` | **YES** — `why.ts:118` falls through to it, and `deskRead.ts:587` feeds both into `mergeNarrative` with `autoUsable` gating |
| `warning.current` (T:AA) | `structure.structuralWarnings[0]`, then `structure.summary` | **YES** — `risk.ts:139` is literally `warning ?? structuralWarning ?? summary` |
| `cycle` | `computedCycle` | **YES** — Design cut over |
| newly qualifying premarket names | the engine's own qualification latch, off whole-market wildcard bars | **YES** |
| `price` / `changePct` / `volume` | the live tape | **YES, and better** |
| `structure`, `catalyst.gradeBucket` | `dossier.structure` / `dossier.catalyst` | exists; the Sheet side is one half of a deliberate two-column comparison |
| `recentRunHigh` / `recentCycleHigh` | `computedCycle.cycleHigh` | **EXIST-BUT-INCOMPLETE — item 44.** The desk's high stops at yesterday's close |
| `sheetPrior` → `priorHumanAnalysis` | nothing, and **retiring it is a GAIN** — R&D's Q1 wants uncontaminated grades | n/a |

### So the two lists Integration asked for, and only the second is a plan

**What BREAKS if task 2 stops:** on the code path, **nothing goes null.**
Catalyst text and the warning line degrade to the desk's own, which are already
the fallback arm at three call sites.

**What the desk must PRODUCE to make stopping task 2 a non-event: nothing
new** — with the one caveat below.

**What the desk must PRODUCE to make stopping task 1 a non-event: the float.**
That is the whole of it, and it is unchanged.

> **THE CAVEAT, AND IT IS THE ONE THING THAT COULD OVERTURN THIS: both tasks
> write `RESEARCH`, and `RESEARCH.float` is the FIRST branch of
> `resolveDisplayedFloat`.** If task 2 is what keeps that column current, then
> stopping it degrades the primary float source to whatever task 1 last wrote —
> **stale rather than absent, which is the failure mode nothing on this desk
> would surface.** *I cannot check this: which task writes which column is a
> fact about the ChatGPT side, not about this repository. It is the one
> question standing between "task 2 is retirable" and "task 2 is retirable,
> verified."*

*Method and its limit, stated: I enumerated the fields the desk CONSUMES by
searching the readers, which is code-verifiable. Which task WRITES each field
is not, and that half rests on the 08-23 record.*

---

**45. Design's count: 38 of 46. BUILD THE FALLBACK — and the query found a
contradiction between two of my own items.** *Asked 2026-09-04. Measured by
replicating `readReportedShares` rather than proxying it.*

**Design's framing is correct and I confirm it:** `computeSupplyPair` returns
null on exactly one condition (`supply.ts:157`), guarded at `pipeline.ts:409`.
**Pair-absent means NO FILED SHARE COUNT and nothing else** — a ledger with no
usable blocks still produces a pair with nulls and a filled `excluded`.

| | of 231 current dossiers |
| --- | --- |
| have a filed share count | **185 — 80.1%** |
| **no filed count, so no pair** | **46 — 19.9%** |
| **…of those, ledger NON-EMPTY** | **38 — 82.6%**, holding **103 blocks** |
| any dossier with a ledger at all | 208 — 90% |

> **BUILD IT. Design's own threshold was "five rows in six"; the answer is
> 82.6%.** Those 38 names have researched supply and no way to express it as a
> ratio — a blank tells him *"we do not know this company's supply"* when the
> truth is *"we know the blocks and cannot divide them."*

*Two independent cross-checks that the replication is right: the 46 matches
item 27's separately measured "no filed share count: 46", and the 208 matches
item 34's "any supply block at all: 208".*

*Limits, both stated: the snapshot is the 08-23 file whose versions run
08-17→08-21, so this is vintage rather than current; and citability is
generous — ACTIVE sources rather than CITED, as item 27 also used. A stricter
citability test would move tickers INTO the no-denominator bucket, so **46 is a
floor on the gap and 38 a floor on the opportunity.** The direction favours
building.*

### AND THE QUERY EXPOSED A CONTRADICTION BETWEEN ITEMS 27 AND 34

**Item 34 records the denominator on `91/231 = 39.4%` and concludes *"the
binding constraint is the denominator, not the numerator; more filings buy
nothing."* Item 27 records `no filed share count: 46` — which implies 185 — and
concludes *"the numerator is the binding constraint."* Both are mine and they
cannot both be right.**

**Resolved by measuring: 91 is `structure.sharesOutstanding`, the MODEL'S
TRANSCRIPTION. 185 is `bundle.reportedSharesOutstanding`, the parsed filed
value the code actually divides by.** Item 34 quoted the quantity the code does
not use.

> **Two quantities called "the share count", one of them the model's and one
> deterministic — the same collision as `displayedFloat`, `split_factor` and
> `recentMajorRuns`, and this one lived inside a single thread's own charter
> where no boundary existed to make anyone ask which.**

**The consequence is not cosmetic: item 34's line argues against collecting
more evidence, and the evidence is what is actually short** — 146 names lack a
priced `KNOWN_ACTIVE` block against 46 lacking a count.

---

**44. NO — the cycle bars END AT THE LAST SETTLED SESSION, and today is never
in them.** *Design's gating question, answered 2026-09-04. It decides whether
the `deriveCycleLevels` switch is ready or a downgrade.*

**During premarket on a Thursday the bar set runs through WEDNESDAY.** Today's
session is absent, so `cycleHigh` cannot contain today's high — **including the
premarket high he is trading against between 04:00 and 09:30.**

### Two independent mechanisms exclude it, and that is the part a fixer needs

| | |
| --- | --- |
| **the write path never stores it** | `ensureDailyHistory` keeps only `tradingDate <= lastSettledTradingDate`, and settled requires `now >= sessionEndUtc` — **20:00 ET.** Today's bar is not written at all until the session ends |
| **the read path would drop it anyway** | `readDailyBars` defaults to `'EXCLUDE'`, and `overlayLiveCycle` calls it with defaults |

> **SO ANYONE CLOSING THIS GAP BY CHANGING ONE WILL FIND IT STILL DOES NOT
> WORK.** Store today's partial bar and the reader silently discards it; flip
> the reader and there is nothing stored to read. **A correct guard and a
> correct filter composing into a wrong number — the same shape as
> `historicalResistance` losing two sessions, in a different file.**

*And `cycleHigh` is a BOUND — computed from `bars[i].high` at `cycle.ts:249` —
read from a bar set filtered for rates. Harmless today because the write path
already withholds unsettled sessions, so the filter has nothing to drop. It is
the second lock on the door, not a live defect.*

### Design's concern is right, and the work is bigger than a pointer — but NOT blocked

**The switch as scoped WOULD be a downgrade** in exactly his window: the
Sheet's `TODAY · Recent Run High` is intraday and covers the session the desk's
number cannot see.

**But the data is not missing — it is somewhere else.** `sessionHigh` is
live, tick-updated per ticker and already persisted to `ticker_session`. **So
the switch has to COMPOSE the settled-daily cycle high with the live session
high, rather than redirect one pointer.** That is a real piece of work and it
should be scoped as one — *mark it bigger, not blocked.*

### And the fact worth saying on its own, because it is not about the Sheet

> **The desk's cycle high excludes the live session EVERYWHERE it is read, not
> only in the ladder.** Any surface showing `computedCycle.cycleHigh` during
> premarket is showing a ceiling that stops at yesterday's close — the
> intelligence panel included. **That is true today, with the Sheet still in
> place, and nobody has been told.**

*Design's two non-questions, agreed: `NO_CYCLE` returning no `cycleHigh` is
correct rather than a loss — a cycle high for a name in no cycle is the error
`cycle.ts:220` warns about — and `classifyLevel`'s HISTORICAL/CURRENT/
UNVERIFIED apparatus does become dead, because it exists only to sort a Sheet
level carrying no bounded basis. The change removes a layer rather than
redirecting one.*

---

**42. Can we leave the Sheet? NO — and the shape has changed since the record.**
*Asked by the trader via Integration 2026-09-04. Answered from the code, not
from item 6, because the record is from 08-23 and things have moved.*

**Integration's summary is CORRECT on the float and I confirm it verbatim:**
`resolveDisplayedFloat` (`merge.ts:143`) still has **exactly two branches**, and
both read Sheet tabs — `StructuralResearch.float` then `MomentumTicker.float`.
**Every float on the desk is still the Sheet's.**

### What has changed is the middle category, and it is the useful part

**Two replacements now EXIST and are NOT WIRED. That is different from "not
built" and it is where the cheapest progress is.**

| | state |
| --- | --- |
| **float** | **no replacement anywhere.** The dossier's own `structure.displayedFloat` is populated on **7 of 574 versions** (item 32), so there is nothing to switch to |
| **supply** | **BUILT, STORED, AND ON NO SURFACE.** `supplyPair` is computed for every dossier and the basis fetch now populates the split factors it needs — but grep across `lib/dashboard/` and `components/` finds **no reader at all** |
| **cycle levels** | **BUILT, AND THIS READER WAS NEVER SWITCHED.** `deriveCycleLevels` reads the Sheet's `recentCycleHigh` and `recentRunHigh` while `lib/market/cycle.ts` computes the desk's own cycle high arithmetically |

### What leaves with the Sheet, which is the list he asked for

1. **Float — and pillar 5 with it.** `displayedFloatTurnover` and a branch of
   `risk.ts` hang off the same number.
2. **The cycle-level ladder's readings**, until `deriveCycleLevels` is pointed
   at the computed cycle.
3. **The interpreter's prior** — `sheetPrior` reaches every `Terra` call.
   *Losing it is arguably a gain; R&D's Q1 wants uncontaminated grades.*
4. **The second grader** — `compareSheetAndAuto` and the whole conflict
   apparatus have nothing to compare against.
5. **`keyLevels`**, read straight from the Sheet in `merge.ts`.

> **AND IT FAILS SILENTLY, WHICH IS THE PROPERTY THAT MATTERS.** A missing
> float resolves to `null`, and the code treats null as a legitimate unknown
> rather than an error. **The day the Sheet stops, the board keeps rendering
> and pillar 5 simply goes quiet.** No exception, no alert, no gap on screen —
> the same shape as every silent-degradation finding on this desk.

*Limit stated: the two ChatGPT tasks writing `TODAY` and `RESEARCH` are not
checkable from this repository. That half of the answer stands on the record,
not on code, and I did not re-verify it.*

**So the answer he needs: not yet — one thing has no replacement, and two have
replacements already built that nobody wired.** The second category is work
already paid for and not delivering.

---

**43. The aggregate momentum state is computable now, at TICK grain, for exactly
the names he means.** *Feasibility read for the trader via Integration
2026-09-04. Availability only; whether it PREDICTS anything is R&D's.*

**It is summing what already exists. Nothing new is needed on the wire.**

| grain | what carries it | population |
| --- | --- | --- |
| **tick** | `trades` and `quotes`, already subscribed and already ingested — `ingestTrade` at `engine.ts:1035` updates price, session high and low per message | **rank ≤ 50**, so the top 5 are ALWAYS in it |
| minute | wildcard `bars` — volume, trade count, OHLC range | whole market |

> **THE TOP 5 GAPPERS ARE ALREADY IN THE HIGH-RESOLUTION INTEREST SET, so the
> desk already holds TICK data for exactly the population the indicator is
> about. No subscription diff, no second SIP connection, and no minute-grain
> compromise for the names that matter.**

Per-ticker fields an aggregate could read in-process today: `price`,
`percentChange`, `sessionHigh`/`sessionLow`, `rvol`, `rvolRank`,
`minuteTrades`, `minuteVolumes`, and now `activity`. **A top-N aggregate is a
loop over ranked runtimes.**

**What IS new: storing it.** The store is per-symbol; nothing holds a
cross-sectional value per instant. **But it is re-derivable rather than
observable-once** — board membership at an instant is in `ticker_session`, and
minute bars are re-fetchable (item 40). **So there is no capture clock and no
decision that needs taking today**, which is the same answer the 10-second
question got.

**One caution that is availability, not design:** a "choppy or trending"
reading is a RATE, and this thread has already paid for the rule that a rate
over an unfinished minute is wrong in an unknown direction. **A partial minute
reads as low activity — which would manufacture a false CALM, and his use case
is deciding NOT to trade.** The tick path avoids it entirely; a minute-grain
version needs the same settle exclusion `activity.ts` uses.

---

**41. Board presence as a continuing condition — SCOPED, then BUILT INERT at
`05b28b9`.**

> **BUILT 2026-09-03 on Integration's order-and-process word** (*"build the
> engine-only determination"*), after it took hysteresis, the `latched`
> decision and uniform application as decided. `lib/market/activity.ts` plus
> engine wiring; **nothing reads `runtime.activity`**, so ranking and the
> high-res set behave exactly as before. **Full suite green, 1502 tests.**
>
> **It is inert because his product question is still open** — vanish versus
> show-as-dropped want opposite implementations (null the rank, or keep it
> beside a flag), and wiring either would answer it for him. Same disposition
> as `bc15588`.
>
> **Two things the build added that the scope did not have**, both refusals of
> the same family:
> - **The most recent minutes are excluded as still arriving.** A minute in
>   progress is not a dead minute, and a just-closed minute may not have
>   delivered its bar — either read as zero would manufacture death every
>   minute on every name. `lastSettledTradingDate` at a finer grain. **It costs
>   one minute of latency, so a five-minute rule decides at six**, and that is
>   stated rather than hidden.
> - **A null trade count is not stored as zero.** *"Not reported"* and *"no
>   trades"* are the exact two states the map exists to separate.
>
> **And `activity` is OPTIONAL on `DemandState` because it is live-only.** The
> engine always sets it; the store has no column, so a round-tripped row comes
> back without it. **`undefined` and `'UNKNOWN'` are therefore different and
> documented as such** — the first means the value did not survive its journey,
> the second means the engine looked and could not say. **Only the second is a
> measurement.** *The compiler found this: adding a required field broke seven
> call sites, which is how a persisted contract announces itself as one.*

### THE GRAVEYARD IS PRESENTATIONAL, AND EVERY RANK-BASED CONSUMER STILL SEES A CORPSE

*Traced 2026-09-03 immediately after the decision, before anything is wired.
Nobody has named it and it is the board-lateness defect surviving its own fix.*

**The decision is keep-the-row-and-flag-it, never null-the-rank** — which is
right for the graveyard, because the row has to survive in order to be shown.
**But the rank survives with it, and the rank is what other things read.**

| consumer | gate | what a DEAD name at rank 3 still does |
| --- | --- | --- |
| **research queue** | `candidate.rank > autoRank → reject` (`queue.ts:55`) | **holds a top-N research slot** |
| **high-res subscription** | `rank <= internalRank` (`engine.ts:1531`) | holds a trades/quotes slot in the 250 cap |

> **So a LIVE name at rank 13 is excluded by a DEAD name at rank 3.** The
> trader gets a clean board while the desk keeps spending research and
> subscription budget on corpses — and keeps withholding both from names that
> are actually moving. **That is exactly the defect this whole line of work
> exists to fix, one layer below the surface that now looks fixed.**

**The fix is NOT to null the rank** — that would take the graveyard's own data
with it. It is the same repair as `latched`, and this thread has now given the
same answer three times: **leave the value alone and change what READS it.**
Rank-based consumers should ask for *ranked AND alive*, which keeps the row
whole for the graveyard while stopping the spend.

**Measurable once the emission is deployed, and worth sizing before building:**
count how many top-N slots are held by `DEAD` names at an instant. Not
measurable from here — it needs live data, and the local snapshot carries no
`minute_bars` at all.

*Not built, and deliberately not wired: Integration asked to coordinate through
it before wiring, and this widens what "the removal" means from a Design
partition into a change with two consumers in two threads' modules.*

### BUILT `5c8e9a7`, and the build found a FOURTH selection source the scope missed

**`applyHighResSelection` has four sources, not two — and two must NOT be
gated.** Pinned sheet names are pinned. And the **after-hours daytime-leaders
block exists precisely so a quiet name keeps its subscription after the bell**
(*"a Focus name or a daytime leader must not go dark just because it is quiet
now"*), so gating it would delete the reason it was written. **The enumeration
discipline caught the same class of error twice: once in the scope, once in the
build.** Both exclusions now carry their reason at the site.

**Focus exempts a name from the activity test** as it already does from the
rank window — the trader saying he is watching a name outranks the desk's
opinion about whether it is interesting. *My judgement, flagged to Integration
as mine to overrule.*

**The engine test asserts the rank and the latch SURVIVE**, so a later drift
into nulling the rank fails loudly instead of quietly emptying the graveyard.

**`deadAtPrice` added `<next commit>`** at Design's request via Integration,
captured at the same flip and for the same reason as the rank: **`deathCount`
shows the rule firing OFTEN; only *revived AND RAN* shows it firing WRONGLY**,
and that needs a baseline taken at the death. `percentChange` cannot
substitute — it is the SESSION move, so a name that was +40% before dying and
is +40% now is indistinguishable from one that ran after reviving. *Design
refused to approximate the "ran" count rather than ship one that might be
wrong, which is the check-that-cannot-fail argument applied to the single field
that would trigger a rule change.*

### Q9's writer: the Sheets call goes BEFORE the claim, and that answers both of Ops's problems

*Ops's condition 6, answered from the code 2026-09-04. Not built — Q9 is behind
the schema gate.*

`captureAssessment` takes `startedAt`/`startMs`, **then** claims the slot, and
only **then** enters the `try`. So Ops is right twice over: **an awaited Sheets
call that never returns does not throw**, the row stays `RUNNING`, and the slot
is dead for the whole `STALE_RUNNING_MS`; and a network call inside the window
converts checkpoint duration from database work to network-bound, breaking the
duration baseline Ops uses as a health signal.

> **The band is `25–209 ms, average 42` — NOT the `28–74 ms` I was given and
> recorded here.** *Retracted by Ops at `6678d94`: the narrow band came from
> too short a window and would itself have fired on a perfectly normal 196 or
> 209 ms checkpoint. **A health signal with too tight a baseline manufactures
> incidents**, which is worse than one that stays quiet.*
>
> **The conclusion is unaffected, and the correction slightly strengthens it.**
> A Sheets round-trip is still orders of magnitude above 42 ms. But the wider
> natural variance means **a network call inside the window would be HARDER to
> spot as an anomaly, not easier** — 200 ms of real spread is room for a slow
> call to hide in. That argues for ELIMINATING the call from the window rather
> than bounding it with a timeout, which was already the recommendation.

**Both disappear if the read happens before `startedAt` is taken** (`:525`),
which is structurally trivial:

- **nothing is claimed yet**, so a hang cannot strand a slot — the hazard is
  eliminated rather than bounded, which is Ops's stated preference;
- **the duration measured is claim-to-complete**, so it stays database work and
  **Ops's health baseline survives — no dated discontinuity entry is needed**;
- the only cost is a wasted Sheets read when another worker already holds the
  slot, which is rare and vastly cheaper than a ten-minute dead slot;
- and it makes **the float's capture instant explicit** rather than inherited
  from `started_at` — which **item 28 already required**, so the safer shape is
  also the one the design asked for.

**The ordering stands whatever shape is chosen: the checkpoint completing is
worth more than the column being populated, every time.** A timeout degrades to
a null column, never to a failed checkpoint — Q9's capture is a nice-to-have
riding inside the writer of the one record nothing rebuilds.

### NO OBJECTION: a never-active name being DEAD is harmless in the gates, and the dilution is in the STORE

*Integration decided the determination stays and the fix goes in the display,
and asked for an objection from inside the module. There is none — but its
reasoning is right for a reason it could not check, and the call does not reach
far enough.*

**Design's finding: 60 of 71 dead rows peaked BELOW the dead line and none held
a top-50 rank.** Those names never went quiet; they were always quiet.

**Checked at each gate rather than reasoned about from outside:**

| gate | does it act on a name at rank 72–1240? |
| --- | --- |
| research, `queue.ts:86` | **no.** `rank > autoRank` (12) rejects it first — activity adds nothing |
| high-res rank, `engine.ts:1654` | **no.** `rank <= internalRank` (50) never selected it |
| **high-res LATCH, `engine.ts:1683`** | **YES — and this is the one that matters.** The latch selects **regardless of rank**, so a latched-but-silent name at rank 900 was holding a capped trades/quotes slot. **Excluding it is the cap-clearing this change exists for, not a side effect.** |

**So the only gate where "never active" reaches is the one where the exclusion
is the intended win.** And there is no deadlock: **wildcard bars keep flowing
whatever the high-res set holds**, so a dropped name is still observed and can
still revive. Focus remains the safety valve, already built.

### But the filter is needed by more readers than the surface

**The dilution is in the STORE, not on the screen.** Design's filter fixes ONE
reader. **Any analysis over stored `DEAD` rows inherits the 6:1 dilution** — a
revival rate computed over them measures a population six-sevenths composed of
names that never lived. **That is R&D's Q11 problem returning through a
different door**, and Q11 was already constrained once for exactly this reason.

> **~~NAME THE PREDICATE ONCE.~~ WRONG AS WRITTEN, and it is my second
> instance of this exact error.** I proposed
> *`dead_at_peak_trades >= activeTradesPerMinute`* **as that expression
> everywhere**. R&D measured the two candidates: **mine admits 512
> symbol-days, Q11's two-consecutive admits 423, and the 89 between them peak
> above the line without ever SUSTAINING it — a 9.5% gap.**

**Both are right, for different questions, and unifying them would have been
the failure rather than the fix:**

| reader | asks | predicate |
| --- | --- | --- |
| the graveyard surface | *was this ever meaningfully alive* | peak ≥ active line |
| Q11 | *could this have been DROPPED* | **two consecutive** ≥ active line, because the live `ACTIVE` state requires two sustained minutes — a name that never sustained two was never on the active board and cannot have fallen off it |

> **COUNTING THE CALLERS IS NOT ASKING EACH WHAT IT NEEDS — and this is the
> SECOND time I have made that mistake.** The first was `readDailyBars`, where
> I unified four callers on one definition of a usable bar and it was right for
> rates and wrong for bounds. **Here I proposed unifying two readers on one
> definition of "ever active", and it is right for a display and wrong for a
> drop rate.** Same thread, same shape, different function. **The repair is the
> same one that worked there: let the boundary fall between the readers, and
> make the choice VISIBLE at each call site rather than unified away.**

**What survives of the original point is the half that was right:** two
predicates under one phrase, *unstated*, is still the collision. **The fix is
naming which, not forcing one.** R&D's version is better than mine and is the
form to keep: **divergence is not uniformly bad — it is uniformly worth knowing
about.** The same definition difference cost 8.5 points on the revival rate and
PREVENTED a 45% dilution on Q11's drop population.

*And the display-side fix remains right and still insufficient alone: a
judgement applied at one reader is not applied, it is applied there. That part
stands.*

### POST-DEPLOY VERIFICATION, PRE-REGISTERED before the deploy so it cannot be fitted to what lands

*The author confirms the behaviour; Ops confirms the release. Written 2026-09-04
while the deploy instruction was still being composed.*

**THE ORDER MATTERS: check the DISTRIBUTION first, and the exclusions second.**
Both gates FAIL OPEN, so if `activity` were `UNKNOWN` everywhere the gates
would correctly do nothing — **and a board with no exclusions would look
exactly like a board with no dead names.** Checking "did dead names get
excluded" first is a check that cannot tell success from failure.

**1. Does the column VARY?** `SELECT activity, COUNT(*) … GROUP BY activity`
on the live trading date.

| reading | means |
| --- | --- |
| all `NULL` | **the four-site trap** — a column added but not in `DO UPDATE SET`, or missing from `toRow` |
| one value forever | same trap, or the value frozen at the seeded `'UNKNOWN'` |
| all `'UNKNOWN'`, none else | **the engine is computing but `minuteTrades` is empty** — trade counts not reaching `ingestBar` |
| a mix of all three | working |

**2. Does a death carry its evidence?** For rows where `activity = 'DEAD'`,
`dead_since`, `dead_at_rank`, `dead_at_peak_trades` and `dead_at_price` must
all be non-null — they are captured together at one transition, so **a DEAD row
with any of them null means the capture block did not run**, and the graveyard
would render a death it cannot describe.

**3. Only then, the exclusions.** Count top-`autoRank` slots held by `'DEAD'`
names, and compare against Ops's pre-deploy RTH baseline — **stating the
predicate beside the number**, because the baseline used "no bar in five
minutes" and the shipped rule excludes the in-flight minute and requires five
CONSECUTIVE minutes at or below the dead line. **The shipped rule will fire
LESS than the baseline predicate. That is a definition change, not a
regression**, and it must be said in the same sentence as the comparison.

**What would make me say it is NOT working:** any of the four readings above;
a `DEAD` row missing its captured evidence; or `death_count` climbing into
double figures on many names in one session, which would mean the thresholds
are wrong for RTH rather than that the rule is broken — *the premarket-derived
threshold caveat arriving as data.*

### SCOPE: ranked-and-alive. *Integration's word 2026-09-03; enumerated by search, not from the two sites it named.*

**Most rank consumers must NOT change, and two of them would be damaged by
this if it were applied broadly. That is the finding of the enumeration.**

| # | site | change? |
| --- | --- | --- |
| 1 | `lib/research/queue.ts:55` — `isEligible`, `rank > autoRank → reject` | **YES.** A dead name inside `autoRank` holds a research slot |
| 2 | `engine.ts applyHighResSelection` — `rank <= internalRank` | **YES.** Holds a trades/quotes slot in the 250 cap |
| 3 | same function — `if (runtime.latched) selected.add(…)` | **YES**, the already-scoped `latched && alive`. Two independent gates in one function wanting one predicate |
| 4 | `repo.ts:583` — the board query, `WHERE rvol_rank IS NOT NULL` | **NO — AND IT MUST NOT.** This feeds the graveyard as well as the board. Filter dead names here and **the graveyard has nothing to render** |
| 5 | `worker/desk-assessments.ts` / `assessmentRepo` — checkpoint capture | **NO — AND IT MUST NOT.** Append-only since 2026-08-17. Excluding corpses would **silently change what a historical checkpoint means**, and no run buys that back |
| 6 | `lib/desk/assessment.ts:160,186` — "entered/left Top N" | **no.** Cleared, with the reason: we change READERS, not the rank, so no transition fires that would not have fired anyway |
| 7 | `lib/desk/assessment.ts:88` — the a/b/c/d rank bucket | **no.** Same reason as 6 |
| 8 | `lib/dashboard/telemetry.ts`, `view.ts` sorting | **no.** Presentation, and the graveyard partition is Design's |

**Sites 4 and 5 are why this had to be enumerated rather than taken as "the
rank consumers".** A plausible reading of *"rank-based consumers ask ranked and
alive"* would have emptied the graveyard and corrupted the append-only record —
the two most expensive things on this desk — while looking like faithful
implementation.

### THE GATE MUST FAIL OPEN: exclude only on explicit DEAD

`activity` is optional and live-only. A candidate built from a store read
carries `undefined`, which means *the value did not survive its journey* and
**not** *this name is dead*. So the predicate is **`activity === 'DEAD'` →
exclude**, with `undefined` and `'UNKNOWN'` both keeping the name. **A name is
denied research only when the desk positively knows it is dead**, never on an
absence — which is the same rule as everywhere else here, and the safe
direction besides.

### AND THE SEQUENCING IS FORCED, NOT CHOSEN

**`readBoardCandidates(db, …)` reads the STORE** (`worker/research.ts:312`).
The research worker is a **different process** from the market worker and has
no access to engine memory.

> **So site 1 CANNOT WORK until `activity` is persisted to `ticker_session` —
> Ops's schema gate. Sites 2 and 3 are engine-internal and work immediately.**

**Which means the bundle does not deliver what the finding describes.**
Shipping it without persistence fixes the **subscription** slots and leaves the
**research** slots — the more expensive half — exactly as they are. That is a
statement about what the win is, and it should not be discovered mid-build or
claimed in a release note.

*Sizing stays post-deploy per Integration: how many top-N slots dead names hold
at an instant needs live data, and prices the win rather than deciding it.*

### CORRECTION: persistence gates the GRAVEYARD too, not only the research half

*Found 2026-09-03 while answering the migration question. I told Integration
the unpersisted bundle "fixes the subscription slots and leaves the research
slots". **That understated it.***

`toDemandState` (`repo.ts:367`) builds its result from explicit columns, and
`readModel.ts:422` serves the board through `readDemandStates` — **a store
read.** The emission is live-only inside the market worker; the surface is a
different process reading the database. **With no columns, every activity field
is absent by the time any surface sees it.**

> **So Design cannot build the graveyard against live state. Without the
> migration the bundle delivers ONE of three things — the high-res subscription
> gate, which is engine-internal — and neither the graveyard nor the research
> gate.**

**The migration is therefore not a Q9 nicety and not half of this: it is the
gate on nearly all of it.**

### AUDIT (Ops's condition 2): can a LIVE row carry a NULL activity?

**Answer: no — there is exactly one writer, and it always populates the field.
But the audit found a trap that would have made the column look populated and
be permanently wrong.**

*Search scope stated so the null is interpretable: `INTO ticker_session`,
`UPDATE ticker_session`, `DELETE FROM ticker_session` across `lib/` and
`worker/`.*

| path | verdict |
| --- | --- |
| `upsertTickerSessions` (`repo.ts:435`) — the **only** INSERT | the single writer |
| called from `worker/runtime.ts:1346` — the **only** call site | `engine.drainDirty()` mapped through `toRow` |
| `db.ts:994` `DELETE FROM ticker_session` | the `claimStoreForMode` wipe. **Removes rows; never writes a partial one** |

**Every row therefore originates in an engine snapshot, and the engine always
sets `activity`** — initialised `'UNKNOWN'` in `createRuntime`, reassigned on
every `refreshDerived`. **Seeded symbols come through the same path** (there is
no second INSERT), so a seeded row carries `'UNKNOWN'`, which is both correct
and meaningful: the desk holds the symbol and has no minute data for it.

**So NULL can only mean "written before this column existed", and the
undefined-versus-`UNKNOWN` distinction survives contact with the store.**

### THE TRAP: the upsert needs the column in FOUR places, and three is silent

`ON CONFLICT DO UPDATE SET` is an **explicit column-by-column list**
(`repo.ts:495-530`). A new column must appear in the INSERT list, the `VALUES`
placeholders, the `DO UPDATE SET`, **and** `toRow`.

> **Miss the `DO UPDATE SET` and the column INSERTS ONCE AND NEVER UPDATES.**
> Every row freezes at its first value — which for `activity` is `'UNKNOWN'`,
> written the moment the symbol was seeded. **A column that is always
> `'UNKNOWN'` looks populated**, is non-null so nothing flags it, and would
> read as "the desk cannot tell" forever. *A constant dressed as a
> measurement*, in the exact place this desk has already been bitten twice.

**The falsifiable check is one test: upsert a row, upsert it again with a
different activity, assert the stored value CHANGED.** It fails loudly on a
three-of-four wiring and cannot pass by accident.

### SECOND FINDING: a restart must not erase a death

On restart the engine's maps are empty, so `activity` returns `'UNKNOWN'` with
`deadSince`, `deadAtRank` and `deadAtPeakTrades` null and `deathCount` 0. **A
plain overwrite would erase the stored record of a name that died before the
restart** — the graveyard's own evidence, destroyed by a process event rather
than by anything the market did.

`top12_entered_at` already sets the precedent with `COALESCE`. **But a blanket
COALESCE is wrong here, because `deadSince` MUST clear on a genuine revival.**

**The two cases are distinguishable by the activity value itself:** `'UNKNOWN'`
is amnesia and must preserve; `'ACTIVE'` is a real determination and must
clear. And **`death_count` wants `MAX`** — a restart forgetting is not evidence
that the deaths did not happen.

*Recommendation recorded rather than built, since the columns do not exist
yet.*

### The migration question, answered: JOIN THE MIGRATION, SPLIT THE WRITERS

**Joining costs essentially nothing.** `ADDED_COLUMNS` entries are bare
nullable types with no default, and SQLite's `ADD COLUMN` for such a column is
a **metadata-only O(1) operation — no table rewrite** — so eleven columns cost
what one costs, even on `ticker_session`, the largest table on the desk. One
gate, one migration, one startup-race exposure: Integration's reasoning holds
and the marginal cost of joining is near zero.

**But the WRITERS must stay separable, and that is where the entanglement
would be.** Q9's capture is *"a network dependency, not a column"* (item 28) —
it introduces a **Google Sheets call into the append-only checkpoint writer**,
19 times a session. Activity persistence writes values already in memory.
**Coupling those means a rollback of Q9's network risk also rolls back the
thing that unblocks the graveyard and the research gate.**

**Columns are inert until something writes them**, so the two are only
entangled if we choose to entangle them. **One migration, two writers, shipped
and verified on their own terms** — and their verifications are different
anyway: activity is confirmed by the column populating and the gate excluding,
Q9 by a validation join against production Sheet floats.

*Original scope below, unchanged.*

**41a. The scope as delivered — SCOPE ONLY, nothing built at the time.**
*Trader's decision via Integration 2026-09-03: persistence is 5 minutes,
activity is minute trade count, active ~300/min and dead = ÷10 = 30/min, his
10× ratio kept. Design goes to him before code exists; Ops gates anything
touching the store.*

### The mechanic that decides the implementation: A DEAD MINUTE HAS NO BAR

**Measured, not assumed.** In the item 40 probe, `BTCT` on 2025-06-03 returned
bars at **13:30, 13:32, 13:33** — with `limit=3`, so 13:31 was not displaced,
it **does not exist.** Alpaca emits no minute bar for a minute with no trades.

> **So death arrives as ABSENT bars, not as bars with low `n`. The check must
> be a WALL-CLOCK window over five minute-slots with a missing slot counted as
> ZERO trades — never "the last five bars", which on a dying name spans an
> arbitrary and expanding stretch of real time.**

This is *absence of detection is not detection of absence* in its most
literal form: the quiet name and the dead name differ by whether a row exists.

### The population trap, measured

The threshold is calibrated for names that are RUNNING. Across the 24,429
stored symbol-days:

| | |
| --- | --- |
| median symbol-day, averaged over RTH | **2.24 trades/min** |
| symbol-days averaging **> 300/min** | 333 — **1.4%** |
| symbol-days averaging **> 30/min** (the dead line) | 3,023 — **12.4%** |

> **So ~88% of tracked symbol-days sit below the DEAD threshold for the entire
> session.** The rule is sound for the board — the top of the RVOL ranking is
> the 1.4% — but `this.tickers` holds the whole tracked universe, and anything
> iterating it rather than the RANKED set marks nearly everything dead.
> **The scope is "should this name stay on the board", never "is this ticker
> alive".**

*Limit, stated: a daily average cannot predict how often FIVE CONSECUTIVE
minutes fall below 30. That needs minute data — measurable on production's
3-day window, or re-fetched per item 40, and NOT measurable from here. The
figures above bound the population; they do not give the firing rate.*

### The three scope questions, answered

**Q1 — unranked, hidden, or flagged? Today there is no third state, and that
is the finding.** `rvol_rank = null` removes the row from the board query
entirely (`readDemandStates` filters `rvol_rank IS NOT NULL`), so *unranked*
**is** *hidden*.

**Recommendation: the engine DETERMINES and EXPOSES; the board decides.** If
the engine merely nulls the rank, Design has no choice and the row vanishes
with no trace — **a name silently disappearing is the exact inverse of
"intelligence platform, not signal platform"**, and the trader cannot tell a
dropped name from one that was never there. So the engine emits
`activityState` and `deadSince` regardless of what the board then does with
them. **The determination is mine; the rendering is Design's — and Design can
only have that choice if the state is emitted rather than implied by an
absence.**

**Q2 — revival. 33% is not an edge case, and the latch is why it flickers.**
Because RVOL is cumulative and never decays (item 38), **a revived name
returns instantly at its old high rank** — its numerator was frozen, not lost.
Without hysteresis the board oscillates for a third of all removals.

**Recommendation: asymmetric hysteresis** — five minutes below to leave, and
**more than one minute above to return.** The asymmetry is the whole point and
it is cheap. R&D's own figure argues for making re-entry deliberately sticky:
**only 7% of revivals reach +25% or better**, so most returns are not tradeable
and a fast re-entry buys flicker rather than opportunity.

**Q3 — clear `latched` on removal? NO — and the reason is one flag doing two
jobs.**

| what `latched` is used for | should activity affect it? |
| --- | --- |
| *"did this name ever qualify today"* — price-band eligibility (`engine.ts:1110`) | **no.** It is a session fact, and it is what makes re-entry possible at all. Clearing it breaks exactly the 33% that revive — permanently, if their price has also left the band |
| *"is this worth a high-resolution subscription"* — `applyHighResSelection` adds **every** latched name to a set capped at 250 (`engine.ts:1546`) | **yes** — and this is where the cap problem I found already lives |

> **Leave `latched` alone and change what READS it.** High-res selection should
> ask for `latched && alive`. That fixes the cap filling with dead names, which
> is a second and independent benefit, without touching the flag that makes
> re-entry meaningful.

### Size, and where the gates are

**Engine-only for the determination.** `minuteTrades: Map<string, number>`
mirroring the existing `minuteVolumes` (`engine.ts:106`) — the same pattern
`minuteNotional` already uses, so it is a proven shape rather than a new one.
**No subscription change, no second SIP connection, no REST call**: the data is
already on the wildcard bar and already ignored at `ingestBar`.

**Persisting the state to `ticker_session` is a schema change and therefore
Ops's gate.** Whether it needs persisting at all is the open question below.

**And if it IS persisted, the threshold must travel with it.** The removal
decision is derived state at an instant; its inputs are re-fetchable (item 40),
so it is re-derivable **only if the thresholds in force at the time are
recorded**. Change 300 or the ÷10 later and every past decision becomes
unreproducible while still looking authoritative. **`float_basis` one more
time, on a new field.**

### Two things the evidence does not cover, stated before he sees it

- **The study is premarket-only** (04:00–09:29, deaths that cannot straddle the
  open). The desk's standing rule is that **no rule may be keyed to the
  session** — time of day is a reporting dimension until the record shows
  otherwise. **So apply it uniformly and report the outcome BY session**, and
  treat the rates as unverified outside premarket rather than as general.
- **Every rate is a FLOOR, by grain.** Minute bars cannot see a sub-minute
  revival, and his own exit grain is 10 seconds. **A name can die and revive
  inside one minute and this rule is blind to it by construction** — not a
  defect, but it bounds what the 33% and 7% mean.

---

**40. Historical minute bars DO carry trade count, and my "at any price" was
wrong.** *Contradiction between this thread and R&D, routed by Integration
2026-09-03 before either built on it. Settled by probe, and it settles against
me.*

**None of the three offered answers is quite right: the VENDOR is (a) and the
DESK is (b).**

### The vendor returns `n` historically — measured, not assumed

| symbol | date | depth | trade counts returned |
| --- | --- | --- | --- |
| VSME | 2026-06-10 | ~3 months | `n` = 12,699 / 20,008 / 23,663 |
| BTCT | 2025-06-03 | ~15 months | `n` = 7 / 11 / 20 |

*Two requests, `limit=3`, `timeframe=1Min`. Present at both depths, on a busy
name and a quiet one.*

### A persisting path exists and already carries it — but only ever asks for TODAY

`worker/runtime.ts:868` maps `tradeCount: bar.n ?? null` from a **historical
minute-bar fetch** (`source: 'alpaca-historical-minute-bars'`) and `:887`
writes it via `upsertMinuteBars`, which stores `trade_count`.

**But it is a same-session recovery backfill**, and it writes
`upsertMinuteBars(this.db, this.tradingDate, …)` — the CURRENT date. The writer
**takes** a date parameter, so it is nearly general already; **no caller ever
passes a past one.**

### And the pruner would delete anything re-fetched for a past date

`pruneRetention()` builds `keep = [today, today-1, today-2]` and
`pruneMinuteBars` runs `DELETE … WHERE trading_date NOT IN (keep)`. **So
re-fetched history survives only until the next prune cycle** unless the keep
set is widened or the analysis runs inside one.

### What this means, and it is a much better sentence than mine

> **The revival study's window is a BUILD away, not impossible.** Two small
> pieces: a caller that fetches a past date and hands it to the writer that
> already accepts one, and a retention decision so the pruner does not undo it.
> **Nothing is being lost meanwhile** — that is the whole point of
> re-fetchable.

**My error, named because it is the same one twice in a day:** *"cannot go
further back at any price"* was a claim about the **vendor**, inferred from a
fact about **local retention**. Earlier today I inferred production's schema
from a stale snapshot file. **Both times I read a property of a local store as
a property of the world.**

**R&D's re-fetchability finding DOES extend to trade counts**, which was the
specific thing in doubt. *And it does not matter whether R&D's 13-session
backfill was daily or minute bars — Integration's reconciling hypothesis is
moot rather than wrong, because the measurement here stands on its own path.
I did not verify R&D's path and am not claiming anything about it.*

---

**39. Alpaca trades are DEEP — bounded by the listing, not by the
subscription. The 10-second question has no clock.** *Vendor probe run for
Integration 2026-09-03, read-only. 12 requests, all HTTP 200, zero 429s.*

**ANSWER: deep. So by Integration's own decision rule, nothing is
observable-once here, no capture decision goes to the trader, and a
ten-second reconstruction is a build that queues like any other.**

### Depth — and the absences are listing history, not a floor

| symbol | 2019-06 | 2021-06 | 2023-06 | 2025-06 | 2026-08 |
| --- | --- | --- | --- | --- | --- |
| **BTCT** | — | **hit** | **hit** | **hit** | **hit** |
| **VSME** | — | — | — | **hit** | **hit** |

**The decisive request was the one after the table.** An absence alone could
not distinguish *"the subscription stops here"* from *"the symbol did not
exist yet"* — the desk's standing rule — so BTCT was probed at its own listing
start: **trades exist at 2020-06-15, ~6.2 years back**, against a daily history
measured at 1,608 sessions. **Depth runs to the listing.** VSME's absences sit
before its own listing for the same reason.

*Method and its limits: `limit=1` on every request, so depth was tested WITHOUT
pulling volume — one row answers "does data exist here" at the cost of one row.
A one-day window at each depth, so a hit means trades on THAT date. I did not
search for the account's maximum depth and did not characterise the service by
exhausting it; the claim is "reaches the listing", not "has no limit".*

### Page cost, measured from the desk's own store at ZERO vendor cost

Using the trade counts item 38 found already stored — 24,429 symbol-days:

| | trades in a symbol-day | pages at 10,000/page |
| --- | ---: | ---: |
| p50 | 873 | **1** |
| p90 | 14,641 | 2 |
| p99 | 150,739 | **16** |
| heaviest (AZI 2026-06-09) | 1,908,100 | **~191** |

> **THE COST SITS ENTIRELY ON THE DAYS OF INTEREST.** A quiet symbol-day is one
> request. **The day a name actually runs — the only day this question is about
> — is tens to ~200 requests for ONE symbol-day.** Quoting the median here
> would be true and useless, which is this desk's own units problem in a new
> place.

### A dependency nobody named: trades come back RAW

BTCT prints **$11.17 on 2020-06-15 and $0.45 on 2026-08-18**. That is
pre-reverse-split pricing — **the trades endpoint is unadjusted.** So any
ten-second reconstruction spanning a split needs the cumulative factor to be
comparable at all, and that factor is `daily_bars.split_factor`, which the
basis fetch is populating right now.

**The basis work has a second consumer that nobody anticipated when it was
approved**, and it arrived from an unrelated direction. Worth saying plainly
because the reverse would have been expensive: a ten-second series built
without it would look fine and be wrong across exactly the 35% of researched
tickers carrying a reverse split.

*Attribution, so nothing is misread against Ops's watch triggers: 12 REST
requests between 20:47:14Z and 20:47:52Z, all HTTP 200, no rate limiting. Any
429 in that window is mine, not the basis fetch's.*

---

**38. RVOL is cumulative — confirmed, with a SECOND latch nobody had named, and
the obvious remedy is forbidden.** *Two diagnostics commissioned by the trader
via Integration 2026-09-03. Reads, not builds. Nothing changed.*

### Q1 — yes, and it is worse than the hypothesis

`lib/market/rvol.ts` states it in its own header, and not incidentally:

> *Daily RVOL = current cumulative trading-day volume / average full-session
> volume over the previous 20 eligible full trading sessions.* **The
> denominator is fixed for the whole session**, so it *"rises naturally as
> cumulative volume accumulates"* — explicitly **not** volume-at-this-minute
> over average-at-this-minute, not a rolling intraday comparison, not
> time-normalised, not acceleration.

**Confirmed at system level rather than from the pure function**, which is the
distinction this thread got wrong once before: `engine.ts:1012` sets
`cumulativeVolume = volumeBase + minuteSum`; `minuteSum` only ever accumulates
(`:841-843`); and the single subtraction at `:713` is a **bookkeeping transfer**
into `volumeBase` when the base is re-seeded, leaving the sum unchanged. **So
RVOL is monotonically non-decreasing within a session.**

**THE SECOND LATCH, AND IT IS THE BIGGER ONE.** `engine.ts:1110`:

    priceEligible = price !== null && (inPriceRange(price) || runtime.latched)

`latched` is set `true` on qualification (`:1156`) and **never cleared** —
*searched `lib/market/*.ts`; the only `latched = false` is the initialiser at
`:427` and after-hours' own at `afterHours.ts:45`.* **A name that qualified and
then fell out of the $2–$20 band stays rankable for the rest of the session.**
The trader's phrase *"board presence is a one-time qualification"* is not a
characterisation; it is literally what the code does, twice.

### The refinement that changes what a fix must do

**"The board cannot drop a dead name" is very slightly too strong, and the
correct version is worse.** Rank is cross-sectional (`rankByRvol` over the
`eligible` array rebuilt each cycle at `:1104`), so a dead name *does* fall —
**but only by being overtaken.** Its numerator is frozen while live names
accumulate.

> **A name that reached 50× RVOL at 06:00 sits above every name below 50× for
> the entire session, whether or not it has traded since. The decay rate is set
> by OTHER names' accumulation, and by nothing about this one.**

That is the precise form of *integrating the past instead of measuring the
present*, and it does make **late** and **stale** one defect.

### But the obvious remedy is prohibited, which is why the four-measure proposal is the right shape

`rvol.ts:4-5`: **"THE DEFINITION IS FIXED. It comes from completed backtesting
and must not be replaced with a time-of-day adjusted formula."** So the
diagnosis stands *and* windowing RVOL is closed by a standing instruction.
**The continuing condition has to be an ADDITIONAL measure beside the ranking,
never a replacement for it.**

### Q2 — the four measures, and one of them is already on the wire

**The subscription surface as shipped.** Wildcard, whole market, always on:
`bars`, `updatedBars`, `statuses` (`stream.ts:45`, `:293`). Trades and quotes
are **deliberately not** wildcarded (`:288-291`). The high-resolution set —
`trades`, `quotes`, `lulds` — is applied as **diffs on the open socket** and
capped at `highResMax`, **default 250**.

| measure | computed from | on the EXISTING subscription? | grain |
| --- | --- | --- | --- |
| **volume** | minute bar `v` | **yes** — wildcard, whole market, already ingested as `minuteSum` | 1 min |
| **activity** | minute bar **`n`, trade count** | **yes** — wildcard, whole market. See below | 1 min |
| **volatility** | minute bar `h`/`l`/`c` | **yes** — wildcard, whole market | 1 min |
| **liquidity** | bid/ask spread and sizes — **quotes** | **NO, not board-wide** — quotes exist only for the ≤250 high-res set | tick |

**ACTIVITY IS FREE, AND FURTHER ALONG THAN "AVAILABLE".** Minute trade count is
**parsed on every wildcard bar** (`alpaca/messages.ts:88`), **persisted to
`minute_bars.trade_count`** (`store/repo.ts:143`, `:168`) and **read back**
(`:196`) — and **nothing scores on it.** *Scope, so the null is interpretable:
grepped `lib/`, `worker/`, `app/`, `components/`; every other hit is a
daily-bar path or the simulator.* So the measure the viscosity research
**confirmed as meaningful** is already arriving whole-market, already stored,
and discarded at the point of use. Adding it is an **engine change only** — no
subscription diff, no second connection, no REST call, no backfill.

**And it is retrospectively measurable today**, against roughly three days of
stored trade counts without collecting anything: `minute_bars` retention is
`minuteBarRetentionDays`, **default 3** (`config.ts:85`).

> **~~and cannot go further back at any price.~~ RETRACTED — see item 40.**
> That was a claim about the VENDOR inferred from a fact about LOCAL
> RETENTION, and it is wrong: Alpaca returns trade counts on historical
> minute bars, measured 15 months back. R&D was right and caught it.

**LIQUIDITY IS THE ASYMMETRIC ONE, AND ITS REAL COST IS NOT THE SUBSCRIPTION.**
Quotes are already subscribed for the high-res set, so a spread measure **for
those names** is free too. Board-wide is impossible on one connection. Worse:

> `applyHighResSelection` adds **every latched name** (`engine.ts:1546`) into a
> set capped at 250, and latched never clears. **So a liquidity-based
> continuing condition would be evaluated on a population selected by the very
> latch it exists to correct** — and the cap is consumed by dead names as the
> session runs.

### On his exit rule, and whether it is the same measure

**No — same quantity, different grain, and only one grain is available.** His
exit is volume fading on **10-second** candles; minute bars cannot express
that, sub-minute requires `trades` (the capped set), and the viscosity research
**closed sub-minute prediction**. So the board's decay signal and his exit
signal are the same idea at two timescales, of which **the board-wide one is
the minute** — and the finer one is both restricted and already investigated to
a negative.

---

**36. The basis fetch is live, and the two things I said about how it would
arrive were both wrong.** *Found 2026-09-03 by reading Ops's deploy record
after noticing `HEAD` had moved past my commits. Neither error is in the code.*

**Production is `97f5fbd`, deployed 05:10 UTC; `3379809` and `268e438` are in
it** — checked by ancestry here, not taken from the commit subject that said so.

### The v22 gate does not exist

I wrote, in this charter and in the message Ops priced from, that the backfill
*"cannot run until the 0f deploy migrates production to schema v22."*
**`SCHEMA_VERSION` was already 22, the bundle contains no `db.ts` at all, and
Ops's post-deploy reading confirms 22.** Ops caught it: *"the earlier claim
that the backfill needed one was wrong, and the real gate was only ever
`worker/basis-backfill.ts` reaching the box."*

**Where the error came from is the reusable part: I inferred production's
schema from the 08-23 SNAPSHOT, which is v21 because it predates the
migration.** The snapshot is the only store I can open from here, and its
schema is a fact about a file from eleven days ago. *Measure a commit, not a
checkout* — in its third costume on this desk: a checkout, a regex, and now a
stale database file, each mistaken for the system.

**The code was never wrong.** `basis-backfill.ts` preflights for the column and
reports rather than raising; against a v21 file that guard is correct and fired
correctly. **What was wrong was a claim about production made from a file.**

### The 462 calls are already being spent, and not by the thing Ops was asked to price

`basisFetchDue` is wired into `worker/research.ts:422` **in the shipped sha** —
verified by reading `97f5fbd:worker/research.ts`, not by remembering what I
wrote. So **every research job for a name with no established factor now
triggers the dual-adjustment fetch automatically.**

**I framed the pricing entirely around the backfill.** *"FOR OPS TO PRICE: 231
researched → 462 Alpaca REST calls"* describes a paced one-off that has not
run and may now never need to. **The live trigger spends the same budget on the
job path, ungated, starting the moment the bundle went live** — and it
pre-empts the backfill for every name that gets researched, leaving the tool
useful only for researched names that are not being re-analysed.

**Bounded, and the bounds are why this is a disclosure rather than an
incident:** two calls per symbol, once ever (the factor persists through
`COALESCE`), one deep fetch per symbol per day from the existing marker, only
for researched names, at `DEFAULT_CONCURRENCY = 2`. **Alpaca REST, no model
spend.** The exposure is the live desk's REST budget inside the trading window
— the same cost item 0 flagged about `ensureDailyHistory` on the server.

> **A gate I put on the TOOL was read as a gate on the CHANGE.** Both halves
> shipped in one commit and I described only the half that waits. Nobody was
> misled about the number; they were misled about *when it starts*.

### Behaviour is NOT verified, and I cannot verify it from here

The README rule is that Ops confirms the deploy and **the author confirms the
behaviour**. Ops has confirmed the release, the services and `stalledJobs`
16 → 0. **Nothing has yet observed my change doing its job**, and the local
snapshot cannot show it — it predates the deploy and the desk runs on AWS.

The falsifiable read, for whoever has the production store, is two counts:

```sql
SELECT COUNT(*) FROM daily_bars WHERE split_factor IS NOT NULL;
SELECT COUNT(DISTINCT symbol) FROM daily_bars WHERE source = 'alpaca-daily-deep';
```

**Both were effectively zero before this shipped** — the blue-sky gate would
ever have fired for 11 symbols, 2 holding a dossier. A rising distinct-symbol
count is the trigger working; **a count that stays flat while research jobs run
is the change doing nothing**, which is exactly the reading `computedCycle`'s
gate produced when it looked healthy at zero. **Ask what makes the number move
before reading either direction as success.**

*And the number that must NOT be quoted as coverage: rendered supply pairs do
not change retroactively. A dossier written before its symbol's basis was
established keeps the pair it was written with. Coverage moves only as names
re-analyse after their factor lands, so any figure taken in the first days is a
floor on a moving quantity and has to say so.*

### The cheap observable, which is a log line rather than a query

`worker/research.ts:426` logs every deep pass with the deciding reason
attached, so the basis trigger is greppable in the journal without touching the
store:

```
[history] <TICKER> deep: <detail> (no split basis established)
```

**`no split basis established` appears only from `basisFetchDue`** — the
blue-sky reasons are worded differently — so a count of that string is a direct
count of basis fetches, and its absence while jobs run is the flat-count
failure above.

### IT LANDS ON OPS'S OPEN LOCK INCIDENT, AND WOULD BE MISATTRIBUTED TO IT

*Predicted from the code and the measured scale, 2026-09-03. Not observed — I
cannot see production — and stated as a mechanism so it can be checked rather
than believed.*

Ops reported two `SqliteError: database is locked` restarts at
`claimQueuedJobs` (`researchRepo.ts:241`) and `completeJob` (`:291`), with a
546MB WAL on an 886MB store, and framed item 0e as *deploy-independent and
worsening as the WAL grows.*

**My change adds a long write transaction to the middle of the job path.**
`ensureDeepHistory` fetches up to ten years and `upsertDailyBars` writes them
in **one transaction per symbol**, on the same handle the worker uses to claim
and complete jobs — and it now runs for **every researched name**, where the
blue-sky gate fired about 0.4 times a morning.

Measured scale, from the 08-23 snapshot:

| | |
| --- | --- |
| `daily_bars` today | **24,429 rows across 256 symbols** — 95.4/symbol, the 90-session window |
| researched tickers that will each fetch once | **231** |
| rows per fetch | up to **~2,520** (AAPL's measured full ten years); small caps are younger — BTCT 1,608, NTWO 414 |
| first-pass upper bound | **~580,000 rows, ~71MB** at the measured 123.1 B/row |

**So the table grows by roughly an order of magnitude, in ~231 long
transactions, on a store already losing writes to lock timeouts.**

> **The hazard is not the size, it is the ATTRIBUTION.** A lock-timeout spike
> after 09-03 fits Ops's existing diagnosis exactly — *worsening as the WAL
> grows* — and a new cause landed the same day. **Matching symptoms are not a
> shared cause**, and this one is pre-loaded to be read as the old one getting
> worse.

**Self-limiting, which bounds it:** each symbol establishes once and never
fetches again, so the load is a first-pass transient, not a new steady state.

**PARTLY SUPERSEDED 2026-09-03 by Ops's live measurement — and my first
version of this note over-read it, which I am correcting here rather than
leaving to be quoted.** Split factors went **19,707 → 99,696 rows, 77 distinct
symbols deep-fetched from zero**, with **four fetches in two hours at RTH, zero
rate-limit errors, `msgAge` 2s and capture unaffected**.

> **THAT READ ANSWERS ONE HALF OF THE CONCERN AND DOES NOT TOUCH THE OTHER.**
> 429s and `msgAge` are **Alpaca-side and capture-side** instruments. The
> prediction was about **store-side write contention** — `SqliteError: database
> is locked` at `claimQueuedJobs` and `completeJob`. **Different instruments,
> and an observation that rules out one cause is not evidence about another.**
> I wrote *"the predicted contention did not materialise"* and that was the
> endpoint-and-parameters error in a new costume, made against my own claim.

**What is answered:** the REST-budget half, negatively — no rate-limit
pressure, capture intact, at the observed rate.

**~~What is unread:~~ READ, and the answer is negative.** *Ops measured it
within the hour, on exactly the instrument named here.* Since the bundle, 13
hours: **61 deep passes — 61 long multi-thousand-row transactions on the same
handle as `claimQueuedJobs` and `completeJob` — and ZERO lock errors**, against
**6 in the preceding six days**. Research restarts **0**.

**So the mechanism is real and the desk is not exhibiting it.** The reasoning
held; the conclusion does not carry on the evidence. Recorded that way round
deliberately: a mechanism that is real and quiet is a thing to watch, not a
thing to have been wrong about — and **the attribution hazard is correspondingly
weaker but not void**, because it was always about how a FUTURE spike would be
read.

**And one premise of mine is measurably wrong, which is the more useful
correction.** I leaned on Ops's *"worsening as the WAL grows"*. **The WAL is
byte-identical at 572,869,552 across twenty hours of the heaviest write load
this desk has carried** — not truncating, but not growing: a steady-state
high-water mark with space being reused. *Ops corrected its own framing there
and I had built on it; a premise inherited from another thread's charter needs
the same check as one of my own.*

**Ops's decision is HOLD AND WATCH, not cancel**, with named triggers: it runs
the paced backfill if lock errors resume above the ~1/day baseline, any 429
appears, `msgAge` degrades during RTH, or the queue backs up. **Its argument
against running now is better than my argument for it: moving load only pays if
the load is costing something, and adding a process to the box to relieve
contention that is not occurring — on the instance an unpaced process took down
six days ago — is the wrong trade.**

**And the argument decays on its own, which bears on the decision:** 77 of 231
are already established, so roughly **two thirds of the unpaced load remains
and shrinks every hour the worker runs.** A mitigation that relocates a cost
is worth less the more of that cost has already been paid. **So my contention
argument should NOT reinstate the backfill window by itself** — read the lock
observable first, and revive the window only if it has moved.

Ops cancelled the backfill window on
better reasoning than mine: **the worker covers names in RANK ORDER**, so the
backfill's remainder is exactly the names that have not been moving — the
lowest-value slice at the highest relative cost. **A third of the researched
population was covered free in half a day.** The prediction above is left
standing rather than deleted because the mechanism is real and the write volume
is real; what was wrong was treating an upper bound as an expected value.
Re-price the tail in a week; it may never earn a window.

**And the mitigation reasoning below is now the minority case** — kept because
it is still the right shape if the load ever does bite: `worker/basis-backfill.ts` does exactly
this work **paced** (`--pace-ms`, default 350) and can run in a quiet window.
**Running it does not add to the load — it MOVES the load off the job path**,
because every name it establishes is a name the in-worker trigger then skips by
construction. That reframes the tool: it is not a redundant second route to the
same rows, it is the controlled way to spend a cost that is otherwise spent
unpaced during the trading day. **Whether to run it, and when, is Ops's call
and the trader's spend.**

---

**37. "(no split basis established)" on a fetch that found four splits — the
log printed a PRECONDITION and it read as a verdict.** *Ops observed it live
2026-09-03 and refused to diagnose code it does not own, which was right.
Answered from the shipped sha, not from memory.*

**The behaviour is correct. The line was not.**

`worker/research.ts` evaluated `deepDue` at `:422` and logged `deepDue.reason`
at `:426`, **after** `ensureDeepHistory` ran at `:425`. So the parenthetical is
**the reason the fetch was TRIGGERED**, stating the state before it — and
SVRN's four split events were found *by that very fetch*.

**The second half, and it is why 0-events names are not the counter-example
they look like.** `deriveSplitFactors` populates `factors` per date and derives
`events` from them afterwards, so **a symbol with zero splits still gets a
complete factor series** (a constant, typically 1). *Zero events is not zero
basis.* CURR, KRSP, SVRN and VRM all established.

**Ops already held the disconfirming evidence and it points the same way:**
`split_factor` rows **19,707 → 99,696**, 77 distinct symbols from zero. Had
establishment been failing, that count could not have moved.

### It is still a real defect, of the family this desk names most

**A symbol that established and one that did not printed the SAME line.** The
underivable case is real — bars returned with no usable raw closes derive no
factors — so the observable genuinely could not separate success from failure,
which is why Ops could not tell and was right not to guess.

Fixed by logging the outcome beside the trigger, asked of the **store** rather
than inferred from the fetch result, with `splitBasisSessions` as **one
definition of "established" shared by the gate and the line** so the two cannot
drift.

### The fix's first draft had the bug in it

**I nearly wrote `basisAfter.due` as the test**, which reads beautifully and is
wrong: after an underivable fetch `basisFetchDue` returns **not-due** — held
off by the once-a-day cap — so the line would have printed *established* for
precisely the failure it exists to expose. **Dueness cannot stand in for
establishment.** Caught while writing the assertion, which is the third time
this week that writing the confirming test disconfirmed the premise.

*Test limit stated rather than left implied: the log STRING lives in a process
entry point that cannot be imported, so `tests/research/basisFetch.test.ts`
pins `splitBasisSessions` and the gate's agreement with it, not the line. Same
shape as item 24 — green tests here do not cover the worker's copy.*

### The one query that settles SVRN, and it beats my argument

**My answer is a code reading, and a code reading is weaker than a count.**
Anyone with the production store should run:

```sql
SELECT COUNT(*) FROM daily_bars WHERE symbol = 'SVRN' AND split_factor IS NOT NULL;
```

**Expect ~1,194** — the sessions that fetch returned. **If it returns 0 I am
wrong and the fetch really is buying nothing**, in which case the defect is in
`deriveSplitFactors` rather than in the log, and item 37's fix addresses the
wrong layer.

The reasoning for expecting ~1,194 is worth stating so the prediction is not
merely confident: **`events` are DERIVED FROM `factors`**, so four events
cannot exist unless the factor series was populated. A symbol reporting splits
has, by construction, established a basis. That is why SVRN is the *strongest*
case rather than the alarming one — and why it should be the query run, since a
zero there would falsify the whole account rather than one corner of it.

### That reasoning is now asserted rather than argued — `aef29c7`

**I had defended it by READING the code and asking another thread to trust the
reading, while a verification resting on it was already reported as passing.**
Same shape as the retry brake in item 33: a premise about code, passed down a
chain no step of which could catch it. So it is pinned, in
`tests/market/splits.test.ts`:

| assertion | what it closes |
| --- | --- |
| a four-consolidation series populates a factor for **every** usable session while reporting 4 events | SVRN's exact shape — the fetch cannot report splits and leave a null basis |
| a never-split series populates the **same full series** with 0 events | **zero events is not zero basis** — CURR and KRSP, and the inference the log invited |
| a series with no usable raw closes establishes **nothing** | the real underivable case, and why the worker asks the STORE rather than inferring from a successful fetch |

**The third is not filler — it is what makes the first two non-vacuous.** They
assert `factors.size` equals the session count, which means nothing unless an
empty map is reachable. **This file has shipped a vacuous test before** (item
33's rounding artefact, which never reached the confirmation logic), so the
reachability demonstration sits beside the tests it protects rather than in a
commit message.

**What a green suite does NOT settle**, kept because the distinction is the
whole discipline: it establishes that **the mechanism cannot do what was
feared**. It does not establish that **SVRN did it**. Only the count above does
that.
