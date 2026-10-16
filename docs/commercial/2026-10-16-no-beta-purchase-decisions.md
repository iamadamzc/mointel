# No beta, purchase pages: the price breaks first, then what he must decide

**Commercial-tmi (7th tenure), 2026-10-16 (UTC), for Integration to put to him. Version 4.** Version 1 (`6f10e70a`) treated the price and the provider as open; version 2 (`8d44410f`) priced the breaks from $5 a day. His $5.50 daily price (below) replaces that, and every number in section 1 is rebuilt on it. Version 3 (`5bb97f6d`) rebuilt section 1 on his $5.50 daily price. This version (4) records his answers to the open items and replaces all three.

**What he has ruled, in his words (read at his turns through Integration):**
- "i've decided i dont want to do beta. so we can remove any beta elements and setup purchase pages." (Integration chat, uuid 6a3e4300, 2026-10-16T23:21:40.715Z)
- "$5 per day of use. it has been discussed throuroughly." (uuid 01659ed1, 2026-10-16T23:27:12.069Z)
- "$5/day. Day starts at the close of AH. So a user starts their day with the report going into premarket the next day. cards will automatically be charged per day. if a user chooses to do monthly, 6 month or annual, caluclate the logical price breaks for such a scenario." (his latest message in that chat)
- "we'll make the daily $5.50 to cover the stripe charge." (uuid dea68bce, 2026-10-16T23:33:31.014Z)
- Provider: Stripe, one new account for Andromeda Genius with TMI as a product under it (his 2026-10-05 decision in the corporate-office record, relayed by Integration; I did not find that entry in `A:\corporate-office\company\decisions.md`, and I cite what Integration relayed).

**Two supersessions, said once.** His request for monthly, 6-month and annual replaces his 2026-09-27 "i will not do monthly. we can do daily, or annual"; the newer word wins. And "no beta" replaces his 2026-10-05 "free beta, limited invites" and corporate-office D-076 ("TMI launch will be beta, not paying customers. Once validated through beta, we'll negotiate the agreements needed. But i want everything piped for GA."). With no beta, the agreements D-076 deferred to "once validated" now come before the first paying customer. That is one item below (the licence).

**This is a plan and a list of decisions. Nothing is built, no provider was contacted, no account was created, nothing was signed.** *Read today* means I re-read it from the vendor's page on 2026-10-16. *Read 09-07* and similar mean the number is from my earlier file and was not re-read.

---

## 1. The price breaks

### The daily price and what the card takes from it

His latest word on the daily price: "we'll make the daily $5.50 to cover the stripe charge." (uuid dea68bce, 2026-10-16T23:33:31.014Z) So the daily charge is **$5.50**.

Stripe's fee is 2.9% plus 30 cents per successful domestic card charge (*read today*). On $5.50 that is $0.4595, which is 8.3% of the charge, and it leaves **$5.04**. So $5.50 covers the fee and leaves four cents over a clean $5.00. It does not cover sales tax or Stripe's own tax tool ($0.50 a transaction through the API, *read today*): if either is taken out of a $5.50 day, the desk keeps less than $5.04, unless tax is added on top of the price.

### The day, as he states it

A paid day runs from the close of after-hours, 20:00 ET, to 20:00 ET the next day. The first thing a user reads is the report going into the next premarket (published about 20:30). This is the boundary already ruled on 2026-09-28 ("days run from 8pm to 8pm... end of ah to end of ah") and it is the same instant the session already ends on, so no boundary code changes. Charge at sign-in, in the background, every paid day. No charge on a day that is not a trading day (ruled 2026-09-28).

One consequence of those two rules, stated so nobody finds it later: a sign-in from Friday 20:00 to Sunday 20:00 falls in paid days that are not trading days, so it is not charged, and the report written on Friday evening for Monday's premarket can be read in that window. Monday's paid day starts at 20:00 on Sunday. That is the ruled rule applied, not a change I am asking for.

### How many charged days are in a period (NYSE calendar, read today)

| Period | Trading days |
| --- | --- |
| A year (2026 and 2027 each) | **251** |
| A calendar month | 19 to 22, average **20.9** |
| Six months | 124 to 126, average **125.5** |

