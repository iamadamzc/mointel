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

> **DO NOT SIZE WORK OR START BUILDING FROM THESE PROPORTIONS.** Today's
> production split is **40%** `COVERAGE_INCOMPLETE` against this store's **62%**,
> so the registry has grown materially in five weeks. **The ORDERING below is
> what this document asserts; the magnitudes are directional and stale.** A
> current re-measure is with him as a named production read. *A number that
> travels without its base is the defect this desk logged twice in one day, in
> two different seats.*

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
> *Persisting the `unreachable` flag on the collector report is the whole ask.*

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

## Related

- [../threads/rnd.md](../threads/rnd.md) — the register entries of 2026-09-25: the 94%-SEC corpus, the `COVERAGE_INCOMPLETE` decomposition, and the product-coverage-versus-market-claim relabel
- [../threads/research.md](../threads/research.md) — the thread that builds this
- [2026-09-25-catalyst-qualifiers-spec.md](2026-09-25-catalyst-qualifiers-spec.md) — the reasoning work, which is SECOND to this: a good explanation of a catalyst the desk does not have is worth nothing
