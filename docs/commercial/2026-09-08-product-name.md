# Naming the product — a short list, with the checks and their timestamps

**Written by Commercial, 2026-09-08 (checks run 2026-09-07 22:28–22:32 UTC),
against `231184e`.** Integration's brief after the trader asked for research
on what to call the app: five to eight names across two angles, each with one
line on what it claims, the `.com` check with a credible alternative, an
obvious-collision check that is a flag and not a clearance, and whether it can
be said aloud and typed without a hyphen. Public sources only. **Nothing was
registered, no account was created, no registrar or vendor was contacted.**
The purchase is his.

**One correction to the brief before anything else.** *"Working name so far:
Algo Trader Plus"* is not a name he gave for the product. It is **Alpaca's own
market-data plan name**, the tier he confirmed his account is on when asked
which plan he was paying for. It is the one string the product cannot be
called, and it is listed below as a collision, not a candidate.

---

## 1. WHAT WAS CHECKED, AND HOW

**Domain availability — registry RDAP, which is a public read with no
account.** Each lookup is an HTTP request to the registry's own RDAP server;
`200` means the name is registered, `404` means it is not in the registry.
Servers used, with the positive control that proves each one answers
(a known-registered name returning `200` at the same minute):

| TLD | server | control |
| --- | --- | --- |
| `.com` | rdap.verisign.com/com/v1 | example.com → 200; a nonsense name → 404 |
| `.net` | rdap.verisign.com/net/v1 | holdfire.net → 200 |
| `.app` | pubapi.registry.google/rdap (per IANA bootstrap, published 2026-07-23) | run.app → 200 |
| `.trade` | rdap.nic.trade (per IANA bootstrap) | nic.trade → 200 |
| `.io`, `.ai` | rdap.identitydigital.services/rdap (per IANA bootstrap for `.ai`; `.io` confirmed by github.io and nic.io → 200) | github.io → 200, example.ai → 200 |
| `.co` | **not checked** — rdap.nic.co did not answer | — |

**What a `404` does and does not mean.** Not in the registry is not the same
as purchasable at the standard price: registries hold some names as reserved
or "premium", and that shows only in a registrar's checkout, which is his
step. **Every reading below is a moment, and it decays.** A name he likes must
be re-checked at the registrar before he buys, not assumed.

**Collision — public web search only**, on the name plus trading terms. A hit
is a **flag**, not a clearance; no trademark register was searched, and a real
clearance is a lawyer's job. Social handles were not checked.

**No borrowing from a data vendor — Integration's addition, 2026-09-08, after
the plan-name confusion.** Nothing in the name may borrow from Alpaca or any
data vendor: not a plan name, not a model name, nothing that reads as an
official association. He builds on a personal licence today and pursues
commercial compliance on traction; **a name implying a vendor relationship
that does not exist is a problem he does not have and should not acquire.**
Checked against the eight below and the set-aside list: none borrows from
Alpaca, Massive, Databento, Intrinio, Tiingo, IEX, Nasdaq, Cboe, or any model
name. The one that did — Algo Trader Plus — is the collision at the top of
this document.

**Registration details for taken `.com`s** come from the same RDAP record
(registration date, registrar), which says how long and by whom a name has
been held; a domain-investor registrar with a decade-old registration usually
means parked and priced, an operating company means in use.

---

## 2. THE SHORT LIST

Two angles, as asked: **the avoid** (his positioning: research for the trade
you do not take) and **the momentum board** (what the surface actually does).

| # | name | angle | what it claims, in one line | `.com` (2026-09-07 22:28–22:31 UTC) | alternatives available at the same check | obvious collision (web search, 2026-09-07) | said aloud |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **The Avoid** | avoid | *the product that tells you why not* — his own word for what the desk is for | **theavoid.com not in registry** | theavoid.trade, .app, .io, .ai, .net all not in registry | none found | two words, spelled as heard, typed as `theavoid` with no hyphen |
| 2 | **WhyNot Desk** | avoid | *every name arrives with an objection or a clean bill* — his phrase, the report's name | **whynotdesk.com not in registry**; bare whynot.com registered since 1997 (Tucows) | whynotdesk.trade, .app, .io, .ai, .net all not in registry; whynot.trade/.app/.ai registered | none found; whynotreport.com is registered (2019, Porkbun) with no product found behind it | spelled as heard; "desk" is what the repo already calls it |
| 3 | **Don't Chase** | avoid | *the board that names the runner not to chase* — the instruction every momentum trader is told and ignores | dontchase.com **registered** 2012-05-04, NameBright (a domain-investor registrar: held, probably priced); dontchasedesk.com not in registry | dontchase.trade, .app, .io, .ai, .net all not in registry | none found | said "don't chase", typed `dontchase`; the missing apostrophe is a small tax |
| 4 | **Sitout** | avoid | *the trade you sat out is the one that paid* — trader slang, one word | sitout.com **registered** 2014-01-05, Dynadot (held); sitoutdesk.com, sitoutapp.com, sitoutlist.com not in registry | sitout.trade, .app, .io, .ai, .net all not in registry | none found | one word, spelled as heard |
| 5 | **Fewer Trades** | avoid | *"failure comes in overtrading"* as a name — the thesis itself | **fewertrades.com not in registry** | fewertrades.trade, .app, .io, .ai, .net all not in registry | none found | two plain words; reads as a slogan more than a brand |
| 6 | **Early Tape** | momentum | *the premarket tape, ranked, before he sits down* | **earlytape.com not in registry** | earlytape.trade, .app, .io, .ai, .net all not in registry | none found by name; **flag: "Tapeboard" (tapeboard.com) is an existing premarket-movers product** — adjacent, not identical | two words, spelled as heard |
| 7 | **Runners Desk** | momentum | *the desk for runners* — the stocks, in the slang | **runnersdesk.com not in registry** | runnersdesk.trade, .app, .io, .ai, .net all not in registry | none found | spelled as heard; **flag: reads as athletics to anyone outside the slang** |
| 8 | **RVOL Desk** | momentum | *ranked by relative volume* — the board's own metric as its name | **rvoldesk.com not in registry** | rvoldesk.trade, .app, .io, .ai, .net all not in registry | none found | the audience knows "RVOL"; nobody else can spell it from hearing it |

