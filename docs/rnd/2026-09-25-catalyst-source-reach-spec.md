# Spec — catalyst source reach: why the desk has no site to read

**Status: SPEC, from R&D to Research Pipeline. R&D owns the diagnosis and the
verification design and builds none of it.**

**His narrowing, 2026-09-25, and it is the whole scope:**

> *"we know sec filings are 100%, that's not the issue. its sites and wires.
> this is where the mechanism needs to improve."*

---

## READ THIS BEFORE ANY NUMBER BELOW

**EVERY PROPORTION IN THIS DOCUMENT COMES FROM ONE POPULATION: 729 archived
research jobs carrying a `collector_report`, in `market-prod-2026-08-23.db`,
covering 2026-08-18 to 2026-08-21 — FOUR SESSIONS.**

> **DO NOT SIZE WORK OR START BUILDING FROM THESE PROPORTIONS.** **The ORDERING
> below is what this document asserts; the magnitudes are directional and stale.**
> *A number that travels without its base is the defect this desk logged twice in
> one day, in two different seats.*

> ## RE-MEASURED 2026-09-25 — his named production read, run by Ops. SIZE ON 49.4%.
>
> **Ops reproduced this document's window first, exactly** — n=729,
> 62.3 / 26.9 / 10.8 — *so the new figures measure the same population rather
> than an adjacent one.* **Then, by period, n=4,812 over 28 sessions
> (2026-08-18…09-25):**
>
>     Aug 18-21 (this doc)  n=  729   COV_INC 62.3%   RECENT 26.9%   NO_RECENT 10.8%
>     late Aug              n=  944           42.2%          35.9%             21.9%
>     early Sep             n=2,166           43.5%          37.6%             18.8%
>     THIS WEEK             n=  791           49.4%          30.1%             20.5%
>     whole population      n=4,812           48.1%          33.4%             18.5%
>
> **THE ORDERING HOLDS IN EVERY PERIOD** — `COVERAGE_INCOMPLETE > RECENT >
> NO_RECENT. *That is what this document asserts and it survives.*
>
> **THREE CORRECTIONS THE MAGNITUDES FORCE, TWO OF THEM TO THIS DOCUMENT:**
>
> 1. **"The registry has grown materially in five weeks" is true end-to-end and
>    HIDES A SIX-POINT REGRESSION.** 62.3 → 42.2 → 43.5 → **49.4 this week.**
>    **Size reach work on 49.4%, not on the trend.** *A monotone story fitted to
>    the endpoints is exactly the shape this register keeps catching.*
> 2. **The "40% today" this document quoted was a PARTIAL-DAY number** — 173 jobs
>    measured mid-afternoon. **Today's full session is n=214, 47.7%.** *A
>    session's split measured before the session ends is not the session's
>    split.* Ops named the error as its own; it is corrected here because it
>    travelled in this document.
> 3. **`NO_RECENT_SOURCE_LOCATED` nearly DOUBLED, 10.8% → 20.5%.** After today's
>    fixes that bucket reads as *"looked and found nothing"*, so **one row in
>    five now, against one in ten in August.**

## What the buckets are, and which one was being argued about

    729 archived jobs, 08-18..08-21
      COVERAGE_INCOMPLETE        454   62.3%   <- never examined by anyone until today
      RECENT_SOURCE_LOCATED      196   26.9%
      NO_RECENT_SOURCE_LOCATED    79   10.8%   <- four seats spent 2026-09-25 on this

**`NO_RECENT_SOURCE_LOCATED` is the machinery working.** All 79 held a company
source url — the code requires it — and 21 of them added 5+ sources.
**`COVERAGE_INCOMPLETE` is the machinery never starting.**

## The diagnosis, and it is NOT the one this seat first proposed

**Of the 454, 374 (82.4%) had no company source url at all.** The first reading
was *"the desk stops retrying"* — a registration ratchet. **Reading the code
refutes that, and the refutation is what makes this spec worth anything.**

**RETRY ALREADY EXISTS AND IS ALREADY WELL DESIGNED.**
`lib/research/catalyst/irRegistry.ts` separates two negatives that were once
armed identically:

    NEGATIVE_COOLDOWN_MS      24h   "we looked and there is genuinely nothing"
    UNREACHABLE_COOLDOWN_MS    1h   "we could not fetch"  <- tuned to his 07:00-10:00 window

**Do not propose adding an expiry. It is there, the distinction is the right
one, and the one-hour value was chosen for exactly his trading window.**

**So `companySourceDetail` across the 454 reads differently than it first
appears:**

    186   41%   "reused stored negative result"        <- inside a 24h cooldown, BY DESIGN
    129   28%   "not attempted"                        <- resolution gated off
    100   22%   "no durable company source located"    <- resolution RAN and FAILED
     36    8%   located a newsroom index or a feed

> **286 of 454 — 63% — trace back to resolution having genuinely failed to find
> a newsroom for that issuer** (the 100 that failed now, plus the 186 re-serving
> a failure from within the last day). **The lever is not retry cadence. It is
> whether the finder can locate a small-cap issuer's newsroom at all.**

**THAT 286 WAS CHALLENGED AND IT SURVIVES WITH A BOUND. Integration's objection,
which was correct in form:** both cooldown branches return the **identical**
detail string (`irRegistry.ts:165`), so `reused stored negative result` cannot
by itself distinguish **reach** (*there is genuinely no newsroom*) from
**reachability** (*we could not fetch one*). **Different levers.** And
`stored.note`, which would separate them, is updated in place with `COALESCE`
(`researchRepo.ts:460`) — *so today's note is not the note as of an August job,
and classifying one with it reads a reassessed field's final value backwards.*
**Confirmed: the archived `collector_report` carries no `note` field at all.**

**But the split is bounded from the job row alone, with no reassessed field.**
**A ticker with no source url on file cannot be an unreachable-fetch case —
there was nothing to fetch:**

    of the 286                          HAS a source url
      reused stored negative   n=186        5   2.7%
      no durable source        n=100        5   5.0%
      -> NO url at all         276  96.5%   <- can ONLY be reach
      -> url on file            10   3.5%   <- could be reachability

> **RETRACTED WITHIN THE HOUR. THE BOUND ABOVE IS INVALID — do not use it.**
> Integration opened the write path and the premise is false. **Both outcomes
> take the same branch and neither persists a url** (`irRegistry.ts:200-209`):
>
>     if (!durable) {                     <- BOTH cases land here
>       note: unreachable ? UNREACHABLE_NOTE : 'no durable ... located'
>       sourceShape: null                 <- and NO url either way
>     }
>
> **`unreachable` means candidates DID exist and none could be read** — the
> resolver produced urls, up to six were probed, every one failed. *The url is
> withheld deliberately and for a good reason (recording a newswire copy would
> look like success and permanently block the discovery fallback), but it means
> absence-of-url is produced by the reachability case too.*
>
> **And the error ran in the direction that flattered my conclusion:** every
> host that refused all six probes was booked as a reach failure. **96.5% is
> simply the fraction with no url, which is a different quantity from what I
> claimed it bounded.**

**SO THE 286 REMAINS UNSPLIT, AND ONE CLAIM IN THIS SPEC MUST BE WEAKENED.**
*"The failure is concentrated in candidate GENERATION, not in fetching"* — as
originally written below — **is not established.** The 286 splits into two
sub-causes in unknown proportion, **and they have different fixes:**

    (a) REACH          the resolver produced no viable candidate
                       -> fix is candidate generation (off-domain IR hosts, subdomains)
    (b) REACHABILITY   candidates existed; every probe failed
                       -> fix is fetch robustness: the 6s timeout, MAX_CANDIDATE_PROBES=6,
                          the user-agent, whether a refusing host is retried at all

**The ORDER below is unaffected** — both live inside resolution, ahead of the
gate and ahead of invocation. **Only the sub-diagnosis is open.**

**THE MINIMAL THING THAT WOULD SEPARATE THEM, and it is one boolean.** The
distinguishing bit **already exists in memory** — `unreachable`, returned by
`selectCollectionPoint` at `irRegistry.ts:194` — and is written **only** into
the registry `note`, which `researchRepo.ts:460` updates in place with
`COALESCE`. **It never reaches the job row.**

> **And the forward telemetry shipped today does NOT cover this. Verified:**
> `networkRequests` is incremented at the company fetch (`collector.ts:626`,
> `:656`) and for SEC requests (`:1122`) — **the resolver's own candidate probes
> are not counted anywhere**, and `companyFetchDetail` describes the
> deterministic fetch of a known url, not the probing that precedes having one.
> **So `3dc14e2` does not make this measurable either, forward or backward.**
> ~~*Persisting the `unreachable` flag on the collector report is the whole ask.*~~

> **THE ONE-BOOLEAN ASK IS REFUTED TOO — by Research, with a sharper argument
> than the objection that killed my previous claim. Verified in the file rather
> than relayed.**
>
> **`unreachable` is a STICKY OR across the probe loop** — `let unreachable =
> false` (`:349`), set true on any `NOT_FETCHED` (`:371`), and **returned
> alongside a SUCCESSFUL point** (`:364`, `:366`). *So it reads true on a
> resolution that worked*, and in a mixed run — one host refuses, another
> answers but is not durable — it files a **reach** failure as **reachability**.
> **Opposite fixes.** It collapses three outcomes into two:
>
>     returned 0                            resolver named nothing        REACH
>     returned N, fetched 0                 every host refused us         REACHABILITY
>     returned N, fetched M, none durable   pages answered, none was an   REACH
>                                           index or a feed  <- the XOS case
>
> **So it is three counts, not one boolean, and they are already in the tree:**
> `ResolutionProbeCensus { returned, probed, fetched }` (`:45`, `:116`, `:352`),
> shipping as **`d734d6f`**. *Approved and enumerated by Integration; not this
> seat's to design, and my version would have been wrong.*
>
> **TWO HAZARDS FOR WHOEVER READS THAT CENSUS, and R&D will be that reader:**
> 1. **`probed` is incremented BEFORE the outcome is known** (`:359`, ahead of
>    the verdict checks at `:364`+). **It means *candidates attempted*, not
>    *candidates that answered*** — `fetched` is the one that counts bodies
>    returned (`:117`). **Reading `probed` as "answered" gets the reachability
>    arm backwards.**
> 2. **`probed` counts CANDIDATES, not HTTP REQUESTS.** `probeIndex` spends
>    extra fetches inside the loop that the census never sees, **so it cannot be
>    read as load or as cost.**
>
> **AND THE URL WITHHOLDING MUST STAY.** Recording a newswire copy would look
> like success and permanently block the discovery fallback — *which is how XOS
> reached its Air Force release.* **The absence of a url is not the defect and
> must not be "fixed".**

> **NOTHING RETROSPECTIVE IS RECOVERED. The August proportions in this document
> are the last word on August, permanently** — the archived report carries no
> `note`, and the `!durable` branch stored no url either way. **The split becomes
> measurable only from the first session after `d734d6f` deploys.** *A future
> seat must not wait for this instrument to resolve the August census; it never
> will.*

## Where the reach actually runs out

`irRegistry.ts` probes a fixed candidate list on the issuer's own domain:

    FEED_PATHS   /rss  /feed  /rss.xml  /feed.xml  /news/rss  /investors/rss
    INDEX_PATHS  /press  /news  /newsroom  /press-releases  /media  /investors
    MAX_CANDIDATE_PROBES = 6

**That is a good heuristic for a company that hosts its own newsroom under a
conventional path.** It is the common shape at large caps and an uncommon one in
this universe. **Small-cap IR is routinely hosted off-domain** — a third-party
IR platform, an `ir.` subdomain, or a path the list does not contain. **A
correct probe of six guessed paths on the wrong host is a correct answer to the
wrong question**, which is the same shape as the invocation defect found the
same day.

**This spec does not tell Research which hosts to add** — that is a pipeline
fact R&D does not own, and guessing it here would be this seat writing someone
else's domain knowledge into an artefact. **What it asserts is narrower than an
earlier draft claimed, and the retraction above is why: the failure is
concentrated in RESOLUTION — in the desk ending a job with no usable company
source — and NOT in the deterministic fetch, the parse, the retry cooldowns or
the state classification, all four of which were opened today and are sound.**
**Whether resolution fails because no candidate was generated or because every
candidate refused to be read is UNRESOLVED**, and the one boolean that would
settle it is named above.

## Order of work, and this is the part the document asserts

**1. RESOLUTION REACH — can the finder locate the newsroom.** 63% of the
can't-look bucket is downstream of this. *Candidate generation beyond
same-domain guessing; the `SECONDARY_DISCOVERY` path already exists and supplied
54 sources, so a resolver fallback is not new machinery.*

**2. THE GATE.** `firstQualification` requires `registry.lastDiscoveryAt === null`,
so the **urgent** resolution path fires **once per issuer, ever**, plus one
authorised `recoveryEpisode`. *A later non-urgent call site re-attempts subject
to the 24h cooldown, so this is not a hard ratchet — but the urgent, in-window
attempt is one-shot.* **Worth asking whether an issuer that has since built a
newsroom can ever get an urgent re-resolution.** *Question, not instruction.*

**3. INVOCATION FREQUENCY.** Real, and it cost AIFF on 2026-09-25 — one job at
07:48, rank 9 of the top 12, never re-run in seven hours while re-run triggers
fired three times for eleven other tickers each. **Third because it can only
help issuers that already have a source**, which is the minority. *Ops already
holds this and has it queued.*

## What R&D will measure, so "better" is not a matter of opinion

**Pre-registered here, before the work starts:**

- **Primary: the share of board names for which the desk HOLDS a catalyst at
  decision time** — currently 22.6% pooled / 32.1% on a complete pre-open pass
  over 26 sessions. **This is a PRODUCT COVERAGE metric and must never be quoted
  as a market claim** (see the register entry of 2026-09-25). It is the number
  this work should move.
- **Secondary: the `COVERAGE_INCOMPLETE` share**, and within it the share with
  no source url. **Re-measured on current data first**, because the 62% here is
  four sessions old.
- **A null counts.** If resolution reach improves and coverage does not move,
  the catalysts are not on company sites and the finding is that the free path
  has a ceiling — which is itself worth knowing, and is the measurement he has
  not yet authorised.

**Not in scope, by his standing ruling: the wire half.** Free EX-99 path only,
no licence, no wire-body scrape, *not as a fallback*. **Recorded here so the
work does not drift into it.** The same release usually appears on the issuer's
own newsroom, which is a permitted source and already a live source type
(`COMPANY_NEWSROOM`).

## ADDENDUM 2026-09-25 — a wire source may DISPLACE this spec's first item. Population measured; coverage not.

**He ruled the same evening to build an Alpaca News (Benzinga) feed.** A wire
feed is **keyed by SYMBOL and needs no newsroom URL at all**, so for every name
it covers, **resolution reach does not arise.** *The 63% may be the size of a
problem a wire routes around rather than one the desk has to solve.*

**THIS SPEC IS NOT REWRITTEN AND MUST NOT BE, until the coverage number exists.**
*Integration flagged rather than asserted, correctly: nobody has measured what a
wire feed covers for this universe, and that measurement belongs to Research,
which will hold the feed.*

**What R&D CAN settle is the other half — WHO is in the bucket — because a
wire's coverage depends on listing characteristics. Measured on the 125 tickers
whose resolution found no newsroom (`market-prod-2026-08-23.db`):**

    exchange        Nasdaq 107   NYSE 17   null 1     -> 99% major-exchange listed
    SEC sources     125 of 125                        -> 100% reporting registrants, all with a CIK
    foreign issuer  44 (35.2%)                        -> against 40.0% of all researched names

> **These are not OTC shells. They are Nasdaq and NYSE companies that file with
> the SEC and simply have no newsroom at a guessable URL.** *That is exactly the
> population a commercial wire indexes well*, so **the population
> characteristics are favourable to the displacement hypothesis** — without
> confirming it, because coverage is a fact about the vendor and not about the
> names.

**THE SEGMENT WHERE REACH WORK MAY SURVIVE REGARDLESS: the 35% foreign
issuers.** *Foreign private issuers are where wire coverage thins, and they are
barely under-represented in this bucket relative to the whole researched set.*
**If the coverage number comes back high overall, check it separately for that
segment before retiring the issuer path.**

### RESOLVED 2026-09-25: THE ORDER HOLDS. Reach stays the dominant lever.

**Research answered from measurements that already existed: Benzinga PRIMARY
coverage of top-12 names is ~23%.** *At 70% the order would have flipped. At 23%
it does not.*

> **THE SENTENCE THAT SURVIVES: reach is displaced by AT MOST about a quarter,
> and the intersection is unmeasured.** **23% is Benzinga's COVERAGE RATE, not
> the displacement of the 63%** — those are equal only if wire coverage is
> independent of newsroom quality. **DO NOT write 23% into this spec as the
> displacement.** *A number reused one step from where it was measured is this
> desk's most frequent defect and it bit four times on 2026-09-25 alone.*

**AND THE INDEPENDENCE ASSUMPTION IS FALSE IN THE DIRECTION THAT SHRINKS THE
DISPLACEMENT.** *Integration's mechanism: the issuers a wire covers are the ones
who PAY a wire — larger, more professionally run, hence most likely to have a
conventional newsroom at one of the six guessed paths.* **Tested here on stored
data:**

    newsroom-not-found, whole population       125 of 240   52.1%   <- base rate
    newsroom-not-found among wire-carrying       2 of  18   11.1%

**Wire-carrying names are roughly five times LESS likely to lack a newsroom.**
*n=18 and directional only.* **But the sampling bias runs AGAINST the finding
and therefore strengthens it:** the desk's newswire copies are found by the
*discovery fallback*, which stays available precisely when the issuer path fails
(the XOS case in `irRegistry.ts`). **That bias should make wire-carrying names
MORE likely to lack a newsroom, and the opposite is observed.**

> **So the true displacement is below 23%, and reach work is not materially
> reduced by the wire.**

**THE NUMBER STILL WORTH WAITING FOR, and it is cheap: coverage by PRICE BAND.**
*If Benzinga covers the AIFF class but not the sub-$1 names he actually trades,
both levers stay at full size.* **Research has it queued as a re-cut of an
existing query — no new API calls, no deploy window.** **Do not spend on reach
before that split lands**, and **ask for it as a split rather than a total** —
the same pooled-versus-conditional error this seat made on the coverage rate the
same afternoon.

**AND A DELIBERATE DECISION IS OWED ON THE PROBE CENSUS** (`d734d6f`,
`candidatesReturned/Probed/Fetched`), which this seat argued for hours earlier.
**If a wire lands first, that census partly measures a problem the desk has
stopped having.** *It is not wasted — it says which names still need the issuer
path, which is precisely the foreign-issuer question above. But its PURPOSE
changes, and that should be decided rather than discovered.*

## Related

- [../threads/rnd.md](../threads/rnd.md) — the register entries of 2026-09-25: the 94%-SEC corpus, the `COVERAGE_INCOMPLETE` decomposition, and the product-coverage-versus-market-claim relabel
- [../threads/research.md](../threads/research.md) — the thread that builds this
- [2026-09-25-catalyst-qualifiers-spec.md](2026-09-25-catalyst-qualifiers-spec.md) — the reasoning work, which is SECOND to this: a good explanation of a catalyst the desk does not have is worth nothing
