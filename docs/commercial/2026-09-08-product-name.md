# Naming the product — a short list, with the checks and their timestamps

**Written by Commercial, 2026-09-08 (checks run 2026-09-07 22:28–22:55 UTC),
against `dbe1f08`.** Integration's brief after the trader asked for research
on what to call the app: five to eight names, each with one line on what it
claims, the `.com` check with credible alternatives, an obvious-collision
check that is a flag and not a clearance, and whether it can be said aloud
and typed without a hyphen. Public sources only. **Nothing was registered, no
account was created, no registrar or vendor was contacted.** The purchase is
his.

## DECIDED BY THE TRADER, 2026-09-08 — TMI TRADER

**Brand: TMI Trader. Meaning: True Move Intelligence. Domain: tmitrader.com.
Tagline: "What your scanner doesn't tell you."** His candidate (§2b), checked
by this seat at 2026-09-08 05:45 UTC and clear on `.com` and every
alternative at that moment. His ruling on the collisions, verbatim, after the
closer look at the indicator:

> *"the two that use "TMI" are a chart indicator with a few hundred followers
> … and TMI has some public use context as a colloquial expression. i think
> we're good. let's move ahead"*

**What moves ahead, and whose it is.** The domain registration: his
instruction, verbatim, later the same day — *"as far as registering...ops
can do that. register with amazon."* So **Ops registers tmitrader.com via
Amazon (Route 53) on his instruction**; this seat registers nothing and holds
no credentials; relayed to Ops direct with Integration copied because it is
a purchase. The availability reading decays from 05:45 UTC, so the
registrar's checkout is the next step and it is time-sensitive.

