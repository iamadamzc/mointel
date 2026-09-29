'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  classifyResponse,
  classifyThrown,
  type FeedFailure,
} from '@/lib/dashboard/feedFailure';

import { rangeQuery, type PriceRange } from '@/lib/dashboard/boardRange';
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
  failure: FeedFailure | null;
  loading: boolean;
}

export function useMarket(
  extraSymbols: string[],
  /** The viewer's board range. Null asks for the server's default. */
  range: PriceRange | null = null,
): MarketFeedState {
  const { apiBase } = useDeskMode();
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [failure, setFailure] = useState<FeedFailure | null>(null);
  const [loading, setLoading] = useState(true);

  const symbolsKey = extraSymbols.join(',');
  const rangeKey = rangeQuery(range);

  const mountedRef = useRef(true);
  const inflightRef = useRef<AbortController | null>(null);

  const load = useCallback(async (symbols: string, rangeParams: string) => {
    inflightRef.current?.abort();
    const controller = new AbortController();
    inflightRef.current = controller;

    try {
      const parts = [symbols ? `symbols=${encodeURIComponent(symbols)}` : '', rangeParams].filter(Boolean);
      const query = parts.length > 0 ? `?${parts.join('&')}` : '';
      const response = await fetch(`${apiBase}/market${query}`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      /*
       * CLASSIFIED, NOT THROWN. Throwing folded a refusal into the catch beside
       * a dead socket, and the header then told him the feed was unreachable
       * when the truth was that he was signed out.
       */
      const refusal = classifyResponse(response.status);
      if (refusal) {
        if (mountedRef.current) setFailure(refusal);
        return;
      }

      const payload = (await response.json()) as MarketSnapshot;
      if (!mountedRef.current) return;

      setSnapshot(payload);
      setFailure(null);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      if (!mountedRef.current) return;
      setFailure(classifyThrown(error));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    mountedRef.current = true;
    // load() is async: every setState it performs happens after the fetch
    // settles, never synchronously during this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(symbolsKey, rangeKey);

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void load(symbolsKey, rangeKey);
    }, MARKET_POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void load(symbolsKey, rangeKey);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      inflightRef.current?.abort();
    };
  }, [load, symbolsKey, rangeKey]);

  return { snapshot, failure, loading };
}
