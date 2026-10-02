# Short interest — where it comes from, what it costs, can we show it

**Written by Commercial, 2026-10-02, against his question to Integration (22nd
seat, verified at his own turn, 2026-10-02T11:54:59Z): *"i want to do some
research around short interest. wonderin if we should include it. where could
we get it from. how is it derived. is there any free source (does alpaca
have?)."*** Public sources only — vendor docs and terms, FINRA's own
publication pages, all re-read at source 2026-10-02. No vendor contacted, no
account created, nothing signed up for. Research is sizing the product side
(whether it's useful, where it would render) separately; this document is
vendors, licensing, cost only.

---

## 1. How it's derived, and the one distinction that matters most

**Two different FINRA numbers get called "short interest" loosely, and they
answer different questions — this is the first thing to get right, because a
vendor or a news source conflating them will mislead.**

- **Short interest (the real thing).** FINRA Rule 4560 requires every FINRA
  member firm to report its short positions in every equity security to
  FINRA **twice a month** — settlement on the 15th and on the last trading
  day of the month. FINRA compiles the reports and publishes them on the
  **7th business day after the reporting settlement date.** So a number
  published today reflects positions held roughly two to three weeks ago, not
  now. This is **the only "short interest" in the regulatory sense**: total
  shares sold short and not yet covered, as of one of two snapshot dates a
  month, lagged by design.
- **Short sale volume (a different, faster, narrower number).** FINRA
  separately publishes **daily** aggregated short-sale volume, but **only for
  trades executed off-exchange** (reported to a Trade Reporting Facility, the
  Alternative Display Facility, or the OTC Reporting Facility) — **not**
  exchange-listed trades, and not consolidated across venues. FINRA's own
  page states this distinction explicitly rather than leaving it to be
  inferred: *"The Short Sale Files do not — and are not intended to — equate
  to bi-monthly reported short interest position information."* Short volume
  is a same-day proxy for selling pressure; it is not a position count and
  cannot be used as one.

**Neither number is computed by a market-data vendor from raw trades.** Both
originate as regulatory filings from broker-dealers to FINRA. Every vendor
below (Massive, Ortex, Fintel, S3) is reselling or re-presenting FINRA's own
published numbers, not deriving an independent figure — the "derivation"
question has one answer regardless of which vendor it's bought from.

**Nasdaq and NYSE do not publish a competing or independent short-interest
number.** FINRA's own page states it publishes short interest *"for all
exchange-listed and over-the-counter (OTC) equity securities"* — one
aggregator, not an exchange-by-exchange reporting scheme. If Nasdaq's or
NYSE's own sites display a short-interest figure, it is FINRA's number
re-rendered, not a second source. **Not verified directly: whether either
exchange's own display page carries republication terms different from
FINRA's** (their JS-rendered market-activity pages didn't resolve to readable
text in this read) — labelled as unread, not characterised either way.

---

## 2. Does Alpaca have it? No — and what it has instead is a different thing entirely

**Checked `docs.alpaca.markets` directly, both the Market Data API and the
Trading API's margin/short-selling pages.** Alpaca's API exposes nothing
called short interest or short sale volume anywhere in its documented
endpoints (Historical Stock Data, Real-time Stock Data, Historical/Real-time
News — none of them carry it).

**What Alpaca does have, and it answers a related but different question —
can I borrow this stock, not how many shares are already sold short:**

- **`GET /v2/assets/{symbol}`** returns `shortable` (boolean) and
  `borrow_status` (`easy_to_borrow` / `hard_to_borrow`) for a security.
- **`GET /v1/locates/quotes`** returns, for hard-to-borrow names,
  `available_qty` (shares available to borrow right now) and `price` (the
  borrow fee per share), live.
- **`GET /v1/locates`** tracks locate requests placed.

**This is borrow supply and cost, a real-time, forward-looking signal of how
scarce shares are to short right now** — closer in spirit to what Ortex calls
"utilization" and "availability" than to FINRA's bi-monthly position count.
It is already included with the trading account (no separate subscription),
but **it is not short interest and should not be presented as it** — a
reader seeing "hard to borrow, 86% availability" and a reader seeing "9.3% of
float sold short as of Sept. 29" are being told two different kinds of fact,
and conflating them would be exactly the kind of claim this desk's own
standing rules already bar (a number presented as more measured than it is).

