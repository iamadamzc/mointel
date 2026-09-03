# Thread: R&D

**A standing capability, not a project.** The desk should always be learning
something. What it needs to learn will change; the machinery for learning it
should not have to.

Opened 2026-08-23, split out of the Research thread on the grounds that a thread
owning both a billing pipeline and an open research question will always spend
its time on the pipeline.

## Mission

Turn what the desk records into things that are known. Questions arrive, get
worked, and get **closed with a verdict** — including a null. The thread's
health is measured by questions closed, not by questions open.

## Where questions come from

1. **Posed** by the trader, from what he is seeing in the market.
2. **Discovered** by the standing sweep below — the archive noticing that
   something moved before anyone asked.
3. **Spawned** by a closed question. A verdict usually narrows the next one.

All three are equal citizens. The second is the one that makes this worth
building; nobody can pose a question about a shift they have not noticed.

## The register

Every question lives here, dated, with a status. **At most two active at once.**
That cap is the whole anti-diffusion mechanism — a register of eleven open
questions is a thread that has stopped working.

| # | Question | Opened | Status |
| --- | --- | --- | --- |
| Q1 | Why do 50%+ movers no longer carry catalysts, and why are catalyst-driven names passed over? | 2026-08-23 | **ACTIVE** — first half **AMENDED 2026-09-02**: strong form still excluded, but the relationship is now DETECTED at +17.9pp; second half waits on tier A |
| Q6 | Can the 09:25 pre-open assessment (`OPEN_SPIKE_ASSESSMENT`) be scored against outcomes? | 2026-08-23 | **CLOSED 2026-09-03** — `PRE_OPEN_RANK_PREDICTS_VOLATILITY_NOT_EDGE`; rho -0.276 on excursion, but rank 1-5 median RTH close is -8.10% |
| Q5 | When does a board name's move happen, relative to when the desk boards it? | 2026-08-23 | **CLOSED 2026-08-27** — `BOARD_IS_LATE_TO_THE_MOVE`, below |
| Q4 | Can tape character be measured well enough to call a name tradeable? | 2026-08-19 | **CLOSED 2026-08-27** — the viscosity lines already answered it; the row was debt |
| Q2 | Can any tape-character measure be defined at the grain he trades, and does it separate outcomes? | 2026-08-23 | parked — **Q7 merged in**; blocked on sub-minute capture |
| Q3 | What separates a mover from a non-mover in the current regime? | 2026-08-23 | parked — blocked on tier A, the same blocker as Q1's second half |
| Q8 | Which models for which calls — would Anthropic models be better and/or less expensive? | 2026-08-24 | parked — **no open items**; output multiples answered 2026-08-24 in research.md item 20, found 08-27. Ready to design |
| Q9 | Does float — or overhang — relate to how a name performs, and is RVOL the real variable? | 2026-08-27 | parked — blocked on capture; float populated on ~1% of dossiers |
| Q10 | Once a name goes dead intraday, does it come back? | 2026-09-03 | **CLOSED 2026-09-03, AMENDED twice** — back to +25% is rare (14.6% at 5 min quiet, 5.2% at 30). **But every pooled rate blends three session regimes** — premarket 62.3%, RTH 65.6%, after-hours 9.5% at 5 min — **and should not be quoted alone** |
| Q11 | How often does the 5-minute drop rule remove a name that subsequently runs? | 2026-09-03 | proposed — **the rule's own false-positive rate**; blocked until the graveyard columns land and data accumulates |

#### The closing pass, 2026-08-27

**Run at the trader's instruction.** Nine open questions against a two-active
cap is the diffusion the cap exists to prevent, and I had let it accumulate
while reporting on it.

**Two closed, two merged into one, two active, four parked with the blocker
named on each.** A parked question states what would unblock it, so the queue is
a list of conditions rather than a list of intentions.

**Q5 CLOSED — `BOARD_IS_LATE_TO_THE_MOVE`.** Measured on 306 symbol-days
carrying both a first-board-entry timestamp and a session peak:

    peak AFTER the desk boarded it        92   30.1%
    peak BEFORE or AT boarding           214   69.9%
    minutes boarding -> peak      p10 -355   median -43   p90 +246
    among 50%+ movers (n=95)   peak after boarding 37   38.9%

**Seven of ten board names had already topped out when the desk surfaced them,
and the median name peaked 43 minutes before it appeared.** Among the movers it
is six in ten. **This is a third instrument agreeing with two already recorded**
— 32% of board symbol-days are `BACKSIDE` at surfacing, and 44 of 95 movers
peaked before 09:30.

*What would overturn it:* a boarding timestamp that is not first-entry, a
population beyond the top-25-by-RVOL board, or a peak definition narrower than
the full 04:00–20:00 session. *What it does not say:* nothing here is about
names that never reached the board — that is tier A, and it is why **Q3 cannot
be answered by widening this one.**

**Q4 CLOSED.** Its substance was already settled in the closed viscosity lines
below and the row had been carrying a pointer to its own answer since 08-19.
**A question whose verdict is recorded elsewhere is not dormant, it is closed**,
and leaving it open cost a register slot for eight days.

**Q7 MERGED INTO Q2.** Chop Risk, Flush Risk and Effective Float Turnover are
three instances of one question — *can a tape-character measure be defined at
seconds-and-print grain and shown to separate outcomes* — and they share Q2's
blocker exactly. **Two rows for one blocker is the diffusion in miniature.**
Design is unblocked either way and none of the four concepts takes a Phase 2
column.

**Q6 PROMOTED — AND RE-PARKED THE SAME DAY.** I promoted it as answerable with
the archive as it stands. Starting it showed otherwise; see below. **The pass
stands otherwise, and the promotion is left visible rather than edited out.**

**Q1 STAYS ACTIVE while blocked**, deliberately: its first half is this thread's
main result and its second half becomes live the moment tier A exists. **A
blocked anchor is worth a slot; a blocked question with no result behind it is
not**, which is the distinction that sent Q3 and Q9 to the parked list instead.


**Q8 came from the trader on 2026-08-24**, in his words: *"we are using gpt,
which models for what calls, would anthropic models be better and/or less
expensive."* This thread owns the question, the evaluation design and the
outcome variable; **Research owns the pipeline facts and any implementation.**

**It is three questions, not one, because the bill is not where anyone pictures
it.** Measured by Research over 2026-08-19..21:

| Stage | calls | input tokens | share |
| --- | ---: | ---: | ---: |
| DISCOVERY | 216 | 7,862,324 | **56%** |
| RESOLVER | 181 | 3,853,202 | 28% |
| INTERPRETATION | 312 | 2,024,072 | 14% |

84% of the bill is *finding* evidence and 14% is *reading* it, so the
interpretation call everybody pictures is the smallest prize.

**THE FEASIBILITY BLOCKER IS ANSWERED, AND IT REVERSES THE FRAMING.** Discovery
is a model call plus a **provider-hosted web search**, which raised the
possibility that the answer for 56% of the bill is *cannot swap* rather than
*costs more or less*. It is not: **Anthropic has a first-party server-side web
search tool** — `web_search_20260209` (`web_search`), running on Anthropic's
infrastructure with `max_uses`, `allowed_domains`/`blocked_domains` and
`user_location`, plus `web_fetch_20260209` alongside it. So discovery is
swappable in principle and no stage is ruled out on capability.
*Source: bundled `claude-api` skill reference, cached 2026-06-24. Two integration
notes that matter: the `_20260209` variants need Opus 4.6+ or Sonnet 4.6+, and
server-tool errors return **HTTP 200 with an error object rather than raising** —
a swap that treats them as exceptions will silently see zero failures.*

Interpretation's requirement is also met: structured output via
`output_config: {format: ...}` and `strict: true` on tool definitions.

**Published Anthropic pricing**, per 1M tokens, first-party API, same source and
date — quoted rather than recalled, because a stale price is exactly the
confident wrong number this thread spent a week learning to distrust:

| Model | Input | Output |
| --- | ---: | ---: |
| Claude Opus 5 | $5.00 | $25.00 |
| Claude Sonnet 5 | $3.00 ($2.00 intro to 2026-08-31) | $15.00 ($10.00 intro) |
| Claude Haiku 4.5 | $1.00 | $5.00 |

**ALL THREE ASKS ANSWERED 2026-08-24, and two of them reorder this scope.**
Research ran them before Phase C rather than after, on the grounds that
designing an evaluation on an input-only view would have been the wasteful
order. It was right.

**Interpretation overtakes the resolver once output is counted.** Verified here
from the raw figures rather than adopted:

| Stage | out/in | input-only share | **weighted at 5× output** |
| --- | ---: | ---: | ---: |
| DISCOVERY | 0.024 | 56.5% | **47.4%** |
| INTERPRETATION | **0.270** | 14.5% | **25.7%** |
| RESOLVER | 0.037 | 27.7% | **24.7%** |
| ESCALATION | 0.297 | 1.2% | 2.3% |

Research carried its own correction with the numbers: *"my 84% finding / 14%
reading framing is true of input and misleading as a cost statement."*
Interpretation is understated by nearly two on the input view **because it is the
only stage that writes** — an 11× difference in output-per-input against
discovery.

*One precision this thread adds: the 5× is **Anthropic's** price ratio, so the
right-hand column is the shape of an Anthropic bill, not of the current one. It
is the correct weighting for deciding where an Anthropic swap pays; describing
today's spend needs the incumbent's own output multiple, which nobody has.*

**The resolver depends on hosted search too, so the search-dependent share is
84% of input and 72% weighted — not 56%.** `OpenAiCompanySourceResolver` sends
`tools: [{type:'web_search'}]` and lives in the same file as the discovery
provider. The feasibility answer is unchanged — Anthropic's `web_search_20260209`
covers both — but far more of the bill rests on it than the first cut suggested.

**The caching confound is absent, and it was checked rather than assumed.**
8.5% cached on discovery, 10.6% overall, and the largest cached prefix on any
discovery call is **4,951 tokens against a 36,399 average**. The authored prompt
is ~254 tokens, so the cacheable part is the tool and schema preamble and
nothing else. **The 36,400 tokens are retrieved page content — unique per call
and inherently uncacheable.** There is no stable 36k prefix for any provider to
be credited or blamed for. The concern was correct in form and simply does not
apply here, which is worth more than having assumed it either way.

**So it is two comparisons, not one, and they are genuinely different
questions** — Research's framing and it sharpens the mixed-provider point rather
than complicating it:

- **Discovery and the resolver compete on RETRIEVAL VOLUME**, not token price,
  because the cost is irreducibly uncached page content. How much each
  provider's search pulls in *is* the cost. Worth noting that
  `web_search_20260209` exposes **`max_uses`**, which makes retrieval volume a
  directly controllable lever rather than a property of the provider — that may
  matter more than the per-token rate.
- **Interpretation is our own bundle in, the product out.** A conventional
  model comparison, and the only stage where output dominates.

**One thing still open, and it is smaller than it was.**

The incumbent's output multiple. Every Anthropic figure here is weighted at 5×;
the current provider's ratio is unknown, and without it the *saving* cannot be
quoted even though the *shape* now can.

**The outcome variable is citation rate, not catalyst quality**, for the reason
that already settled `search_context_size`: quality needs a grader, this desk's
grader is 45% irreproducible, so a quality comparison measures the grader.
Citation is countable and exact and already discriminates at 55-against-37.

**And it is the right instrument, not merely the measurable one** — which is a
tie-break rule and has to be fixed before the evaluation is designed, not chosen
afterwards when a result is looking back at me. The desk's job is to say **why a
name was surfaced**, and a citation is the trace of that. So:

> **A model that grades identically but cites less is a WORSE outcome, not a
> cheaper equal one.** Citations are not a cost of the answer; on this desk they
> are part of the answer.

Without that written down, the honest reading of *same grades, fewer citations,
lower bill* is "no quality difference, take the saving". Under the desk's own
framing — an intelligence platform rather than a signal platform — it is a
quality difference that happens not to show up in the grade.

**The design is alternation on the live desk**, not a paired A/B — zero marginal
tokens, and the confound is period, which alternating removes.

**Mixed providers per stage is on the table from the start rather than as a
compromise.** `openaiInterpreter` already has a tier system with an escalation
model that the README records as *designed but never exercised*; if a second
provider enters anywhere, that is the seam it enters through.

**Nothing further needed from Research**, which is not picking up Q8 and answers
facts through Integration only.

**Q9 came from the trader on 2026-08-27**, in his words: *"perhaps there is an
entire different way to approach this. i'm not sure if studying performance of
these and see if their performance is in any way tied to their float/overhang
and if a correlation can be found. perhaps related or correlated to rvol. i dont
know."* **He is explicit that he does not know, which makes it a question rather
than a hypothesis to confirm** — the register's preferred shape.

**It is Pillar 5, and Pillar 5 is the pillar with no measurement.** Pillar 4 has
a bounded negative on this desk. *Float under 10M* has never been tested against
outcomes here at all, and it is the one he is being asked to change how he sees.

**WHY IT ARRIVED: `CLEAN` HAS NEVER BEEN PRODUCED.** Integration reports 0 across
1,850 archived assessments; **independently confirmed here on a different sample**
— 350 local ticker rows give `CAUTION` 201, null 66, `UNKNOWN` 54, `DIRTY_FLOAT`
29, **`CLEAN` 0.**

**The reason is structural rather than a data accident.** `DIRTY` is provable by
finding one thing; **`CLEAN` requires proving the absence of resale
registrations, conversion reserves and equity lines.** A three-state label whose
third state requires proving a negative will never reach it, and the rule *never
promote UNKNOWN to CLEAN* is correct and seals it. This thread's own work is why
the DIRTY side is close to universally satisfiable: the vendor float contradicts
itself on 4 of 18 names from the same source at the same instant, and ~35% of
researched tickers carry a reverse split. **"Materially unreliable" is true of
nearly every name he trades.** Replacing the verdict with an overhang ratio plus
its basis is approved and is Research's work; **Q9 is the question underneath it
— whether the quantity predicts anything at all.**

#### The feasibility answer, and it is a hard blocker

**Checked before registering, because a question that cannot be started is debt
in the same way an unclosed one is.** There is **no float or overhang column
anywhere in `market.db`** — not in `desk_assessment_tickers`, not in the archive.
Float exists only inside the research dossier JSON, and there it is a field
rather than a value:

| dossier path | present | carries a NUMBER |
| --- | ---: | ---: |
| `/structure/sharesOutstanding` | 94 | **27** |
| `/structure/displayedFloat` | 94 | **1** |
| `/structure/displayedFloatDate` | 94 | 0 |
| `/structure/displayedFloatSource` | 94 | 0 |
| `/structure/floatConfidence` | 94 | 0 |

