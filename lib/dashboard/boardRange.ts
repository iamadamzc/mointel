/**
 * The viewer's board price range, as the control and the caption see it.
 *
 * THE CAPTION PRINTS WHAT WAS SERVED, NEVER WHAT THE CONTROL HOLDS. A poll in
 * flight while the range changes would otherwise put new words over old rows,
 * the header-names-one-quantity, rows-drawn-from-another defect. So every
 * label here is built from `discovery.priceMin/priceMax`, the range the server
 * says it actually ranked in.
 *
 * Design: `docs/threads/design.md`, "THE CONTROL'S SHAPE" (`4b7fca4`).
 */

export interface PriceRange {
  min: number;
  max: number;
}

/** "$0.25", "$1", "$12.50": cents only where there are cents. */
export function formatRangeEnd(value: number): string {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

export function rangeLabel(range: PriceRange): string {
  return `${formatRangeEnd(range.min)}–${formatRangeEnd(range.max)}`;
}

export function sameRange(a: PriceRange | null | undefined, b: PriceRange | null | undefined): boolean {
  if (!a || !b) return false;
  return a.min === b.min && a.max === b.max;
}

/**
 * The viewer's typed range, or a reason it cannot be asked for.
 *
 * Clamped into the bounds the server allows, because the server clamps
 * anyway, and a control that shows a value the server silently changed is
 * the caption defect one step earlier. An empty or inverted range is refused
 * here rather than sent, since the server would answer it with the default
 * and the viewer would see their input ignored with no reason given.
 */
export function parseRangeInput(
  minText: string,
  maxText: string,
  bounds: PriceRange,
): { ok: true; range: PriceRange } | { ok: false; reason: string } {
  const min = Number(minText.replace(/^\$/, '').trim());
  const max = Number(maxText.replace(/^\$/, '').trim());
  if (minText.trim() === '' || maxText.trim() === '' || !Number.isFinite(min) || !Number.isFinite(max)) {
    return { ok: false, reason: 'Enter a price for both ends.' };
  }
  const clampedMin = Math.min(Math.max(min, bounds.min), bounds.max);
  const clampedMax = Math.min(Math.max(max, bounds.min), bounds.max);
  if (clampedMin >= clampedMax) {
    return {
      ok: false,
      reason: `The low end must be below the high end, within ${rangeLabel(bounds)}.`,
    };
  }
  return { ok: true, range: { min: clampedMin, max: clampedMax } };
}

/** The query suffix for `/api/market`, or '' for the server's own default. */
export function rangeQuery(range: PriceRange | null): string {
  if (!range) return '';
  return `min=${encodeURIComponent(String(range.min))}&max=${encodeURIComponent(String(range.max))}`;
}
