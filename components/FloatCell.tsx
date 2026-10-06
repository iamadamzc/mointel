'use client';

import { Popover } from '@/components/Popover';
import {
  FLOAT_PAGE_HREF,
  FLOAT_PAGE_LINK_LABEL,
  FLOAT_PAGE_LINK_LEAD,
  floatCellView,
  type FloatBound,
} from '@/lib/dashboard/floatBound';

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
export function FloatCell({ bound }: { bound: FloatBound | null | undefined }) {
  const view = floatCellView(bound);
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
          <span className={tone}>{view.face}</span>
          {view.date ? <span className="text-[10px] text-ink-3">{view.date}</span> : null}
        </>
      }
    >
      {view.paragraphs.map((paragraph) => (
        <p key={paragraph} className="m-0 mb-2">
          {paragraph}
        </p>
      ))}
      <p className="m-0 text-ink-2">
        {FLOAT_PAGE_LINK_LEAD}{' '}
        <a href={FLOAT_PAGE_HREF} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          {FLOAT_PAGE_LINK_LABEL}
        </a>
      </p>
    </Popover>
  );
}
