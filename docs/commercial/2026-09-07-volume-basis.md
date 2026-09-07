# Volume basis — which display-rights tiers carry consolidated volume

**Written by Commercial, 2026-09-07, against `6c6b067`.** Integration's
question after bring-your-own-feed was ruled out: *"the cheapest published
display-rights tiers are Tiingo at $250 and Intrinio Startup at $333. Do those
tiers supply consolidated (full-market) volume, or only the volume they see?"*
Public documentation only; every quotation re-read against its page. No
contact, no sign-up.

**The one-paragraph answer.** **Tiingo: no, at any tier** — its intraday volume
is IEX's alone by its own field description, and the all-exchange figure
arrives only after the close. **Intrinio Startup: not established** — the API
defines a whole-market volume field, and no page says whether the Startup
tier's derived feed populates it; Intrinio's consolidated volume is verified
only on the Enterprise delayed-SIP feed, 15 minutes late. **Massive Business:
yes, real-time** — by Massive's own knowledge base its aggregates exist only for
the consolidated feed, dark-pool prints included, and Business streams them
live. **Databento: the Standard tier's only live dataset is Mini, whose volume
is a venue subset**; Databento's consolidated intraday volume lives in a
separate Summary dataset that its blog calls delayed and whose tier the pricing
matrix does not state in text. **So the lowest published tier with verified
real-time consolidated volume and display rights is Massive Business at
$2,499 a month. The "$1,500 Databento floor" is not supported for RVOL as this
board defines it.** Two cheaper floors exist only if something no page states
turns out to be true, and each can be settled only by a sign-up.

---

## 1. THE PROPERTY THAT HAS TO SURVIVE, FROM THE CODE

- **The definition** — `lib/market/rvol.ts:7-9`: *"Daily RVOL = current
  cumulative trading-day volume / average full-session volume over the previous
  20 eligible full trading sessions."* Explicitly *"NOT volume-at-this-minute
  over average-volume-at-this-minute."*
- **The baseline** — `lib/market/types.ts:63-69`: *"Alpaca's daily bar carries
  full-session VOLUME but regular-session OHLC"*, verified against minute bars.
  The numerator is the live cumulative session volume from the SIP stream; the
  denominator is twenty consolidated full-session daily volumes. **Both halves
  are consolidated today, and both halves are full-session (04:00–20:00).**
- **The requirement, stated so a migration can be tested against it:** the
  numerator must be consolidated across all venues, including off-exchange
  prints, updated live; the denominator must be consolidated on the same
  session basis. **A consolidated denominator under a venue-local numerator is
  worse than a consistent subset** — it is a ratio of two different quantities
  wearing one name, and it reads low for every name in proportion to how much
  of its trading happens away from the vendor's venue.

## 2. THE FOUR VENDORS

| vendor and tier | display rights on that tier? | intraday volume basis | the page's words | consolidated volume available where |
| --- | --- | --- | --- | --- |
| **Tiingo** — EOD + IEX Redistribution, $250 / $500 | yes, *"Display Redistribution"* | **IEX only** | *"Volume will be IEX Volume throughout the day, but once the official closing price comes in, volume will reflect the volume done on the entire day across all exchanges."* Intraday history: *"The number of shares traded on IEX only."* | **nowhere intraday, at any tier.** After the close only. The end-of-day endpoint's volume is *"The number of shares traded for the asset"* with no source stated |
| **Intrinio** — Startup, $333 → $666 → $999, EquitiesEdge | yes, *"Commercial Use and Display Rights"* | **not established** | the real-time API defines `exchange_volume` — *"The number of shares exchanged during the trading day on the exchange"* — and `market_volume` — *"The number of shares exchanged during the trading day for the whole market"*; the docs say nothing about which sources populate `market_volume`; the EquitiesEdge page lists *"Volume, Pre-Market Volume, Post-Market Volume"* with no basis | **Enterprise, $1,250/mo+, delayed SIP:** *"100% of US exchange volume"*, *"Dark pool data included"*, *"The data updates continuously but with a 15-minute delay"* — the page does not separate volume from the quote delay |
| **Massive** — Stocks Business, $2,499 | yes | **consolidated, real-time** | knowledge base: *"Massive currently only offers aggregates for the 'consolidated' feed (meaning trades from all exchanges)."* Dark-pool prints carry *"exchange ID of 4"* and a `trf_id`. Coverage *"19 US Exchanges + Dark Pools."* The minute-aggregate websocket lists *Stocks Business — Real-time*; its fields are `v` *"The tick volume"* and `av` *"Today's accumulated volume"* | **on Business itself.** Massive's own statement is *"No Exchange Fees or Approvals"* on that tier; end-of-day SIP for the denominator is also on Business (*"the full SIP end-of-day"*) |
| **Databento** — Standard $199; external distribution on Plus $1,500 + licence fees, annual | Plus only | **Mini: venue subset.** Standard's live coverage in the feature matrix is *"Databento US Equities Mini"* alone; Mini's OHLCV *"aggregate prices and volume across all the component venues"*, venues anonymised, share of volume unpublished | Summary dataset (EQUS.SUMMARY): *"Databento normalizes the consolidated volume provided by the Nasdaq NLS+ feed on every trade into the statistics schema. This volume is consolidated across all US exchanges."* Blog: *"100% intraday volume on a delayed basis and consolidated end-of-day prices (OHLCV) across all NMS exchanges and ATSs."* | **in Summary — delayed by the blog's account, silent in the spec — and on a tier the matrix shows only as an icon.** Not established which plan carries it live |

