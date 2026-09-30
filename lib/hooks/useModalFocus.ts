'use client';

import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * A modal window's three focus duties, in the order a dialog needs them: move
 * focus in, keep it in, give it back to what opened it. The pattern is
 * `TickerDrawer`'s (audit F-03), taken for the report window.
 *
 * TWO EFFECTS, NOT ONE, because the report window can be COVERED: a ticker
 * opened from inside a report stacks above it. While covered, the report must
 * not answer Escape (one key would close both) or trap Tab (it would pull
 * focus out of the ticker). But covering must not count as closing either, or
 * the report would hand focus back to the board underneath the ticker. So
 * focus capture and restore follow `open`; keys follow `open && !covered`.
 */
export function useModalFocus({
  open,
  covered,
  panel,
  heading,
  onClose,
}: {
  open: boolean;
  covered: boolean;
  panel: RefObject<HTMLElement | null>;
  heading: RefObject<HTMLElement | null>;
  onClose: () => void;
}): void {
  useEffect(() => {
    if (!open) return;
    const restore = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    heading.current?.focus();
    return () => {
      restore?.focus?.();
    };
  }, [open, heading]);

  useEffect(() => {
    if (!open || covered) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const box = panel.current;
      if (!box) return;
      const focusable = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        heading.current?.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      if (!box.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, covered, panel, heading, onClose]);
}
