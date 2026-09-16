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

## LIVE STATE — as of 2026-09-15 (opened 2026-09-07; every entry below carries its own date)

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
  and Integration's sequencing. **The trademark knock-out search is WAIVED
  by him, 2026-09-09 (*"2, waive."*, Integration `902c8aa`); the §2b flags
  stay on file uncleared, which is the state he chose. Nothing on this seat
  was ever blocked on it.** Corrections
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
  the risk conversation is Integration's to reopen. **He then asked what the
  risk really is and how it would be traced; answered from the contract
  text in the landscape §1b:** the switch is Alpaca's without cause at any
  time (structural, from the first viewer, no integrated fallback); the
  exchanges are third-party beneficiaries who may enforce against him and
  anyone he supplied; reclassification and retroactive fees are small at one
  subscriber and anything beyond that is unpublished; and detection is
  through the public product, not the data pipe, so it scales with publicity
  rather than viewers. What it means for him in practice is a lawyer's
  question and the conversation Integration holds. **Integration then asked
  whether the 30-day "User Application" notice is a free compliant path that
  would make his choice a false one. From the Terms: it is a notice, it costs
  nothing, and it licenses nothing — Content including market data stays
  "exclusively for personal and noncommercial" use without Alpaca's "express
  prior written consent", §30 of the Customer Agreement says the same, the
  published answer to that consent is no, and the exchange agreements forbid
  furnishing the data regardless. The choice was not false. The notice is
  free and not neutral: it converts a quiet exposure into a disclosed one.**
  **Then his mechanical question, "how do they know it's their data?" —
  answered in §1c from thirteen documents, each of four parts marked STATED
  or NOT DESCRIBED:** no identification mechanism in the data is described
  anywhere (what is described is visible attribution a compliant display
  must carry); the inquiry right is Nasdaq's "any reasonable request …
  regarding … receipt, processing, display and redistribution", no threshold;
  he is already obliged to report the change of circumstances himself, and
  the exchange side holds his name, address, occupation and employer from
  Alpaca's non-professional records; so the link is the account, made by
  inference and inquiry, and the honest answer is the admission. By field:
  a derived-only surface displays nothing any instrument polices; a price
  surface displays exactly what they do.

- [`docs/commercial/2026-09-10-auth-providers.md`](../commercial/2026-09-10-auth-providers.md)
  — Integration's commission after he named the providers: what Google and
  Apple require, as facts with citations. **He ruled Apple phase two and
  asked of Google's OAuth consent screen "is that required?"** Google answer
  landed, every page re-read 2026-09-10: for identity-only scopes an
  unverified app works for any Google user with the domain shown in place of
  name and logo; three Google pages say verification is not mandatory for
  that, two say production apps must verify — contradiction reported, not
  resolved; brand verification takes minutes to 2–3 business days and needs
  a public home page, privacy policy and terms on the owned domain and
  Search Console domain ownership by DNS TXT record, which sits in Route 53;
  no page states a price or "free". **Apple section landed the same day,
  re-read through the browser:** the deciding fact for phase two is Apple's
  own sentence, *"you must have an existing app in the App Store that uses
  Sign in with Apple"* — a web-only product with no iOS app is outside what
  the pages offer, and whether an unshipped App ID is accepted in practice
  is stated nowhere; the Program is $99 USD a year, individual enrolment is
  fine, organizations need a legal entity and a D-U-N-S number; `sub` is
  stable per team, a relay address is asserted verified but never matches a
  Google user's address, so Ops's link-from-session model already accepts
  Apple without a migration; the relay domain moves to private.icloud.com
  per Apple's 2026-08-24 update, and sending to a relay address needs the
  domain registered with Apple and SPF/DKIM.

- **Positioning on the public page, 2026-09-10 (naming document §2e), for
  Web, a new thread that owns every word a stranger sees.** He ruled "i like
  the layout, i dont like the sales pitch" and "invite only, can ask for
  invite." Answers: the scanner line is retired from the page (a hook by
  construction; the supplement relationship belongs in the plain statement);
  no one-paragraph plain statement is registered — Web writes it from the
  three registered sentences and hands it here; an invite request asks for
  an email address and nothing else. Raised unasked: the public page is the
  evidence surface under accepted exposure, so it should say intelligence on
  what's moving and not sell the tape. **Web acted on that the same day
  (`7d81bae`): the tape is off the page. And the plain statement is now
  REGISTERED (§2e item 2), written by Web from the three sentences and
  accepted here, with two dependencies recorded: "each one" rests on the
  board rendering not-researched as a state, and his word "assistant" was
  dropped by Web's judgement and can be restored with one word.**

