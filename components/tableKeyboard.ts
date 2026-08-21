'use client';

import type { KeyboardEvent } from 'react';

/**
 * Keyboard behaviour for a board row.
 *
 * The rows were click-only: no tabindex, no role, no key handler. The ticker
 * dossier — the product's whole investigative surface — could not be reached
 * without a mouse. A row is now a focusable control that opens on Enter or
 * Space, and the arrow keys move a cursor down the board the way a trader
 * scans it.
 *
 * Focus moves between sibling `<tr>` elements rather than through a roving
 * index in React state, so the two boards share one behaviour and neither has
 * to own a selection model it does not otherwise need.
 */
export function rowKeyHandler(onOpen: () => void) {
  return (event: KeyboardEvent<HTMLTableRowElement>) => {
    // A key pressed while inside the row's own star button belongs to it.
    if (event.target !== event.currentTarget) return;

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      onOpen();
      return;
    }

    const body = event.currentTarget.parentElement;
    if (!body) return;

    let target: Element | null = null;
    if (event.key === 'ArrowDown') target = event.currentTarget.nextElementSibling;
    else if (event.key === 'ArrowUp') target = event.currentTarget.previousElementSibling;
    else if (event.key === 'Home') target = body.firstElementChild;
    else if (event.key === 'End') target = body.lastElementChild;
    else return;

    event.preventDefault();
    // Duck-typed rather than `instanceof HTMLElement`: the check runs the same
    // way in the browser and under the node test environment, where the
    // constructor does not exist at all.
    const focusable = target as { focus?: () => void } | null;
    if (typeof focusable?.focus === 'function') focusable.focus();
  };
}

/** The props every keyboard-reachable board row carries. */
export function rowKeyboardProps(label: string, onOpen: () => void) {
  return {
    tabIndex: 0,
    role: 'button' as const,
    'aria-label': label,
    onKeyDown: rowKeyHandler(onOpen),
  };
}
