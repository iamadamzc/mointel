import Link from 'next/link';

import { BrandMark } from '@/components/BrandMark';
import { REFUSAL, REFUSED_TRIAL } from '@/lib/public/purchaseCopy';

/**
 * What a person sees who IS signed in and is NOT on the allowlist.
 *
 * Authenticated and refused is not the same as refused. Whoever reaches this has
 * a session, a user row and a Google identity: they are not a stranger and this
 * page must not treat them as one. His ruling, 2026-09-11: refusal happens at
 * the point of use, so this screen is reachable rather than theoretical, and a
 * refused person holds a live session the whole time they are looking at it.
 *
 * NO CLIENT JAVASCRIPT, like every other surface this thread owns. Sign-out is a
 * form POST because `/auth/signout` is a POST and a `SameSite=Lax` cookie is not
 * sent on a cross-site POST, which is the whole reason that route is a POST.
 *
 * ---
 *
 * THE ARTBOARD DESIGNS THREE SCREENS AND THIS IS ONE. That is deliberate, and
 * the reason is that the gate cannot tell them apart.
 *
 * `docs/web/canvas/Admitted.dc.html` draws three conditions: waiting on a
 * decision, answered and the answer was no, and had access and does not now.
 * They are genuinely different screens because the surprise is different, and
 * the third can land at 07:30 on a morning someone planned around the desk.
 *
 * But `authenticate()` returns `refused` with no reason, and it cannot return
 * one: `isEmailInvited` folds never-invited and revoked into a single false ON
 * PURPOSE, so the store does not become an oracle for which addresses were once
 * invited. So the information the three screens are keyed on does not exist at
 * the point this renders, and inventing it would mean either a second store read
 * that reintroduces the oracle, or a guess dressed as a status.
 *
 * SO THIS SCREEN SAYS ONLY WHAT IS TRUE UNDER ALL THREE CONDITIONS. It does not
 * say a decision is pending, because for a revoked account that is false. It
 * does not say a decision was made, because for a never-invited account that is
 * false. It does not say access has ended, for the same reason. Each of those
 * sentences is in the artboard and each is wrong in two cases out of three.
 *
 * The three-way split ships when a reason does, and that is a store question
 * rather than a copy one.
 */
export function NotAdmitted({
  email,
  purchase,
}: {
  email?: string | null;
  /**
   * Set when the purchase switch is open (lib/public/purchaseOpen.ts): the screen says
   * access is by purchase instead of by invite. `canTrial` shows "Start free trial" only
   * to an account that has not had one (read 153). The payment fact stays here, on the
   * page; the gate never learns it.
   */
  purchase?: { email: string; canTrial: boolean } | null;
}) {
  return (
    <RefusalShell>
      {purchase ? <StrangerRefusal email={purchase.email} canTrial={purchase.canTrial} /> : <InviteRefusal email={email} />}
    </RefusalShell>
  );
}

/**
 * Back from Stripe, paid, and the webhook has not admitted them yet (Billing's
 * checkoutStatus 'recording'). Rendered by /welcome, which a reload re-asks.
 */
export function PaymentPending({ email, reloadHref }: { email: string; reloadHref: `/welcome?${string}` }) {
  return (
    <RefusalShell>
      <div className="flex flex-col gap-3.5">
        <h1 className="text-[28px] font-semibold leading-[1.15] tracking-tight md:text-[32px]">{REFUSAL.pending.headline}</h1>
        <p className="text-base leading-relaxed text-ink-2">{REFUSAL.pending.body(email)}</p>
      </div>
      <div className="flex flex-col gap-3">
        {/* A link to this same page, not a script: a reload is a GET of /welcome. */}
        <a
          href={reloadHref}
          className="flex min-h-12 items-center justify-center rounded bg-ink px-6 text-base font-semibold text-desk md:h-12 md:text-[15px]"
        >
          {REFUSAL.pending.reload}
        </a>
        <SignOutButton label={REFUSAL.pending.signOut} />
        <a href="mailto:desk@tmitrader.com?subject=Payment" className="text-sm text-ink-1 underline hover:text-ink">
          {REFUSAL.pending.ask}
        </a>
      </div>
    </RefusalShell>
  );
}

