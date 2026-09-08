# Commercial — charter

**Created 2026-09-07 by Integration, at the trader's direction.** The sixth seat.
Nothing here overrides `docs/threads/README.md`; that file is the shared rules and
this one is the scope.

---

## WHAT THIS SEAT OWNS

- **Data licensing.** What the desk's feed permits, what redistribution requires,
  and what it costs. **The gate that can invalidate everything else.**
- **Vendor landscape.** Not "who is cheapest" — **who offers a path from personal
  to commercial without a rebuild.**
- **Pricing, packaging, terms, and the commercial half of `docs/monetization-gates.md`.**
- **The unlicensed-build plan.** The trader's stance, recorded verbatim so it is
  not softened by anyone later:

  > *"i'd also like to plan to deploy without commercial license, but plan for
  > it. i dont want to enter into any agreements with no user base. so we build it
  > on the personal license and if we get traction then we pursue the commercial
  > compliance."*

## WHAT THIS SEAT DOES NOT DO

- **No code, no deploys, no product decisions.** Same rule as Integration.
- **It never enters an agreement, signs up, accepts terms, or supplies payment or
  identity details to anyone.** Not a trial, not a free tier, not a "just to see
  the pricing page" registration. **Those are the trader's, always, and the seat
  brings him the decision rather than the outcome.**
- **It does not contact vendors.** Public documentation, published rate cards,
  published agreements. **An enquiry is an approach and an approach is his.**

## THE DISTINCTION THIS SEAT EXISTS TO HOLD

**Building on a personal licence and launching on one are different acts.**
Development against personal-use data is ordinary. **The moment an external user
sees the output, that is the redistribution event** — not the moment money
changes hands, and not the moment a contract is signed.

**So "build now, comply on traction" is coherent for the BUILD and needs a named
line for the LAUNCH.** The seat's first job is to establish where that line
actually falls, because it determines whether a private beta is preparation or
exposure.

**State this plainly to the trader when it is load-bearing and then get on with
the work. It is his call and he has made the strategy clear.**

## STANDING RULES INHERITED

- Addresses from `list_sessions` every time. Never from a `from` attribute.
- **§5c: facts go direct to the thread that needs them. Decisions route through
  Integration**, which is the only seat that can see what is already in front of
  him.
- **Findings carry a sha. Reads and objections do not.**
- Report on completion or on blocking. **Going idle is a milestone.**
- No figures from his fills, no P&L, in the repository.

## FIRST TASK — DELIVERED 2026-09-07, see LIVE STATE below

**The feed-licence landscape, from public documentation only.** For each credible
vendor: what personal use permits, what redistribution requires, whether the
integration changes between the two, and what the published commercial terms
are. **Alpaca included and not assumed** — *"maybe alpaca isn't the answer"* is
his, and it is an open question rather than a lean.

**Deliver the shape of the decision, not a recommendation to sign anything.**

---

## LIVE STATE — 2026-09-07

**If anything above disagrees with this section, this section is right and the
section above is stale.**

**Delivered, in the commit carrying this section:**

- [`docs/commercial/2026-09-07-feed-licence-landscape.md`](../commercial/2026-09-07-feed-licence-landscape.md)
  — the feed-licence landscape: where the line is, the desk side from the code,
  the vendor table, the three vendors with a published path in detail, the
  exchange layer, the four shapes re-costed, the integration change per move,
  the shape of the decision, what could not be established, sources.
- Gate 0 mapped in [`docs/monetization-gates.md`](../monetization-gates.md).
- [`docs/commercial/2026-09-07-which-price.md`](../commercial/2026-09-07-which-price.md)
  — Integration's follow-on task after Gate 1 closed: for each derived
  real-time price, is there a real bid and ask, whose spread is it, and what is
  the method. The requirement is read from the code (the flat verdict and the
  NEW HIGH override are both defined by the live spread and go neutral without
  one); the answer is that only Databento's Mini carries a real bid and ask,
  FMV carries none, EquitiesEdge's is modelled, Tiingo's is gated — and any
  subset quote widens the band one way, by an amount no public page gives.