---

## 3. The free official source — FINRA — and the licence question that actually governs it

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
desk has already mapped for every other vendor — it names software and
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
board — a ranking and research process — reads as squarely inside. A direct
FINRA pull, free or not, is **not a clean path for this product even before
asking whether it may be shown to a paying subscriber.** The Query API's own
developer terms were not separately located in this read (the developer
portal's documentation pages returned not-found) — if a path exists there
that differs from the website terms above, it is unconfirmed, not ruled out.

---

## 4. The paid vendor that matters most, because it is already on this desk's own licence map

**Checked Massive (`massive.com`, formerly Polygon — the vendor this desk's
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
tape** — Basic (free), Starter ($29/mo), Developer ($79/mo), Advanced
($199/mo) — **no separate short-interest subscription exists or is needed.**

**The licence question is the same one this desk has already answered for
everything else on Massive, not a new one.** Massive's own terms page states
the structure directly: a product labelled for *"Individual Use"* carries
the personal/non-business terms; a product labelled for *"Business Use"*
carries the commercial terms. The short-interest and short-volume endpoints
above are listed under **Individual Plans** on Massive's own pricing table —
so they are bound by the same personal, non-commercial restriction already
mapped for Massive's market data generally (`2026-09-07-feed-licence-
landscape.md` §4). **The practical consequence is good news, not a new
cost:** if this desk ever moves to Massive Business ($2,499/mo, already
priced for the live-tape question) for the reasons already on file, short
interest and short volume come along inside that same plan at no additional
charge — this is not a line item that adds to the vendor decision, it rides
whatever that decision already costs.

**Not independently verified: whether Massive's Business-tier terms name
Fundamentals data (short interest/volume) the same way they name the real-
time tick data**, i.e. whether a Business subscriber's display rights
extend to these endpoints without a separate carve-out. The pricing table's
own "Business Plans" column exists and presumably covers it, but the actual
Business terms document was not re-read line by line for this specific
endpoint in this session — labelled as a reasonable inference from the
plan structure, not a re-read fact.

---

## 5. Other vendors — checked, could not read terms or pricing at source

**Named rather than silently dropped, per this seat's own standing rule that
an unread vendor is labelled unread, not characterised:**

- **Ortex** — widely cited for short-interest/utilization dashboards and an
  API. `ortex.com/pricing` and `ortex.com/api` both redirected to
  `public.ortex.com`, a live news/signal terminal, not a pricing or terms
  page. **Pricing, API terms and redistribution rights: unread.**
- **Fintel** — `fintel.io/pricing` returned a bot-detection interstitial
  ("Browser Check") rather than content. **Unread.**
- **S3 Partners** — the institutional-grade short-interest desk (its data is
  what much financial media cites). `s3partners.com` failed to resolve in
  this read. **Unread; S3's products are institutional-sales-priced from
  general knowledge of the space, not from anything read at source today —
  this is background, not a sourced claim, and should not be repeated as
  one.**

**None of these is needed to answer the question that matters.** Massive
already has the data, already at a price point this desk has priced before,
under terms this desk has already mapped. These three would only matter if
Massive's coverage or terms turn out to be insufficient — not established
here.

---

## 6. Recommendation

**If the product side wants short interest and short-sale volume at all,
the vendor question is close to already answered by this desk's own existing
work, not a fresh search.** Three findings, in the order that matters:

1. **Alpaca does not have it.** What it has (borrow status, locate pricing) is
   a different, faster, more actionable signal for a different question
   ("can I borrow this right now, and what does it cost") and is already
   free on the account — worth having Research look at on its own merits,
   but it is not a substitute for short interest and should never be
   labelled as one.
2. **The free FINRA source is not a clean build path**, not primarily because
   of cost but because its terms bar use "in conjunction with" software,
   algorithms or AI — a restriction this product's own architecture sits
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

**Nothing here is a recommendation to buy or sign anything — that stays his,
same as every other vendor decision on this desk.** This document answers
what it would cost and who it binds; whether to build the product is
Research's and his, not sized here.

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