export type TrialRefusalReason = keyof typeof REFUSED_TRIAL.reasons;

/**
 * Back from Stripe's card check, and the trial could not start (Billing's checkoutStatus
 * 'trial_refused'). Never accuses and says nothing about the card. The bank line shows for
 * every reason but not_a_card, which never ran a card check. `deskOpen` is set for
 * already_bought when the account has current access (Billing's door 'ok' or 'trial'),
 * so its button opens the desk instead of pricing.
 */
export function RefusedTrial({ reason, deskOpen }: { reason: TrialRefusalReason; deskOpen: boolean }) {
  const primary = 'flex min-h-12 items-center justify-center rounded bg-ink px-6 text-base font-semibold text-desk md:h-12 md:text-[15px]';
  const secondary =
    'flex min-h-12 items-center justify-center rounded border border-line-2 px-6 text-base font-medium text-ink md:h-12 md:text-[15px]';
  return (
    <RefusalShell>
      <div className="flex flex-col gap-3.5">
        <h1 className="text-[28px] font-semibold leading-[1.15] tracking-tight md:text-[32px]">{REFUSED_TRIAL.headline}</h1>
        <p className="text-base leading-relaxed text-ink-2">{REFUSED_TRIAL.reasons[reason]}</p>
        <p className="text-base leading-relaxed text-ink-2">{REFUSED_TRIAL.notCharged}</p>
        {reason === 'not_a_card' ? null : <p className="text-sm leading-relaxed text-ink-3">{REFUSED_TRIAL.bankLine}</p>}
      </div>
      <div className="flex flex-col gap-3">
        {reason === 'not_a_card' ? (
          <Link href="/trial" className={primary}>
            {REFUSED_TRIAL.tryAgain}
          </Link>
        ) : null}
        {reason === 'already_bought' && deskOpen ? (
          <Link href="/desk" className={primary}>
            {REFUSED_TRIAL.openDesk}
          </Link>
        ) : (
          <Link href="/pricing" className={reason === 'not_a_card' ? secondary : primary}>
            {REFUSED_TRIAL.pricing}
          </Link>
        )}
        <SignOutButton label={REFUSED_TRIAL.signOut} />
      </div>
    </RefusalShell>
  );
}

function StrangerRefusal({ email, canTrial }: { email: string; canTrial: boolean }) {
  return (
    <>
      <div className="flex flex-col gap-3.5">
        <h1 className="text-[28px] font-semibold leading-[1.15] tracking-tight md:text-[32px]">{REFUSAL.stranger.headline}</h1>
        <p className="text-base leading-relaxed text-ink-2">{REFUSAL.stranger.body(email)}</p>
      </div>
      <div className="flex flex-col gap-3">
        {canTrial ? (
          <Link
            href="/trial"
            className="flex min-h-12 items-center justify-center rounded bg-ink px-6 text-base font-semibold text-desk md:h-12 md:text-[15px]"
          >
            {REFUSAL.stranger.trial}
          </Link>
        ) : null}
        <Link
          href="/pricing"
          className={
            canTrial
              ? 'flex min-h-12 items-center justify-center rounded border border-line-2 px-6 text-base font-medium text-ink md:h-12 md:text-[15px]'
              : 'flex min-h-12 items-center justify-center rounded bg-ink px-6 text-base font-semibold text-desk md:h-12 md:text-[15px]'
          }
        >
          {REFUSAL.stranger.pricing}
        </Link>
        <SignOutButton label={REFUSAL.stranger.signOut} />
        <a href="mailto:desk@tmitrader.com?subject=Desk%20access" className="text-sm text-ink-1 underline hover:text-ink">
          {REFUSAL.stranger.ask}
        </a>
      </div>
    </>
  );
}

