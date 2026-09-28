# "This can't happen" — the newswire coverage landscape, for maximum small-cap coverage

**Written by Commercial, 2026-09-28 (checks run 10:45–13:30 UTC), against `aba6e2b`.**
His words, verbatim, via Integration: *"let's make sure we don't limit it to alpaca, we
need as much coverage as possible... this release i just copied to you came from
warrior trading (which is a trding view product). im not sure if htey get their news
form somewhere else, but we need to know we have the right sources to get the most
coverage. this can't happen."* **Scope only. No vendor contacted, no account created,
no trial, nothing signed or paid — all of that is his.** Terms quoted, not
characterised.

**CORRECTED 2026-09-28, Integration's catch, before this reached him — the first
draft's headline overclaimed, and the fix changes what he is told about the specific
question he asked.** The short answer is narrower than "Warrior Trading is closed":
**TradingView itself is closed to this desk as a source, at any price — that part is
established and unchanged below.** What is *not* established is whether Warrior
Trading's Scanner (the feature that surfaced the MEDS alert) actually runs on
TradingView's news. Warrior Trading's own operative disclaimer names no vendor for
its Scanner at all (§3a). **So his own question — "im not sure if htey get their news
form somewhere else" — is not answered here; it remains open, correctly, rather than
answered on an assumption this document did not check.** What the desk *can* do
regardless of that answer: pursue a direct licence with the aggregator whose data
Alpaca News already reaches in an unknown fraction, and which is confirmed — not
merely inferred — to already carry at least some third-party wire content (§1, the
AIFF control). That option, priced by enquiry, is named below as the one with the
most promise per dollar — not chosen, not contacted.

---

## 1. THE CASE, RE-STATED FROM WHAT WAS GIVEN

**MEDS, 2026-09-28 — the absent case.** ACCESS Newswire release, *"DataMeds AI and
Tollo Health Announce Launch of 'Health Lives Here' Mobile Application,"* dated
today. He read it in Warrior Trading's scanner before 06:18 ET. **Not in Alpaca
News** — Ops's read-only query found 90 items since 00:00 ET, all Benzinga, zero
hits on MEDS. The desk's own why-now for MEDS was a 12-day-old 8-K.

**AIFF, 2026-09-25 — the present control, added here per Integration's catch.**
`docs/threads/research.md:271-291`. A GlobeNewswire release Benzinga *did* carry —
at 07:47:17, **44 seconds before the desk's own research job (job 5000) queued and
started** at 07:48:01, and well ahead of the 07:53 read on a competing scanner.
**CORRECTED, Integration's second catch: this is a desk-internal gap — Benzinga-time
to the desk's own job-queue-time — never a measurement against Ops's coverage query
window (07:00–10:00 ET, unrelated), which the earlier draft wrongly named.**
**Carried inside Ops's five-session union query as a known-present control and
returned `primary=YES`, in the `benzONLY` column.**
One filter-trap fact worth carrying alongside it: the item's own `source` field
reads `"benzinga"`, never `"globenewswire"` — **the originating wire leaves no trace
downstream, so a collector filtering by wire name would return nothing and look
exactly like no coverage**, the same failure shape MEDS produced from the other
direction.