2026 closures: Jan 1, Jan 19, Feb 16, Apr 3, May 25, Jun 19, Jul 3, Sep 7, Nov 26, Dec 25. 2027: Jan 1, Jan 18, Feb 15, Mar 26, May 31, Jun 18, Jul 5, Sep 6, Nov 25, Dec 24. Early-close days (Nov 27 and Dec 24, 2026; Nov 26, 2027) are still charged days.

### What a trader who uses every day pays at $5.50

| Period | Days | Total at $5.50 | Card fees if charged daily | Desk keeps |
| --- | --- | --- | --- | --- |
| Month (average) | 20.9 | **$115.04** (a month runs $104.50 to $121) | $9.61 | $105.43 |
| Six months | 125.5 | **$690.25** | $57.67 | $632.58 |
| Year | 251 | **$1,380.50** | $115.33 | $1,265.17 |

The 30 cents is fixed, so daily charging pays it every day; one charge for a period pays it once.

### Which base I priced the breaks from, and why

**I priced them from the $5.50 list, not from the $5 he nets.** Two reasons.
- A buyer compares a plan with what the page tells them a day costs, which is $5.50. A break advertised as "15% off" has to be true against that number, or the page says something false.
- The fee is already inside the $5.50, so it is already paid for. A plan that saves the card fee gives some of that back. Priced from $5.50, the plan that leaves the desk exactly as well off as daily charging is only about 5.5% off the list (a month at $108.89, six months at $651.78, a year at $1,303.26). So the first 5.5 points of any break cost the desk nothing; every point beyond that is a real concession, and the table shows it.

### The ladder I recommend, and why each step

His to set. These are my numbers, built on the arithmetic above.

| Plan | Price | Per trading day | Off the $5.50 total | One-charge fee | Daily fees avoided | Pays off for a trader who uses more than |
| --- | --- | --- | --- | --- | --- | --- |
| Daily | $5.50 a day | $5.50 | none | $0.46 each | none | not applicable |
| Monthly | **$98** | $4.69 | 15% | $3.14 | $6.47 | 17.8 days of 20.9 (85%) |
| Six months | **$518** | $4.13 | 25% | $15.32 | $42.35 | 94 days of 125.5 (75%) |
| Annual | **$897** | $3.57 | 35% | $26.31 | $89.02 | 163 days of 251 (65%) |

**The reasons, step by step.**
- **Where the first step comes from.** Charging once instead of 21 times saves about $6.47 a month in card fees, which is 6.6% of $98. That is the part of a break the desk pays for out of money that stops leaving. The rest of the 15% is the price of paying a month ahead and of one fewer failed-card event, each of which also stops a day's session.
- **Why each longer step is bigger.** The fee saving grows (8% of the price at six months, 10% at a year), and the buyer is also lending the desk the money and carrying the risk that a new product disappoints for longer. I used equal ten-point steps (15, 25, 35) so the ladder is easy to say and easy to defend.
- **Why not more.** A plan only pays off for a heavy user (the last column). Light users stay on the daily day and the plan prices do not touch them. So a break costs revenue only on traders who would have paid every day anyway; it buys fewer fees, cash in advance, and a committed user. I cannot size how many heavy users a bigger break would convert: there are no users to measure. The first months of purchases will say.
- **A month is not a fixed number of days.** A flat $98 is $5.16 a day in a 19-day month and $4.45 a day in a 22-day month. The plan is priced on the 20.9 average. Whether a "month" is a calendar month or a fixed span is one of the decisions below.
- **Gentler and steeper versions, if he wants them** (the same method; the pays-off threshold is always one minus the break):

  | Ladder | Monthly | Six months | Annual |
  | --- | --- | --- | --- |
  | Gentle: 10, 20, 30% | $104 | $552 | $966 |
  | Recommended: 15, 25, 35% | $98 | $518 | $897 |
  | Steep: 20, 30, 40% | $92 | $483 | $828 |

**What it does to the licence arithmetic.** Longer plans bring in less per person per month after fees, so more people are needed to cover a monthly licence cost. Heads needed, assuming every one is a full-use trader paying all 20.9 days, before sales tax, refunds and disputes:

| Monthly licence cost | Daily, full use | Monthly plan | Six-month plan | Annual plan |
| --- | --- | --- | --- | --- |
| $4,498 | 43 | 48 | 54 | 62 |
| $10,000 | 95 | 106 | 120 | 138 |
| $20,000 | 190 | 211 | 239 | 276 |

