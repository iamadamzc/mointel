/**
 * THE DISCOVERY BOARD'S COLUMN WIDTHS, AS A PURE MODEL.
 *
 * His ruling, 2026-09-29T02:41:45Z: *"2 yes discovery only"* -- drag any column
 * edge on the Discovery board, remembered in this browser. The behaviour is
 * `docs/Design/resizable-columns-scope.md` option (A), and every guardrail in it
 * lives HERE rather than in the component, so each one is a unit test instead
 * of a thing to remember while editing JSX:
 *
 *   - A column never goes narrower than its own header in the SORTED state,
 *     caret included. The component measures that and passes it in as
 *     `minimums`; this module only enforces it. (The `Now` head sat 17 px short
 *     of its own word whenever it was the active sort, and the caret leaned into
 *     `RVOL`. A minimum makes that impossible rather than remembered.)
 *   - NO HORIZONTAL SCROLL, EVER. The widths always sum to the width available.
 *     Widening one column takes the space from Why and Risk, down to a floor;
 *     past that the handle stops.
 *   - Why and Risk stay the flexible columns. Sizing one of them makes the other
 *     the remainder.
 *   - On a narrower window stored widths shrink proportionally to fit. They are
 *     never discarded, so they come back when the window grows.
 *
 * NOTHING HERE TOUCHES A CELL'S CONTENT. Width only decides how much of it shows
 * before the ellipsis.
 */

export type DiscoveryColumnKey =
  | 'mark'
  | 'ticker'
  | 'price'
  | 'rvol'
  | 'now'
  | 'float'
  | 'why'
  | 'risk'
  | 'cycle';

/** The two columns that share whatever the others leave. */
export const FLEX_COLUMNS = ['why', 'risk'] as const;
type FlexKey = (typeof FLEX_COLUMNS)[number];

/**
 * THE DEFAULT WIDTHS. Each one was measured on the live
 * board for a reason recorded beside its header in `DiscoveryBoard.tsx`; `Now`
 * at 68 is the sorted-head fix of 2026-09-25. `null` is a flexible column.
 */
export const DEFAULT_WIDTHS: Readonly<Record<DiscoveryColumnKey, number | null>> = {
  mark: 24,
  ticker: 128,
  price: 172,
  rvol: 68,
  now: 68,
  float: 102,
  why: null,
  risk: null,
  cycle: 152,
};

/**
 * The change mark has no visible header and nothing to widen: it is a gutter.
 * Every other column takes a handle.
 */
export const RESIZABLE: ReadonlySet<DiscoveryColumnKey> = new Set([
  'ticker',
  'price',
  'rvol',
  'now',
  'float',
  'why',
  'risk',
  'cycle',
]);

/**
 * The least Why and Risk may be squeezed to by another column's drag. At 130 px
 * a Why cell still carries `B · 16h` and a Risk chip still carries its value.
 * Raised from 120 with the Sheet reproduction's layout (Ticker 128, Float 102,
 * Why 130, Risk 130, Cycle 152), measured at the 1,024 px floor.
 */
export const FLEX_FLOOR = 130;

/** No column is narrower than this whatever its header measures. */
export const ABSOLUTE_MIN = 32;

export type StoredWidths = Partial<Record<DiscoveryColumnKey, number>>;

export interface LayoutInput {
  /** The width the table has to fill, in CSS px. */
  available: number;
  /** The columns on screen, in order. `float` is present only while sorted by float. */
  visible: readonly DiscoveryColumnKey[];
  /** What the user has set, in this browser. */
  stored: StoredWidths;
  /** Each column's sorted-header width, caret and padding included, as measured. */
  minimums: Partial<Record<DiscoveryColumnKey, number>>;
}

export type Widths = Partial<Record<DiscoveryColumnKey, number>>;

const isFlex = (key: DiscoveryColumnKey): key is FlexKey =>
  (FLEX_COLUMNS as readonly string[]).includes(key);

