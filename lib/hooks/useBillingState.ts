'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { DeskBillingState } from '@/lib/dashboard/billingView';
import { useDeskMode } from '@/lib/hooks/useDeskMode';

/** A minute between reads (Integration 42nd: "a minute-level refresh plus a refresh on focus", never a tight loop). */
export const BILLING_POLL_MS = 60_000;

/**
 * The desk's billing state, from `${apiBase}/billing/state` (session-gated, read-only). A review session has no
 * billing, so it never asks. A missing route (404, before the billing cut) reads as null. Any other failure KEEPS
 * the last state: a read that fails must neither take the board away nor erase a running deadline, and the band's
 * countdown runs from the server's own endsAt.
 *
 * Unlike the market poll, this one keeps reading while the tab is hidden: a decline's hour runs whether or not the
 * desk is in front, and the tab title is how it reaches a trader who is looking elsewhere.
 */
export function useBillingState(): { state: DeskBillingState | null; refresh: () => void } {
  const { apiBase, readOnly } = useDeskMode();
  const [state, setState] = useState<DeskBillingState | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (readOnly) return;
    try {
      const response = await fetch(`${apiBase}/billing/state`, { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) {
        if (response.status === 404 && mounted.current) setState(null);
        return;
      }
      const next = (await response.json()) as DeskBillingState;
      if (mounted.current) setState(next && typeof next === 'object' && 'door' in next ? next : null);
    } catch {
      // Keep the last state (see above).
    }
  }, [apiBase, readOnly]);

  useEffect(() => {
    mounted.current = true;
    // load() sets state only after the fetch settles, never synchronously in this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const interval = setInterval(() => void load(), BILLING_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      mounted.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [load]);

  return { state, refresh: () => void load() };
}

/** A clock for the band's countdown: one tick a second while a decline's hour runs; off otherwise. */
export function useBillingClock(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [active]);
  return now;
}
