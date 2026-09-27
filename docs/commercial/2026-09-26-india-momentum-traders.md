# India, US small-cap momentum traders — confirm or deny, from public sources only

**Written by Commercial, 2026-09-26 (checks run 19:20–22:50 UTC), against `9d49118`.**
His question, verbatim, relayed by Integration: *"i've learned that india has a large
presence of day traders, and a potential substantial presence of momentum traders that
may be interested in our product. the first thing i want to do is confirm or deny this.
are there a large presence of momentum traders of the us small cap market in india."*
**Public sources only. No enquiry, no vendor or platform contacted, nobody approached.**

**The claim has three populations inside it, and only the intersection is the market**
(Integration's framing, kept because it is exactly right and this document is built on
it):

```
A  day traders in India                    -- large, and the easiest number to find
B  MOMENTUM traders among them              -- a style, much harder to evidence
C  trading US SMALL CAPS specifically       -- the only one that matters to this product
```

**The honest answer is not the clean one either side of the question expected.** The
practical-access barrier that would have made this whole question moot — can an Indian
resident even day-trade a US-listed small cap, repeatedly, in one session — was
substantially real as recently as mid-2026 and has just been engineered around, by name,
by at least two of the platforms Indian residents actually use. **That does not confirm
a large momentum-trading population; it removes a reason to assume there can't be one,
and moves the honest gap from "can they" to "do they," which public sources cannot
answer.**

---

## 0. THE BOUNDING QUESTION, ANSWERED FIRST — CAN AN INDIAN RESIDENT PRACTICALLY DAY-TRADE A US SMALL CAP AT ALL

**Three facts, each dated, each read from a primary source, in the order they compose.**

### 0a. The Reserve Bank of India bars funding a MARGIN account under LRS — primary text, unambiguous

`rbi.org.in`, Master Direction – Liberalised Remittance Scheme (LRS), updated
2024-09-06, read in full at its canonical URL:

> *"5. All other transactions which are otherwise not permissible under FEMA and those
> in the nature of remittance for margins or margin calls to overseas exchanges/
> overseas counterparty are not allowed under the Scheme."*

**This is the single most load-bearing sentence in this document.** LRS is the
mechanism by which an Indian resident individual may legally send money abroad at all
(up to USD 250,000 per financial year, per the same Master Direction, item 1) — and it
explicitly forbids using that remittance to fund margin or cover a margin call at a
foreign broker. **An Indian resident cannot legally open a leveraged US brokerage
account funded through LRS.** Whatever this population does, it is not doing it on
borrowed buying power from a US broker.

### 0b. The old US floor this would have run into is gone — but it never would have mattered here

FINRA Regulatory Notice 26-10, `finra.org/rules-guidance/notices/26-10`, read in full:

> *"FINRA has adopted new intraday margin standards to replace in their entirety the
> outdated day trading margin requirements, including the day trade count requirements
> for designating a customer as a 'pattern day trader' and the $25,000 pattern day
> trader minimum equity requirement... The effective date of the amendments is June 4,
> 2026."*

**The classic $25,000 floor for frequent margin day-trading is gone, as of four months
ago.** Named here for completeness and because it is recent enough to still be
circulating as received wisdom — but it never bore on this population specifically,
because 0a already rules out the margin account this rule used to gate.

### 0c. A cash account — the only LRS-compliant vehicle — has its own friction, from the US regulator's own glossary

`investor.gov`, SEC's own Cash Account glossary entry, read in full:

> *"In a cash account, an investor must pay for the purchase of a security before
> selling it. If an investor buys and sells a security before paying for it, the
> investor is 'freeriding' which is not permitted under Regulation T and may require the
> investor's broker to 'freeze' the investor's cash account for 90 days."*

