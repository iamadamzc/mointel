'use client';

/**
 * The pin control.
 *
 * Small and quiet: focusing a name is a frequent, reversible act, so it should
 * cost one click and no attention. A filled star means the ticker is on the
 * Focus strip; an outline means it is not. Clicking never selects the row it
 * sits in — the two actions are unrelated and conflating them would open a
 * drawer every time somebody pinned something.
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
  return (
    <button
      type="button"
      aria-pressed={focused}
      aria-label={focused ? `Remove ${ticker} from Focus` : `Add ${ticker} to Focus`}
      title={
        focused
          ? `${ticker} is in Focus. Removing it changes nothing else — it stays in Discovery, stays tracked, and keeps its research.`
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