- [`docs/commercial/2026-09-07-volume-basis.md`](../commercial/2026-09-07-volume-basis.md)
  — Integration's question after bring-your-own-feed was ruled out: do the
  cheap display tiers carry consolidated volume, which RVOL needs in both its
  numerator and its denominator. Tiingo: no, IEX-only intraday. Intrinio
  Startup: not stated anywhere. Massive Business: yes, real-time, by its own
  knowledge base. Databento: Mini is a venue subset; its consolidated-volume
  Summary dataset is on every tier (catalog panel, read after the first
  version of this line said the tier was unreadable — corrected the same day)
  and Databento's own pages disagree on whether it is delayed. **Verified floor
  for REAL-TIME RVOL as defined: Massive Business, $2,499/mo, with no bid and
  ask. Databento Plus, $1,500/mo annual, carries both a real bid and ask and
  consolidated volume of unstated delay.** §7–8 of the document answer
  Integration's completion and fifth-vendor questions: the cheapest live
  spread on Massive is the $499 IEX expansion; nobody with a published price
  packages both below the tape; Nasdaq Basic with NLS Plus is the one exchange
  product carrying both. The delay interval and Intrinio Startup's volume
  basis are settled only by a sign-up, which is his.
- [`docs/commercial/2026-09-07-model-rate-card.md`](../commercial/2026-09-07-model-rate-card.md)
  — Integration's rate-card task: OpenAI's published Standard-tier rates for
  gpt-5.6-terra ($2.00 input / $0.20 cached / $12.00 output per 1M) and
  gpt-5.6-luna ($0.20 / $0.02 / $1.20), from developers.openai.com, verified
  in a rendered browser, dated by the changelog to the 2026-07-30 price cut.
  **gpt-5.6-sol added 2026-09-08** after Integration found it running in the
  store: $4.00 / $0.40 / $20.00, same 272K whole-request cliff, same 1.25x
  cache-write rule, dated by the changelog to 2026-08-21 and **published as
  promotional "at least through November 21, 2026"** with no successor rate.
  Three models run; three are priced; the lesson is Integration's — enumerate
  by what the store contains, not by the names handed over.
  Two lines the desk's counters cannot see: cache writes at 1.25x the input
  rate (the API usage object records reads only), and a whole-request 2x/1.5x
  multiplier past 272K input tokens. So a cost from the desk's own counters
  is a band between $2.00 and $2.50 per million on uncached input, not a
  number, until the console dashboard — his to open — supplies the write
  count. **Corrected 2026-09-08:** the first version inferred the Standard
  tier from a grep, which Integration rightly called a search standing in for
  a value. The widened check: the request bodies are hand-built `fetch` calls
  with no tier field, no SDK, no env var, no wrapper — the field is absent
  from the wire — and OpenAI's reference says an absent field means *'auto'*,
  which means *"the service tier configured in the Project settings"*,
  *'default'* unless changed. So: Standard unless the console says otherwise,
  and the response object's `service_tier` field would settle it from one
  logged response — Research's path, sent to Research. **Research built it
  the same day (`40ee093`): the served tier is logged as "served at tier X";
  the value is unobserved until the next interpretation runs after deploy.**

**Method, so the next reader knows what the figures are worth.** Four research
passes over public pages on 2026-09-07; **every load-bearing quotation and
figure was then re-read by this seat against the primary page or the PDF's
extracted text** — VERIFIED 2026-09-07 by re-read, for everything not marked
otherwise. Figures read only by a pass are labelled *"pass only"* in the
landscape and are the minor vendors. No vendor was contacted, nothing was
signed up for, no login-gated page was opened. The extracted agreement texts
(Alpaca T&C and Customer Agreement, the NYSE and Nasdaq subscriber agreements,
the CTA and UTP schedules and policies, the IEX policies, the Nasdaq and Cboe
price lists, the CT Plan filings) live in this session's scratchpad, not the
repo — they are public documents and re-fetchable.

**The standing facts, one line each; the landscape carries the quotations.**

1. The licence ends at the first person other than the subscriber who sees the
   output, paid or not. Every instrument read says so.
2. Alpaca publishes no redistribution path; its multi-user product is a
   brokerage partnership; its OAuth `data` scope is the published
   bring-your-own-feed shape. The one-SIP-connection rule is a published
   property of the subscription class.
