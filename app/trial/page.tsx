import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { SubmitOnceButton, SubmitOnceForm } from '@/components/SubmitOnce';
import { getIdentityDb } from '@/lib/auth/db';
import { SESSION_COOKIE } from '@/lib/auth/cookie';
import { admissionForSession } from '@/lib/auth/requestGate';
import { canStartTrial } from '@/lib/billing/store';
import { trialCalendarMonths, trialEndsAt } from '@/lib/billing/trialClock';
import { AGREE, TRIAL_START, UNAVAILABLE } from '@/lib/public/purchaseCopy';
import { etEndTime } from '@/lib/public/purchaseFormat';
import { purchaseOpen } from '@/lib/public/purchaseOpen';
import { purchaseCalendar } from '@/lib/public/purchaseServer';

/**
 * /trial: the free trial's start screen. Our page, then the card is checked on Stripe's
 * hosted page by redirect (POST /trial/start), so no card field and no script here.
 *
 * Signed-in only (Billing: the trial belongs to the signed-in account). An account that
 * has had a trial or has bought cannot start one (canStartTrial) and is sent to /pricing.
 *
 * The end time is shown at the start (read 153): Billing's pure trial clock over the
 * market calendar, from now. The real trial starts when Stripe confirms the card, a
 * minute or so later; the clock only counts trading hours, so the two agree to within
 * that minute. If the calendar cannot be read, the end time is not guessed: the line
 * that carries it is left out and the contact line shows.
 *
 * Words: lib/public/purchaseCopy.ts (free trial words section 2, Commercial's sentence as
 * written, the bank line included).
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false } };

export default async function TrialPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!purchaseOpen()) notFound();

  const db = getIdentityDb();
  const admission = admissionForSession((await cookies()).get(SESSION_COOKIE)?.value, db);
  if (admission.state === 'anonymous') redirect('/signin');
  if (!canStartTrial(db, admission.userId)) redirect('/pricing');

  const now = new Date();
  let trialEnd: string | null = null;
  try {
    trialEnd = etEndTime(trialEndsAt(now, await purchaseCalendar(trialCalendarMonths(now))));
  } catch {
    trialEnd = null;
  }
  const failed = trialEnd === null || (await searchParams).e === 'unavailable';

  return (
    <div className="min-h-full bg-desk text-ink">
      <SiteHeader />

      <main className="px-5 py-10 md:px-24 md:py-16">
        <div className="flex max-w-[60ch] flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-[32px] font-semibold leading-[1.1] tracking-tight md:text-[40px]">
              {TRIAL_START.headline}
            </h1>
            {trialEnd ? <p className="text-[17px] leading-relaxed text-ink-1">{TRIAL_START.underHeadline(trialEnd)}</p> : null}
          </div>

          <SubmitOnceForm action="/trial/start" className="flex flex-col gap-5">
            <p className="text-sm leading-relaxed text-ink-1">{TRIAL_START.sentence}</p>

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

            <SubmitOnceButton className="flex min-h-12 items-center justify-center rounded bg-ink px-6 text-base font-semibold text-desk md:h-12 md:text-[15px]">
              {TRIAL_START.button}
            </SubmitOnceButton>
          </SubmitOnceForm>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
