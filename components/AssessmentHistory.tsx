'use client';

import { useEffect, useState } from 'react';

import { StatusBadge } from '@/components/StatusBadge';
import { changeReading } from '@/lib/dashboard/changes';
import { snapshotLabel } from '@/lib/dashboard/language';
import type { AssessmentTickerRecord } from '@/lib/market/store/assessmentRepo';
import { selectorOptions } from '@/lib/dashboard/offHours';
import type { AssessmentPanel, AssessmentSummary } from '@/lib/desk/view';
import { formatCount, formatMultiple, formatPrice, formatSignedPercent } from '@/lib/format';
import { useDeskMode } from '@/lib/hooks/useDeskMode';

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
  const options = selectorOptions(panel);

  /*
   * A control with one option is not a control.
   *
   * Before the day's first checkpoint the select contained only "Live", and it
   * still occupied a full-width row of the board's vertical space to say "no
   * checkpoints recorded yet today" — which the header's next-checkpoint line
   * already says, better.
   */
  if (options.length === 0) return null;

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
  const { apiBase } = useDeskMode();
  const [data, setData] = useState<SnapshotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mounted under `key={id}` by the shell, so switching checkpoints remounts
  // rather than clearing state inside the effect. That also guarantees one
  // snapshot's rows can never render under another snapshot's header.
  useEffect(() => {
    let cancelled = false;

    fetch(`${apiBase}/assessments?id=${id}`)
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
  }, [apiBase, id]);

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
          label="Snapshot · not live"
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
                  {/*
                    * THE `focus` BADGE WAS REMOVED HERE, AND IT SHOULD NOT COME
                    * BACK ON THE STRENGTH OF THE COLUMN STILL EXISTING.
                    *
                    * It meant *he pinned this, AND it therefore received
                    * research it would not otherwise have had* — a pin used to
                    * admit a ticker past the rank gate. Pins are cosmetic from
                    * `dd3bca0`, so the server can never set it true again.
                    *
                    * **The problem is not that it dies, it is that its meaning
                    * drifts.** A reader months from now seeing `focus` on a
                    * September row reads it as a display preference — which is
                    * what pins are now — and misses that it was a research
                    * lever. Keeping it would preserve a TOKEN, not a fact.
                    *
                    * That is the mirror of a field whose source is removed: one
                    * goes FALSE FORWARDS, this one goes MISREAD BACKWARDS — and
                    * only the first is visible in new data, which is what makes
                    * this the harder one to notice.
                    *
                    * **Nothing is lost.** The column is orphaned and labelled
                    * rather than dropped, so the record survives in the store,
                    * dated — off a surface read at speed. One pin was ever made
                    * (ANPA, 2026-09-04).
                    */}
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
                {/*
                  * FOUR MORE COLUMNS OF THE DEFECT THE `CHANGED` CELL HAD.
                  *
                  * `RED_BACKSIDE`, `MODERATE_MIXED_SECONDARY`, `DIRTY_FLOAT`
                  * and `TRADING` rendered verbatim here -- seen on the live
                  * board 2026-09-22, one column over from the enums I had just
                  * replaced with a sentence. Same table, same §10 criterion,
                  * and I only found them by looking at the screen.
                  *
                  * `snapshotLabel` asks the CANONICAL map first rather than
                  * lower-casing: these are the same values the drawer renders,
                  * and a second vocabulary for one value is the defect that put
                  * two different cycle words on two tables for one ticker.
                  */}
                <td className="px-2 py-1.5 text-[11px] text-ink-2">
                  {snapshotLabel('cycle', row.cycle)}
                </td>
                <td className="px-2 py-1.5 text-[11px] text-ink-2">
                  {snapshotLabel('catalyst', row.catalyst)}
                </td>
                <td className="px-2 py-1.5 text-[11px] text-ink-2">
                  {snapshotLabel('structure', row.structure)}
                </td>
                <td className="px-2 py-1.5 text-[11px] text-ink-2">
                  {snapshotLabel('halt', row.haltState)}
                </td>
                {/*
                  * THE SENTENCE IS THE CELL; THE ENUMS ARE NOT A FALLBACK.
                  *
                  * This cell rendered `changedFields.join(', ')` as its text
                  * with the checkpoint's own wording hidden in the `title` --
                  * `RANK_DETERIORATED, MAJOR_GIVEBACK` on screen and "rank #4
                  * -> #9; -14.2% off session high" one hover away. It breaks
                  * two acceptance criteria at once (no SCREAMING_SNAKE in the
                  * trader-facing UI, no content reachable only by hover), and
                  * the sentence it needed had been computed and stored beside
                  * the enums the whole time.
                  *
                  * `changeReading` decides the words, including for the rows
                  * whose summary is empty because the detector pushed a class
                  * without a note. Those rows are in the store permanently and
                  * no change to the writer reaches them.
                  */}
                <td className="px-2 py-1.5 text-[11px] text-ink-2">
                  {changeReading(row)?.sentence ?? '—'}
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