3. Massive ($2,499 + $1,999, SIP) and Databento ($1,500 + fees, annual, direct
   feeds) are the self-serve paths to display rights; both are a rebuild of
   `lib/market/alpaca/`.
4. The exchange layer: $1 per non-pro viewer per network, agreements, reporting,
   a firm floor of roughly $4,000–$6,000 a month; delayed data has no
   display-unit fees; RVOL and rank are not-fee-liable derived data under UTP,
   price/move/VWAP are not.
5. The CT Plan replaces CTA and UTP on 2027-04-01; migration began 2026-09-01.

- [`docs/commercial/2026-09-08-product-name.md`](../commercial/2026-09-08-product-name.md)
  — the naming research he asked for. **Reframed by him directly on
  2026-09-08:** *"this is a depth tool. its intelligence. its not a scanner
  but a smart desk. an assistant that give you depth on the moving market"*
  — so the first pass on the avoid angle is kept as a record and The Avoid is
  withdrawn as the pick. Second pass: eight names on the depth / intelligence
  / smart-desk angle, registry RDAP checks on `.com` and five alternatives
  (timestamped 2026-09-07 22:52–22:55 UTC, with positive controls), web-search
  collision flags, say-it-aloud notes. **Pick: Desk Read** (the product's own
  vocabulary; `.com` held since 2014 with no site, every alternative clear;
  no collision). His-name alternative: Mointel (Madrid firm flag, spelling
  tax). Story alternative: Why It Moves (MarketReader occupies the idea).
  Landscape fact found on the way: **MarketReader** is a positioned occupant
  of "intelligence, not a scanner" for investors at large. **His own
  candidate, checked 2026-09-08 05:45 UTC (§2b): TMI Trader / True Move
  Intelligence / tmitrader.com / "What your scanner doesn't tell you."**
  tmitrader.com and every alternative clear — the only name tonight clear
  everywhere at once; no occupant on the exact name; flags on the parts:
  TMi Markets (a retail CFD broker — his read: not worried), TMI the Trend
  Momentum Indicator (looked at closer at his request: a $29.99/mo
  TradingView buy/sell-arrow indicator by "Rising Express Inc", branded TMI
  with no ™, TikTok @tmi_indicator at 637 followers on 2026-09-08 — a signal
  product, not what the desk does; collision on the letters and the audience,
  not the product), TrueMove (a Thai telecom); tagline unclaimed and the
  strongest line produced. **DECIDED BY HIM 2026-09-08: TMI Trader / True
  Move Intelligence / tmitrader.com / "What your scanner doesn't tell you."**
  His words on the letters: a chart indicator with a few hundred followers, a
  colloquial expression, *"i think we're good. let's move ahead."* The
  registration: his instruction later that day, *"ops can do that. register
  with amazon"* — relayed verbatim to Ops (Route 53, his AWS account) with
  Integration copied as a purchase; this seat registers nothing. **Registered
  by Ops 2026-09-08 ~08:27 UTC on his direct answer to Ops, $16 standard, no
  premium, expires 2027-09-08, privacy on, DNS at Route 53; nothing deployed,
  no tagline anywhere.** DNS, mail
  authentication and email sign-in are Ops's and Integration's once the
  domain is his. **Tagline under review at his prompting** (§2c): the
  original reads as "instead of a scanner" and the product is a supplement;
  pick offered, *"Your scanner finds it. TMI explains it."*, with the case
  against; "the story behind the move" is occupied (ExplainThisMove, Benzinga
  WIIM) and both are now in the landscape section. **Second pass (§2d), held
  to his own standard after Integration named it — the line must name the
  product without naming a competitor, and must not imply completeness:**
  pick *"Intelligence on what's moving."*, plainer alternative *"What's
  moving, and what it is."*, six phrases searched exactly with no occupant
  found and the limits of a tagline search stated. Registration constraints
  recorded: stop on a price surprise, domain only, no tagline. **DECIDED BY
  HIM 2026-09-08: "Intelligence on what's moving."** The name is complete —
  TMI Trader · True Move Intelligence · tmitrader.com · the line — and this
  seat's naming work is closed. Where the line appears is Design's surface
  and Integration's sequencing. Corrections
  carried: "Algo Trader Plus" is Alpaca's plan name; no name may borrow from
  a data vendor. Nothing registered; the purchase and any registrar enquiry
  are his.

