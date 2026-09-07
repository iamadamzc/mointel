# Which price — the derived real-time products, and whether they carry a spread

**Written by Commercial, 2026-09-07, against `1d3a283`.** Integration's task after
Gate 1 closed (*"the unit sold is everything together"*, *"same board to
start"*): the first-viewer decision is about **which price**, not which
product, and *"the spread is the binding detail."* Public documentation only,
as always; every quotation re-read against the page it names. No vendor
contacted, nothing signed up for.

**The one-paragraph answer.** Of the derived real-time prices on the market,
**exactly one is a real bid and ask** — Databento's US Equities Mini, an
aggregated top-of-book across venues it does not name. Massive's Fair Market
Value is **a single number with no bid or ask**. Intrinio's EquitiesEdge is **a
predicted bid and ask** produced by a method it does not publish. Tiingo's
reference price is **a last-or-mid** whose bid and ask sit behind an IEX
agreement. Beneath all of them are four **real but partial** quotes — Cboe One,
Nasdaq Basic, IEX TOPS, and the IEX quotes Alpaca's free plan delivers — each a
genuine spread on one family of venues rather than the national best. **A price
without a live bid and ask costs the board two features, the flat verdict and
the NEW HIGH override, and a subset spread biases both in a known direction.**

---

## 1. WHAT THE DESK NEEDS FROM A PRICE, FROM THE CODE

The spread is not decoration. Two verdicts are defined by it, and the code says
what happens without it.

- **The spread itself** — `lib/market/derive.ts:82-98`, `computeQuoteState`:
  Level 1 only; usable when bid and ask are both present and `ask >= bid`;
  `spread = ask - bid`, `spreadPct = spread / midpoint`. A crossed, zero or
  missing quote produces **no spread rather than a misleading number**. Its own
  comment: *"a tight NBBO spread is not evidence of liquidity, and must never be
  presented as Level 2."*
- **The flat verdict** — `lib/dashboard/sparkline.ts:204-249`, `directionTone`:
  *"FLAT MEANS THE MOVE IS SMALLER THAN THE SPREAD — a move he could not have
  captured."* Yellow when `|movePct| <= |spreadPct|`; **null, never yellow, when
  there is no spread**: *"Yellow means MEASURED AND FLAT; neutral means NO PRICE
  TO JUDGE."* And the dependency the comment names for exactly this decision:
  *"`spreadPct` is CURRENT while the move spans t−6…t−2 … if it becomes a daily
  average it gets silently wrong."* **The spread has to be live.**
- **The NEW HIGH override** — `lib/dashboard/cycle.ts:221-263`, `highReading`:
  *"The band is the SPREAD, and it is not optional … Off by less than the
  spread is not off — the difference was not sellable."* NEW HIGH when
  `high - price <= spread`; *"No spread means no override, not a guess."*
- **Where the quote comes from today** — `lib/market/engine.ts:1082-1085`,
  `ingestQuote` feeding `computeQuoteState` from the stream's `quotes` channel:
  on Algo Trader Plus that is the **consolidated NBBO**; on the free plan it
  would be IEX's book.

So the requirement is: **a live bid and a live ask per name, refreshed at
least at minute cadence, in premarket, for $1–$20 small caps.** Sizes are
carried for display and not used by either verdict. Depth is not needed.

**And one property that decides the direction of error before any product is
measured.** The national best bid is the highest bid on any venue and the
national best offer the lowest; a subset of venues can only have a bid no
higher and an offer no lower. **So a real quote from a subset of venues has a
spread at least as wide as the NBBO, always.** A wider band calls FLAT on some
moves that were tradeable at the national best, and fires NEW HIGH on prints
that were still short of it. Conservative in one verdict, permissive in the
other, and one-directional in both. A modelled spread has no such guarantee:
it can be narrower or wider than the truth and the page does not say which.

---

## 2. THE PRODUCTS

"Real" means an observed bid and ask from a venue's book; "modelled" means an
estimate. Hours are stated only where a page states them.

| price | what it is | bid and ask? | whose spread | venues and coverage | hours stated | method published? | external per-viewer exchange fee | published price to obtain it |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Consolidated NBBO** (the desk today) | the SIP's best bid and offer across every venue | **real** | national best | 100% of volume, all venues | Alpaca streams 04:00–20:00 in practice; the desk captures from 04:00 | n/a | $1.00 per non-pro per network, three networks | Alpaca Algo Trader Plus $99/mo personal; Massive Business + Full Market $2,499 + $1,999 plus exchange fees; Alpaca Broker premium SIP by sales |
| **Databento US Equities Mini** | *"a derived top-of-book dataset, sourced from the proprietary market data feeds of both alternative trading systems (ATS) and RegNMS venues"* | **real, aggregated** — MBP-1, BBO, TBBO schemas; *"Databento calculates the best bid and best ask prices across the component venues of the feed, adding together all quantity (including odd lots)"* | the component venues' best — **not the national best**; *"quotes are not provided for the individual component venues"* | venues **anonymised and unnamed** (*"publisher_id … will always have the value EQUS.MINI.EQUS"*); share of volume and TRF coverage **unpublished** | **not stated** | construction yes, venues no | **none** — *"Personal and commercial — No license fees"* | Standard $199/mo; external distribution on Plus $1,500/mo annual |
| **Massive Fair Market Value** | *"an algorithmically derived, real-time estimate of a security's fair market price"*; *"We seamlessly blend multiple exchange feeds … using our proprietary algorithm"* | **none** — the message carries `ev`, `fmv`, `sym`, `t` and nothing else | no spread | multiple exchange feeds, unnamed | *"as frequently as once per second from 4AM-8PM ET"* | no | none — *"No Exchange Fees or Approvals"* | Stocks Business $2,499/mo; a real bid and ask needs the Full Market expansion, which is the SIP again |
| **Intrinio EquitiesEdge** | *"Intrinio uses multiple sources of data to derive a highly accurate predicted bid, ask, and last price for all U.S. stocks"* | **modelled** — SDK quote messages carry `type` bid/ask, `price`, `size`, `timestamp`, `subprovider`, `market_center` | a prediction | all US stocks; sources unnamed | **not stated** (pre- and post-market volume fields exist) | **no** — no method, no accuracy metric on any page read | none — *"No exchange fees, No per-user fees, No display fees"* | Individual $150/mo (no display); Startup $333 → $666 → $999/mo with *"Commercial Use and Display Rights"* |
| **Tiingo reference price** (`tngoLast`) | *"either the last price or mid price. The mid price is only used if our algo determines it is a good proxy for the last price. So if the spread is considered wide by our algo, we do not use it"* | **gated** — `bidPrice`, `askPrice`, `bidSize`, `askSize`, `last` are *"IEX Entitlement Required"* and null without *"a market data agreement signed with the IEX Exchange"* | IEX's book, if entitled; otherwise none | IEX alone, 2–3% of volume by Intrinio's figure | not stated | partially | none from IEX | Power $30/mo internal; redistribution $250/$500/mo |
| **Cboe One Summary** | aggregated quote and trade updates for Cboe's four exchanges; *"Best Quote"* plus up to 48 aggregate depth levels | **real** | Cboe's four books — *"within 1% away from the NBBO 97.77% of the time, on average"* | BZX, BYX, EDGX, EDGA | not stated on the page read | n/a | $0.25 per non-pro user; external distributor $5,000/mo | via dxFeed or Intrinio Enterprise; not sold by Massive (EDGX top only) or Databento (depth feeds, commercial only) |
| **Nasdaq Basic with NLS Plus** | Nasdaq's QBBO top-of-book plus NLS+ last sale | **real** | Nasdaq's own book — *"only quotes for Nasdaq (XNAS) are provided"* | trades from Nasdaq, PSX, Nasdaq Texas **and both FINRA/Nasdaq TRFs**, so off-exchange prints are in; quotes from one exchange | not stated on the page read | n/a | $1.00 per non-pro (Nasdaq 2025 list); via Databento $2,140 distribution + $0.50 per personal user + $1,680/firm | Massive expansion $1,999/mo; Databento (commercial only); Intrinio Enterprise |
| **IEX TOPS** | IEX's own top of book and last sale | **real** | IEX's book | one exchange, 2–3% of volume | not stated | n/a | none; real-time TOPS $500/mo direct, $1,000 from 2026-10-01; delayed free | Alpaca Basic delivers it free (*"IEX data is sourced from the SIP feed, and not the exchange itself"*); Tiingo; Massive expansion $499 |
| **Twelve Data default feed** | trades from venues *"that do not require additional licensing … approximately 5% of total US trading volume"* | **none documented** — the `/quote` response lists no bid or ask; the websocket fields could not be read | none | ~5% of volume | not stated | n/a | none | Grow $29/mo internal; Venture $499/mo external display |
| **Alpaca** | no derived equities price in the trading day; its derived products are the overnight feed (*"15 minutes delayed and adjusted to fit the bid-ask spread"*) and indicative options quotes | the `quotes` channel is real: NBBO on Algo Trader Plus, IEX on Basic | as above | as above | 04:00–20:00 in practice | n/a | as above | $0 / $99 personal |

---

## 3. WHAT EACH PRICE DOES TO THE TWO FEATURES

| price class | flat verdict | NEW HIGH override | direction of error | products |
| --- | --- | --- | --- | --- |
| **national best** | as designed | as designed | none | SIP via Alpaca ATP, Massive Full Market, Alpaca Broker premium |
| **real subset BBO** | fires **more often** — a band at least as wide as the NBBO calls flat on moves that were tradeable at the national best | fires **more readily** — a wider band | one-directional, magnitude unknown for $1–$20 premarket names on any product | Databento Mini, Cboe One, Nasdaq Basic, IEX TOPS, Alpaca Basic |
| **modelled BBO** | judged against an estimate | judged against an estimate | **unknown in either direction**; method unpublished | Intrinio EquitiesEdge |
| **no BBO** | **neutral for every name** — *"NO PRICE TO JUDGE"* | **no override for every name** — *"No spread means no override"* | the feature is absent, honestly | Massive FMV alone, Tiingo without entitlement, Twelve Data |

**Three consequences worth stating rather than leaving in the table:**

1. **The cheapest derived price with no exchange paperwork — FMV — is the one
   that deletes both features.** Massive's Business plan delivers a price the
   board can display and nothing the flat verdict can use. The bid and ask come
   back with the Full Market expansion, at which point the price is the SIP
   again, with the SIP's exchange bill.
2. **Databento Mini is the only derived product that keeps both features, and
   what it costs them is unmeasurable from public pages.** Its spread is real
   and at least as wide as the NBBO; how much wider, for a $1–$20 name at 06:30,
   depends on which venues are in the blend, and the blend is anonymised by
   design. That number exists only with a feed in hand.
3. **Under bring-your-own-feed, the quality of the verdict is per user.** An
   Algo Trader Plus user's token supplies the NBBO; a free-plan user's supplies
   IEX's book. Two users looking at the same name would get different flat
   verdicts from the same code, decided by which plan each pays Alpaca for.

---

## 4. WHAT COULD NOT BE ESTABLISHED FROM PUBLIC PAGES

- **Databento Mini:** its component venues; its relationship to the NBBO; its
  share of consolidated volume and whether non-ATS off-exchange prints are in
  it; its hours.
- **Massive FMV:** anything about the method beyond "proprietary" and "blend";
  whether FMV sits inside the NBBO.
- **Intrinio EquitiesEdge:** the method, any accuracy figure, hours, what
  `size` means on a predicted quote.
- **Cboe One and Nasdaq Basic:** session hours, from the pages read (Cboe's
  hours page returned 404; nasdaq.com timed out).
- **Twelve Data:** the websocket price event's fields.
- **For every subset product:** the magnitude of spread widening on this
  desk's population, which is measurable only with a feed in hand — and
  obtaining one is a sign-up, which is his.

---

## 5. SOURCES

Code: `lib/market/derive.ts`, `lib/dashboard/sparkline.ts`,
`lib/dashboard/cycle.ts`, `lib/market/engine.ts` at `1d3a283`.

Databento: databento.com/docs/venues-and-datasets/equs-mini ·
databento.com/docs/venues-and-datasets/xnas-basic ·
databento.com/blog/databento-us-equities-mini-now-available ·
databento.com/catalog/us-equities · databento.com/docs/portal/live-data.
Massive: massive.com/docs/websocket/stocks/fair-market-value ·
massive.com/business-stocks. Intrinio: intrinio.com/financial-market-data/equitiesedge
· intrinio.com/how-to/getting-started-with-equities-edge ·
github.com/intrinio/intrinio-realtime-python-sdk · intrinio.com/pricing.
Tiingo: tiingo.com/documentation/iex · tiingo.com/products/iex-api. Cboe:
cboe.com/market_data_services/us/equities/cboe_one ·
cdn.cboe.com/resources/membership/US_Market_Data_Product_Price_List.pdf.
Nasdaq: nasdaqtrader.com/content/ProductsServices/PriceList/Nasdaq_US_Equities_Price_List_2025.pdf.
IEX: iex.io/resources/trading/fee-schedule · sec.gov/files/rules/sro/iex/2026/34-105989.pdf.
Twelve Data: twelvedata.com/docs ·
support.twelvedata.com/en/articles/9935903-us-equities-market-data. Alpaca:
alpaca.markets/support/data-provider-alpaca ·
docs.alpaca.markets/docs/historical-stock-data-1 ·
docs.alpaca.markets/us/docs/streaming-market-data.
