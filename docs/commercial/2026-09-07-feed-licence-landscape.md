# The feed-licence landscape — the shape of the decision

**Written by Commercial, 2026-09-07, against `97ef9b1`.** Public documentation
only: published terms, published rate cards, published exchange policies. No
vendor was contacted, nothing was signed up for, no form was submitted, no
pricing page behind a login was opened. **This is the shape of a decision. It is
not a recommendation to sign anything, and it does not choose a vendor.**

The trader's stance, verbatim, which this document serves rather than softens:

> *"i'd also like to plan to deploy without commercial license, but plan for
> it. i dont want to enter into any agreements with no user base. so we build it
> on the personal license and if we get traction then we pursue the commercial
> compliance."*

Every quotation below was read by this seat against the source it names on
2026-09-07. Four research passes gathered the material; every load-bearing line
was then re-read against the primary page or the PDF text. Where a figure comes
only from a research pass and was not re-read, it says so. Prices are USD as the
pages print them; no page names a currency.

---

## 1. WHERE THE LINE IS — the first question, answered

**Every instrument read draws the same line, and it is the same line the
charter guessed at: the licence ends where a person other than the subscriber
sees the data.** Not where money changes hands. Not where a contract is signed.
The published definitions, one per layer:

- **Alpaca, Terms and Conditions:** *"you agree to use the Services and Content
  solely for your own personal and non-commercial purposes. Should you wish to
  use the Services and Content for any other purposes, including without
  limitation commercial usage, or making the Services and Content available to
  others through your own application (a "User Application"), you shall
  provide Alpaca with 30 days advance written notice."*
- **Massive (Polygon), Market Data Terms:** *"you may not use the Market Data to
  build an application intended for use by end users other than you."*
- **Databento, licensing guide:** *"External. Any use of market data that
  involves sharing, disseminating, or making data visible to external parties
  outside the licensed organization or individual."*
- **CTA Plan, fee schedule note 7:** *"The Redistribution Charges apply to any
  entity that makes last sale information or quotation information available to
  any other entity or to any person other than its employees, irrespective of
  the means of transmission or access."*
- **UTP Plan, data policies:** *"External usage is defined as a distribution of
  UTP Information to third-party Subscribers not within the organization."* And:
  *"all non-employee usage is considered fee liable unless otherwise agreed upon
  in advance."*
- **The two exchange agreements Alpaca's paid plan incorporates:** NYSE,
  *"Subscriber shall not furnish Market Data to any other person or entity"*;
  Nasdaq, *"Subscriber may not sell, lease, furnish or otherwise permit or
  provide access to the Information to any other Person."*

**So the charter's question — is a private beta preparation or exposure — has
a published answer, and it is exposure.** None of the definitions turns on
payment or on user count. They turn on employee-versus-non-employee (CTA, UTP),
inside-versus-outside the entity (Nasdaq, Cboe), or subscriber-versus-anyone-else
(Alpaca, Massive, NYSE). The only published construct for a non-paying outside
viewer is the UTP trial-and-demonstration policy, which caps trial devices at
*"the greater of (a) 200 units, or (b) 2% of a Vendor's total reported UTP
population"*, allows them *"not … more than two months in duration"*, and
still requires *"the Subscriber Agreement for all Real-Time External
Subscribers, including trial and demonstration usage."* A beta viewer who sees
the board is an external subscriber on every definition read.

