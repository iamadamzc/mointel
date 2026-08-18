'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useDeskMode } from '@/lib/hooks/useDeskMode';

/**
 * The user's Focus list.
 *
 * Server-owned, because it is persisted in the shared state store and has to
 * survive a refresh and agree across tabs. Pin and unpin update optimistically
 * so the strip reacts on the click, then reconcile with whatever the server
 * actually stored — including a refusal at the limit, which must not silently
 * appear to have worked.
 */

export interface FocusState {
  tickers: string[];
  tradingDate: string;
  limit: number;
  loading: boolean;
  /** Refusal or transport message worth showing, e.g. the focus limit. */
  message: string | null;
  isFocused: (ticker: string) => boolean;
  toggle: (ticker: string) => void;
  dismissMessage: () => void;
}

interface FocusPayload {
  tradingDate: string;
  tickers: string[];
  limit: number;
  message?: string | null;
  error?: string | null;
}

/** Focus changes on user action, so it polls slowly — just enough to follow other tabs. */
const FOCUS_POLL_MS = 15_000;

export function useFocus(): FocusState {
  const { apiBase, readOnly } = useDeskMode();
  const [tickers, setTickers] = useState<string[]>([]);
  const [tradingDate, setTradingDate] = useState('');
  const [limit, setLimit] = useState(6);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const mountedRef = useRef(true);
  // Suppresses a poll landing on top of an in-flight optimistic change.
  const pendingRef = useRef(0);

  const apply = useCallback((payload: FocusPayload) => {
    setTickers(payload.tickers ?? []);
    setTradingDate(payload.tradingDate ?? '');
    if (typeof payload.limit === 'number') setLimit(payload.limit);
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/focus`, { cache: 'no-store' });
      if (!response.ok) return;
      const payload = (await response.json()) as FocusPayload;
      if (!mountedRef.current || pendingRef.current > 0) return;
      apply(payload);
    } catch {
      // A failed poll leaves the last known list in place.
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [apiBase, apply]);

  useEffect(() => {
    mountedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void load();
    }, FOCUS_POLL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [load]);

  const toggle = useCallback(
    (ticker: string) => {
      /*
       * A review session cannot pin.
       *
       * The controls are hidden there, so this should be unreachable — but a
       * keyboard shortcut, a stale render or a future component that forgets to
       * ask could still call it, and the optimistic update below would show the
       * star filling in before the server refused. Better to do nothing than to
       * lie for one render.
       */
      if (readOnly) return;

      const symbol = ticker.toUpperCase();
      const focused = tickers.includes(symbol);
      const action = focused ? 'unpin' : 'pin';

      // Optimistic: the strip should respond to the click, not to the network.
      const previous = tickers;
      setTickers(focused ? previous.filter((item) => item !== symbol) : [...previous, symbol]);
      setMessage(null);
      pendingRef.current += 1;

      void (async () => {
        try {
          const response = await fetch(`${apiBase}/focus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ticker: symbol }),
          });
          const payload = (await response.json()) as FocusPayload;
          if (!mountedRef.current) return;

          if (!response.ok) {
            // Server refused — restore the truth rather than leaving the
            // optimistic state looking like a success.
            setTickers(payload.tickers ?? previous);
            setMessage(payload.message ?? payload.error ?? 'Focus could not be updated.');
            return;
          }
          apply(payload);
        } catch (error) {
          if (!mountedRef.current) return;
          setTickers(previous);
          setMessage((error as Error).message);
        } finally {
          pendingRef.current = Math.max(0, pendingRef.current - 1);
        }
      })();
    },
    [apiBase, apply, readOnly, tickers],
  );

  const isFocused = useCallback((ticker: string) => tickers.includes(ticker.toUpperCase()), [tickers]);

  return {
    tickers,
    tradingDate,
    limit,
    loading,
    message,
    isFocused,
    toggle,
    dismissMessage: useCallback(() => setMessage(null), []),
  };
}