**One float number across the entire local research corpus.** So Q9 is not
answerable today, and the reason is sharper than the caveat it arrived with:
the caveat was *every stored float is the Sheet's vendor number*. **The stronger
fact is that there is essentially no stored float at all.**

**Stated with its own limits, per the rule that cost me a wrong count last
night:** the table above is the LOCAL store, 94 versions, stale after
2026-08-18. **The shape of the finding is a schema-and-pipeline fact rather than
a sample-size one — a field that is written but not populated stays unpopulated
at any scale — but the 1-of-94 itself must be re-measured on production before
it is quoted as final.**

**RE-MEASURED BY RESEARCH AND IT HOLDS, with two corrections to how I first
recorded it — one theirs, one mine.**

`displayedFloat` is populated on **2 of 231 dossiers, 1%**, against 1 of 94,
**1.06%**, locally. `floatConfidence` is `UNKNOWN` on **229 of 231**, matching 0
of 94 carrying a value here.

**Their correction: that 231 is a production SNAPSHOT whose versions end
2026-08-21T22:25Z, not the live store.** I first wrote it as *production* with no
as-of, which is this thread's own basis rule broken in the entry where it was
being invoked. **Neither number is current.** The local corpus ends 08-18, the
snapshot ends 08-21, today is 2026-08-27 — **six and nine days stale
respectively.** A live-store count is queued with Ops and
supersedes both.

**My correction, and it is the load-bearing one: I called these two samples and
they are one sample and its superset.** Local holds versions with ids **1 to
94**, 08-17 to 08-18; the snapshot holds 231 through 08-21 on the same pipeline,
so **the 94 are almost certainly a prefix of the 231** — the check is whether
production ids 1-94 are these rows, which I have not run and which Ops can
settle in one query. If they are, the incremental evidence is **137 versions,
not 231**, and if the local 1 is among the production 2 the rate on the genuinely
new rows is **1 of 137, 0.73%.**

**"Two stores 2.5x apart in size, same rate" was the strongest-sounding sentence
in this entry and it was wrong.** A superset agreeing with its own prefix is
arithmetic, not replication. The conclusion is untouched — 0.73%, 1% and 1.06%
are the same answer — but *the reason to believe it* was overstated, and that is
the half a reader carries forward.

**What does survive is the prediction, and only because it was made first.** *A
field written but not populated stays unpopulated at any scale* was recorded
before any second number existed. That is worth little once confirmed and a
great deal beforehand, and noting the order is what stops it reading as a
rationalisation of a result already in hand.

**What would unblock it,** in the order that costs least: capture `displayedFloat`
and `sharesOutstanding` into the archive **with `float_basis` beside them** at
assessment time, so the series accumulates going forward. Nothing recovers the
history; **this is an observable-once field the desk has been discarding.**



#### The local store is not a subset of production — it is a parallel run

**Ops's digest failed, in the exact mode Ops named as the worst one. 2026-08-27.**

    metric                          local      production
    COUNT(*) over ids 1-94             94              94
    SUM(LENGTH(evidence_fingerprint))  6016            6016
    SUM(LENGTH(dossier))            726766          740399    <- 13,633 bytes apart
    tickers in range                   60              59
    id 1                    SLE 13:22:33    SLE 13:22:33    fp 644f3185 both
    id 94                  PSIG 19:25:42   TONT 14:11:28    DIFFERENT ROWS

**Every structural check agrees and the contents do not.** Both stores hold ids
1-94 contiguous, both split 48 rows on 08-17 (ids 1-48) and 46 on 08-18 (ids
49-94), both start at the same row to the millisecond and the same fingerprint.
**Then they diverge**: production's 46 rows on 08-18 end at 14:11, mine end at
19:25, and we hold different tickers at the same ids.

**So the local store is not a snapshot, a subset, or a prefix of production. It
is an independent run of the same pipeline against its own autoincrement.**

**MY CORRECTION WAS ALSO WRONG, IN THE OPPOSITE DIRECTION FROM THE ORIGINAL
CLAIM.** I first wrote *two stores, same rate* as though it were replication.
I then corrected that to *one sample and its superset* and called the correction
the load-bearing part. **Both were inferences from row counts and id ranges, and
the truth was reachable by neither** — it needed a content digest, which Ops
supplied and I did not think to ask for. **Two confident readings of the same
evidence, both wrong, is a stronger argument for the digest than either error.**

**The operational consequence is larger than Q9.** `analysis_version_id` is
**not a stable identifier across stores.** Any join, comparison or carry-over
keyed on it between local and production silently matches unrelated rows.
`ageCatalystGrades` dates versions globally *within one dataset* and is
therefore safe — but only because the extract is never mixed with another
store's ids, which was an accident of how it was built rather than a stated
constraint. **It is now a stated one.**

**And the 1-of-94 against 2-of-231 comparison is dead in both directions.** Not
replication, not subset — **two different data generations**, and the rate
agreeing across them is a coincidence of the field being empty in both rather
than evidence about either. The blocker stands on the live-store count alone:
**0 of 249 on ids 326-574**, which needs no comparison to carry it.


#### Which float Q9 needs — answered 2026-08-27

Research's fork: does Q9 need **(a)** what the trader saw, observable-once, or
**(b)** what the float was, re-fetchable from the vendor — with the urgency
argument surviving only under (a).

**Neither as posed, because the fork rests on a count of one of two sources.**

**1. The dossier's `displayedFloat` is not in the display path at all** —
corrected by Integration, verified at the lines, and it makes the conclusion
stronger rather than weaker. `resolveDisplayedFloat`
([../../lib/dashboard/merge.ts](../../lib/dashboard/merge.ts)) has exactly two
branches and **both are Sheet tabs**: `StructuralResearch.float` from the
RESEARCH tab (`source: 'RESEARCH'`), then `MomentumTicker.float` from the TODAY
tab (`source: 'TODAY'`). `displayedFloatSource` distinguishes **two Sheet tabs**,
not dossier-versus-vendor. **There is no dossier branch to fall back FROM.**

**Corrected again, and the precise version matters.** The board ROW never reads
it — but **three other surfaces do**: `AutomaticIntelligence.tsx:334`,
`deskRead.ts:359` and `risk.ts:174`, all reading
`row.intelligence?.analysis?.dossier.structure.displayedFloat`. **All three have
only ever seen `null`**, which is why no trader-visible float has ever come from
it. So the claim that survives is not *nothing reads it* but:

> **The desk's float has never been the desk's own work.** Every float the
> trader has seen came from the Sheet.

**AND ONE OF THOSE READERS IS A GATE, NOT A LABEL — handed to Design, not mine
to fix.** `lib/dashboard/risk.ts` takes `structure` from the dossier at line 135
and evaluates in order:

    145  DIRTY_FLOAT        -> returns
    173  floatUnknown  = structure !== null && structure.displayedFloat === null
    176                     -> returns FLOAT_UNKNOWN
    187  STRUCTURE_CAUTION  -> returns

**`displayedFloat` is null on 249 of 249, so line 173 is true whenever a dossier
structure exists, and `STRUCTURE_CAUTION` at 187 is unreachable on that path.**
`DIRTY_FLOAT` survives because it is tested first; **`CAUTION` — the single most
common classification the desk produces — is masked by a chip about a field that
has never held a value.**

Stated as a code reading rather than a frequency claim: I have not measured how
often a live row carries a dossier structure, and that is the one number that
turns this from a latent defect into a live one. **Design or Integration should
measure it; the ordering itself is not in doubt.**

**WHAT I GOT WRONG AND WHY, because the mechanism is a name collision this desk
keeps hitting.** I read the type `StructuralResearch` and took it for the
Research pipeline's dossier. It is the Sheet's **RESEARCH tab**, mapped by
`mapResearchRow` over `researchRows`. **A tab and a pipeline share a name, and I
inferred an architecture from it without reading the constructor.** Fourth
collision after two "Research's inventory" artefacts, two "replay" harnesses,
and `split_factor`.

**Right conclusion, wrong reason, is not the same as being right** — and this is
the third time in one exchange that a conclusion of mine survived a mechanism
that did not. The other two were the store comparison, twice. **The common fault
is inference from names and shapes where a definition was one file away.**

**2. The Sheet's float is the observable-once field, and it is being discarded
every day.** It is read live at [../../lib/data/rows.ts](../../lib/data/rows.ts)
— column 8, with `floatSourceDate` 9, `floatSourceUrl` 10 and `floatQuality` 34
beside it — and **nothing persists it.** `desk_assessment_tickers` writes
`structure`, the classification label, and no float number at all. **The Sheet
already carries the basis the capture would need and the desk reads past it.**

**3. (b) is not re-fetchable in the sense the fork assumes.** A fetch today
returns **today's** float, not the float on the date of the move. Float moves
with dilution, offerings, lockups and reverse splits, and ~35% of researched
tickers carry a reverse split — so a re-fetched number attached to a past date
is the latest state leaking backwards, which is exactly what `cycleAsOf` exists
to prevent. **A vendor endpoint being reachable is not the same as a history
being reachable.**

**THE ANSWER IS (a), and the daily clock is real — but for a sharper reason than
"the trader saw it."** Q9 needs the float that was true **on the date of the
move**. **A daily capture IS a point-in-time series; a re-fetch can never
reconstruct one.** Even a perfectly re-fetchable vendor gives one column of
today's values against outcomes spread over months.

**The one check that would change this answer**, and it is cheap: **does
`stockanalysis.com` expose a HISTORICAL float series** rather than a current
figure? If it does, (b) becomes real, the clock stops, and capture drops down
the queue. If it does not — the common case — every day without capture is a
day of the independent variable that no later work recovers.

**Capture `displayedFloatSource` alongside the number, not optionally.** Two
vendors in one column with no basis is the `float > SO` problem rebuilt from
scratch, and the field already exists.

**And `filedShares` at 74.7% of live versions is worth taking now.** It is the
shares-outstanding half of the denominator series, already present, no fetch
required — but it is the SEC cover-page figure, **not retroactively split
adjusted**, so it must be stored with its filing date and read against
`split_event_ratio`. Present is not the same as usable.



#### (c) issuer-stated float: measured before extracting. 2026-08-27

Assigned to this thread as Q9's validation instrument. **Measured on the local
store first, and the measurement changes the design.** 24 excerpts over 17
tickers mention *public float* or *aggregate market value* here (Research counts
29 over 20 on its own store; parallel runs, so the sets differ).

**THE RELIABLE DERIVATION IS `value / price`, NOT THE STATED SHARE COUNT.** The
baby-shelf sentence names up to four numbers and the obvious one is wrong.
NWTG's S-3 reads: *aggregate market value ... held by non-affiliates was
**$2,542,600** based on **1,459,587** shares of common stock outstanding, of
which **758,985** shares were held by non-affiliates ... at **$3.35** per share.*

**A regex taking the share count after *based on* gets 1,459,587 — shares
OUTSTANDING, 1.92x the float — and it is silently plausible.** It also errs in
the same direction as the stale-filed-shares defect: **overstating the
denominator, which makes every ratio built on it look safer than it is.**

**The check that catches it is arithmetic the filing supplies itself:**

    float_shares x price == public_float_value    (within rounding)

MNDR appeared to fail it — 4,072,128 x $1.131 = $4,605,577 against a stated
$3,761,845, 22.4% out.

**RETRACTED. THE FILING DID NOT FAIL THE CHECK; MY EXTRACTOR DID, AND IT FAILED
BY THE EXACT TRAP THIS SECTION DOCUMENTS.** Research caught it. The MNDR excerpt
states the float **verbatim** — *"of which **3,326,123** Class A Ordinary Shares
were held by non-affiliates"* — and the check on the stated number passes at
**0.00%**. My non-affiliate pattern required the literal word `shares`; MNDR
says *Class A Ordinary Shares*, so the branch missed and fell through to the
number after *based on*, which is shares outstanding. **I substituted the wrong
operand and then attributed the resulting mismatch to the filing.**

**The check is vindicated and my reading of it was not.** It caught a real
discrepancy; the discrepancy was its own input. **A validator that flags its own
parse error as a property of the data is worse than no validator, because the
finding it produces is confidently about the wrong object** — and it is only
distinguishable by reading the source text, which is what Research did and I did
not.

**AND THE SIZING CONSEQUENCE IS LARGER THAN THE CORRECTION.** If floats are
often stated outright, **the full triple is needed only to VALIDATE, not to
EXTRACT** — so the 13 excerpts carrying no dollar value are ruled out as
validation pairs, **not as extractions.** Re-measured with a share-noun pattern
that does not require the literal word:

    excerpts                        24
    float STATED verbatim            7
    float derived from value/price   4
    no float obtainable             13
    distinct tickers with a float    9
    full triple present              7  ->  6 verified, 1 genuine mismatch

**Nine tickers, not five** — and then **seven**, which is the finding.

**THE ONE "GENUINE MISMATCH" IN THAT TABLE WAS ALSO MINE.** GNPX flagged at
78.6%. The filing is exact: 1,252,551 x $42.00 = $52,607,142, the stated value
to the dollar. **My price pattern matched a `$9.00` elsewhere in the document**,
because the share-noun fix had widened the search to the whole excerpt —
**the repair broke a locality constraint the narrower version had been enforcing
by accident.**

Rescoping shows the fields have **different locality**, which is the actual
design point: *held by non-affiliates* is self-labelling and safe to find
anywhere, while a **price is only meaningful inside the calculation it belongs
to.** Per-field scoping gives **7 stated, 1 derived, 7 distinct tickers, 4
triples, 0 mismatches** — and reveals that **3 of the previous run's 4 "derived"
floats were computed against prices from unrelated sentences.** Three fabricated
numbers that would have entered a validation set as data.

**Three measurements of the same 24 excerpts, three answers:**

    ~5 tickers, 1 mismatch    share-noun pattern too strict
     9 tickers, 1 mismatch    fixed, but price searched document-wide
     7 tickers, 0 mismatches  per-field locality

**The count is parser-dependent across the whole plausible range, so quoting any
one figure without its parser repeats the error three times over.** What is
stable and worth carrying: **floats ARE stated verbatim in these filings**, the
product check works **once its operands are correctly scoped**, and coverage is
**single-digit tickers** on this store.

**CORPUS AND SCALE, from Research 2026-08-27 — both change the sizing.** The
real corpus is far larger than either of our counts: **188 active sources across
77 distinct tickers state a public float, 33% of all researched names**, and
**19 of the 77 yield a defensible stated count** under the strict pattern —
free, already stored. **So (c) is a 19-ticker validation set, not seven**; my
number was a subset of a subset, measured on a store that ends 08-18.