**The second edge, stated plainly because it is load-bearing and it is his
call.** The build phase — development against personal-use data, with him as
the only viewer — is inside every definition of personal use as long as the
only person seeing output is the subscriber. What the published text does *not*
settle is whether an application being built *for sale* is still "personal and
non-commercial purposes" before anyone else sees it. Alpaca's clause is about
purpose; the exchange questionnaires are about status (*"Do you receive Market
Data for your business or any other entity?"*) and registration. No page reads
"purpose" for a trader building his own tool with a future product in mind. That
reading is his to make, and the strategy he has set — build on the personal
licence, comply on traction — makes it. This document does not re-open it. It
records that **the line it depends on is the first external viewer, and that
the line is the same whether that viewer pays or not.**

**RULED 2026-09-08, his words relayed verbatim by Integration:** *"accept
exposure. not going to pay for something i'm not sure is going to be used. my
call. the moment we have something moving, i'll sign up. let's talk about the
risk after we settle the other items."* So the first outside viewer proceeds
without an agreement, by his explicit call; the trigger for signing —
*"something moving"* — exists and is **undefined, deliberately, and no seat is
to invent a threshold for it**; and the risk conversation is **deferred, not
declined**, held by Integration to reopen. The full record is at the top of
[../monetization-gates.md](../monetization-gates.md).

### 1b. THE EXPOSURE, AS THE INSTRUMENTS DESCRIBE IT — what happens, and how anyone would know

*Written 2026-09-08 in answer to his question — "so what's the potential risk,
really? how would they trace it?" — and as the fact base for the risk
conversation he deferred and Integration holds. Contract text only; what it
means for him in practice is a lawyer's question, not this seat's.*

**What the texts name as consequences.** Every quotation is from the
agreements his account is under, read in full.

1. **The switch is Alpaca's, and it needs no reason.** Terms and Conditions:
   *"You agree that, without notice, Alpaca may terminate these Terms and
   Conditions, or suspend your access to the Service or the Content, with or
   without cause at any time and effective immediately."* And: *"Alpaca shall
   not be liable to you or any third party for the termination or suspension
   of the Service or the Content."* **This is the risk that exists whether or
   not anyone ever traces anything:** the product's entire feed is one
   account the counterparty may close at will, every subscriber goes dark at
   the same instant, and the fallback is a rebuild of the market worker on a
   vendor not yet integrated.
2. **The exchanges can act against him directly, and against anyone he
   supplied.** NYSE agreement §3: *"the Authorizing SROs are third-party
   beneficiaries under this Agreement and … may enforce this Agreement, by
   legal proceedings or otherwise, against Subscriber or any person that
   obtains Market Data that is made available pursuant to this Agreement
   other than as this Agreement contemplates."* Nasdaq agreement §10: Nasdaq
   *"may by notice to Distributor unilaterally limit or terminate the right of
   any or all Persons to receive or use the Information and … Distributor
   will immediately comply."*
3. **He can be asked, and must answer.** Nasdaq §1(a): *"A Non-Professional
   or Private Subscriber shall comply promptly with any reasonable request
   from NASDAQ OMX for information regarding the Non-Professional
   Subscriber's receipt, processing, display and redistribution of the
   Information."*
4. **Money, as published.** NYSE's vendor guide: *"If NYSE finds that the
   vendor has incorrectly qualified a professional subscriber as
   nonprofessional, the vendor will be liable for retroactive fees billed by
   NYSE for the subscriber at the professional rate."* The bill lands on
   Alpaca; Alpaca's Customer Agreement §33 has him *"indemnify, defend and
   hold harmless"* Alpaca *"from all Losses that result from: (i) My or My
   agent's misrepresentation or alleged misrepresentation, or act or
   omission."* UTP data policies: *"Failure to comply with the policies may
   result in the charging of penalties, interest and/or the termination of
   service."* At one subscriber the published professional rates are small
   money — $45, $23 and $24 a month against $3 across the three networks —
   and back-billing runs to the three-year record the vendor must keep. What
   an exchange would assess against an individual found redistributing, over
   and above reclassification, is **not published**, and that is the part a
   lawyer prices.
5. **What none of it is.** These are contracts. What they name is
   termination, reclassification with retroactive fees, penalties and
   interest, and enforcement "by legal proceedings or otherwise". Nothing on
   any page read is criminal, and this seat does not opine beyond the text.

**How anyone would know — what is visible and what is not.**

- **Not through the data pipe.** The desk pulls one stream on one account and
  serves every viewer from its own server. Alpaca sees exactly what it sees
  today: one connection, the same wildcard subscriptions, one non-professional
  subscriber. **Viewer count leaves no trace in the feed.** The exchanges see
  only what Alpaca reports, which is that one subscriber.
- **Through the product itself.** The evidence of redistribution is the
  public surface: a site at tmitrader.com showing live prices, a sign-up, a
  payment processor, marketing under the name, screenshots, app listings.
  Domain privacy hides the registrant; the operator of a business that takes
  payments is not hidden. The instruments do not publish how discovery
  happens; what they establish is that once it has happened, the vendor's
  records are auditable for three years and the subscriber must answer
  questions. **So detection is a function of visibility, not of volume:** a
  handful of invited viewers with no marketing has almost no public surface;
  a public launch with search presence, payments and social posts is the
  evidence in full view.
- **Through his own disclosure.** Registering a Connect app, asking Alpaca
  support about the product, or giving the 30-day "User Application" notice
  the Terms ask for — the ruling to accept exposure is, in plain words, a
  decision not to give that notice. Stated so the ruling is honest about what
  it accepts.

**What this gives the deferred conversation, without inventing his
threshold.** The exposure has two parts of different sizes: a **revocation
risk** that exists from the first viewer and is structural — one account,
revocable without cause, no integrated fallback — and a **detection risk**
that scales with publicity rather than with users. *"Something moving"* is
his to define; the fact that bears on it is that the step from a quiet beta
to a public launch is the step that creates the evidence.

---

## 2. THE DESK SIDE, FROM THE CODE

**What the desk consumes from Alpaca** (`lib/market/alpaca/stream.ts`,
`lib/market/alpaca/rest.ts`, `lib/market/config.ts`, `lib/market/credentials.ts`):

| channel | endpoint | symbols | what it is |
| --- | --- | --- | --- |
| websocket | `wss://stream.data.alpaca.markets/v2/sip` | `bars`, `updatedBars`, `statuses` with `*` | whole-market minute bars and halt statuses — the discovery engine's input |
| websocket | same socket | `trades`, `quotes`, `lulds` per symbol | an interest set applied as subscribe/unsubscribe diffs |
| REST | `/v2/stocks/bars?feed=sip` | batches | daily history, ~90 sessions |
| REST | `/v2/stocks/snapshots?feed=sip` | batches | latest trade, quote and bar per symbol |
| REST | trading API `/v2/assets`, `/v2/calendar` | — | universe and session calendar |

- **Exactly one long-lived socket per worker.** `feed` is `'sip' | 'iex'`,
  defaulting to `sip`; an IEX stream URL exists as a fallback.
- **The account is on Algo Trader Plus — his word, 2026-09-07.** Until he said
  so the tier was recorded nowhere in the repo and was inferred from the feed
  setting and Alpaca's plan table; it is now stated rather than inferred.
- **Nothing else in `lib/`, `app/`, `worker/` or `scripts/` calls a market-data
  vendor.** The other inputs are SEC EDGAR, the Google Sheet written by two
  ChatGPT tasks, and OpenAI for interpretation. None of those is market data.

**What each product surface displays, in licence terms**
(`components/DiscoveryBoard.tsx:43-48`, `MomentumTable.tsx:58-65`,
`TickerDrawer.tsx:380-492`, `lib/dashboard/why.ts`):

| surface | real-time tape, as such | derived from tape, single security | derived from tape, volume only or many securities | filings and research |
| --- | --- | --- | --- | --- |
| Discovery board | Price (last) | Move / Gap % | RVOL, Rank, AH volume | Float, Why (grade, age, headline), Risk, Cycle |
| Momentum table | Price, VWAP | Move % | RVOL | Why, Risk, Cycle, priority |
| Ticker drawer | Price, % change, session volume, LULD bands, the high-res trades and quotes stream | — | Daily RVOL, RVOL rank, rank change, float turnover | Structural analysis, supply evidence, warning flags, the Sheet research verbatim |
| Why Not Report | none | none | none | OBJECTION / NO OBJECTION FOUND / NOTHING COLLECTED; severity from `timeToEffect` × basis; `priceCapped` from a filed contract |
| Daily brief (the 22:00 artefact's shape) | none live — a close and after-hours figures, hours old | — | — | catalyst, grade, cycle, float |

**The four columns matter because the exchange policies price them
differently**, and section 5 says how.

---

## 3. THE VENDOR TABLE

"Checked" means this seat re-read the cited page or PDF text on 2026-09-07;
"pass only" means the figure comes from a research pass and was not re-read.

| vendor | what the real-time feed is | personal plan and price | what personal permits | what redistribution requires, and the published price | same API across the two? | checked |
| --- | --- | --- | --- | --- | --- | --- |
| **Alpaca** | CTA + UTP SIP on the paid plan; IEX on the free plan | Basic free (IEX, 30 symbols); **Algo Trader Plus $99/mo** (all US exchanges, unlimited symbols) | *"solely for your own personal and non-commercial purposes"*; support page: *"you cannot redistribute Alpaca API data"* | **No published data-redistribution path.** Broker API only (a brokerage partnership: Standard plans *"real time IEX or 15 mins delayed SIP"*, $0–$2,000/mo on top of unpublished base pricing; real-time SIP for end users via sales). Bring-your-own-feed via Connect/OAuth `data` scope is documented | Broker API and OAuth use the same `data.alpaca.markets` and `stream.data.alpaca.markets` | yes |
| **Massive** (Polygon) | SIP, *"Individual plans are SIP-based end to end"* | Basic $0 (EOD); Starter $29 (15-min delayed); Developer $79 (delayed, trades); **Advanced $199/mo** (real-time, quotes, "Non-pros only") | *"exclusively for your personal, non-business, and non-commercial purposes"*; no app *"intended for use by end users other than you"* | **Stocks Business $2,499/mo** (derived Fair Market Value, real-time minute aggregates, EOD SIP — *"No Exchange Fees or Approvals"*); **+ Full Market $1,999/mo** for real-time SIP trades and quotes, *"Additional exchange fees apply"*, amounts unpublished; exchange agreements are the customer's to sign | Yes — one doc set, per-endpoint plan tables; Business adds a host and the FMV channel | yes |
| **Databento** | Direct exchange feeds, not the SIP; **US Equities Mini** is a derived composite of top-of-book direct feeds | **Standard $199/mo**, monthly, *"Live data · No license fees"*, 1,000 symbols | *"Personal. Market data is used solely for a non-professional individual's own investment decisions … and cannot be shared or leveraged for profit"* | **Plus $1,500/mo plus licence fees**, annual contract, adds *"External distribution"*; Databento acts as vendor of record and passes exchange fees through; Mini carries no exchange licence fees for personal or commercial use | Yes — one client library set; plans add datasets and entitlements | yes |
| **Intrinio** | Individual and Startup tiers: a derived "EquitiesEdge" predicted price; exchange feeds (IEX, Nasdaq Basic, 15-min delayed SIP) at Enterprise only | **Individual $150/mo**, *"No redistribution or display"*, *"1 seat license"* | personal only | **Startup $333/mo → $666 → $999** (quarterly billing), *"Commercial Use and Display Rights"*, on the derived price; **Enterprise $1,250/mo+** for exchange feeds; delayed SIP display adds *"$250/year admin fee plus an additional $250/mo fee if you need to display the data"*; *"Real-time SIP exchange fees typically range from $10,000–$20,000 per month"* | pass only: same SDK with a provider switch | yes |
| **Twelve Data** | default feed is *"approximately 5% of total US trading volume"*, from venues needing no extra licence; full-market by contact | Basic free; Grow $29; Pro $99; **Ultra $329/mo** — *"personal, internal, and non-commercial purposes"* | internal display or non-display | **Venture $499/mo** *"External display data access"*; **Enterprise $1,099/mo** *"External distribution market data"*; a separate Redistribution Rights add-on, unpriced; full-market data by contact | pass only: same API, plan-gated | yes |
| **Tiingo** | IEX only; since 2025-02-01 the full TOPS feed needs *"a market data agreement signed with the IEX Exchange"*, otherwise Tiingo's derived reference price | Free; Power $30/mo; Commercial $50/mo — all *"Internal Use Only"* | *"you may only use the data for your own personal use and you may not display or share the data with another person or organization"* | **EOD + IEX Redistribution $250/mo startups, $500/mo enterprise**, *"Display Redistribution"* | pass only: same firehose on every plan | yes |
| **Tradier** | brokerage consolidated feed, Level 1, real-time only for account holders | brokerage account, API at no extra charge | *"Unless you are a Tradier Partner, Tradier APIs are entitled for personal use only."* | Partner programme; no published terms or price | same brokerage API | yes |
| **Finnhub** | docs title claims "US Full SIP" websocket; pricing page unreadable to the fetcher | plans strictly personal; no verified prices | *"not redistribute or share access to data or derived results … without written approval from Finnhub"*; *"Personal plan can't be used by any business even internally"* | written approval; no published price | — | terms yes, prices no |
| **EODHD** | websocket is Cboe EDGX alone — *"this is not a consolidated (SIP) tape"*; "live" REST is 15-min delayed | €19.99–€99.99/mo personal | personal | Internal Use €399/mo, Enterprise €2,499/mo; external display excluded from Internal Use | same API | stream yes, prices pass only |
| **Interactive Brokers** | exchange subscriptions | not a redistribution vendor | API licence excludes apps sold or given to third parties; dissemination *"strictly prohibited without prior written approval"* | none | — | pass only |
| **Alpha Vantage, Marketstack, Financial Modeling Prep** | Nasdaq-licensed subset; Tiingo-sourced (IEX); unstated | personal tiers $10–$250/mo | personal, non-commercial | contact sales / display agreement; no published price | — | pass only |
| **dxFeed, QuoteMedia, QUODD (Xignite), Barchart, Bloomberg, LSEG, ICE, FactSet, Morningstar** | full SIP and direct feeds, enterprise class | dxFeed sells per-feed entitlements to individuals inside partner platforms (from $19/mo, pass only) | internal only | all redistribution-capable, all sales-quoted, none publishes a price | — | pass only |
| **IEX Cloud** | — | — | — | retired 2024-08-31 (third-party pages; iexcloud.io refuses connections) | — | — |

**Three things the table settles:**

1. **The two published self-serve paths to a real-time consolidated feed with
   display rights are Massive and Databento**, and both are a rebuild of the
   market worker away from Alpaca. Everything else with a published price is
   either a derived or partial feed (Intrinio's predicted price, Twelve Data's 5%
   venue subset, Tiingo's IEX-only, EODHD's single exchange) or a brokerage.
2. **Alpaca publishes no data-vendor path at all.** Its answer to the
   redistribution question is one sentence, and it is no. What it does publish
   is the bring-your-own-feed shape (section 6) and a brokerage partnership
   whose standard tiers are IEX or delayed SIP.
3. **"Same API" is true within every vendor and false across them.** A licence
   change with the vendor you are on is an entitlement change. A vendor change
   is a rebuild of `lib/market/alpaca/` — three files, and by the architecture
   rule nothing above them, since *"the UI depends on types, never on a source."*

Per-vendor detail with the quotations follows in section 4; the exchange layer
every vendor passes through is section 5.

---

## 4. THE THREE VENDORS WITH A PUBLISHED PATH, IN DETAIL

### Alpaca — verified against the primary text

**The instruments an individual account is under.** Three documents, all
public, all read in full:

- *Alpaca Terms and Conditions* (PDF, no date or version printed; file metadata
  2021-08-31). Section "Data Plans": *"Alpaca offers a 'Basic' market data plan,
  which is made available at no cost, as well as a 'Pro' market data plan, that
  is made available on a paid subscription basis."* Selecting 'Pro' means *"you
  agree to: (i) the NASDAQ OMX Global Subscriber Agreement, or AGREEMENT FOR
  MARKET DATA DISPLAY SERVICES, each to the extent applicable."* **No page maps
  'Pro' to the product name Algo Trader Plus; the mapping is inferred.**
- Same document, section "Personal and Non-Commercial Usage" — quoted in full in
  section 1. It is a notice mechanism, not a licence grant: Alpaca *"may
  disallow any connectivity entirely."*
- Same document, section "Content": *"Content is provided exclusively for
  personal and noncommercial access and use. No part of the Service or Content
  may be copied, reproduced, republished, uploaded, posted, publicly displayed,
  encoded, translated, transmitted or distributed in any way … for publication
  or distribution or for any commercial enterprise, without Alpaca's express
  prior written consent."* Content is defined to include market data.
- *Customer Agreement* V26.2026.07, §30 "Use of Market Data": *"AlpacaDB, Inc.
  provides market data to non-professional Alpaca customers."* The terms are
  *"defined within both the NASDAQ OMX Global Subscriber Agreement as well as
  the NYSE Market Data Display Services Agreement, and are incorporated by
  reference."* And: *"I agree not to reproduce, distribute, sell or commercially
  exploit the market data in any manner without written consent from Alpaca."*
- The exchange agreements Alpaca incorporates, linked from
  alpaca.markets/disclosures: NYSE Agreement for Market Data Display Services
  §5, *"Subscriber shall not furnish Market Data to any other person or
  entity"*; Nasdaq Global Subscriber Agreement §1(a), *"For Non-Professional or
  Private Subscriber, the Information is licensed only for personal use."*
- Support article "Can I redistribute Alpaca API data via my platform?" (last
  updated November 2022): *"Unfortunately, you cannot redistribute Alpaca API
  data."*
- Elite page, twice: *"Get free Algo Trader Plus market data subscription on us
  (value of $99/month) - only for personal use."*

**The published plans** (docs.alpaca.markets/us/docs/about-market-data-api;
alpaca.markets/data):

| | Basic | Algo Trader Plus |
| --- | --- | --- |
| price | free | $99/month |
| equities feed | IEX | "All US Stock Exchanges" — the CTA and UTP SIPs |
| websocket symbols | 30 | unlimited |
| REST calls/min | 200 | 10,000 (docs) / "Unlimited" (marketing page) — two numbers, same day |
| historical | latest 15 min excluded | no restriction |

Feeds on the stream: `v2/sip`, `v2/iex`, `v2/delayed_sip` (15-minute delayed
SIP), `v1beta1/boats`, `v1beta1/overnight`. **A delayed SIP feed exists on the
API the desk already speaks.** Nothing on an individual-plan page says it may be
shown to anyone else.

**Connections — and the evidentiary state of the one-connection rule,
corrected 2026-09-07 after Ops checked the logs.** Streaming docs: *"The number
of connections to a single endpoint from a user is limited based on the user's
subscription, but in many subscriptions (or without one) this limit is 1."*
Error 406: *"You already have the number of sessions allowed by your
subscription."* The plan table publishes no connection count for Algo Trader
Plus. Alpaca staff on the public forum, asked on 2021-07-23 whether any plan
allows multiple connections on one account: *"The unlimited plan will allow for
multiple calls, but a single websocket connection"* — Unlimited being the name
Alpaca's data-provider support page still uses for the SIP plan. Staff again,
2022-10-25: *"Only one active real-time connection is allowed now."* Users were
still reporting the limit in February 2025. **No higher individual tier is
published anywhere; the only published plans with more than one stream are the
Broker API partner plans (5–10).**

**What the desk itself holds: nothing.** *Ops, `bb00ad7`:* the production
journal within its retention floor (2026-08-25) contains no 406 and no
"sessions allowed", and the one period with a second consumer beside
production (2026-08-17 to 08-20) predates that floor. **So the desk's
one-SIP-connection rule rests on the published text, two staff statements and
operating lore — and on no observation the desk can still show.** The
experiment that would verify it, starting a second consumer to see whether
production loses its feed, costs the thing it tests. That is a legitimate basis
for designing around the constraint and it is not evidence. An earlier version
of this paragraph read as if the desk's rule and the published text
corroborated each other; they do not, and this document is the strongest link
in that chain.

**The only published shape in which people other than the account holder
receive Alpaca data is the Broker API**, and it is a brokerage partnership
rather than a data licence: plans *"designed for higher-volume, multi-user
platforms"*; Standard (equities included, 1,000 requests/min, 5 stream
connections), StandardPlus3000 ($500/mo), StandardPlus5000 ($1,000/mo),
StandardPlus10000 ($2,000/mo, 10 streams); *"all the standard plans are real
time IEX or 15 mins delayed SIP"*; *"Standard subscription plans will only be
active when integration starts"*; anything else, *"kindly reach out to our
sales team."* Base Broker API pricing is not published. Alpaca's own 2021
webinar recap describes the exchange side: *"In the Free tier, where we're
using real-time IEX data, we do not need to report or classify to the
exchanges."* *"In the case of the premium data coming directly from SIP, we do
need to classify and route users to be classified as Pro/Non-Pro."* *"We have
to direct your users to the exchange for reporting."* Cost: *"Alpaca is bearing
the brunt of that and spreading it across the various partners who are
utilizing it, that way it is subsidized - but not zero."*

**The bring-your-own-feed shape is documented on Alpaca's side.** OAuth scopes
are `account:write`, `trading` and `data` (*"Access to the Data API"*); *"The
OAuth Token can be used to authenticate for Market Data Stream"*; for a Connect
app, *"use the literal string `oauth` as the key and the user's OAuth access
token as the secret."* The per-user limit travels with it: *"Most users can have
only 1 active stream connection. If that connection is used by another 3rd
party application, you will receive an error: 406 and 'connection limit
exceeded' message."* Connect apps are *"published on the Alpaca Connect
Marketplace once they are approved by Alpaca Compliance"*, and *"If you are
building a commercial application that makes money (including ads, in-app
purchases, etc), you must disclose it in the registration form and receive
written approval."* The Connect pages say nothing specific about market data;
the registration form is behind login and was not opened.

**What Alpaca does not publish:** any data-vendor or redistribution licence;
any business or professional market-data plan outside the Broker API (a 2021
forum post from staff promised a "professional market data offering"; none
appears on a current page); a real-time SIP plan for partners' end users (sales
only); the connection count for Algo Trader Plus; whether an OAuth `data`-scope
token inherits the end user's plan entitlement.

