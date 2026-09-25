# Scope — wire-feed collector

*Research seat, 2026-09-21. Scoping only; nothing built. Approved by him for
scoping on 2026-09-21 after the Jev triage probe scored worst on the one ticker
with no wire source.*

## What already exists, so this is smaller than it looks

**The RSS/Atom parser is built.** `lib/research/catalyst/feeds.ts` — and its own
docstring already makes this document's argument:

> *"A company feed is the cheapest catalyst source that exists: one request, a
> dated list of the issuer's own announcements, no model involved. **When an
> issuer publishes one, it should always be preferred over web discovery.**"*

It is deliberately tolerant of malformed small-cap feeds: *"A feed that parses
badly should yield fewer items, never throw."*

**What it is pointed at is the gap.** The 31 stored `NEWSWIRE` sources arrived
through **per-company** feeds — `ir.duostechnologies.com/news-events/...` — which
requires `irRegistry.ts` to already know that company's feed URL. The resolver
found a usable newsroom for **4 issuers of 74**.

⇒ **The desk subscribes to companies it can already find. It does not subscribe
to the wires, which carry every issuer without being asked.**

## The three pieces, and only one is real work

```
1. WIRE SUBSCRIPTION      a handful of fixed aggregate feed URLs, polled like
                          EDGAR. No per-company discovery. Parser exists.
                          -> SMALL

2. TICKER ATTRIBUTION     an aggregate wire feed names the COMPANY, not the
                          symbol. Every release must be mapped to a ticker or
                          discarded.
                          -> THIS IS THE WORK

3. TRIAGE OF SURVIVORS    rank what attribution kept. Jev, measured below.
                          -> SMALL, and already probed
```

### Piece 2 is the whole scope

`issuer_registry` is the mapping table and it is **thin: 77 rows locally**, with
`ticker, company_name, cik, exchange, country, cik_confidence, mapping_source`.
A wire release says *"Recon Technology, Ltd. Announces..."* and the desk must
turn that into `RCON`.

**The failure modes are asymmetric and both matter:**

- **Miss** — the release is about a board name and attribution does not resolve
  it. The desk stays blind, which is today's behaviour. No worse than now.
- **Mis-attribute** — the release is bound to the wrong ticker. **This is worse
  than today**, because a false catalyst on a moving name is a positive claim.
  Prefer discarding to guessing, and record `UNATTRIBUTED` as its own state
  rather than dropping silently.

**Existing asset worth reusing:** SEC company names and CIKs are already
collected (`SEC_COMPANY_FACTS`, 211 rows; `SEC_SUBMISSIONS`, 257). EDGAR's
company index is the authoritative name→CIK→ticker map and the desk already
talks to EDGAR. **Attribution should resolve through EDGAR, not through string
similarity against 77 local rows.**

## Volume and cost, measured rather than estimated

**Jev's rate card, read off `docs.typesafe.ai/models.md` on 2026-09-21:**

```
jev-1.13.0    $42 / Btok  =  $0.042 per MILLION input tokens
              OUTPUT TOKENS ARE FREE
              250,000 tokens/sec   |   1,200 requests/min
              64k context per request; 32k for state + longest question
```

**From the probe: 227 documents cost 271,173 input tokens = $0.011.** About
1,195 tokens per document, so **~$0.05 per thousand documents.**

```
a full morning, 200 board names x ~20 docs   ~4,000 docs   ~$0.20
every trading day for a year                                 ~$50
the four wires' raw output, order 5,000/day   ~6M tokens     ~$0.25/day
```

⇒ **Nothing here is cost-constrained, and that corrects something I wrote
yesterday.** I said *"collection first, triage second, and triage is what makes
widening affordable."* **Wrong: triage was never the affordability question.** At
five cents per thousand documents the Jev layer is free at any plausible volume.
**Ticker attribution is what makes widening affordable** — it is the filter that
turns five thousand daily releases into the fifty about names on the board, and
it costs nothing per item because it is a lookup. Triage then ranks the
survivors.

