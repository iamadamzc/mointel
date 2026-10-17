/**
 * Every word a buyer reads on Web's purchase pages, in one place, so the copy can be
 * checked against its source in one read. Nothing here is Web's own wording.
 *
 * SOURCES, each approved word for word by him (read at his turns, Integration chat
 * c0c75c81):
 * - pricing and checkout: docs/marketing/purchase-pages-words-2026-10-17.md @dd60a775,
 *   his "1, approved" (uuid 6c3dc8f3, 2026-10-17T00:12:10.134Z), file 3 as shown;
 * - you're in and the refusal split: docs/marketing/purchase-flow-words-2026-10-17.md
 *   @b227a882 (sections 1 and 6), his "1, yes" (uuid 3f2e06b4, 2026-10-17T03:11:47.893Z)
 *   to file 4, which differs from @b227a882 only by the desk@tmitrader.com swap he ordered
 *   (uuid ef2e00fd);
 * - the free trial: docs/marketing/free-trial-words-2026-10-17.md @ef49a6ef (sections 1,
 *   2, 3 and the refusal row of 6), his "1, yes" (uuid 4c63ebbb, 2026-10-17T02:44:31.716Z)
 *   to file 6 "including that bank line".
 *
 * - the sign-in page's email option: docs/marketing/email-link-signin-words-2026-10-17.md
 *   @b227a882 (section 1, and the refusal line in section 5), his "1, yes" (uuid 91dfe64b,
 *   2026-10-17T03:54:19.866Z) to files 8 and 9. Ops's lib/auth/emailLinkWords.ts holds the
 *   same file's sections 2 to 4 (the pages after the form, and the email).
 *
 * Placeholders in braces are filled by the page from the buyer's own purchase; the
 * filled forms follow the word files' variable notes ({endTime} "8:00pm ET on Friday,
 * October 17").
 */

import type { Purchase } from '@/lib/billing/config';

export const PRICING = {
  title: 'Pricing · TMI',
  description:
    'Daily, monthly, six-month and annual access to the TMI desk, for people trading the US market. Prices are in US dollars.',
  headline: 'Pricing',
  underHeadline: 'TMI is for people trading the US market. All prices are in US dollars.',
  basis:
    '*Against $5.50 for every trading day in the period: 20.9 trading days in an average month, 125.5 in six months, 251 in a year. A month with fewer or more trading days changes the figure.',
  /** His "1, yes" (Integration chat bf3b407e, uuid ebe864a6, 2026-10-17T12:15:21.014Z) to docs/integration/2026-10-17-paid-day-for-him.md @579acaee. */
  paidDay:
    'A paid day runs from 8:00pm ET after one trading day to 8:00pm ET after the next. Weekends and market holidays belong to the paid day that follows, so Monday\'s paid day runs from 8:00pm ET Friday to 8:00pm ET Monday. Its first report is the one going into the next premarket. You are charged once for a paid day, on your first sign-in in it.',
  renew: 'Plans renew on their own at the end of each period, at the price then in force, until you cancel.',
  noRefunds: 'No refunds.',
} as const;

/**
 * The trial block above the four plans. Length, table and card line: his "yes, approved"
 * (Integration chat bf3b407e, uuid 0d2b3467, 2026-10-17T11:34:11.460Z) to
 * docs/integration/2026-10-17-free-trial-words-final-for-him.md @666038e6 ("The pricing
 * page, free trial block"); Marketing 8ec74cae v6. The button is unchanged (free trial
 * words, section 1). The table's end times come from the trial clock (lib/billing/trialClock.ts).
 */
export const PRICING_TRIAL = {
  headline: 'Try it free for 48 hours, not counting weekends and market holidays.',
  clock: 'The clock stops from 8:00pm ET Friday to 8:00pm ET Sunday, and over a market holiday.',
  tableLead: 'In a week with no market holiday:',
  tableHeads: ['If you start', 'Your trial ends'],
  examples: [
    ['Tuesday at 10:00am ET', 'Thursday at 10:00am ET'],
    ['Wednesday at 5:00am ET', 'Friday at 5:00am ET'],
    ['Thursday at 10:00am ET', 'Monday at 10:00am ET'],
    ['Friday at 10:00am ET', 'Tuesday at 10:00am ET'],
    ['Friday at 9:00pm ET', 'Tuesday at 8:00pm ET'],
    ['Saturday at 2:00pm ET', 'Tuesday at 8:00pm ET'],
    ['Sunday at 9:00pm ET', 'Tuesday at 9:00pm ET'],
  ],
  underTable: 'A start between 8:00pm ET Friday and 8:00pm ET Sunday counts from 8:00pm ET Sunday.',
  card: 'We ask for a card only so the same card cannot start a second trial. The trial never charges it, and we do not keep it: we keep only a code that identifies it. The free trial is once per person and per card.',
  button: 'Start free trial',
} as const;