**REGISTERED — Ops, 2026-09-08 at about 08:27 UTC.** tmitrader.com, on his
direct authorisation to Ops (a relayed approval does not clear a purchase in
another seat's session, so Ops put it to him and he answered it himself),
via Route 53 on his AWS account. Standard price, $16.00 registration and
$16.00 renewal, no premium listing; expires 2027-09-08, auto-renew on,
registrant privacy on. Ops re-checked availability and price at the
registrar at the moment of purchase rather than trusting this document's
05:45 UTC reading — which is the right use of a decaying number. Route 53
holds both the registration and the DNS, so the A record, the certificate
and the mail-authentication records will land in one place when that work
starts; **none of it has started, nothing from this document is deployed
anywhere, and the site still answers on the sslip.io hostname.**

**TAGLINE DECIDED BY HIM, 2026-09-08: "Intelligence on what's moving."**
He had questioned the original himself — *"should we move away from 'what
your scanner doesn't tell you' because TMI doesnt tell plenty that scanners
do...however it is a supplement to a scanner"* — and the second-pass drafts
(§2d) were held to his own sentence, *"an assistant that gives you depth on
the moving market"*: name the product, no competitor in the room, no implied
completeness. He picked the line this seat offered first. The case against
it stands on file in §2d so nobody rediscovers it: a description more than
a hook, "intelligence" is the word the nearest positioned competitor uses
for a broader audience, and it is a quality claim the product must keep
every morning. "What your scanner doesn't tell you" survives as copy where
the supplement relationship is already stated, never as the line. Whether
and where the line appears is a product decision — Design's surface,
Integration's sequencing; nothing is deployed by this decision.

**So the name is complete: TMI Trader · True Move Intelligence ·
tmitrader.com (registered) · "Intelligence on what's moving."** This seat's
naming work is closed. The lawyer's look at the letters is his to commission or to
waive; he has weighed both occupants and said so. **WAIVED 2026-09-09 — his
word, *"2, waive."*, recorded by Integration at `902c8aa`.** No seat
commissions one. The flags in §2b stay on file as flags; nothing about them
was cleared, and that is the state he chose. Once the domain is his,
DNS, mail authentication and the email sign-in that was waiting on a domain
are Ops's and Integration's, not this seat's. Everything below this line is
the record of how the name was reached; §3's recommendation is superseded by
his decision.

## 0. REFRAMED BY THE TRADER, 2026-09-08 — THIS SUPERSEDES THE FIRST PASS

The first pass took the avoid positioning as the axis. His correction,
verbatim, given directly to this seat:

> *"you're over indexing on the avoid/why not concept. the idea here is this
> is a depth tool. its intelligence. its not a scanner but a smart desk. an
> assistant that give you depth on the moving market"*

So the name carries **depth, intelligence, a smart desk, an assistant, the
moving market** — and it must not read as a scanner. The list in §2 is built
on that. The first-pass list is kept in §5 as the record of what was checked,
not as candidates. **The Avoid is withdrawn as the pick.**

Two constraints carried from Integration: **nothing in the name may borrow
from Alpaca or any data vendor** — not a plan name, not a model name, nothing
that reads as an official association, because a name implying a vendor
relationship that does not exist is a problem he does not have and should not
acquire; and **"Algo Trader Plus" is Alpaca's plan name**, the tier his account
is on, listed as a collision and not a candidate. Every name below was
checked against Alpaca, Massive, Databento, Intrinio, Tiingo, IEX, Nasdaq,
Cboe and the model names. None borrows.

**One flag that applies to the whole angle before any name.** To a day trader
"depth" means Level 2 — the order book. The desk's own code says its spread
*"must never be presented as Level 2"* (`lib/market/derive.ts:76`). A name with
"depth" in it promises book depth the product does not sell; the names below
say depth without the word where they can.

---

## 1. WHAT WAS CHECKED, AND HOW

**Domain availability — registry RDAP, a public read with no account.** Each
lookup is an HTTP request to the registry's own RDAP server; `200` means
registered, `404` means not in the registry. Servers, with the positive
control that proves each one answers (a known-registered name returning
`200` at the same minute):

| TLD | server | control at each run |
| --- | --- | --- |
| `.com`, `.net` | rdap.verisign.com/com/v1, /net/v1 | example.com → 200; a nonsense name → 404 |
| `.app` | pubapi.registry.google/rdap (IANA bootstrap, published 2026-07-23) | run.app → 200 |
| `.trade` | rdap.nic.trade (IANA bootstrap) | nic.trade → 200 |
| `.io`, `.ai` | rdap.identitydigital.services/rdap | github.io → 200, nic.io → 200, example.ai → 200 |
| `.co` | **not checked** — rdap.nic.co did not answer | — |

**What a `404` does and does not mean.** Not in the registry is not the same
as purchasable at the standard price: registries hold some names as reserved
or premium, which shows only at a registrar's checkout — his step. **Every
reading is a moment and it decays.** Re-check at the registrar before buying.

**Collision — public web search only**, on the name plus trading terms. A hit
is a **flag**, not a clearance; no trademark register was searched, and a real
clearance is a lawyer's job. Social handles were not checked.

**Registration details for held `.com`s** come from the same RDAP record
(date, registrar): a decade-old registration at a domain-investor registrar
usually means parked and priced; an operating company means in use.

---

## 2. THE SHORT LIST — depth, intelligence, a smart desk

| # | name | what it claims, in one line | `.com` (2026-09-07 22:52–22:55 UTC) | alternatives not in registry at the same check | obvious collision (web search, 2026-09-07) | said aloud |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Desk Read** | *the desk's read on the moving market* — the smart desk that has already read it for you; the code already calls its market read `DeskRead` | deskread.com **registered** 2014-12-06 via REG.RU (no site found: held, price unknown) | **deskread.trade, .app, .io, .ai, .net — all clear** | none found ("Trading Desk" learning app and The Trade Desk, adtech, share a word, not the name) | two words a stranger spells from hearing; typed `deskread`, no hyphen |
| 2 | **Mointel** / **Momentum Intelligence** | *momentum intelligence* — the repo's own name and his own phrase for the desk | mointel.com **registered** 2019-10-09 via NameBright (domain investor; expires 2026-10-09); momentumintelligence.com registered | **mointel.trade, .app, .io, .ai, .net — all clear**; momentumintelligence.trade, .app, .io, .net clear (.ai registered) | **flag: MOINTEL Instalaciones y Servicios Industriales S.L., Madrid, trades under the name**; "momentum intelligence" is used descriptively by a competitor (Mentumstock: *"stock momentum intelligence tool"*) | "moin-tel" from hearing is not how it is written — a spelling tax; the long form has none |
| 3 | **Why It Moves** | *the story behind the move* — the board's Why column as a name: depth on the move, not the avoid | whyitmoves.com **registered** 2025-12-27 via NameCheap (recent; no site found) | **whyitmoves.trade, .app, .io, .ai, .net — all clear** | **flag on the idea, not the name: MarketReader ("Know What's Moving. Understand Why.") and the "Market Mover: Reason & Insight" app occupy the same promise** | spelled as heard; typed `whyitmoves` |
| 4 | **TapeWise** | *reads the tape so you can* — intelligence on the tape | tapewise.com **registered** 2001-04-05 via GoDaddy | **tapewise.trade, .app, .ai, .net clear**; .io registered | none found on the name; flag: MarketWise, Inc. is a listed company, and "-wise" reads adjacent | spelled as heard; typed `tapewise` |
| 5 | **Deeper Look** | *depth on the moving market* — his sentence, nearly | deeperlook.com **registered** 2008-08-04 via a Korean host | **deeperlook.trade, .app, .io, .ai clear**; .net registered | **flag: DeeperLook, a software company (2017), and "A Deeper Look" podcast** | spelled as heard; typed `deeperlook` |
| 6 | **Undercurrent** | *what moves beneath the moving market* — the strongest metaphor on the list | undercurrent.com **registered** 2002-05-13 via NameCheap | **only undercurrent.trade clear**; .app, .io, .ai, .net all registered | none found in trading or fintech | spelled as heard; the weakest domain outlook here |
| 7 | **Tape Context** | *context on the tape* — depth without the word | **tapecontext.com clear** | **tapecontext.trade, .app, .io, .ai, .net — all clear** | not searched (a compound with no obvious occupant) | spelled as heard; reads technical |
| 8 | **Moving Market Desk** | *his exact words* — a desk for the moving market | **movingmarketdesk.com clear**; movingmarket.com registered | **movingmarketdesk.trade, .app, .io, .ai, .net — all clear**; movingmarket.trade, .app, .io, .ai clear | none found for "Moving Market" in trading | three plain words; sixteen characters to type |

Also clear on `.com` and every alternative at the same check: **deskdepth**
(carries the Level 2 flag above), **backstorydesk**, **moverstory**. The
assistant angle produced nothing usable: deskhand.com is registered through
2031 with .app/.io/.ai/.net held; deskmate, deskbrief, deskwise, smartdesk,
thesmartdesk, deskintel, insightdesk are all held.

## 2b. THE TRADER'S OWN CANDIDATE — TMI Trader, checked the same way

Proposed by him on 2026-09-08: **brand "TMI Trader", meaning "True Move
Intelligence", domain tmitrader.com, tagline "What your scanner doesn't tell
you."** Checked at 2026-09-08 05:45 UTC with the same servers and the same
positive controls (all five returned 200 at the run).

| item | result |
| --- | --- |
| **tmitrader.com** | **not in registry** — and tmitrader.net, .trade, .app, .io, .ai all not in registry. **The only name checked tonight that was clear on `.com` and every alternative at once.** |
| truemoveintelligence.com and all five alternatives | not in registry |
| tmi.com / .net / .app / .io / .ai | all registered; tmi.com since 1997 via MarkMonitor, a corporate brand-protection registrar — a company guards the short form. He is not asking for it. |
| truemove.com / .net / .app / .io | registered (truemove.com since 2000); .trade and .ai clear |
| tmitrading.com | registered 2006 — TMI Trading Corp, a New York food manufacturer (Bloomberg profile) |

**Collision flags, web search 2026-09-08 — none on the exact name "TMI
Trader"; three on its parts, all in or near the audience:**

1. **TMi Markets** — a retail forex/CFD broker trading as "TMi" (broker
   reviews on FastBull and WikiFX). A broker, not an intelligence product,
   but the same three letters in front of the same kind of customer. The
   nearest collision on the list.
2. **TMI, the Trend Momentum Indicator** — a paid TradingView indicator at
   trendmomentumindicator.com, and a separate "True Momentum Index"
   TradingView script. Same acronym, same audience, momentum in the name.

   **Looked at more closely on 2026-09-08 at his request.** From its own
   site: *"The Ultimate Trend & Momentum Indicator"*, branded "TMI"
   throughout with no ™ or ® shown; a TradingView indicator giving *"entry
   and exit signals"* — an adaptive trend engine, a momentum strength scanner,
   *"non-repainting arrows"* and alerts — for *"Forex | Crypto | Stocks"* and
   commodities and indices, on charts from one minute to four hours. Priced
   $29.99 a month, $59.99 a quarter, $99.99 a year, every plan with *"God
   Mode"* and *"Access to Private Telegram Trading Community."* Footer:
   *"RISING EXPRESS INC"*, © 2024; no founder or location named; support by
   email only. Social handles TikTok **@tmi_indicator**, Instagram
   @trendmomentumindicator, Facebook. **Following, from the public TikTok
   profile rendered 2026-09-08: 637 followers, 628 likes, bio "TMI — God Mode
   for market clarity."** The site's own claim is *"1000+ traders
   worldwide"*; a Facebook marketing video surfaced by search claims 188K
   views. The separate **True Momentum Index** is a protected TradingView
   community script by a user called Trading_Tomm, also abbreviated TMI.

   **What it is, against what the desk is:** a chart-signal product — buy and
   sell arrows on a TradingView chart, sold by subscription to retail forex
   and crypto traders with a Telegram room. It has no catalysts, no filings,
   no float, no ranking, no research and no board; it is the signal platform
   the desk's own rules define themselves against. **So the collision is on
   the three letters and the audience, not on the product.** His read on the
   broker, TMi Markets — not worried, a broker with little following — is
   his call and is recorded as such. Trademark registers were not searched
   for either; that remains a lawyer's job.
3. **TrueMove** — TrueMove H, Thailand's second-largest mobile operator (True
   Corporation, Charoen Pokphand Group). A large brand on the expansion's
   first two words, in another sector and another country. "True Move
   Intelligence" as a phrase has no occupant found.

