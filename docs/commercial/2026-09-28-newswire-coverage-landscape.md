# "This can't happen" — the newswire coverage landscape, for maximum small-cap coverage

**Written by Commercial, 2026-09-28 (checks run 10:45–13:30 UTC), against `aba6e2b`.**
His words, verbatim, via Integration: *"let's make sure we don't limit it to alpaca, we
need as much coverage as possible... this release i just copied to you came from
warrior trading (which is a trding view product). im not sure if htey get their news
form somewhere else, but we need to know we have the right sources to get the most
coverage. this can't happen."* **Scope only. No vendor contacted, no account created,
no trial, nothing signed or paid — all of that is his.** Terms quoted, not
characterised.

**The short answer: the desk cannot get to Warrior Trading's coverage by copying
Warrior Trading, because the platform underneath it explicitly, contractually bars
building a product from its content — Warrior Trading's own edge is a *licence*, not
a *technique*.** What the desk *can* do is close the gap a different way: a direct
licence with the aggregator whose data Alpaca News already reaches in an unknown
fraction. That option, priced by enquiry, is named below as the one with the most
promise per dollar — not chosen, not contacted.

---

## 1. THE CASE, RE-STATED FROM WHAT WAS GIVEN

**MEDS, 2026-09-28.** ACCESS Newswire release, *"DataMeds AI and Tollo Health
Announce Launch of 'Health Lives Here' Mobile Application,"* dated today. He read it
in Warrior Trading's scanner before 06:18 ET. **Not in Alpaca News** — Ops's
read-only query found 90 items since 00:00 ET, all Benzinga, zero hits on MEDS. The
desk's own why-now for MEDS was a 12-day-old 8-K. **Ops's measured baseline, cited as
Ops's own figure, not re-derived here:** across five sessions of the top-12 names,
Benzinga carries roughly 23% of catalysts as the primary source, roughly 47% any
mention, and the union with the issuer-feed path is roughly 44%. **This document maps
what would close that gap, not whether it will.**

---

## 2. PRIMARY WIRES SMALL CAPS USE — WHAT'S NEW SINCE THE 2026-09-25 LANDSCAPE

**`2026-09-25-newswire-licence-landscape.md` (`977e0d2`) already covers PR Newswire,
Business Wire and GlobeNewswire in full — quoted there, not re-quoted here.** All
three: personal/non-commercial use only, automated redistribution barred without
written consent. Two more checked now, because the MEDS case named one directly and
the top-12 population plausibly uses the other.

### 2a. ACCESS Newswire — the wire that carried MEDS

**No reader-facing terms of use were found anywhere on the site** — the only Terms
of Service discoverable (`accessnewswire.com/terms-of-service`, already read in the
day-pass research) governs the *issuer* who pays to distribute, defines "Customer" as
the paying company, and never addresses a third party's rights to the content it
distributes. **That gap stands, unresolved, exactly as recorded before.**

**New this session, and it points the same direction with a different kind of
evidence — the site's own `robots.txt`, read directly:**

> *"User-agent: *  ...  Disallow: /admin/  Disallow: /users/  Disallow: /manage/
> Disallow: /account  Disallow: /api  Disallow: /lists  Disallow: /cron
> Disallow: /admin  Disallow: /users  Disallow: /rss  Disallow: /rss2
> Crawl-delay: 5"*

**`/rss`, `/rss2` and `/api` are explicitly disallowed for every user agent, with a
five-second crawl delay on whatever remains.** A `robots.txt` entry is not itself a
licence term — it is the operator's own stated preference, not a contract — but
combined with the absence of any published reader terms, it is the second signal
this seat has found, not the first, pointing away from unlicensed automated access.
**No published path to a commercial feed was found on the site.**

### 2b. Newsfile Corp (TMX Newsfile) — a Canadian/junior-issuer wire likely in the
top-12 population

Owned by TMX Group (the Toronto Stock Exchange operator). **Terms of Use**
(`newsfilecorp.com/TermsOfUse.php`), read in full:

> *"TMX Newsfile grants to you a limited non-exclusive, non-transferable license to
> view and print the material on the Website for your non-commercial or personal use
> only... you may not use, distribute, sell, modify, transmit, revise, reverse
> engineer, republish, post or create derivative works... without TMX Newsfile's
> prior written consent."*