**And the trap is now demonstrated at scale rather than argued.** Research ran a
widened *ordinary/common shares* pattern against the strict one over every
stored excerpt: **wrong on 8 of 19 overlapping tickers, always larger, always
the shares-outstanding-to-float bridge.** AIRE 1.955x, ODYS 1.889x, INDP 1.434x,
MNDR 1.224x. **My MNDR bridge computes to 1.224x on a different store** — two
parallel runs, same ratio, which is the first cross-store agreement in this
whole exchange that survives a content check.

**THE BRIDGE VARIES, AND THAT IS WHY SPOT-CHECKING WOULD HAVE PASSED IT.**

    GNPX   1,254,061 / 1,252,551  =  1.001x   <- error would be 0.1%, invisible
    MNDR   4,072,128 / 3,326,123  =  1.224x
    NWTG   1,459,587 /   758,985  =  1.923x
    AIRE                             1.955x

**The trap's severity is the affiliate holding, so it is silent precisely where
it is small.** A spot-check on GNPX clears the widened pattern at 0.1% error and
the same pattern is 95% wrong on AIRE. **No magnitude sanity check catches it;
only the product check does, and only where a price is present** — which is the
argument for the corpus-wide run over any number of hand-picked examples.

**Mention-to-number holds at scale: 19 of 77 is 25%**, against 7 of 17 (41%) on
my subset. **Fourth instance of the split, and the first with a corpus big
enough to call it a rate rather than an observation.**

**STOP TUNING AND WRITE TESTS.** Every iteration here fixed a hand-checked case
and introduced a new one. **Three of my last four errors were an output read
without its input** — the store comparison, the display path, and this extractor
twice. A regex refined against examples I chose is an instrument calibrated on
its own agreement; the fixture set is what makes the next number mean anything.
**The extraction is not blocked on data, it is blocked on tests**, and that is
the honest state to hand over.

**Three extraction traps, all silent, all producing a plausible number:**

1. **Shares outstanding read as float shares** — MNDR, NWTG. Caught by the
   product check.
2. **The threshold read as the value** — TDTH returns exactly `$75,000,000`,
   which is the baby-shelf ceiling in *so long as our Public Float remains below
   $75,000,000*, not a measurement of anything.
3. **Truncated numerals** — AHG returns `$277`, which is a fragment. A float of
   $277 is refuted by inspection, but only if someone inspects.

**COVERAGE IS THINNER THAN THE MENTION COUNT, WHICH IS THE THIRD TIME THIS
DISTINCTION HAS MATTERED HERE.** Of 24 excerpts: 3 yield a fully verified
triple, ~5 carry both a value and a price and so can be derived and checked, 12
yield no dollar value at all. **Carrying the words and yielding a defensible
number are different counts** — the same split that made `displayedFloat`'s
1-of-94 visible, and the same one behind Ops's *16 sub-keys present on all 249*.

**So (c) is a validation set of single-digit tickers on this store — most
defensibly seven** — not twenty, not the five I first reported, and not the nine
I reported second. A **measured** vendor error still beats Q1's
assumed 15%, and nine is thin rather than negligible; any attenuation drawn from
it states n beside it. **(a)'s clock is unaffected and (c) does not shorten it.**

**My 24 and Research's 29 are different populations from parallel runs, and
neither is wrong.** Mention-versus-number applies to both — including, as
Research noted about its own count, to itself.



#### The incumbent's output multiple, measured 2026-08-27 — Q8's open item, partly closed

**Q8's one remaining item was the incumbent's output multiple, without which the
saving could not be quoted even though the shape could.** It turns out to be
recorded already: `research_analysis_versions.metadata.metrics` carries
`inputTokens`, `outputTokens` and `cachedInputTokens` **on all 94 local
versions.** Nobody had to be asked.

    input      1,070,536
    output       309,897
    cached-in    135,172   (12.6% of input)

    INCUMBENT OUTPUT MULTIPLE = 0.289 output per input

    gpt-5.6-terra   n=80   ratio 0.283
    gpt-5.6-sol     n=14   ratio 0.305

**And the Anthropic replay arm, on the same task, is 0.282** — 2,792,169 output
against 9,905,680 input in `data/replay-full.json`.

> **0.289 against 0.282. The output multiple is not a differentiator.**

**That materially simplifies Q8**: if the two providers emit near-identical
output per unit of input on this work, **the comparison collapses onto price per
token and retrieval volume**, and the verbosity worry that motivated the item
does not survive its own measurement. **The 12.6% cached share independently
matches Research's 10.6% overall**, which is a second reason to trust the
accounting rather than only the arithmetic.

**SCOPE, STATED BEFORE ANYONE GENERALISES IT — INCLUDING ME.** This is the
**INTERPRETATION stage only**, which Q8 already established is **14% of the
bill** against DISCOVERY's 56% and RESOLVER's 28%. **I have measured the output
multiple on the smallest of the three stages.** Discovery and resolver ratios
are unknown, live outside this table, and are where the cost actually is.

**Naming that here because it is exactly today's recurring fault** — a component
measured and reported as the system, four times over — **and this result is
unusually easy to over-read, since 0.289-against-0.282 is a tidy number that
invites a conclusion about "the pipeline".** It is a conclusion about one
fourteenth of it.

**Q8 status: THE OPEN ITEM WAS ALREADY CLOSED, AND HAD BEEN SINCE 2026-08-24.**

**Retracting everything above about it being unmeasured or possibly lost.** The
figures live in a production table called `model_usage`, and they were answered
**to this thread** — `docs/threads/research.md` item 20, headed *"Asked by R&D
through Integration 2026-08-24."*

| stage | calls | input | cached | output | out/in |
| --- | --- | ---: | ---: | ---: | ---: |
| DISCOVERY | 216 | 7,862,324 | 8.5% | 184,774 | 0.024 |
| RESOLVER | 181 | 3,853,202 | 14.1% | 144,436 | 0.037 |
| INTERPRETATION | 312 | 2,024,072 | 12.9% | 547,171 | **0.27** |
| ESCALATION | 14 | 172,298 | 4.2% | 51,243 | 0.30 |
| RECOVERY | 5 | 74,385 | 12.1% | 3,136 | 0.042 |

**And the answer reorders the stages, which is the finding I had and then lost.**
Weighting output at 5x input: **DISCOVERY 47%, RESOLVER 25%, INTERPRETATION 26%.**
**Interpretation overtakes the resolver**, and the input-only view understates it
by nearly a factor of two, because it is the only stage that *writes* — 0.27
against discovery's 0.024, an **11x difference in shape.**

**WHAT I DID WRONG, AND IT IS THE WORST VERSION OF TODAY'S FAULT.**

I searched **my local store**, found no stage-level token accounting, and
concluded it **did not exist anywhere** — then escalated it as *observable-once
and possibly gone, with a clock running on 86% of the bill.* **None of that was
true.** It exists, on production, in a table my store does not carry.

**The previous five instances were a component read as the system. This one is
worse: I read my own copy as the world, while the answer sat in a shared
document under a heading naming me as the asker.** I also re-derived one third
of it locally (0.289 against their 0.27, different windows) and reported that as
new.

**The check that would have caught it costs one grep of `docs/threads/`, and I
have run greps like it all day on other people's claims and not on my own
register's open items.** An open item is a claim — *this is not known* — and it
decays exactly like any other.

**The rule this earns: before escalating a gap, grep the desk for the answer.**
Not the store — **the desk.** Peer charters are where answers to this thread's
own questions have been landing all week, including this one.


#### Q6 re-parked the same day it was promoted — 2026-08-27

**I promoted Q6 as "runnable on the archive as it stands, no new capture."
Started it, and that was wrong.** Recorded rather than quietly re-parked,
because the reasoning error is the fourth instance of one fault.

**What Q6 needs is PER-CHECKPOINT assessment state across dates. What I hold is
neither.**

    archive symbol_desk_day     5 dates, but checkpoints are ROLLUPS --
                                checkpoints_looked / failed / not_looked, no per-checkpoint row
    local market.db             2 assessment dates, 08-17 and 08-18
    OPEN_SPIKE_ASSESSMENT       exactly 1 instance locally, 25 tickers

**One pre-open assessment on one date cannot be scored against anything.** The
production extract has five dates; I do not hold it, and `npm run
archive:export` is the tool for getting it — **so Q6's blocker is an extract Ops
runs read-only, which is far smaller than tier A or the float capture, and it is
still a blocker.**

**THE FAULT, AND IT IS THE FOURTH TIME TODAY.** I reasoned that *assessments are
captured per checkpoint* and *outcomes are measured from the tape* — **both
true, and both about the system rather than about my copy of it.** I never
checked whether this store held them. The store comparison, the display path,
the extractor twice, and now this: **every one was a property of the system
asserted where an instance needed checking.**

**And it happened in the register pass itself**, one line after I wrote that a
parked question must state what would unblock it. **Promoting a question is the
same act as parking one and deserves the same evidence** — I demanded a
condition of every parked row and supplied none for the promoted one.

**A SECOND FINDING WORTH MORE THAN THE CORRECTION: the 09:25 pre-open assessment
is called `OPEN_SPIKE_ASSESSMENT`.** Scheduled 13:25 UTC, which is 09:25 ET.
**Q6 has been recorded since 08-23 under a name that does not appear anywhere in
the schema**, and a successor searching the assessment types for *09:25* or
*pre-open* would find nothing and conclude the capture did not exist. **The
question names the clock; the artifact names the phenomenon.** Registered here
so the next reader joins them, and it is the reason Q6 could not simply be
looked up.

**Status: Q6 back to parked, blocker "a five-date assessment extract, read-only,
Ops." Q1 remains the only active question and it is blocked on tier A — so the
register currently has NOTHING runnable, which is the honest state and is a
better thing to know than a promoted question that stalls on contact.**


#### Two capture conditions that lived only in messages until 2026-08-27

**Found by auditing what was true only in this session and not in the register.**
Both had been relayed to Research and neither was written down here, which means
they would have survived only as long as the thread that said them.

**1. `float_basis` must carry the as-of INSTANT, not only the source — and the
skew must be STORED, not merely computable.**

I first asked for *source and as-of instant* and implied simultaneity was
achievable. It is not, and Research is right about why: **the two halves are
asynchronous by construction** — the float is a live read at checkpoint, the
share count was written when that analysis last ran, possibly days earlier.

**What I actually needed was for the skew to be CHECKABLE, not zero.** Three
instants distinguished — the vendor's as-of, the filing cover-page date, and the
desk read time per half — satisfies that. The load-bearing clause is Research's:

> **A ratio whose halves are four days apart must never read identically to a
> single-instant one.**

**Add: store the skew as a derived field rather than leaving it computable.**
A consumer who must compute it will not, and **the reader who most needs it is
the one reading a summary.** Same reason `split_lookback_sessions` sits beside
`split_sessions_ago` instead of being left as arithmetic — a value whose meaning
depends on a parameter has to travel with the parameter, and *available on
request* is not travelling.

**2. The capture is ONE SHEET READ, and that is a single point of failure rather
than a saving.**

Both branches of `resolveDisplayedFloat` are Sheet tabs, so the capture joins
nothing — **cheaper than a scope written against two systems would assume.** But
the same fact means **a Sheet outage loses the float and the outcome together,
with no second source to fall back on.**

**`displayedFloatSource` is provenance, not redundancy.** It records which tab a
number came from; it does not mean a second tab can supply one when the first
cannot. **Anyone reading two sources as a fallback path will size the failure
mode wrongly** — and the natural reading of a two-branch resolver is exactly
that.


#### Three design commitments, fixed now rather than after the numbers arrive

1. **The outcome variable is settled and the grader problem does not apply.**
   Float and overhang are quantities, and `max_gain_pct` and the archive's
   outcome columns are measured from the tape. **No 45%-irreproducible grader
   sits between the variable and the answer** — which makes Q9 a cleaner
   instrument than Q1 had, and worth saying because Q1's attenuation ceiling
   will be the reflex comparison.
2. **RVOL is a CONFOUND before it is a partner.** His instinct to look at RVOL
   alongside is right and the danger is in the order. If overhang correlates
   with RVOL and RVOL with performance, **an apparent float effect is RVOL
   wearing a costume.** RVOL must be conditioned on, not merely reported
   beside. This is the shape that produced the *3-of-6 versus 52%* unit error.
3. **A null is a result here and the verdict format applies.** Pillar 5 having
   no relationship to outcomes on this universe would be as useful as Pillar 4's
   bounded negative, and **must be reported with its attenuation** — a vendor
   float that contradicts itself 4 times in 18 is exactly the measurement error
   that biases an association toward zero.

**NOT STARTED. Registered, and blocked on capture rather than on the queue.**


#### Q11 — the drop rule's false-positive rate. Registered 2026-09-03, not started.

**Routed here by Design through Integration, with its reason: a live board
header answering *how often was the rule wrong today* would duplicate the
archive badly, and the session-long miss rate belongs to this thread rather than
to a number invented in chrome.** Design declined to build a cumulative
"revived and ran" tally and was right to.

**The question.** A continuing-presence rule drops a name from the active board
after **5 settled minutes below threshold on minute trade count** — a threshold
**my premarket revival curve set.** So: **how often does that rule drop a name
that subsequently runs?** That is the rule's own error rate, and **if this
register does not hold it, it exists nowhere and the rule ships unmeasured.**

**THE TWO DEFINITIONS COMPARED, 2026-09-03, before either side publishes a
rate.** Integration flagged the risk exactly: **Q11's answer would be a rate
produced by MY definition about a rule implemented in RESEARCH'S.**

`lib/market/activity.ts` and `lib/archive/revival.ts` **agree on everything that
was likely to collide** — active 300 trades/min, dead line derived as active/10
rather than configured separately, 5 consecutive dead minutes, and absent-means-
zero. **Two material differences remain:**

- **Revival needs 2 consecutive active minutes in theirs, 1 in mine.**
- **Their death has no prior-active requirement; mine does.** A name never
  active can be DEAD for them — correct for a board rule that drops quiet names,
  and a different population for a revival rate.

**Measured on premarket, dead = 5 minutes:**

    revival needs        activity-only     + live +25%
    1 consecutive min       32.8% (244)      7.0% (17)
    2 consecutive min       24.3% (177)      7.9% (14)
    3 consecutive min       15.3% (118)      8.5% (10)