### Massive (formerly Polygon.io) — verified against the primary text

**Rebrand, not a new API.** polygon.io/pricing and /terms redirect to
massive.com. The rebrand post (2025-10-30): existing keys remain valid;
api.polygon.io continues "for an extended period."

**Individual plans** (massive.com/pricing, "Save 20% with the annual plan";
every plan marked "Individual use"): Basic $0, end of day, 2 years of history;
Starter $29/mo, 15-minute delayed, websockets, 5 years; Developer $79/mo,
delayed, adds trades, 10 years; **Advanced $199/mo, real-time, adds quotes,
footnote "Non-pros only", 20+ years.** *"Individual plans are SIP-based end to
end."* *"100% of US market volume."* One websocket connection per asset class by
default.

**What personal use permits — Market Data Terms of Service (Last Updated
2025-08-28):** §1 grants *"a nonexclusive, nontransferable, non-sublicensable,
revocable, limited license to use Market Data exclusively for your personal,
non-business, and non-commercial purposes"* and *"you may not use the Market
Data to build an application intended for use by end users other than you."*
§3: *"'Non-Professional' means any natural person who receives market data
solely for their own personal, non-business use and who is not a
Professional"*, with retroactive liability for the professional rate if
reclassified. §4: the UTP Subscriber Agreement and the NYSE Market Data
Agreement are *"deemed to have been executed"* by agreeing to the Terms. §5(c)
prohibits *"Redistribute, display, disseminate, duplicate, license, sublicense,
publish, broadcast, transmit, distribute or otherwise transfer the Market Data
to any third party"*; §5(d) prohibits *"Use Market Data for non-display use or
to create derivative works based on the Market Data unless you are licensed to
do so."*

