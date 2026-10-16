# No beta, purchase pages: what he must decide, and in what order

**Commercial-tmi (7th tenure), 2026-10-16 (UTC), for Integration to put to him.** His word, read at his turn through Integration: "i've decided i dont want to do beta. so we can remove any beta elements and setup purchase pages." (Integration chat, queued input uuid 6a3e4300, 2026-10-16T23:21:40.715Z.) That replaces his 2026-10-05 "free beta, limited invites" and changes his 2026-09-28 "first users invited and billed by hand; self-serve later".

**This document is a plan and a list of decisions. Nothing is built, no provider was contacted, no account was created, nothing was signed.** Numbers marked *read today* were re-read from the vendor's own page on 2026-10-16; numbers marked *read 09-07* come from my feed-licence landscape and were not re-read. Where two seats could disagree I say which file I opened.

## The short version

1. **A paying stranger is the first outside viewer who pays, and a public pricing page plus a payment processor is the visible surface.** The market-data and news terms he accepted exposure on (2026-09-08) say the line is the first outside viewer, paid or not. What changes now is how visible it is: a public launch with payments is, in my 09-08 reading of the contracts, "the evidence in full view". The licence decision has to come before the public pages go live, not only before the first charge.
2. **Everything about the unit is already ruled** (a day pass to everything, 20:00 to 20:00 ET, daily or annual, never monthly, charge at sign-in, one hour to fix a failed card, no charge on a non-trading day). **The price has never been ruled.** Nothing can be built that shows a number until it is.
3. **Ten things are his.** They are in the block below, in the order each one blocks the next. Everything else in this file is the reason for each, the sequence after he answers, and what I could not find out.

## NEEDS YOU

Each item says what is asked, the choices, my lean (a lean, not a ruling), and what it blocks.

**The price of a day.** What does one paid day cost? *Blocks:* the pricing page, the checkout words, the terms of sale, and the licence arithmetic below.
- I do not propose a number. What the number has to clear: the card fee (table below), the licence bill if he signs one (table below), and what traders already pay (below). His own words on 2026-09-27 were that stock price is probably not the right tier measure ("i dont know"); the desk cannot see what a subscriber trades, so one price for everything is the only measure the desk can apply.
- Card fee on one charge is 2.9% plus 30 cents (Stripe, *read today*). The 30 cents is fixed, so it bites harder the cheaper the day:

  | Charge | Card fee | Fee as a share |
  | --- | --- | --- |
  | $5 | $0.445 | 8.9% |
  | $10 | $0.59 | 5.9% |
  | $20 | $0.88 | 4.4% |
  | $500 (a year) | $14.80 | 3.0% |

  This is arithmetic on Stripe's published rate and is not a proposed price. Someone who signs in 21 trading days in a month pays the 30 cents 21 times ($6.30) before the percentage.
- What traders pay today (a competitor's own comparison pages, *read today*, so confirm on the vendors' sites): Day Trade Dash $197 a month ($147 for Warrior members); Trade Ideas Premium $254 a month or $2,136 a year. Benzinga Pro was $30.58 to $166.42 a month (*read 09-29*, Research). He refused monthly pricing, so the comparison is a daily price times about 21 trading days: $197 is $9.38 a day, $254 is $12.10 a day.

**Daily only first, or daily and annual together.** He ruled 2026-09-28 "start with daily" and 2026-09-27 "we can do daily, or annual". Which opens first?
- Daily: a charge on the saved card the moment a session is issued, with a processor call in the sign-in path (the design handles a slow processor by leaving the charge pending and never starting the one-hour clock; Ops 09-28, my 09-28 refinement). The design is complete and build-approved, not built.
- Annual: one charge, one stored paid-through date, no processor call in the sign-in path, and the 30 cents becomes 30 cents a year. It needs its own price and its own refund rule.
- My lean: daily first as ruled; annual is a second price and a second refund rule, so add it when he wants to set both. *Blocks:* what the pricing page shows.