/** Today's screen, unchanged: shown while the purchase switch is closed. */
function InviteRefusal({ email }: { email?: string | null }) {
  return (
    <>
      <div className="flex flex-col gap-3.5">
        <span className="font-mono text-[11px] tracking-[0.16em] text-ink-3 uppercase">
          Account status
        </span>
        <h1 className="text-[28px] font-semibold leading-[1.15] tracking-tight md:text-[32px]">
          You are signed in. This account does not open the board.
        </h1>
        <p className="text-base leading-relaxed text-ink-2">
          Access to the desk is by invite, and an invite is attached to an address rather
          than to a person.
          {email ? (
            <>
              {' '}
              You are signed in as <span className="font-mono text-ink-1">{email}</span>.
            </>
          ) : null}
        </p>
      </div>

      {/* Signing in again is the thing a person will try, and it cannot
          work: the flow succeeds and lands back here. Saying so is the
          difference between a wall and a loop. */}
      <div className="rounded border border-line-2 bg-panel px-4 py-3.5">
        <p className="text-sm leading-relaxed text-ink-1">
          Signing in again reaches the same answer, so there is nothing to retry. If you
          were invited on a different address, sign out and come back on that one.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <a
          href="mailto:desk@tmitrader.com?subject=Desk%20access"
          className="flex min-h-12 items-center justify-center rounded bg-ink px-6 text-base font-semibold text-desk md:h-12 md:text-[15px]"
        >
          Ask about access
        </a>
        <p className="text-[13px] leading-relaxed text-ink-3">
          A person answers. There is nothing further to do on this page.
        </p>
      </div>
    </>
  );
}

function SignOutButton({ label }: { label: string }) {
  return (
    <form method="post" action="/auth/signout" className="flex">
      <button
        type="submit"
        className="flex min-h-12 w-full items-center justify-center rounded border border-line-2 px-6 text-base font-medium text-ink md:h-12 md:text-[15px]"
      >
        {label}
      </button>
    </form>
  );
}

function RefusalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-desk text-ink">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 md:gap-8 md:px-24 md:py-5">
        <div className="flex items-center gap-2.5">
          <BrandMark size={22} className="text-accent" />
          <span className="font-mono text-[13px] font-medium tracking-[0.14em] md:hidden">TMI</span>
          <span className="hidden items-baseline gap-2 md:flex">
            <span className="text-[10px] font-semibold tracking-[0.34em] text-ink-3 uppercase">The</span>
            <span className="text-[15px] font-semibold tracking-[0.14em] uppercase">Momentum Intelligence</span>
            <span className="text-[15px] font-medium tracking-[0.14em] text-accent uppercase">Trading Desk</span>
          </span>
        </div>

        {/* Sign out is the one action that is always available and always
            meaningful here: it is how somebody invited on a different address
            gets to the right one. */}
        <form method="post" action="/auth/signout">
          <button
            type="submit"
            className="min-h-11 text-sm text-ink-1 hover:text-ink md:min-h-0"
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="flex flex-grow items-center justify-center px-5 py-12 md:px-8">
        <div className="flex w-full max-w-[460px] flex-col gap-8">{children}</div>
      </main>

      <footer className="border-t border-line px-5 py-6 md:px-24">
        <p className="mb-3 max-w-[90ch] text-[13px] leading-[1.7] text-ink-3">
          The Momentum Intelligence Trading Desk is an information service covering publicly
          traded US equities. It is not a broker-dealer, not an investment adviser, and nothing
          it displays is a recommendation to buy or sell any security.
        </p>
        <nav className="flex flex-col md:flex-row md:gap-10">
          <Link
            href="/privacy"
            className="flex min-h-12 items-center border-t border-line text-base text-ink-1 hover:text-ink md:min-h-0 md:border-0 md:text-sm"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="flex min-h-12 items-center border-t border-line text-base text-ink-1 hover:text-ink md:min-h-0 md:border-0 md:text-sm"
          >
            Terms
          </Link>
        </nav>
      </footer>
    </div>
  );
}