Also not in the `.com` registry at the same check, for completeness:
whynotboard, avoidboard, standdowndesk, nochasedesk, gapperboard,
premarketboard, restraintdesk, sitoutlist, holdfireapp, gapdeskapp,
nochaseapp.

## 3. CHECKED AND SET ASIDE

| name | why |
| --- | --- |
| **Algo Trader Plus** | Alpaca's market-data plan name; the account's own tier. A collision by construction. |
| **Mointel** | the repo's name (Momentum Intelligence). mointel.com registered 2019-10-09 (NameBright, expires 2026-10-09); mointel.trade/.app/.io/.ai not in registry. **Flag: MOINTEL Instalaciones y Servicios Industriales S.L., Madrid, trades under the name.** Spelled "moin-tel" from hearing, which is not how it is written. Fine as a company or repo name; weak as the product's. |
| **HoldFire** | good avoid-angle word. holdfire.com registered 2005-09-04 (IONOS, `active` — likely an operating site), holdfire.net registered; .trade/.app/.io/.ai not in registry. No trading product found. Usable only on an alternative TLD. |
| **WhyNot** (bare) | whynot.com since 1997, whynot.trade/.app/.ai all registered. The phrase survives as WhyNot Desk (#2). |
| **Gapdesk** | gapdesk.com registered **2025-07-30** (Spaceship) and gapdesk.app registered — **someone registered this recently, on two TLDs**; adjacent to a scanner category with many products (Scanz, Warrior, Centerpoint premarket gappers). Flag. |
| **Veto** | veto.com since 1997; veto.app and veto.ai registered; **VETO is a listed ticker (Veto Switchgears, NSE/BSE)** — a trading product wearing a ticker is a bad flag. |
| **Standdown, Nochase, Overtrade, Objection, Chaseless, Tapedesk, Momentumdesk** | `.com` registered at the check; nothing distinctive enough to chase on an alternative TLD. |

## 4. RECOMMENDATION

**Pick: The Avoid.** It is the positioning he ruled, in the word he uses for it
— the shared rules already carry *"THE AVOID IS THE PRODUCT"* — and it is the
only name on the list where the differentiator is the name. It says what most
tools in this market will not say. At the check, `theavoid.com` and every
alternative TLD tested were not in the registry, no product or brand answered
to it, and it is two syllables a stranger can spell after hearing it once.
The risk is real and worth saying: "avoid" is a negative word to put on a
subscription, and some buyers will want to be sold more candidates rather
than fewer. **That is the product he has chosen to build, so the name is
honest about it.**

**If he wants the momentum angle instead: Early Tape.** It says when and what
without jargon, it was clear on every TLD, and the only flag is an adjacent
product called Tapeboard. **If he wants his own phrase on the door: WhyNot
Desk**, with the bare `.com` gone and the compound clear everywhere.

**Sitout** and **Don't Chase** are the two best words on the list and both have
their `.com` held by domain investors — a price he can only learn by asking a
registrar, which is his approach to make, or a `.trade` / `.app` he can take
at the standard rate.

## 5. WHAT COULD NOT BE ESTABLISHED

- `.co` availability (server unreachable at the check).
- Whether any "not in registry" name is registry-reserved or premium-priced;
  only a registrar's checkout shows that.
- The asking price of any held `.com`; only an approach shows that, and an
  approach is his.
- Trademark registers and social handles: not searched.
- Anything after 2026-09-07 22:32 UTC: **availability is a reading at a
  moment.** Re-check at the registrar before buying.

## 6. SOURCES

RDAP: rdap.verisign.com/com/v1, rdap.verisign.com/net/v1,
pubapi.registry.google/rdap, rdap.nic.trade,
rdap.identitydigital.services/rdap; server list from
data.iana.org/rdap/dns.json (publication 2026-07-23). Collision searches run
2026-09-07 on the name with "trading", "app", "stocks", "premarket",
"scanner": DontChase, HoldFire, Mointel, Gapdesk, Why Not Report, Sitout,
Veto, The Avoid, Early Tape, Fewer Trades. Alpaca plan name: the rate-card and
landscape documents in this folder.