**Same shape as every primary wire checked so far** — personal use, no
redistribution, no automated commercial use, without a written agreement. **Notable
tension, named rather than resolved:** Newsfile's own blog publishes analysis of *"AI
crawler activity"* across its releases and frames machine-readability as a selling
point to issuers — but that is a claim about *search and AI-discovery* traffic
benefiting the issuer's visibility, not a grant of redistribution rights to a
commercial product, and the Terms of Use is unchanged by it.

**TheNewswire was not separately checked** — named in the brief as a possible top-12
source; not reached this session. See §6.

---

## 3. WHAT COMPETING SCANNERS ACTUALLY USE — FROM WHAT THEY PUBLISH

### 3a. TradingView / Warrior Trading — the proximate case, and the answer is structural, not technical

**His own framing is confirmed: Warrior Trading is built on TradingView.** A search
of TradingView's own news pages turns up direct wire attribution across many
sources — Reuters, PR Newswire, Dow Jones Newswires, and, in results surfaced this
session, **ACCESS Newswire and Newsfile Corp by name**, e.g. a TradingView news page
crediting *"Actualités par ACCESS Newswire sur TradingView"* and another citing
*"Newsfile Corp"* directly in a company disclosure notice. **TradingView's own "Top
providers" listing on `tradingview.com/news` names, among others: Reuters,
MarketWatch, Dow Jones Newswires, Trading Economics, ShareCast, dpa-AFX, Mace News,
Business Wire, TradingView (own), Seeking Alpha.** Several of these (Dow Jones
Newswires items) are gated behind *"Start a free trial to read this news"* —
evidence of a paid licensing relationship, not scraped content.

**And TradingView's own Terms of Use bar exactly the thing this task would need to
do with it, in the broadest language found in this entire research effort — read in
full, `tradingview.com/policies`:**

> *"...charts, alerts, webhooks, and any other forms of information, are licensed for
> exclusive display-only use. This license is strictly limited to personal or
> internal business purposes and explicitly prohibits any form of non-display
> usage... it is hereby explicitly prohibited for any third party to create, offer,
> or operate any product or service that: Utilizes, repurposes, or relies upon
> TradingView's market data, including but not limited to charts, alerts, webhooks,
> and any forms of information provided by TradingView... Such prohibited cases also
> include creating products or services based on TradingView content."*

**This settles the question the assignment opened with. TradingView is not a
buyable coverage source at any price this seat could find — it is contractually
closed to exactly the use this desk would make of it.** Warrior Trading's coverage
is not a technique the desk can copy; it is downstream of a licensing relationship
between Warrior Trading and TradingView that a third party (this desk) cannot
independently obtain by reading TradingView's own published terms. **No public
TradingView news-API product for third parties was found either** — searched
directly; what exists publicly is a charting/Datafeed API for price data, not a
licensable news feed.

### 3b. Benzinga Pro — a terminal, not a feed, and a clue about what the desk is already under-buying

**Benzinga Pro (`benzinga.com/pro/pricing`) is a human-facing trading terminal
product** — chat rooms, a scanner, audio squawk, watchlists — **not an API and not
something this desk could integrate.** Its own marketing claims, read directly and
quoted because they bound the vendor's own coverage claim, not because they are
taken as fact:

> *"Real-Time Feed From 1,000+ Sources... Wire Exclusives 5-15 Minutes Before
> Mainstream Sources."*

Pricing tiers, annual-discounted monthly equivalents shown on the page: **Basic
$30.58/mo, Streamlined $124.75/mo, Essential $166.42/mo** — a 14-day free trial
offered (not used; not this seat's to start).

**Why this matters even though Pro itself isn't buyable-as-infrastructure: it is
evidence about Benzinga's own underlying data, which DOES have an API product this
desk already partially uses.** The desk's Alpaca News (already documented,
`2026-09-25-newswire-licence-landscape.md`) is 100% Benzinga-sourced but reaches the
desk through Alpaca's own free/bundled News API, not a direct Benzinga licence. **If
Benzinga Pro's retail terminal claims 1,000+ real-time sources, it is a reasonable
inference — not confirmed, and named as inference — that a direct Benzinga API
licence would carry materially more than whatever slice currently arrives bundled
through Alpaca.** Benzinga's own API product page (`benzinga.com/apis`, already read
in the prior landscape) lists **"Press Releases"** as a named product line and gives
no public price — `licensing@benzinga.com`, an enquiry, his.

