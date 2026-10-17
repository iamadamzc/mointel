# No beta, purchase pages: the price breaks first, then what he must decide

**Commercial-tmi (7th tenure), 2026-10-16 (UTC), for Integration to put to him. Version 5.** Version 1 (`6f10e70a`) treated the price and the provider as open; version 2 (`8d44410f`) priced the breaks from $5 a day. His $5.50 daily price (below) replaces that, and every number in section 1 is rebuilt on it. Version 3 (`5bb97f6d`) rebuilt section 1 on his $5.50 daily price. Version 4 (`71b7c1ef`) recorded his first answers. This version (5) records his second set (his ladder, renewal, cancel, no refunds, US wording) and replaces all four.

**What he has ruled, in his words (read at his turns through Integration):**
- "i've decided i dont want to do beta. so we can remove any beta elements and setup purchase pages." (Integration chat, uuid 6a3e4300, 2026-10-16T23:21:40.715Z)
- "$5 per day of use. it has been discussed throuroughly." (uuid 01659ed1, 2026-10-16T23:27:12.069Z)
- "$5/day. Day starts at the close of AH. So a user starts their day with the report going into premarket the next day. cards will automatically be charged per day. if a user chooses to do monthly, 6 month or annual, caluclate the logical price breaks for such a scenario." (his latest message in that chat)
- "we'll make the daily $5.50 to cover the stripe charge." (uuid dea68bce, 2026-10-16T23:33:31.014Z)
- Provider: Stripe, one new account for Andromeda Genius with TMI as a product under it (his 2026-10-05 decision in the corporate-office record, relayed by Integration; I did not find that entry in `A:\corporate-office\company\decisions.md`, and I cite what Integration relayed). The seller is Andromeda Genius LLC, not an Inc. (section 2, the Stripe account).

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

### Which base the breaks are measured from, and why

**I measure his ladder against the $5.50 list, not against the $5 he nets.** Two reasons.
- A buyer compares a plan with what the page tells them a day costs, which is $5.50. A break advertised as a percent off has to be true against that number, or the page says something false.
- The fee is already inside the $5.50, so it is already paid for. A plan that saves the card fee gives some of that back. Priced from $5.50, the plan that leaves the desk exactly as well off as daily charging is only about 5.5% off the list (a month at $108.89, six months at $651.78, a year at $1,303.26). So the first 5.5 points of any break cost the desk nothing; every point beyond that is a real concession, and the table shows it.

### His ladder, and what it means

He set it: **monthly $89, six months $499, annual $899**, with the daily at $5.50. My own earlier version ($98, $518, $897, a 15, 25 and 35 percent break) is superseded. Against the $5.50 list:

| Plan | Price | Per trading day | Off the $5.50 total | One-charge fee | Daily fees avoided | Pays off for a trader who uses more than | The desk keeps per month |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Daily | $5.50 a day | $5.50 | none | $0.46 each | none | not applicable | $105.43 (full use) |
| Monthly | **$89** | $4.26 | 22.6% | $2.88 | $6.73 | 16.2 days of 20.9 (77%) | $86.12 |
| Six months | **$499** | $3.98 | 27.7% | $14.77 | $42.90 | 90.7 days of 125.5 (72%) | $80.70 |
| Annual | **$899** | $3.58 | 34.9% | $26.37 | $88.96 | 163.5 days of 251 (65%) | $72.72 |

Things the table shows, for him to weigh and not for me to correct:
- **The first break is the big one.** Monthly is 22.6% under the daily total; the next two steps add 5.1 and 7.2 points. A trader who uses 17 days of a 21-day month is already better off on the monthly plan.
- **The six-month plan sits close to the monthly one.** Six months of the monthly plan is $534; $499 is 6.6% below that. The annual is 15.8% below twelve monthly payments and 9.9% below two six-month payments. A buyer choosing between monthly and six-month saves $35 over six months.
- **The desk keeps less per month on each longer plan**: $86.12, $80.70 and $72.72 against $105.43 for a full-use daily trader (18, 23 and 31 percent less). That is the price of the commitment. Only the first 5.5 points of any break are free to the desk (the plan that leaves it exactly as well off as daily charging is about 5.5% under the list).
- **A month is the market's month.** A flat $89 is $4.68 a day in a 19-day month and $4.05 a day in a 22-day month.

