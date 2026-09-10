# What TMI Trader is NOT

**Marketing, 2026-09-10 17:25 ET. An internal instrument, never a lead.** His
ruling the same day: *"dont lead with 1-20, dont lead with what its not. lead
with the differentiators."* This list exists so the copy stays sharp and stops
overclaiming. It does not go at the top of a page.

Each line was confirmed against the source or a registered document, not
inherited. The third column is the point: what the negation forbids in copy.

| # | Not this | Confirmed by | So the copy may never |
|---|---|---|---|
| 1 | **Not a scanner.** It does not run your filters. It takes names already moving and reports what is underneath them. | Registered answer, `docs/commercial/2026-09-08-product-name.md` §2e item 1. Discovery ranks RVOL across the whole universe; there is no user filter surface. | Say "finds", "screens", "filters", or put a scanner in the room as a rival. |
| 2 | **Not a broker. It cannot trade.** | `lib/market/alpaca` reaches `/v2/assets`, `/v2/calendar`, `/v2/stocks` only. No orders endpoint anywhere in `lib`, `worker`, `app`. | Say "execute", "enter", "size", "take the trade". |
| 3 | **Not a signal service.** No alerts, no entries, no exits, no arrows. | No webhook, mail, push or messaging code in `lib`, `worker`, `app`. | Say "alerts you", "tells you when to", "buy", "sell". |
| 4 | **Not a data terminal.** It sells conclusions, never prices, quotes or the tape. **Hard boundary: the licence.** | Commercial's finding; Web stripped `LAST`/`CHG`/`TAPE LIVE` from the illustration. | Name a price, a quote, a feed, "real-time", "live tape", "consolidated". Describe the market as a feature. |
| 5 | **Not a track record.** No users to quote, no results to show. One user, invite-only. | Charter prohibition 3. | Imply traction, adoption, testimonials, "traders use", "join". |
| 6 | **Not an outcome.** It does not make anyone money and the page never suggests it does. | Charter prohibition 2. Financial marketing. | "edge", "profit", "win", "catch the move", "get in early", "never miss". A footer disclaimer cures nothing. |
| 7 | **Not for large caps, options, swing or the afternoon.** $1 to $20 small caps, in play, premarket. | `DISCOVERY_PRICE_MIN 1`, `DISCOVERY_PRICE_MAX 20`, `lib/market/config.ts:71`. Premarket scope, README 2026-09-03. | Widen the reader. No "any market", no "all traders". But this is not the lead either. |
| 8 | **Not an explainer after the fact.** ExplainThisMove and Benzinga WIIM tell you why any ticker moved, later. This works a premarket board and carries structure. | Commercial's tagline-collision work. | Use "the story behind the move" or any after-the-fact framing. |
| 9 | **Not certain, and it never pretends.** Unknown stays unknown. Nothing is rounded to zero. | `CANNOT_VERIFY`, `NOT RESEARCHED`, `STRUCTURE UNKNOWN`, `CYCLE NOT ESTABLISHED` are rendered states. `risk.ts` header. | Claim completeness. "Everything", "always", "every name" without "where it has nothing, it says so" beside it. |
| 10 | **Not intent.** A filing establishes capacity. It never says anyone is selling. | `risk.ts:161`, `language.ts` "Capacity is never restated as selling." | Say "dumping", "dilution incoming", "they are selling". |
| 11 | **Not a chatroom, a community or a course.** | Nothing in `app`, `components`, `lib` renders any of them. | "Learn", "join", "members", "mentor". |
| 12 | **Not international.** US market. Access by invitation is the scope. | His ruling, 2026-09-10, via Web. | Market into any other jurisdiction. |
| 13 | **Not advice.** Information service. Not a broker-dealer, not an adviser. | Footer legal, Commercial. | Recommend, rate a trade, or address the reader's position. |

## Two lines that fall out of the list

The list collapses to a positive the page can carry: **it takes what is already
moving and tells you what it is standing on, before you have to decide, and
where it has nothing it says so.** Every sentence of copy should be one of those
three clauses said more specifically.

And a test for any line: if a working trader could not tell from the sentence
that it was written by someone who has sat through a 07:15 with a 50% mover on
screen and no reason for it, the sentence is not finished.
