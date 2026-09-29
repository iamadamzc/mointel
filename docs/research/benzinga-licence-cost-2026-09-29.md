# Benzinga for commercial use — what it costs, 2026-09-29

*Research seat, on his ask: "the benzinga search is licensing cost for use".
Public sources only; every quote below was read at its source on 2026-09-29.
Extends `docs/commercial/2026-09-28-newswire-coverage-landscape.md` and
corrects one line of it (§3 below). Not legal advice; counsel is his.*

## 1. The answer: no commercial price is published anywhere

| where | what is priced | commercial use? |
| --- | --- | --- |
| Benzinga's own API pages (`benzinga.com/apis/cloud-product/stock-news-api/`, `.../press-releases/`) | nothing — a contact form, `licensing@benzinga.com`, "Usage: Business / Personal" | enquiry only |
| Massive (ex-Polygon) `massive.com/partners/benzinga` | **Benzinga News $99/month** (20% off annual) | **"Individual use only"** |
| Massive business page `massive.com/partners/business-benzinga` | "Contact us for pricing" | enquiry only |
| Datarade profile | "Benzinga has not published pricing information" | — |
| AWS Marketplace | one Benzinga listing: **Basic Financial News API, free** | **no** — see §2 |
| Benzinga Pro (Commercial's §3b) | $30.58–$166.42/month | a personal terminal, not a feed |
| Alpaca News (what the desk runs today) | free, bundled | **no** — "personal and noncommercial" (Commercial, `2026-09-25-newswire-licence-landscape.md`) |

**Every published number is for individual use. The commercial price exists only
behind an enquiry.** Nothing here supports quoting him a figure.

## 2. The free AWS tier is not a route, twice over

The listing (`aws.amazon.com/marketplace/pp/prodview-xwgvhwowjmw3g`) pitches it
for "your website or application" and "new fintechs". **The governing EULA says
otherwise.** It is the standard AWS *Data Subscription Agreement* (12 pages, read
in full from the file he downloaded):

- **§2.3(a)** — the subscriber may not *"publish, disseminate, distribute or
  provide access of any kind to the Data, or any material subset thereof, to any
  third party"*; **§2.3(d)** — nor *"act as a consultant, service bureau, or
  application service provider"*.
- **§1.3** — order of precedence: amendment, then **this Agreement**, then the
  offer page. The marketing copy cannot widen §2.3; only a signed amendment can.
- §2.1/§3.3 — the subscriber owns **Derived Data** (analysis, reports, models)
  but not unmodified Data. *Whether a catalyst grade built from a headline is
  Derived Data is a counsel question, not this seat's.*

And the content is the wrong content: *"a large subset of Benzinga's trusted
**editorial** content ... headline, body teaser, and a hyperlink"*, with
*"additional real-time breaking news"* reserved to paid tiers. **The desk's
catalysts are wire press releases, which Benzinga sells as a separate product.**

## 3. The finding that changes a premise: the Press Releases product names its wires

`benzinga.com/apis/cloud-product/press-releases/`, read 2026-09-29:

> *"Benzinga has partnered with the highest quality press release companies to
> capture and deliver all pertinent PRs. Partners include ACCESSWIRE, Business
> Wire, Globe Newswire, PRNewswire & Newsfile. This data can be consumed –
> and/or displayed – via API (pull) or TCP (push)."* — and, under FAQ, *"This
> data can absolutely be displayed."*

- **ACCESSWIRE is ACCESS Newswire** — Issuer Direct renamed itself ACCESS
  Newswire Inc., effective 2025-01-27 (its own release, `accessnewswire.com`).
  **ACCESS is the wire behind the `MEDS` 2026-09-28 miss.**
- **Corrects Commercial's §3/§5**, which say the direct licence's source list is
  *"not published anywhere found"*. It is published, on this page.
- **⚠️ The page is old:** `article:modified_time` = **2023-09-15**, before the
  rebrand. The partner list may have changed since. **It is a vendor's claim of
  its partners, not a measured coverage rate** — the only way to know whether a
  direct Press Releases feed carries `MEDS`-class releases is to ask Benzinga,
  or to test a trial feed against `MEDS` 2026-09-28 (known absent from Alpaca)
  and `AIFF` 2026-09-25 (known present).
- **What it does NOT show:** that Alpaca's bundle is a subset of this product.
  Alpaca's feed demonstrably lacked `MEDS`; whether that is because Alpaca
  receives a narrower product or because Benzinga never had it is unknown.

## 4. What it would take to get a number

One enquiry to `licensing@benzinga.com`, usage "Business", products **Press
Releases** (and Stock News only if wanted), stating: display to paying
subscribers, US small caps, real-time, and asking (a) the price, (b) the current
wire partner list including ACCESS Newswire, (c) whether a trial is available to
test against the two named cases. **Sending it is his** — his 2026-09-28 ruling
("no to both") declined this enquiry when the source list was believed
unpublished; §3 is the new fact.
