/**
 * The one indicator that this is not the real desk.
 *
 * Exactly one, at the top. The alternative — marking every panel "review" —
 * would clutter the surface the reviewer is here to judge, and the thing worth
 * preventing is not a moment of confusion about a single card. It is somebody
 * reading this screen and believing they are looking at their own desk, where
 * the stars are missing because something broke rather than because this
 * session cannot write.
 *
 * So it says what the session is, and when it stops working, and nothing else.
 */
export function ReviewBanner({ expiresAtClock }: { expiresAtClock: string }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-accent/30 bg-accent/10 px-4 py-1.5">
      <span className="text-[10px] font-semibold tracking-[0.14em] text-accent uppercase">
        Read-only review session
      </span>
      <span className="text-[11px] text-ink-3">
        Nothing here can be changed · Expires {expiresAtClock} ET
      </span>
    </div>
  );
}
