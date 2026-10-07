'use client';

import { Popover } from '@/components/Popover';
import {
  FLOAT_DETAILS_WORDS,
  FLOAT_PAGE_HREF,
  FLOAT_PAGE_LINK_LABEL,
  FLOAT_PAGE_LINK_LEAD,
  floatCellView,
  type FloatBound,
} from '@/lib/dashboard/floatBound';
import { useDeskMode } from '@/lib/hooks/useDeskMode';

/**
 * The Float cell: the SEC upper bound, or one of three one-line words, with the
 * filed count's date beside the number and everything else in a popover.
 *
 * ONE LINE, always. The column is 102 px (86 px of content); the widest face
 * ("<= 12.4M" plus the m/d date) measures 79.8 px, and the words "Cannot verify"
 * and "Not computed" are 83.7 and 77.3 px. A second line would raise every row
 * that carries a float, so nothing here wraps.
 *
 * All the words come from `floatCellView` (Marketing v15, Commercial-passed).
 * The popover ends with the link to the public page that explains how the
 * number is made; it opens in a new tab and the page ships in the same release.
 */
export function FloatCell({
  bound,
  dateShown,
}: {
  bound: FloatBound | null | undefined;
  /** The board's own date, YYYY-MM-DD: what the 90-day rule is measured from, printed in the popover. */
  dateShown?: string | null;
}) {
  // Owner names print on the signed-in board only, never on a read-only review view (Commercial 23b).
  const { readOnly } = useDeskMode();
  const view = floatCellView(bound, { dateShown, namesAllowed: !readOnly });
  const tone =
    view.kind === 'bound'
      ? 'text-ink'
      : view.kind === 'cannotVerify'
        ? 'text-warn'
        : 'text-ink-3';

  return (
    <Popover
      label={view.ariaLabel}
      triggerClassName="inline-flex max-w-full items-baseline gap-1 rounded-sm text-[11px] whitespace-nowrap"
      width={300}
      trigger={
        <>
          {/* The marker: a dotted underline, no width (the widest face uses 79.8 of 86 px). */}
          <span className={`${tone} underline decoration-dotted decoration-ink-3 underline-offset-2`}>{view.face}</span>
          {view.date ? <span className="text-[10px] text-ink-3">{view.date}</span> : null}
        </>
      }
    >
      {view.details.rows.map((row) =>
        row.label ? (
          <div key={row.label} className="mb-2">
            <div className="text-[10px] font-medium tracking-[0.08em] text-ink-3 uppercase">{row.label}</div>
            <p className="m-0">{row.text}</p>
            {row.label === FLOAT_DETAILS_WORDS.insidersLabel && view.details.insiders.length > 0 ? (
              <ul className="m-0 mt-1 list-none p-0">
                {view.details.insiders.map((line) => (
                  <li key={line} className="text-ink-2">
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p key={row.text} className="m-0 mb-2">
            {row.text}
          </p>
        ),
      )}
      <p className="m-0 text-ink-2">
        {FLOAT_PAGE_LINK_LEAD}{' '}
        <a href={FLOAT_PAGE_HREF} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          {FLOAT_PAGE_LINK_LABEL}
        </a>
      </p>
    </Popover>
  );
}