**So the LRS-compliant path — a cash account, no margin — historically capped how many
times a trader could round-trip capital in one session**, because reusing sale proceeds
before they settle (T+1) risks exactly this violation. This is the friction that would
make Ross Cameron-style rapid, multi-name, same-day trading structurally different for
a cash-only account than for a margin-enabled one: not impossible, but capital-bound
rather than leverage-bound, and capped in trade frequency by settlement speed.

### 0d. Two named platforms Indian residents actually use have engineered around 0c, recently, without touching 0a

**Vested Finance** — the platform's own community post, dated and read in full,
`community.vestedfinance.com/t/an-update-on-your-vested-account-type/17162`, posted
2026-07-22:

> *"Over the coming weeks, we're moving all Vested accounts from cash accounts to
> zero-leverage margin accounts... 'Zero-leverage' means you still cannot borrow funds
> to trade, so it stays fully LRS-compliant... What the new account type unlocks:
> Unlimited day trading. In a cash account, how often you can buy and sell in a day is
> capped by how quickly your funds settle. The new account type removes that cap, so
> you can trade the same stock multiple times in a day. No good-faith violations...
> Margin accounts don't carry this restriction."*

**This is a structural workaround, not a leverage grant, and it says so of itself.** The
US broker classifies the account as "margin" for FINRA's settlement-cycle purposes
while extending zero actual leverage — the same $1-in-$1-out buying power as a cash
account, just without the same-day reuse cap. **Rolled out in phases starting July
2026, two months before this research**, timed directly after FINRA's own PDT-rule
replacement (§0b) took effect.

**Vested's own pricing page**, read in full, `vestedfinance.com/pricing`, lists **"Micro
Cap," "Small Cap"** and **"Popular OTC Stocks"** among its named stock categories, and
offers **Extended Hours Trading** as a feature on both its plans — **this is not a
platform confined to large-cap ETFs; the small-cap and OTC universe the desk's own
audience trades is explicitly served.**

**INDmoney** — the platform's own US-stocks intraday product page, read in full,
`indmoney.com/us-stocks/intraday-trading`:

> *"On INDmoney, you can buy and sell the same US stock or ETF multiple times within a
> single trading session. There are no daily trade caps. When you sell a position, the
> buying power from that sale is available right away for your next trade... INDmoney's
> US stock investing platform operates as a Global Access Provider, regulated by IFSCA
> in GIFT City. All trades are executed under the RBI's Liberalised Remittance Scheme
> (LRS) framework. You can trade across 9,000+ US stocks."*

