'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  classifyResponse,
  classifyThrown,
  type FeedFailure,
} from '@/lib/dashboard/feedFailure';

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
  failure: FeedFailure | null;
  /** Tickers whose displayed values changed on the most recent poll. */
  changedTickers: Set<string>;
  refresh: () => void;
}

function signatureMap(tickers: MomentumTicker[]): Map<string, string> {
  return new Map(tickers.map((ticker) => [ticker.ticker, ticker.changeSignature]));
}

/**
 * @param openTickers Symbols the page has open beyond its own rows — the
 * selected ticker and anything pinned to Focus. The payload carries dossiers
 * for the rows plus these, rather than for every RESEARCH record on file.
 */
export function useDashboard(openTickers: readonly string[] = []): DashboardFeed {
  const { apiBase } = useDeskMode();
  // Stable across renders that do not change the set, so the poll's identity
  // does not churn and restart the interval on every keystroke elsewhere.
  const openKey = [...new Set(openTickers)].sort().join(',');
  const [data, setData] = useState<DashboardState | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failure, setFailure] = useState<FeedFailure | null>(null);
  const [changedTickers, setChangedTickers] = useState<Set<string>>(new Set());

  const signaturesRef = useRef<Map<string, string>>(new Map());
  const etagRef = useRef<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async (options: { force?: boolean } = {}) => {
    inflightRef.current?.abort();
    const controller = new AbortController();
    inflightRef.current = controller;

    if (options.force) setRefreshing(true);

    try {
      const query = new URLSearchParams();
      if (options.force) query.set('force', '1');
      if (openKey) query.set('tickers', openKey);
      const suffix = query.size > 0 ? `?${query}` : '';

      const response = await fetch(`${apiBase}/dashboard${suffix}`, {
        signal: controller.signal,
        cache: 'no-store',
        // The desk polls every four seconds and usually nothing has changed.
        // A 304 is the whole response in that case: no body, no re-parse.
        headers: etagRef.current ? { 'If-None-Match': etagRef.current } : undefined,
      });

      if (response.status === 304) {
        /*
         * The desk state is unchanged. Nothing is re-parsed — but the sheet was
         * re-read, so the freshness stamp still advances. It travels as headers
         * precisely because a 304 has no body to carry it, and leaving the old
         * stamp in place would show a sync age climbing past a sheet that had
         * just been confirmed current.
         */
        if (!mountedRef.current) return;
        const fetchedAt = response.headers.get('x-desk-fetched-at');
        const cacheAgeMs = Number(response.headers.get('x-desk-cache-age-ms'));
        if (fetchedAt) {
          setData((current) =>
            current
              ? {
                  ...current,
                  meta: {
                    ...current.meta,
                    fetchedAt,
                    cacheAgeMs: Number.isFinite(cacheAgeMs) ? cacheAgeMs : current.meta.cacheAgeMs,
                  },
                }
              : current,
          );
        }
        setFailure(null);
        return;
      }
      // Classified rather than thrown -- a refusal is not a dead socket.
      const refusal = classifyResponse(response.status);
      if (refusal) {
        if (mountedRef.current) setFailure(refusal);
        return;
      }

      etagRef.current = response.headers.get('etag');
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
      setFailure(null);

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
      setFailure(classifyThrown(error));
    } finally {
      if (mountedRef.current) {
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, [apiBase, openKey]);

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

  return { data, initialLoading, refreshing, failure, changedTickers, refresh };
}
