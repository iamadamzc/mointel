'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * A focusable popover for a small control that has more to say than a native
 * `title` can: a `title` cannot be reached from a keyboard, never appears on a
 * touch screen, and cannot hold a link.
 *
 * OPENS three ways, so no input device is left out: hover (mouse), focus
 * (keyboard) and click or tap (pins it open; a second click closes it). Escape
 * closes it and keeps focus on the trigger. A pointer press anywhere outside
 * closes a pinned one.
 *
 * RENDERED IN A PORTAL with fixed positioning measured from the trigger, because
 * the board's cells and scroll containers clip anything absolutely positioned
 * inside them. It flips above the trigger when there is no room below and is
 * kept inside the viewport horizontally.
 *
 * THE CLICK NEVER REACHES THE ROW: the row beneath a trigger opens the dossier
 * drawer, and a click meant to read a tooltip must not do that. Same rule as
 * `FocusToggle`.
 *
 * Nothing renders in the popover until it opens, so server rendering carries
 * only the trigger.
 */
export function Popover({
  trigger,
  children,
  label,
  triggerClassName = '',
  width = 280,
}: {
  /** What the trigger shows. */
  trigger: ReactNode;
  /** The popover body. May contain links; focus can move into it. */
  children: ReactNode;
  /** The trigger's accessible name. */
  label: string;
  triggerClassName?: string;
  width?: number;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pinned, setPinned] = useState(false);
  const [hot, setHot] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const open = pinned || hot;

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  // A short grace so the pointer can cross the gap between trigger and panel.
  const leave = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setHot(false), 120);
  };
  const enter = () => {
    cancelClose();
    setHot(true);
  };

  const place = useCallback(() => {
    const button = triggerRef.current;
    const panel = panelRef.current;
    if (!button || !panel) return;
    const rect = button.getBoundingClientRect();
    const margin = 8;
    const panelHeight = panel.offsetHeight;
    const below = rect.bottom + 4;
    const top =
      below + panelHeight + margin > window.innerHeight && rect.top - 4 - panelHeight >= margin
        ? rect.top - 4 - panelHeight
        : below;
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
    setPos({ top, left });
  }, [width]);

  useLayoutEffect(() => {
    // Measured before paint, so a stale position from the last opening never shows.
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => place();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, place]);

  useEffect(() => {
    if (!pinned) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setPinned(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [pinned]);

  useEffect(() => cancelClose, []);

  const close = () => {
    cancelClose();
    setPinned(false);
    setHot(false);
  };

  // Focus leaving both the trigger and the panel closes the focus-opened state.
  const onBlur = (event: React.FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next && (triggerRef.current?.contains(next) || panelRef.current?.contains(next))) return;
    setHot(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(event) => {
          event.stopPropagation();
          setPinned((value) => !value);
        }}
        onFocus={() => setHot(true)}
        onBlur={onBlur}
        onMouseEnter={enter}
        onMouseLeave={leave}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.stopPropagation();
            close();
          }
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={id}
              role="dialog"
              aria-label={label}
              onMouseEnter={enter}
              onMouseLeave={leave}
              onBlur={onBlur}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  close();
                  triggerRef.current?.focus();
                }
              }}
              style={{
                position: 'fixed',
                top: pos?.top ?? 0,
                left: pos?.left ?? 0,
                width,
                visibility: pos ? 'visible' : 'hidden',
              }}
              className="z-[70] rounded border border-line-2 bg-panel px-3 py-2.5 text-left text-[12px] leading-relaxed font-normal tracking-normal text-ink-1 normal-case shadow-lg"
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
