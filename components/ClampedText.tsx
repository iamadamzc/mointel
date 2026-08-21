'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Text that is clamped by layout and reveals itself on hover.
 *
 * Two rules, and they matter equally:
 *
 * 1. **The whole string is always in the DOM.** Nothing is cut in JavaScript,
 *    so a screen reader, a text search and the drawer all still have the full
 *    sentence. The row shows as much of it as the cell can hold.
 * 2. **The tooltip appears only when there is something to reveal.** It is set
 *    from a measurement of actual overflow, not from a guess about length, so a
 *    cell that fits carries no tooltip at all. The desk used to attach a title
 *    to everything, including cells that already showed their whole contents,
 *    which trained the eye to ignore all of them.
 *
 * A tooltip is never the only route to the text — that is what the drawer is
 * for. It is the quick look, which is exactly what it is good at.
 */
export function ClampedText({
  text,
  lines = 1,
  className = '',
  as: Tag = 'span',
}: {
  text: string;
  /** How many lines the cell allows before clamping. */
  lines?: 1 | 2;
  className?: string;
  as?: 'span' | 'p' | 'div';
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [clipped, setClipped] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      setClipped(
        element.scrollHeight > element.clientHeight + 1 ||
          element.scrollWidth > element.clientWidth + 1,
      );
    };

    measure();

    // Column widths change with the window and with the Top 12/25/50 control,
    // so the measurement cannot be taken once and trusted.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, lines]);

  return (
    <Tag
      ref={ref as never}
      title={clipped ? text : undefined}
      className={`${lines === 2 ? 'clamp-2' : 'clamp-1'} ${className}`}
    >
      {text}
    </Tag>
  );
}