Also present on the acronym and not in the audience: Treasury Management
International (a treasury publisher), a venture fund called TMI, and the
everyday reading of the letters — **"too much information" is what most
people will hear first**, which is either the joke against a depth tool or
the joke it owns; that is taste, and his.

**Tagline.** No one was found using *"What your scanner doesn't tell you"*
or the "show you" variant; the idea that scanners surface candidates and do
not tell you what to do is common content on scanner vendors' own blogs
(Centerpoint, TradingSim, Trade Ideas). The line is unclaimed and it does the
positioning work his reframing asks for: it names the category by contrast —
not a scanner — and promises depth on what is already moving.

**Said aloud.** "T-M-I Trader": three letters and a word, spelled from
hearing, typed `tmitrader` with no hyphen. The expansion is not derivable
from the letters, which is true of every acronym brand; it has to be told
once. "Trader" says who it is for rather than what it does; the tagline says
what it does.

**Vendor borrowing:** none. **Level 2 flag:** does not apply — no "depth" in
the name.

**This seat's read, since he will want it stated rather than implied.** On
availability it beats every name in §2: clear on `.com` and on every
alternative, which no other candidate managed. On collision it carries more
than Desk Read: a broker and an indicator already answer to the three
letters in front of this audience, and a Thai telecom owns the two words
behind them, though none of the three is a market-intelligence product and
none uses "TMI Trader". On positioning the tagline is the strongest single
line produced tonight, by him or by this seat. The decision is his; what
this seat can add is that if he takes it, the collision worth a lawyer's
look before a logo is TMi Markets, because it is a financial-services brand
on the same letters — and that "not in registry" still needs the registrar's
checkout to confirm the price.

