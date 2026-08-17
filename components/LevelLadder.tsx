'use client';

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
      [level.price, level.type, level.stateLabel, level.distance].filter(Boolean).join(' '),
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
              <span className="text-ink-3">{level.type}</span>
              {level.stateLabel ? <span className="text-warn"> {level.stateLabel}</span> : null}{' '}
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
      </span>

      <span className="w-[92px] shrink-0 text-[9px] uppercase tracking-wider text-warn">
        {zone.stateLabel ?? ''}
      </span>

      <span
        className={`num w-[76px] shrink-0 text-[11px] ${side === 'ABOVE' ? 'text-pos' : 'text-warn'}`}
      >
        {zone.distanceAbs === null ? '—' : `${sign}${zone.distanceAbs.toFixed(2)}`}
        {zone.distancePct === null ? '' : ` / ${zone.distancePct.toFixed(1)}%`}
      </span>

      {/* A zone lists what it is made of, so merging never hides a source. */}
      <span className="truncate text-[10px] text-ink-3">
        {isZone
          ? zone.members
              .map((member) => `${priceText(member.price)} ${levelTypeLabel(member.type)}`)
              .join(' · ')
          : (zone.members[0]?.note ?? '')}
      </span>
    </div>
  );
}

/**
 * Drawer ladder: the complete map, ordered as a price axis.
 *
 * Farthest resistance at the top down to farthest support at the bottom, with
 * current price fixed in the middle.
 */
export function LevelLadder({
  map,
  Section,
}: {
  map: LevelMap;
  Section: (props: { title: string; children: React.ReactNode }) => React.ReactElement;
}) {
  if (map.empty) {
    return (
      <Section title="Level Ladder">
        <p className="text-[12px] text-ink-2">No key levels available for this ticker.</p>
      </Section>
    );
  }

  // Nearest-first from the model; reversed so the axis reads high-to-low.
  const above = [...map.above].reverse();

  return (
    <Section title="Level Ladder">
      {map.airPocketAbove ? (
        <p className="mb-2 text-[11px] text-ink-3">{map.airPocketAbove}</p>
      ) : null}

      <div className="flex flex-col">
        {above.map((zone) => (
          <ZoneRow key={zone.clusterId} zone={zone} side="ABOVE" />
        ))}

        {/* The price row is the visual centre of the ladder. */}
        <div className="my-1 flex items-baseline gap-2 rounded-sm border-l-2 border-accent bg-panel-2 py-1.5 pl-2">
          <span className="num w-[92px] shrink-0 text-[14px] font-semibold text-ink">
            {map.currentPrice === null ? '—' : priceText(map.currentPrice)}
          </span>
          <span className="w-[110px] shrink-0 text-[10px] uppercase tracking-wide text-ink-2">
            current price
          </span>
          <span className="num w-[76px] shrink-0 text-[11px] text-ink-3">
            {map.spreadPct === null ? '' : `${map.spreadPct.toFixed(2)}% sprd`}
          </span>
          <span className="truncate text-[10px] text-ink-3">
            {map.atPrice.length > 0
              ? `at ${map.atPrice.map((level) => levelTypeLabel(level.type)).join(' · ')}`
              : (map.betweenNote ?? '')}
          </span>
        </div>

        {map.below.map((zone) => (
          <ZoneRow key={zone.clusterId} zone={zone} side="BELOW" />
        ))}
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
    </Section>
  );
}