**Heads needed to cover a monthly licence cost**, assuming every one is a full-use trader paying all 20.9 days, before sales tax, refunds and disputes:

| Monthly licence cost | Daily, full use | Monthly plan | Six-month plan | Annual plan |
| --- | --- | --- | --- | --- |
| $4,498 | 43 | 53 | 56 | 62 |
| $10,000 | 95 | 117 | 124 | 138 |
| $20,000 | 190 | 233 | 248 | 276 |

**What traders pay elsewhere, for the ladder to sit against** (a competitor's own comparison pages, *read today*, so confirm on the vendors' sites): Day Trade Dash $197 a month; Trade Ideas Premium $254 a month or $2,136 a year. Per trading day that is $9.42 and $12.14; Trade Ideas annual is $8.51 a day. TMI at $5.50 a day, $4.26 on the monthly and $3.58 on the annual sits well under both.

**One more number he should see.** Stripe charges $15 for each dispute, and $15 more if we respond to it ($15 back if we win) (*read today*). On a $5.50 day a single dispute costs almost three days' revenue. On an $899 annual it also puts $899 at risk. A "no refunds" rule does not stop a card dispute; it only makes the charge words and the cancel button the things a dispute is decided on.

---

## 2. His answers, and what is still open

### Answered (his typed messages in this session, 2026-10-16)

First message: "a month is as it is according to the market. anyone can buy on day one. will have license in place. done. i will deal wiht taxes and an attorney. why is us only important? i read support."

Second message: "take whoever pays, say it's for people trading the US market. the ladder:$89, $499, $899. yes auto renew, make easy cancel. plans renwe on their own. no refunds."

- **A month** is the market's calendar month (19 to 22 trading days). Six months and a year follow the same calendar.
- **The ladder** is $89 a month, $499 for six months, $899 a year, with $5.50 a day (section 1).
- **Anyone can buy on day one.** No approval step. So the "by invitation" words in the terms (sections 2 and 3), the privacy policy (section 8) and the front page are replaced, and payment writes the buyer to the allowlist. The allowlist stays the one door and the gate does not learn about payment (`lib/auth/gate.ts:31-50`, Web). A lapse ends only that day's session (ruled 2026-09-28).
- **"US only" becomes a statement, not a gate.** The desk takes whoever pays and says it is for people trading the US market. The terms already say "The desk covers the US market and is offered to people trading it. We do not market it anywhere else", which stays true. The privacy policy's section 8 sentence "We do not offer it to the public anywhere... we choose who is invited" has to be replaced; the new wording goes to him verbatim with the other strings.
- **The plans renew on their own, and cancelling must be easy.** The daily plan also charges automatically each paid day (ruled 2026-09-28).
- **No refunds.**
- **The licence will be in place.** I read that as before the first paying customer. He did not say whether before the public pages go live; I do not need that to proceed.
- **Taxes and an attorney are his.** **Support is read by him**, `info@andromedagenius.com`.

### What those answers set going, for the owners