## 2c. THE TAGLINE — should it move away from "What your scanner doesn't tell you"?

**Yes, as the primary line, for the reason he gives.** The line works as a
category contrast — not a scanner — but a reader hears *instead of* as
readily as *in addition to*, and the product is a supplement: it does not
give the filtered universe, the custom criteria or the alert stream a
scanner gives, and it does give depth on the names a scanner surfaces. A
tagline that can be read as "replace your scanner" over-claims by omission,
and it is the kind of claim a subscriber tests on day one. Kept as a
secondary line, in copy where the relationship to the scanner is already
stated, it is fine.

Alternatives, positioned as a supplement, with collision checks by web
search on 2026-09-08 (a hit is a flag, not a clearance):

| line | what it says | collision check | notes |
| --- | --- | --- | --- |
| **"Your scanner finds it. TMI explains it."** | the relationship, in order: the scanner's job, then this one | none found | two sentences; names the product; "explains" must hold on every name — where the desk found nothing it says so, which is still an explanation of a kind |
| **"Depth on what's moving."** | the product in four words | none found | carries the Level 2 flag: to this audience "depth" can mean the order book |
| **"After the scan."** | the next step | none found | short and a little cryptic on its own; strong under the name |
| **"True Move Intelligence."** | the expansion as the line | none found for the phrase | says nothing about scanners at all, which is the safest and the flattest |
| "The story behind the move." | the Why column | **occupied:** ExplainThisMove uses *"the story behind the move: the catalyst, the news, and the chart context"* as its line, and Benzinga Pro's "Why Is It Moving" (WIIM) is the same promise | do not use |
| "Runs alongside your scanner." | the relationship, plainly | not searched | functional rather than a line |

