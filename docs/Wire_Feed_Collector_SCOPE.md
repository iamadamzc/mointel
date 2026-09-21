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
