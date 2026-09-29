'use client';

import { useState } from 'react';

import { rowKeyboardProps } from '@/components/tableKeyboard';
import type { DeskRow } from '@/lib/dashboard/merge';
import {
  DEATH_CHURN_THRESHOLD,
  graveyardRows,
  graveyardSummary,
  type GraveyardEntry,
} from '@/lib/dashboard/graveyard';
import { formatCount } from '@/lib/format';

interface GraveyardProps {
  rows: DeskRow[];
  onSelect: (ticker: string) => void;
  /**
   * The board was re-ranked inside the viewer's price range, so the server
   * omitted every stored ordinal (`DiscoveryState.ordinalsOmitted`). `Rank held`
   * is a rank in the engine's band, not in his, so the column goes rather than
   * printing a dash on every row: a column of dashes reads "rank unknown", and
   * the rank is known, it just belongs to a list he is not looking at.
   */
  ranksOmitted: boolean;
}

/**
 * Names the board dropped, and whether dropping them was right.
 *
 * A name dead for five consecutive minutes leaves the active board. Before
 * this, unranked meant invisible — a dropped name simply vanished and could not
 * be told from one that was never there, which is the inverse of what this
 * product is for.
 *
 * **This section is the drop rule's own falsification surface**, and that is the
 * reason it is built the way it is:
 *
 * - A revived name does NOT silently leave. It stays for the session, marked,
 *   so the graveyard's own composition is the evidence.
 * - The header carries the counts, so the rule can be judged without the
 *   section ever being opened. If most rows have died more than once, the
 *   threshold is wrong and it is visible at a glance.
 *
 * Deliberately not the Changes rail: the rail is for events — things that
 * happened — and this is a population — things that are.
 */
export function Graveyard({ rows, onSelect, ranksOmitted }: GraveyardProps) {
  const [open, setOpen] = useState(false);

  const entries = graveyardRows(rows);
  const summary = graveyardSummary(rows);

  return (
    <section className="border-b border-line bg-desk px-4 py-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-x-3 text-left"
      >
        <span aria-hidden className="text-[11px] text-ink-3">
          {open ? '▾' : '▸'}
        </span>
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
          Graveyard
        </h2>

        {/*
         * The counts are the falsification signal, so they sit in the header
         * where they are read without opening anything.
         *
         * `died 2+` is the CHURN signal — a name killed and revived repeatedly
         * says the dead threshold or the settle window is too tight. It is
         * deliberately separate from a plain "revived" tally, which would read
         * as a much higher miss rate than the real one: most revivals are a
         * twitch, not a run, and a name that comes back at +2% was correctly
         * dropped.
         */}
        {summary.wired ? (
          <span className="num text-[11px] text-ink-3">
            {summary.dead} dead
            {summary.revived > 0 ? ` · ${summary.revived} revived` : ''}
            {summary.churned > 0 ? (
              <span className="text-warn"> · {summary.churned} died {DEATH_CHURN_THRESHOLD}+</span>
            ) : null}
            {/*
             * The MISS signal, and the loudest thing in the header when it is
             * non-zero. Churn says the threshold is too tight and is irritating;
             * a dropped name running again says the drop cost a trade. Worded
             * "running" rather than "missed" because dead_at_price is
             * overwritten at each death, so this is the CURRENT revival rather
             * than a tally of every revival that ran.
             */}
            {summary.ran > 0 ? (
              <span className="text-neg"> · {summary.ran} running</span>
            ) : null}
            {/*
             * Withheld, not hidden. Most names the engine marks DEAD were never
             * alive — on the first live reading, 60 of 71 had a busiest minute
             * below the dead line, so they did not go quiet, they were always
             * quiet. Filtering them is a surface judgement; concealing that the
             * filter ran would not be, and this count moves if the engine's
             * determination changes.
             */}
            {summary.neverActive > 0 ? (
              <span> · {summary.neverActive} never active</span>
            ) : null}
          </span>
        ) : (
          /*
           * NOT an empty graveyard — an unasked question.
           *
           * The engine populates `activity` live, but the store has no column
           * for it yet, so a round-tripped row arrives without it. Until that
           * migration lands every row is `undefined` and none may be shown.
           * Saying "no names have gone quiet" here would report a measurement
           * that was never taken, and would be indistinguishable from a broken
           * query while this is being built.
           */
          <span className="text-[11px] text-ink-3">not recording yet</span>
        )}
      </button>

      {open && summary.wired ? (
        /*
         * The measurement limit, stated where it is visible.
         *
         * A dead minute produces no bar, so a name that goes quiet and returns
         * inside one minute is never seen to have died at all. Every count here
         * is therefore a FLOOR — the real revival rate is higher than shown.
         *
         * Not in the header, whose number has to stay glanceable, and not in a
         * hover: §10 rules out content reachable only that way, and a caveat
         * that qualifies a falsification count is exactly the content that must
         * not hide. Opening the section is what asks the question, so this is
         * where the answer belongs.
         */
        <p className="mt-1.5 text-[11px] text-ink-3">
          Counts are a floor. A name that goes quiet and returns inside one minute leaves no gap to
          detect, so revivals are undercounted rather than over.
        </p>
      ) : null}

      {open ? (
        summary.wired && entries.length > 0 ? (
          <GraveyardTable entries={entries} onSelect={onSelect} ranksOmitted={ranksOmitted} />
        ) : (
          <p className="mt-1.5 rounded-sm border border-dashed border-line-2 bg-panel px-3 py-3 text-[12px] text-ink-2">
            {summary.wired
              ? 'No name has gone quiet long enough to leave the board this session.'
              : 'Activity is not being recorded yet, so nothing can be listed here. This is not an empty graveyard. The measurement is not reaching this surface.'}
          </p>
        )
      ) : null}
    </section>
  );
}