**So a Q11 rate computed on my definition would overstate revival by 8.5 points
against the rule it is judging.** Any false-positive rate must be computed on
`reviveMinutes: 2`.

**And the comparison produced something for THEIR design that neither of us
had.** Their `reviveMinutes: 2` comment cites *33% of five-minute deaths see
activity return* — **that is my 1-minute figure, correctly used**, since the
oscillation risk without hysteresis is exactly the 1-minute number.

> **The trade is now quantified: 2-minute hysteresis eliminates 67 of 244
> revival events — 27% of the flicker — and costs 3 of 17 genuine +25% returns,
> 18% of the opportunity.** Favourable.

**RETRACTED, same day, and it was mine.** I also wrote that **the conditional
quality of what survives RISES**, 7.0% to 7.9%. **It does not. Tested: p = 0.710
between revive-1 and revive-2, p = 0.671 against revive-3.** A 0.9-point move on
**17 events against 14** is the same rate measured twice.

**Research adopted that sentence into `activity.ts` on my authority and
strengthened its own comment toward it** — *a fast return buys a worse mix* —
which is now the strongest line above a pinned test. **I have sent the
correction and the repair: what the numbers carry is that quality does NOT FALL
as the requirement tightens, so the flicker reduction is bought without
degrading the mix.** Free on quality, not positive on it.

**The distinction that matters for why one half survives and the other does
not:** the discard side is a **count** — 244 → 177 events, 17 → 14 returns —
and counts of that size are solid. **The quality claim is a ratio between two
small counts, and that is where it fails.**

**The shape is the one recorded in the working rules above, arriving inside a
day:** *a correction inherits the confidence of whatever it corrects toward.*
**I wrote a direction as a finding; Research corrected its own comment toward my
finding; the error travelled upward in confidence at every step.**

**CONDITION ON ANY Q11 RATE, from Research and accepted:** **say which
population it is over in the same sentence as the number.** The two definitions
differ on the prior-active requirement — **a name never active can be DEAD in
`activity.ts`**, correct for a board rule that drops quiet names and **wrong for
a revival denominator**. A rate quoted without its population would be exactly
the failure this register keeps finding elsewhere, **arriving at its own future
output.**

**Blocked**, and honestly so: the columns have not landed, nothing has shipped,
and data must accumulate. **Not urgent and not commissioned.**

**Two design costs to carry into the measurement, both stated by Design rather
than discovered:**

**`dead_at_price` is OVERWRITTEN on each death**, so it measures from the
**latest** death only. **The cost concentrates on the churniest names — which
are precisely the ones the rule is most wrong about.** A name that dies five
times and runs after the second is unmeasurable by construction. **That is a
sample selected in a way that excludes the effect**, the shape this desk has now
found four times, and it is accepted knowingly rather than overlooked.

**And a PRE-REGISTERED expectation, which I can state because the reason exists
already:** the thresholds are **premarket-derived and the rule runs uniformly.**
Amendment 6 of the revival pre-registration establishes that **a duration
threshold carries an implicit unit — fraction of the window — so 5 minutes is
1.5% of premarket and 0.5% of the full day.**

> **The rule is therefore already expected to be roughly three times looser
> outside premarket than the curve that calibrated it. By-session reporting is
> not prudence here; it is the instrument that would reveal a miscalibration
> this register predicts in advance.**

**Stated now, before the data exists, so that finding it later is a
confirmation rather than a discovery** — and so that *not* finding it is
informative too.

#### Q10 VERDICT — `REVIVAL_IS_A_THRESHOLD_NOT_A_RULE`, 2026-09-03

**Commissioned by the trader**, defined in his own numbers: a name doing ~5,000
shares on a 10-second candle dropping below ~500, and whether it returns. His
instinct was that once something dies it is usually dead, **offered explicitly
for investigation rather than confirmation.**

**The answer is a threshold, not a yes or a no.** Full 13 sessions, 939 board
symbol-days, minute trade count, persistence pre-registered at 5 minutes:

    quiet for    1 min  68.2%     10 min  34.0%     30 min  19.2%
                 5 min  47.9%     15 min  27.6%     60 min  11.0%

**Under about ten minutes of quiet he is looking at burstiness; past about
thirty he is right, and supported rather than merely unrefuted.** The
pre-registered rule (≥25% refutes) is met at 5 minutes and fails past 15.
**His threshold was the missing quantity and it now has a number.**

**Every rate is a FLOOR** — minute grain cannot see a death and revival inside
one minute, and his grain is ten seconds. The 10s reconstruction is a build with
no clock, needing `daily_bars.split_factor` to survive a reverse split.

**Two methodological findings came out of it and are now desk doctrine**
(`587db62`): **rank correlation is not threshold agreement** — volume and trade
count sit at Spearman +0.92 and disagree by 14.2 points at the cut, isolated by a
volume control; and **a pilot is not a small study** — two sessions overstated
revival at every setting, in one direction, rather than being merely noisier.

Full working in
[../rnd/2026-09-03-revival-question-preregistration.md](../rnd/2026-09-03-revival-question-preregistration.md).

#### Q6 VERDICT — `PRE_OPEN_RANK_PREDICTS_VOLATILITY_NOT_EDGE`, 2026-09-03

**The pre-registered rule is met and my pre-registered expectation was wrong.**
I predicted no detectable content. There is content, and it is not the kind the
ranking implies.

**First, the prior check answered part of Q6 before the correlation did.**
`assessment_rank` and `rvol_rank` are **identical on 300 of 300 rows, all 12
dates, difference exactly zero everywhere.** The pre-open ordering is **an RVOL
sort, not a judgement.** Any content in it belongs to RVOL; nothing here scores
the desk's discretion, because at 09:25 the desk exercises none.

**The confirmatory result, on the rule fixed beforehand:**

    predictor  assessment_rank at 09:25    outcome  RTH up-excursion from the open
    pooled     n = 300, zero rows dropped   rho = -0.276   p < 0.0001
    per date   12 of 12 negative, -0.028 to -0.594

**Rule required rho <= -0.20 at p < 0.05. Met, and not carried by one session.**

**AND THEN THE PART THAT MATTERS, WHICH THE CORRELATION HIDES.** Broken out by
rank band, median RTH move from the open:

    band     n    up excursion   down excursion   NET close
    1-5     60        +10.45%          -16.04%       -8.10%
    6-10    60        +10.62%          -10.19%       -1.68%
    11-15   60         +3.70%           -8.25%       -1.35%
    16-20   60         +6.66%           -7.15%       -0.41%
    21-25   60         +4.83%           -4.02%       -0.55%

> **The top-ranked names move more in BOTH directions, and their median RTH
> close is -8.10% against -0.55% at the bottom of the board.**

**The ranking predicts volatility. It does not predict edge, and on the median
it points the wrong way.** *(Exploratory, not pre-registered: 25.0% of rank-1-5
symbol-days close RTH above the open, against 41.7% of rank-21-25. Labelled as
exploratory because the design fixed an excursion outcome, not a directional
one — it is the sharper number and it did not earn confirmatory status.)*

**This is Q5 and S1 arriving from a third direction, and it is the strongest
version yet.** `BOARD_IS_LATE_TO_THE_MOVE` said seven of ten board names peak
before surfacing. S1 said that is stable over 13 sessions. **Q6 now measures
what that costs: the names the board ranks highest at 09:25 are the ones that
give back most after the open.** Three instruments, three windows, one picture —
**by the time a name reaches the top of this board, its move is behind it.**

**What this is NOT.** It is a measurement of the board's ordering against the
tape, on 300 symbol-days over 12 sessions. **It is not a strategy and nothing
here says what to do with a rank-1 name** — a median is not a plan, the trader
holds for seconds where these figures span a session, and an excursion measured
from the RTH open says nothing about entries taken before it.

**What would overturn it:** an `assessment_rank` that stops being an RVOL sort,
which would make this a measurement of a different instrument; a directional
outcome pre-registered rather than explored; or the 09-03 re-trigger deploy
changing what the 09:25 board contains. **The first is the one to watch, since
it is a code change away.**

#### Q6 design — fixed 2026-09-03, before any correlation was computed

**The same order the scorecard used, for the same reason.** Nothing below was
written after seeing a result.

**What the desk predicts at 09:25.** `OPEN_SPIKE_ASSESSMENT` snapshots the board
five minutes before the open: 25 tickers, each with `assessment_rank`,
`rvol_rank`, price, percent change, and the cycle/catalyst/structure grades.
**Putting a name at rank 1 asserts it is the one to watch.** Q6 asks whether
that ordering carries information about what happens next.

**The outcome must be STRICTLY FORWARD, and this is the design's whole risk.**
Q5 established that seven of ten board names peak before the desk surfaces them,
and 44 of 95 movers peak before 09:30. **Scoring a 09:25 read against a
full-session `max_gain_pct` would credit the assessment for a move it was
looking at.** That is the circularity this thread refused for cycle, and it
would produce a large, flattering, meaningless number.

    predictor   assessment_rank at 09:25, 1 = best
    outcome     RTH excursion from the open, (rth_high - rth_open) / rth_open
                -- entirely after 09:30, so entirely after the assessment
    population  12 assessments x 25 tickers, joined to symbol_outcomes
    test        Spearman rank correlation, pooled and per date

**Predictive content means a NEGATIVE correlation** — a lower rank number
pairing with a larger excursion. A positive one would mean the board is ordered
backwards, which is a finding rather than a null.

| | |
| --- | --- |
| **Decision rule, fixed now** | Predictive content requires **rho <= -0.20 pooled at p < 0.05**. Anything weaker is reported as **no detectable content**, including a p just above the line. |
| **Reported regardless** | Per-date rho, so a single day cannot carry the pooled figure; and n after the join, since names without an RTH outcome drop out. |

**THE PRIOR CHECK, WHICH MAY ANSWER Q6 BEFORE THE CORRELATION DOES.** In the
first rows inspected, `assessment_rank` and `rvol_rank` are identical. **If they
agree everywhere, Q6 collapses**: the pre-open assessment would be an RVOL sort
wearing a different column name, and any predictive content would belong to RVOL
rather than to the desk's judgement. **That is measured first and reported
whichever way it falls** — it changes what the correlation means rather than
whether it is worth computing.

**Pre-registered expectation: no detectable content.** The scorecard's S1 found
the board surfaces most names after their move and that this is stable across 13
sessions. **A read taken five minutes before the open, on a board already
established as late, has no obvious reason to predict the next hour.** Saying so
now is what stops a weak negative being written up as a hint.

**Q7 was routed here by the desk owner on 2026-08-23**, in those words: *"None
yet. This needs to go to the viscosity study."* Audit §11 item 3 asked which of
four briefed-but-unbuilt concepts Design should surface. Three of them —
**Chop Risk, Flush Risk, Effective Float Turnover** — are measurement questions
before they are display questions, and they belong to the viscosity programme's
subject rather than to a column budget.

Design is unblocked either way: none of the four gets a column in Phase 2, so
the §6 eight-column set is final and no row design waits on this.

What would make any of them displayable is a definition that survives contact
with the tape — stated as *"a trader would use this to decide X"* — plus
evidence it separates outcomes. Absent that, a column would be a number with no
defensible meaning, which is the failure mode `UNKNOWN` exists to prevent.
Note the standing constraint before reaching for minute bars: a hold is seconds
long, and the closed viscosity lines already establish that completed-minute
trade count predicts a *less* clean next 30–60 s.

**The fourth concept, Overhang Absorption, was deliberately NOT routed here.**
Design's position, recorded in audit §11 item 3, is that it should not be built
in this product at any phase — the booklet's absorption is a live Level 2 /
Time & Sales read at second granularity used as a gate, and a desk-computed
version would compete with a truthful live read the trader already has. It is
not a measurement gap; it is a surface this product should not occupy.

**Q6 came from Design, 2026-08-23**, and is recorded here because validating a
score is this thread's register and not a design decision. Audit §11 item 6 asks
whether the 09:25 pre-open assessment "ever gets a validated score". It is
captured, flagged `EXPERIMENTAL`, and the UI says so.

Design does not need the answer to proceed, and has already acted on the
conditional: **if it stays `EXPERIMENTAL` indefinitely it should not occupy a
slot in the trader-facing checkpoint selector**, and audit F-26 already hides
that selector until it has options. So this is not blocking anything — it is a
question about whether a pre-open read has predictive content at all, which is
the kind of thing this register exists for. Design acts on whatever comes back.

**Closed, and not to be reopened without new evidence:**

| Line | Verdict | Closed |
| --- | --- | --- |
| Q1, first half — do 50%+ movers carry catalysts? | `PILLAR_4_STRONG_FORM_EXCLUDED` — **83% of 50%+ movers carried no legitimate-positive-or-stronger catalyst**, prior-free, as-of-correct, five-draw modal, over 211 graded symbol-days on the desk's board. Movers 16.7% against non-movers 13.4% **on a prior-free five-draw modal** (the basis matters — the stored columns give +0.5pp, +4.5pp and +6.9pp, and none of the four is significant), p=0.51; corrected for 15% misclassification the largest true difference consistent with the data is **+19 points**. **Definition-robust:** the contrast survives every definition of *carried a catalyst* the archive can express, and grade staleness is not differential by mover status, so the attenuation assumption behind the ceiling holds. Pillar 4 calls a breaking-news catalyst *non-negotiable*, which implies far more than that, so **the strong form is excluded**. A weak relationship is not excluded and nothing here says catalysts are irrelevant. | 2026-08-23 |
| Sub-minute execution arrival | `NO_SUBMINUTE_INCREMENTAL_SIGNAL` — 2–20s execution count and arrival timing add nothing over the completed-minute baseline. The density gate that makes the price path measurable makes a 2s window a rescaling of the minute. | 2026-08-21 |
| Minute trade count | `WITHIN_DAY_TRADE_COUNT_SIGNAL_CONFIRMED` — raw completed-minute trade count predicts a *less* clean next 30–60s. More executions is worse. The programme's only usable artifact. | 2026-08-21 |

**AMENDED 2026-09-02 BY THE PREDICTION SCORECARD, and the amendment is a
vindication rather than a retraction.** Over 13 sessions and n=688 admissible
symbol-days — three times the original population — the contrast is **+14.9pp
all-admissible at p=0.00002**, and **+17.9pp restricted to same-session grades**,
which is the estimate free of attenuation.

> **The verdict published a ceiling: *the largest true difference consistent
> with the data is about +19 points*. The clean-measurement figure is +17.9pp.**

**Two halves of the original now separate, and only one of them moved:**