**Who can buy on the first day: anyone, or only people he approves.** He said to set up purchase pages, which reads as anyone. The other shape keeps a person in the middle: the page takes a card, he approves the buyer, then the door opens. Both put a paying stranger in front of the board; they differ in the words and in his daily work.
- Anyone: the "by invitation" lines in the terms (section 2, section 3), the privacy policy (section 8) and the front page all become false and are replaced; payment writes the buyer to the allowlist, and a lapse ends only that day's session (ruled 2026-09-28). The allowlist stays the one door; the gate must not learn about payment (`lib/auth/gate.ts:31-50`, Web).
- Approved first: the invite words stay, the page sells a place in a queue, and nothing in the licence or the tax picture changes because a paying stranger is still a paying stranger.
- My lean: anyone, because that is what "purchase pages" says, with the US-only mechanism below. *Blocks:* every public and legal word.

**The market-data and news licence.** Plainly: he said on 2026-09-08 "the moment we have something moving, i'll sign up", and that trigger is undefined on purpose. I do not decide whether a paying stranger is "something moving". He does. This is what it means and costs.
- **What the contracts say now.** Alpaca's terms: content is for personal and noncommercial use; Alpaca may end the service "with or without cause at any time and effective immediately"; its support answer is "you cannot redistribute Alpaca API data". The exchange agreements forbid giving the data to anyone else and the exchanges can enforce them "by legal proceedings or otherwise". Retroactive fees and penalties are named; the size of an exchange penalty against an individual is not published. All *read 09-07*. The desk's news comes from Alpaca's Benzinga feed under the same personal-use clause (*read 09-25*).
- **One bad case the contract allows.** The feed is one account Alpaca can close at will. Every subscriber goes dark at once, the fallback is a rebuild of the market worker on a vendor not yet integrated, and the paying people have paid for that day.
- **What a licence costs, published prices only.** None of these includes the exchange layer unless it says so, and none is a quote.

  | Path | Price | Re-read |
  | --- | --- | --- |
  | Massive Stocks Business with Full Market real-time | $2,499 + $1,999 = $4,498 a month, "Additional exchange fees apply... guide you through exchange approval" (amounts not stated) | today |
  | Massive with Full Market Delayed (15 minutes late; the premarket window the board exists for is gone) | $2,499 + $499 = $2,998 a month | today |
  | Databento Plus (external distribution), annual contract | $1,750 a month in license fees (it was $1,500 on 09-07); the page shows no exchange-fee figure | today |
  | Vendor-published all-in figure for real-time SIP | $10,000 to $20,000 a month | 09-07 |
  | Alpaca Broker partnership (end users hold Alpaca accounts) | sales-priced, no published figure | 09-07 |
  | Each user brings their own Alpaca key (only Alpaca documents this) | $0 to the desk, $99 a month to each user for all US exchanges, $0 for IEX only; the discovery layer is still the desk's own subscription | $99 and $0 read today; the Connect approach read 09-07 |

  What signing up involves besides the monthly price (*read 09-07*): exchange agreements, a subscriber agreement or click-through for every viewer, monthly reporting, three years of records, and a rebuild of the market worker for any vendor but Alpaca. The 2027-04-01 consolidated-tape changes alter the per-viewer rates and the derived-data rule; I have not re-read them.
- **How many paying people cover it.** Gross, ignoring card fees and tax, assuming each buyer pays all 21 trading days (people who dip in and out make it more):

  | Monthly licence cost | At $5 a day | At $10 a day | At $20 a day |
  | --- | --- | --- | --- |
  | $4,498 | 43 people | 22 | 11 |
  | $10,000 | 96 | 48 | 24 |
  | $20,000 | 191 | 96 | 48 |

