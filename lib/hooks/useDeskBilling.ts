'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useBillingTitle } from '@/components/BillingBand';
import { billingDeskView, nextMemory, notificationsDue, type BillingDeskView, type BillingMemory, type DeskBillingState } from '@/lib/dashboard/billingView';
import { useBillingClock, useBillingState } from '@/lib/hooks/useBillingState';
import { useDeskMode } from '@/lib/hooks/useDeskMode';

/** Web's pricing page and trial start page (Integration's split). Web to confirm both paths. */
export const PRICING_HREF = '/pricing';
export const TRIAL_START_HREF = '/trial';

/** The green "payment received" band collapses after a minute (Marketing section 2). */
const PAID_BAND_MS = 60_000;

/**
 * Everything the desk shell needs from billing, in one hook: the view, the update-card action, the tab title and the
 * OS notifications. Notifications are shown ONLY when the browser's permission is already "granted": the desk never
 * asks for permission because of a failure (Design's band design, section 3).
 */
export function useDeskBilling(): {
  view: BillingDeskView;
  state: DeskBillingState | null;
  refresh: () => void;
  onUpdateCard: () => void;
} {
  const { apiBase } = useDeskMode();
  const { state, refresh } = useBillingState();
  const [memory, setMemory] = useState<BillingMemory>({ justPaid: null });
  const previous = useRef<DeskBillingState | null>(null);

  useEffect(() => {
    const next = nextMemory(previous.current, state);
    previous.current = state;
    if (!next.justPaid) return;
    // A grace just ended with the charge paid: show green for a minute.
    setMemory(next);
    const clear = setTimeout(() => setMemory({ justPaid: null }), PAID_BAND_MS);
    return () => clearTimeout(clear);
  }, [state]);

  const now = useBillingClock(Boolean(state?.grace));
  const view = billingDeskView(state, now, memory);
  useBillingTitle(view.titlePrefix);

  const shown = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    for (const note of notificationsDue(state, now, shown.current)) {
      shown.current.add(note.key);
      try {
        new Notification(note.title, { body: note.body, tag: note.key });
      } catch {
        // A browser that refuses a page notification shows the band and the title regardless.
      }
    }
  }, [state, now]);

  // Update card: Stripe's portal, in a new tab so the board stays live on this one (Design's band design, section 5).
  const onUpdateCard = useCallback(() => {
    const tab = window.open('', '_blank');
    // The same protection a rel="noopener" link gets: the portal page cannot reach back into the desk.
    if (tab) tab.opener = null;
    void fetch(`${apiBase}/billing/portal`, { method: 'POST', credentials: 'same-origin' })
      .then(async (response) => {
        const body = response.ok ? ((await response.json()) as { url?: string }) : {};
        if (body.url && tab) tab.location.href = body.url;
        else tab?.close();
      })
      .catch(() => tab?.close())
      .finally(refresh);
  }, [apiBase, refresh]);

  return { view, state, refresh, onUpdateCard };
}
