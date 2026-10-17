import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { PLANS, PRICING, PRICING_TRIAL } from '@/lib/public/purchaseCopy';
import { PLAN_SLUGS, PURCHASE_ORDER } from '@/lib/public/purchaseFormat';
import { purchaseOpen } from '@/lib/public/purchaseOpen';

/**
 * /pricing: the four plans and the free trial, for a stranger. Public, no session read,
 * no script. Each "Choose" goes to /checkout, which asks for sign-in if needed; the trial
 * button goes to /trial. Nothing is charged from this page.
 *
 * Words: lib/public/purchaseCopy.ts (dd60a775 section A; free trial section 1). The
 * basis line sits directly under the plans, on the same screen, because the percents and
 * per-day figures depend on it. "No refunds." is its own line at the price line's size,
 * under the plans and above any link out.
 *
 * Behind the purchase switch (lib/public/purchaseOpen.ts): closed, this is a 404. Read at
 * request time, so the page is dynamic.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: PRICING.title,
  description: PRICING.description,
};

export default function PricingPage() {
  if (!purchaseOpen()) notFound();

  return (
    <div className="min-h-full bg-desk text-ink">
      <SiteHeader />

      <main className="px-5 py-10 md:px-24 md:py-16">
        <div className="flex max-w-[68ch] flex-col gap-3">
          <h1 className="text-[32px] font-semibold leading-[1.1] tracking-tight md:text-[40px]">{PRICING.headline}</h1>
          <p className="text-[17px] leading-relaxed text-ink-1">{PRICING.underHeadline}</p>
        </div>

        <section aria-labelledby="trial" className="mt-10 max-w-[68ch] rounded border border-line-2 bg-panel px-5 py-6 md:px-7">
          <h2 id="trial" className="text-xl font-semibold tracking-tight">
            {PRICING_TRIAL.headline}
          </h2>
          <Link
            href="/trial"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded bg-ink px-6 text-base font-semibold text-desk md:h-12 md:text-[15px]"
          >
            {PRICING_TRIAL.button}
          </Link>
          {/* Closed by default; a native disclosure, so it opens with no script. */}
          <details className="mt-5 border-t border-line pt-4">
            {/* Keeps the browser's own disclosure triangle (display: list-item), so it reads as a toggle. */}
            <summary className="cursor-pointer py-2.5 text-base font-medium text-ink-1">
              {PRICING_TRIAL.moreLabel}
            </summary>
            <p className="mt-3 text-base leading-relaxed text-ink-1">{PRICING_TRIAL.clock}</p>
            <table className="mt-4 w-full border-collapse text-left text-sm">
              <caption className="mb-2 text-left text-sm text-ink-2">{PRICING_TRIAL.tableLead}</caption>
              <thead>
                <tr className="border-b border-line-2">
                  <th scope="col" className="py-2 pr-4 font-medium text-ink-2">
                    {PRICING_TRIAL.tableHeads[0]}
                  </th>
                  <th scope="col" className="py-2 font-medium text-ink-2">
                    {PRICING_TRIAL.tableHeads[1]}
                  </th>
                </tr>
              </thead>
              <tbody>
                {PRICING_TRIAL.examples.map(([start, end]) => (
                  <tr key={start} className="border-b border-line">
                    <td className="py-2 pr-4 text-ink-1">{start}</td>
                    <td className="py-2 text-ink-1">{end}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{PRICING_TRIAL.underTable}</p>
            <p className="mt-3 text-base leading-relaxed text-ink-1">{PRICING_TRIAL.card}</p>
          </details>
        </section>

        <ul className="mt-10 grid gap-4 md:grid-cols-4">
          {PURCHASE_ORDER.map((purchase) => {
            const plan = PLANS[purchase];
            return (
              <li key={purchase} className="flex flex-col gap-3 rounded border border-line bg-panel px-5 py-6">
                <h2 className="font-mono text-[11px] tracking-[0.16em] text-ink-3 uppercase">{plan.name}</h2>
                <p className="text-2xl font-semibold tracking-tight">{plan.price}</p>
                <p className="flex-grow text-sm leading-relaxed text-ink-2">{plan.second}</p>
                <Link
                  href={`/checkout?plan=${PLAN_SLUGS[purchase]}`}
                  className="inline-flex min-h-12 items-center justify-center rounded border border-line-2 px-4 text-base font-medium text-ink md:h-11 md:text-sm"
                >
                  {plan.choose}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex max-w-[68ch] flex-col gap-4">
          <p className="text-sm leading-relaxed text-ink-2">{PRICING.basis}</p>
          <p className="text-base leading-relaxed text-ink-1">{PRICING.paidDay}</p>
          <p className="text-base leading-relaxed text-ink-1">{PRICING.renew}</p>
          <p className="text-2xl font-semibold tracking-tight">{PRICING.noRefunds}</p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
