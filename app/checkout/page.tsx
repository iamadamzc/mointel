import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { SESSION_COOKIE } from '@/lib/auth/cookie';
import { admissionForSession } from '@/lib/auth/requestGate';
import { paidDayOf } from '@/lib/billing/store';
import { AGREE, CHECKOUT, PLANS, UNAVAILABLE } from '@/lib/public/purchaseCopy';
import { etDateOf, longEtDate, PLAN_SLUGS, purchaseFromSlug, renewalEtDate } from '@/lib/public/purchaseFormat';
import { purchaseOpen } from '@/lib/public/purchaseOpen';
import { purchaseIsTradingDay } from '@/lib/public/purchaseServer';

/**
 * /checkout?plan=<slug>: the summary and the consent, on our page, before the card is
 * taken on Stripe's own hosted page. No card field and no script here: the form posts to
 * /checkout/start, which creates the Checkout Session and answers 303 to Stripe. So no
 * page of ours links off-site; the one off-site step is a server redirect after a POST.
 *
 * WHO BUYS IS THE SIGNED-IN USER (Billing, lib/billing/checkout.ts), so a visitor with no
 * session is sent to /signin first. Any signed-in person may buy, including one the gate
 * refuses: buying is how they stop being refused.
 *
 * Words: lib/public/purchaseCopy.ts (dd60a775 section B, Commercial's sentences as
 * written). The box is unticked and required; nothing is charged before it is ticked
 * (the route checks it too, since a form attribute is not a control).
 *
 * DAILY ON A NON-TRADING DAY is not offered yet: Billing's Checkout charges nothing that
 * day (setup only), and every approved Daily line says a charge is made now. Until words
 * for that case are approved, the page sends the visitor back to /pricing rather than
 * show a false line. Raised with Integration 2026-10-17.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: CHECKOUT.title, robots: { index: false } };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!purchaseOpen()) notFound();

  const params = await searchParams;
  const purchase = purchaseFromSlug(typeof params.plan === 'string' ? params.plan : null);
  if (!purchase) redirect('/pricing');

  const admission = admissionForSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (admission.state === 'anonymous') redirect('/signin');

  const now = new Date();
  let calendarFailed = false;
  if (purchase === 'daily') {
    let trading = true;
    try {
      trading = await purchaseIsTradingDay()(paidDayOf(now));
    } catch {
      calendarFailed = true;
    }
    if (!trading) redirect('/pricing');
  }

  const plan = PLANS[purchase];
  const renewal = purchase === 'daily' ? null : longEtDate(renewalEtDate(etDateOf(now), purchase));
  const legal =
    purchase === 'daily' || renewal === null || plan.every === null
      ? CHECKOUT.legalDaily(plan.amount)
      : CHECKOUT.legalPlan(plan.amount, plan.for, plan.every, renewal);
  const failed = calendarFailed || params.e === 'unavailable';

  return (
    <div className="min-h-full bg-desk text-ink">
      <SiteHeader />

      <main className="px-5 py-10 md:px-24 md:py-16">
        <div className="flex max-w-[60ch] flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-[32px] font-semibold leading-[1.1] tracking-tight md:text-[40px]">{CHECKOUT.headline}</h1>
            <p className="text-[17px] leading-relaxed text-ink-1">{CHECKOUT.underHeadline}</p>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-8 border-t border-line">
            <dt className="border-b border-line py-3 text-sm text-ink-3">{CHECKOUT.rows.plan}</dt>
            <dd className="border-b border-line py-3 text-base text-ink">{plan.name}</dd>
            <dt className="border-b border-line py-3 text-sm text-ink-3">{CHECKOUT.rows.price}</dt>
            <dd className="border-b border-line py-3 text-base text-ink">{plan.price}</dd>
            <dt className="border-b border-line py-3 text-sm text-ink-3">{CHECKOUT.rows.chargedToday}</dt>
            <dd className="border-b border-line py-3 text-base text-ink">{plan.chargedToday}</dd>
            <dt className="border-b border-line py-3 text-sm text-ink-3">{CHECKOUT.rows.renews}</dt>
            <dd className="border-b border-line py-3 text-base text-ink">
              {renewal === null ? CHECKOUT.renewsDaily : CHECKOUT.renewsPlan(renewal)}
            </dd>
          </dl>

          <form method="post" action="/checkout/start" className="flex flex-col gap-5">
            <input type="hidden" name="plan" value={PLAN_SLUGS[purchase]} />

            <div className="flex flex-col gap-1">
              <p className="text-[28px] font-semibold tracking-tight">{plan.price}</p>
              <p className="text-[28px] font-semibold tracking-tight">{CHECKOUT.noRefunds}</p>
            </div>

            <p className="text-sm leading-relaxed text-ink-1">{legal}</p>

            <label className="flex items-start gap-3 text-sm leading-relaxed text-ink-1">
              <input type="checkbox" name="agree" value="yes" required className="mt-1 h-5 w-5 shrink-0" />
              <span>
                {AGREE.before}
                <Link href="/terms-of-sale" className="underline">
                  {AGREE.termsOfSale}
                </Link>
                {AGREE.between}
                <Link href="/terms" className="underline">
                  {AGREE.termsOfService}
                </Link>
                {AGREE.after}
              </span>
            </label>

            {failed ? (
              <p role="alert" className="rounded border border-warn/40 bg-panel px-4 py-3 text-sm leading-relaxed text-ink-1">
                {UNAVAILABLE}
              </p>
            ) : null}

            <button
              type="submit"
              className="flex min-h-12 items-center justify-center rounded bg-ink px-6 text-base font-semibold text-desk md:h-12 md:text-[15px]"
            >
              {plan.pay}
            </button>
          </form>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

