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
  engineering one.** *Ops's reading of the connection fact, `d6ffec3`, and it
  is sharper than the fact as sent: "get a second connection" stops being an
  available remedy for a local desk beside production, a parallel worker, or a
  migration streaming old and new at once.* The published option set, for
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
