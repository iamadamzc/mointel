'use client';

import { Popover } from '@/components/Popover';
import {
  FLOAT_DETAILS_WORDS,
  FLOAT_PAGE_HREF,
  FLOAT_PAGE_LINK_LABEL,
  FLOAT_PAGE_LINK_LEAD,
  floatCellView,
  type FiledCountIcon,
  type FloatBound,
} from '@/lib/dashboard/floatBound';
import { useDeskMode } from '@/lib/hooks/useDeskMode';

/** What the float on the cell leaves out (his yes 2026-10-09T22:45:50.617Z; Marketing 955b3749, Commercial read 66). */
export const FLOAT_TOOLTIP_LEAVES_OUT = 'Warrants, convertible notes and share-sale programs are not in it, and can add shares.';

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
      : view.kind === 'filedCount'
        ? 'text-ink-2'
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
          {view.icon ? <FiledCountMark kind={view.icon.kind} title={view.icon.title} /> : null}
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
      {/* Before the page link, on a number only: "it" is the number on the cell (Marketing 955b3749, Commercial read 66). */}
      {view.kind === 'bound' ? <p className="m-0 mb-2">{FLOAT_TOOLTIP_LEAVES_OUT}</p> : null}
      <p className="m-0 text-ink-2">
        {FLOAT_PAGE_LINK_LEAD}{' '}
        <a href={FLOAT_PAGE_HREF} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          {FLOAT_PAGE_LINK_LABEL}
        </a>
      </p>
    </Popover>
  );
}

/**
 * The filed-count face's ONE icon (float fix 1), 8 px, beside the number: `caveat` is a circled "i" in ink-3,
 * `warning` a triangle "!" in the warn tone. They differ by SHAPE as well as colour (Commercial 89e (4)); the
 * accessible name carries the same words, so the icon itself is hidden from assistive technology. The hover is
 * the native title (the whole cell is the popover's trigger, so a click still opens the panel and its page link).
 * The 8 px box was measured with the face: "12.4M sh" plus icon 63.9 px, "o/s" 70.4 px, of the column's 86.
 */
export function FiledCountMark({ kind, title }: { kind: FiledCountIcon; title: string }) {
  return (
    <span title={title} className={`inline-flex self-center ${kind === 'warning' ? 'text-warn' : 'text-ink-3'}`}>
      <svg aria-hidden="true" width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1">
        {kind === 'warning' ? (
          <>
            <path d="M4 0.7 L7.5 7.3 L0.5 7.3 Z" strokeLinejoin="round" />
            <path d="M4 3 V5" strokeLinecap="round" />
            <circle cx="4" cy="6.2" r="0.15" fill="currentColor" />
          </>
        ) : (
          <>
            <circle cx="4" cy="4" r="3.5" />
            <path d="M4 3.6 V6" strokeLinecap="round" />
            <circle cx="4" cy="2.3" r="0.15" fill="currentColor" />
          </>
        )}
      </svg>
    </span>
  );
}
