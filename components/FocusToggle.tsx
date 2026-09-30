'use client';

import { useDeskMode } from '@/lib/hooks/useDeskMode';

/**
 * The pin control.
 *
 * Small and quiet: focusing a name is a frequent, reversible act, so it should
 * cost one click and no attention. A filled star means the ticker is on the
 * Focus strip; an outline means it is not. Clicking never selects the row it
 * sits in — the two actions are unrelated and conflating them would open a
 * drawer every time somebody pinned something.
 *
 * In a read-only review session it renders nothing at all rather than a
 * disabled star. A greyed-out control still says "this is yours to change,
 * later" — which is not true for a reviewer, and the empty space says so
 * without needing a tooltip to explain itself.
 */
export function FocusToggle({
  ticker,
  focused,
  onToggle,
  className = '',
}: {
  ticker: string;
  focused: boolean;
  onToggle: (ticker: string) => void;
  className?: string;
}) {
  const { readOnly } = useDeskMode();
  if (readOnly) return null;

  return (
    <button
      type="button"
      aria-pressed={focused}
      aria-label={focused ? `Remove ${ticker} from Focus` : `Add ${ticker} to Focus`}
      title={
        focused
          ? `${ticker} is in Focus. Removing it changes nothing else: it stays in Discovery, stays tracked, and keeps its research.`
          : `Keep ${ticker} in Focus for this session`
      }
      onClick={(event) => {
        event.stopPropagation();
        onToggle(ticker);
      }}
      className={`shrink-0 rounded-sm px-0.5 text-[12px] leading-none transition-colors ${
        focused ? 'text-accent hover:text-accent/70' : 'text-ink-3 hover:text-accent'
      } ${className}`}
    >
      {focused ? '★' : '☆'}
    </button>
  );
}