export function minimumFor(
  key: DiscoveryColumnKey,
  minimums: LayoutInput['minimums'],
): number {
  if (!RESIZABLE.has(key)) return DEFAULT_WIDTHS[key] ?? ABSOLUTE_MIN;
  const measured = Math.ceil(minimums[key] ?? 0);
  const floor = isFlex(key) ? FLEX_FLOOR : ABSOLUTE_MIN;
  return Math.max(floor, measured);
}

/**
 * Which flexible column holds a width of its own. At most one does: the other
 * is the remainder. If storage somehow holds both, Why keeps its width and Risk
 * takes the remainder, as the scope says.
 */
function pinnedFlex(stored: StoredWidths, visible: readonly DiscoveryColumnKey[]): FlexKey | null {
  for (const key of FLEX_COLUMNS) {
    if (visible.includes(key) && stored[key] !== undefined) return key;
  }
  return null;
}

/**
 * The width of every visible column. They sum to `available` exactly whenever
 * the minimums fit inside it -- which they always do at the 1,024 px floor,
 * where today's defaults already leave 32 px of headroom.
 */
export function layoutColumns(input: LayoutInput): Widths {
  const { available, visible, stored, minimums } = input;
  const fixed = visible.filter((key) => !isFlex(key));
  const flex = visible.filter(isFlex);

  const desired = new Map<DiscoveryColumnKey, number>();
  for (const key of fixed) {
    const want = RESIZABLE.has(key) ? (stored[key] ?? DEFAULT_WIDTHS[key]) : DEFAULT_WIDTHS[key];
    desired.set(key, Math.max(minimumFor(key, minimums), Math.round(want ?? ABSOLUTE_MIN)));
  }

  // The fixed columns get whatever the flexible ones do not need at their floor.
  const flexReserve = flex.reduce((sum, key) => sum + minimumFor(key, minimums), 0);
  const budget = Math.max(0, available - flexReserve);
  const wanted = sum([...desired.values()]);

  const widths: Widths = {};
  if (wanted <= budget) {
    for (const [key, width] of desired) widths[key] = width;
  } else {
    /*
     * PROPORTIONAL SHRINK, over each column's width ABOVE ITS MINIMUM, so no
     * column is pushed under its own header. The stored widths are not touched;
     * this is a rendering of them for a narrower window.
     */
    const excess = wanted - budget;
    const give = new Map(
      [...desired].map(([key, width]) => [key, width - minimumFor(key, minimums)] as const),
    );
    const slack = sum([...give.values()]);
    const ratio = slack > 0 ? Math.min(1, excess / slack) : 0;
    for (const [key, width] of desired) {
      widths[key] = Math.floor(width - (give.get(key) ?? 0) * ratio);
    }
  }

  const remainder = available - sum(fixed.map((key) => widths[key] ?? 0));
  if (flex.length === 0) return widths;
  if (flex.length === 1) {
    widths[flex[0]] = remainder;
    return widths;
  }

  const [first, second] = flex as [FlexKey, FlexKey];
  const pinned = pinnedFlex(stored, visible);
  if (pinned === null) {
    widths[first] = Math.floor(remainder / 2);
    widths[second] = remainder - widths[first];
    return widths;
  }
  const other = pinned === first ? second : first;
  const otherMin = minimumFor(other, minimums);
  const pinnedMin = minimumFor(pinned, minimums);
  const pinnedWidth = clamp(
    Math.round(stored[pinned] ?? pinnedMin),
    pinnedMin,
    Math.max(pinnedMin, remainder - otherMin),
  );
  widths[pinned] = pinnedWidth;
  widths[other] = remainder - pinnedWidth;
  return widths;
}

/**
 * The widest `key` may be dragged to with everything else as rendered: all the
 * room the flexible columns hold above their floor, and no more. Past this the
 * handle stops, because the only other place the width could come from is the
 * right edge of the window.
 */
export function maxWidthFor(key: DiscoveryColumnKey, input: LayoutInput): number {
  const widths = layoutColumns(input);
  const current = widths[key] ?? 0;
  const min = minimumFor(key, input.minimums);
  if (isFlex(key)) {
    const other = FLEX_COLUMNS.find((flex) => flex !== key && input.visible.includes(flex));
    if (!other) return Math.max(min, current);
    return Math.max(min, current + (widths[other] ?? 0) - minimumFor(other, input.minimums));
  }
  const spare = input.visible
    .filter(isFlex)
    .reduce((total, flex) => total + (widths[flex] ?? 0) - minimumFor(flex, input.minimums), 0);
  return Math.max(min, current + Math.max(0, spare));
}

