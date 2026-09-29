'use client';

import { useRef } from 'react';

import { handleKeyAction } from '@/lib/dashboard/columnWidths';

/**
 * THE DRAG HANDLE ON A DISCOVERY HEADER'S RIGHT EDGE.
 *
 * A focusable separator (the WAI-ARIA window-splitter pattern), so the width is
 * reachable without a mouse: ←/→ 8 px, Shift+←/→ 32 px, Enter fits the column
 * to what is on screen, Delete puts it back. The limits and the arithmetic are
 * `lib/dashboard/columnWidths.ts`; this component only turns pointer and key
 * events into a requested width.
 *
 * It swallows its own pointer events, so a drag can never reach anything else
 * in the header.
 */
export function ColumnResizeHandle({
  label,
  width,
  min,
  max,
  onResize,
  onFit,
  onReset,
}: {
  /** The column's name as a reader would say it: "Ticker", "Why". */
  label: string;
  /** The rendered width now. */
  width: number;
  min: number;
  max: number;
  /** A requested width; the model clamps it. Called on every move of a drag. */
  onResize: (width: number) => void;
  onFit: () => void;
  onReset: () => void;
}) {
  const drag = useRef<{ startX: number; startWidth: number; pointerId: number } | null>(null);

  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label} column`}
      aria-valuenow={Math.round(width)}
      aria-valuemin={Math.round(min)}
      aria-valuemax={Math.round(max)}
      aria-valuetext={`${Math.round(width)} pixels`}
      tabIndex={0}
      title={`Drag to resize ${label}. Double-click to fit.`}
      className="group absolute top-0 right-0 z-20 flex h-full w-[6px] cursor-col-resize touch-none justify-end select-none focus-visible:outline-none"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { startX: event.clientX, startWidth: width, pointerId: event.pointerId };
      }}
      onPointerMove={(event) => {
        const active = drag.current;
        if (!active || active.pointerId !== event.pointerId) return;
        event.preventDefault();
        onResize(active.startWidth + (event.clientX - active.startX));
      }}
      onPointerUp={(event) => {
        if (!drag.current) return;
        event.stopPropagation();
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onFit();
      }}
      onKeyDown={(event) => {
        const action = handleKeyAction(event.key, event.shiftKey);
        if (!action) return;
        event.preventDefault();
        event.stopPropagation();
        if (action.kind === 'nudge') {
          onResize(width + action.delta);
        } else if (action.kind === 'fit') {
          onFit();
        } else {
          onReset();
        }
      }}
    >
      {/*
        * The visible line: faint while the header is hovered, accent on the
        * handle itself or under keyboard focus, and absent otherwise, so eight
        * idle handles do not rule the header.
        */}
      <span
        aria-hidden="true"
        className="h-full w-[2px] bg-transparent transition-colors group-hover/head:bg-line-2 group-hover:bg-accent/60 group-focus-visible:bg-accent group-active:bg-accent"
      />
    </span>
  );
}
