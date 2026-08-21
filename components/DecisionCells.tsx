'use client';

/**
 * The cells the compact decision surface is built from.
 *
 * Both boards render these, so Discovery and the researched watchlist cannot
 * describe the same ticker differently — the defect the shared telemetry
 * projection already fixed for price, applied to the rest of the row.
 *
 * The surface is: Rank · Ticker · Price/Move/VWAP · RVOL · Why · Risk · Cycle,
 * plus a narrow change marker in the gutter. Levels are deliberately absent:
 * they live in the drawer's ladder, in full, rather than as a truncated list
 * competing with the fields that decide whether a trader opens the drawer at
 * all.
 */

import { ClampedText } from '@/components/ClampedText';
import { FocusToggle } from '@/components/FocusToggle';
import { StatusBadge, type Tone } from '@/components/StatusBadge';
import type { DeskRisk } from '@/lib/dashboard/risk';
import type { DeskWhy } from '@/lib/dashboard/why';
import type { MarketTelemetry } from '@/lib/dashboard/telemetry';
import type { BlueSkyState } from '@/lib/market/blueSky';
import { formatPrice, formatMultiple, formatSignedPercent } from '@/lib/format';

/* ------------------------------------------------------------------- price */

function signedMoney(value: number): string {
  const magnitude = Math.abs(value) >= 1 ? Math.abs(value).toFixed(2) : Math.abs(value).toFixed(3);
  return `${value >= 0 ? '+' : '−'}$${magnitude}`;
}

/**
 * Price, the move, and where price sits against the session average.
 *
 * VWAP distance is shown in dollars AND percent because traders use both: the
 * dollars are the risk per share, the percent is the size of the dislocation.
 * The session is always named — PM VWAP, RTH VWAP, AH VWAP — so the number can
 * never be read as belonging to a session it did not come from.
 *
 * A blue-sky marker replaces the VWAP line only when price has crossed a
 * verified, corporate-action-adjusted ceiling, and only when no higher-priority
 * state (a halt, a backside cycle) already owns the row's one saturated colour.
 */
export function PriceMoveCell({
  telemetry,
  blueSky,
  suppressBlueSky = false,
}: {
  telemetry: MarketTelemetry;
  blueSky: BlueSkyState;
  /** True when a halt or backside warning already owns the row's colour. */
  suppressBlueSky?: boolean;
}) {
  const change = telemetry.percentChange;
  const changeTone =
    telemetry.stale || change === null
      ? 'text-ink-2'
      : change > 0
        ? 'text-pos'
        : change < 0
          ? 'text-neg'
          : 'text-ink-2';

  const inBlueSky = blueSky.status === 'IN_BLUE_SKY' && blueSky.threshold.price !== null;

  return (
    <div className="flex flex-col gap-px leading-tight">
      <span className="flex items-baseline gap-1.5">
        <span
          className={`num text-[15px] font-bold ${telemetry.stale ? 'text-ink-2' : 'text-ink'}`}
        >
          {formatPrice(telemetry.price)}
        </span>
        <span className={`num text-[13px] font-semibold ${changeTone}`}>
          {formatSignedPercent(change)}
        </span>
        {telemetry.source === 'SHEET' && telemetry.sourceLabel !== '—' ? (
          <span className="text-[9px] tracking-wide text-ink-3 uppercase">
            {telemetry.sourceLabel}
          </span>
        ) : null}
      </span>

      {inBlueSky && !suppressBlueSky ? (
        // One line, like the VWAP line it replaces: a marker that wrapped made
        // every row in the board taller to accommodate the few that carry it.
        <span
          className="num truncate text-[11px] font-semibold whitespace-nowrap text-accent"
          title={blueSky.label}
        >
          BLUE SKY{' '}
          <span className="font-normal text-ink-3">
            · prior {formatPrice(blueSky.threshold.price)}
          </span>
        </span>
      ) : (
        <VwapLine telemetry={telemetry} />
      )}
    </div>
  );
}

function VwapLine({ telemetry }: { telemetry: MarketTelemetry }) {
  const { vwap, vwapDistance } = telemetry;

  if (!vwap || !vwapDistance) {
    return (
      <span className="num text-[11px] text-ink-3">
        {telemetry.source === 'ALPACA' ? 'VWAP unavailable' : ' '}
      </span>
    );
  }

  const above = vwapDistance.absolute >= 0;

  return (
    // One line. A wrapped VWAP line made the whole row taller for every ticker
    // whose distance happened to be wide, which is not a property of the stock.
    <span
      className="num truncate text-[11px] whitespace-nowrap"
      title={`${vwap.label} ${vwap.vwap?.toFixed(4)}${
        vwap.coverage === 'PARTIAL'
          ? ' — partial coverage: part of this session arrived as a reconstructed total with no per-minute notional behind it'
          : ''
      }`}
    >
      <span className="text-ink-3">{vwap.label}</span>{' '}
      <span className={above ? 'text-pos' : 'text-neg'}>
        {signedMoney(vwapDistance.absolute)} / {formatSignedPercent(vwapDistance.percent)}
      </span>
      {vwap.coverage === 'PARTIAL' ? (
        <span className="ml-1 text-[9px] tracking-wide text-warn uppercase">part</span>
      ) : null}
    </span>
  );
}

/* --------------------------------------------------------------------- why */

const WHY_TONE: Record<DeskWhy['tone'], string> = {
  pos: 'text-pos',
  warn: 'text-warn',
  neg: 'text-neg',
  dim: 'text-ink-3',
};

