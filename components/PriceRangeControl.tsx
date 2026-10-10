'use client';

import { useState } from 'react';

import {
  parseRangeInput,
  rangeLabel,
  sameRange,
  type PriceRange,
} from '@/lib/dashboard/boardRange';

/**
 * The board's price range: what it is, how to change it, how to go back.
 *
 * The label is the SERVED range, from the payload. It is in accent when it
 * isn't the default, because the viewer owns it (audit §8: accent means
 * user-owned). No banner: the caption beside it already says what the rows
 * are drawn from.
 */
export function PriceRangeControl({
  served,
  bounds,
  defaultRange,
  onChange,
  pending = null,
}: {
  served: PriceRange;
  /**
   * The viewer's chosen range while the server could not serve it yet (rank once, `rangePending`): shown on
   * the control with a loading mark, never presented as served by the rows (rangePending.ts). Null otherwise.
   */
  pending?: PriceRange | null;
  bounds: PriceRange;
  defaultRange: PriceRange;
  /** Null returns to the default. */
  onChange: (range: PriceRange | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [minText, setMinText] = useState('');
  const [maxText, setMaxText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const shown = pending ?? served;
  const isDefault = sameRange(shown, defaultRange);

  const open = () => {
    setMinText(String(shown.min));
    setMaxText(String(shown.max));
    setError(null);
    setEditing(true);
  };

  const apply = () => {
    const parsed = parseRangeInput(minText, maxText, bounds);
    if (!parsed.ok) {
      setError(parsed.reason);
      return;
    }
    setEditing(false);
    onChange(sameRange(parsed.range, defaultRange) ? null : parsed.range);
  };

  if (!editing) {
    return (
      <span className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={open}
          aria-busy={pending ? true : undefined}
          title={`Choose the price range this board ranks in, within ${rangeLabel(bounds)}.`}
          className={`num min-h-6 rounded-sm border px-1.5 text-[11px] font-semibold ${
            isDefault
              ? 'border-line-2 bg-panel-2 text-ink-2 hover:text-ink'
              : 'border-accent/50 bg-accent/15 text-accent'
          }`}
        >
          {rangeLabel(shown)}
          {/* The loading mark: no words, a pulsing dot while the chosen range is on its way. */}
          {pending ? <span aria-hidden="true" className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent align-middle" /> : null}
        </button>
        {isDefault ? null : (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="min-h-6 px-1 text-[11px] text-ink-3 hover:text-ink"
          >
            reset to {rangeLabel(defaultRange)}
          </button>
        )}
      </span>
    );
  }

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setEditing(false);
      }}
    >
      <label className="sr-only" htmlFor="board-range-min">Lowest price</label>
      <input
        id="board-range-min"
        autoFocus
        inputMode="decimal"
        value={minText}
        onChange={(event) => setMinText(event.target.value)}
        className="num h-6 w-16 rounded-sm border border-line-2 bg-panel-2 px-1.5 text-[11px] text-ink"
      />
      <span className="text-ink-3">–</span>
      <label className="sr-only" htmlFor="board-range-max">Highest price</label>
      <input
        id="board-range-max"
        inputMode="decimal"
        value={maxText}
        onChange={(event) => setMaxText(event.target.value)}
        className="num h-6 w-16 rounded-sm border border-line-2 bg-panel-2 px-1.5 text-[11px] text-ink"
      />
      <button
        type="submit"
        className="min-h-6 rounded-sm border border-accent/40 bg-accent/10 px-2 text-[11px] font-semibold text-accent"
      >
        Apply
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="min-h-6 px-1 text-[11px] text-ink-3 hover:text-ink"
      >
        Cancel
      </button>
      {error ? (
        <span role="alert" className="text-[11px] text-warn">
          {error}
        </span>
      ) : (
        <span className="text-[11px] text-ink-3">{rangeLabel(bounds)} allowed</span>
      )}
    </form>
  );
}
