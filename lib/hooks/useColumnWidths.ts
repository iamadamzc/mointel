'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  browserStorage,
  hasCustomWidths,
  layoutColumns,
  maxWidthFor,
  minimumFor,
  readStoredWidths,
  resetColumn,
  resizeColumn,
  writeStoredWidths,
  type DiscoveryColumnKey,
  type LayoutInput,
  type StoredWidths,
  type Widths,
} from '@/lib/dashboard/columnWidths';

/** `px-2` on each side of a header cell, plus a pixel of rounding either way. */
const HEAD_PADDING_PX = 16 + 2;

export interface ColumnHandle {
  width: number;
  min: number;
  max: number;
  /** A requested width; the model clamps it. Called on every move of a drag. */
  onResize: (width: number) => void;
  onFit: () => void;
  onReset: () => void;
}

/**
 * The DOM half of resizable columns: how wide the table is, how wide each
 * header is in its sorted state, and what fits a column's content. Everything
 * that DECIDES a width is the pure model in `lib/dashboard/columnWidths.ts`.
 *
 * `widths` is null until the table has been measured once, and nothing that
 * depends on the stored widths renders before then. So the server render and
 * the first client render are both the board as it has always looked, whatever
 * this browser has stored.
 */
export function useColumnWidths(visible: readonly DiscoveryColumnKey[]) {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [available, setAvailable] = useState<number | null>(null);
  const [minimums, setMinimums] = useState<LayoutInput['minimums']>({});
  // No window on the server, so this reads {} there; see the note above for why
  // reading it during the first client render cannot mismatch.
  const [stored, setStored] = useState<StoredWidths>(() => readStoredWidths(browserStorage()));

  const heads = useRef(new Map<DiscoveryColumnKey, HTMLElement>());
  const observer = useRef<ResizeObserver | null>(null);

  // Storage is an external system; keeping it in step is what an effect is for.
  useEffect(() => {
    writeStoredWidths(browserStorage(), stored);
  }, [stored]);

  /*
   * ONE OBSERVER FOR THE TABLE'S WIDTH AND EVERY HEADER'S SORTED WIDTH.
   *
   * THE MINIMUM IS MEASURED, NOT TYPED, because the labels change with the
   * session (`RVOL` becomes `PART`, `Gap` becomes `Move`) and a constant typed
   * today is wrong the first time one does. The measuring spans resize when
   * their label does, so the observer hears about it without a poll.
   */
  useLayoutEffect(() => {
    if (!box || typeof ResizeObserver === 'undefined') return;
    const read = () => {
      setAvailable(Math.floor(box.getBoundingClientRect().width));
      const next: LayoutInput['minimums'] = {};
      for (const [key, element] of heads.current) {
        next[key] = Math.ceil(element.getBoundingClientRect().width) + HEAD_PADDING_PX;
      }
      setMinimums((current) => (sameWidths(current, next) ? current : next));
    };
    /*
     * ONE READ NOW, NOT ONLY WHEN THE OBSERVER REPORTS. A hidden page runs no
     * rendering steps, so a board opened in a background tab never hears from
     * the observer until it is looked at -- and until then the stored widths
     * are silently ignored. Measuring layout before paint is what a layout
     * effect is for.
     */
    read();
    const watcher = new ResizeObserver(read);
    watcher.observe(box);
    for (const element of heads.current.values()) watcher.observe(element);
    observer.current = watcher;
    return () => {
      watcher.disconnect();
      observer.current = null;
    };
  }, [box]);

  /** A header's measuring span, registered and observed while it is mounted. */
  const measureHead = (key: DiscoveryColumnKey) => (element: HTMLElement | null) => {
    if (!element) return;
    heads.current.set(key, element);
    observer.current?.observe(element);
    return () => {
      heads.current.delete(key);
      observer.current?.unobserve(element);
    };
  };

  const input: LayoutInput = { available: available ?? 0, visible, stored, minimums };
  const widths: Widths | null = available ? layoutColumns(input) : null;

  /**
   * DOUBLE-CLICK FITS the column to the widest content on screen now: each
   * cell's width plus whatever its truncated children are hiding.
   */
  const fitWidth = (key: DiscoveryColumnKey): number | null => {
    const table = box?.querySelector('table');
    const column = visible.indexOf(key);
    if (!table || column < 0) return null;
    let widest = 0;
    for (const row of Array.from(table.tBodies[0]?.rows ?? [])) {
      const cell = row.cells[column];
      if (!cell) continue;
      let hidden = 0;
      for (const element of Array.from(cell.querySelectorAll<HTMLElement>('*'))) {
        hidden = Math.max(hidden, element.scrollWidth - element.clientWidth);
      }
      widest = Math.max(widest, Math.ceil(cell.getBoundingClientRect().width) + hidden);
    }
    return widest > 0 ? widest : null;
  };

  function handle(key: DiscoveryColumnKey): ColumnHandle | null {
    if (!widths || widths[key] === undefined) return null;
    return {
      width: widths[key] ?? 0,
      min: minimumFor(key, minimums),
      max: maxWidthFor(key, input),
      onResize: (width) =>
        setStored((current) => resizeColumn(key, width, { ...input, stored: current })),
      onFit: () => {
        const fit = fitWidth(key);
        if (fit === null) return;
        setStored((current) => resizeColumn(key, fit, { ...input, stored: current }));
      },
      onReset: () => setStored((current) => resetColumn(key, current)),
    };
  }

  return {
    attachBox: setBox,
    widths,
    measureHead,
    handle,
    customised: widths !== null && hasCustomWidths(stored),
    resetAll: () => setStored({}),
  };
}

function sameWidths(a: LayoutInput['minimums'], b: LayoutInput['minimums']): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<DiscoveryColumnKey>;
  for (const key of keys) if (a[key] !== b[key]) return false;
  return true;
}