/**
 * The stored widths after the user sets `key` to `width`. Clamped to the
 * column's own header and to the room the flexible columns can give.
 * Sizing Why or Risk releases the other, so the other becomes the remainder.
 */
export function resizeColumn(
  key: DiscoveryColumnKey,
  width: number,
  input: LayoutInput,
): StoredWidths {
  if (!RESIZABLE.has(key)) return input.stored;
  const next: StoredWidths = { ...input.stored };
  next[key] = clamp(Math.round(width), minimumFor(key, input.minimums), maxWidthFor(key, input));
  if (isFlex(key)) {
    for (const other of FLEX_COLUMNS) if (other !== key) delete next[other];
  }
  return next;
}

/** One column back to its default. */
export function resetColumn(key: DiscoveryColumnKey, stored: StoredWidths): StoredWidths {
  const next = { ...stored };
  delete next[key];
  return next;
}

export function hasCustomWidths(stored: StoredWidths): boolean {
  return Object.keys(stored).length > 0;
}

/* ---- The keyboard: the WAI-ARIA window-splitter pattern, as data. ---- */

export const NUDGE_PX = 8;
export const NUDGE_LARGE_PX = 32;

export type HandleAction =
  | { kind: 'nudge'; delta: number }
  | { kind: 'fit' }
  | { kind: 'reset' };

/** ←/→ move 8 px, Shift+←/→ 32 px, Enter fits, Delete resets. Anything else is not ours. */
export function handleKeyAction(key: string, shiftKey: boolean): HandleAction | null {
  const step = shiftKey ? NUDGE_LARGE_PX : NUDGE_PX;
  switch (key) {
    case 'ArrowLeft':
      return { kind: 'nudge', delta: -step };
    case 'ArrowRight':
      return { kind: 'nudge', delta: step };
    case 'Enter':
      return { kind: 'fit' };
    case 'Delete':
      return { kind: 'reset' };
    default:
      return null;
  }
}

/* ---- Browser storage: a per-viewer convenience, and nothing depends on it. ---- */

export const COLUMN_WIDTHS_STORAGE_KEY = 'mointel.discovery.columnWidths.v1';

/**
 * Whatever storage holds, parsed defensively: unknown keys, non-numbers and
 * non-positive values are dropped, and junk reads as "no custom widths" rather
 * than as an error. A board that cannot read its widths shows today's.
 */
export function parseStoredWidths(raw: string | null): StoredWidths {
  if (!raw) return {};
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: StoredWidths = {};
  for (const [key, width] of Object.entries(value as Record<string, unknown>)) {
    if (!RESIZABLE.has(key as DiscoveryColumnKey)) continue;
    if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) continue;
    out[key as DiscoveryColumnKey] = Math.round(width);
  }
  if (out.why !== undefined && out.risk !== undefined) delete out.risk;
  return out;
}

type WidthStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * `window.localStorage` itself THROWS in some browsers when site data is
 * blocked, so even reaching for it sits inside the try.
 */
export function browserStorage(): WidthStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Blocked, empty or junk storage all read as today's widths. */
export function readStoredWidths(storage: WidthStorage | null): StoredWidths {
  try {
    return parseStoredWidths(storage?.getItem(COLUMN_WIDTHS_STORAGE_KEY) ?? null);
  } catch {
    return {};
  }
}

/** A failed write leaves the widths for this page only, which is still correct. */
export function writeStoredWidths(storage: WidthStorage | null, widths: StoredWidths): void {
  try {
    if (!storage) return;
    if (hasCustomWidths(widths)) {
      storage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(widths));
    } else {
      storage.removeItem(COLUMN_WIDTHS_STORAGE_KEY);
    }
  } catch {
    // Storage blocked or full: the widths last for this page.
  }
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
