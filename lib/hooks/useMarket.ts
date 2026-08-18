'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useDeskMode } from '@/lib/hooks/useDeskMode';
import type { MarketSnapshot } from '@/lib/market/types';

/**
 * Market state polls faster than research: it is a live feed, and the worker
 * publishes normalized state roughly once per second. The browser never opens a
 * market WebSocket of its own — it reads the local state store through the API.
 */
export const MARKET_POLL_INTERVAL_MS = 1000;

export interface MarketFeedState {
  snapshot: MarketSnapshot | null;
  transportError: string | null;
  loading: boolean;
}

export function useMarket(extraSymbols: string[]): MarketFeedState {
  const { apiBase } = useDeskMode();
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [transportError, setTransportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const symbolsKey = extraSymbols.join(',');

  const mountedRef = useRef(true);
  const inflightRef = useRef<AbortController | null>(null);

  const load = useCallback(async (symbols: string) => {
    inflightRef.current?.abort();
    const controller = new AbortController();
    inflightRef.current = controller;

    try {
      const query = symbols ? `?symbols=${encodeURIComponent(symbols)}` : '';
      const response = await fetch(`${apiBase}/market${query}`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`API responded ${response.status}`);

      const payload = (await response.json()) as MarketSnapshot;
      if (!mountedRef.current) return;

      setSnapshot(payload);
      setTransportError(null);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      if (!mountedRef.current) return;
      setTransportError((error as Error).message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    mountedRef.current = true;
    // load() is async: every setState it performs happens after the fetch
    // settles, never synchronously during this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(symbolsKey);

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void load(symbolsKey);
    }, MARKET_POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void load(symbolsKey);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      inflightRef.current?.abort();
    };
  }, [load, symbolsKey]);

  return { snapshot, transportError, loading };
}
