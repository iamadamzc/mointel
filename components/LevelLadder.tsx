'use client';

import { useState } from 'react';

/**
 * Price level visualisation.
 *
 * Two presentations of the same structured data: a compact three-line cell for
 * the board, and a full ladder for the drawer. Both receive a prepared
 * `LevelMap` and render it — no parsing, ordering or measuring happens here.
 *
 * The ladder reads top-to-bottom like a price axis: resistance above, current
 * price in the middle, support below. That ordering is the whole point, so a
 * trader can answer "what is above me and how far" without reading a sentence.
 */

import type { CompactLevel, LevelMap, LevelZone } from '@/lib/data/priceLevels';
import { levelTypeLabel, toCompactRow } from '@/lib/data/priceLevels';
import { levelDateHoverSuffix, levelDateSuffix, levelTagLead } from '@/lib/data/levelDate';
import { ClampedText } from '@/components/ClampedText';
import { describeBlueSkyWindow, type BlueSkyState } from '@/lib/market/blueSky';
import { deepCeilingTitle } from '@/lib/dashboard/blueSkyView';
import {
  airPocketAboveHolds,
  computedText,
  horizonText,
  LEVELS_ABSENT_TEXT,
  levelsNote,
  shownStoredRows,
  storedLadderRows,
  type StoredLadderRow,
  type StoredLevelsState,
} from '@/lib/dashboard/resistance';

function priceText(value: number): string {
  return value < 1 ? value.toFixed(3) : value.toFixed(2);
}

/* ------------------------------------------------------------ compact cell */