**Ops's measured baseline, cited as Ops's own figure and re-labelled here by column,
because the three numbers as first written implied an impossible relationship
(CORRECTED, Integration's catch) — a union cannot be smaller than one of its own
parts, and the way this document first stated them read that way.** Precisely, per
`research.md:280-306`:

| figure | population | what it counts |
| --- | --- | --- |
| **~23% primary** | Benzinga alone, top-12, 5 sessions | single-symbol Benzinga items only (excludes roundups) |
| **~47% any mention** | Benzinga alone, same population | includes roundup/listicle mentions — **never unioned with anything; a Benzinga-only figure both times** |
| **~34%** | issuer feed alone, same population | the desk's existing wire-scraping path |
| **~44% union** | issuer feed **primary** ∪ Benzinga **primary** | **excludes the 47% any-mention column entirely** — the union is of the two PRIMARY columns only |

**This document maps what would close the gap between the 44% union and full
coverage, not whether it will.**

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

### 3a. TradingView is closed; whether Warrior Trading's SCANNER runs on it is not established — CORRECTED, two claims separated

**The first draft of this section conflated two different things: what TradingView
itself publishes, and what Warrior Trading has said about where its own Scanner gets
its news. Only the first was actually checked. Corrected — the two are kept
separate below, because his own question was specifically about the second.**

**What TradingView publishes about itself, confirmed:** a search of TradingView's
own news pages turns up direct wire attribution across many sources — Reuters, PR
Newswire, Dow Jones Newswires, and, in results surfaced this session, **ACCESS
Newswire and Newsfile Corp by name**, e.g. a TradingView news page crediting
*"Actualités par ACCESS Newswire sur TradingView"* and another citing *"Newsfile
Corp"* directly. **TradingView's own "Top providers" listing on `tradingview.com/
news` names, among others: Reuters, MarketWatch, Dow Jones Newswires, Trading
Economics, ShareCast, dpa-AFX, Mace News, Business Wire, TradingView (own), Seeking
Alpha.** Several (Dow Jones Newswires items) are gated behind *"Start a free trial
to read this news"* — evidence of a paid licensing relationship, not scraped
content. **And TradingView's own Terms of Use bar exactly the thing this task would
need to do with it, in the broadest language found in this entire research
effort** (`tradingview.com/policies`):

> *"...charts, alerts, webhooks, and any other forms of information, are licensed for
> exclusive display-only use. This license is strictly limited to personal or
> internal business purposes and explicitly prohibits any form of non-display
> usage... it is hereby explicitly prohibited for any third party to create, offer,
> or operate any product or service that: Utilizes, repurposes, or relies upon
> TradingView's market data, including but not limited to charts, alerts, webhooks,
> and any forms of information provided by TradingView... Such prohibited cases also
> include creating products or services based on TradingView content."*

**This part is fully settled: TradingView is not a buyable coverage source at any
price this seat could find, regardless of anything else in this section.** No
public TradingView news-API product for third parties exists either — what's public
is a charting/Datafeed API for price data, not a licensable news feed.

**What is NOT established, and this document first asserted it anyway: whether
Warrior Trading's Scanner — the feature that actually surfaced the MEDS alert to
him — runs on TradingView's news at all.** Checked directly, Warrior Trading's own
operative Disclaimer page (`warriortrading.com/disclaimer`, not a blog post),
verbatim:

> *"Data, content and information presented or available within the Scanner,
> Charts, and Simulator is provided to us by third-party providers."*

**No vendor is named — "third-party providers," plural, unidentified, for the
Scanner specifically.** Separately, Warrior Trading's founder has confirmed
TradingView by name, repeatedly, in his own blog posts (*"my platform TradingView,"*
*"courtesy of TradingView"*) — but every instance found is about **charts**, never
the **Scanner's news feed** specifically, and the Disclaimer groups "Scanner,
Charts, and Simulator" as three items that may draw from different providers, not
one. **So his own question — "im not sure if htey get their news form somewhere
else" — is answered correctly by leaving it open: TradingView is confirmed for
charts and confirmed closed as a licence; what actually powers the Scanner's news is
not established by anything published.** An enquiry to Warrior Trading itself would
be the only way past this, and an enquiry is his, not this document's.

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

**ADDED 2026-09-28, HIS OWN QUESTION — "if alpaca includes benzinga, what's the use
of a direct license if all our market data comes from alpaca?" — and this belongs
first, above the coverage argument, because it is the confirmed reason, not the
inferred one.** **The licence, not the content, is what's broken today.** Alpaca's
own Terms & Conditions (`2026-09-25-newswire-licence-landscape.md`, quoted in full
there) do not carve News out as a separate product from the market data — it sits
on the identical clause: *"Content is provided exclusively for personal and
noncommercial access and use... No part of the Service or Content may be copied,
reproduced, republished... for any commercial enterprise, without Alpaca's express
prior written consent."* **So even if the Benzinga content arriving through Alpaca
were the complete Benzinga feed, byte for byte, it could not legally be built into a
paid feature — it is licensed to this desk personally, the same restriction that
already blocks the SIP tape.** A direct Benzinga licence would matter for this
reason alone, regardless of whether it adds a single new wire: Benzinga sells this
commercially (its own API contact form asks "Business" or "Personal" up front),
where Alpaca's bundle does not.

**The coverage question below is separate and unconfirmed — a possible second
reason, not the load-bearing one.** The desk's Alpaca News (already documented,
`2026-09-25-newswire-licence-landscape.md`) is 100% Benzinga-sourced but reaches the
desk through Alpaca's own free/bundled News API, not a direct Benzinga licence.

**And this is not pure inference — §1's AIFF control is direct, measured evidence
that the bundle already carries at least some third-party wire content: a
GlobeNewswire release, present in the desk's own Benzinga feed, tagged
`primary=YES`.** **CORRECTED, Integration's catch: this document originally claimed
a specific Benzinga-vs-wire latency here. Nothing in the source measures the wire's
own publish time — `research.md:293` states latency is explicitly NOT measured, one
sample, and even that sample is the desk's own internal gap (§1), not a wire-to-
Benzinga one. Dropped rather than stated on a number that was never taken.** What
remains inference,
named as such rather than blurred into the measured part: **whether the FULL scope
Benzinga Pro's own marketing claims — "1,000+ sources" — extends to a *direct*
licence at a scale beyond what Alpaca's bundle already carries, and whether that
scope specifically includes ACCESS Newswire or Newsfile.** Neither is confirmed;
Benzinga's own API product page (`benzinga.com/apis`, already read in the prior
landscape) lists **"Press Releases"** as a named product line and gives no public
price or source list — `licensing@benzinga.com`, an enquiry, his.

---

## 4. RANKED BY COVERAGE GAINED PER DOLLAR, AGAINST THE ~44% UNION

**No price is available for the two options that matter most, so "per dollar" is
ranked by what is knowable — access at all, and how many wires one relationship
would add — with cost named as unknown-pending-enquiry rather than guessed.**

| option | adds coverage of | cost | access today |
| --- | --- | --- | --- |
| **Direct Benzinga API licence** (vs. the Alpaca bundle) | **The licence, confirmed, is the primary reason, not coverage:** Alpaca's own T&Cs restrict News to personal/non-commercial use, identically to the SIP tape — a direct licence is the only path to using ANY of this content in a paid feature, before coverage is even asked. Coverage itself: **confirmed** to already carry at least some third-party wire content (§1, the AIFF/GlobeNewswire control, measured) — full source list and whether it extends to ACCESS Newswire or Newsfile specifically, unpublished, unconfirmed | Unpublished; enquiry only | Already partially in hand, but not usable in a paid product under its current terms |
| **Direct ACCESS Newswire relationship** | The one wire confirmed to have caused today's miss | No published terms or price found at all | None — not even terms exist to read |
| **Direct Newsfile relationship** | Canadian/junior-issuer coverage, a plausible top-12 contributor | Standard non-commercial personal-use terms found; no commercial product found | None |
| **TradingView, directly** | Nothing — **closed by its own terms, at any price** | N/A | Not obtainable this way |
| **Warrior Trading's actual Scanner source** | **Unknown** — not established as TradingView or anything else; only an enquiry to Warrior Trading itself would settle it, and that enquiry is his | Unknown | Unknown |
| **PR Newswire / Business Wire / GlobeNewswire, direct** | Already mapped (`977e0d2`); same personal-use bar as ACCESS/Newsfile | PR Newswire names a contact (Content Distribution Group); the other two, none found | None |

**The single highest-value next step this document can point at, without picking it:
find out what Benzinga's direct licence actually costs and how far it actually
extends, because it is the one option with a MEASURED reason to expect "one
relationship, many wires" rather than "one relationship, one wire" — not a marketing
number alone.** Everything else on this list is either legally closed (TradingView),
unestablished (Warrior Trading's actual source), or requires a separate enquiry per
wire with no volume discount in sight.

---

## 5. WHAT THIS DOES NOT SETTLE, AND WHO DOES

- **Whether a direct Benzinga licence's source list actually includes ACCESS Newswire,
  Newsfile, or any other specific wire.** Not published anywhere found. Only an
  enquiry answers it, and an enquiry is his.
- **Whether Warrior Trading's Scanner specifically runs on TradingView's news, or on
  a different, unnamed third-party provider.** Warrior Trading's own operative
  disclaimer names none. His own original question — where does Warrior Trading
  actually get its news — is not answered by this document; only an enquiry to
  Warrior Trading would settle it, and that enquiry is his.
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
GlobeNewswire/Alpaca, not re-quoted here); `docs/threads/research.md:271-306` (the
AIFF control, the union figures, the filter-trap finding — Ops's and Research's own
measurements, cited not re-derived); `accessnewswire.com/terms-of-service`
(re-read); `accessnewswire.com/robots.txt`; `newsfilecorp.com/TermsOfUse.php`;
`newsfilecorp.com` (blog, AI-crawler-activity posts, read for context not as a
grant); `tradingview.com/news`, `tradingview.com/news-flow`,
`tradingview.com/policies` (Terms of Use, the display-only/no-product-building
clause); `warriortrading.com/disclaimer` (the Scanner/Charts/Simulator
third-party-providers clause, its own operative page, not a blog post); Warrior
Trading blog posts naming TradingView for charts specifically (found via
site-search, not the disclaimer); `benzinga.com/pro/pricing`; `benzinga.com/apis`
(already read in the prior landscape). His words verified via `list_events` on the
Integration session, not taken from the relay alone. All read directly in this
session; public sources only, nothing signed up for, no vendor contacted.