- **`PILLAR_4_STRONG_FORM_EXCLUDED` STANDS.** Pillar 4 calls a breaking-news
  catalyst *non-negotiable*, which implies something near-total. **+17.9pp is
  not that, and 67% of movers still carry no legitimate-positive-or-stronger
  catalyst.**
- **The "no detectable relationship" reading is SUPERSEDED.** p=0.51 on n=211
  became p=0.00002 on n=688. **The relationship is moderate, real, and now
  measured rather than bounded.**

**And the sentence that made the verdict survivable was the one it would have
been easiest to drop:** *a weak relationship is not excluded and nothing here
says catalysts are irrelevant.* **Had this closed as "catalysts do not matter",
the scorecard would have refuted it outright.** It closed as a bounded negative
and the follow-up landed inside the published interval. Full working in
[../rnd/2026-09-02-prediction-scorecard-results.md](../rnd/2026-09-02-prediction-scorecard-results.md).

**One assumption behind the original DID fail, and it does not damage the
result.** Grade staleness has become differential — movers mean age 0.07
sessions against non-movers 0.44 — so the non-differential error the +19pp
correction assumed no longer holds. **Checked rather than assumed: restricting
to same-session grades WIDENS the gap.** Stale grades dilute, exactly as
attenuation predicts, so **+14.9pp is a floor and the assumption's failure
costs nothing here.** It may cost something elsewhere.

**What would overturn `PILLAR_4_STRONG_FORM_EXCLUDED`:** a tier A cross-section
showing that movers *outside* the desk's board carry catalysts at a materially
higher rate — the verdict is conditioned on the top-25 RVOL population and says
nothing about the market. A longer window; five sessions is five sessions. Or a
catalyst measurement whose misclassification is materially below 15%, which
would tighten the +19-point ceiling rather than move the point estimate.

The sub-minute null closed a *predictive* line only. Sub-minute data is still
required for **measurement** — resolving a trade whose stop is $0.15 — and that
was never tested.

## The standing sweep

The discovery mechanism, and the part that makes "always learning" real rather
than aspirational.

**BUILT 2026-09-02 as the prediction scorecard** — `lib/archive/scorecard.ts`,
`worker/scorecard.ts`, `npm run archive:scorecard`, 15 tests. It was commissioned
as a progress measure and it is this sweep: a routine pass over the archive
comparing a window against a pre-registered baseline and reporting what moved.
**Five instruments, thresholds fixed before the data existed, and two of the five
decision rules turned out to be unevaluable as written** — both caught by
computing baselines before the run rather than after.

**This section said "not yet built" for eleven days after the thing existed.**
Recorded because it is the same staleness that had the opening message telling a
successor to start work that had already finished: **a charter describes a
starting position, and a starting position is the part most likely to be wrong.**

The dimensions it was specified to cover, against what it measures:

- catalyst rate among movers, and the grade distribution
- float, price and RVOL distributions of names that ran
- time-of-ignition — premarket gap versus intraday ignition
- setup-occurrence rate: how often a qualifying name ever offered an entry
- the RVOL-to-outcome relationship
- rank persistence: does being on the board predict staying there

Anything that moves materially against its baseline becomes a **candidate
question** in the register. The sweep does not conclude — it notices. Concluding
is a question's job, and questions get hypotheses and verdicts.

**Queued, no clock — harvest `PATTERNS` before the sweep is built.** Approved by
the trader 2026-08-24. The paused Close & Learn task accumulated a `PATTERNS`
tab, P1–P6: what a process watching this market for weeks thought worth
tracking. That is precisely what the sweep above is meant to produce and never
has, so it is worth reading once as a **list of candidate questions to harvest,
not a learning layer to preserve.** The task is paused, so `PATTERNS` is frozen
rather than decaying and there is no deadline; the only thing that would
threaten it is deletion, and *do not delete the corpus* is already a standing
condition.

**Harvest the questions, not the verdicts.** The hypotheses in that tab are
cheap *because* the evidence under them is weak — self-graded over self-produced
outcomes, which is the same circularity that made this thread refuse to score.
A P1–P6 row will read as a finding to whoever opens the tab next. It is a prior
worth testing, never a result worth citing.


## Scope

- [../DATA-ARCHIVE.md](../DATA-ARCHIVE.md) — the capture specification.
  **Instrumentation, not the goal.** Build the minimum that answers the active
  question, then answer it.
- Analysis over the archive; findings written down and dated
- `A:\trade_research\momentum\viscosity` — the tape research. Different repo,
  same capability. This thread owns it.

## Not this thread

- `lib/research/` — the catalyst pipeline, its cost and its incidents →
  [research.md](research.md)
- Deploying → [ops.md](ops.md)
- Presenting findings in the UI → [design.md](design.md), and not until a
  finding has survived. The viscosity README is explicit that a tradeability
  state on the desk is a much later concern.
- The trader's own execution → [coaching.md](coaching.md)

## Q1 — the active question

Pillar 4 of the playbook — breaking news catalyst — is described as
non-negotiable, and appears to have stopped binding since roughly July 2026.
Either the rule changed, the market changed, or **the desk stopped being able to
see catalysts**. Those are three different worlds and the desk should be able to
tell them apart.

**Hold coverage constant before concluding anything.** The weeks under
examination are the weeks the research pipeline kept failing — balance
exhaustion on 19, 20 and 21 August, resolver rework throughout. Reduced catalyst
*detection* is indistinguishable from absent catalysts. This is the first
analysis to run, not a caveat to append.

**RETRACTED the same day, and the replacement is worse.** *Research widened its
independence test from two control runs to four and withdrew the result.* The
first report — 2 of 6 catalyst grades moved when the Sheet's prior was removed,
against a control variance of 0 of 6 — did not survive. With four runs per arm:
2 of 6 tickers are unstable *within* the control set, 3 of 6 within the
prior-free set, and **0 of 6 are stable in both arms yet different between
them**. The two names reported as moved are exactly the two that vary anyway.
The original control variance came from two runs that happened to agree.

**The independence effect is not established** — which is not "the prior does
not matter". The code path is real and `sheetPrior` reaches the interpreter on
every call; six names cannot tell. One asymmetry survives on one ticker, that
the prior may act as an anchor reducing variance rather than shifting the grade.
Hypothesis, not finding, unused here.

**What replaced it is the harder problem: the catalyst grade is not reproducible
for roughly a third of names on identical evidence**, and every stored grade in
the archive is a single draw from that distribution. Contamination is a bias and
a bias can be subtracted. Noise cannot. And it fails in the one direction this
thread must not fail: **measurement error in the independent variable attenuates
any association toward zero**, so a noisy catalyst measure biases Q1 toward "no
relationship", which is Q1's own hypothesis. A null produced by measurement error
is indistinguishable from a null produced by the market, and this thread's
working rule is to report nulls.

**The authorised re-derivation has lost most of its justification.** It was
authorised to remove contamination that is no longer established, and a
*one-shot* prior-free grade is a fresh single draw with the same
irreproducibility as the stored grade it replaces. Research reached this
independently and is flagging the cost of doing it properly — repeats per
version and a modal grade, roughly 3x — rather than shipping single-run numbers
that would read as authoritative. The executing run will arrive labelled
one-shot with per-ticker instability marked. **The decision is the trader's and
the premise has changed since he authorised the original.**

**A plausible fabricated result, and the guard it prompted here.** *Research,
2026-08-23.* A replay harness ran with no API key; `interpretTicker` returned
each ticker's latest stored dossier for every version and the harness produced a
complete, internally consistent, entirely fabricated result — "123 stable, 0
unstable, 43 differ from stored" — whose only tell was a zero token count. It
would have reached this thread as a finding.

**The archive had the same shape.** Split detection compares one daily series
fetched `raw` and `split`; if the adjusted fetch returned nothing, returned raw,
or dropped symbols, every comparison agrees and the run reports **no splits** —
a plausible null indistinguishable from a window with no corporate actions, and
hypothesis 3 comes back empty with nothing to say why. The only reason it was
not silent tonight is that two splits happened to fire. `auditSplitFetch` now
reports on every run including when the answer is zero, names symbols that
returned raw bars but no adjusted ones, and throws when nothing at all is
comparable, because that is a fetch that never happened rather than a market
fact. Live figure: **11,264 of 11,264 symbol-dates comparable, 999 differing** —
8.9% of the lookback sits on a pre-split basis, so reverse splits are as endemic
as the spec claimed.

**The one-shot pass landed: 25 of 56 prior-free grades differ from stored, 45%.
Not a prior effect and not to be quoted as one.** Three live confounds, none
separable: the removed prior, ~17% pairwise noise, and — largest — evidence,
since the pass predates as-of filtering and bundled every source each ticker
ever had against a stored grade that saw only what existed at its own
`generated_at`. Held as instability marks only.

**The anchoring-inflation hypothesis is dead.** The list reads as though the
prior inflates grades — `LEGITIMATE_POSITIVE → MODERATE_MIXED_SECONDARY` recurs
— but counted both ways it is 10 less positive, 7 more positive, 8 not
orderable. On 17 orderable changes that is what a coin does a third of the time.
Research killed it against the eyeball impression rather than with it.

**The per-version replay makes the join arithmetic obsolete.** It joins on
`storedVersionId`, which maps to this archive's `analysis_version_id`, so all 56
resolve and the 27/10/19 split never arises. That arithmetic stands as a record
of what a per-ticker output would have cost, not as a live constraint.

**BUILT 2026-08-23: a deterministic cycle on every archive row.**
`lib/archive/cycles.ts`, `cycle_phase` plus five arc columns, schema v4 with a
migration. Point-in-time — the series is truncated at each date, and a test
asserts that resolving 07-02 from a series containing 07-03 matches resolving it
from one that ends there, without which a backfill writes today's view onto
history. Split-adjusted deliberately, the one column here that is not as-seen,
because an arc spanning a split puts its start and its high on different bases.
Null means could-not-say, not `NO_CYCLE`.

Distribution over 306 symbol-days: `NO_CYCLE` 149, `BACKSIDE` 97, `DAY_ONE` 36,
`FRONTSIDE` 9, `PULLBACK` 6, `SHADOW` 1, null 8.

**The phase-to-outcome contrast is CIRCULAR and is not a finding.**
`isCycleStart` requires +20% on 5x RVOL, so `DAY_ONE` means the name moved that
day by definition. Nothing about cycle predicting outcomes should be quoted from
this archive.

**What is not circular is the Q5 content: 97 of 306 board symbol-days — 32% —
are `BACKSIDE`**, already past the cycle high with over half the move given
back, at the moment the desk surfaces them. That agrees with the independent
clock-time finding: 44 of 95 movers peaked before 09:30 and only 16 inside
09:30-11:00. Two instruments, same direction — **the board surfaces a large
share of names after the move that qualified them.** Not a verdict; Q5 is behind
Q1 and this is the variable it would be answered with.

**The 2026-08-25 correction STRENGTHENS this one**, which is worth recording
because a retraction is assumed to cost something. While the register wrongly
held that he traded only 04:00–09:30, late surfacing had an escape: a name
peaking at 06:00 and surfaced at 10:00 could be dismissed as outside his hours
anyway. **He trades premarket, RTH and after hours, so there is no such escape.**
A name surfaced after its move is a missed opportunity at any hour, and the
board's lateness is a defect across the whole day rather than a scheduling
artifact. **The wrong belief was hiding a real problem behind a false excuse.**

**CYCLE BECOMES ARITHMETIC, AND THE RECOMPUTE REACHES BACKWARDS.** *Routed by
Integration 2026-08-23.* `lib/market/cycle.ts` computes the classification from
daily bars and the model's version is being deleted — the trader's call, on 75%
`UNKNOWN` in production, 46% irreproducible, 7.2% flipping frontside against
backside, and the arithmetic winning 8-0 where both committed.

This archive is **not exposed**: nothing in `lib/archive/` reads `cycle`. The
boundary lands in `desk_assessment_tickers`, where pre-change values are the
model's and post-change values are deterministic under one name — a trap for any
future analysis reading cycle from the assessment record.

**Feasibility verified here, since it was flagged as unknown.** `resolveCycle`
takes only `{tradingDate, high, low, close, volume}` oldest first. Run against
real bars truncated at each as-of date it is genuinely point-in-time, not
latest-state — PFSA reads `DAY_ONE` on 08-17 and `BACKSIDE` by 08-21, having run
624% on the 18th; MYSZ `FRONTSIDE` then `PULLBACK`. The backfill already fetches
the raw daily bars this needs; only the lookback span would widen.

**Unlike every other definitional change tonight, this one can be applied
uniformly backwards**, so the archive would carry one definition from
2026-08-17 and the boundary would not exist in anything derived here. It would
also be the archive's **first reproducible classification** — catalyst is 45%
not-unanimous, structure 55%, cycle 46%.

**Where it earns its place: Q5.** "When does a board name's move happen relative
to board entry" restated is *what cycle phase is a name in when the board
surfaces it*, and `first_board_entry_at` is already stored. **Not built** — Q1 is
active and does not need it. Recorded as ready.

**STALE, found by the 2026-09-03 existence audit. Q5 CLOSED on 08-27 and did not
need this either.** It was answered from `first_board_entry_at` against
`time_of_max_gain` directly, with no cycle phase involved. **So this measure is
now unbuilt AND unattached to any open question** — it was justified by a
question that has since been answered without it. Kept rather than deleted,
because *ready and wanted by nothing* is a different state from *ready*, and the
next reader should be told which.

**This is the audit's own first catch on this document**, and it is the subtler
form: not a claim about what exists, but a **justification whose reason expired
while the claim stayed true.**

**Structure's freeze stands and hardens**: 45% unanimous, mean agreement 84%,
least reproducible of the three, and *not* becoming arithmetic.

**THE FULL REPLAY LANDED AND Q1's FIRST HALF HAS AN ANSWER.**
`data/replay-full.json`, 236 versions x **five draws**, prior-free, as-of
filtered. 9.9M in (81% cached) / 2.79M out, checked. **All 185 of the archive's
grade-backing versions are covered — 100%**, so the population problem is gone:
211 symbol-days, **40% movers against 74%** in the TODAY-tab replay and 31% in
the whole archive. The residual enrichment is coverage, not selection — research
reaches movers, which this thread measured days ago.

Five draws with an agreement fraction replaced refuse-to-emit, and Research was
right to withdraw its own design: the objection was to an *unlabelled* mode, and
a mode carrying "3 of 5" is not one. **This thread's two-draw projection held** —
46-61% predicted irreproducible, 45% measured not-unanimous, with 53 versions at
exactly 3 of 5 confirming the flips are nearer 50/50 than 75/25.

