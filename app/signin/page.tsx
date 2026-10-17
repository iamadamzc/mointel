import { BrandMark } from '@/components/BrandMark';
import type { Metadata } from 'next';
import Link from 'next/link';

import { SIGNIN_EMAIL } from '@/lib/public/purchaseCopy';
import { purchaseOpen } from '@/lib/public/purchaseOpen';

/**
 * The sign-in screen, from the `SignIn` artboard in docs/web/canvas — Web's
 * words, translated into the app's tokens and self-hosted fonts (never the
 * artboard's Google-font link, per docs/web/README.md §5).
 *
 * A LIST OF ONE (Design's formulation): the group, its label and the stack
 * survive a second provider arriving; the second row is not drawn. The Google
 * button is Google's own spec — white surface, #1f1f1f label, the four-colour
 * mark, a 4px radius — and is deliberately not restyled: a restyled provider
 * button is both a verification risk and the thing a phishing page does.
 *
 * NO CLIENT JAVASCRIPT. The button is a plain link to `/auth/start/google` (the
 * route this app actually serves — the artboard's `/auth/google` was stale), so
 * sign-in begins with a normal navigation and nothing here calls out to anyone
 * before the person clicks.
 *
 * Not indexed: a functional screen, not a page a stranger should reach from
 * search — the landing page is the front door.
 */

/*
 * THE EMAIL OPTION (2026-10-17) ships with the purchase launch (his ruling, Integration
 * chat uuid f9e7ab7b), so it is behind the same switch as the purchase pages
 * (lib/public/purchaseOpen.ts): closed, this page is exactly what it was. The form posts
 * to Ops's POST /auth/start/email, whose pages and email carry the rest of the approved
 * words (lib/auth/emailLinkWords.ts). Read per request, so the metadata is generated.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Sign in | The Momentum Intelligence Trading Desk',
    description: purchaseOpen()
      ? SIGNIN_EMAIL.description
      : 'Sign in to the desk with Google. One identity provider, no password to set and none for us to store.',
    robots: { index: false, follow: false },
  };
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden focusable="false" className="shrink-0">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

const GRANTED = [
  'Your name',
  'Your email address',
  'Your profile picture',
  'The account identifier Google gives us for you',
];

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string | string[] }>;
}) {
  const { e } = await searchParams;
  const cancelled = e === 'cancelled';
  const emailOption = purchaseOpen();

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
        <Link href="/" className="text-sm text-ink-1 hover:text-ink">
          &larr; What this is
        </Link>
      </header>

      <main className="flex flex-grow items-center justify-center px-5 py-12 md:px-8">
        <div className="flex w-full max-w-[440px] flex-col gap-10">
          <div className="flex flex-col gap-3.5">
            <h1 className="text-[28px] font-semibold leading-[1.15] tracking-tight md:text-[32px]">
              Sign in to the desk
            </h1>
            <p className="text-base leading-relaxed text-ink-2">
              {emailOption
                ? SIGNIN_EMAIL.lead
                : 'One account, one identity provider. There is no password to set, and none for us to store.'}
            </p>
          </div>

          {/* Cancelled at Google is benign, not a wall: nothing was shared, and the
              action that changes the outcome is the button right below. */}
          {cancelled && (
            <div
              role="status"
              className="rounded border border-line-2 bg-panel px-4 py-3.5 text-sm leading-relaxed text-ink-1"
            >
              You didn&rsquo;t finish signing in. Nothing was shared with the desk. Sign in below
              when you&rsquo;re ready.
            </div>
          )}

          {/* A LIST OF ONE — grows a second provider without a rewrite. */}
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] tracking-[0.16em] text-ink-3">CONTINUE WITH</span>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              <li>
                <a
                  href="/auth/start/google"
                  className="flex h-12 items-center justify-center gap-3 rounded bg-white text-[16px] font-medium text-[#1f1f1f] hover:bg-[#f5f5f5]"
                >
                  <GoogleMark />
                  <span>Sign in with Google</span>
                </a>
              </li>
            </ul>
          </div>

          {/* What Google hands the desk, and what it does not. */}
          <div className="flex flex-col border-t border-line">
            <p className="py-4 text-sm leading-relaxed text-ink-2">
              Google shows you this before anything is shared. What it hands the desk:
            </p>
            {GRANTED.map((item) => (
              <div key={item} className="flex items-center gap-3.5 border-t border-line py-3">
                <span aria-hidden className="w-4 text-center font-mono text-[15px] text-pos">
                  +
                </span>
                <span className="text-[15px] text-ink-1">{item}</span>
              </div>
            ))}
            <div className="flex items-center gap-3.5 border-y border-line py-3">
              <span aria-hidden className="w-4 text-center font-mono text-[15px] text-ink-3">
                &minus;
              </span>
              <span className="text-[15px] text-ink-3">Nothing else: no mail, no files, no brokerage</span>
            </div>
          </div>

          {/* The second option, under the Google group and its "what Google hands the
              desk" block, which is true of Google only and must not read as covering
              this form. A plain form POST: no script. */}
          {emailOption && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4" aria-hidden>
                <span className="h-px flex-grow bg-line" />
                <span className="text-sm text-ink-3">{SIGNIN_EMAIL.separator}</span>
                <span className="h-px flex-grow bg-line" />
              </div>
              <form method="post" action="/auth/start/email" className="flex flex-col gap-3">
                <label htmlFor="signin-email" className="text-sm text-ink-1">
                  {SIGNIN_EMAIL.label}
                </label>
                <input
                  id="signin-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  className="h-12 rounded border border-line-2 bg-panel px-4 text-base text-ink"
                />
                <button
                  type="submit"
                  className="flex h-12 items-center justify-center rounded border border-line-2 text-[16px] font-medium text-ink"
                >
                  {SIGNIN_EMAIL.button}
                </button>
                <p className="text-sm leading-relaxed text-ink-2">{SIGNIN_EMAIL.under}</p>
                <p className="text-sm leading-relaxed text-ink-2">{SIGNIN_EMAIL.address}</p>
              </form>
            </div>
          )}

          <p className="text-[13px] leading-relaxed text-ink-3">
            By signing in you agree to the{' '}
            <Link href="/terms" className="text-accent hover:underline">
              terms
            </Link>{' '}
            and the{' '}
            <Link href="/privacy" className="text-accent hover:underline">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </main>

      <footer className="flex flex-col gap-4 border-t border-line px-5 py-5 md:flex-row md:items-center md:justify-between md:px-24">
        <p className="text-[13px] text-ink-3">
          An information service. Not a broker-dealer, not an investment adviser.
        </p>
        <nav className="flex gap-7">
          <Link href="/privacy" className="text-[13px] text-ink-3 hover:text-ink-1">
            Privacy
          </Link>
          <Link href="/terms" className="text-[13px] text-ink-3 hover:text-ink-1">
            Terms
          </Link>
          <a href="mailto:desk@tmitrader.com" className="text-[13px] text-ink-3 hover:text-ink-1">
            Contact
          </a>
        </nav>
      </footer>
    </div>
  );
}
