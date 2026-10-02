# Short interest: where it comes from, what it costs, can we show it

**Written by Commercial, 2026-10-02, against his question to Integration (22nd
seat, verified at his own turn, 2026-10-02T11:54:59Z): *"i want to do some
research around short interest. wonderin if we should include it. where could
we get it from. how is it derived. is there any free source (does alpaca
have?)."*** Public sources only: vendor docs and terms, FINRA's own
publication pages, all re-read at source 2026-10-02. No vendor contacted, no
account created, nothing signed up for. Research is sizing the product side
(whether it's useful, where it would render) separately; this document is
vendors, licensing, cost only.

---

## 1. How it's derived, and the one distinction that matters most

**Two different FINRA numbers get called "short interest" loosely, and they
answer different questions: this is the first thing to get right, because a
vendor or a news source conflating them will mislead.**

- **Short interest (the real thing).** FINRA Rule 4560 requires every FINRA
  member firm to report its short positions in every equity security to
  FINRA **twice a month**: settlement on the 15th and on the last trading
  day of the month. FINRA compiles the reports and publishes them on the
  **7th business day after the reporting settlement date.** So a number
  published today reflects positions held roughly two to three weeks ago, not
  now. This is **the only "short interest" in the regulatory sense**: total
  shares sold short and not yet covered, as of one of two snapshot dates a
  month, lagged by design.
- **Short sale volume (a different, faster, narrower number).** FINRA
  separately publishes **daily** aggregated short-sale volume, but **only for
  trades executed off-exchange** (reported to a Trade Reporting Facility, the
  Alternative Display Facility, or the OTC Reporting Facility): **not**
  exchange-listed trades, and not consolidated across venues. FINRA's own
  page states this distinction explicitly rather than leaving it to be
  inferred: *"The Short Sale Files do not (and are not intended to) equate
  to bi-monthly reported short interest position information."* Short volume
  is a same-day proxy for selling pressure; it is not a position count and
  cannot be used as one.

**Neither number is computed by a market-data vendor from raw trades.** Both
originate as regulatory filings from broker-dealers to FINRA. Every vendor
below (Massive, Ortex, Fintel, S3) is reselling or re-presenting FINRA's own
published numbers, not deriving an independent figure: the "derivation"
question has one answer regardless of which vendor it's bought from.

**Nasdaq and NYSE do not publish a competing or independent short-interest
number.** FINRA's own page states it publishes short interest *"for all
exchange-listed and over-the-counter (OTC) equity securities"*: one
aggregator, not an exchange-by-exchange reporting scheme. If Nasdaq's or
NYSE's own sites display a short-interest figure, it is FINRA's number
re-rendered, not a second source. **Not verified directly: whether either
exchange's own display page carries republication terms different from
FINRA's** (their JS-rendered market-activity pages didn't resolve to readable
text in this read): labelled as unread, not characterised either way.

---

## 2. Does Alpaca have it? No. What it has instead is a different thing entirely

**Checked `docs.alpaca.markets` directly, both the Market Data API and the
Trading API's margin/short-selling pages.** Alpaca's API exposes nothing
called short interest or short sale volume anywhere in its documented
endpoints (Historical Stock Data, Real-time Stock Data, Historical/Real-time
News: none of them carry it).

**What Alpaca does have answers a related but different question (can I borrow this stock, not how many shares are already sold short):**

- **`GET /v2/assets/{symbol}`** returns `shortable` (boolean) and
  `borrow_status` (`easy_to_borrow` / `hard_to_borrow`) for a security.
- **`GET /v1/locates/quotes`** returns, for hard-to-borrow names,
  `available_qty` (shares available to borrow right now) and `price` (the
  borrow fee per share), live.
- **`GET /v1/locates`** tracks locate requests placed.

**This is borrow supply and cost, a real-time, forward-looking signal of how
scarce shares are to short right now**: closer in spirit to what Ortex calls
"utilization" and "availability" than to FINRA's bi-monthly position count.
It is already included with the trading account (no separate subscription),
but **it is not short interest and should not be presented as it**: a
reader seeing "hard to borrow, 86% availability" and a reader seeing "9.3% of
float sold short as of Sept. 29" are being told two different kinds of fact,
and conflating them would be exactly the kind of claim this desk's own
standing rules already bar (a number presented as more measured than it is).