- [`docs/commercial/2026-09-11-competitor-trademomentum.md`](../commercial/2026-09-11-competitor-trademomentum.md)
  — his commission: the transcript of a competitor's "END of the free watch
  list" Short, what that channel publishes item by item, and the commercial
  read. Transcript got from YouTube's public panel in the in-app browser
  (auto-generated captions, consent declined). **The premise is stale: the
  free series did not end** — the same afternoon's list was posted, and the
  channel carries a "TOP 3 STOCKS" Short for every trading day through
  2026-09-11; the video names no price or date and funnels to an existing
  $147/mo chatroom. Per name he gives a five-part game plan — trigger,
  confirmation, targets, chase zone, "no break, no trade" — and no catalyst,
  float, structure or supply. It is a signal product with a personality, the
  opposite of the registered boundary; "track the same thing" splits into the
  levels and continuity the desk already computes and the entries it has
  ruled out. First published price in the desk's own audience: $147/mo.
  What to build is Integration's to route; nothing names him on the page.

- **May a competitor be named? — ruled 2026-09-15, naming document §2e-bis.**
  His voice-reference answer to Marketing named Warrior Trading as the style
  the app is patterned after and said he wants TMI to be complementary.
  Integration corrected the relay: §2e retired the line, not the
  relationship, which is registered and live in Web's card. Ruling: the
  relationship stays as registered; Warrior is not named in public copy — a
  positioning fact he states is not an instruction to publish it, naming
  puts a competitor back in the subject position against his own objection
  that retired the line, and an unagreed association with a named third
  party is the class this seat struck in §2f. What it licenses is the
  reader and the vocabulary, Marketing's to use. **Ruled by him 2026-09-16:
  "do not want warrior mentioned." His instruction now, not this seat's
  advice.**

- **The session report is a product surface — scoped under standing rulings
  2026-09-16, naming document §2g.** His word: "the report is for
  monetization, coaching (what you do) is just for me." Three rulings already
  on this seat apply before it hardens: the licence line (a delivered report
  is the first-viewer event, covered by accepted exposure; prices in it put
  the tape in a persistent document, derived fields do not — the field list
  is the licence posture and the choice is his); the §2f claims principle (a
  report may state what happened as record, never as what the reader could
  have done; coverage stated, not implied); and single-tenancy as a shipping
  gate (a report narrating a Sheet-sourced field has no second customer;
  Research to trace which fields touch the Sheet). **Research traced one
  layer the same day: every narrated field resolves to the dossier or the
  ticker session store, and the assessment table has no float column, so
  the gate is cleared for the reports as scoped; whether the dossier's own
  structure classification was shaped by Sheet input upstream is untraced
  and Research's next. Research also found prices are the least
  load-bearing and most exposed content in the report, so the tape
  exposure there is optional, not structural.** Pricing and packaging of
  the report is open and waits on him.

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

---

## Opening message for a new chat

*Written 2026-09-12 by Integration audit. **This charter had no opening message at
all**, which meant every Commercial session started from whatever the previous chat
happened to say.*

> This is the **Commercial thread** for the TMI Trader desk at `A:\mointel`. Read
> `docs/threads/commercial.md` completely, starting with **LIVE STATE**, then
> `docs/threads/README.md`.
>
> **First action, before anything else: title this session `Commercial-tmi`.** Peers find
> you by that title in `mcp__ccd_session_mgmt__list_sessions`. Until it is set,
> nobody can reach you.
>
> **You own what is TRUE about this product commercially:** positioning of record,
> the name, claim boundaries, vendor and licence questions, and the risk register.
> **Marketing owns how things are said; you own whether they may be said at all.**
>
> **You research from PUBLIC SOURCES ONLY. Register nothing, create no account, start
> no enrolment, agree to no terms.** *If a number is only obtainable behind a login,
> that is a finding — say so and stop.*
>
> **Tooling, learned the hard way: `WebFetch` fails on PDFs and JS-rendered pages;
> the in-app browser works where it does not.** **Re-read every number before it
> carries a sha, and date every price and timeline** — they decay and they will be
> quoted at me. **Close the browser tab when you are done: an idle seat with a live
> tab is a process on my machine with no visible owner.**
>
> **When sources contradict each other, REPORT THE CONTRADICTION. Do not resolve it.**
> *Google's own pages disagree about whether OAuth verification is required for an
> identity-only app; that disagreement is the finding and adjudicating it would have
> manufactured false certainty.*
>
> **Settled and not yours to reopen:** the name — **`TMI Trader` / True Move
> Intelligence / *"Intelligence on what's moving."*** — the trademark search, waived;
> and my accepted exposure on the feed licence. **The vendor decision is not due and
> the trigger is undefined — no seat invents one.**
>
> **The rule that separates a fact from a claim, and it is yours:** *a percentage
> describing the MARKET'S behaviour is a fact of record; the same number attached to
> a name, a time and a READER is an outcome.* **Outcome claims are prohibited
> absolutely.**
>
> **Report short — fine points in plain language, not the reasoning behind them — and
> end with `## What I need from you`, nothing after it.** **Take the clock from
> `zoneinfo`; this host runs ahead of the desk.** **Route cross-thread traffic
> through the `Integration` session; I am not a transport.**