export interface PlanCopy {
  /** The checkout summary's Plan value. */
  name: string;
  /** The price line, with its period. */
  price: string;
  /** The pricing page's second line. */
  second: string;
  /** The pricing page's button. */
  choose: string;
  /** The checkout summary's "Charged today" value. */
  chargedToday: string;
  /** The pay button. */
  pay: string;
  /** {amount} in the legal sentence and on "you're in". */
  amount: string;
  /** {for} on "you're in" and in the plan sentence. */
  for: string;
  /** {every} in the plan sentence; null for Daily. */
  every: string | null;
}

export const PLANS: Record<Purchase, PlanCopy> = {
  daily: {
    name: 'Daily',
    price: '$5.50 a day',
    second: 'You pay only for the days you sign in.',
    choose: 'Choose daily',
    chargedToday: '$5.50 for one paid day',
    pay: 'Pay $5.50 a day',
    amount: '$5.50',
    for: 'one paid day',
    every: null,
  },
  monthly: {
    name: 'Monthly',
    price: '$89 a month',
    second: 'About 23% less than paying daily. About $4.26 a day.*',
    choose: 'Choose monthly',
    chargedToday: '$89 for one month',
    pay: 'Pay $89 a month',
    amount: '$89',
    for: 'one month',
    every: 'month',
  },
  six_month: {
    name: 'Six months',
    price: '$499 for six months',
    second: 'About 28% less than paying daily. About $3.98 a day.*',
    choose: 'Choose six months',
    chargedToday: '$499 for six months',
    pay: 'Pay $499 for six months',
    amount: '$499',
    for: 'six months',
    every: 'six months',
  },
  annual: {
    name: 'Annual',
    price: '$899 a year',
    second: 'About 35% less than paying daily. About $3.58 a day.*',
    choose: 'Choose annual',
    chargedToday: '$899 for one year',
    pay: 'Pay $899 a year',
    amount: '$899',
    for: 'one year',
    every: 'year',
  },
};

export const CHECKOUT = {
  title: 'Checkout · TMI',
  headline: 'Your plan',
  underHeadline: 'TMI is for people trading the US market. Prices are in US dollars.',
  rows: { plan: 'Plan', price: 'Price', chargedToday: 'Charged today', renews: 'Renews' },
  /** The Renews value for a plan: `{renewal date}, at the price then in force`. */
  renewsPlan: (renewalDate: string) => `${renewalDate}, at the price then in force`,
  renewsDaily: 'Each new paid day you sign in on',
  noRefunds: 'No refunds.',
  /** Commercial's sentence beside the pay button, Daily; the paid-day words @579acaee (uuid ebe864a6). */
  legalDaily: (amount: string) =>
    `You will be charged ${amount} now, and automatically on each new paid day you sign in on, on this card, until you stop. A paid day runs from 8:00pm ET after one trading day to 8:00pm ET after the next, so a purchase on a weekend or market holiday is for the next trading day. No refunds. You can stop in the desk at any time.`,
  /** Commercial's sentence beside the pay button, a plan. */
  legalPlan: (amount: string, forPeriod: string, every: string, renewalDate: string) =>
    `You will be charged ${amount} now for ${forPeriod}, and again every ${every} from ${renewalDate}, at the price then in force, on this card, until you cancel. You can cancel in the desk at any time and keep access to the end of the period you paid for. No refunds.`,
} as const;

/**
 * Shown when Stripe or the calendar cannot be reached from the checkout or the trial
 * start screen: the purchase flow's own "billing cannot be reached" line (b227a882
 * section 4, in file 4), reused for the same state.
 */
export const UNAVAILABLE = 'If you cannot use this page, email desk@tmitrader.com and we will do it for you.';

/** The unticked box, the same on the checkout and the trial start screen. */
export const AGREE = {
  before: 'I have read and agree to the ',
  termsOfSale: 'Terms of sale',
  between: ' and the ',
  termsOfService: 'Terms of service',
  after: '.',
} as const;

/**
 * The trial start screen (free trial words, section 2). The line under the headline and
 * the sentence beside the button: his "yes, approved" (uuid 0d2b3467) to @666038e6 ("The
 * trial start page").
 */
