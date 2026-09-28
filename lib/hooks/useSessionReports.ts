'use client';

import { useEffect, useState } from 'react';

import type { SessionReportsPayload } from '@/lib/desk/reports/contract';
import { useDeskMode } from '@/lib/hooks/useDeskMode';

/**
 * Reports change a few times a session, so a minute is ample; the line's STATE
 * (due -> being checked -> missed) is re-derived every second from the clock,
 * not from this poll, so a slow poll cannot leave a state stale.
 */
export const REPORTS_POLL_INTERVAL_MS = 60_000;

/**
 * The session-reports payload, or null.
 *
 * NULL MEANS "NOT AVAILABLE", AND THE SURFACE DOES NOT MOUNT ON IT. A 404 is
 * the route not existing yet; a failure is a failure. Neither may render as a
 * MISSED report, because "the feature is not built" and "today's report did
 * not arrive" are different facts and only one of them is about today.
 */
export function useSessionReports(): SessionReportsPayload | null {
  const { apiBase } = useDeskMode();
  const [payload, setPayload] = useState<SessionReportsPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;

    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(`${apiBase}/reports`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) {
          // 404: the route does not exist, so there is nothing to show. Any
          // other refusal keeps the last good payload, like a thrown fetch.
          if (response.status === 404 && !cancelled) setPayload(null);
          return;
        }
        const next = (await response.json()) as SessionReportsPayload;
        if (!cancelled) setPayload(Array.isArray(next?.slots) ? next : null);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        // Keep the last good payload: a single failed poll is not a missing report.
      }
    };

    void load();
    const interval = setInterval(() => void load(), REPORTS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      controller?.abort();
      clearInterval(interval);
    };
  }, [apiBase]);

  return payload;
}
