'use client';

import { useEffect, useState } from 'react';

import { computedText, horizonText, levelLines, levelsNote, shownLevels } from '@/lib/dashboard/resistance';
import { useDeskMode } from '@/lib/hooks/useDeskMode';
import type { ResistanceLevels as LevelsRow } from '@/lib/market/resistance';

/**
 * The levels recompute at each 5-minute close and the route memoizes per close,
 * so a minute while the drawer is open is ample.
 */
const LEVELS_POLL_INTERVAL_MS = 60_000;

/**
 * UNAVAILABLE = the route does not exist (404): the section does not mount,
 * because "not built" is not a fact about this name. ABSENT = the route
 * answered with no row (a JSON null): not computed yet.
 */
type LevelsState =
  | { kind: 'LOADING' }
  | { kind: 'UNAVAILABLE' }
  | { kind: 'ERROR' }
  | { kind: 'ABSENT' }
  | { kind: 'ROW'; row: LevelsRow };

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
 * "Resistance levels": every level above the price, nearest first, each with
 * its timeframe. His label and his "show all"; no strength, no highlight.
 */
export function ResistanceLevels({
  symbol,
  Section,
}: {
  symbol: string;
  Section: React.ComponentType<{ title: string; children: React.ReactNode }>;
}) {
  const state = useResistanceLevels(symbol);
  if (state.kind === 'UNAVAILABLE') return null;

  return (
    <Section title="Resistance levels">
      {state.kind === 'LOADING' ? <p className="text-[12px] text-ink-3">Loading levels…</p> : null}
      {state.kind === 'ERROR' ? <p className="text-[12px] text-ink-3">Levels could not be loaded.</p> : null}
      {state.kind === 'ABSENT' ? (
        <p className="text-[12px] text-ink-3">Levels are not computed for this name yet.</p>
      ) : null}
      {state.kind === 'ROW' ? <LevelsBody row={state.row} /> : null}
    </Section>
  );
}

function LevelsBody({ row }: { row: LevelsRow }) {
  // Nearest 10 by default, the rest behind a link (his "2 b"). The drawer
  // remounts this per name, so every name opens collapsed.
  const [showAll, setShowAll] = useState(false);
  const { shown, toggle } = shownLevels(levelLines(row), showAll);
  const note = levelsNote(row);
  const computed = computedText(row);
  const horizon = horizonText(row);

  return (
    <div className="space-y-2">
      {shown.length > 0 ? (
        <ol className="space-y-0.5">
          {shown.map((line, index) => (
            <li
              key={`${line.price}:${index}`}
              title={line.title}
              className="flex items-baseline gap-3 font-mono text-[12px] tabular-nums"
            >
              <span className="w-20 shrink-0 font-semibold text-ink">{line.price}</span>
              <span className="w-14 shrink-0 text-ink-2">{line.distance}</span>
              <span className="min-w-0 flex-1 text-ink-2">
                {line.tags}
                {line.farBack ? <span className="text-ink-3"> · over 12 months back</span> : null}
              </span>
              {line.span ? <span className="shrink-0 text-[11px] text-ink-3">{line.span}</span> : null}
            </li>
          ))}
        </ol>
      ) : null}
      {toggle ? (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          aria-expanded={showAll}
          className="min-h-6 text-[11px] font-semibold text-accent hover:underline"
        >
          {toggle}
        </button>
      ) : null}
      {note ? <p className="text-[12px] text-ink-2">{note}</p> : null}
      {computed || horizon ? (
        <p className="text-[11px] text-ink-3">{[computed, horizon].filter(Boolean).join(' ')}</p>
      ) : null}
    </div>
  );
}