---

## 4. RANKED BY COVERAGE GAINED PER DOLLAR, AGAINST THE ~44% UNION

**No price is available for the two options that matter most, so "per dollar" is
ranked by what is knowable — access at all, and how many wires one relationship
would add — with cost named as unknown-pending-enquiry rather than guessed.**

| option | adds coverage of | cost | access today |
| --- | --- | --- | --- |
| **Direct Benzinga API licence** (beyond the Alpaca bundle) | Unknown exact source list, but Benzinga Pro's own claim of 1,000+ sources and a named "Press Releases" product line suggest it likely already includes ACCESS Newswire, Newsfile and others the desk currently misses — **one relationship, many wires** | Unpublished; enquiry only | Already partially in hand (Alpaca bundles a slice); a direct licence is the upgrade |
| **Direct ACCESS Newswire relationship** | The one wire confirmed to have caused today's miss | No published terms or price found at all | None — not even terms exist to read |
| **Direct Newsfile relationship** | Canadian/junior-issuer coverage, a plausible top-12 contributor | Standard non-commercial personal-use terms found; no commercial product found | None |
| **TradingView (directly, or by replicating Warrior Trading's approach)** | Nothing — **closed by its own terms, at any price** | N/A | Not obtainable this way |
| **PR Newswire / Business Wire / GlobeNewswire, direct** | Already mapped (`977e0d2`); same personal-use bar as ACCESS/Newsfile | PR Newswire names a contact (Content Distribution Group); the other two, none found | None |

**The single highest-value next step this document can point at, without picking it:
find out what Benzinga's direct licence actually costs and actually covers, because
it is the one option where "one relationship, many wires" is plausible rather than
"one relationship, one wire."** Everything else on this list is either legally closed
(TradingView) or requires a separate enquiry per wire with no volume discount in
sight.

---

## 5. WHAT THIS DOES NOT SETTLE, AND WHO DOES

- **Whether a direct Benzinga licence's source list actually includes ACCESS Newswire,
  Newsfile, or any other specific wire.** Not published anywhere found. Only an
  enquiry answers it, and an enquiry is his.
- **What either a Benzinga direct licence or an ACCESS Newswire relationship would
  cost.** Both enquiry-gated, both his to start if he wants a number.
- **Whether Research's collector, built source-agnostic per Integration's brief, can
  ingest a second source cheaply once one is chosen.** Research's to answer, not
  this seat's.

## 6. WHAT COULD NOT BE ESTABLISHED

- **TheNewswire** — named in the brief, not reached this session. No terms read, no
  coverage claim checked.
- **The exact composition of Benzinga's 1,000+ claimed sources.** A marketing
  number, quoted as the vendor's own claim, not verified against a published list —
  none was found.
- **Whether any wire not yet checked (state-specific microcap wires, an OTC-focused
  service) contributed to the ~56% Ops's baseline currently misses.** This document
  covers the wires named in the brief and the ones the MEDS case pointed at directly;
  it does not claim to be exhaustive of every possible source.

## 7. SOURCES

`docs/commercial/2026-09-25-newswire-licence-landscape.md` (`977e0d2`, PRN/BW/
GlobeNewswire/Alpaca, not re-quoted here); `accessnewswire.com/terms-of-service`
(re-read); `accessnewswire.com/robots.txt`; `newsfilecorp.com/TermsOfUse.php`;
`newsfilecorp.com` (blog, AI-crawler-activity posts, read for context not as a
grant); `tradingview.com/news`, `tradingview.com/news-flow`,
`tradingview.com/policies` (Terms of Use, the display-only/no-product-building
clause); `benzinga.com/pro/pricing`; `benzinga.com/apis` (already read in the prior
landscape). His words verified via `list_events` on the Integration session, not
taken from the relay alone. All read directly in this session; public sources only,
nothing signed up for, no vendor contacted.