**A different regulatory structure (IFSCA / GIFT City) reaching the same practical
result** — unlimited same-day round trips, no settlement wait — again without a claim of
borrowed leverage on this specific page. **A named contradiction, reported rather than
resolved:** a separate INDmoney page surfaced in the same search advertises *"Trade
2000+ Intraday stocks with up to 5X buying power"* — its URL pattern (`indmoney.com/
stocks/...`, no `us-` prefix, distinct from the US-stocks page's `/us-stocks/...`)
suggests this is INDmoney's **domestic Indian-market** intraday-margin product, not its
US offering, and the page itself would not load in this session to confirm directly.
**Named as unconfirmed rather than asserted either way** — the two products should not
be conflated, and this document does not claim INDmoney offers leveraged US intraday
trading, only that a same-named platform sells two different intraday products and a
casual search could confuse them.

### 0e. What this settles, precisely

**As of this research, an Indian resident can legally and practically day-trade
US-listed small-cap stocks — repeatedly, same-day, across names — through at least two
named platforms, without leverage, funded under LRS.** This was a materially harder
claim to make as recently as mid-2026, before Vested's rollout. **What it does not
settle:** whether anyone actually does this at the pace, style and target universe this
product serves (§§1–3), and whether the capital-bound (not leverage-bound) nature of
the access changes what "momentum trading" looks like for this population relative to
a US resident's margin-enabled version of the same style — a real difference in risk
profile this document names rather than resolves.

---

## 1. POPULATION A — DAY TRADERS IN INDIA, THE EASIEST NUMBER TO FIND AND THE ONE MOST LIKELY TO BE MISREAD AS AN ANSWER TO C

**The most-published number is for equity DERIVATIVES (F&O), not day trading of cash
equities, and not US equities at all.** SEBI published *"Profitability of Individual
Traders in the Equity Derivatives Segment (FY25–FY26)"* in August 2026. **This seat could
not open the primary PDF in this session** — the URL surfaced by search returned a
"Page does not exist" error at `sebi.gov.in`, and this document does not substitute a
secondary source's number for a primary one it labels as read. **What secondary
reporting says, with a discrepancy reported rather than resolved:**

- **Economic Times (`cfo.economictimes.indiatimes.com`, 2026-08-21) and Open Magazine
  (2026-08-20):** active individual derivatives traders fell from **98.1 lakh in FY25
  to 78.6 lakh in FY26** — a ~20% decline.
- **Forbes India (via Facebook, dated within the last two weeks of this research):**
  the number of individual traders fell 18 percent to **87.5 lakh in FY26**.

**Two secondary sources reporting the same SEBI study give different FY26 figures — 78.6
lakh (7.86 million) against 87.5 lakh (8.75 million).** Neither this document nor either
source resolves it; it is named so nobody downstream treats either number as settled.

**And regardless of which figure is right, it answers population A only loosely and
does not reach B or C at all.** Equity F&O is leveraged derivatives trading on the
**Indian** market — a different instrument, a different market, and a population that
overlaps with "day traders" without being identical to it (an F&O trader may hold
positions for days or weeks; SEBI's own study title is about *profitability*, not
holding period). **This is exactly the trap Integration named going in: a published
"India has N million traders" answers a question about scale on the Indian derivatives
market, and it will read as an answer to "US small-cap momentum traders" if quoted
without its population attached.** It is not that answer, and this document does not
use it as one.

---

## 2. POPULATION B — MOMENTUM TRADERS AMONG THEM, SEARCHED FOR AND NOT FOUND

**Searched directly, not assumed away.** No public source — no publication, no platform
disclosure, no community with published membership numbers — was found describing a
population of "momentum traders" in India as a distinct, counted group, in any market.
**"Momentum trader" is a style, not a registered status; it appears in no regulatory
filing, no exchange membership category, and no platform's own published user
segmentation.** Consistent with Integration's own framing before any research ran: **a
style is not a measurable fact from public sources, and this document does not
substitute a proxy for it without saying so.**

**One candidate proxy was searched for and rejected as too thin to report as evidence:**
search-term and community activity for US small-cap momentum-trading education
specifically among Indian traders. The search (`"US small cap" momentum trading course
OR community India traders`) returned an ETF ticker (Invesco's S&P SmallCap Momentum
ETF, ticker XSMO — not a trading style, a fund), a New Zealand-based trader's Reddit
post (not Indian), general small-cap market commentary with no India angle, and a
handful of unrelated financial-services results. **Nothing on the first page of results
named an Indian audience or community organized around this specific style.** That is
an absence in what a search surfaces, not a measurement of what exists — the desk's own
standing rule that a sound negative is a fact about the instrument, not about the world,
applies here exactly: **this search did not find evidence of the population; it did not
establish that the population is small.**

---

## 3. POPULATION C — US SMALL CAPS SPECIFICALLY, WHERE THE RAIL EXISTS AND THE DEMAND EVIDENCE DOES NOT

**§0 already establishes that the rail exists and reaches the right universe.** Both
named platforms list thousands of US-listed names (Vested; INDmoney's *"9,000+ US
stocks"*), and Vested's own category list names Micro Cap, Small Cap and OTC explicitly
— **this is not a platform limited to mega-cap ETFs and blue chips; the instrument this
product's audience trades is reachable from India today.**

**What is not published anywhere this seat could find: which names get traded, at what
frequency, or in what market-cap band, by these platforms' Indian user base.** Neither
Vested nor INDmoney publishes a breakdown of trading activity by strategy, holding
period, or target market-cap tier. **"Can" and "do" are different claims, and only the
first has public evidence behind it.**

---

## 4. WHAT COULD NOT BE ESTABLISHED

- **The FY26 count of active individual F&O traders in India, precisely** — two
  secondary sources disagree (78.6 lakh vs. 87.5 lakh) and the primary SEBI PDF could
  not be opened in this session to settle it. Named as a contradiction, not resolved.
- **Any registered, counted, or platform-disclosed population of "momentum traders" in
  India, in any market.** Searched for directly; not found. This may mean the
  population is genuinely small, or it may mean it is real and simply uncounted by
  anyone publishing publicly — this document cannot distinguish the two from here.
- **Whether Vested's and INDmoney's Indian users actually trade US small caps
  intraday, at what volume, or in what numbers.** The rail exists (§0, §3); usage of it
  for this specific style is not published by either platform.
- **Whether the second INDmoney page found in search (5X intraday margin) describes a
  domestic-market product, a different US product, or a stale/superseded page.** The
  page itself would not load in this session; named as unconfirmed rather than folded
  into either reading of the US-stocks findings.
- **Any direct evidence of Warrior Trading-style momentum-education content reaching an
  Indian audience specifically** — not searched exhaustively (a platform-level
  disclosure of viewer geography is not the kind of thing search surfaces, and checking
  it would mean opening individual creators' own analytics, which are not public). Named
  as not pursued rather than checked-and-negative.

---

## 5. WHAT THIS SEAT RECOMMENDS

**Not a market-sizing number — none of the three populations can be sized to the
precision "large" would require, from public sources, and this document does not
manufacture one.** Two things worth his knowing, because they are findings rather than
mechanics.

1. **The premise that would have made this question moot three months ago no longer
   holds.** An Indian resident can now practically day-trade US small caps repeatedly,
   same-day, without leverage, through named platforms already in wide domestic use.
   **This does not confirm a large momentum-trading population — it removes the
   strongest reason to assume there couldn't be one, and it is recent enough that public
   evidence of uptake, if any exists, would not yet have caught up to it.**
2. **The honest gap is "do they," not "can they," and public sources cannot close it.**
   Closing it would mean either a market-research vendor's India-specific trading-app
   usage data (a paid report, not a public page) or a direct question to a platform like
   Vested or INDmoney about their users' strategy and market-cap-tier breakdown — **and
   both are enquiries, which are his, exactly as with every vendor question on this
   desk's licence and feed landscape.** This document does not recommend making either
   enquiry; it names them as the only paths past what public documents can answer.

---

## 6. SOURCES

All read in this session, 2026-09-26 19:20–22:50 UTC:
`rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=10192` (Master Direction – Liberalised
Remittance Scheme, updated 2024-09-06); `finra.org/rules-guidance/notices/26-10`
(Regulatory Notice 26-10, published 2026-04-20); `investor.gov/introduction-investing/
investing-basics/glossary/cash-account`;
`community.vestedfinance.com/t/an-update-on-your-vested-account-type/17162` (posted
2026-07-22); `support.vestedfinance.com` (KB article, "Can I do Intraday trading? Will
Vested provide any margin like my Indian broker?", last updated ~2 years prior to this
research — read for its RBI/LRS citation, superseded in practice by the July 2026
account-type change); `vestedfinance.com/pricing`; `indmoney.com/us-stocks/
intraday-trading`; `indmoney.com/stocks/intraday-trading` (attempted, did not render);
secondary reporting on SEBI's August 2026 derivatives study —
`cfo.economictimes.indiatimes.com`, `openthemagazine.com`, and a Forbes India post
via Facebook, all dated 2026-08-20/21; a general web search for Indian US small-cap
momentum-trading communities, returning no on-point result.