**THE RESULT.** Share carrying `STRONG` or `LEGITIMATE_POSITIVE` **on a
prior-free five-draw modal** — the basis, and it is not the stored column — over
211 symbol-days: **movers 16.7% (n=84), non-movers 13.4% (n=127)**, difference
+3.3pt, z = 0.66, p = 0.51. Reproducible from `data/replay-full.json`.
**Re-run 2026-08-24 against all four definitions the archive can express**
(modal, `catalyst_first`, `catalyst_last`, `catalyst_best`): differences +3.3,
+0.5, +4.5 and +6.9pp, **not one significant.** Quote the band, not one row. Mean modal agreement 85%, so misclassification ~15%
and attenuation ~0.70.

**Recorded as a bounded negative, not a null.** Attenuation biases toward zero so
this cannot support "no relationship" — but it supports a ceiling. Observed 95%
CI -6.6 to +13.2pt; corrected, **-9.5 to +18.9pt**. A true 20-point difference
would have shown as 14pt and been caught. **The largest true difference
consistent with the data is about 19 points, and Pillar 4's "non-negotiable"
implies far more than that. That relationship is excluded at this population and
window.** A weak one is not, and nothing here says catalysts are irrelevant.

The absolute figure needs no control group and carries more: **83% of 50%+
movers carried no legitimate-positive-or-stronger catalyst**, prior-free,
as-of-correct, five-draw modal. That is the trader's original observation,
measured.

The share-count confound does not reach this — it bites on stored-versus-replay
deltas, and the variable here is the replay grade against the tape.

**WHAT STOPS Q1 CLOSING.** The population is the desk's board, top 25 by RVOL out
of ~900 eligible, so a name that ran and never reached the board is invisible —
tier A, which does not exist. Five trading days. Graded symbol-days only, 211 of
306, and the excluded 95 skew non-mover. And **Q1's second half is untouched**:
"why are catalyst-driven names passed over" needs that same cross-section. First
half measured with a bound; second half unanswerable on this instrument.

**BY-PRODUCT, handed on rather than used.** Cycle instability includes 28
versions flipping between two directions, 17 of them `RED_BACKSIDE` against
`YELLOW_FRONTSIDE_WARNING` — frontside versus backside on identical evidence.
Nothing here reads `cycle`, but the field is trader-facing and that distinction
is not cosmetic. It reverses a small-sample null of Research's, the second such
reversal in one evening.

**THE PER-VERSION ARTIFACT LANDED, AND Q1's BLOCKER MOVED.**
`data/replay-perversion.json`, 123 versions, joining on `storedVersionId` →
`analysis_version_id`. Tokens 2.62M in / 731k out, checked. Verified rather than
taken: 95 stable, 28 refused, refusals correctly null.

*The 24 stable-but-differing rows are not a prior effect* — Research caught this
itself. `55f3e20` added the share count to the evidence bundle after the stored
analyses ran, so `sharesOutstanding` is populated on 38% of stored analyses
against 88% of replay ones. **Register consequence: every catalyst grade in this
archive was produced by a pipeline blind to the share count in 62% of cases**,
and any comparison against pre-2026-08-23 grades carries that.

*The 23% refusal rate is a floor.* Refusal fires only when two draws disagree,
so it misses every unstable version whose draws agreed by luck. That implies
**46-61% of stored grades are irreproducible**, and **29-49% of the 95 that
passed are unstable ones that got lucky**. A third draw takes 95 to ~81 and cuts
the hiding fraction to 17-40%.

*The join runs and the population cannot answer Q1.* 62 symbol-days over 43
symbols join to a stable grade — and **74% of them ran 50%+, against 31% in the
archive**. Predictable in hindsight: the 56 tickers were selected on TODAY-tab
membership, and this thread established that TODAY membership correlates with
running. The control group is 16 names. Run anyway, the contrast gives 28% of
movers with a real catalyst against 31% of non-movers — nothing, on sixteen
controls, from a 29-49% coin-flip variable. **That null is not a finding and is
not recorded as one.**

**So the blocker is population, not noise, and more draws cannot fix it.** The
archive has 185 distinct versions backing its grades; the replay covered 61, and
124 remain. At ~27k tokens per version for two draws that is **~3.4M tokens**,
about 1.3x what has been spent. It is the better buy than a third draw, because
**noise can hide a signal but cannot manufacture one** — on a representative
population a relationship surviving 29-49% misclassification is real and
understated, while on an unrepresentative one no result is reachable however
clean the measurement.

**Confirmed by Research: the in-flight run is single-draw** — one interpretation
per ticker, so it produces exactly the single draws from an irreproducible
distribution that make a bad variable. It arrives labelled. **Use it for
instability marks only; never as Q1's independent variable.**

**The upgrade is not a modal grade, and that is the better design.**
`research-replay` takes repeated draws and *refuses to emit a grade when they
disagree* — `priorFreeCatalystGrade` comes back null rather than a mode, because
the mode of three draws on a two-way flip is a coin toss wearing a
measurement's clothes. An explicit gap is worth more than a number that cannot
be told apart from a solid one, and this archive already has the vocabulary for
gaps: it becomes a coverage class alongside `NO_LOOK` and `UNKNOWN_HONEST`,
meaning *looked twice, disagreed*.

**One caution on what two runs buy, which is less than "separates trustworthy
from untrustworthy".** Agreement between two draws does not establish stability.
A ticker whose true split is 75/25 returns two matching draws 62% of the time; at
60/40 it is 52%, and at 90/10 it is 82%. So a two-run filter removes the worst
offenders and passes the majority of moderately unstable ones into the
"trustworthy" set. Three runs cut that to 44%, 28% and 73% respectively. Two
runs are a real improvement on one and not a clean separation — worth knowing
before the spend is judged against what it delivers.

**What this archive adds.** Catalyst moved in 29 of 56 re-analyses (52%) and
never in 1192 same-version pairs. Against a 33% noise floor, and treating noise
and real change as independent, the implied real-change rate is around 28% —
**comparable to the noise, with neither dominating.** The arithmetic is
illustrative, not an estimate: six names, an independence assumption, and a
production comparison that cannot hold evidence constant. What survives is that
the noise floor is large enough that grade transitions cannot be read as events
without saying so.

**Join arithmetic, unchanged by the retraction.** A replay emits one grade per
ticker, not per symbol-day; `readSources` has no date filter. Of 172 tickers
with a stored analysis here, 128 have one version and 44 have several, of which
29 (66%) carry a differing grade — matching Integration's 19 of 29 on the
contaminated subset exactly. One refinement: a multi-version ticker whose grade
never moved is *also* cleanly joinable, since every symbol-day carries the same
stored grade, so the clean set is **37 of 56 rather than 27**. `as-of` source
filtering would retire the problem entirely at ~2x interpretations, and would
also retire snapshot-pinning — look-ahead is currently excluded only by the
accident that one source postdates the window, and that accident decays daily.

**Also from the control, and it lands here: `structureClassification` moved 2 of
6 on identical input.** A third of it is not reproducible. Nothing in this
thread uses the stored `structure` field — `symbol_desk_day` has no structure
column — so no finding here needs a caveat; the exposure is the desk's
deterministic diff at `lib/desk/assessment.ts:269`, which turns every change
into a trader-facing event, and that is Design's surface.

Three things the extract settles about it. **Every structure change coincides
with a new analysis version and none occurs without one** — 0 moves across 1192
same-version checkpoint pairs, 29 across 56 version changes — so "structure
changed" means "the name was re-analysed", and an unknown fraction of those are
re-generation. **The ageing mechanism already covers it**: `analysis_version_id`
is per row and backs the whole dossier, and that zero row is what licenses
saying so, so nothing new needs capturing if structure is ever archived. And
**this archive cannot re-measure those rates.** This paragraph has been wrong
twice; the findings note carries the full working. Briefly: an earlier version
leaned on catalyst being "known stable at 0 of 6", which was withdrawn; a later
one read Research's `2 of 6` and `3 of 6` as churn rates, which they are not —
they count *tickers unstable across four draws*, not *pairs of draws that
disagree*. The churn-comparable pairwise floors are **catalyst 17%, structure
25%, cycle 17%**.

**Struck, not softened: "structure transitions carry essentially no
information."** It rested on a 50% floor sitting flush against 52% observed; the
comparable floor is half that and nothing of the claim survives. Against the
right floors the observed 52% implies real change of 35-42% for catalyst and
27-36% for structure, so **both fields carry substantial real signal** — the
opposite of what this said.

The lesson is Research's: two independently derived numbers landing as close as
50% and 52% is the moment to check whether they are the same quantity, not the
moment to call a result robust. **The zero row is what stands untouched** — a
structural fact about the archive, not an inference from anyone's controls.

Worth having in front of whoever decides the field's future: `structure` takes
**three values** over 1459 non-null rows — `CAUTION` 871, `UNKNOWN` 365,
`DIRTY_FLOAT` 223 — so the mode is 60% of the mass and a 2-in-6 flip rate is
large against that resolution.

**The surface is bounded to the TODAY tab.** The RESEARCH tab's 205 rows never
reach the interpreter — `loadSheetPriors` indexes `state.tickers`, built from
TODAY alone. The Sheet reaches the board, not the corpus.

**Restricting Q1 to clean ticker-days is the wrong route, and this archive's own
numbers say so.** It is not executable from here — TODAY membership per date is
not in the extract — and it would not be neutral if it were. TODAY held 42-56
rows on 17-21 August against 27-53 graded board symbols per day, so little may
survive it. And the filter is biased in the worst direction: TODAY is the
Sheet's $2-$10 momentum watchlist, and **82% of the 77 distinct names that ran
50%+ sit inside that band against 63% of all 252 board symbols**. Movers are
likelier to have carried a prior, so a clean subsample is depleted of exactly
the population Q1 is about.

**AUTHORISED by the trader 2026-08-23: a prior-free re-derivation over
2026-08-17 to 08-21.** Four conditions, all of them load-bearing:

1. **Replay stored evidence; do not re-collect.** A grade formed from today's
   news about a name that ran on the 19th is worthless. This is what Research's
   independence experiment already did.
2. **Do not write into the production store.** `interpretTicker` calls
   `saveAnalysisVersion`, and Ops already refused the experiment arms on
   production for exactly this reason — dossiers labelled UNDER TEST would show
   on Monday's board as ordinary analysis. A separate labelled store, as
   `data/replay-run.db` was.
3. **Self-label the arm**, so a later reader cannot mistake a prior-free grade
   for the stored one.
4. **Emit a grade joinable to this archive** on ticker and trading date, or on
   `analysis_version_id`. This side is 252 board symbols and 211 graded
   symbol-days over the window; Research counted 231 tickers with stored
   analyses.

Only then does Q1 have a usable independent variable.

**It is the same run the Research thread already scoped, not an additional
one.** *Reconciled by Integration 2026-08-23 — the two charters briefly read as
two separate asks for model spend.* One arm rather than three, 58 tickers,
0.65M input and 0.23M output, and **one approval**. The mechanism, the cost and
a look-ahead condition that invalidates the result if the run is not pinned to
`data/market-prod-2026-08-23.db` all live in
[research.md](research.md) item 10, which carries the run. Do not restate them
here; this thread carries why Q1 needs it, not how it is executed.

**Everything not resting on the grade is unaffected**: the split test, Q5,
coverage, outcomes. What is suspended is Pillar 4's catalyst rate and the
catalyst-definition resolution, both of which read the same variable — suspended
now for irreproducibility rather than contamination, which is the harder of the
two to work around.

**Consequence for the second ledger.** With contamination unestablished, the
comparison is back on the table in principle — two graders over one window, and
nothing here writes to the Sheet so their side was never at risk. In practice it
is limited by the same noise: comparing a ~1/3 irreproducible grade against
another labelling measures the disagreement of both. Agreement would still be
informative, disagreement much less so, and neither should be quoted as a rate
until the noise floor on our side is known.

**A second outcome ledger exists over the same window**, and it changes what Q1
can do. *Reported by Integration 2026-08-23; not read by this thread.* The Sheet
is written by four weekday ChatGPT tasks and holds 11-21 August — 148 outcome
rows over 115 tickers, 204 research rows over 146 with catalyst grade, source
URL, float and split history, graded 35 A / 46 B / 123 C. Q1 asks whether movers
stopped carrying catalysts or whether the desk stopped seeing them, and a second
grader over the same period is what separates those.

**The contamination is one-directional and that is what makes it useful either
way.** Nothing here writes to the Sheet, so the Sheet's grades cannot have been
influenced by this desk whatever `sheetPrior` does. If the prior does not reach
the interpreter, the two are independent graders and the comparison is the
instrument Q1 wanted. If it does, the *comparison* is circular but the Sheet's
grade is still independently produced and can serve as Q1's independent variable
**instead of** ours over the overlap. What collapses in the bad case is the
comparison, not the second labelling.

**It is not ground truth and never supplies an outcome.** Self-graded by the
process that made the forecasts, 85.8% backfilled, 68 of 204 floats still
Unknown, duplicate date/ticker rows. This archive's Alpaca-derived outcomes are
the honest measurement; take catalyst labels from that side and nothing else.

**Overlap, sized from this side.** Their universe is $2-$10 with float under
20M against this desk's $1-$20 on RVOL. Of 252 board symbols over 17-21 August,
159 traded inside $2-$10 at some point — a ceiling before their float filter,
which this archive cannot apply. **63 of the 77 distinct names that ran 50%+ are
in their band**, so the overlap on the population Q1 is about may be usable even
if the whole intersection is thin. Sizing it properly needs one thing: the
ticker-by-date list for 17-21 August. **This thread has not read the Sheet and
will not** — that surface is `research.md` Open item 5 and a list is cheap to
hand over.

**First move once anything lands, and it needs no answer from Research:**
compare their peak gain %, peak window and prior RTH close against this
archive's `max_gain_pct`, `time_of_high` and `reference_close` on shared
symbol-days. It calibrates their ledger against the tape without touching a
catalyst grade. Their "prior RTH close" is the exact field this thread found the
desk flipping at the bell, so a mismatch there is the first thing to look at.

**Four hypotheses, none tested**, recorded so they are not silently reinvented:

- Catalyst was always a proxy for *attention*; something else now supplies
  ignition, leaving float and volume as the binding constraints.
- Attention has gone reflexive — appearing on scanners is what makes the mover.
- The catalyst moved from the news wire to the filing cabinet: reverse splits,
  offering completions, S-1 effectiveness. Supply events, not news events.
- A real catalyst manufactures sellers from the prior run, while a no-news
  runner has no waiting holder base. The only one that also explains why
  catalyst names get *passed over*, rather than just why others run.