function CompactSide({
  side,
  levels,
  distanceClass,
}: {
  side: 'up' | 'dn';
  levels: CompactLevel[];
  distanceClass: string;
}) {
  // Plain-text copy for the hover title, so clipping never loses a level.
  const full = levels
    .map((level) =>
      [
        level.price,
        `${level.type}${levelDateHoverSuffix(level.sourceDate)}${level.stateLabel ? `${levelTagLead(level.sourceDate)}${level.stateLabel}` : ''}`,
        level.distance,
      ]
        .filter(Boolean)
        .join(' '),
    )
    .join(' · ');

  return (
    <div className="flex items-baseline gap-1" title={full || undefined}>
      <span className="w-[22px] shrink-0 text-[9px] uppercase tracking-wider text-ink-3">
        {side}
      </span>
      {levels.length === 0 ? (
        <span className="text-[10px] text-ink-3">open</span>
      ) : (
        <span className="num truncate whitespace-nowrap text-[10px] text-ink-2">
          {levels.map((level, index) => (
            <span key={index}>
              {index > 0 ? <span className="text-ink-3"> · </span> : null}
              <span className="text-ink-1">{level.price}</span>{' '}
              <span className="text-ink-3">{level.type}{levelDateSuffix(level.sourceDate)}</span>
              {level.stateLabel ? <span className="text-warn">{levelTagLead(level.sourceDate)}{level.stateLabel}</span> : null}{' '}
              <span className={distanceClass}>{level.distance}</span>
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

/**
 * Board cell: nearest levels either side of price.
 *
 * Two lines, not three. The current price used to sit between them, which
 * repeated the Price column a few cells to the left and spent a third of the
 * cell saying nothing new. Distances are signed, so direction reads without
 * needing an anchor row.
 */
export function CompactLevels({ map }: { map: LevelMap }) {
  const row = toCompactRow(map, 2);

  if (row.empty) {
    return <span className="text-[10px] uppercase tracking-wide text-ink-3">No key levels</span>;
  }

  return (
    <div className="flex min-w-0 flex-col gap-[1px] leading-tight">
      <CompactSide side="up" levels={row.nextUp} distanceClass="text-pos" />
      <CompactSide side="dn" levels={row.nextDown} distanceClass="text-warn" />

      {/* The one current-price fact the Price column cannot express: price is
          sitting on a level rather than between two. */}
      {row.atPriceNote ? (
        <div className="text-[9px] uppercase tracking-wider text-accent">{row.atPriceNote}</div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- full ladder */

function ZoneRow({ zone, side }: { zone: LevelZone; side: 'ABOVE' | 'BELOW' }) {
  const isZone = zone.members.length > 1;
  const sign = side === 'ABOVE' ? '+' : '-';

  return (
    <div className="flex items-baseline gap-2 border-l-2 border-line-2 py-[3px] pl-2">
      <span className="num w-[92px] shrink-0 text-[12px] text-ink-1">
        {isZone ? `${priceText(zone.low)}–${priceText(zone.high)}` : priceText(zone.nearestPrice)}
      </span>

      {/* The type is what the source said; the state is where price stands
          relative to it. Both are shown, and neither replaces the other. */}
      <span className="w-[110px] shrink-0 text-[10px] uppercase tracking-wide text-ink-2">
        {levelTypeLabel(zone.dominantType)}
        {isZone ? ' zone' : ''}
        {levelDateSuffix(zone.sourceDate)}
      </span>

      <span className="w-[92px] shrink-0 text-[9px] uppercase tracking-wider text-warn">
        {zone.stateLabel ?? ''}
      </span>

      <span
        className={`num w-[112px] shrink-0 whitespace-nowrap text-[11px] ${side === 'ABOVE' ? 'text-pos' : 'text-warn'}`}
      >
        {zone.distanceAbs === null ? '—' : `${sign}${zone.distanceAbs.toFixed(2)}`}
        {zone.distancePct === null ? '' : ` / ${zone.distancePct.toFixed(1)}%`}
      </span>

      {/* A zone lists what it is made of, so merging never hides a source.
          Clipped by the column, revealed on hover, whole in the DOM. */}
      <ClampedText
        className="text-[10px] text-ink-3"
        text={
          isZone
            ? zone.members
                .map((member) => `${priceText(member.price)} ${levelTypeLabel(member.type)}${levelDateSuffix(member.sourceDate)}`)
                .join(' · ')
            : (zone.members[0]?.note ?? '')
        }
      />
    </div>
  );
}

const BLUE_SKY_TONE: Record<BlueSkyState['status'], string> = {
  IN_BLUE_SKY: 'border-accent/50 text-accent',
  BLUE_SKY_ABOVE: 'border-line-2 text-ink-1',
  NOT_BLUE_SKY: 'border-line-2 text-ink-2',
  UNVERIFIED: 'border-line-2 text-ink-3',
  UNAVAILABLE: 'border-line-2 text-ink-3',
};

/**
 * The blue-sky state, stated once and honestly.
 *
 * Five outcomes and no sixth: in verified blue sky, blue sky above a named
 * level, not blue sky with overhead named, the level exists but could not be
 * verified, or there is no daily history to verify it from. The ceiling is the
 * highest prior-session high in the retained split-adjusted window — never an
 * all-time high, never a 52-week high, and never an unadjusted pre-split price
 * — and the line under it says so, so the number is read for what it is.
 */
function BlueSkyLine({ state }: { state: BlueSkyState }) {
  const window = describeBlueSkyWindow(state.threshold);
  const detail = state.threshold.verified
    ? window
    : (state.threshold.unverifiedReason ?? window);

  return (
    <div
      className={`mb-3 border-l-2 pl-2 ${BLUE_SKY_TONE[state.status]}`}
      title={deepCeilingTitle(state.threshold) ?? undefined}
    >
      <p className="text-[12px] font-semibold tracking-wide uppercase">{state.label}</p>
      {detail ? <p className="mt-0.5 text-[11px] text-ink-3">{detail}</p> : null}
    </div>
  );
}

/**
 * A stored resistance level as a ladder row (his ruling 2026-10-02: one
 * ladder). Same columns as a zone: price, then "RESISTANCE" (his label for
 * these levels), the timeframe tags where a zone shows its state, the signed
 * distance from the live price, then the candle tops. No strength, no
 * highlight: the tags are the only mark.
 */
function StoredRow({ level }: { level: StoredLadderRow }) {
  const sign = level.side === 'ABOVE' ? '+' : '-';
  const detail = [level.topsText, level.span, level.farBack ? 'over 12 months back' : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="flex items-baseline gap-2 border-l-2 border-line-2 py-[3px] pl-2" title={level.title}>
      <span className="num w-[92px] shrink-0 text-[12px] text-ink-1">{level.priceText}</span>
      <span className="w-[110px] shrink-0 text-[10px] uppercase tracking-wide text-ink-2">resistance</span>
      <span className="w-[92px] shrink-0 truncate text-[10px] text-ink-3">{level.tags}</span>
      <span
        className={`num w-[112px] shrink-0 whitespace-nowrap text-[11px] ${level.side === 'ABOVE' ? 'text-pos' : 'text-warn'}`}
      >
        {level.distanceAbs === null ? '' : `${sign}${level.distanceAbs.toFixed(2)}`}
        {level.distancePct === null ? '' : ` / ${level.distancePct.toFixed(1)}%`}
      </span>
      <ClampedText className="text-[10px] text-ink-3" text={detail} />
    </div>
  );
}

type AxisItem =
  | { kind: 'ZONE'; key: string; price: number; zone: LevelZone }
  | { kind: 'STORED'; key: string; price: number; level: StoredLadderRow };

/** Highest first: the axis reads top to bottom as price falls. */
function byPriceDesc(a: AxisItem, b: AxisItem): number {
  return b.price - a.price;
}

/** What the stored levels say beside the axis: loading, failure, absent, empty, split. */
function storedNote(stored: StoredLevelsState | undefined): string | null {
  if (!stored) return null;
  if (stored.kind === 'LOADING') return 'Loading stored levels…';
  if (stored.kind === 'ERROR') return 'Stored levels could not be loaded.';
  if (stored.kind === 'ABSENT') return LEVELS_ABSENT_TEXT;
  if (stored.kind === 'ROW') return levelsNote(stored.row);
  return null;
}

/**
 * Drawer ladder: the complete map, ordered as a price axis.
 *
 * Farthest above at the top down to farthest support at the bottom, with
 * current price fixed in the middle. The stored resistance levels (`stored`)
 * are rows on the same axis, not a second list (his ruling 2026-10-02).
 */
export function LevelLadder({
  map,
  blueSky,
  stored,
  Section,
}: {
  map: LevelMap;
  /** The one honest blue-sky state for this ticker. Always rendered. */
  blueSky: BlueSkyState;
  /** The stored levels for this name; undefined where the route is not wired. */
  stored?: StoredLevelsState;
  Section: (props: { title: string; children: React.ReactNode }) => React.ReactElement;
}) {
  // Every name opens collapsed: the drawer remounts this per name.
  const [showAll, setShowAll] = useState(false);
  const row = stored?.kind === 'ROW' ? stored.row : null;
  const storedRows = row ? storedLadderRows(row, map.currentPrice) : [];
  const { shown, toggle } = shownStoredRows(storedRows, showAll);
  const note = storedNote(stored);
  const footer = row ? [computedText(row), horizonText(row)].filter(Boolean).join(' ') : '';

  if (map.empty && storedRows.length === 0) {
    return (
      <Section title="Level Ladder">
        <BlueSkyLine state={blueSky} />
        <p className="text-[12px] text-ink-2">No key levels available for this ticker.</p>
        {note ? <p className="mt-2 text-[11px] text-ink-3">{note}</p> : null}
        {footer ? <p className="mt-1 text-[11px] text-ink-3">{footer}</p> : null}
      </Section>
    );
  }

  const items = (side: 'ABOVE' | 'BELOW'): AxisItem[] =>
    [
      ...(side === 'ABOVE' ? map.above : map.below).map(
        (zone): AxisItem => ({ kind: 'ZONE', key: zone.clusterId, price: zone.nearestPrice, zone }),
      ),
      ...shown
        .filter((level) => level.side === side)
        .map((level): AxisItem => ({ kind: 'STORED', key: level.key, price: level.value, level })),
    ].sort(byPriceDesc);

  // The note is the ladder's own, computed without the stored levels; it is
  // printed only while a stored level does not sit nearer above.
  const airPocketAbove =
    map.airPocketAbove && airPocketAboveHolds(map.above[0]?.distancePct ?? null, storedRows)
      ? map.airPocketAbove
      : null;

  const renderItem = (item: AxisItem, side: 'ABOVE' | 'BELOW') =>
    item.kind === 'ZONE' ? (
      <ZoneRow key={item.key} zone={item.zone} side={side} />
    ) : (
      <StoredRow key={item.key} level={item.level} />
    );

  return (
    <Section title="Level Ladder">
      <BlueSkyLine state={blueSky} />

      {airPocketAbove ? <p className="mb-2 text-[11px] text-ink-3">{airPocketAbove}</p> : null}
      {note ? <p className="mb-2 text-[11px] text-ink-3">{note}</p> : null}

      {/* The link sits where the hidden levels would be: at the top of the axis. */}
      {toggle ? (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          aria-expanded={showAll}
          className="mb-1 min-h-6 text-[11px] font-semibold text-accent hover:underline"
        >
          {toggle}
        </button>
      ) : null}

      <div className="flex flex-col">
        {items('ABOVE').map((item) => renderItem(item, 'ABOVE'))}

        {/* The price row is the visual centre of the ladder. */}
        <div className="my-1 flex items-baseline gap-2 rounded-sm border-l-2 border-accent bg-panel-2 py-1.5 pl-2">
          <span className="num w-[92px] shrink-0 text-[14px] font-semibold text-ink">
            {map.currentPrice === null ? '—' : priceText(map.currentPrice)}
          </span>
          <span className="w-[110px] shrink-0 text-[10px] uppercase tracking-wide text-ink-2">
            current price
          </span>
          <span className="num w-[112px] shrink-0 whitespace-nowrap text-[11px] text-ink-3">
            {map.spreadPct === null ? '' : `${map.spreadPct.toFixed(2)}% sprd`}
          </span>
          <ClampedText
            className="text-[10px] text-ink-3"
            text={
              map.atPrice.length > 0
                ? `at ${map.atPrice.map((level) => levelTypeLabel(level.type)).join(' · ')}`
                : (map.betweenNote ?? '')
            }
          />
        </div>

        {items('BELOW').map((item) => renderItem(item, 'BELOW'))}
      </div>

      {map.airPocketBelow ? (
        <p className="mt-2 text-[11px] text-ink-3">{map.airPocketBelow}</p>
      ) : null}

      {/* Level text we could not turn into a level is disclosed, not dropped. */}
      {map.unparsed.length > 0 ? (
        <p className="mt-3 text-[10px] text-ink-3">
          Not normalised: {map.unparsed.join(' · ')}
        </p>
      ) : null}

      {/* Where the stored levels were read from and how far back. */}
      {footer ? <p className="mt-2 text-[11px] text-ink-3">{footer}</p> : null}
    </Section>
  );
}