**Rate limits do bind if attribution is skipped.** 5,000 releases against 1,200
requests/min is four minutes at the cap, inside the premarket window but with no
headroom. With attribution first it is seconds.

## Risks, in the order I would check them

1. **THE WIRES' TERMS, AND I AM NOT ASSUMING THIS ONE.** I assumed a public page
   was fetchable earlier this week and `stockanalysis.com`'s terms turned out to
   bar both automated access and competing-product use. **Read each wire's terms
   before writing a fetch**, and expect them to differ: some publish RSS
   explicitly for syndication, some licence headlines commercially. **This is a
   go/no-go per wire, not a detail.**
2. **Mis-attribution**, above. Discard rather than guess; `UNATTRIBUTED` is a
   state, not a silent drop.
3. **Duplicate clustering across wires.** One release often crosses two wires
   plus the company's own IR page. `cluster.ts` already clusters by
   `ticker|normalised headline|published_at` and picks a canonical member
   **strictly by source authority** — so the authority ranking needs a defined
   position for each wire, or clustering will pick arbitrarily.
4. **`published_at` precision.** `research_sources` has a
   `published_precision` column, which exists because feeds lie about times. A
   wire release timestamped to the minute is the thing that makes an 08:00 ET
   catalyst attributable to an 08:32 move; a date-only timestamp is not.
5. **Volume into the interpreter.** Attribution plus triage must hold the
   interpreter's input to roughly what it takes today, or the cost that moves is
   the interpreter's, not Jev's.

## STEP 1 CHANGED SHAPE — it is an EDGAR timestamp, not a wire

*Measured 2026-09-21, after the terms check. This supersedes the build order
below.*

### PR Newswire is a no-go for self-serve ingestion

Read live at `prnewswire.com/terms-of-use/`:

> *"use any **robot, spider**, site search/retrieval application, or other manual
> or automatic device or process to **access, search, download, retrieve, index or
> 'data mine'** any content or data from the Site"* — prohibited.
> *"reproduce, distribute, 'frame,' 'mirror,' **'scrape,'** republish or
> retransmit information or content provided by PR Newswire"* — prohibited
> without written permission.
> The licence granted is *"solely for your **personal, noncommercial use**"*, and
> using the Site to *"**generate revenue for any business or commercial
> purpose**"* is prohibited.

Their RSS page posts **no alternative permission** — it routes commercial users to
an **Online Publishers** programme. So there is a legitimate route and it is a
**commercial licence**, which is his decision and not a build. *Second time this
week the obvious data route needs a licence.*

### BUT THE DESK ALREADY RECEIVES PRESS RELEASES, THROUGH EDGAR

```
SEC_EXHIBIT rows                                878
of which EX-99 press-release exhibits           669
```

Their excerpts are plainly release text — *"...today announced"*, *"Freightos
Reports Platform KPIs for Second Quarter..."*. **An issuer announcing a material
event files the release as an 8-K or 6-K exhibit**, and that is public-domain SEC
content with no licensing question at all.

⇒ **So the gap is LATENCY, not existence.** The wire publishes at 08:00; the
exhibit appears when the issuer files.

### AND THE LATENCY IS UNMEASURABLE FROM THIS STORE — BUT NOT FOR THE REASON WRITTEN HERE FIRST

**CORRECTED 2026-09-25. The original reading of this section was wrong and is
kept below only as the mistake it was.**

```
SEC_EXHIBIT   published_precision = INFERRED     878 of 878
SEC_FILING    UNKNOWN 3,235 | DATE_ONLY 17 | EXACT 1
```