**Where the line is, in Massive's own words (massive.com/stocks):** *"Individual
plans (Basic → Advanced) are licensed for personal and non-professional use."*
*"For brokerage, redistribution, customer-facing display, or 200+ users, you'll
need a Business plan."* *"Anything your customers can see needs display and
redistribution rights."* Knowledge base: *"Any user who wishes to redistribute
Massive's market data must sign up for one of our business products."*

**Published commercial terms (massive.com/business-stocks):**

| product | price | what it is |
| --- | --- | --- |
| Stocks Business | $2,499/mo | "No Exchange Fees or Approvals", "no exchange reporting requirements"; real-time **Fair Market Value** (a proprietary derived price), real-time minute aggregates, end-of-day SIP trades and quotes, up to three websocket connections |
| + Full Market | $1,999/mo | "Real-time trades and BBO quotes from every US exchange" |
| + Full Market Delayed | $499/mo | "15-minute delayed trades and quotes from every US exchange" |
| + Nasdaq Basic | $1,999/mo | real-time trades and BBO from Nasdaq's four exchanges |
| + IEX Exchange | $499/mo | real-time trades and BBO from IEX |
| Enterprise | custom | exchange feeds tailored to use case |

On every expansion: *"Additional exchange fees apply to these products."*
Amounts are not published. *"Exchange fees apply; we guide you through the
licensing and approval process."*