Net per head per month after the card fee: $105.43 daily, $94.86 monthly, $83.78 six-month, $72.56 annual.

**What traders pay elsewhere, for the ladder to sit against** (a competitor's own comparison pages, *read today*, so confirm on the vendors' sites): Day Trade Dash $197 a month; Trade Ideas Premium $254 a month or $2,136 a year. Per trading day that is $9.42 and $12.14; Trade Ideas annual is $8.51 a day. TMI at $5.50 a day, and $3.57 a day on the annual, sits well under both. Whether that is the right place to sit is his.

**One more number he should see.** Stripe charges $15 for each dispute, and $15 more if we respond to it ($15 back if we win) (*read today*). On a $5.50 day a single dispute costs almost three days' revenue. On an $897 annual it also puts $897 at risk. That is a reason for clear charge words and a clear refund rule (below), not a reason to change the price.

---

## 2. His answers, and what is still open

### Answered (his typed message in this session, 2026-10-16)

His words: "a month is as it is according to the market. anyone can buy on day one. will have license in place. done. i will deal wiht taxes and an attorney. why is us only important? i read support."

- **A month** is the market's month: a calendar month, with the trading days the market has in it (19 to 22). The monthly price stays flat; section 1 shows what that is per day in a short and a long month. Six months and a year follow the same calendar.
- **Anyone can buy on day one.** No approval step. So the "by invitation" words in the terms (sections 2 and 3), the privacy policy (section 8) and the front page are all replaced, and payment writes the buyer to the allowlist. The allowlist stays the one door and the gate does not learn about payment (`lib/auth/gate.ts:31-50`, Web). A lapse ends only that day's session (ruled 2026-09-28).
- **The licence will be in place.** I read that as before the first paying customer, which is what D-076 deferred and what "no beta" now brings forward. He did not say whether it is before the public pages go live or only before the first charge. I do not need that answer to proceed: the pages and the build are not blocked by it, and the "by invitation" words come out in the same release either way. If the pages go live first, the page is the visible surface the contracts talk about (section 1 of the licence reference below).
- **Taxes and an attorney are his.** Nothing for the seats to decide. What each needs to read is in the hand-off list below.
- **Support is read by him.** `info@andromedagenius.com`.

### Open: five things

**The ladder.** Does he take the recommended breaks (monthly $98, six months $518, annual $897, built on the $5.50 daily list), a gentler or steeper set from the table in section 1, or his own numbers? *Blocks:* the pricing page, the checkout words, the terms of sale.