## State as of 2026-08-23

**Step 1 is built and has run.** Outcome capture plus the coverage rollup:
`lib/archive/`, `worker/archive-backfill.ts`, `npm run archive:backfill` and
`npm run archive:coverage`. Findings, defects and limits are in
[../rnd/2026-08-23-outcome-capture.md](../rnd/2026-08-23-outcome-capture.md).
Read that before touching the archive.

The instrument exists; the data does not yet. It has only ever run against the
stale local store, which ends 2026-08-18. **Q1 turns on 19, 20 and 21 August,
and those dates live only on production.**

**The dates exist. Ops confirmed it 2026-08-23**, read-only, before anything
was copied: 2026-08-19 has 16 assessments and 400 ticker rows, 08-20 has 19 and
450, 08-21 has 19 and 475. 75 assessments over five dates, 25 tickers each,
`COMPLETE` 74 and `MISSED_SUPERSEDED` 1. Full numbers in [ops.md](ops.md) Open
item 5.

**Why the failing week did not cost checkpoints — and it matters to Q1's
premise.** The assessment scheduler makes zero model calls (`model_calls` is 0
on all 75 rows), so an exhausted OpenAI balance cannot stop it. Assessment
coverage and research coverage are independent. *What the desk looked at* is
intact for the whole window; only *what it managed to learn* was degraded.
That is the distinction Q1 turns on, and it is now known rather than assumed.

**What that lets Q1 claim, stated so it is not overread.** Any question about
the *characteristics of the names that ran* — board, rank, RVOL, price, what
else was competing — is answerable across the full period at normal quality;
none of it depended on research. The catalyst grade is the part still in
question, and the open issue is no longer "is it missing" but "was the analysis
behind it produced during the window". `intelligence_status` reads `AVAILABLE`
straight through the outage, because a grade served from an existing analysis
genuinely is available. **The caveat was replaced by a measurement, not
removed** — see the findings note.

**Two things Ops handed over, both unexamined here:**

1. **19 August is thin, and not for a reason status records.** The full
   schedule is 19 checkpoints a day. 08-18, 08-20 and 08-21 each have all 19;
   **08-19 has 16, with three absent rather than marked missed**, and 2 of the
   16 flagged `generated_late`. Any analysis assuming an even cadence across
   the three days will not get one.
2. **The rows exist; what is inside them on 19-21 August may not be sound.**
   `intelligence_status`, `catalyst` and `structure` were being written during
   the days research was failing. The snapshots are real — whether those
   columns are degraded or stale is a different question, and it is Q1's
   independent variable. Ops did not query it: it is this thread's call on its
   own extract. Worth settling before any outcome is attributed to a catalyst
   grade from that window.

   **Instrumented 2026-08-23; the answer needs the extract.** `analysis_version_id`
   is already on every ticker row and already in the two-table extract, so
   `ageCatalystGrades` can say for each symbol-day how many sessions old the
   analysis behind its grade is. Zero means produced that day; three means
   research has not revisited the name in three sessions while
   `intelligence_status` still reads `AVAILABLE`. **Consequence for how the
   extract is cut: it must NOT start at 19 August.** A window beginning inside
   the outage censors every grade in it — the first day reads as freshly graded
   and the rest as barely aged, which is how a stalled pipeline disguises
   itself. Take the full five dates on record, and further back if production
   holds more. Costs nothing; the payload is a few MB either way.

**Delivered 2026-08-23: the extract is at `data/assessments.db`.** Cut from
production by Ops after deploying `775c5a9`, unbounded — no `--from`, no `--to`,
so the censoring problem above does not arise. 2.8 MB, `integrity_check` ok,
exactly `desk_assessments` and `desk_assessment_tickers`, **75 assessments and
1850 ticker rows** over 2026-08-17 → 2026-08-21, `COMPLETE` 74 and
`MISSED_SUPERSEDED` 1. Verified on the server and again after transfer; counts
match the independent read-only query Ops ran against production on the same
evening. `/data/` and `*.db` are both gitignored, so it will not be committed.

**Before anyone runs that tool again — `--dry-run` deletes a directory.**
*Found by Ops on first production contact, 2026-08-23. This is R&D's file and
R&D's fix; Ops has not touched it.*

[`worker/archive-export.ts:127`](../../worker/archive-export.ts:127) is, inside
the `--dry-run` branch:

```js
fs.rmSync(path.dirname(destination), { recursive: true, force: true });
```

Two separate defects in one line. It removes **`dirname(destination)`** — the
*containing directory* of `--out` — rather than the file that was written. And
the run is not dry: `exportAssessments` executes unconditionally about twenty
lines earlier and writes the real extract; `--dry-run` changes only the cleanup,
so the header's "reports only that and writes nothing" is also untrue.

What that means on the box: `--out /var/lib/mointel/assessments.db --dry-run`,
run as the `mointel` user, attempts `rm -rf /var/lib/mointel` — `market.db`, the
WAL, and all six backups, every one of them owned by that user. The live run on
2026-08-23 used `--out /tmp/…`, so it tried to remove `/tmp` and was stopped by
the sticky bit with `EACCES`. Nothing was lost, and that was luck, not design.

Why the tests did not catch it: `tests/archive/export.test.ts` covers
`lib/archive/export.ts` thoroughly, and **nothing exercises
`worker/archive-export.ts` at all** — the CLI wrapper is the untested part and
is where the `rm -rf` lives. The library being proven is what justified this
route; that argument still holds and is not what failed.

The real (non-`--dry-run`) path does not call `rmSync` on anything and is safe;
that is the one Ops used.

**Fixed in `85bd8e9`.** A dry run is now a read: `countAssessments` queries the
source read-only and returns the per-date counts, so there is no destination,
nothing to clean up, and `--out` is ignored on that branch rather than honoured.
There is no recursive delete anywhere in the tool; the one remaining deletion is
an `unlinkSync` of the exact file `--force` names, behind an `isDirectory`
guard. The root cause was the shape — "do the real thing, then clean up" needs a
destructive step to exist and puts an operator's path inside it — so the shape
is gone rather than the line patched. `runExport` was extracted from `main` and
the module-level invocation guarded so the CLI is testable at all; the
regression test was checked by reinstating the original line and confirming it
fails. Ops can run `--dry-run` again.

The tool otherwise
opens the store read-only and produces ~1-3 MB rather than a 250 MB+ snapshot
— the backfill reads two tables and fetches the rest from Alpaca. The same
command reports checkpoints per trading date, which also answers whether the
desk recorded anything on the three days in question. Full procedure in the
findings note.

**It does need the code on the box, though — corrected by Integration
2026-08-23.** This charter and the findings note both said "needs no deploy",
and the findings note's comparison table records "code on production: no" for
this route. That is wrong. `worker/archive-export.ts` says *Usage, on the
server* in its own header and takes `--market-db /var/lib/mointel/market.db`,
a path that only exists on the box — so the tool has to run there, and it
landed in `8170f58`, four commits ahead of what production runs. The payload
argument is untouched and the route is still the right one; what was wrong is
only the claim that nothing has to reach the server. **How it gets there is
Ops's call, not this thread's** — see [ops.md](ops.md) Open item 5.

**First results, 2026-08-23.** The backfill has run over the extract — 306
symbol-days, every one with minute bars. Full write-up in
[../rnd/2026-08-23-outcome-capture.md](../rnd/2026-08-23-outcome-capture.md);
four things belong in the register.

1. **The outage cost coverage, not currency.** Every grade on 19-21 August is
   fresh. The oldest carried grade in the whole window is three sessions, and
   158 of 176 datable grades were produced on the day they were served.
   19 August lost *reach* — 53% usable against 70-78% elsewhere, 17 names never
   looked at, and the week's only 10 `IN_FLIGHT` rows — but not *currency*.
   19 and 20 August have no censored grades at all. The caveat this thread was
   built around does not bite the way it assumed.

   *The pipeline produced new analyses on those days* stands. *Therefore those
   grades are independent evidence about the market* is the inference now
   waiting on the provenance question — a freshly produced analysis that read a
   Sheet prior is fresh and non-independent at once.
2. **Pillar 4, coverage held constant — recorded, not concluded.** 20% of 50%+
   movers carried a legitimate-positive or stronger catalyst, against 13% of the
   names that did not run. Two `STRONG` grades in the entire week, and 27% of
   movers were looked at and came back honestly `UNKNOWN`. **Suspended pending
   the provenance question above** — this is the one result that rests entirely
   on the catalyst grade.

   **The gap against the pipeline's own numbers is a definition, not two
   populations.** *Handed over by Research via Integration; resolved here
   2026-08-23 because this archive holds both populations.* Research reported a
   10% outright no-catalyst rate against Q1's 50%+ premise, and proposed that
   the trader observes names that **ran** while the pipeline observes names that
   were **researched**. That does not survive: restricting to movers barely
   moves the distribution (20% carry a real catalyst against 13% of non-movers —
   movers are slightly *more* likely to). The two numbers are the same
   measurement read against different bars. `NONE` — searched, found nothing —
   is 4 of 84 movers, **4.8%**. No legitimate-positive-or-stronger catalyst is
   67 of 84, **80%**. The pipeline counts the `MODERATE`/`WEAK`/`UNKNOWN` middle
   as having a catalyst; Pillar 4's breaking-news bar does not, and that middle
   is 63 of the 84. Neither side is wrong.

   **The real population gap is untested and is not the one Research named.**
   The trader observes movers *in the market*; this archive observes movers *on
   the board* — top 25 by RVOL out of ~900 eligible. A name that ran and never
   reached the board is invisible here. That is tier A, it does not exist, and
   it is why **Q3 stays unanswerable**.

3. **Hypothesis 3 has its first evidence, and the timing is the point.** Of the
   252 board names that week, those with a reverse split **6-30 sessions ago**
   ran 50%+ at **70.6%** (12 of 17), against **27.8%** with no split (62 of
   223) — while a split in the *last five sessions* is indistinguishable from
   none at all (25%, 3 of 12). That is the shape hypothesis 3 predicts, and the
   bucket boundary was committed at `8170f58` before the extract existed.

   Seventeen symbols, one week, and the population is the desk's board rather
   than the market — a post-split name has a small float and mechanically high
   RVOL, so it is likelier to be on the board at all. **The next step is more
   weeks at the same boundary, not a finer boundary on this week.** Retuning it
   now would turn a prediction into a fit.

   **Correction, 2026-08-23: those weeks cannot be fetched, only waited for.**
   This thread recommended a wider extract and that recommendation was wrong.
   The extract already delivered was cut *unbounded* — no `--from`, no `--to` —
   and returned 2026-08-17 to 08-21, because the first checkpoint the desk ever
   wrote is `2026-08-17T20:00Z`, the evening the assessment engine shipped.
   There is no history behind it and a wider range returns the same five days.
   The split test widens forward or not at all. **Authorised by the trader on
   the mistaken premise that it was a one-off fetch; re-scoped here to what it
   actually is** — a recurring extract as sessions accumulate, and a re-run of
   the split test when the 6-30 session bucket holds enough names to be worth
   testing. At 17 symbols from one week, that is roughly three or four more
   weeks.

4. **Every float on the desk comes from the Sheet.** `resolveDisplayedFloat`
   has two branches, RESEARCH tab and TODAY tab, and the type enumerates nothing
   else — recorded by Integration in `4b06764`. Three consequences here.
   **Pillar 5 is not independently measurable today**; this archive does not
   capture float and the only source is the one whose provenance is in question.
   **It would not lift the overlap constraint** against the second ledger:
   filtering the Sheet's universe by the Sheet's own float is agreement by
   construction, so a *derived* float would help and a Sheet-read one would not.
   And **the desk and the second ledger are not independent on float either** —
   same field, same workbook — so only the catalyst labels were ever candidates
   for independence.

   **Decided 2026-08-23, by the desk owner:** no Sheet-read float goes into the
   archive. The constraint lifts only if a *derived* float appears. Pillar 5
   stays not independently measurable until then, and the second-ledger overlap
   stays capped at the 159 symbols price alone can identify.

Q5 stays proposed and behind Q1. The five-day cut moved it slightly: 16 of 95
movers peak inside 09:30-11:00 and 61 of 95 peak outside regular hours.

What was already there and turned out to be enough:

- `desk_assessments` and `desk_assessment_tickers` are **append-only**, with 40+
  fields of frozen per-ticker state at every checkpoint and a deterministic diff
  against the previous one. The record of what the desk believed — the half
  nobody could reconstruct later.
- The catalyst grade is stored per ticker per checkpoint, and `UNKNOWN` is an
  honest verdict rather than a gap. **Coverage needed no new capture** — the
  desk already recorded, per ticker per checkpoint, whether a look had happened.
  `analysis_version_id`, on the same rows, turned out to carry grade freshness
  too. The word *provenance* used to appear in this bullet and has been removed:
  the row records which pipeline stored the grade, not where the grade's content
  came from, and conflating those is what the question above is about.

What turned out not to be there:

- **`daily_bars` cannot serve the backfill.** It is a research-cycle artifact —
  populated only for symbols that got a cycle analysis, and split-adjusted. 43
  of 100 assessed symbol-days have no row in it. The backfill fetches raw
  minute bars instead, which is strictly better: it also gives `time_of_high`,
  the premarket high, and the windowed gains.

## Inherited constants — the booklet's numbers or his?

**Queued 2026-08-24, not started. He is trading; this is a register note.**

Research caught its own durable notes saying *"9:30–10:00 is the core"* — the
**booklet's** core, Cameron's, not Adam's — under a rule in the same file reading
*where the booklet and Adam differ, believe Adam*.

**A first attempt at this was wrong, and how it was wrong is the lesson.** The
register briefly recorded *he trades 04:00–09:30, RTH is the exception.* **He
corrected it himself** (`0595b2c`): *"i do sometimes trade RH and AH. but the
core of the strategy is the same in terms of setups."* **He trades premarket,
RTH and after hours. The setup is the requirement; the session is not — so no
rule, check or threshold here may be keyed to the session.**

**And substituting his window for the booklet's was the same mistake with
different numbers.** Both were rules about the clock, and **the clock was never
the rule.** *Noticing that a constant is inherited does not license replacing it
with a better constant of the same kind* — the question is whether the quantity
belongs in the rule at all.

> **A taught method quietly stands in for the practitioner's, and it recurs on
> other facts in the same file.**