**What the Business terms put on the customer — Massive for Businesses Terms of
Service (Last Updated 2025-09-02):** §2.2 grants use of the Information
*"solely for its use in websites or software applications owned or licensed by
Customer"*; §6.1(e) forbids redistributing it *"to anyone other than Customer,
its Authorized Users, or its Edge Users"*, where Edge Users are *"individuals
or entities that are users of Customer's products and services"*. §2.5(a):
*"Customer may be required by the applicable Third-Party Provider … to enter
into Third-Party Agreements prior to Customer obtaining … access to that
Third-Party Data"* and *"Customer is solely responsible for accessing,
obtaining, entering into, and complying with all applicable Third-Party
Agreements."* §6.1(j): no derivative works *"unless licensed to do so."* The
document does not mention per-user fees, reporting, audits or "non-display".
**So the exchange agreements are the customer's to sign, and the count and cost
of end users under them is on no Massive page — it is on the exchange
schedules in section 5.**

**Same API.** One documentation set; each endpoint page carries a plan-access
table spanning Individual and Business; same REST base and channel names;
Business adds a business websocket host and the FMV channel. **Going
commercial with Massive is an entitlement change. Moving to Massive from Alpaca
is a rebuild of the market worker.**

### Databento — verified against the rendered pages

**What it sells is not the SIP.** *"Databento's equities data is sourced
directly from each exchange."* The consolidated-tape substitute is **Databento
US Equities Mini**: *"Accurate real-time trades, quotes, and BBO depth. Derived
from our proprietary blend of top-of-book direct feeds"*, and *"Databento has a
derived use license in place with these venues specifically for its
redistribution and in turn our end users are allowed to use and redistribute
the feed without further licensing or exchange fee requirements."* The fee
table lists it as *"Personal and commercial — No license fees."* **Whether Mini
carries off-exchange (TRF) volume, which the SIP does, is not established from
public pages — and volume is what this desk ranks on.**

**Plans, Databento US Equities service (catalog page):** Standard **$199/mo**,
monthly, *"Live data · No license fees"*, 1,000 symbols; Plus **$1,500/mo plus
license fees**, annual contract, adds *"Enhanced live data · External
distribution"*; Unlimited **$4,000/mo plus license fees**, annual. Price change
effective 2026-06-22, *"driven by higher license fees introduced by several
exchanges."*

**The vocabulary, published (docs/portal/live-data):** *"Internal. Any use of
market data within the licensed company or individual user's private
environment."* *"External. Any use of market data that involves sharing,
disseminating, or making data visible to external parties outside the licensed
organization or individual."* *"Personal. Market data is used solely for a
non-professional individual's own investment decisions, research, or
educational purposes and cannot be shared or leveraged for profit."*
*"Commercial. Market data is used within a company, by a professional
individual, or in applications that generate profit, serve clients, or support
business operations."* Distribution: *"Market data is shared or distributed to
external users, e.g., raw data feeds on a white-labeled API or displaying
real-time quotes on a customer-facing web app."* Real-time distribution is
*"typically within 10 minutes of receipt"*; delayed is *"at least 10 minutes
after receipt and before the end of the trading session."*

**What redistribution requires, published:** *"Most commercial users without an
existing license will need to apply for a direct license agreement with the
venue"*; Databento submits *"a data feed request (DFR) to the venue on your
behalf"* and then *"operate[s] as a vendor of record (VoR) and report[s] your
devices under our license agreement."* *"License fees are assessed by the venue
and are typically charged per user or device each month. If you're licensed
through Databento, fees are passed through without an upcharge"* plus 2.9% card
processing. The 2026 table, the rows that matter for a display product:

| dataset | who | monthly licence fees |
| --- | --- | --- |
| Databento US Equities Mini | personal and commercial | none |
| Nasdaq Basic with NLS Plus | commercial only | $1,680/firm + $14.10/user (display or non-display); distribution $2,140 + $0.50/personal user or $14.10/commercial user |
| Nasdaq TotalView-ITCH | commercial only | $1,690/firm + $84/user; distribution $4,230 + $15/personal user or $84/commercial user |

**Same API** across tiers: one client library set; plans add datasets, symbols
and the external-distribution entitlement, not endpoints. **Moving to Databento
from Alpaca is a rebuild of the market worker and a change of feed semantics:
direct feeds and a derived composite rather than the consolidated tape.**

**Not published:** the User Agreement and Third-Party Data Terms (behind
signup); whether Mini's external redistribution needs the Plus tier or is
available on Standard; Mini's off-exchange coverage.

---

## 5. THE EXCHANGE LAYER — what every vendor passes through

A vendor's price is the top of the bill. Underneath it sit the exchange plans'
own schedules, which a redistributor pays directly or through a vendor of
record. **Two plans cover the consolidated tape today** — CTA (Networks A and
B: NYSE-, NYSE American- and regional-listed) and UTP (Network C:
Nasdaq-listed) — **and a single CT Plan replaces both on 2027-04-01.** Every
figure here was read from the plan's own schedule or policy.

### What a redistributor signs

