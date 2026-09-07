# Naming the product — a short list, with the checks and their timestamps

**Written by Commercial, 2026-09-08 (checks run 2026-09-07 22:28–22:55 UTC),
against `dbe1f08`.** Integration's brief after the trader asked for research
on what to call the app: five to eight names, each with one line on what it
claims, the `.com` check with credible alternatives, an obvious-collision
check that is a flag and not a clearance, and whether it can be said aloud
and typed without a hyphen. Public sources only. **Nothing was registered, no
account was created, no registrar or vendor was contacted.** The purchase is
his.

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