**This archive already has one confirmed instance**, measured and written up in
[../rnd/2026-08-23-outcome-capture.md](../rnd/2026-08-23-outcome-capture.md):
all three windowed gain columns — `gain_open_30_pct`, `gain_to_1100_pct`,
`gain_to_close_pct` — **all begin at or after 09:30.** 46.3% of movers peak
before that; **7.4% peak in the window the opening-gain column is named for.**
The capture is fine and full-session; the derived windows ask the booklet's
question and leave three quarters of the peaks uncovered. **The figures are an
opportunity distribution, not a trading window** — they say where the moves are,
not where his trades must be.

**So every threshold in this register is now suspect until checked against him
rather than against the source** — Pillar 4's window, the hold-time grain, the
RVOL and price bands. Not one of them is known to be wrong. The point is that
**none of them has been checked against the practitioner**, and the one that has
been turned out to be the booklet's.

**Check against him, not against the playbook. A number's pedigree is not its
basis.**

## Definition changes that cut the record

A dated log of changes to *what counts as an eligible name*, kept because the
damage they do is invisible later. The archive's cross-sections are board-scoped,
so a change to board membership puts a discontinuity in every series that spans
it — and a series with a definitional step in it looks like a finding.

The rule: **record the date, the size, and whether it touches anything already
measured, at the moment the change lands.** Reconstructing it from a series that
looks odd months later costs far more and often fails.

### 2026-09-03 — re-trigger clock and rotation fix, `97f5fbd`

**Not an eligibility change; a MEASUREMENT-MECHANISM change, which the log covers
for the same reason.** Window 2 makes non-movers holding `UNKNOWN` dossiers
re-askable once per ten minutes, aimed at the differential staleness the
scorecard measured on 09-02 — movers 0.07 sessions against non-movers 0.44.

**Everything in the scorecard results is pre-fix, through 2026-09-02.** The
boundary matters most for **S3, which nobody would think to guard**: its measured
gap is diluted by stale grades (+14.9pp all-admissible against +17.9pp on
same-session grades). **Reducing staleness raises the measured gap with no change
in the underlying relationship.**

**So a rise of up to ~3pp in S3 after 09-03 is the predicted mechanical
consequence of the fix and is NOT evidence about catalysts.** Recorded before the
next window exists, with the check: recompute same-session-only each time, and if
it holds near +17.9pp while all-admissible climbs to meet it, the movement is
entirely measurement. Full statement in
[../rnd/2026-09-02-prediction-scorecard-results.md](../rnd/2026-09-02-prediction-scorecard-results.md).

### 2026-08-24 — derivative classifier widened, `b467154`

`lib/market/securities.ts`. **Two distinct changes shipped together**, and the
second is the one that moves the numbers:

1. **The warrant/right/unit name rules were relaxed.** They were anchored at
   end-of-string or a comma, which missed names carrying a suffix. Warrant is
   now unanchored, rights requires the plural before prose, unit stays anchored.
2. **The ADR rule was moved to run AFTER the derivative rules.** It used to run
   first, so `IQM ... Warrants to purchase American Depositary Shares` classified
   `ADR_ADS` and the warrant designation never got a hearing.

Applied going forward; universe rows re-classify on the next worker start when
`CLASSIFIER_VERSION` differs.

**Four numbers are in circulation for this change and they are four different
populations.** All four are correct answers to different questions, and a reader
who picks one at random will be wrong about the others:

| number | population |
| ---: | --- |
| **15** | universe rows that change CLASS — of 13,089 |
| **13** | universe rows that LEAVE board eligibility |
| **2** | symbols actually RANKING that become ineligible — `BCTXL` rank 43, `IQMXW` rank 117, of 2,821 on 2026-08-21 |
| **0** | archive board symbols affected — of 252 |

The thirteen:

    BLUWW BLUWU SPEGR LUCYW ORIQW BCTXZ BCTXL HAVAR HUBCW OXBRW OGGWZ
    IQMXW ADSEW   <- these two only because of the reorder

**Of the archive's 252 board symbols, zero are affected.** No `symbol_outcomes`
row and no `symbol_desk_day` row moves. **Nothing already recorded shifts and no
existing series has a step in it** — the discontinuity is real but sits entirely
in the future. That is the number this register exists to establish, and it is
the one number the reorder did not change.

**That last part is luck, and should not be read as evidence the log is robust.**
The zero held because this board is 252 momentum names from August 2026 and none
of them are derivatives — not because the entry was well constructed. A change
touching share classes, ADR treatment or the price band would have moved it, and
the log would have caught that only because it was written, not because it was
written well. **Record the check; do not credit the record with the answer.**

**`BCTXL` is the instance that justifies the whole change** — see the closing
note below for its rank.

**Why the unit rule stayed anchored.** "Unit" has an ordinary-equity sense the
other two lack — "Common Units representing Limited Partner Interests". A bare
word-match flags 24 short symbols that are real MLPs and trusts: PAA, ARLP, ET,
DMLP, KRP. Those trade normally, their float is real, and ET sits inside the
trader's price band. Research measured that false-positive class before widening
and stopped short of it. **Precise and incomplete is the right failure direction
for a rule that removes names from eligibility** — the same asymmetry as
declining to divide by a share count that may be wrong in an unknown direction.

#### The measurement error under this entry, which was mine

**I first logged 13 and 11 here. Both were wrong, and they were wrong in a way
that reads as right: 13 was the shipped `changed class` figure attached to the
wrong population.**

I measured a mid-edit working tree and reported it as the change. The reorder
was not in the file when I read it, so IQMXW and ADSEW classified `ADR_ADS` in
both versions of my diff and never appeared. My run was correct about the file
in front of me and silent about the file that shipped.

Research made the same-shaped error on the same change from the other side: it
measured the three regexes **directly**, reported 722 of 723, and could not see
the ordering bug, **because a rule that never runs still matches when you test
it on its own.** Its words: *I measured the component and reported it as the
system.* Its test asserted the classification rather than the pattern, which is
the only reason it surfaced at all.

Two threads, one change, the same mistake in two costumes — and the version I
made is the more dangerous one, because a working tree looks like the system in
a way an isolated regex does not.

**The rule this adds: measure a commit, not a checkout.** A working tree is a
draft with no name. If a number is going into a log that outlives the session,
it must be reproducible from a ref — `git show <sha>:<path>` — or it is a
snapshot of something that never existed. The general form is the one already
on this desk: **assert the output a caller would actually see.**

**`ADSEW` checked and closed, 2026-08-24.** It is genuinely in the thirteen and
genuinely was not on the board. Ops queried the production snapshot for the last
full session, 2026-08-21, over all thirteen names: **`BCTXL` at `rvol_rank` 43
and `IQMXW` at 117 were the only two ranking, of 2,821.** Research's two and its
denominator both reproduce exactly, so its run did not predate the reorder — or
the reorder made no difference to the ranked set. The four I saw locally were a
tracked-universe artifact, as suspected, and refuted nothing. **The two is
final.**

**`BCTXL` ranked 43rd**, which is not marginal — well inside the board — and it
ends in `L`, so no fifth-letter W/U/R convention would ever have reached it.
One name at rank 43 is the entire justification for a name-based rule.

## Working rules

**The framing these sit under, from the trader, 2026-08-24** — recorded at
`8c2d2d5` and charter-level:

> **We are an intelligence platform, not a signal platform — so give the user as
> much of the story as we can that is useful.**

A signal platform reduces everything to a call. An intelligence platform hands
over the reasoning, the provenance, and **the shape of what is not known.**

Several rules below were already this principle without naming it, which is the
reason to write it down once rather than restate it each time. **The basis
columns** — `reference_basis`, `adjustment_basis`, `split_lookback_sessions`,
`float_basis` — exist so a reader can see *which question was answered*, not
just the number. **`split_sessions_ago` stored unbounded with its window beside
it** is the same move: a null that says how far the search went is story; a null
that does not is a signal, and CDTG is what a bare one cost. **Pillar 4's
verdict** is the model instance — not *"catalysts do not matter"* but a ceiling
with its interval, its window and its instrument's limits attached, and those
two limits must travel with it every time it is quoted.

What it argues against, and this is the part that changes work:

- collapsing a computation to a label and discarding the working
- **suppressing a value because it is uncertain, rather than labelling the
  uncertainty** — the uncertainty is frequently the finding
- *"we'll show it once it's reliable"*

**The limit is *useful*, and it is a real limit.** A live field nobody will ever
ask about is still not worth capturing. Story that no one needs is not
intelligence, it is volume — and volume is how a genuine signal gets buried.

- **Figures in this register are COPIES. The findings log is the true copy.**
  Prompted by Integration declining to restate a finding in a tombstone —
  *pointer, not summary* — which is the better instinct and one this register
  does not follow. Five load-bearing numbers currently live in both documents:

        16.7% / 13.4%   Q1's catalyst contrast
        46.3%           movers peaking before 09:30
        70.6%           the 6-30-session split cohort
        83%             movers with no legitimate-positive catalyst

  **A correction that lands in one copy and not the other is how this thread
  produced a self-contradiction in its own files once already** — two sentences
  thirty lines apart, both mine, saying opposite things about the same 52%.

  **The fix is not to delete the copies**; a register nobody can read without
  opening a second document is worse. **It is to correct both, every time, and
  to know the set.** That list is the set. **Extend it whenever a figure is
  quoted here rather than derived here** — and prefer a pointer where the number
  is not doing work in the sentence.

- **A correction inherits the confidence of whatever it corrects toward.**
  Integration's, recorded in its charter and pointed at rather than restated.
  **It is live for this register specifically**, which is correction-dense: on
  2026-08-27 alone I corrected the store comparison twice, the extractor three
  times, an S1 figure, and a claim about my own baselines. **Each of those
  corrections was written with more confidence than the thing it replaced**, and
  a wrong premise carried forward inside one is much harder to see than the
  original error — it arrives wearing the authority of a fix. Integration nearly
  sent one built on a prediction of mine that was refuted an hour later, and
  **only the ordering of two messages stopped it.**

- **Send him the DEFINITION before the result, separately.** Integration's
  point and it is actionable rather than gracious: keep him in the loop on
  instrument design, not only on verdicts. **The evidence is this thread's own
  two commissions.** The scorecard proposal went to him before it ran, he did
  not amend, and it held. **The revival pre-registration reached him bundled
  with the pilot result** — so he read the definition and the answer together,
  caught that *comeback* had no price condition in it, and **that catch inverted
  the verdict.**

  **He could have caught it a day earlier from the definition alone**, and a
  whole run answered a question he had not asked. **He is the only person on
  this desk who can tell whether a measure means what its name says**, because
  the names come from his trading and not from the schema. **A definition sent
  after a result is a definition he reads through the result.**

- **Close questions.** A question that is neither active nor closed is debt. The
  verdict format that worked in viscosity — a single stated verdict plus what
  would have to be true to overturn it — should continue.
- **Report the null.** Two of three viscosity phases returned nulls and they were
  the useful results. A thread that only reports discoveries will eventually
  manufacture one.
- **Say what was not verified.** Distinguish backfilled from as-seen, adjusted
  from unadjusted, and a coverage gap from a finding.
- **Sub-streams are directories, not threads.** A question big enough to need its
  own phases gets a folder and a spec, the way viscosity did. It does not get its
  own chat — that rebuilds the sprawl these threads exist to prevent.
- Build the minimum instrumentation the active question needs — **for anything
  re-fetchable.** The archive spec is a destination, not a prerequisite. *Amended
  2026-08-24, after Integration flagged that this was written when the cost of
  waiting was deferred work, and the desk's constraint is now "can this interrupt
  capture".* For anything **observable only once**, capture early and wide: the
  cost of waiting there is data that never exists. The test is not *will a
  question need this* but **can this be obtained later at any price**.

  Irreversibility is not uniform, and the spec already said so — *"the tiers
  decide what is pre-fetched, not what is possible; a wrong threshold costs an
  extract, not an answer."* Five days of outcomes were reconstructed from a cold
  fetch and the tier A count was answered from nothing, both after the fact. So
  **tier A is not urgent** — daily bars are re-fetchable indefinitely and
  building it early buys deferred work, not data.

  **What is urgent is smaller and unnamed: there is no dated record of which
  symbols were tradable.** `universe` is one row per symbol overwritten in place,
  so *"was this tradable on 2026-08-19"* is already unanswerable and each
  delisting makes the cross-section retroactively incomplete. ~13k rows a day of
  symbol, date, status, tradability. Handed over, not built.

  **VERIFIED STILL TRUE 2026-09-03.** `universe` holds 13,089 rows, one per
  symbol, with `tradable` and `status` overwritten in place. **It does carry an
  `updated_at`, and that is the trap** — a keyword scan for a date column
  reports a hit, and `updated_at` is a last-write stamp rather than a history.
  **A claim confirmed by a matching column name is not confirmed.**

## Opening message for a new chat

**Rewritten 2026-08-27.** The previous version told a successor to *start with
outcome capture and a backfill*, which finished on 08-23. **A stale opening
message is the worst thing in a handover document**, because it is the one part
read before the reader knows enough to doubt it.

> This is the **R&D thread** for the Momentum Intelligence desk at `A:\mointel`.
> Read `docs/threads/rnd.md` and `docs/threads/README.md` first, then
> `docs/rnd/2026-08-23-outcome-capture.md` — the findings log, which is long and
> where the defects and limits live.
>
> You are a standing capability, not a project: the desk should always be
> learning something. **Questions live in the register, at most two active, and
> they close with a verdict — a null counts.** You also own the tape research at
> `A:\trade_research\momentum\viscosity`. You do **not** own `lib/research/`
> (Research Pipeline), you do **not** own the dashboard (Design), and you do
> **not** deploy (Ops).
>
> **Q1 and Q6 are active.** Q1's first half is closed
> (`PILLAR_4_STRONG_FORM_EXCLUDED`) and its second half waits on **tier A**,
> which is specced and unbuilt and is the largest outstanding item — it also
> blocks Q3. **Q6 is the runnable one**: whether the 09:25 pre-open assessment
> scores against outcomes, answerable on the archive with no new capture.
>
> **The instrument works. `lib/archive/` and `worker/archive-backfill.ts` are
> built and have run.** Four parked questions each carry the condition that
> would unblock them; do not start one without checking its condition still
> holds.
>
> **Read these three habits before measuring anything, because each cost
> something here:** measure a commit, not a checkout. A count across stores
> proves nothing without a content digest — ids are per-store sequence
> positions, not identities. And *carrying the words* and *yielding a number*
> are different counts, which has now bitten four times.
>
> **Corrections in this register stand beside what they replaced rather than
> overwriting it.** Keep that. Several entries record a wrong number and its
> replacement, and the reasoning that connects them is usually the useful part.