- **Terms of sale** (Commercial drafts, Marketing words, his yes): the daily charge, each plan's price and period, automatic renewal stated before the buyer pays and in plain words, how to cancel, "no refunds" stated before purchase, and the one-hour rule. Card-network and state rules on stating the renewal and refund terms clearly at checkout, and on an easy cancel, are for his attorney; I have read law-firm summaries of California's renewal law and no statute.
- **Cancel** (Web): a cancel action in the product that needs no email and no extra steps. Cancelling stops renewal; access runs to the paid date. This is the "Cancel" page in Web's inventory, now required before launch and not optional.
- **Renewal** (Ops, Web): a renewal charge on the saved card at the end of each period, and a renewal reminder if his attorney says one is due (California's law asks for a reminder 15 to 45 days before an annual renewal, per summaries). **The desk has no way to send a customer email today** (invitations are added by hand and notices are OS notifications), so a required reminder or a retainable receipt is a build of its own.
- **Stripe account** (his): see below.

### Open

**The Stripe account for Andromeda Genius.** Stripe is decided. What I could not establish:
- The existing Stripe account is a Malta-country account, "not portable"; whether it is registered as an individual or a business was left open (corporate-office `revenue/pre-contact-checks.md`, 2026-09-15). TMI sells as **Andromeda Genius LLC**, a Texas limited liability company effective 2026-09-24 (not an Inc.; corrected 2026-10-17). Billing-tmi reports, from his documents and not from mine: the Texas certificate of filing (file 806812738), an IRS notice dated 2026-10-16 issuing the EIN to the LLC with him as sole member, and a new Stripe account for the LLC (company, single-member LLC, tax ID provided). I did not open those documents. The corporate-office file's route was "EIN → bank → a new Stripe account" (`company/decisions.md`; line 3775 there still says Inc., the corporate office's record). What Billing reports does not mention a business bank account; if it is missing it is the longest item in the sequence, because it is not code.
- Corporate-office D-014 (2026-09-15): no seat sets up Stripe products, prices, webhooks or checkout; it goes to the project thread, by Stripe's MCP or CLI, once the shape is settled. For mointel that means Ops and Web build it. The account and the keys are his; seats never create accounts or enter keys.
- Stripe may question the business. It lists "Investment and brokerage services" as restricted: "additional due diligence... proof of relevant licenses or more details about your business model" (*read today*). TMI is an information service, not an investment or brokerage service, but Stripe decides the classification, and I do not know until the account applies. Stripe also prohibits "get rich quick" schemes, one more reason the copy stays inside `docs/marketing/what-it-is-not.md`.

**One small yes or no.** The drafted terms of sale say, after the no-refund line: "If a charge was made in error, or the service was unavailable for a paid day through our own fault, contact info@andromedagenius.com and we will make it right." With "no refunds" as his rule, does that sentence stay? It is a promise to look at a mistake, not a promise to refund. My lean: keep it, because a charge made in error is the case a dispute is won or lost on. His call.

### Defaults I applied, for him to overrule

- No free first day, and a first-time buyer saves a card before the desk opens ("admitted immediately" starts from the second day, because there is no card on file the first time).
- A daily buyer who buys a plan part-way through gets no credit for days already paid; each paid day was delivered in full.
- A plan renewal that fails gets the same one-hour warning as a daily charge, then that day's session ends; the plan has then lapsed and the next sign-in is a daily charge at $5.50.
- No refund for any plan or day, as he ruled; cancelling stops renewal and access runs to the paid date.

### For his attorney and accountant: what each needs to read

