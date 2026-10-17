'use client';

import { useEffect, useRef, useState } from 'react';

import type { BandView } from '@/lib/dashboard/billingView';

/*
 * THE FAILED-CHARGE BAND (Design's band design, docs/commercial/daily-billing-design/design-seat.md; words Marketing
 * b227a882 section 2). One row directly under the header: it pushes the board down and covers none of it. It cannot be
 * dismissed; it goes when the payment succeeds or the session ends. One action. No sound.
 */
const TONE: Record<BandView['tone'], string> = {
  warn: 'border-warn/40 bg-warn/15 text-warn',
  neg: 'border-neg/45 bg-neg/15 text-neg',
  pos: 'border-pos/40 bg-pos/12 text-pos',
};

export function BillingBand({ band, onUpdateCard }: { band: BandView | null; onUpdateCard: () => void }) {
  // Screen readers hear the band once per phase (appearing, turning red, paid), never the countdown every second:
  // the live region holds the words as they were when the phase began.
  const phase = band?.phase ?? null;
  const [spoken, setSpoken] = useState<{ phase: string; text: string } | null>(null);
  useEffect(() => {
    // The announcement follows the phase only; a countdown tick inside a phase changes nothing here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpoken(phase && band ? { phase, text: band.text } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  if (!band) return null;

  return (
    <div
      data-billing-band={band.phase}
      className={`flex shrink-0 items-center justify-between gap-4 border-b px-4 py-1.5 text-[12px] font-semibold ${TONE[band.tone]}`}
    >
      <span className="num" aria-hidden="true">{band.text}</span>
      <span className="sr-only" role="status" aria-live={band.phase === 'red' ? 'assertive' : 'polite'}>
        {spoken?.phase === band.phase ? spoken.text : ''}
      </span>
      {band.button ? (
        <button
          type="button"
          onClick={onUpdateCard}
          className="min-h-[24px] shrink-0 rounded-sm border border-current px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase hover:bg-panel-2"
        >
          {band.button}
        </button>
      ) : null}
    </div>
  );
}

/**
 * The tab title carries the deadline to a trader who is not looking at the desk: "⚠ 52m · payment · <title>".
 * Restored exactly when the band goes.
 */
export function useBillingTitle(prefix: string | null) {
  const base = useRef<string | null>(null);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (base.current === null) base.current = document.title;
    document.title = prefix ? `${prefix} ${String.fromCharCode(0x00b7)} ${base.current}` : base.current;
  }, [prefix]);
  useEffect(
    () => () => {
      if (base.current !== null) document.title = base.current;
    },
    [],
  );
}
