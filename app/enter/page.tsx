import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { forbidden, redirect } from 'next/navigation';

import { SESSION_COOKIE } from '@/lib/auth/cookie';
import { admissionForSession } from '@/lib/auth/requestGate';
import { ENTRY_GATE, ENTRY_GATE_VERSION } from '@/lib/legal/entryGate';

/**
 * /enter: THE ENTRY GATE (Commercial 12b; placement docs/web/2026-10-05-entry-gate-placement.md).
 *
 * Renders ONLY for a signed-in, invited person who has not accepted the current
 * text. Everyone else is sent where they belong, so the page cannot be used to
 * reach anything: anonymous -> /signin, refused -> 403, already accepted ->
 * /desk. /desk and every data route check the same state on every request, so
 * the back button, a direct URL, a reload or a second tab all land here until
 * ACCEPT.
 *
 * ACCEPT and DECLINE are plain form POSTs, so the gate works before any script
 * loads. ACCEPT sends the version the person was shown; the server refuses a
 * stale one. DECLINE signs out and lands on the public page; nothing is
 * recorded, so the gate appears again on the next entry.
 *
 * THE BODY BELOW IS A BARE PLACEHOLDER for Design's screen, which replaces it
 * and receives { text, version } as props. The words come from
 * lib/legal/entryGate.ts and are never retyped here.
 */

export const metadata: Metadata = {
  title: 'Disclaimer | The Momentum Intelligence Trading Desk',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function EnterPage() {
  const admission = admissionForSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (admission.state === 'anonymous') redirect('/signin');
  if (admission.state === 'refused') forbidden();
  if (admission.state === 'admitted') redirect('/desk');

  const text = ENTRY_GATE;
  return (
    <main className="mx-auto flex min-h-full max-w-[68ch] flex-col gap-6 bg-desk px-5 py-16 text-ink">
      <h1 className="text-3xl font-semibold">{text.title}</h1>
      {text.paragraphs.map((paragraph) => (
        <p key={paragraph} className="text-[17px] leading-relaxed text-ink-1">
          {paragraph}
        </p>
      ))}
      <p className="text-[17px] leading-relaxed text-ink-1">
        {text.summary}{' '}
        <a href={text.termsLink.href} target="_blank" rel="noopener noreferrer" className="text-accent">
          {text.termsLink.label}
        </a>
      </p>
      <div className="flex flex-wrap gap-4">
        <form method="post" action="/auth/accept">
          <input type="hidden" name="version" value={ENTRY_GATE_VERSION} />
          <button type="submit" className="h-11 rounded border border-line-2 px-5 font-medium text-ink">
            {text.accept}
          </button>
        </form>
        <form method="post" action="/auth/signout">
          <button type="submit" className="h-11 px-5 text-ink-1">
            {text.decline}
          </button>
        </form>
      </div>
    </main>
  );
}