**This seat's pick: "Your scanner finds it. TMI explains it."** It answers his
concern exactly — it is a supplement and it says so — it keeps the contrast
the original had, and it puts the product's name in the reader's mouth. The
case against it: it is two sentences where a tagline is usually one, and
"explains" is a promise the product must keep on the names where it found
nothing, which the desk's own three-way verdict (objection / no objection
found / nothing collected) does keep, honestly, but not always
satisfyingly. If he wants one short line: **"After the scan."** under the
name, or the expansion itself. His call.

## 2d. THE TAGLINE, SECOND PASS — held to his standard, not to a competitor

Integration's reading of his objection, and it is right: this is the second
time he has corrected the same axis. First *not the avoid — a depth tool*;
now *not a replacement — a supplement*. Both times the product had been
positioned by contrast with something else, and both times he pulled it back
to what it is. **The standard for the line is his own sentence — "an
assistant that gives you depth on the moving market" — which names the
product without naming a competitor.** A line that needs a scanner in the
room to make sense is borrowing another category to describe itself; and his
constraint that it *does not tell you plenty that scanners do* is an asset,
because a line that implies completeness is found false by the first user
who expects it to scan.

**What a tagline collision check can and cannot see.** Each line below was
searched as an exact phrase on 2026-09-08, with "trading", "stocks",
"tagline", "app". That sees indexed web copy. **It does not see trademark
registers, where a slogan can be registered as a mark; app-store listings
and social bios that are not indexed; print and video advertising; or
anything unindexed since the crawl.** So the honest state for every line is
*"no occupant found"*, never *"unused"*.

| line | names the product without a competitor? | implies completeness? | exact-phrase search, 2026-09-08 | the case against |
| --- | --- | --- | --- | --- |
| **"Intelligence on what's moving."** | yes — his word for it, scoped to the moving market | no — "on what's moving" is a scope, not a promise to find everything | no occupant found | "intelligence" is the category word MarketReader trades under for investors at large; it promises depth without saying how; and it invites *how good?*, which the desk's own measured judgement fields answer only partly |
| **"What's moving, and what it is."** | yes — the board, then the dossier | no | no occupant found | flat: no verb of value, and "what it is" is vague to a stranger; needs the product beside it to land |
| "Depth on the moving market." | yes — his sentence, nearly | no | no occupant found | "depth" reads as the order book to this audience; the Level 2 flag |
| "Read the move." | yes — the desk's read | no | no occupant found | terse to the point of cryptic; "read the tape" is the audience's own phrase and this may be heard as a variant of it |
| "Every mover, explained." | yes | **yes — "every"**: the desk researches the top of its ranking, not every mover, and some names return *nothing collected* | no occupant found; "market movers" is CNBC's, Bloomberg's and Benzinga's generic category | over-claims by one word; drop |
| "The smart desk for the moving market." | yes — his words | no | no occupant found; "TradeSmart" and "Smart Trader" are adjacent app names | long, and "smart" is the most borrowed word in the app stores |
| "After the scan." (from §2c) | **no** — the scanner is in the room | no | no occupant found | fails his standard; keep for copy, not the line |
| "Your scanner finds it. TMI explains it." (from §2c) | **no** — the scanner is the subject of the first sentence | no | no occupant found | the honest supplement sentence for the website's second paragraph, not the tagline |