- **Attorney:** the terms of service (its header says "NOBODY WITH A LAW LICENCE HAS READ THIS FILE", and its payment clauses fall due "the day the desk charges for anything", `docs/legal/terms.md:63-86`); the terms of sale; the privacy policy; automatic renewal, easy cancel and the no-refund disclosure; the investment-adviser posture of the reports (my 09-27 section, `docs/research/session-reports/commercial.md`, which rests on the publisher's exclusion and Lowe v. SEC and has never had counsel; selling to the public is the "general and regular circulation" shape the exclusion describes, and the board is the same for everyone); selling to buyers outside the US; and the licence agreements.
- **Accountant:** sales tax. I told him in my 09-26 scope that none would be owed for a US-only, low-volume sale. That is withdrawn: I had not checked it, and Stripe's page describes tax collection as a separate product you turn on. What I could read today, from secondary sources and not from the Texas Comptroller: Texas generally treats subscription access to data and information as taxable, on 80% of the charge, at 6.25% plus local rates up to 8.25%; other states differ. Stripe's tool (*read today*) is 0.5% per transaction where registered, or $0.50 per transaction through the API, or from $90 a month for the full product. A merchant of record (Paddle: 5% + 50 cents per checkout, including tax, fraud, chargebacks and billing support; it asks to be contacted for products under $10; I did not read its acceptable-use page) is the other route. Selling to buyers outside the US adds Stripe's international card fee (+1.5%) and a currency conversion fee (+1%) (*read today*), and possibly foreign sales tax.

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
- The ladder is $89 a month, $499 for six months, $899 a year. The plans renew on their own, with an easy cancel. No refunds. "US only" is a statement ("for people trading the US market"), and the desk takes whoever pays.

## 4. The sequence: what must be true before a buy button is live

No dates. The paced items are his (the answers, the licence, the Stripe account, the lawyer, the approval), and a date I invented would reach him as a constraint. Sizes are my guesses for ordering only; no owner has estimated, and each owner replaces mine.

1. **His yes to the exact strings** (the words and legal text in item 4), and the one yes or no in section 2.
2. **The licence in place** (his word). Before the first paying customer at the latest.
3. **The Stripe account for Andromeda Genius, test mode, keys** (his), including Stripe's own review of the business. If the business bank account is missing, this is the long item.
4. **Words and legal text** (Commercial, Marketing, Web), then his yes to the exact strings:
   - terms of service: section 2 ("There is no public sign-up") and section 3 ("Your invitation was issued to an email address"), and the payment clauses;
   - terms of sale: the draft exists for the daily day; its section 2 still describes a self-serve card save, and it has nothing yet on the longer plans, tax, or the non-trading-day rule; its refund section becomes his "no refunds" rule, with the plans and automatic renewal added;
   - privacy policy: section 8 (above); "who else sees it" gains Stripe; the billing data kept (Stripe's customer and payment-method ids and a charge row per paid day; no card numbers touch our box);
   - the front page: the hero, the access section, the FAQ price answer and the meta description, in both design copies (`landingCopy.ts:265-283`, `app/page.tsx:44`, both canvases). Web's inventory is `docs/web/2026-10-16-no-beta-purchase-inventory.md` (`be740b05`). Its section 2 voids the beta and invitation lines in my read 144 (decisions 1, 2 and 5 there); decision 3, decision 4 and the product sections stand.
   - **Order rule:** the words that say "by invitation" change before or with the first public purchase path, never after.
5. **Build** (the daily design was approved 2026-09-28, nothing is built): Ops, the charge table, the billing unit, and a signed webhook exemption (every `/api/` route is behind the request gate today); Web, the pages (pricing, checkout, "you are in", the two refusal cases, update card, billing history, cancel); Design, the in-app warning; Marketing, the words; Commercial, the terms of sale and every string read. **The longer plans add a paid-through date and a checkout charge that is not in the daily design.** My size guesses: Ops and the proof in test mode, days; Web's pages, days (Web's own estimate for the front-page rewrite alone was about a day); Design's warning, small (the design exists, `daily-billing-design/design-seat.md`); the plans, a small addition to the daily design (my 09-27 annual file: no processor call in the sign-in path); words and legal text, days of seat time after his answers.
6. **Proof on production routes in test mode** (there is no staging): sign in, charged; a declined test card, the warning, the session ends at one hour; a card fixed inside the hour, restored; a plan purchase, a paid-through date, a lapse.
7. **His approval of the first real run, then live keys.**

## 5. What I could not establish

- Whether Stripe will take the business as an information service, and whether it would ask for licences.
- Whether the LLC has a business bank account today (Billing reports the EIN and the new Stripe account, not a bank account).
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
