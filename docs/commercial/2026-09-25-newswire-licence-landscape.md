# The newswire source — vendor landscape, terms and cost, from public documentation only

**Written by Commercial, 2026-09-25 (checks run 2026-09-25 18:05–22:20 UTC), against `2deca73`.**
Integration's brief, in his own words relayed through it: *"somebody needs to research
newswire source."* Routed here first, ahead of Research, because Ops's AIFF finding
established the gap is a correctness failure — the issuer feed cannot carry a wire-only
release by construction — and the licence question decides whether a pipeline built to
close it is buildable at all, the same reasoning that put the feed-licence landscape
ahead of the board build in September. **Public sources only. Nothing registered, no
account created, no vendor contacted, no payment method entered.** Every quotation below
was read from the vendor's own published page in this session; none is characterised
without the text beside it.

**The question asked and not asked.** This document maps whether a commercial product
may fetch, store and act on wire-service content — it does not design the pipeline
(Research's, once a source is named) and it does not cost the model spend of reading a
release (already measured: DISCOVERY is the desk's cheapest stage by token share, so a
deterministic feed displaces the cheapest thing on the bill, not the most expensive —
this is not a cost case, per Integration's instruction, and none is made here).

---

## 1. WHICH SERVICES EXIST AT THIS SCALE

Four primary wire services carry the volume of US small-cap and OTC issuer releases the
desk's universe trades on, plus one aggregator that already touches this desk's
accounts:

| service | what it is | already in the account |
| --- | --- | --- |
| **GlobeNewswire** (brand of Notified / EQS Group) | Primary wire; the AIFF release Ops found was on this network | No |
| **PR Newswire** (Cision) | Primary wire, largest by volume | No |
| **Business Wire** (Berkshire Hathaway) | Primary wire | No |
| **ACCESS Newswire** (f/k/a Issuer Direct / Accesswire) | Primary wire, historically the cheapest issuer-side tier and disproportionately used by OTC and micro-cap names — the desk's own population | No |
| **Benzinga** | Not a primary wire — originates its own newsdesk content and licenses/aggregates the primary wires (its own words: *"the largest News vendor to North American Brokerages"*) | **Yes, partially** — Alpaca's News API is 100% Benzinga-sourced (below) |

Two smaller networks — **Newsfile** (Canadian junior/OTC issuers) and **InvestorsHub /
other mining-and-resource wires** — turned up in GlobeNewswire's own syndication
boilerplate as third-party placements (§2, below) rather than as standalone primary
sources large enough to matter on their own; not separately checked.

---

## 2. WHAT THEIR TERMS PERMIT FOR A COMMERCIAL PRODUCT

**Read in the order that answers the question fastest: the two that say yes-with-a-price,
the two that publish nothing, the one already in hand.**

### 2a. PR Newswire — BARRED, explicitly, with a contact point

Terms of Use, `prnewswire.com/terms-of-use/`, last updated 2023-09-01. Two clauses,
read together:

> *"you agree that you will not do or assist any third party to do, any of the
> following: ... other than as explicitly stated herein or as posted elsewhere on the
> Site, reproduce, distribute, 'frame,' 'mirror,' 'scrape,' republish or retransmit
> information or content provided by PR Newswire or found on the Site without the
> express prior written permission of PR Newswire ... use any robot, spider, site
> search/retrieval application, or other manual or automatic device or process to
> access, search, download, retrieve, index or 'data mine' any content or data from the
> Site"*

And, defining "PR Newswire Materials" to include customer press releases by name:

> *"information and content provided by PR Newswire, including information and content
> submitted by PR Newswire's content suppliers, customers, contributors and
> moderators ... news releases, photographs and other information and content issued by
> PR Newswire customers ... you may access and use the PR Newswire Materials ... solely
> for your personal, noncommercial use ... you may not reproduce, modify, create
> derivative works from, display, perform, publish, distribute (including any
> electronic redistribution or database storage and retrieval), disseminate, broadcast
> or circulate to any third party ... without the express prior written consent of PR
> Newswire."*

**Automated retrieval and commercial reuse are both named and both barred**, with a
named contact point for permission: *"Inquiries concerning the use of PR Newswire text,
photos, images, video, audio and other content should be addressed to Content
Distribution Group, PR Newswire Association LLC, 200 Vesey Street, 19th Floor, New
York, New York 10281."* **That is an enquiry, and an enquiry is his**, same as every
vendor on the feed-licence landscape.

### 2b. Business Wire — the narrowest and most precisely drawn of the four

Terms of Use, `businesswire.com/legal/terms-of-use`, effective 2024-01-01:

> *"Use of the Business Wire Site is limited to submission of news releases for
> distribution via Business Wire Connect, retrieving RSS feeds, and the reading of
> releases, marketing, and other materials. You agree not to: (1) use the Business Wire
> Site for any other purposes, including, without limitation, to store, aggregate,
> reproduce, or distribute information available on the Site in any manner or to
> compete directly or indirectly with Business Wire ... (6) engage in commercial
> activities of any kind without the prior written consent of Business Wire."*

**This is the one vendor that names RSS retrieval as an explicitly permitted use** —
the act of pulling the feed is not itself the violation. What is barred is everything
mointel's pipeline would need to do with what it pulled: **store it, aggregate it,
reproduce it, or use it for any commercial purpose.** A worker that fetches Business
Wire's RSS, reads it, and discards it (no persistence, no product) would be inside this
clause; a worker that writes a row to `catalyst_dossiers` from it is not. **Reading and
keeping are different acts under this text, and the desk's own pipeline is built
entirely around keeping.**

### 2c. GlobeNewswire — no published terms found, at any of six places checked, and the feed itself is not one contract

Checked, in this session: the homepage footer (`globenewswire.com`, no Terms of Use
link — only Privacy Policy, routed to `notified.com/privacy`); the RSS feed listing
page (`globenewswire.com/rss/list`, same footer, no terms); the About page (no terms
link in body or footer); Notified's `legal-and-compliance` page (accessibility
statement, an AI ethics policy, and a Code of Ethical Business Conduct — none of it a
terms of use for site content); the site's former terms URL
(`globenewswire.com/en/terms-of-use`, now a 404); and the Wayback Machine, which has no
archived snapshot of that URL at any date. **A site-wide terms of use governing reuse
of GlobeNewswire content was not found where a fresh session would look for one.**

**And the feed is not legally uniform even if a blanket term existed.** A sample of
current GlobeNewswire releases carries this boilerplate, verbatim, varying by which
release it is on:

> *"Please see full terms of use and disclaimers on the AINewsWire website applicable
> to all content provided by AINW, wherever published or re-..."* — one release
>
> *"Please view full terms of use and disclaimers on the NNW website applicable to all
> content provided by NNW, wherever published or re-..."* — another

**AINW and NNW are third-party syndication networks** (AI NewsWire, presumably
NetworkNewsWire) whose paid placements ride on the GlobeNewswire feed alongside
ordinary corporate issuer releases, each carrying its own separate, unread terms.
**So "the GlobeNewswire feed" is not one contract; it is an unknown mix of ordinary
issuer releases and third-party syndicated placements, each potentially bound by
different, individually-unpublished terms** — a finding worth having on file before
anyone builds a parser that treats every item in the feed the same way.

**Absence of a found term is not a finding of permission** — this desk's own standing
rule, applied here exactly as the shared rules would apply it to a store returning a
zero: the gap could mean GlobeNewswire permits broad reuse (consistent with a
newswire's business model — the entire point of the product a company buys is broad
pickup) or it could mean the terms exist somewhere this seat did not find them.
**Neither is established; only the search is.**

### 2d. ACCESS Newswire (f/k/a Accesswire) — the only public document found is the issuer's contract, not a reader's

Terms of Service, `accessnewswire.com/terms-of-service`, last updated 2025-08-01 (page
header also shows "Last updated: August 26, 2026" — both dates present on the live
page, unreconciled, and neither this seat's to resolve). Read in full: it is a
Subscription and Services agreement between ACCESS and **"Customer,"** defined
throughout as the paying company that submits releases (`Section 1.0`–`7.0`: Sales
Orders, Permitted Users, Subscription Fees, Customer's Data). **It never addresses a
third party's rights to fetch, store or reuse the content ACCESS distributes on that
customer's behalf.** No separate reader-facing or website terms of use was found
anywhere else on the site. **Same gap as GlobeNewswire, for the same reason: the
published document answers a different question than the one this task asks.**

### 2e. Benzinga — a real commercial product, no published self-serve price

`benzinga.com/apis/`, read in full. Benzinga sells **"Press Releases"** as a named
product inside its own API suite (alongside a **"Free Stock News RSS Feed"**, a
different product from the paid one and not separately read here), describes itself as
*"the largest News vendor to North American Brokerages,"* and states an 84-terabyte
historical news archive and sub-0.1-second latency. **No price is published anywhere
on the page.** The only path to one is the quote-request form, gated on selecting
**"Business"** or **"Personal"** usage, addressed to `licensing@benzinga.com`. **That
is a vendor contact, and a vendor contact is his**, exactly as the market-data
landscape already established for Massive and Databento's enterprise tiers.

### 2f. Alpaca News (Benzinga, via the account already in hand) — checked because it looked like a free path and is not one

Alpaca's own docs (`docs.alpaca.markets/us/docs/historical-news-data`,
`docs.alpaca.markets/us/docs/streaming-real-time-news`) confirm the desk's existing
Algo Trader Plus account already carries a News API: real-time over the same
websocket-per-worker architecture as the bars stream, historical back to 2015, **"All
news data is currently provided directly by Benzinga."** The docs market it for
*"News Widgets ... to create visual news widgets for web and mobile apps"* — language
that reads as an invitation to display it in a product.

**That invitation does not survive Alpaca's own Terms and Conditions.** Read in full
(`files.alpaca.markets/disclosures/library/TermsAndConditions.pdf`, a PDF; fetched and
read with `pymupdf`, per the desk's standing method — `WebFetch` and a browser tab both
refuse this file as a direct download). "Content" is defined, in the general section,
to include **item (2), "general news and information, commentary, research reports,
educational material"** — News is not a separate regime, it is one more item on the
same list as the price data already documented. The controlling clause is unqualified
by content type:

> *"Content is provided exclusively for personal and noncommercial access and use. No
> part of the Service or Content may be copied, reproduced, republished, uploaded,
> posted, publicly displayed, encoded, translated, transmitted or distributed in any
> way (including 'mirroring') to any other computer, server, web site or other medium
> for publication or distribution or for any commercial enterprise, without Alpaca's
> express prior written consent."*

And the same 30-day notice provision the feed-licence landscape already found for
market data applies here without modification, because it is written about "the
Services and Content" generally, not about ticks specifically:

> *"Should you wish to use the Services and Content for any other purposes, including
> without limitation commercial usage, or making the Services and Content available to
> others through your own application (a 'User Application'), you shall provide Alpaca
> with 30 days advance written notice prior to making such User Application available
> to others."*

**So Alpaca News is bound by the same clause as the SIP tape, not a looser one.** The
"news widgets" marketing copy is aspirational language about what the API can technically
render, not a grant that overrides the Terms and Conditions it sits under. **Nothing new
here changes the feed-licence landscape's posture or its trigger** — this is one more
instance of "something moving" being the moment the 30-day notice is due, for News
exactly as for prices, on an account already in hand and already costing nothing extra
to read from.

---

## 3. COST, AND THE CHEAPEST LAWFUL SHAPE

**The honest answer is that no vendor here publishes a self-serve commercial price at
all**, and that is the material difference from the market-data gate. There, Massive
and Databento each named a number ($2,499/mo and $1,500/mo) a reader could act on
without a conversation. Here:

- **PR Newswire and Business Wire have published terms that bar the reuse outright**,
  with no self-serve upgrade path shown — the only route past either is the same kind
  of enquiry the desk has declined to make anywhere else on the licence landscape.
- **GlobeNewswire and ACCESS Newswire have published nothing this seat could find that
  answers the question**, which is a gap to close by asking the vendor, not a green
  light to build on.
- **Benzinga has a named product and no number**, gated behind a sales form.
- **Alpaca News is free at the account's existing $99/mo tier and is bound by the same
  personal-use clause as everything else on that account.**

**So there is no floor to quote, the way there was a floor for real-time RVOL.** The
cheapest thing available right now, at zero incremental cost, is Alpaca News read for
personal, non-commercial use — which is exactly the state the desk is already in with
the SIP feed under the accepted-exposure ruling, and carries the identical trigger.
**The pipeline shape that follows from this — build against Alpaca News now, treat "the
moment we have something moving" as covering News exactly as it covers price, and hold
the 30-day notice in view — costs nothing to start and changes no commercial posture
already on file.**

---

## 4. WHAT THIS SEAT RECOMMENDS

**Not a vendor to sign, and not a decision — his call, every time a payment or an
agreement is in view. Two things worth his knowing, because they are decisions and not
mechanics.**

1. **The gap Ops found is fixable today, inside the licence he has already accepted,
   with a source already in the account.** Alpaca News (Benzinga) can be read now for
   the same reason the SIP feed can: personal, non-commercial use, until "something
   moving." No new vendor, no new spend, no new exposure category — the existing
   accepted-exposure ruling already covers it. **Research can design the pipeline on
   this source without waiting on him**, exactly as Integration said.
2. **If he ever wants a wire source with a clean, contracted commercial right** —
   rather than the same accepted-exposure posture as everything else — **the two
   candidates with an actual product and a real (if unpublished) enterprise price are
   Benzinga direct and a primary wire's licensing desk (PR Newswire's Content
   Distribution Group is the only one that names one).** Neither has a number without
   a conversation, and a conversation is an enquiry, and an enquiry is his — the same
   shape as the Massive/Databento decision already parked behind "something moving."

**What this document does not decide, and nobody should read it as deciding:** whether
News changes the character of the exposure he has accepted. The feed-licence landscape
and the gates map both treat "something moving" as one trigger covering the whole
accepted-exposure posture; this document finds nothing that would split News into a
separate trigger, but it is worth him hearing that the same undefined phrase now
governs a second, distinct kind of content on the same account, in case he wants to
draw that line differently for the two.

---

## 5. WHAT COULD NOT BE ESTABLISHED

- **Whether GlobeNewswire or ACCESS Newswire permit or forbid third-party automated
  reuse of their content.** Neither publishes a document that reaches the question;
  this is a gap in what is published, not evidence either way.
- **Which individual GlobeNewswire releases carry third-party syndication terms (AINW,
  NNW, and others not sampled) versus ordinary issuer terms**, and what those
  third-party networks' own terms say. Not pursued past the two examples above — the
  finding that the feed is heterogeneous stands regardless of how many networks there
  turn out to be.
- **Benzinga's and any primary wire's actual enterprise price.** Gated behind a sales
  conversation on every one checked; none published.
- **Whether Alpaca would grant the 30-day-notice commercial exception for News under
  different terms than it would for price data**, or refuse either. Untested and not
  askable without the notice itself, which is his to send.

## 6. SOURCES

All read in this session, 2026-09-25 18:05–22:20 UTC:
`prnewswire.com/terms-of-use/`; `businesswire.com/legal/terms-of-use`;
`globenewswire.com` (homepage, `/rss/list`, `/about`, `/newsroom`);
`notified.com/legal-and-compliance`; two current GlobeNewswire release pages carrying
AINW and NNW syndication boilerplate (found via search, not separately archived here);
Wayback Machine query against `globenewswire.com/en/terms-of-use`;
`accessnewswire.com/terms-of-service`; `accessnewswire.com` (homepage);
`benzinga.com/apis/`; `docs.alpaca.markets/us/docs/historical-news-data`;
`docs.alpaca.markets/us/docs/streaming-real-time-news`; `alpaca.markets/data`;
`alpaca.markets/disclosures`; and
`files.alpaca.markets/disclosures/library/TermsAndConditions.pdf`, fetched and read
with `pymupdf` (a direct browser navigation returns it as a forced download, not a
renderable page — same trap the shared rules already name for other vendors' PDFs).