**This seat's pick under his standard: "Intelligence on what's moving."** It
is his word, scoped to his market, with no competitor in the room and no
claim to completeness; it says what the product is rather than what it is
not. **The case against it, stated so he can overrule it on taste:** it is a
description more than a hook, "intelligence" is the word the nearest
positioned competitor already uses for a broader audience, and it puts a
quality claim in the reader's mouth that the product must keep every
morning. If he wants plainer, **"What's moving, and what it is."** says the
same two halves in words nobody else is using.

**Registration, constraints from Integration's sequencing with Ops,
2026-09-08:** stop if the price surprises at checkout — his authorisation
was for a domain registration, not for whatever a premium listing puts up;
and register the domain only, no tagline anywhere, because the line is
moving.

## 2e. POSITIONING ON THE PUBLIC PAGE — three answers for Web, 2026-09-10

*Web opened 2026-09-10 and owns every word a stranger sees; this seat owns
the positioning. He has seen a first landing page and ruled, verbatim, "i
like the layout, i dont like the sales pitch", and separately ruled access
"invite only, can ask for invite." Web asked three things through
Integration. Answers, each a sentence, with the reason.*

1. **"Your scanner finds it. This tells you what it is." — retire it from
   the page.** §2d kept scanner-in-the-room lines only as copy where the
   supplement relationship was already stated; his objection to the pitch
   retires that carve-out, because the line is a hook by construction — a
   competitor in the room and a promise ("tells you what it is") the product
   keeps on every name only in the three-way sense. The supplement
   relationship belongs in the plain statement, said once, without a
   scanner as the subject. ~~The line stays available for the one place the
   question is genuinely in the room: an answer to "is this a scanner?"~~
   **Carve-out withdrawn 2026-09-10.** Web declined the line even in that
   slot, with a reason rather than silence: it survives his pitch objection
   only barely, and the card's plainer sentence says the same thing with no
   competitor as the subject — *"It does not run your filters or replace a
   scanner. It ranks names that are already moving and reports what is
   underneath them."* Accepted: that sentence is the registered answer to
   "is this a scanner?", and *"Your scanner finds it. This tells you what it
   is."* is retired everywhere. Web's words, Web's card; the positioning
   fact registered here is only that the answer is a boundary, not a hook.