- **CTA:** the NYSE Vendor Agreement, Exhibit A (a data-feed questionnaire:
  *"All customers and vendors who wish to receive market data via an
  uncontrolled data feed are required to complete and submit this Exhibit
  A"*), approved display screens, and NYSE's prior written approval of any
  *"non-trivial variation"* in receipt, use or display. Every external
  non-professional signs or clicks the NYSE subscriber agreement before real-time
  access.
- **UTP:** the Vendor Agreement plus a Data Feed Request, a *"Vendor's System
  Description"* approved by Nasdaq, a Non-Display Declaration and a list of
  affiliates; use is authorised *"only for the purposes of providing the
  Information as described in Vendor's System Description."* Subscriber
  agreements for external real-time users, administered by the vendor or
  indemnified by it.
- **Both:** per-subscriber reporting monthly (UTP within 15 days of month end;
  CTA by the second-to-last business day), entitlement records kept three years,
  audit rights, and retroactive liability if a professional was qualified as a
  non-professional.

### What it costs per viewer and per firm (monthly)

| line | CTA Network A | CTA Network B | UTP Network C |
| --- | --- | --- | --- |
| non-professional subscriber, real-time display | $1.00 | $1.00 | $1.00 |
| professional subscriber, real-time display | $45 (1–2 devices), $27 (3–999), $23, $19 | $23 | $24 |
| redistribution to anyone outside the firm | $1,000 | $1,000 | $1,000 external real-time redistributor |
| access to the feed | direct $1,250 / $1,750, indirect $750 / $1,250 (last sale / quotes) | direct $750 / $1,250, indirect $400 / $600 | direct $2,500, indirect $500 |
| non-display use, per category | $2,000 / $2,000 | $1,000 / $1,000 | $3,500 per system |
| delayed (15 min) display | display unit fees *"do not apply"*; access fees still do | same | *"Not Fee Liable"*; external delayed redistributor $250 |
| end of day | — | — | *"Not Fee Liable"* |

**So the per-viewer cost of a real-time consolidated display is $3 a month for
a non-professional across the three networks today**, and the firm-level floor
for a small redistributor is the redistribution and access lines, roughly
$4,000–$6,000 a month before a vendor's own price. Intrinio's published range
for real-time SIP exchange fees, *"$10,000–$20,000 per month"*, is the one
vendor-published all-in figure and sits above that floor.

**The non-professional definition is the same on both plans:** *"any natural
person who receives market data solely for his/her personal, non-business use
and who is not a 'Securities Professional'"* — not registered with the SEC,
CFTC, a state or an exchange, not an investment adviser, not a bank employee in
a registrable function. A day trader managing their own money qualifies. The
vendor qualifies each one and is liable if wrong.

### The two carve-outs that change the arithmetic for THIS product

**Delayed data.** CTA: the delay is 15 minutes; *"display unit fees do not
apply in respect of a Delayed Information interrogation or ticker display
service"*; subscribers of delayed displays sign no NYSE agreement; the vendor
still holds the Vendor Agreement and still pays access fees; every delayed
display must *"conspicuously"* say so — *"Prices Delayed 15 Minutes"* is
acceptable wording. UTP: *"there is no charge for UTP Delayed Information
distributed on Controlled Products, if delayed for the appropriate timeframe"*;
delayed subscribers are *"Not Fee Liable"*; the external delayed redistributor
fee is $250 a month; end-of-day is not fee liable at all.

**Derived data.** UTP publishes the test and CTA does not (no derived-data
policy is listed on ctaplan.com; the 2027 filing says Tapes A and B carry no
single-security derived-data fee liability today). UTP's test: derived data
*"cannot be reverse engineered to recreate the Information"* and cannot be a
*"reasonable facsimile"* of it. Three classes:

1. **Single security, containing price — FEE LIABLE** *"at the underlying
   product rates."* Move %, VWAP, a price change from a reference close.
2. **Multiple security — NOT FEE LIABLE.** Portfolio valuations, indexes.
3. **Real-time volume only — NOT FEE LIABLE.** *"Derived Real-Time Volume Data
   that is based on a single security is also not fee liable."* RVOL is a ratio
   of volumes. A rank built from RVOL contains no price.

*"Distribution of non-fee liable Derived Data does not require the Recipient to
sign the applicable Agreements"* — the viewer signs nothing — *"but note, if a
Vendor opts not to administer a Subscriber Agreement, then Vendor is required
to indemnify in the event of a Claim."* And the non-display schedule *"does not
apply"* where feed data is used *"to create derived data and use the derived
data for the purposes of solely displaying the derived data"*, though *"the
data may be fee liable under other line items."*

**Read together with the surface table in section 2:** the board's RVOL and
rank columns are in the not-fee-liable class under UTP's published text; its
Price, Move % and VWAP columns are not. **A board that shows rank and RVOL and
withholds price is a different licensing object from the board that exists
today** — under the exchange schedules. It is *not* a different object under
Alpaca's individual terms, which forbid display to others of anything, derived
or not, and forbid derivative works on Massive's individual terms too. **The
derived-data carve-out is a fee fact exercised through a vendor agreement. It
is not a licence an individual subscriber holds.**

### The other feeds a display product can sit on, and their published price lists

| feed | what it is | per non-pro viewer | per pro viewer | firm-level lines |
| --- | --- | --- | --- | --- |
| **Nasdaq Basic** (2025 price list) | Nasdaq's own BBO and last sale for all US-listed issues, not the consolidated tape | $1 (all issues) | $27.30 | internal distributor $1,600; external distributor $2,080; non-professional derived-data licence $1,500; hosted display solution $400 |
| **Cboe One Summary** (price list v2026-07-30) | Cboe's four exchanges, *"within 1% away from the NBBO 97.77% of the time"* | $0.25 | $10 | internal $1,500; external $5,000; *"User Fees apply to External Distribution only"* |
| **IEX TOPS** (fee schedule effective 2026-09-01) | IEX alone, roughly 2–3% of volume by Intrinio's figure | none | none | real-time TOPS $500/mo flat, rising to *"$1,000 per month"* on 2026-10-01 per SEC release 34-105989, which also states IEX is *"not proposing to adopt additional fees, such as external distribution fees, non-display fees, or user fees for the TOPS data feed"*; **delayed TOPS free with no agreement**; derived data may be distributed externally *"free of charge and without such non-Affiliate entities having to enter into an IEX Data Subscriber Agreement"*; written IEX approval before real-time reaches any external subscriber |

These are what Massive's expansions ($1,999 Nasdaq Basic, $499 IEX) and
Databento's licence-fee rows resell.

### April 2027 changes the sums, and the definitions

The CT Plan fee schedule was approved by the SEC on 2026-06-26 and takes effect
with the transition: submission deadline **2027-03-01**, new plan effective
**2027-04-01**; *"This is a change to the Plan, its Policies, its Agreements
and its Fee Schedule -- not to the data feeds."* Account migration begins
2026-09-01. What changes for a display product:

- **Professional versus non-professional becomes a test of USE, not status.**
  Professional use includes *"use of market data by an individual to provide a
  service to a third party for compensation."* Everything else is
  non-professional, with a *"good faith"* safe harbour for redistributors
  relying on user representations.
- **Non-professional display drops to $0.90 per viewer per tape** for the first
  2,000, $0.75 to 50,000, then $0.60, $0.40 and $0.25. Professional display
  flattens to $26 (A), $23 (B), $24 (C).
- **Derived data flips.** *"single-security derived data is no longer fee
  liable"* for display — but *"the creation of Derived Data will now be fee
  liable"* as non-display use, at $2,315 (A), $1,155 (B) and $2,025 (C) per
  category. The analysis-only shape gets cheaper to show and acquires a fee to
  compute.
- Real-time redistributor becomes $1,155 per tape; Tape C's delayed
  redistributor and delayed access fees are eliminated.

**Any agreement signed before March 2027 is signed under a schedule that is
about to be replaced.** That is a sequencing fact, not advice.

### Timelines the plans publish

UTP: *"Please allow a minimum of one week for the review of your submission"*;
uncontrolled-product requests aged 60+ days may be removed from the queue.
CTA/NYSE: requests cancelled if documentation is not received within 45 days;
approvals void if unreported within 90 (devices) or 180 (feeds) days; no
review-time commitment published. Databento's own guidance for a direct venue
licence: *"can take months to complete"*, start *"3-6 months in advance"*
(from its 2023 licensing FAQ, read by a research pass).

---

## 6. THE SHAPES, RE-COSTED

Gate 0 named three. The published material adds a fourth, and re-orders them by
what the first external viewer sees.

| shape | what the viewer sees | licensing object | published entry cost, monthly, before exchange per-user fees | who publishes a path | what changes in the integration | what it does NOT solve |
| --- | --- | --- | --- | --- | --- | --- |
| **A. Full desk, real-time** | the board as it is: price, move, VWAP, RVOL, rank, drawer | external real-time redistribution of consolidated data | Massive Business + Full Market **$4,498** plus exchange fees (redistribution ~$3,000 across three networks, access fees, $3 per non-pro viewer); Databento Plus **$1,500 plus fees**, annual, on non-SIP feeds; Alpaca: **no published path** except a brokerage partnership at sales pricing | Massive, Databento; every enterprise vendor by quote | rebuild of the market worker for any vendor but Alpaca; subscriber qualification, click-through agreements, monthly reporting, three-year records | nothing — this is the whole bill, and it is signed before the first viewer exists |
| **B. Delayed desk** | the same board, prices 15 minutes old, labelled | delayed redistribution | Massive Business + Full Market Delayed **$2,998** plus access fees and nothing per viewer; Alpaca's `delayed_sip` exists on the API but is published only for Broker API partners; UTP external delayed redistributor $250 | Massive; Alpaca for brokerage partners only | same rebuild for Massive; on Alpaca the feed name changes and nothing else — but the individual terms still forbid the display | the product: a premarket momentum board that is 15 minutes late has lost the window it exists for. The daily brief, by contrast, is already this shape |
| **C. Analysis only** | rank, RVOL, catalyst, float, structure, cycle, the Why Not Report — **no price, no quote, no VWAP, no move %** | under UTP today: not-fee-liable derived data (volume-only, multi-security) plus filings facts that are nobody's market data; under CTA: unpublished; from April 2027: creation of derived data fee-liable as non-display | a vendor agreement is still required for whoever computes it; viewer fees near zero; **Databento Mini at $199 and Massive FMV at $2,499 are vendor-held derived-price licences** that let a price be shown without the tape, if a derived price is acceptable | UTP publishes the test; Databento and Massive publish derived products; Alpaca publishes nothing on a subscriber's derived output | none on the feed; **removal of four columns and the drawer's live section** — a product decision, not an integration one | Alpaca's individual terms: derived or not, the desk's output is *"Content"* under a personal, non-commercial licence, so the computing account still needs a non-individual footing. **And a derived price without a live bid and ask costs the board its flat verdict and its NEW HIGH override** — see [2026-09-07-which-price.md](2026-09-07-which-price.md) |
| **D. Bring your own feed** | each user sees their own prices from their own Alpaca subscription through the app | each user is the subscriber of what they see; the app is a Connect application | **$0 in data cost to the product**; each user pays Alpaca $0 (IEX, 30 symbols) or $99 (SIP); Connect approval for a commercial app | **Alpaca, and only Alpaca, publishes this** (OAuth `data` scope, token on the stream, Compliance approval) | inversion of the worker: one socket per user, each holding that user's one allowed connection; **whole-market discovery needs the wildcard `bars` subscription, which Basic caps at 30 symbols** — so discovery per user needs the $99 plan per user | **the board.** Rank and RVOL are computed from one whole-market stream and shown to everyone; under Gate 2's "same board" that stream is the trader's own subscription reaching N users. BYO feed licenses the drawer and the price columns; it does not license the discovery layer |

**Two observations that fall out of the table rather than being argued into
it:**

1. **Shapes C and D combine, and the combination is the only one with no
   published exchange bill.** A same-board product of rank, RVOL, catalysts and
   filings facts, with each user's own Alpaca token filling in prices and
   quotes for the names they open. What remains unlicensed in that combination
   is the account that computes the board — which is the Alpaca clause in
   section 1, and which is the thing the trader's strategy defers to traction.
2. **Shape A is the only one where the arithmetic is dominated by the exchange
   layer rather than the vendor**, and it is the shape Gate 2's "same board"
   points at. The vendor prices are visible; the exchange bill is a signed
   agreement, monthly reporting and per-viewer fees whose definitions change on
   2027-04-01.

---

## 7. WHAT CHANGES IN THE INTEGRATION — the rebuild question, answered per vendor

| move | code change | what else changes |
| --- | --- | --- |
| Alpaca individual → Alpaca Broker API | none in endpoints; credentials and rate limits | a brokerage business: end users hold Alpaca accounts under the partner; Pro/Non-Pro classification and exchange reporting; sales-priced |
| Alpaca individual → Alpaca Connect (BYO feed) | OAuth flow; per-user sockets; the worker no longer owns the only connection | Compliance approval; the discovery layer still runs on one subscription |
| Alpaca → Massive | rebuild `stream.ts`, `rest.ts`, `messages.ts`: different message schema, channel names, REST shapes, pagination, snapshot endpoint | one to three websocket connections; SIP semantics preserved |
| Alpaca → Databento | same rebuild, plus a different data model (DBN schemas, MBP-1/TBBO/OHLCV rather than trade/quote/bar JSON) | feed semantics change: direct feeds and a derived composite; off-exchange volume coverage to be established |
| Massive individual → Massive Business | none; a second host and an FMV channel | exchange agreements in the customer's name |
| Databento Standard → Plus | none | annual contract; licence fees pass through; Databento as vendor of record |

**The architecture rule holds the blast radius to `lib/market/alpaca/`.**
`ARCHITECTURE.md`: *"The UI depends on types, never on a source."* The demand
engine, RVOL, board, session and store read `lib/market/types.ts`, not payloads.
A vendor rebuild is three files and a worker entry point, and every test above
them. It is still a rebuild, and Research owns the code.

---

## 8. THE SHAPE OF THE DECISION

Ordered the way the gates map is ordered — by what each answer would waste.

1. **The unit sold decides the licensing object, and the licensing object
   decides the vendor set.** Gate 1's three candidates land in three different
   rows of section 6: the board is shape A (or C, if it gives up its price
   columns); the Why Not Report is shape C with no tape in it at all; the daily
   brief is end-of-day, *"Not Fee Liable"* under UTP and free of display-unit
   fees under CTA, and needs only a vendor agreement for whoever produces it.
   **Nothing in the licensing landscape has to be decided before Gate 1 is.**

2. **"Maybe Alpaca isn't the answer" resolves into two answers.** Alpaca *is*
   the published answer for the build (personal use, the feed the desk already
   speaks, one connection) and for shape D (the only vendor that documents a
   third-party app pulling data on the user's own token). Alpaca is *not* a
   published answer for any shape in which one subscription's data reaches
   another person: its only multi-user product is a brokerage partnership, and
   its only redistribution statement is no. **Alpaca does not need to be left to
   build; it cannot be kept, on published terms, to launch shapes A, B or C.**

3. **Vendor cost is not the bill for shapes A and B.** The vendors with a
   published path are $2,500–$4,500 a month; the exchange layer beneath them is
   an agreement, an approved system description, monthly reporting and
   per-viewer fees. The one vendor-published all-in figure for real-time SIP is
   *"$10,000–$20,000 per month."* The 2027 CT Plan changes the per-viewer rate,
   the professional test and the derived-data rule, and account migration starts
   this month.

4. **The first external viewer is the licensing event, on every published
   definition, paid or not.** The strategy — build personal, comply on traction —
   is coherent up to that viewer and needs a named decision at it: whether the
   first outsider sees prices (shape A or B), derived facts only (shape C), or
   their own feed (shape D). That decision is a product decision, and it routes
   through Integration.

5. **No approach is made by this seat.** Every number here is from a page anyone
   can read. Whether to ask Massive what its exchange fees are, whether to
   register a Connect app, whether to open Alpaca's Broker API conversation — an
   enquiry is an approach, and an approach is the trader's.

---

## 9. WHAT COULD NOT BE ESTABLISHED FROM PUBLIC PAGES

- **Alpaca:** the connection count for Algo Trader Plus as a published number
  (docs: "in many subscriptions … 1"; staff, 2021: a single websocket
  connection on the paid plan; no higher individual tier published anywhere —
  searched 2026-09-07, closed as far as public pages go); **whether a second
  brokerage account in the same name, carrying its own subscription, is
  permitted** — no page states a rule either way, the Customer Agreement's
  "Multiple Accounts" clause (§12a) governs only the securities-versus-crypto
  pairing, the IRA support page sets no limit on IRA accounts, and a 2021 staff
  reply treated a user's two accounts as a support matter rather than a
  breach; third-party blogs assert "one live account per person" and are not
  Alpaca's voice — **resolvable only by asking Alpaca, which is an approach;** whether an OAuth `data`-scope token inherits the user's
  plan; whether a Connect app that only displays data needs Compliance approval;
  the Connect registration form's fields; Broker API base pricing and whether
  real-time SIP is offered to partners' end users at all; any date or version
  on the Terms and Conditions; the mapping of 'Pro' to Algo Trader Plus.
- **Massive:** exchange-fee amounts for any expansion; whether Massive is
  vendor of record for Business customers; whether displaying FMV requires any
  exchange agreement (marketing says no; the Business terms leave Third-Party
  Agreements open); where "200+ users" comes from.
- **Databento:** the User Agreement and Third-Party Data Terms; whether Mini's
  external redistribution needs Plus; Mini's off-exchange coverage; the
  current fee table against the June 2026 exchange increases.
- **Exchanges:** a CTA derived-data policy (none listed); current CTA enterprise
  maxima; a 2026 Nasdaq Basic price list (the 2025 list is the latest found);
  Cboe One's delayed or derived terms; any approval-time commitment from
  CTA/NYSE or IEX; the text of the new CT Plan agreements at
  consolidatedtape.com (renders only a header).
- **Every other vendor:** Finnhub's current prices and which plan carries the
  "Full SIP" websocket; Financial Modeling Prep's feed source and display
  agreement (site returns 403); dxFeed's retail price list and whether an
  individual can buy raw API access; Twelve Data's redistribution add-on price
  and full-market price; Tiingo's IEX-agreement mechanics; Interactive Brokers'
  fee pages (403).

---

## 10. SOURCES

Alpaca: alpaca.markets/data · docs.alpaca.markets/us/docs/about-market-data-api
· docs.alpaca.markets/us/docs/real-time-stock-pricing-data ·
docs.alpaca.markets/us/docs/streaming-market-data ·
docs.alpaca.markets/us/docs/using-oauth2-and-trading-api ·
docs.alpaca.markets/us/docs/about-connect-api ·
docs.alpaca.markets/us/docs/broker-api-faq · alpaca.markets/disclosures ·
files.alpaca.markets/disclosures/library/TermsAndConditions.pdf ·
files.alpaca.markets/disclosures/library/AcctAppMarginAndCustAgmt.pdf ·
files.alpaca.markets/disclosures/library/NASDAQ+OMX+Global+Subscriber+Agreement.pdf
· files.alpaca.markets/disclosures/library/NYSE+Market+Data+Display+Services+Agreement.pdf
· alpaca.markets/support/redistribute-alpaca-api ·
alpaca.markets/support/data-provider-alpaca · alpaca.markets/elite ·
alpaca.markets/learn/getting-started-broker-api-webinar-recap.

Massive: massive.com/pricing · massive.com/business-stocks · massive.com/stocks
· massive.com/legal/market-data-terms-of-service ·
massive.com/legal/individuals-terms-of-service ·
massive.com/legal/businesses-terms-of-service ·
massive.com/knowledge-base/article/how-can-i-redistribute-massives-market-data ·
massive.com/blog/polygon-is-now-massive.

Databento: databento.com/catalog/us-equities · databento.com/pricing ·
databento.com/equities · databento.com/docs/portal/live-data ·
databento.com/blog/updates-to-subscription-pricing ·
databento.com/blog/introduction-market-data-licensing.

Others: intrinio.com/pricing ·
intrinio.com/financial-market-data/stock-prices-delayed-sip · about.intrinio.com/terms
· twelvedata.com/pricing · twelvedata.com/pricing-business ·
support.twelvedata.com/en/articles/9935903-us-equities-market-data ·
tiingo.com/products/iex-api · tiingo.com/documentation/iex ·
tiingo.com/about/pricing · docs.tradier.com/docs/faq · finnhub.io/terms-of-service ·
eodhd.com/financial-apis/new-real-time-data-api-websockets ·
eodhd.com/commercial-pricing · interactivebrokers.github.io ·
alphavantage.co/realtime_data_policy · marketstack.com/product ·
dxfeed.com/general-terms-and-conditions-for-services.

Exchanges: ctaplan.com/pricing · nyse.com/publicdocs/ctaplan/Schedule_of_Market_Data_Charges.pdf
· ctaplan.com/publicdocs/ctaplan/notifications/trader-update/Policy - Delayed Market Data.pdf
· ctaplan.com/publicdocs/ctaplan/Policy_Non-Professional_Subscribers_CTA.pdf ·
nyse.com/publicdocs/nyse/data/NYSE_Vendor_Agreement_CTCQ.pdf ·
ctaplan.com/publicdocs/ctaplan/Exhibit_A_CTA_Internal_and_External_Distribution.pdf
· utpplan.com/DOC/datapolicies.pdf · utpplan.com/DOC/VendorAgreement.pdf ·
utpplan.com/DOC/subagreement.pdf ·
nasdaqtrader.com/content/ProductsServices/PriceList/Nasdaq_US_Equities_Price_List_2025.pdf
· cdn.cboe.com/resources/membership/US_Market_Data_Product_Price_List.pdf ·
iex.io/resources/trading/fee-schedule · sec.gov/files/rules/sro/iex/2025/34-103237.pdf
· sec.gov/files/rules/sro/iex/2026/34-105989.pdf ·
sec.gov/files/rules/sro/nms/2026/34-105125.pdf ·
thectplanllc.com/wp-content/uploads/Order-Approving-CT-Plan-Fee-Schedule-06.26.26.pdf
· fisd.net/wp-content/uploads/2026/08/CTA-and-UTP-Alert-Aug-2026.pdf.