---

## 3. The free official source (FINRA) and the licence question that actually governs it

**Both numbers (short interest and short sale volume) are free to read**,
via FINRA's interactive grid (short interest: 5 rolling years; short volume:
365 days), downloadable historical files, and a Query API for programmatic
access. **Free is not the same as usable in a paid product**, and this is
the single most load-bearing fact in this document.

**FINRA's own catalogue page states the licence in one line: *"Data is free
for non-commercial use. See Terms of Use."*** Read at source
(`finra.org/terms-of-use`, last modified 2023-11-09), the governing terms are
stricter than the one line suggests:

> *"the content and material provided through the FINRA Website shall be used
> ONLY for your own non-commercial personal or professional use."*

**And one restriction goes further than the personal/non-commercial line this
desk has already mapped for every other vendor: it names software and
algorithmic use specifically, not just redistribution:**

> *"In no case may you ... use any portion of the FINRA Website in the
> development of any software program or in conjunction with any machine
> learning, neural network, deep learning, predictive analytics or other
> artificial intelligence computer or software program, including, without
> limitation, by using any portion of the FINRA Website in conjunction with
> a model, algorithm, or process that is designed to predict trades for or
> within an individual portfolio, fund, or other investment vehicle."*

**Named plainly because it changes the shape of the question:** every other
vendor on this desk's licence map restricts *display to other people*. This
clause restricts *use in software at all*, for a purpose this desk's own
board (a ranking and research process) reads as squarely inside. A direct
FINRA pull, free or not, is **not a clean path for this product even before
asking whether it may be shown to a paying subscriber.** The Query API's own
developer terms were not separately located in this read (the developer
portal's documentation pages returned not-found): if a path exists there
that differs from the website terms above, it is unconfirmed, not ruled out.

---

## 4. The paid vendor that matters most, because it is already on this desk's own licence map

**Checked Massive (`massive.com`, formerly Polygon: the vendor this desk's
feed-licence landscape already names as a live candidate for the real-time
tape question) for a short-interest product, expecting to have to look
elsewhere. It already has one, and it is cheaper than expected.**

Massive's REST API carries two fundamentals endpoints, both FINRA-sourced,
both documented at source 2026-10-02:

| endpoint | what it returns | cadence | history | plan access |
| --- | --- | --- | --- | --- |
| `/stocks/v1/short-interest` | shares sold short, days-to-cover, settlement date | every 2 weeks | back to 2017-12-29 (paid); 2 years (free) | **included in every Stocks plan, including the free Basic tier** |
| `/stocks/v1/short-volume` | daily aggregated short-sale volume by venue, short-volume ratio | daily | back to 2024-02-06 | **included in every Stocks plan, including the free Basic tier** |

**Both ride on the same plans this desk has already priced for the live
tape**: Basic (free), Starter ($29/mo), Developer ($79/mo), Advanced
($199/mo). **No separate short-interest subscription exists or is needed.**

**The licence question is the same one this desk has already answered for
everything else on Massive, not a new one.** Massive's own terms page states
the structure directly: a product labelled for *"Individual Use"* carries
the personal/non-business terms; a product labelled for *"Business Use"*
carries the commercial terms. The short-interest and short-volume endpoints
above are listed under **Individual Plans** on Massive's own pricing table: so they are bound by the same personal, non-commercial restriction already
mapped for Massive's market data generally (`2026-09-07-feed-licence-
landscape.md` §4). **The practical consequence is good news, not a new
cost:** if this desk ever moves to Massive Business ($2,499/mo, already
priced for the live-tape question) for the reasons already on file, short
interest and short volume come along inside that same plan at no additional
charge: this is not a line item that adds to the vendor decision, it rides
whatever that decision already costs.

**Not independently verified: whether Massive's Business-tier terms name
Fundamentals data (short interest/volume) the same way they name the real-
time tick data**, i.e. whether a Business subscriber's display rights
extend to these endpoints without a separate carve-out. The pricing table's
own "Business Plans" column exists and presumably covers it, but the actual
Business terms document was not re-read line by line for this specific
endpoint in this session: labelled as a reasonable inference from the
plan structure, not a re-read fact.

---

## 5. Other vendors: checked, could not read terms or pricing at source

**Named rather than silently dropped, per this seat's own standing rule that
an unread vendor is labelled unread, not characterised:**

- **Ortex** (superseded by §9.2, which reads its plans and terms): widely cited for short-interest/utilization dashboards and an
  API. `ortex.com/pricing` and `ortex.com/api` both redirected to
  `public.ortex.com`, a live news/signal terminal, not a pricing or terms
  page. **Pricing, API terms and redistribution rights: unread.**
- **Fintel**: `fintel.io/pricing` returned a bot-detection interstitial
  ("Browser Check") rather than content. **Unread.**
- **S3 Partners**: the institutional-grade short-interest desk (its data is
  what much financial media cites). `s3partners.com` failed to resolve in
  this read. **Unread; S3's products are institutional-sales-priced from
  general knowledge of the space, not from anything read at source today: this is background, not a sourced claim, and should not be repeated as
  one.**

**None of these is needed to answer the question that matters.** Massive
already has the data, already at a price point this desk has priced before,
under terms this desk has already mapped. These three would only matter if
Massive's coverage or terms turn out to be insufficient: not established
here.

---

## 6. Recommendation

**If the product side wants short interest and short-sale volume at all,
the vendor question is close to already answered by this desk's own existing
work, not a fresh search.** Three findings, in the order that matters:

1. **Alpaca does not have it.** What it has (borrow status, locate pricing) is
   a different, faster, more actionable signal for a different question
   ("can I borrow this right now, and what does it cost") and is already
   free on the account: worth having Research look at on its own merits,
   but it is not a substitute for short interest and should never be
   labelled as one.
2. **The free FINRA source is not a clean build path**, not primarily because
   of cost but because its terms bar use "in conjunction with" software,
   algorithms or AI: a restriction this product's own architecture sits
   inside by construction, before the display-to-subscribers question is
   even reached.
3. **Massive already carries both numbers, on the same plans this desk has
   already priced for the live tape, under the same Individual/Business
   licence split already mapped.** If the vendor decision for the live feed
   is ever made in Massive's direction, short interest rides free inside it.
   If it is not, a standalone Massive Stocks plan (as low as Developer,
   $79/mo, for full history) would carry short interest and short volume on
   its own, still under the Business-tier display question this desk has
   already named.

**Nothing here is a recommendation to buy or sign anything: that stays his,
same as every other vendor decision on this desk.** This document answers
what it would cost and who it binds; whether to build the product is
Research's and his, not sized here.

---

## 6b. ANSWERED 2026-10-02, RESEARCH'S FLAG: "NON-COMMERCIAL USE" AND "FREE OF CHARGE" ARE NOT A CONTRADICTION; A PAID PRODUCT MAY NOT DISPLAY FINRA SHORT INTEREST

*Research's doc flagged two FINRA statements that look like they might
disagree: the data catalogue says "non-commercial use," and a FINRA rule
filing (SR-FINRA-2026-012, the withdrawn proposal, text not re-located in
this pass: Research extracted it, this seat did not re-open the same PDF)
describes the short interest data as published "free of charge, on
finra.org." Integration asked which governs. It isn't a contradiction, and
this seat's own standing rule (report a contradiction, don't resolve it) does
not apply here because there is nothing to resolve: the two sentences
answer different questions.*

**"Free of charge" is an access-cost statement, from a regulatory filing
describing FINRA's existing dissemination practice to the SEC**: it says
you don't need to pay to reach the data, which is true and is exactly the
kind of fact a rule filing states to justify or contextualize a proposed
change (here, a proposal to publish more often, not to change who may use
it commercially). **It is not a sentence in a contract with FINRA, and it
grants no rights to anyone.**

**"Non-commercial use" is the contract.** It's the operative sentence on the
actual Terms of Use governing whoever accesses finra.org, already quoted in
full in §3 above: *"the content and material provided through the FINRA
Website shall be used ONLY for your own non-commercial personal or
professional use."* **That is the document that answers Integration's
question, and the answer is no: not display, redistribution, or use in a
paid product of any kind.** Free of charge to look at and non-commercial to
use are not in tension; a public library's reading room is free to enter and
still doesn't let you republish the book.

**So, directly: a paid product may not display FINRA short interest, sourced
directly from FINRA, under FINRA's own published terms: full stop, before
even reaching the software/AI-use bar in §3 which closes the door a second,
independent way.** This is unchanged from §3's finding; this section exists
because the question was asked a second way and deserves a second, equally
direct answer rather than a pointer back.

## 6c. ANSWERED 2026-10-02: NO ALPACA PRODUCT CARRIES SHORT INTEREST

*Research's doc checked `/v2/assets` specifically and found only
`shortable`/`borrow_status` (borrow availability, not short interest),
correctly naming "whether any OTHER Alpaca product carries it" as this
seat's question to answer.*

**No. Checked beyond the two endpoints §2 already named**, against Alpaca's
full documentation site navigation (`docs.alpaca.markets`, every section
under Trading API, Market Data API, Broker API and Connect API, captured in
full in this session): **"short interest" appears nowhere in it, under any
product line.** The only short-selling-adjacent surfaces anywhere on the
site are the ones §2 already covers: `shortable`/`borrow_status` on the
assets endpoint, and the locate-quote/fee workflow for hard-to-borrow names.
Both are borrow supply and cost, not a reported position count, and neither
is a short-interest product under a different name. **Confirmed negative
across the whole site, not just the two pages most likely to carry it.**

---

## 7. Sources

`docs.alpaca.markets/us/docs/about-market-data-api`;
`docs.alpaca.markets/us/docs/margin-and-short-selling`; `finra.org/finra-
data/browse-catalog/equity-short-interest`; `finra.org/finra-data/browse-
catalog/short-sale-volume`; `finra.org/terms-of-use` (last modified
2023-11-09); `developer.finra.org` (Query API existence confirmed; its own
developer terms not located); `massive.com/docs/rest/stocks/fundamentals/
short-interest`; `massive.com/docs/rest/stocks/fundamentals/short-volume`;
`massive.com/legal/terms`. All read directly in this session, 2026-10-02.
Attempted and unread, named in §5: `ortex.com/pricing`, `ortex.com/api`,
`fintel.io/pricing`, `s3partners.com`.

---

## 8. ADDED 2026-10-02: MAY WE DISPLAY ALPACA'S OWN BORROW DATA (SHORTABLE / BORROW_STATUS / LOCATE QUOTES) TO PAYING USERS?

*Integration's third option, after §2's finding that this is what Alpaca
actually has instead of short interest. Two questions: the licence, and
whether a locate quote is a general market fact or something narrower.*

**Licence: no separate carve-out found. Same personal/non-commercial clause
as everything else on Alpaca, same trigger as everything else already
mapped.** Checked the governing Terms and Conditions (already read in full
for the feed-licence landscape, re-checked here for this specific question)
and the Customer Agreement (`AcctAppMarginAndCustAgmt.pdf`, downloaded and
read in full for this question: no hits for "short interest,"
"shortable," or "redistribut[e]"; the only "borrow" hit is the ordinary
short-sale-fee disclosure, nothing about display rights). **The Customer
Agreement doesn't speak to this at all: it governs the brokerage
relationship, not API display rights.** The governing document is the
Terms and Conditions, whose definition of **"Content"** is broad enough to
reach this data without strain. Item 7 of the definition is *"any other
information, content, services, or software,"* a catch-all with nothing
excluding borrow status or locate data from it. **So the same clause
already quoted for the live tape governs this too:** personal and
non-commercial use by default; *"making the Services and Content available
to others through your own application"* requires 30 days' advance written
notice to Alpaca, the same trigger already on file, not a block by itself
but not a free pass either.

**Factual, separate from licence, and this one matters regardless of what
the licence answer turns out to be: a locate quote is not a general market
fact, and showing it as one would misrepresent what it is.** Alpaca's own
documentation, already quoted in §2, describes the locate-quotes endpoint
as returning *"real-time, account-specific availability and pricing."*
**Account-specific, in Alpaca's own words**: the `available_qty` and
`price` a locate quote returns reflect this desk's own account's access to
Alpaca's borrow inventory at that moment, not a market-wide quote every
trader would see. Presenting it to subscribers as "shares available to
short" without that qualification would overstate what the number means,
the same shape of problem this desk already polices elsewhere (a vendor
float shown as fact rather than as this desk's own instance of it).
**`shortable`/`borrow_status`, by contrast, is not described as
account-specific anywhere read**: it reads as a general attribute of the
symbol at Alpaca (easy-to-borrow vs hard-to-borrow), closer to a fact about
the security than a fact about this account, though this was not confirmed
by a second source.

**So: licensable the same way the live tape is (a notice-triggering
default, not a flat no), but the locate-price half would need to be
labelled as this account's own access, not a market quote: a wording
constraint for Design/Research if this is ever built, not a legal
blocker.**

---

## 9. ADDED 2026-10-02: A MARKET-WIDE READ OF HOW CROWDED THE SHORT SIDE IS (BORROW FEE, UTILIZATION, AVAILABILITY)

*His words, typed to Integration (22nd), 2026-10-02T13:51:11Z, verified at his own
turn: "i dont want borrow data for the sake of having it. understanding short
interest is a read for longs. if its heavy/deep/concentrated it makes long plays
more volatile." The need, as Integration put it: a market-wide read of short-side
crowding, timely for his morning, displayable to paying users. Public pages only,
read 2026-10-02, nothing signed or contacted. Prices are monthly list prices as
published on that date.*

**Short answer: no source found is market-wide for the $1 to $20 names, timely, and
displayable to paying users at a published price.** Every path that can be shown to
paying users needs a redistribution licence that is priced by sales conversation.

### 9.1 Massive (already on the licence map): no fee or utilization

Read the full Stocks REST navigation (fundamentals, tickers, aggregates, snapshots,
trades and quotes, indicators, market operations, corporate actions, filings). The
only short-related endpoints are `short-interest` and `short-volume` (§4). **No
borrow fee, utilization, availability or securities-lending endpoint exists on the
Stocks API.** Nothing else on the licence map was found to carry them either.

### 9.2 Ortex: has fee and utilization, but not displayable on any self-serve plan

Read at source: `public.ortex.com/platform` (plans), `/terms-and-conditions` (last
updated 6 July 2026), `docs.ortex.com` (cost-to-borrow endpoint).

| plan | price | what it adds |
| --- | --- | --- |
| Platform Basic | $49/mo ($39/mo billed annually) | delayed short interest, cost to borrow, days to cover |
| Platform Advanced | $149/mo ($99/mo annually) | real-time short interest and cost to borrow, API access included |
| API Trader | $49/mo | single-stock APIs, short interest, CTB, FTD, 1,000 credits a month |
| API Quant | $149/mo | adds bulk endpoints, 10,000 credits |
| API Developer | $499/mo | 100,000 credits, 50 requests a second |
| API Enterprise | custom | full-day bulk downloads, "talk to sales" |

(An earlier third-party summary quoted Basic $39 and Advanced $129. The vendor's own
page says otherwise; the page governs.)

**Terms, read for the relevant clauses, close the self-serve plans to us.** The
consumer terms grant access *"solely for the purposes of the Customer's personal,
non-commercial investment activities as a Nonprofessional User"* (4.1), bar
distributing *"the Services or any excerpts or any derivatives thereof to any other
person or to any third parties, whether for consideration or free of charge"* (4.4),
and bar the customer to *"redistribute, resell, sublicense or otherwise make the data
available to any third party,"* to *"create a persistent archive or independent
database,"* and to *"use the data to train, develop or benchmark any artificial
intelligence or machine learning model"* (6.4). Professional Users are *"covered by
separate Professional Terms"* not published on that page. Ortex's pricing page points
teams to *"ORTEX for institutions,"* and a search-result description of its data
licensing lists *"redistribution and OEM options"* as sales-priced licences (that
description was not read at the vendor's own page). **So Ortex can be shown to paying
users only through a negotiated redistribution licence, price unpublished.**

**Coverage of small caps is not established.** The documented cost-to-borrow
endpoint lists its indices as *"Europe Top 600, UK Top 100, US-N 100, US-S 500"*
(default US-S 500) and says the free test key returns *"a list of randomly selected
rows."* Whether the paid universe reaches $1 to $20 names was not found. The
endpoint's update cadence is *"not explicitly stated"* in its documentation; the
platform page says "real-time" only for the Advanced plan.

**A flag on the obvious cheap experiment.** Buying a personal Ortex plan to look at
the read is a personal purchase, but the terms say the customer *"will not use the
Services in connection with any business, professional or commercial activities."*
Using it to evaluate a product for sale may fall outside that grant. This is a
reading of the clause, not a ruling, and it is a counsel question if he wants to do it.

### 9.3 S&P Global Securities Finance, Orbisa (EquiLend), Nasdaq Data Link: institutional, unpriced, mostly unread

- **S&P Global Securities Finance** (formerly IHS Markit): per search-result
  descriptions, daily data with utilization, loan volume and average fees, delivered
  by API or SFTP, sourced from prime brokers, custodians and funds. **The product
  page returned 403 and could not be read; pricing, small-cap coverage and display
  terms are unread.** Described as institutional; no self-serve price found.
- **Orbisa (EquiLend):** a securities-lending data service with fee and utilization
  fields. It powers Interactive Brokers' client dashboard and is offered to Bloomberg
  Terminal users as an app. The IBKR press release (read) lists utilization,
  borrower depth, lender depth and average duration, with short interest indicator,
  on-loan quantity and days to cover in a premium tier. **Orbisa's own licence terms
  and prices were not found.**
- **Nasdaq Data Link "Securities Lending Data":** a listing exists in search results;
  the page itself did not render. **Unread.**

### 9.4 Interactive Brokers: one broker's inventory, client-only

IBKR's Short Securities Availability page (read) describes its Securities Loan Borrow
system as a client utility that shows *"quantity available, number of lenders and
current indicative borrow rate,"* updated *"periodically throughout the day."* The
dashboard press release says its indicative rates are *"based on IBKR client
holdings."* **This is one broker's lendable inventory, offered to IBKR clients, not a
market-wide read and not a licensed feed.** A text file of shortable shares and fee
rates is described by a forum post and a search result as available from an IBKR FTP
server; **that file and IBKR's terms for it were not read.**

### 9.5 Fintel: unread

Fintel carries borrow-rate pages (a search result shows one). Its site returned a
bot-check page earlier and its pricing and terms remain **unread.**

### 9.6 Alpaca: no non-account-specific borrow product found

Alpaca's blog post on hard-to-borrow locates (read) says traders can preview
*"account-specific availability and pricing,"* and neither it nor the docs mention a
data product for business clients that shares borrow rates or availability. The
Broker API's securities lending offering (found in search results, not opened) is a
lending programme for customers' fully paid shares, not a data feed. A forum request
for a public borrow-rate file has no staff reply in the thread. **No such product was
found. Whether one exists for business clients is a question only Alpaca can answer,
and asking is an enquiry, which is his.**

### 9.7 Recommendation

1. **Do not plan to show borrow fee, utilization or availability to paying users
   now.** The only legal routes are sales-priced redistribution licences (Ortex
   institutional or OEM; S&P Global or Orbisa data licences), none published and
   none confirmed to cover $1 to $20 names.
2. **If the product side wants a crowding read that can be shown, the one published
   and displayable path is FINRA short interest through Massive (§4).** It is
   positions rather than fee or utilization, two to three weeks stale at 07:00 (see
   Research's note), and displayable only on Massive's Business tier. It answers a
   part of his question (how large the short position was) and not the part he
   named (how deep, heavy or concentrated the borrow market is today).
3. **If he wants to learn whether fee and utilization are worth a licence before
   anyone is asked for a price, the two facts to establish are** (a) whether Ortex's
   paid cost-to-borrow universe covers $1 to $20 names, and (b) what an Ortex or
   Orbisa redistribution licence costs. **Both are enquiries to a vendor, so both
   are his;** nothing here asks for one. Whether the read predicts anything for long
   entries is Research's question and is not studied here.