2. **A settled one-paragraph plain statement does not exist.** None is
   registered anywhere in the commercial documents, and this seat will not
   invent one in a message. What is registered, and what any statement Web
   writes must not contradict, is three sentences: his own — *"a depth tool.
   its intelligence. its not a scanner but a smart desk. an assistant that
   give you depth on the moving market"*; the desk's standing principle —
   *"an intelligence platform, not a signal platform — give the user as much
   of the story as we can that is useful"*; and the unit and audience from
   the gates map — everything together on one shared board, for people who
   trade $1–$20 small-cap momentum in the premarket the way he does. Web
   writes from those and hands the paragraph here; it is then the registered
   statement and this section points at it.

   **REGISTERED 2026-09-10, written by Web (`7d81bae`) from the three
   sentences above and accepted by this seat as the plain statement of the
   product:**

   > **TMI Trader is an intelligence desk for people who trade $1–$20
   > small-cap momentum in the premarket. It is not a scanner and it is not
   > a signal service: it takes the names that are already moving and puts
   > everything the desk knows about each one on a single shared board — why
   > it is moving, where it sits in the cycle, what the share structure is,
   > and what supply stands behind it. Where it has nothing, it says so.**

   **Why it passes.** *"Intelligence desk"* carries his *"not a scanner but a
   smart desk"* and the H1's word. *"Not a scanner … not a signal service"*
   are the desk's own registered boundaries — his sentence and the README's
   principle — not a competitor's sentence, so §2e item 1 is satisfied. *"A
   single shared board"* is Gate 2's ruling. The four things it lists — why,
   cycle, structure, supply — are the Why column, the cycle read, the
   structural analysis and the supply bound: derived and filings outputs,
   with no price, quote or tape named, which is the licence boundary. *"Where
   it has nothing, it says so"* is the three-way verdict as a sentence and is
   what keeps *"everything the desk knows"* from being a completeness claim.

   **Two dependencies it rests on, recorded so they are not lost.** First,
   *"each one"* is honest only because the board renders a name it has not
   researched as a state — NOT RESEARCHED, NOTHING COLLECTED — rather than as
   a blank; the desk researches the top of its ranking, not every mover, and
   the sentence over-claims the day that rendering goes. Second, Web dropped
   his word *"assistant"* on the ground that it now reads as a chatbot; that
   is a Web judgement on a word of his, recorded here so he can restore it
   with one word if he wants it.

   **Verified by Design, 2026-09-10 (`ba13d79`), by reading the code rather
   than the live board — a live read proves the board was right this
   morning; a total return type proves it cannot be otherwise.** The first
   dependency holds by type, not by convention: every path names its empty
   state — *Not researched yet*, *NOT RESEARCHED*, *NO RUN*, *CYCLE NOT
   ESTABLISHED*, *NOT ANALYZED* — and the clean case is named too, *NO FLAG
   FOUND*; the risk label's type is `string`, not `string | null`, so no
   path can return a blank without a visible interface change. **The
   registered sentence rests on a promise rather than a habit.**

   **And a third dependency, found by Design where neither Web nor this
   seat had looked.** The sentence says *"everything the desk knows about
   each one on a single shared board."* The Float **column** is conditional
   — it appears only when the board is sorted by float — so one *view* of
   share structure is sort-scoped. **The claim survives** because structure
   and supply are carried on every row by the Risk cell — *DIRTY FLOAT*,
   *SUPPLY OVERHEAD*, *STRUCTURE UNKNOWN*, *NO FLAG FOUND*: the dimension is
   always present, only an additional view of it is sort-scoped. **A reader
   taking the sentence as a promise about columns would be wrong; as a
   promise about what the board knows and shows per row, it is kept.** The
   chain that got here is the reason to record it: the sentence was
   registered on Web's construction, neither Web nor this seat reads that
   surface, Integration flagged it as unverified, and the thread that owns
   the code proved it by type within the hour.
3. **An invite request asks for an email address and nothing else.** An
   invite is his to grant and needs only a way to reach the person; a
   free-text "how do you trade" is qualification pitch on the way in and
   personal data with a retention question on the way out, and the desk
   already holds verified email addresses in exactly one place, the identity
   store, by design. A sign-in that yields a verified address is a
   sufficient request; a form that collects more is data held without a
   purpose.

**And one consequence neither thread raised, which is this seat's to
raise.** Under the ruling to accept exposure, the public page is the
evidence surface — detection is through the product, not the data pipe
(landscape §1b). A landing page that advertises real-time prices, quotes or
the consolidated tape as a feature describes, in public, the thing the
personal licence forbids showing to others. **Intelligence on what's moving
is the product and is what the page should say; the page should not sell
the tape.** Invite-only keeps the public surface small; the words on it
decide what the surface shows.

**Acted on by Web the same day (`7d81bae`).** The example board on the page
had carried `LAST`, `CHG`, `RVOL` and a `TAPE LIVE` badge — real-time prices
as a feature, in public. All removed; the consolidated feed is named
nowhere; the engine card describes the derived outputs, not the input; the
caption reads *"Illustration only — no market data"*; the *demand detected*
versus *no structural analysis available* contrast, which was the reason to
show a board at all, survives. Web flagged the cost rather than letting it
be discovered: with the tape gone the board fragment no longer looks like a
live instrument, and if he later finds the page thin, that is where the
weight went — and the answer is more of what the desk concludes, never a
price. Integration has set its own trigger to reopen the exposure
conversation with him before the page goes live (`c7ada4f`); his ruling
stands and no seat invents a threshold.

## 3. RECOMMENDATION

