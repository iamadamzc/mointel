import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { PaymentPending, RefusedTrial } from '@/components/NotAdmitted';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { getIdentityDb } from '@/lib/auth/db';
import { marketDaysOrFallback } from '@/lib/auth/expiry';
import { SESSION_COOKIE } from '@/lib/auth/cookie';
import { admissionForSession } from '@/lib/auth/requestGate';
import { billingStateFor } from '@/lib/billing/account';
import { checkoutStatus } from '@/lib/billing/checkoutStatus';
import { trialsWithoutEnd, trialState, verifiedEmailFor } from '@/lib/billing/store';
import { trialCalendarMonths, trialEndsAt } from '@/lib/billing/trialClock';
import { sessionEndUtc } from '@/lib/market/session';
import { PLANS, YOU_ARE_IN } from '@/lib/public/purchaseCopy';
import { etEndTime } from '@/lib/public/purchaseFormat';
import { purchaseOpen } from '@/lib/public/purchaseOpen';
import { paidDayCalendarSources, purchaseCalendar, purchaseStripe } from '@/lib/public/purchaseServer';

/**
 * /welcome?session_id=...: where Stripe sends the buyer back ("you are in"). One button,
 * "Open the desk", to /desk; the gate then sends a first-timer to /enter for the one-time
 * disclaimer before the board (Web's order, the purchase flow words' section 1).
 *
 * What happened is Billing's read, checkoutStatus, keyed by the session id in the URL and
 * checked against the signed-in user (an id in a URL is not a credential):
 * - complete: you're in, with the amount and the end time from billingStateFor;
 * - recording: paid at Stripe, not admitted yet (the webhook is seconds behind): the
 *   "payment not confirmed yet" screen, whose Reload asks again;
 * - not ours, still open, expired: back to /pricing;
 * - a refused trial: the refused-trial page, one message per Billing reason
 *   (components/NotAdmitted.tsx RefusedTrial).
 *
 * Words: lib/public/purchaseCopy.ts (purchase flow sections 1 and 6; free trial
 * section 3).
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false } };

async function trialEndOf(db: ReturnType<typeof getIdentityDb>, userId: number): Promise<Date | null> {
  const state = trialState(db, userId);
  if (state.state === 'active' && state.endsAt) return new Date(state.endsAt);
  // The billing unit fills ends_at a few seconds after the trial starts; until then the
  // same pure clock, from the recorded start, gives the same instant.
  const pending = trialsWithoutEnd(db).find((row) => row.userId === userId);
  if (!pending) return null;
  const start = new Date(pending.startedAt);
  return trialEndsAt(start, await purchaseCalendar(trialCalendarMonths(start)));
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!purchaseOpen()) notFound();

  const db = getIdentityDb();
  const admission = admissionForSession((await cookies()).get(SESSION_COOKIE)?.value, db);
  if (admission.state === 'anonymous') redirect('/signin');

  const params = await searchParams;
  const sessionId = typeof params.session_id === 'string' ? params.session_id : null;
  if (!sessionId) redirect('/pricing');

  const status = await checkoutStatus({ db, stripe: purchaseStripe() }, admission.userId, sessionId);
  // One moment for the whole request, and Billing's account read on the folded paid day
  // (a weekend belongs to Monday's), so both branches that read the account ask the same
  // question. The calendar is read only by the branch that needs it.
  const now = new Date();
  const accountNow = async () =>
    billingStateFor(db, admission.userId, await marketDaysOrFallback(now, paidDayCalendarSources()), now);
  if (status.state === 'trial_refused') {
    const door = (await accountNow()).door;
    return <RefusedTrial reason={status.reason} deskOpen={door === 'ok' || door === 'trial'} />;
  }
  if (status.state !== 'complete' && status.state !== 'recording') redirect('/pricing');

  const query = new URLSearchParams();
  if (params.trial === '1') query.set('trial', '1');
  query.set('session_id', sessionId);
  // From Billing's record of the session, never from the URL's ?trial=1.
  const isTrial = status.purchase === 'trial';
  const pending = () => {
    const email = verifiedEmailFor(db, admission.userId);
    if (!email) redirect('/desk');
    return <PaymentPending email={email} reloadHref={`/welcome?${query.toString()}`} trial={isTrial} />;
  };
  if (status.state === 'recording') return pending();

  let line: string | null = null;
  let noRefunds = true;
  if (status.purchase === 'trial') {
    const end = await trialEndOf(db, admission.userId);
    if (end) line = YOU_ARE_IN.trial(etEndTime(end));
    noRefunds = false;
  } else {
    const state = await accountNow();
    const plan = PLANS[status.purchase];
    if (status.purchase === 'daily') {
      if (state.paidThroughAt) line = YOU_ARE_IN.daily(plan.amount, etEndTime(new Date(state.paidThroughAt)));
    } else if (state.plan) {
      line = YOU_ARE_IN.plan(plan.amount, plan.for, etEndTime(sessionEndUtc(state.plan.paidThroughEtDate)));
    }
  }
  if (!line) return pending();

  return (
    <div className="min-h-full bg-desk text-ink">
      <SiteHeader />
      <main className="flex justify-center px-5 py-16 md:px-8 md:py-24">
        <div className="flex w-full max-w-[460px] flex-col gap-6">
          <h1 className="text-[32px] font-semibold leading-[1.1] tracking-tight md:text-[40px]">{YOU_ARE_IN.headline}</h1>
          <p className="text-[17px] leading-relaxed text-ink-1">{line}</p>
          <Link
            href="/desk"
            className="flex min-h-12 items-center justify-center rounded bg-ink px-6 text-base font-semibold text-desk md:h-12 md:text-[15px]"
          >
            {YOU_ARE_IN.button}
          </Link>
          {noRefunds ? <p className="text-[13px] text-ink-3">{YOU_ARE_IN.noRefunds}</p> : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