**The baseline for comparison — Alpaca Algo Trader Plus, $99:** consolidated,
real-time, both halves, on a plan with no display rights.

**And one published route that is neither of the four:** the consolidated
volume Databento's Summary carries **originates in Nasdaq's NLS+ feed**, which
is half of *Nasdaq Basic with NLS Plus*. That product is sold by Databento
(commercial only, $2,140 distribution + $1,680/firm + $0.50 per personal
user), by Massive as a $1,999 expansion, and by Intrinio at Enterprise. Its
quotes are Nasdaq's book alone; its volume field is consolidated.

## 3. WHAT THE EXCHANGES SAY ABOUT VOLUME ON ITS OWN

The exchange layer prices real-time consolidated volume at nothing per viewer,
which is why it can ride on a delayed or derived product:

- **CTA delayed-data policy §VIII:** *"The Participants permit Vendors to
  distribute each issue's real-time consolidated volume data with Delayed last
  Sale information or Delayed Quotation information at no additional charge."*
- **UTP data policies, derived data type 3:** *"REAL-TIME VOLUME ONLY DATA [NOT
  FEE LIABLE] … Derived Real-Time Volume Data that is based on a single security
  is also not fee liable."*

So the constraint is not the exchanges; it is which vendor sells real-time
consolidated volume on a display tier. On the pages read: **Massive Business
does, live; Databento's Summary does, delayed per its blog; Intrinio's delayed
SIP does, delayed; Tiingo does not; Intrinio Startup is unstated.**

## 4. THE FLOOR, AS THE PAGES SUPPORT IT

| floor | monthly | what it rests on | status |
| --- | --- | --- | --- |
| **Massive Business** | $2,499 | consolidated real-time aggregates on the display tier, by Massive's own documentation | **verified on public pages** |
| Databento Plus with Summary live | $1,500 + licence fees, annual | Summary's consolidated volume being on Plus, and "delayed" being acceptable for RVOL | **not established** — tier unreadable, delay stated in the blog |
| Intrinio Startup | $333 → $999 | `market_volume` being populated for EquitiesEdge | **not established** — no page says |
| Tiingo | $250 / $500 | — | **ruled out** by Tiingo's own field description |

**The two cheaper floors can be settled only with a feed in hand or an
enquiry, and both are sign-ups or approaches — his, under the standing rule.**
Until then the verified floor for RVOL as this board defines it is Massive
Business, and it is a rebuild of the market worker.

## 5. WHAT COULD NOT BE ESTABLISHED

- Intrinio: whether `market_volume` is populated on the EquitiesEdge source;
  whether Enterprise delayed-SIP volume is delayed with the quotes or live.
- Databento: which plan carries the Summary dataset live; whether Summary's
  per-trade consolidated volume is delayed (blog) or immediate (spec); Mini's
  share of consolidated volume.
- Tiingo: the source of end-of-day volume.
- Massive: any exchange-side view of its "no exchange fees" claim on
  real-time consolidated aggregates; the Business page does not name the SIP
  as the source of the live aggregates, the knowledge base does.
- Nasdaq's own NLS Plus specification (the nasdaqtrader link returns "Page Not
  Available"); the consolidated-volume attribution here is Databento's.

## 6. SOURCES

Code: `lib/market/rvol.ts`, `lib/market/types.ts` at `6c6b067`. Tiingo:
tiingo.com/documentation/iex · tiingo.com/documentation/end-of-day ·
tiingo.com/products/iex-api. Intrinio:
docs.intrinio.com/documentation/web_api/get_security_realtime_price_v2 ·
intrinio.com/financial-market-data/equitiesedge ·
intrinio.com/financial-market-data/stock-prices-delayed-sip · intrinio.com/pricing.
Massive: massive.com/knowledge-base/article/how-does-massive-create-the-open-high-low-close-volume-aggregate-bars
· massive.com/knowledge-base/article/what-symbols-exchanges-are-included-in-massives-data
· massive.com/docs/websocket/stocks/aggregates-per-minute ·
massive.com/docs/rest/stocks/aggregates/custom-bars · massive.com/business-stocks.
Databento: databento.com/catalog/us-equities (feature matrix) ·
databento.com/docs/venues-and-datasets/equs-mini ·
databento.com/docs/venues-and-datasets/equs-summary ·
databento.com/docs/venues-and-datasets/xnas-basic ·
databento.com/blog/introducing-databento-us-equities ·
databento.com/docs/portal/live-data. Exchanges: CTA Policy — Delayed Market
Data (ctaplan.com) · utpplan.com/DOC/datapolicies.pdf.
