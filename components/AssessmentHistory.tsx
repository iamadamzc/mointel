'use client';

import { useEffect, useState } from 'react';

import { StatusBadge } from '@/components/StatusBadge';
import type { AssessmentTickerRecord } from '@/lib/market/store/assessmentRepo';
import type { AssessmentPanel, AssessmentSummary } from '@/lib/desk/view';
import { formatCount, formatMultiple, formatPrice, formatSignedPercent } from '@/lib/format';

interface AssessmentHistoryProps {
  panel: AssessmentPanel;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

/**
 * The assessment selector.
 *
 * LIVE is the default and stays the default. The point of the history is to be
 * able to ask whether the desk improved or deteriorated between checkpoints,
 * not to become a second place to watch the market from.
 */
export function AssessmentSelector({ panel, selectedId, onSelect }: AssessmentHistoryProps) {
  const options = panel.today;

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="assessment-select"
        className="text-[10px] font-semibold tracking-[0.1em] text-ink-3 uppercase"
      >
        View
      </label>
      <select
        id="assessment-select"
        value={selectedId === null ? 'LIVE' : String(selectedId)}
        onChange={(event) =>
          onSelect(event.target.value === 'LIVE' ? null : Number(event.target.value))
        }
        className="rounded-sm border border-line-2 bg-panel-2 px-2 py-1 text-[11px] font-semibold tracking-wide text-ink-2 uppercase"
      >
        <option value="LIVE">Live</option>
        {options.length > 0 ? (
          <option value={String(options[options.length - 1].id)}>
            Last assessment · {options[options.length - 1].clock}
          </option>
        ) : null}
        {options
          .slice()
          .reverse()
          .map((option) => (
            <option key={option.id} value={String(option.id)}>
              {option.clock} · {option.label}
              {option.generatedLate ? ' (late)' : ''}
            </option>
          ))}
      </select>
      {options.length === 0 ? (
        <span className="text-[10px] text-ink-3">no checkpoints recorded yet today</span>
      ) : null}
    </div>
  );
}

interface SnapshotResponse {
  assessment: AssessmentSummary | null;
  tickers: AssessmentTickerRecord[];
  snapshot: true;
}

/**
 * A frozen assessment, rendered from the stored snapshot alone.
 *
 * No live telemetry is merged in — not price, not rank, not freshness. A
 * historical view showing current prices beside 10:30's ranks would look like
 * a record and behave like a lie, so this deliberately renders only what was
 * written at capture time and says so at the top.
 */
export function AssessmentSnapshotBoard({ id }: { id: number }) {
  const [data, setData] = useState<SnapshotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mounted under `key={id}` by the shell, so switching checkpoints remounts
  // rather than clearing state inside the effect. That also guarantees one
  // snapshot's rows can never render under another snapshot's header.
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/assessments?id=${id}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as SnapshotResponse;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <section className="border-b border-line bg-desk px-4 py-3">
        <p className="text-[12px] text-neg">Assessment unavailable: {error}</p>
      </section>
    );
  }

  if (!data?.assessment) {
    return (
      <section className="border-b border-line bg-desk px-4 py-3">
        <p className="text-[12px] text-ink-3">Loading assessment…</p>
      </section>
    );
  }

  const assessment = data.assessment;
  const afterHours = assessment.board === 'AFTER_HOURS';

  return (
    <section className="border-b border-line bg-desk px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
          {assessment.label} · {assessment.clock} ET
        </h2>
        {/* The most important label on this view. */}
        <StatusBadge
          label="Snapshot — not live"
          tone="warn"
          title={`Recorded at ${assessment.completedAt ?? assessment.scheduledFor}. Nothing on this view updates.`}
        />
        {assessment.generatedLate ? (
          <StatusBadge
            label="Generated late"
            tone="warn"
            title="The desk was not running at the scheduled time. This records the state when it actually ran."
          />
        ) : null}
        {assessment.experimental ? (
          <StatusBadge
            label="Experimental"
            tone="warn"
            title="This assessment's ordering is explicitly unvalidated. Its components are persisted so they can be tested later."
          />
        ) : null}
        <span className="text-[10px] text-ink-3">
          {assessment.tickerCount} names · ranked on {assessment.rankingDefinition} ·{' '}
          {assessment.tradingDate}
          {assessment.targetTradingDate ? ` → ${assessment.targetTradingDate}` : ''}
        </span>
      </div>

      {assessment.notes ? (
        <p className="mb-2 rounded-sm border border-line-2 bg-panel px-3 py-2 text-[11px] text-ink-2">
          {assessment.notes}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-sm border border-line-2">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-panel-2">
              <Th>Rank</Th>
              <Th>Ticker</Th>
              <Th align="right">Price</Th>
              <Th align="right">{afterHours ? 'AH %' : '%'}</Th>
              <Th align="right">{afterHours ? 'AH Particip.' : 'Daily RVOL'}</Th>
              <Th align="right">{afterHours ? 'AH Volume' : 'Volume'}</Th>
              <Th align="right">Spread</Th>
              <Th>Cycle</Th>
              <Th>Catalyst</Th>
              <Th>Structure</Th>
              <Th>Halt</Th>
              <Th>Changed since previous</Th>
            </tr>
          </thead>
          <tbody>
            {data.tickers.map((row) => (
              <tr key={row.ticker} className="border-b border-line/70 bg-panel/40">
                <td className="num px-2 py-1.5 font-semibold text-accent">
                  {row.assessmentRank ?? '—'}
                </td>
                <td className="px-2 py-1.5">
                  <span className="text-[13px] font-bold text-ink">{row.ticker}</span>
                  {row.focus ? (
                    <span className="ml-1 text-[9px] font-semibold text-accent uppercase">
                      focus
                    </span>
                  ) : null}
                </td>
                <td className="num px-2 py-1.5 text-right text-ink">{formatPrice(row.price)}</td>
                <td className="num px-2 py-1.5 text-right text-ink-2">
                  {formatSignedPercent(afterHours ? row.ahPercentChange : row.percentChange)}
                </td>
                <td className="num px-2 py-1.5 text-right text-ink-2">
                  {formatMultiple(afterHours ? row.ahParticipation : row.rvol)}
                </td>
                <td className="num px-2 py-1.5 text-right text-ink-2">
                  {formatCount(afterHours ? row.ahVolume : row.volume)}
                </td>
                <td className="num px-2 py-1.5 text-right text-ink-2">
                  {row.spreadPct !== null ? `${row.spreadPct.toFixed(2)}%` : '—'}
                </td>
                <td className="px-2 py-1.5 text-[11px] text-ink-2">{row.cycle ?? '—'}</td>
                <td className="px-2 py-1.5 text-[11px] text-ink-2">{row.catalyst ?? '—'}</td>
                <td className="px-2 py-1.5 text-[11px] text-ink-2">{row.structure ?? '—'}</td>
                <td className="px-2 py-1.5 text-[11px] text-ink-2">{row.haltState ?? '—'}</td>
                <td className="px-2 py-1.5 text-[11px] text-ink-3" title={row.changeSummary}>
                  {row.changedFields.length > 0 ? row.changedFields.join(', ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: 'right';
}) {
  return (
    <th
      scope="col"
      className={`border-b border-line-2 px-2 py-1.5 text-[10px] font-semibold tracking-[0.08em] whitespace-nowrap text-ink-3 uppercase ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}