/**
 * Exported so a test can render it: the section above only mounts the table
 * once opened, which a static render cannot do. The header and every row read
 * one `ranksOmitted`, so a column cannot go from one and stay in the other.
 */
export function GraveyardTable({
  entries,
  onSelect,
  ranksOmitted,
}: {
  entries: GraveyardEntry[];
  onSelect: (ticker: string) => void;
  ranksOmitted: boolean;
}) {
  return (
    <table className="mt-1.5 w-full table-fixed border-collapse border-t border-line">
      <caption className="sr-only">
        Names dropped from the active board, most recently dead first. Rows that have revived
        stay listed and are marked.
      </caption>
      <thead>
        <tr>
          <Th className="w-[96px]">Ticker</Th>
          <Th className="w-[92px]" align="right">
            Dead for
          </Th>
          {ranksOmitted ? null : (
            <Th className="w-[80px]" align="right">
              Rank held
            </Th>
          )}
          <Th className="w-[104px]" align="right">
            Peak trades
          </Th>
          <Th>State</Th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <GraveyardRow
            key={entry.ticker}
            entry={entry}
            onSelect={onSelect}
            ranksOmitted={ranksOmitted}
          />
        ))}
      </tbody>
    </table>
  );
}

function GraveyardRow({
  entry,
  onSelect,
  ranksOmitted,
}: {
  entry: GraveyardEntry;
  onSelect: (ticker: string) => void;
  ranksOmitted: boolean;
}) {
  const heldRank = ranksOmitted ? '' : `, held rank ${entry.deadAtRank ?? 'unknown'}`;
  return (
    <tr
      {...rowKeyboardProps(
        `${entry.ticker}, dead ${entry.deadForLabel}${heldRank}. Open dossier.`,
        () => onSelect(entry.ticker),
      )}
      onClick={() => onSelect(entry.ticker)}
      className="cursor-pointer border-b border-line/70 bg-panel/40 transition-colors hover:bg-panel-2"
    >
      <td className="px-2 py-1 align-middle">
        <span className="num text-[13px] font-semibold text-ink">{entry.ticker}</span>
      </td>

      {/*
       * Measured from `deadSince`, never from detection. The rule decides at six
       * minutes for a five-minute death, so a row appears already reading "6m"
       * and never "0m". That looks like an off-by-one and is not — the minute is
       * real, and hiding it would make the surface claim a promptness it does
       * not have.
       */}
      <td className="num px-2 py-1 text-right align-middle text-[12px] text-ink-2">
        {entry.deadForLabel}
      </td>

      {/*
       * How high it got — NOT where it comes back. Its RVOL numerator is frozen
       * while living names keep accumulating, so a dead name's rank decays and
       * it re-enters lower the longer it lay here.
       */}
      {ranksOmitted ? null : (
        <td className="num px-2 py-1 text-right align-middle text-[12px] text-ink-2">
          {entry.deadAtRank ?? '—'}
        </td>
      )}

      <td className="num px-2 py-1 text-right align-middle text-[12px] text-ink-2">
        {entry.deadAtPeakTrades !== null ? `${formatCount(entry.deadAtPeakTrades)}/min` : '—'}
      </td>

      <td className="px-2 py-1 align-middle">
        <span className="flex flex-wrap items-center gap-1.5">
          {entry.revived ? (
            <span className="text-[11px] font-semibold tracking-wide text-accent uppercase">
              revived
            </span>
          ) : null}
          {entry.ran ? (
            <span
              className="num text-[11px] font-semibold text-neg"
              title="Running again since the drop, measured from the price captured at its latest death. The drop looks like a miss rather than churn."
            >
              running {entry.moveSinceDeathPct !== null ? `+${entry.moveSinceDeathPct.toFixed(0)}%` : ''}
            </span>
          ) : null}
          {entry.deathCount >= DEATH_CHURN_THRESHOLD ? (
            <span
              className="num text-[11px] font-semibold text-warn"
              title="Deaths this session, kept across revivals. A name dying repeatedly is direct evidence the drop threshold is too tight."
            >
              died {entry.deathCount}×
            </span>
          ) : null}
        </span>
      </td>
    </tr>
  );
}

function Th({
  children,
  className,
  align,
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'right';
}) {
  return (
    <th
      scope="col"
      className={`${className ?? ''} px-2 py-1 text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}
