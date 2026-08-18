import Link from 'next/link';

/**
 * What a review URL says once it stops working.
 *
 * The three cases are answered differently on purpose. Someone holding a link
 * we gave them deserves to know whether it ran out of time or was withdrawn —
 * those lead to different next steps, and "it doesn't work" leads to neither.
 * An unrecognised token gets none of that: it is told only that it is not
 * authorized, because anything more would help somebody guessing.
 */
export function ReviewRefusal({ reason }: { reason: 'INVALID' | 'EXPIRED' | 'REVOKED' }) {
  const copy =
    reason === 'EXPIRED'
      ? {
          heading: 'This review session has expired.',
          detail: 'Review links are time-limited. Ask for a new one if you still need access.',
        }
      : reason === 'REVOKED'
        ? {
            heading: 'This review session has been revoked.',
            detail: 'The link was withdrawn before it expired and no longer grants access.',
          }
        : {
            heading: 'Not authorized.',
            detail: 'This link does not grant access to the desk.',
          };

  return (
    <main className="flex h-screen items-center justify-center bg-desk px-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
          Momentum Intelligence Trading Desk
        </p>
        <h1 className="mt-3 text-[15px] text-ink">{copy.heading}</h1>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-3">{copy.detail}</p>
        <p className="mt-6 text-[11px] text-ink-3">
          The desk itself is at{' '}
          <Link href="/" className="text-accent underline-offset-2 hover:underline">
            the usual address
          </Link>
          , which needs a password.
        </p>
      </div>
    </main>
  );
}
