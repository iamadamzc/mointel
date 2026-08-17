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

import type { LevelMap, LevelZone } from '@/lib/data/priceLevels';
import { levelTypeLabel, toCompactRow } from '@/lib/data/priceLevels';

function priceText(value: number): string {
  return value < 1 ? value.toFixed(3) : value.toFixed(2);
}

/* ------------------------------------------------------------ compact cell */

/**
 * Board cell: nearest levels either side of price.
 *
 * Distances are signed relative to current price so direction is readable
 * without tracing which row it sits on.
 */
export function CompactLevels({ map }: { map: LevelMap }) {
  const row = toCompactRow(map, 2);

  if (row.empty) {
    return <span className="text-[10px] uppercase tracking-wide text-ink-3">No key levels</span>;
  }

  return (
    <div className="flex flex-col gap-[1px] leading-tight">
      <div className="flex items-baseline gap-1">
        <span className="w-[26px] shrink-0 text-[9px] uppercase tracking-wider text-ink-3">up</span>
        {row.nextUp.length === 0 ? (
          <span className="text-[10px] text-ink-3">open</span>
        ) : (
          <span className="num truncate text-[10px] text-ink-2">
            {row.nextUp.map((level, index) => (
              <span key={index}>
                {index > 0 ? <span className="text-ink-3"> · </span> : null}
                <span className="text-ink-1">{level.price}</span>{' '}
                <span className="text-ink-3">{level.type}</span>
                {level.stateLabel ? (
                  <span className="text-warn"> {level.stateLabel}</span>
                ) : null}{' '}
                <span className="text-pos">{level.distance}</span>
              </span>
            ))}
          </span>
        )}
      </div>

      {/* Current price is the anchor, so it is the only emphasised line. */}
      <div className="flex items-baseline gap-1">
        <span className="w-[26px] shrink-0 text-[9px] uppercase tracking-wider text-ink-3">now</span>
        <span className="num text-[11px] font-semibold text-ink">{row.now ?? '—'}</span>
        {row.spreadPct ? (
          <span className="num text-[9px] text-ink-3" title="Level 1 NBBO spread">
            {row.spreadPct}
          </span>
        ) : null}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="w-[26px] shrink-0 text-[9px] uppercase tracking-wider text-ink-3">dn</span>
        {row.nextDown.length === 0 ? (
          <span className="text-[10px] text-ink-3">open</span>
        ) : (
          <span className="num truncate text-[10px] text-ink-2">
            {row.nextDown.map((level, index) => (
              <span key={index}>
                {index > 0 ? <span className="text-ink-3"> · </span> : null}
                <span className="text-ink-1">{level.price}</span>{' '}
                <span className="text-ink-3">{level.type}</span>
                {level.stateLabel ? (
                  <span className="text-warn"> {level.stateLabel}</span>
                ) : null}{' '}
                <span className="text-warn">{level.distance}</span>
              </span>
            ))}
          </span>
        )}
      </div>
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