**"One row of 3,253 carries an exact timestamp" is NOT evidence of a defect, and
it was read as one.** Every row in `data/market-prod-2026-08-23.db` predates
`b1d64b9` (2026-09-06T23:40Z), the commit that added **both** the
`acceptanceDateTime` parse and the `EXACT` write. **That store has no
post-change arm; it could not have returned another number.** The filing path
was not half-built — it was built, and the population was measured on the wrong
side of its own boundary. `sec/collector.ts` says so at its `SEC_ACCEPTANCE_BOUNDARY`
comment: *"never compare a rate across the boundary without partitioning."*

*The other artifact, which the original section did catch and which still
stands: filtering `published_precision != 'INFERRED'` and bucketing by hour put
**99.4% of filings in 16:00-20:00**. Those are date-only values parsing as
midnight UTC, which is 20:00 ET. It would have argued hard for the licence.*

**The EXHIBIT half WAS a real defect and is fixed.** `catalyst/collector.ts`
hardcoded `publishedPrecision: 'INFERRED'` regardless of the parent, so all 878
claimed a derived time over a bare date. Fixed at `ea2d1c9`: an exhibit now
inherits its parent's precision, and a parent with only a date yields `UNKNOWN`
rather than a false `INFERRED`.

### ⚠️ THE MEASUREMENT IS FORWARD-LOOKING, AND THE 878 CAN NEVER ANSWER IT

**This is the part that changes the plan, and a snapshot will not help.**

`insertResearchSources` is `INSERT OR IGNORE` (`researchRepo.ts:558`). The only
UPDATEs on that table touch `cluster_id`/`canonical` (`:710`) and `active`
(`:732`). **Nothing anywhere writes `published_at` or `published_precision` on an
existing row**, and an exhibit's fingerprint is `hash(accession|exhibitName)`, so
re-collecting it is a no-op. Those rows are frozen.

It compounds: the exhibit branch reads its parent from the **stored** rows
(`collector.ts:378`, capped at `MAX_FILINGS_FOR_EXHIBITS = 4` per ticker) and
inherits that row's `publishedAt` — and parents are frozen the same way. So a new
exhibit hung off an old parent still inherits a bare date.

⇒ **The measurable population is EX-99 exhibits whose PARENT FILING ROW was
inserted after both `b1d64b9` and `ea2d1c9` were running in production.** New
filings only. It accrues from the deploy instant; the first useful read is some
sessions out.

⇒ **REVISED STEP 1:**

1. **Confirm production runs past both shas** — an Ops question, and the answer
   on 2026-09-23 was yes for both (`42c9a73` web/research, `34414f4` market).
2. **Let it accrue**, then copy down. The late-Sep EX-99 snapshot is
   **pre-approved** (`8f331ed`).
3. **Partition on the VALUE, not the label** — ask whether `published_at`
   carries a clock, not whether `published_precision` says so. That works
   whichever code wrote the row, and it is the specific guard against the
   midnight-UTC artifact rebuilding itself.
4. **Measure** what share of press-release exhibits become public inside
   04:00–09:30 ET, **then** price the licence. If most are public on EDGAR
   before the open, a licence buys minutes; if they land after the close, it
   buys the whole premarket window.

**The wire question is still not answerable, and the thing that makes it
answerable is time rather than work.**

## What I would build, smallest first

1. **One wire, terms checked, aggregate feed, attribution through EDGAR, no
   triage.** Measure attribution precision and recall against the board. If
   attribution is unreliable, nothing downstream matters.
2. **Add the remaining wires** whose terms permit it.
3. **Add Jev triage** in front of the interpreter, using the probed questions.
4. **Re-run the triage probe.** Its 0.80 bar failed at 0.790 on an all-SEC corpus
   and will keep failing there — **a heterogeneous corpus is what makes that
   measurement mean anything.**

**The one number that would justify the whole thing:** RCON's PR Newswire release
existed at 08:00 ET on the morning the board showed it at rank 3, up 270%, with
`CATALYST UNKNOWN`. **Step 1 either surfaces that release or it does not**, and
that is a cheaper test than any of the rest.
