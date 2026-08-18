'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useDeskMode } from '@/lib/hooks/useDeskMode';
import type { DashboardState, MomentumTicker } from '@/lib/data/types';

/** Browser poll interval. The server cache (10s) absorbs these into far fewer Sheets reads. */
export const POLL_INTERVAL_MS = 4000;

/** How long a changed row stays highlighted. */
const CHANGE_HIGHLIGHT_MS = 2500;

export interface DashboardFeed {
  data: DashboardState | null;
  /** True only until the first payload arrives. */
  initialLoading: boolean;
  /** True while a manual refresh is in flight. */
  refreshing: boolean;
  /** Transport-level error (the API itself unreachable), separate from meta.error. */
  transportError: string | null;
  /** Tickers whose displayed values changed on the most recent poll. */
  changedTickers: Set<string>;
  refresh: () => void;
}

function signatureMap(tickers: MomentumTicker[]): Map<string, string> {
  return new Map(tickers.map((ticker) => [ticker.ticker, ticker.changeSignature]));
}

export function useDashboard(): DashboardFeed {
  const { apiBase } = useDeskMode();
  const [data, setData] = useState<DashboardState | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transportError, setTransportError] = useState<string | null>(null);
  const [changedTickers, setChangedTickers] = useState<Set<string>>(new Set());

  const signaturesRef = useRef<Map<string, string>>(new Map());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async (options: { force?: boolean } = {}) => {
    inflightRef.current?.abort();
    const controller = new AbortController();
    inflightRef.current = controller;

    if (options.force) setRefreshing(true);

    try {
      const response = await fetch(`${apiBase}/dashboard${options.force ? '?force=1' : ''}`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`API responded ${response.status}`);

      const payload = (await response.json()) as DashboardState;
      if (!mountedRef.current) return;

      const previous = signaturesRef.current;
      const next = signatureMap(payload.tickers);
      const changed = new Set<string>();
      if (previous.size > 0) {
        next.forEach((signature, ticker) => {
          const before = previous.get(ticker);
          if (before !== undefined && before !== signature) changed.add(ticker);
        });
      }
      signaturesRef.current = next;

      setData(payload);
      setTransportError(null);

      if (changed.size > 0) {
        setChangedTickers(changed);
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setChangedTickers(new Set());
        }, CHANGE_HIGHLIGHT_MS);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      if (!mountedRef.current) return;
      setTransportError((error as Error).message);
    } finally {
      if (mountedRef.current) {
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, [apiBase]);

  useEffect(() => {
    mountedRef.current = true;
    // load() is async: every setState it performs happens after the fetch
    // settles, never synchronously during this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();

    const interval = setInterval(() => {
      // Background tabs do not need to poll; a hidden desk is not being read.
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void load();
    }, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      inflightRef.current?.abort();
    };
  }, [load]);

  const refresh = useCallback(() => {
    void load({ force: true });
  }, [load]);

  return { data, initialLoading, refreshing, transportError, changedTickers, refresh };
}