- **The choices, in his words to answer.**
  (a) Sign a licence before the public pages go live.
  (b) Sign one before the first charge (the pages show a price but nothing is charged until the licence is signed).
  (c) Open the pages and sell on the personal licence, and name the point at which he signs (a number of paying users, a month's revenue, anything he picks, or never). I will not suggest the number.
  (d) Change what a paying viewer sees. A board with rank, volume ratio and catalyst but no price, no move percent and no VWAP is a different licensing object under the exchange schedules, but not under Alpaca's individual terms, which forbid showing anything derived to others. It does not remove the Alpaca question.
- **Asking is an approach.** Giving Alpaca the 30-day "User Application" notice is free, licenses nothing, and puts the plan on Alpaca's file. Asking Massive or Databento what the exchange fees are is an enquiry. Both are his, never a seat's.
- The same trigger covers the news feed. Benzinga direct has no published price; the primary wires publish terms that bar reuse or nothing at all (*read 09-25*).

**The payment provider, and who creates the account.** Stripe was my 09-26 recommendation, for a hand-invoiced buyer. That rested on selling to a handful of invited people. Selling to any US buyer changes one thing: sales tax (next item).
- Stripe: 2.9% + 30 cents, no setup or monthly fee, $15 per dispute and $15 more if we answer it ($15 back if we win), *read today*. Hosted card-save page, so card numbers never reach our box (Ops filter, 09-26).
- A merchant of record (they sell on our behalf): Paddle 5% + 50 cents per checkout, including global tax, fraud, chargebacks and customer billing support; "if you're selling product with under 10$ value you can contact us for bespoke pricing", *read today*. At $10 that is $1.00, or 10%, against Stripe's $0.59. I have not checked that a merchant of record supports a charge every trading day on a saved card, and Paddle's acceptable-use page returned "not found" when I tried to read it.
- **The provider may refuse or question the business.** Stripe lists "Investment and brokerage services" as restricted: "additional due diligence... proof of relevant licenses or more details about your business model" (*read today*). TMI is an information service, not an investment or brokerage service, but the provider decides how it is classified, and I do not know until he applies. Stripe also prohibits "get rich quick" schemes, which is one more reason the page copy must stay inside `docs/marketing/what-it-is-not.md`.
- Seats never create accounts or enter keys. He creates it, test mode first, and puts the keys in `.env.local` himself (Ops 09-28 step 6).
- My lean: Stripe, unless he wants someone else to carry sales tax, in which case a merchant of record after I verify the daily saved-card charge. *Blocks:* checkout and webhook work.

**Sales tax.** I gave him the wrong answer in my 09-26 scope, which said no tax would be owed for a US-only, low-volume sale. That is withdrawn: I had not checked it, and Stripe's own page describes tax collection as a separate product you turn on.
- What I could read today, from secondary sources and not from the Texas Comptroller: Texas generally treats subscription access to data and information as taxable, on 80% of the charge, at the state rate of 6.25% plus local rates up to 8.25%. Other states differ and have their own thresholds for out-of-state sellers. The desk is a Texas company selling to the whole country.
- Stripe's own tax tool, *read today*: 0.5% per transaction where registered (no-code), or $0.50 per transaction through the API, or $90 a month starting price for the full product. At $10 a day, $0.50 is 5%.
- Choices: (a) the company's accountant tells us what applies before the first charge, then we choose a tool; (b) a merchant of record carries it (the fee above). My lean: (a), and it is the same conversation as the lawyer.
- I am not a tax adviser. This seat's job is to say the question exists and that the first charge makes it due.

**A lawyer before the first charge.** On 2026-10-05 he said no lawyer before the beta. This is not a beta. The terms file says in its own header: "NOBODY WITH A LAW LICENCE HAS READ THIS FILE", and its payment clauses are due "the day the desk charges for anything" (`docs/legal/terms.md:63-86`).
- What a lawyer would read: the terms of service, the terms of sale (below), the privacy policy, the investment-adviser posture of the reports (my 09-27 section, which rests on the publisher's exclusion and Lowe v. SEC and has never had counsel), and sales tax.
- One fact that helps: selling to the public, not by invitation, is the shape the publisher's exclusion describes ("general and regular circulation"). The risk that remains is anything personalised; the board is the same for everyone.
- My lean: yes before the first charge; his spend; his call.

**The refund rule.** The drafted terms of sale (`docs/legal/terms-of-sale-daily-pass.md`) hold this open for him. Choices: no refund for a day that has run; a pro-rated refund; a short unconditional window. Seeking Alpha's terms are "nonrefundable" by default with a 30-day window on annual.
- My recommended default, as already drafted: "no refund for a paid day that has already run its course: by the time a day ends, that day's reports have already been delivered in full. If a charge was made in error, or the service was unavailable for a paid day through our own fault, contact info@andromedagenius.com and we will make it right."
- Annual needs its own line (a short window, then none, is one comparable's shape).
- **A day pass priced under $15 means one disputed charge costs more than the day.** He should see that number before he sets the price.

**How "US market only" stays true when anyone can buy.** Privacy section 8 says "We do not offer it to the public anywhere. Access is by invitation, which is how the scope above stays a fact rather than a sentence: we choose who is invited." That sentence becomes false the day the pages go up. His 2026-09-08 rule was: anyone who trades the US market, "but i dont want any overhang on international regs".
- Choices: (a) the buyer states they trade the US market and the billing address must be in the US; cards issued outside the US are refused if the provider can do that (I have not checked); (b) say only that the desk is for people trading the US market and take whoever pays.
- My lean: (a). Web must also stop writing "we choose who is invited" anywhere. *Blocks:* the privacy section 8 rewrite.

**Who reads the support inbox.** `info@andromedagenius.com` is already the invite address and the support address. With public buyers, billing questions and "paid but cannot sign in" arrive there. Who reads it?

## What he does not have to decide (already ruled, not to be asked again)

- The unit: a day pass to everything. His words, 2026-09-27: "a subscriber pays for a days usage of everything." The day runs 20:00 ET to 20:00 ET ("end of ah to end of ah", ~01:20Z 2026-09-28). The 20:30 report is the new day's first content.
- Daily or annual; monthly refused (2026-09-27: "i will not do monthly. we can do daily, or annual").
- Charge at sign-in, in the background; a failed charge gives one hour "regardless of time", counted once from the first failure; retry only when the card is updated; a lapsed hour ends only that day's session; no charge on a non-trading day; two OS notifications (at the failure, and at 10 minutes left).
- The door is the allowlist only; the gate never learns about payment.
- Nothing charges anyone until he approves the first real run.

Two defaults I applied, for him to overrule: no free first day, and a first-time buyer saves a card before the desk opens ("admitted immediately" starts from the second day, because there is no card on file the first time).

## The sequence: what must be true before a buy button is live

No dates. The paced items are his (the licence, the account, the lawyer, the approval), and a date I invented would reach him as a constraint. Sizes are my guesses for ordering only; no owner has estimated, and each owner replaces mine.

1. **His answers above.** Price first.
2. **The licence decision** (before the public pages go live, for the reason in the short version).
3. **Provider account, test mode, keys** (his). Include the provider's own review of the business.
4. **Words and legal text** (Commercial, Marketing, Web), then his yes to the exact strings:
   - terms of service: section 2 ("There is no public sign-up") and section 3 ("Your invitation was issued to an email address"), and the payment clauses;
   - terms of sale for the daily pass (the draft exists; its section 2 still describes a self-serve card save and says nothing of annual, tax or the non-trading-day rule; the refund line is his);
   - privacy policy: section 8 (above), "who else sees it" gains the payment provider, and the billing data kept (the processor's customer and payment-method ids and a charge row per paid day; no card numbers touch our box);
   - the front page: the hero, the access section, the FAQ price answer and the meta description, in both design copies (`landingCopy.ts:265-283`, `app/page.tsx:44`, both canvases). Web's inventory is `docs/web/2026-10-16-no-beta-purchase-inventory.md` (`be740b05`), and its section 2 voids the beta and invitation lines in my read 144 (decisions 1, 2 and 5 there). Decision 3 ("ever" dropped), decision 4 (the opening) and the product sections stand.
   - **Order rule:** the words that say "by invitation" change before or with the first public purchase path, never after.
5. **Build** (approved 2026-09-28, nothing built): Ops, the charge table, the billing unit, the webhook exemption (every `/api/` route is behind the request gate today; a payment webhook needs a deliberate, signed exception); Web, the pages (pricing, checkout, "you are in", the two refusal cases, update card, billing history, cancel); Design, the in-app warning; Marketing, the words; Commercial, the terms of sale and each string read. My size guesses: Ops and the proof in test mode, days; Web's pages, days (Web's own estimate for the front-page rewrite alone was about a day); Design's warning, small (the design exists, `daily-billing-design/design-seat.md`); words and legal text, days of seat time after his answers.
6. **Proof on production routes in test mode** (there is no staging): sign in, charged; declined test card, warning, session ends at +1 hour; card fixed inside the hour, restored. Ops 09-28 steps 6 and 7.
7. **His approval of the first real run, then live keys.**

## What I could not establish

- Whether the provider will take the business, and whether it would ask for licences. Only applying tells us, and applying is his.
- Whether a merchant of record supports a daily saved-card charge, and whether Paddle would accept the product.
- What an exchange would assess against a seller that redistributes, beyond reclassification and retroactive fees.
- The exchange fee amounts behind Massive's expansions, Databento's external-distribution terms for US equities, and how the 2027-04-01 changes land.
- Which US states would tax a sale to a buyer there, and whether bundling the reports changes Texas treatment. The Texas figures above are from secondary summaries and a 1999 ruling; the Comptroller's current rule (Rule 3.330) was not read.
- Whether the card network allows a business of this kind to charge daily without a fresh approval each time; Stripe's save-and-reuse text (*read 09-27*) says the terms must state the agreement, the timing and frequency, how the amount is set, and the cancellation policy, which the drafted terms of sale carry.

## Corrections to my own earlier files

- Billing scope 09-26, section 3, "Tax": withdrawn above.
- Billing scope 09-26, section 1b: I ruled out a merchant of record because there was "no international overhang to absorb". That rested on a handful of invited buyers. With self-serve, US state sales tax is what a merchant of record would absorb. The ruling is reopened above, not reversed.
- Feed-licence landscape: Databento Plus is $1,750 a month now, not $1,500.
- Read 144: the beta and invitation lines (its decisions 1, 2 and 5) are void by his word; its other required changes stand.

## Sources

Opened this session, from this repo: `docs/commercial/2026-09-26-billing-onboarding-support-scope.md`, `2026-09-27-day-pass-addendum.md`, `2026-09-27-day-pass-addendum-2-annual.md`, `2026-09-27-price-tiered-pricing-scope.md`, `2026-09-28-daily-billing-infra.md`, `daily-billing-design/commercial.md`, `2026-09-07-which-price.md`, `2026-09-07-feed-licence-landscape.md`, `2026-09-25-newswire-licence-landscape.md`, `docs/research/benzinga-licence-cost-2026-09-29.md`, `docs/beta-launch-path-2026-10-05.md`, `docs/legal/terms.md`, `privacy-policy.md`, `terms-of-sale-daily-pass.md`, `docs/research/session-reports/commercial.md`, `docs/marketing/what-it-is-not.md`, `lib/public/landingCopy.ts` at `d772ba25`, and Web's `docs/web/2026-10-16-no-beta-purchase-inventory.md` at `be740b05`.

Read on the web today (2026-10-16): stripe.com/pricing, stripe.com/tax, stripe.com/legal/restricted-businesses, paddle.com/pricing, massive.com/business-stocks, databento.com/pricing, alpaca.markets/data, a web search for Day Trade Dash and Trade Ideas prices (Trade Ideas' own comparison pages), and a web search for Texas sales tax on information services (secondary sources).