- **RULED 2026-09-08 — the first-outside-viewer question, the one this seat
  named as never having been put to him.** His words via Integration: *"accept
  exposure. not going to pay for something i'm not sure is going to be used.
  my call. the moment we have something moving, i'll sign up. let's talk about
  the risk after we settle the other items."* Recorded at the top of the gates
  map with all four parts. What it means for this seat: the vendor decision is
  not due; the two floors and their defects stay ready in the volume-basis
  document for the moment the trigger fires; **the trigger — "something
  moving" — is undefined and this seat will not invent a threshold for it**;
  the risk conversation is Integration's to reopen.

**Open items.**

- ~~**The Alpaca plan tier is not in the repo.** Ask him; do not infer it into a
  document a second time.~~ **ANSWERED 2026-09-07, his word: Algo Trader
  Plus.** Recorded in the landscape §2 and the gates map; the inference is
  retired.
- **The first-viewer decision** — prices, derived facts only, or the user's own
  feed — is Integration's to put to him with Gate 1. This seat has the
  costings ready for whichever he picks.
- **The commercial half of the gates map beyond Gate 0** — pricing, packaging,
  terms — is unstarted and waits on Gate 1, because the unit sold decides the
  licensing object.
- **Watch, no clock:** the new CT Plan agreements at consolidatedtape.com
  (renders only a header today); a 2026 Nasdaq Basic price list; IEX's $1,000
  TOPS fee from 2026-10-01; Massive's unpublished exchange-fee amounts.
- **A second concurrent SIP consumer is a commercial decision, not an
  engineering one — RULED NOT NOW by Integration, `1c0c0a6`, and not put to
  him.** *Ops's reading of the connection fact, `d6ffec3`: "get a second
  connection" stops being an available remedy for a local desk beside
  production or a parallel worker.* **Corrected by Integration: a migration
  does not need it** — a new vendor is a different connection, not a second
  Alpaca one — so the only genuine need is a staging desk consuming live SIP
  beside production, which is the split-brain shape and is scoped nowhere.
  **The reason this seat did not name and Integration did: an approach to a
  vendor is not neutral when the eventual plan is redistribution on a personal
  licence.** Asking Alpaca for a second account creates a record and a
  relationship, invites a question the desk is not ready to answer, and cannot
  be un-asked. Deferred, not dropped — triggers: a staging desk genuinely
  scoped, or the migration itself, by which point the new vendor's terms
  govern. **The principle, now in the shared rules: deciding NOT to approach is
  sequencing and Integration's; deciding TO approach is his.** The published option set, for
  whenever that decision is wanted: Alpaca's Broker API partner plans publish
  5–10 stream connections, but that is a brokerage partnership at sales
  pricing; Massive Business publishes up to three websocket connections at
  $2,499/mo and is a rebuild; Alpaca's docs say the limit is 1 *"in many
  subscriptions"*. **Searched 2026-09-07, after Ops made both holes
  load-bearing (`bb00ad7`: the desk has never observed the limit, and the test
  that would costs production its feed):** (a) **a higher individual tier —
  CLOSED as far as public pages go.** None is published; Alpaca staff on the
  forum in 2021 said the paid plan carries *"a single websocket connection"*
  and in 2022 *"Only one active real-time connection is allowed now"*; the
  Broker API is the only published multi-stream product. (b) **A second
  account in the same name with its own subscription — still UNVERIFIED, and
  now known to be unresolvable from public pages.** No Alpaca page states a
  rule either way; the Customer Agreement's "Multiple Accounts" clause governs
  only securities-versus-crypto; the IRA page sets no limit on IRA accounts; a
  2021 staff reply treated a user's two accounts as a support matter. **The
  only way to close it is to ask Alpaca, and an enquiry is an approach — his,
  not this seat's.** Not a recommendation; an option set with one hole that
  public documentation cannot fill.

**Declined, deliberately:** any enquiry to any vendor, and any recommendation
to sign. Both are his.
