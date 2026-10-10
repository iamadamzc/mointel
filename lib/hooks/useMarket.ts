'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  classifyResponse,
  classifyThrown,
  type FeedFailure,
} from '@/lib/dashboard/feedFailure';

import { rangeQuery, type PriceRange } from '@/lib/dashboard/boardRange';
import { acceptPayload, isRangePending } from '@/lib/dashboard/rangePending';
import { pollDecision } from '@/lib/dashboard/pollGate';
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
  /** The server could not serve the viewer's range yet (rank once); the control shows its loading mark. */
  rangePending: boolean;
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
  const [rangePending, setRangePending] = useState(false);
  // Pending payloads held back in a row (rangePending.ts): bounded, so a cold list cannot freeze the board.
  const heldRef = useRef(0);

  const symbolsKey = extraSymbols.join(',');
  const rangeKey = rangeQuery(range);

  const mountedRef = useRef(true);
  const inflightRef = useRef<{ controller: AbortController; startedAt: number } | null>(null);

  /*
   * A TICK NEVER CANCELS A REQUEST INSIDE ITS BUDGET (`pollGate.ts`). This used
   * to abort the in-flight request on every tick, so a response slower than the
   * interval never landed (under concurrent load, almost none did) and the
   * board kept its last payload while its header still said LIVE. `force` is a
   * change of query: the symbols or the viewer's range.
   */
  const load = useCallback(async (symbols: string, rangeParams: string, force: boolean) => {
    const current = inflightRef.current;
    const decision = pollDecision(current?.startedAt ?? null, Date.now(), force);
    if (decision === 'SKIP') return;
    if (decision === 'REPLACE') current?.controller.abort();
    const controller = new AbortController();
    const flight = { controller, startedAt: Date.now() };
    inflightRef.current = flight;

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

      setRangePending(isRangePending(payload));
      setFailure(null);
      // A pending range is not shown as the viewer's: keep the previous table, or the loading state.
      const decision = acceptPayload(payload, heldRef.current);
      heldRef.current = decision.heldInARow;
      if (!decision.accept) return;
      setSnapshot(payload);
      setLoading(false);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      if (!mountedRef.current) return;
      setFailure(classifyThrown(error));
    } finally {
      // Free the slot only if it is still ours; a replaced request must not
      // clear its replacement.
      if (inflightRef.current === flight) inflightRef.current = null;
      // A held-back pending payload leaves the loading state as it was; everything else ends it.
      if (mountedRef.current && heldRef.current === 0) setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    mountedRef.current = true;
    // load() is async: every setState it performs happens after the fetch
    // settles, never synchronously during this effect.
    // The effect re-runs on a new symbol set or range, so its first load is a change of query.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(symbolsKey, rangeKey, true);

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void load(symbolsKey, rangeKey, false);
    }, MARKET_POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void load(symbolsKey, rangeKey, false);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      inflightRef.current?.controller.abort();
      inflightRef.current = null;
    };
  }, [load, symbolsKey, rangeKey]);

  return { snapshot, failure, loading, rangePending };
}