**Pick: Desk Read.** It is the thing he described — a smart desk that has
already read the moving market and hands him its read — and it is the
product's own vocabulary: the code's market read is `DeskRead`, the docs call
the product "the desk" throughout. It borrows from no vendor, no product
answers to the name, a stranger can spell it after hearing it once, and every
alternative TLD was clear at the check. The `.com` is a 2014 registration at
a Russian registrar with no site behind it: **a price to learn, and learning
it is an enquiry, which is his to make** — or `deskread.io` / `.app` at the
standard rate.

**If he wants his own name on the door: Mointel**, with the Madrid firm and the
spelling tax named, or the long form **Momentum Intelligence**, which is
descriptive rather than a brand and whose `.com` and `.ai` are held.
**If he wants the story angle: Why It Moves**, knowing MarketReader has built
a business on that exact promise for investors at large.

**The case against the pick, so he can overrule it on taste:** "Desk Read" is
quiet. It does not say momentum, small caps or premarket, and it will need
the tagline to do that work. **Undercurrent** says more and has almost
nowhere to live.

## 4. A LANDSCAPE FACT FOUND ON THE WAY, FOR INTEGRATION

**MarketReader (marketreader.com) is a positioned occupant of the
"intelligence, not a scanner" framing.** Its own line: *"Know What's Moving.
Understand Why."* — a market-intelligence company, founded 2021, whose
platform and API *"incorporate trade and quote data directly from Nasdaq"*,
with an AI newsletter that *"automatically summarizes WHAT is moving and
WHY"*, and a strategic investment from Acuity Trading. It is aimed at
investors broadly rather than small-cap premarket momentum traders, and it
says nothing about the avoid. It is the nearest thing to this product's
promise found tonight, and it is a fact for positioning, not a naming flag.

**Two more occupants of the "why it moved" idea, found while checking
taglines on 2026-09-08:** **ExplainThisMove** (explainthismove.com — *"type a
ticker and get the story behind the move: the catalyst, the news, and the
chart context, all in seconds"*), a per-ticker explainer; and **Benzinga
Pro's "Why Is It Moving" (WIIM)** feed. Both explain a move after the fact
for any ticker; neither ranks a premarket board, carries float or structure,
or holds a desk's view over a session. They are what the Why column competes
with, not what the desk competes with.

## 5. FIRST PASS, SUPERSEDED — the avoid angle, kept as the record

Checked 2026-09-07 22:28–22:32 UTC, same method. **The Avoid** (theavoid.com
and every alternative clear, no collision), **WhyNot Desk** (whynotdesk.com
clear everywhere; whynot.com held since 1997), **Don't Chase** (dontchase.com
held since 2012 by NameBright; alternatives clear), **Sitout** (sitout.com held
since 2014 by Dynadot; alternatives clear), **Fewer Trades** (clear
everywhere), **Early Tape** (clear everywhere; Tapeboard adjacent), **Runners
Desk** (clear; reads as athletics), **RVOL Desk** (clear; unspellable outside
the audience). Set aside then and still: **HoldFire** (.com held since 2005,
likely in use), **Gapdesk** (.com and .app registered 2025-07-30 by someone
adjacent), **Veto** (a listed ticker), **Standdown, Nochase, Overtrade,
Objection, Chaseless, Tapedesk, Momentumdesk** (.com held).

## 6. WHAT COULD NOT BE ESTABLISHED

- `.co` availability (server unreachable at both runs).
- Whether any "not in registry" name is registry-reserved or premium-priced.
- The asking price of any held `.com`; only an approach shows that.
- Trademark registers and social handles: not searched.
- Anything after 2026-09-07 22:55 UTC: availability is a reading at a moment.

## 7. SOURCES

RDAP: rdap.verisign.com/com/v1 and /net/v1, pubapi.registry.google/rdap,
rdap.nic.trade, rdap.identitydigital.services/rdap; server list from
data.iana.org/rdap/dns.json (publication 2026-07-23). Collision searches run
2026-09-07 on the name with "trading", "app", "stocks", "software", "brand":
DeskRead, Momentum Intelligence, Why It Moves, Deep Tape, Market Read,
Undercurrent, Understory, Deeper Look, TapeWise, Plumbline, Moving Market, and
the first-pass names. MarketReader: marketreader.com and its newsletter and
LinkedIn pages as returned by search. Code: `lib/dashboard/deskRead.ts`,
`lib/market/derive.ts` at `dbe1f08`.
