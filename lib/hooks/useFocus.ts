'use client';

import { useCallback, useMemo, useState } from 'react';

import { useDeskMode } from '@/lib/hooks/useDeskMode';

/**
 * The user's Focus list — **per browser, for this session, and nothing else.**
 *
 * It used to be server-owned and persisted, and it was never only cosmetic: a
 * pin admitted a ticker to the research queue and exempted it from the rank
 * gate. He did not know that, and ruled it out — *"make it cosmetic, and remove
 * the auto research on pin… you only pin something that looks interesting and
 * it only looks interesting because it has research done already."*
 *
 * **So a pin now costs nothing and buys nothing but visibility**, and the state
 * has no reason to leave the tab.
 *
 * **IN MEMORY RATHER THAN IN THE BROWSER STORE, DELIBERATELY.** There is no
 * `localStorage` or `sessionStorage` anywhere in this app, so persisting would
 * be the first browser-held state the desk has ever had — and pins were
 * date-scoped, so a stored one would need expiry logic or a Friday pin
 * reappears on Tuesday's board. **That is stale-state-that-looks-live, which is
 * the family this desk keeps finding.**
 *
 * **No copy changed.** The strip already said *"for this session"* in three
 * places; under the old server-backed model that was arguably WRONG, because a
 * pin survived a browser close. It is now exactly true.
 */

export interface FocusState {
  tickers: string[];
  limit: number;
  /** Refusal worth showing, e.g. the limit being reached. */
  message: string | null;
  isFocused: (ticker: string) => boolean;
  toggle: (ticker: string) => void;
  dismissMessage: () => void;
}

/**
 * Inherited from `focusMaxTickers`, not invented here.
 *
 * **Its original justification is gone.** The cap existed because a pin bought a
 * tick subscription, and ticks are every trade and quote through the one SIP
 * connection that IS capture — a genuinely scarce resource. **A cosmetic pin
 * consumes nothing**, so this is now a display cap and not a budget.
 *
 * Kept at the value the server enforced rather than raised or removed, because
 * dropping it is a behaviour change nobody asked for and the strip renders
 * `n/limit`. **Revisit it if pins ever mean something again**, and note that
 * the number would then need a reason rather than an inheritance.
 */
const FOCUS_LIMIT = 6;

export function useFocus(): FocusState {
  const { readOnly } = useDeskMode();
  const [tickers, setTickers] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const toggle = useCallback(
    (ticker: string) => {
      /*
       * A review session cannot pin.
       *
       * The controls are hidden there, so this should be unreachable — but a
       * keyboard shortcut, a stale render or a future component that forgets to
       * ask could still call it. Better to do nothing than to show a star
       * filling in for a session that cannot hold one.
       */
      if (readOnly) return;

      const symbol = ticker.toUpperCase();
      setMessage(null);
      setTickers((previous) => {
        if (previous.includes(symbol)) return previous.filter((item) => item !== symbol);
        if (previous.length >= FOCUS_LIMIT) {
          /*
           * The refusal is stated rather than swallowed. The server used to say
           * this and the strip has a slot for it; a click that silently does
           * nothing is the same failure as an optimistic update that silently
           * fails.
           */
          setMessage(`Focus holds ${FOCUS_LIMIT} names. Unpin one to add another.`);
          return previous;
        }
        return [...previous, symbol];
      });
    },
    [readOnly],
  );

  const isFocused = useCallback(
    (ticker: string) => tickers.includes(ticker.toUpperCase()),
    [tickers],
  );

  return useMemo(
    () => ({
      tickers,
      limit: FOCUS_LIMIT,
      message,
      isFocused,
      toggle,
      dismissMessage: () => setMessage(null),
    }),
    [tickers, message, isFocused, toggle],
  );
}