**Does a plan renew on its own, and what happens when someone changes plan.**
- His daily plan charges automatically. For the monthly, six-month and annual plans: (a) the plan renews automatically and charges the saved card; (b) it ends at its date and the user buys again. Automatic renewal of a prepaid term is regulated in several states (clear disclosure, clear consent, an easy way to cancel online; California's law also asks for a reminder 15 to 45 days before an annual renewal; from law-firm summaries I read today, not the statutes). A daily automatic charge may fall under the same laws. That is for his attorney. My lean: (b) at first, because it needs no renewal notice and the user decides each time.
- A daily buyer who buys a monthly plan on day 10: is there a credit for the days already paid? My lean: no credit; each paid day was delivered in full.
- Cancelling a plan means it does not renew; access runs to its paid date.

**The refund and cancellation rule.** The drafted terms of sale (`docs/legal/terms-of-sale-daily-pass.md`) hold this open for him. For the daily day the choices are no refund for a day that has run, pro-rated, or a short window. My recommended default, as already drafted: "no refund for a paid day that has already run its course: by the time a day ends, that day's reports have already been delivered in full. If a charge was made in error, or the service was unavailable for a paid day through our own fault, contact info@andromedagenius.com and we will make it right."
- The plans need their own line. One comparable (Seeking Alpha's terms, *read 09-27*) is nonrefundable by default with a 30-day window on an annual plan. My lean: a full refund on request within seven days if no more than one paid day was used; after that none; cancelling stops renewal.
- Why before the first charge: Stripe charges $15 per dispute, and $15 more if we respond ($15 back if we win) (*read today*). On a $5.50 day one dispute costs almost three days' revenue; on an $897 annual it puts $897 at risk.

**Why "US only" is on the list.** He asked. It is not a legal requirement and it is not in the product. It came from his own words on 2026-09-08: anyone who trades the US market, "but i dont want any overhang on international regs." The privacy policy then wrote it down: the desk is "operated from the United States, by a US company, for people trading the US market", and it kept that true by saying "we do not offer it to the public anywhere... we choose who is invited." That sentence becomes false the day anyone can buy, so the policy needs a new sentence either way. The question is only what the new sentence says.
- What selling to a buyer outside the US brings, as far as I know it: that country's consumer, tax and privacy rules can apply to the sale (for example value-added tax on digital services in the EU, and its data-protection law), and Stripe charges more on a card issued outside the US: +1.5% for an international card and +1% if currency has to be converted (*read today*). I have not read any non-US rules; this is for his attorney and accountant.
- The two ways to write it: (a) the buyer says they trade the US market and the billing address must be in the US, with non-US cards refused if Stripe can do that (I have not checked); (b) the policy says the desk is for people trading the US market, and the desk takes whoever pays.
- My lean: (b) is simplest and costs a little in card fees and possibly foreign tax; (a) is the cleaner way to keep his "no overhang" and costs a checkout step. It is his call, and "don't care" is a fair answer: then the policy and terms say the desk is for people trading the US market, and the attorney and accountant decide what that needs.

**The Stripe account for Andromeda Genius.** Stripe is decided. What I could not establish:
- The existing Stripe account is a Malta-country account, "not portable"; whether it is registered as an individual or a business was left open (corporate-office `revenue/pre-contact-checks.md`, 2026-09-15). TMI sells as Andromeda Genius, Inc., a Texas company formed 2026-09-24 (`company/decisions.md:3775`). That file says the Texas route runs "EIN → bank → a new Stripe account". I could not find whether the EIN, the business bank account and the new account exist today. If any step is missing it is the longest item in the sequence, because it is not code.
- Corporate-office D-014 (2026-09-15): no seat sets up Stripe products, prices, webhooks or checkout; it goes to the project thread, by Stripe's MCP or CLI, once the shape is settled. For mointel that means Ops and Web build it. The account and the keys are his; seats never create accounts or enter keys.
- Stripe may question the business. It lists "Investment and brokerage services" as restricted: "additional due diligence... proof of relevant licenses or more details about your business model" (*read today*). TMI is an information service, not an investment or brokerage service, but Stripe decides the classification, and I do not know until the account applies. Stripe also prohibits "get rich quick" schemes, one more reason the copy stays inside `docs/marketing/what-it-is-not.md`.

Two defaults I applied, for him to overrule: no free first day, and a first-time buyer saves a card before the desk opens ("admitted immediately" starts from the second day, because there is no card on file the first time).

### For his attorney and accountant: what each needs to read

- **Attorney:** the terms of service (its header says "NOBODY WITH A LAW LICENCE HAS READ THIS FILE", and its payment clauses fall due "the day the desk charges for anything", `docs/legal/terms.md:63-86`); the terms of sale; the privacy policy; automatic renewal; the investment-adviser posture of the reports (my 09-27 section, `docs/research/session-reports/commercial.md`, which rests on the publisher's exclusion and Lowe v. SEC and has never had counsel; selling to the public, not by invitation, is the "general and regular circulation" shape the exclusion describes, and the board is the same for everyone); and the licence agreements.
- **Accountant:** sales tax. I told him in my 09-26 scope that none would be owed for a US-only, low-volume sale. That is withdrawn: I had not checked it, and Stripe's page describes tax collection as a separate product you turn on. What I could read today, from secondary sources and not from the Texas Comptroller: Texas generally treats subscription access to data and information as taxable, on 80% of the charge, at 6.25% plus local rates up to 8.25%; other states differ. Stripe's tool (*read today*) is 0.5% per transaction where registered, or $0.50 per transaction through the API, or from $90 a month for the full product. A merchant of record (Paddle: 5% + 50 cents per checkout, including tax, fraud, chargebacks and billing support; it asks to be contacted for products under $10; I did not read its acceptable-use page) is the other route.

### Licence reference (he has said it will be in place; this is what it involves)

*Read 09-07 unless marked.* Alpaca's terms: content is for personal and noncommercial use; Alpaca may end the service "with or without cause at any time and effective immediately"; its support answer is "you cannot redistribute Alpaca API data". The exchange agreements forbid giving the data to anyone else. The desk's news comes from Alpaca's Benzinga feed under the same personal-use clause (*read 09-25*). My 09-08 reading: detection follows visibility, not volume, and "a public launch with search presence, payments and social posts is the evidence in full view".

| Path | Price | Re-read |
| --- | --- | --- |
| Massive Stocks Business plus Full Market real-time | $2,499 + $1,999 = $4,498 a month; "Additional exchange fees apply to these products... guide you through exchange approval" (amounts not stated) | today |
| Massive plus Full Market Delayed (15 minutes late; the premarket window the board exists for is gone) | $2,499 + $499 = $2,998 a month | today |
| Databento Plus (external distribution), annual contract | $1,750 a month in license fees (it was $1,500 on 09-07); the page shows no exchange-fee figure | today |
| A vendor-published all-in figure for real-time SIP | $10,000 to $20,000 a month | 09-07 |
| Alpaca Broker partnership (end users hold Alpaca accounts) | sales-priced, no published figure | 09-07 |
| Each user brings their own Alpaca key (only Alpaca documents this) | $0 to the desk; $99 a month to each user for all US exchanges, $0 for IEX only; the discovery layer is still the desk's own subscription | prices today; approach 09-07 |

Besides the monthly price, signing involves exchange agreements, a subscriber agreement or click-through for every viewer, monthly reporting, three years of records, and a rebuild of the market worker for any vendor but Alpaca. The 2027-04-01 consolidated-tape changes alter the per-viewer rates and the derived-data rule; I have not re-read them. The same agreements have to cover the news feed (Benzinga direct has no published price; the primary wires bar reuse or publish nothing, *read 09-25*). Giving Alpaca the 30-day "User Application" notice is free, licenses nothing, and puts the plan on Alpaca's file; asking a vendor for exchange fees is an enquiry. Both are his, never a seat's. Corporate-office D-016's hazard applies: a payment path built complete and sitting one environment variable from live, with nothing in front of it. His rule already covers it: nothing charges anyone until he approves the first real run.

---

## 3. Already ruled, not to be asked again

- The unit is a day pass to everything (2026-09-27: "a subscriber pays for a days usage of everything"), $5.50 a day ($5 a day with the card fee covered, his 23:33:31Z word), the paid day 20:00 to 20:00 ET.
- Charge at sign-in, in the background, automatically each paid day. A failed charge gives one hour "regardless of time", counted once from the first failure; retry only when the card is updated; a lapsed hour ends only that day's session; no charge on a non-trading day; two OS notifications (at the failure, and at 10 minutes left).
- The door is the allowlist; the gate never learns about payment.
- Nothing charges anyone until he approves the first real run.
- Monthly, six-month and annual plans are wanted (replacing the 09-27 refusal).
- A month is the market's calendar month. Anyone can buy on day one. The licence will be in place. Taxes and the attorney are his. He reads support.

## 4. The sequence: what must be true before a buy button is live

No dates. The paced items are his (the answers, the licence, the Stripe account, the lawyer, the approval), and a date I invented would reach him as a constraint. Sizes are my guesses for ordering only; no owner has estimated, and each owner replaces mine.

1. **His answers still open in section 2** (the ladder, renewal, refunds, the "US only" sentence, the Stripe account state).
2. **The licence in place** (his word). Before the first paying customer at the latest.
3. **The Stripe account for Andromeda Genius, test mode, keys** (his), including Stripe's own review of the business. If the EIN or the bank account is missing, this is the long item.
4. **Words and legal text** (Commercial, Marketing, Web), then his yes to the exact strings:
   - terms of service: section 2 ("There is no public sign-up") and section 3 ("Your invitation was issued to an email address"), and the payment clauses;
   - terms of sale: the draft exists for the daily day; its section 2 still describes a self-serve card save, and it has nothing yet on the longer plans, tax, or the non-trading-day rule; the refund line is his;
   - privacy policy: section 8 (above); "who else sees it" gains Stripe; the billing data kept (Stripe's customer and payment-method ids and a charge row per paid day; no card numbers touch our box);
   - the front page: the hero, the access section, the FAQ price answer and the meta description, in both design copies (`landingCopy.ts:265-283`, `app/page.tsx:44`, both canvases). Web's inventory is `docs/web/2026-10-16-no-beta-purchase-inventory.md` (`be740b05`). Its section 2 voids the beta and invitation lines in my read 144 (decisions 1, 2 and 5 there); decision 3, decision 4 and the product sections stand.
   - **Order rule:** the words that say "by invitation" change before or with the first public purchase path, never after.
5. **Build** (the daily design was approved 2026-09-28, nothing is built): Ops, the charge table, the billing unit, and a signed webhook exemption (every `/api/` route is behind the request gate today); Web, the pages (pricing, checkout, "you are in", the two refusal cases, update card, billing history, cancel); Design, the in-app warning; Marketing, the words; Commercial, the terms of sale and every string read. **The longer plans add a paid-through date and a checkout charge that is not in the daily design.** My size guesses: Ops and the proof in test mode, days; Web's pages, days (Web's own estimate for the front-page rewrite alone was about a day); Design's warning, small (the design exists, `daily-billing-design/design-seat.md`); the plans, a small addition to the daily design (my 09-27 annual file: no processor call in the sign-in path); words and legal text, days of seat time after his answers.
6. **Proof on production routes in test mode** (there is no staging): sign in, charged; a declined test card, the warning, the session ends at one hour; a card fixed inside the hour, restored; a plan purchase, a paid-through date, a lapse.
7. **His approval of the first real run, then live keys.**

## 5. What I could not establish

- Whether Stripe will take the business as an information service, and whether it would ask for licences.
- Whether the Texas company has an EIN, a business bank account and the new Stripe account today.
- Whether a merchant of record supports a daily saved-card charge, and whether Paddle would accept the product.
- What an exchange would assess against a seller that redistributes, beyond reclassification and retroactive fees.
- The exchange fee amounts behind Massive's expansions and Databento's external distribution for US equities, and how the 2027-04-01 changes land.
- Which US states would tax a sale there. The Texas figures are secondary summaries and a 1999 ruling; the Comptroller's current rule (Rule 3.330) was not read. The renewal-law points are from law-firm summaries and not the statutes.
- How many heavy users a bigger break would convert. There is nothing to measure yet.

## 6. Corrections to my own earlier files

- Billing scope 09-26, section 3, "Tax": withdrawn above.
- Billing scope 09-26, section 1b: I ruled out a merchant of record because there was "no international overhang to absorb". That rested on a handful of invited buyers. With purchase pages, US state sales tax is what a merchant of record would absorb. The ruling is reopened above, not reversed.
- Feed-licence landscape: Databento Plus is $1,750 a month now, not $1,500.
- Day-pass annual file 09-27: monthly is wanted again.
- Read 144: the beta and invitation lines (its decisions 1, 2 and 5) are void by his word; its other required changes stand.

## Sources

Opened this session, from this repo: `docs/commercial/2026-09-26-billing-onboarding-support-scope.md`, `2026-09-27-day-pass-addendum.md`, `2026-09-27-day-pass-addendum-2-annual.md`, `2026-09-27-price-tiered-pricing-scope.md`, `2026-09-28-daily-billing-infra.md`, `daily-billing-design/commercial.md`, `2026-09-07-which-price.md`, `2026-09-07-feed-licence-landscape.md`, `2026-09-25-newswire-licence-landscape.md`, `docs/research/benzinga-licence-cost-2026-09-29.md`, `docs/beta-launch-path-2026-10-05.md`, `docs/legal/terms.md`, `privacy-policy.md`, `terms-of-sale-daily-pass.md`, `docs/research/session-reports/commercial.md`, `docs/marketing/what-it-is-not.md`, `lib/public/landingCopy.ts` at `d772ba25`, and Web's inventory at `be740b05`. From `A:\corporate-office`: `company/decisions.md` (D-014, D-016, D-076, the entity formation entry at line 3775) and `revenue/pre-contact-checks.md`.

Read on the web today (2026-10-16): stripe.com/pricing, stripe.com/tax, stripe.com/legal/restricted-businesses, paddle.com/pricing, massive.com/business-stocks, databento.com/pricing, alpaca.markets/data, nyse.com/trade/hours-calendars (the 2026 and 2027 closures; trading days counted by me), a web search for Day Trade Dash and Trade Ideas prices (Trade Ideas' own comparison pages), a web search for Texas sales tax on information services, and a web search for state automatic-renewal laws (law-firm summaries).