/**
 * Why the stock is moving: the grade, its age, and the headline.
 *
 * All three are visible in the row. The previous surface put the catalyst grade
 * in one column and its freshness nowhere, which meant a three-day-old B and a
 * twelve-minute-old B were indistinguishable at a glance.
 */
export function WhyCell({ why }: { why: DeskWhy }) {
  return (
    <div className="flex flex-col gap-px leading-tight">
      <span className="flex items-baseline gap-1.5">
        <span className={`num text-[13px] font-bold ${WHY_TONE[why.tone]}`}>{why.grade}</span>
        {why.age ? (
          <span className="num text-[11px] text-ink-2" title={why.eventAt ?? undefined}>
            {why.age}
          </span>
        ) : null}
        {why.explainsMove === false ? (
          <span className="text-[9px] font-semibold tracking-wide text-warn uppercase">
            not the move
          </span>
        ) : null}
        {why.code === 'NO_FRESH_CATALYST' ? (
          <span className="text-[9px] font-semibold tracking-wide text-warn uppercase">
            no fresh news
          </span>
        ) : null}
      </span>
      {why.headline ? (
        <ClampedText text={why.headline} className="text-[11px] text-ink-2" />
      ) : (
        <span className="text-[11px] text-ink-3">&nbsp;</span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- risk */

const RISK_TONE: Record<DeskRisk['tone'], string> = {
  neg: 'border-neg/50 text-neg',
  warn: 'border-warn/50 text-warn',
  pos: 'border-pos/45 text-pos',
  dim: 'border-line-2 text-ink-3',
};

/**
 * The structural risk, as a comparable chip plus one readable line.
 *
 * Deliberately a left border rather than a filled badge: with a chip on every
 * row, filled tints turned the board into a wall of amber where a genuine
 * dirty-float call carried no more weight than an unknown float.
 */
export function RiskCell({ risk }: { risk: DeskRisk }) {
  return (
    <div className={`flex flex-col gap-px border-l-2 pl-2 leading-tight ${RISK_TONE[risk.tone]}`}>
      <span className="flex items-baseline gap-1.5">
        <span className="text-[11px] font-semibold tracking-wide uppercase">{risk.label}</span>
        {risk.value ? <span className="num text-[11px] text-ink-2">{risk.value}</span> : null}
      </span>
      {risk.detail ? (
        <ClampedText text={risk.detail} className="text-[11px] text-ink-2" />
      ) : (
        <span className="text-[11px]">&nbsp;</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- rvol */

export function RvolCell({ telemetry }: { telemetry: MarketTelemetry }) {
  if (telemetry.rvol === null) return <span className="num text-[13px] text-ink-3">—</span>;

  return (
    <span className="num inline-flex items-baseline gap-1">
      <span
        className={`text-[13px] font-semibold ${
          telemetry.rvolConfidence === 'LOW' ? 'text-warn' : 'text-ink'
        }`}
      >
        {formatMultiple(telemetry.rvol)}
      </span>
      {telemetry.rvolConfidence === 'LOW' ? (
        <span className="text-[9px] font-semibold text-warn uppercase">low</span>
      ) : null}
    </span>
  );
}

/* ----------------------------------------------------------------- ticker */

/**
 * Ticker identity, frozen to the left of both boards.
 *
 * Scrolling the old table sideways to reach the risk column took the ticker
 * with it, so the trader ended up reading fifteen unlabelled values with no way
 * to tell whose they were.
 */
export function TickerCell({
  ticker,
  focused,
  onToggleFocus,
  stale,
  ageSeconds,
  retention,
}: {
  ticker: string;
  focused: boolean;
  onToggleFocus: (ticker: string) => void;
  stale?: boolean;
  ageSeconds?: number | null;
  retention?: string | null;
}) {
  return (
    <span className="flex items-center gap-1">
      <FocusToggle ticker={ticker} focused={focused} onToggle={onToggleFocus} />
      <span className="text-[15px] font-bold tracking-tight text-ink">{ticker}</span>
      {retention ? (
        <span className="text-[9px] font-semibold tracking-wide whitespace-nowrap text-accent uppercase">
          {retention}
        </span>
      ) : null}
      {stale ? (
        <span
          className="text-[9px] font-semibold tracking-wide text-warn uppercase"
          title={`No market event for ${ageSeconds ?? '—'}s — this is the last live print, not a current one`}
        >
          stale
        </span>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------------ change */

/**
 * The change marker: a narrow gutter, not a prose column.
 *
 * It says only that this row changed on the last poll. What changed belongs to
 * the desk-event history, which is Phase 2's surface; putting a sentence here
 * would rebuild the wide column this redesign removed.
 */
export function ChangeMarker({ changed }: { changed: boolean }) {
  if (!changed) return <span aria-hidden="true">&nbsp;</span>;
  return (
    <span
      className="num text-[11px] font-bold text-accent"
      title="This row changed on the most recent update"
    >
      Δ<span className="sr-only">changed</span>
    </span>
  );
}

/* ------------------------------------------------------------------- halt */

export function HaltBadge({ state, raw }: { state: string; raw: string | null }) {
  if (state === 'HALTED') return <StatusBadge label="Halted" tone="neg" title={raw ?? 'Halted'} />;
  if (state === 'RESUMING') {
    return <StatusBadge label="Resuming" tone={'warn' as Tone} title={raw ?? 'Resuming'} />;
  }
  return null;
}