export const TRIAL_START = {
  headline: 'Start your free trial',
  underHeadline: (trialEnd: string) =>
    `Free for 48 hours, not counting weekends and market holidays. Your trial ends around ${trialEnd}.`,
  sentence:
    'Free for 48 hours, not counting weekends and market holidays. The clock stops from 8:00pm ET Friday to 8:00pm ET Sunday, and over a market holiday. In a week with no market holiday, a trial started on a Thursday at 10:00am ET ends on the Monday at 10:00am ET. We ask for a card only so the same card cannot start a second trial. The trial never charges it, and we do not keep it: we keep only a code that identifies it. We ask Stripe to remove the card from your account at once, so it can never be charged. Stripe keeps a record of the card under its own privacy policy. When the trial ends, nothing is charged and your access ends. Your bank may show a small pending amount while the card is checked. It is not a charge, and we never take it.',
  button: 'Start free trial',
} as const;

/** You are in (purchase flow section 1; free trial section 3). */
export const YOU_ARE_IN = {
  headline: "You're in.",
  plan: (amount: string, forPeriod: string, endTime: string) =>
    `You were charged ${amount} for ${forPeriod}. Your plan runs to ${endTime}, and renews unless you cancel.`,
  daily: (amount: string, endTime: string) => `You were charged ${amount} for one paid day. It ends at ${endTime}.`,
  trial: (trialEnd: string) => `Your free trial ends at ${trialEnd}. You will not be charged.`,
  button: 'Open the desk',
  noRefunds: 'No refunds.',
} as const;

/**
 * The refused-trial page: his "1, yes" (Integration chat bf3b407e, uuid 622497ba,
 * 2026-10-17T11:04:55.669Z) to docs/integration/2026-10-17-refused-trial-and-privacy-for-him.md
 * section 1 @f84c59fa, sent to him at 11:01:36Z; words Marketing
 * docs/marketing/refused-trial-words-2026-10-17.md @06fd4a78 (Commercial read 161a PASS).
 * The bank line is for card_used, account_used and already_bought only. For already_bought,
 * "Open the desk" replaces "See pricing" when the account still has access (Billing's door
 * 'ok' or 'trial').
 */
export const REFUSED_TRIAL = {
  headline: "We couldn't start your free trial.",
  notCharged: 'You were not charged for this.',
  bankLine: 'Your bank may show a small pending amount from the card check. It is not a charge, and we never take it.',
  reasons: {
    card_used: 'The free trial is once per person and per card, so it can\'t start with this card. You can buy a day or a plan.',
    account_used: "You've already had your free trial. The free trial is once per person and per card. You can buy a day or a plan.",
    already_bought:
      "You've already bought on this account, so a free trial isn't available. You can buy a day or a plan at any time.",
    not_a_card: "The free trial needs a card, and the payment method you used wasn't one. You can try again with a card.",
  },
  tryAgain: 'Try again',
  pricing: 'See pricing',
  openDesk: 'Open the desk',
  signOut: 'Sign out',
} as const;

/** The sign-in page's second option, by email link (email-link words, section 1). */
export const SIGNIN_EMAIL = {
  lead: 'Sign in with Google, or with a link we email you. There is no password to set, and none for us to store.',
  description:
    'Sign in to the desk with Google or with a link sent to your email. There is no password to set and none for us to store.',
  separator: 'or',
  label: 'Email address',
  button: 'Email me a sign-in link',
  under: 'We email you a link. Open it to sign in.',
  address: 'We use your email address to send this link and to sign you in.',
} as const;

/**
 * The refusal screen, split (purchase flow section 6; free trial section 6). The
 * stranger's body takes the email-link words' section 5 change ("tied to the email
 * address you sign in with"), since email sign-in ships in the same launch.
 */
export const REFUSAL = {
  stranger: {
    headline: 'This account has no access yet.',
    body: (email: string) =>
      `You are signed in as ${email}. Access is by purchase, and is tied to the email address you sign in with. If you bought on a different address, sign out and come back on that one.`,
    trial: 'Start free trial',
    pricing: 'See pricing',
    signOut: 'Sign out',
    ask: 'Ask about access',
  },
  pending: {
    headline: 'Your payment has not been confirmed yet.',
    body: (email: string) => `You are signed in as ${email}. Reload this page to check again.`,
    reload: 'Reload',
    signOut: 'Sign out',
    ask: 'Ask about your payment',
    /**
     * The same screen after a free trial starts: his "yes to all five" (Integration chat
     * bf3b407e, uuid c7584eb1, 2026-10-17T13:00:25.931Z) to
     * docs/integration/2026-10-17-next-words-for-him.md @488c74b5 section 3; Marketing 05bbc477.
     */
    trialHeadline: 'Your free trial has not been confirmed yet.',
    trialAsk: 'Ask about your trial',
  },
} as const;
