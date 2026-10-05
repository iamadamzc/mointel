'use client';

import { useEffect, useState } from 'react';

import { LevelLadder } from '@/components/LevelLadder';
import type { LevelMap } from '@/lib/data/priceLevels';
import type { StoredLevelsState } from '@/lib/dashboard/resistance';
import { useDeskMode } from '@/lib/hooks/useDeskMode';
import type { BlueSkyState } from '@/lib/market/blueSky';
import type { ResistanceLevels as LevelsRow } from '@/lib/market/resistance';

/**
 * The stored rows are refreshed every few minutes and the route only reads
 * them, so a minute while the drawer is open is ample.
 */
const LEVELS_POLL_INTERVAL_MS = 60_000;

/**
 * UNAVAILABLE = the route does not exist (404): no stored rows and no note,
 * because "not built" is not a fact about this name. ABSENT = the route
 * answered with no row (a JSON null): not computed for this name.
 */
type LevelsState = StoredLevelsState;

function isRow(value: unknown): value is LevelsRow {
  return Boolean(value) && Array.isArray((value as LevelsRow).levels) && typeof (value as LevelsRow).price === 'number';
}

/**
 * One name's levels, fetched while its drawer is open. Mount it with
 * `key={symbol}` so a new name starts from LOADING rather than showing the
 * last name's levels.
 */
function useResistanceLevels(symbol: string): LevelsState {
  const { apiBase } = useDeskMode();
  const [state, setState] = useState<LevelsState>({ kind: 'LOADING' });

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;

    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(`${apiBase}/levels?symbol=${encodeURIComponent(symbol)}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (cancelled) return;
        if (response.status === 404) {
          setState({ kind: 'UNAVAILABLE' });
          return;
        }
        if (!response.ok) {
          // Keep a row already shown; a failed refresh is not a missing level.
          setState((prior) => (prior.kind === 'ROW' ? prior : { kind: 'ERROR' }));
          return;
        }
        const body: unknown = await response.json();
        if (cancelled) return;
        if (body === null) setState({ kind: 'ABSENT' });
        else if (isRow(body)) setState({ kind: 'ROW', row: body });
        else setState((prior) => (prior.kind === 'ROW' ? prior : { kind: 'ERROR' }));
      } catch (error) {
        if ((error as Error).name === 'AbortError' || cancelled) return;
        setState((prior) => (prior.kind === 'ROW' ? prior : { kind: 'ERROR' }));
      }
    };

    void load();
    const interval = setInterval(() => void load(), LEVELS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      controller?.abort();
      clearInterval(interval);
    };
  }, [apiBase, symbol]);

  return state;
}

/**
 * The drawer's ONE level ladder (his ruling 2026-10-02T11:51:56Z: "incorporate
 * the two. doesn't make sense to have them in two places"): the ladder with this
 * name's stored resistance levels on its axis. Mount it with `key={symbol}` so
 * a new name starts from LOADING and opens collapsed. A 404 (the route not
 * wired) leaves the ladder as it was, with no stored rows and no note.
 */
export function StoredLevelLadder({
  symbol,
  map,
  blueSky,
  Section,
}: {
  symbol: string;
  map: LevelMap;
  blueSky: BlueSkyState;
  Section: (props: { title: string; children: React.ReactNode }) => React.ReactElement;
}) {
  const state = useResistanceLevels(symbol);
  return <LevelLadder map={map} blueSky={blueSky} stored={state} Section={Section} />;
}
