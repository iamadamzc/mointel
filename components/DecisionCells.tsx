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
import { SetupGradeBadge } from '@/components/SetupGradeBadge';
import { StatusBadge, type Tone } from '@/components/StatusBadge';
import type { DeskRisk } from '@/lib/dashboard/risk';
import type { SetupGrade } from '@/lib/dashboard/setupGrade';
import type { DeskWhy } from '@/lib/dashboard/why';
import type { MarketTelemetry } from '@/lib/dashboard/telemetry';
import { baselineLabel } from '@/lib/dashboard/view';
import type { SessionPhase } from '@/lib/market/types';
import type { BlueSkyState } from '@/lib/market/blueSky';
import {
  formatEtMinute,
  formatPrice,
  formatMultiple,
  formatSignedPercent,
  quietFor,
} from '@/lib/format';

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
  phase = null,
  lead = 'GAP',
  sorted = false,
}: {
  telemetry: MarketTelemetry;
  blueSky: BlueSkyState;
  /** True when a halt or backside warning already owns the row's colour. */
  suppressBlueSky?: boolean;
  /** Names the baseline. The cell must never derive a session word itself. */
  phase?: SessionPhase | null;
  /**
   * Which figure the headline carries, decided by the ACTIVE SORT.
   *
   * His ruling, 2026-09-22: the percentage should be the one the board is
   * ordered by. Sorting by Move and reading a Gap was not merely inconsistent
   * -- on the live board QNME's headline read +50.1% while its premarket move
   * was -5.9%, and HUBC's read -19.7% against +0.2%. OPPOSITE SIGNS on the
   * number a trader scans first.
   */
  lead?: 'GAP' | 'MOVE';
  /**
   * True when the board is ordered by the figure this cell leads with.
   *
   * The LABEL takes the accent, never the percentage. The percentage's colour
   * already carries DIRECTION — green up, red down — and overloading it with
   * "this is the sort" would put two meanings on one colour, which is the
   * defect this board keeps producing. The label carries nothing else, so it
   * is free to say which column the order came from.
   */
  sorted?: boolean;
}) {
  const change = telemetry.percentChange;
  const gap = baselineLabel(phase);
  const move = telemetry.sessionMove;

  /*
   * MOVE LEADS ONLY WHEN THERE IS A MOVE TO LEAD WITH.
   *
   * `NO_PRINT`, `NOT_STARTED` and `UNKNOWN` have no percentage, and a headline
   * reading "—" is worse than one reading the Gap. The row falls back rather
   * than blanking, and it stays honest because THE LABEL TRAVELS WITH THE
   * NUMBER: a fallback row says PM GAP beside its figure, so a reader is never
   * working out which quantity they are looking at from the sort control.
   */
  const leadsMove = lead === 'MOVE' && move?.state === 'OPEN' && move.move !== null;
  const value = leadsMove ? move!.move : change;
  const label = leadsMove ? move!.label : gap.label;
  const title = leadsMove ? MOVE_HEADLINE_TITLE : gap.title;

  const changeTone =
    telemetry.stale || value === null
      ? 'text-ink-2'
      : value > 0
        ? 'text-pos'
        : value < 0
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
        {/*
          * THE LABEL IS NOT OPTIONAL, AND IT IS WHAT MAKES THE SWAP SAFE.
          *
          * A headline whose meaning changes with a toggle is the class of
          * defect this desk keeps paying for -- so the quantity is named on
          * the line rather than inferred from which sort chip is lit.
          * Measured at the 1,024px floor in the real font: the widest
          * realistic case, `10.49 RTH MOVE -123.4%`, is 160px in a 172px cell.
          */}
        <span
          className={`text-[10px] tracking-wide uppercase ${
            sorted ? 'font-semibold text-accent' : 'text-ink-3'
          }`}
          title={title}
        >
          {label}
        </span>
        <span className={`num text-[13px] font-semibold ${changeTone}`} title={title}>
          {formatSignedPercent(value)}
        </span>
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

      {/*
        * THIRD LINE, AND IT SITS WITH THE VWAP RATHER THAN ABOVE IT.
        *
        * Line 1 is the ACROSS-session figure; these two are both WITHIN this
        * session. Grouping them by baseline family means the row reads "this is
        * what carried in, and these two are what has happened since" -- putting
        * the move between price and VWAP would split the family and imply the
        * three are independent readings of one thing.
        */}
      {/*
        * THE DEMOTED FIGURE, NEVER A DROPPED ONE.
        *
        * Whichever number the headline did not take renders here with its own
        * label. Promoting one by DISCARDING the other would answer his
        * complaint by creating its mirror.
        */}
      {leadsMove ? <GapLine telemetry={telemetry} phase={phase} /> : <SessionMoveLine telemetry={telemetry} />}
    </div>
  );
}

/** What the headline means when the MOVE is leading it. */
const MOVE_HEADLINE_TITLE =
  'Change within the current session, from its own opening print. The board is sorted by this, so it is the figure shown.';

/**
 * The gap, demoted to the sub-line because the move is leading.
 *
 * Deliberately NOT a copy of `SessionMoveLine`'s shape: the gap has no anchor
 * to be thin and no `not traded` state -- it is a close-to-price comparison and
 * is either available or null. Giving it the move's states would invent
 * conditions it cannot be in.
 */
function GapLine({
  telemetry,
  phase,
}: {
  telemetry: MarketTelemetry;
  phase: SessionPhase | null;
}) {
  const change = telemetry.percentChange;
  if (change === null) return null;

  const { label, title } = baselineLabel(phase);
  return (
    <span className="num truncate text-[11px] whitespace-nowrap" title={title}>
      <span className="text-ink-3">{label}</span>{' '}
      <span className={change >= 0 ? 'text-pos' : 'text-neg'}>{formatSignedPercent(change)}</span>
    </span>
  );
}

/**
 * The move within this session, from its own opening print.
 *
 * THE ANCHOR'S TRUSTWORTHINESS IS ON THE LINE; THE COUNT IS IN THE TITLE.
 * Measured at his 1,024px floor in the real font, the line has 156px and
 * `RTH Move +123.4%` uses 103.8 of it -- but appending the count
 * (`· 3 prints`) needs 168.8 and is 12.8px over. A compact marker fits with
 * room to spare. So the number goes where a reader who wants it can get it,
 * and the line carries whether the anchor can be trusted at all.
 *
 * THREE STATES, AND `UNKNOWN` IS NOT SILENCE. A solid anchor shows no marker.
 * A thin one shows `thin`. An unreported count shows `?` -- because silence is
 * exactly what a SOLID anchor looks like, and collapsing the two would say
 * "measured, and fine" about a minute nobody counted. Same rule as NULL meaning
 * NOT MEASURED on the activity window, one column over.
 */
function SessionMoveLine({ telemetry }: { telemetry: MarketTelemetry }) {
  const reading = telemetry.sessionMove;
  if (!reading) return null;

  /*
   * FOUR STATES IN, TWO LINES OUT, AND THE SPLIT IS THE POINT.
   *
   *   OPEN         a number, with its anchor's trustworthiness beside it
   *   NO_PRINT     "not traded" -- a MEASUREMENT, and the one he asked for:
   *                a large Gap over this says the move is already over
   *   NOT_STARTED  nothing. The session has not begun; there is nothing to say
   *   UNKNOWN      nothing. The STORE cannot tell NOT_STARTED from NO_PRINT
   *
   * `UNKNOWN` AND `NO_PRINT` TAKE DIFFERENT BRANCHES ON PURPOSE. Rendering
   * UNKNOWN as "not traded" would assert a market fact from a storage gap --
   * the same error as the one this whole reading exists to fix, pointed the
   * other way.
   *
   * THIS COMMENT USED TO SAY THE BOARD COULD NOT RECEIVE `NO_PRINT` YET, AND
   * THAT DAY HAS HAPPENED. Schema 27 landed the three state columns and
   * `repo.ts:504` reads them (`state ?? 'UNKNOWN'`), so the branch below is
   * LIVE. The old sentence ended "this code starts telling the truth that day
   * with no further change" -- which was right, and left behind the one line a
   * reader would trust before touching this branch, still saying it is dormant.
   *
   * AND THE LIVE BRANCH CAN NOW ASSERT SOMETHING FALSE. Three conditions, all
   * required:
   *
   *     a mid-session restart happened
   *     AND this name traded in the CURRENT session BEFORE it
   *     AND it has gone quiet since
   *
   * Then the fresh runtime has no anchor, the live stream does not re-deliver
   * pre-restart bars, the engine computes `NO_PRINT` CORRECTLY from what it can
   * see -- and this line states that a name did not trade in a session it
   * traded in. A market claim from a process fact, which is the defect this
   * whole reading exists to remove, arriving through the branch that removes it.
   *
   * NEITHER SIDE IS WRONG, WHICH IS WHY IT SHIPPED: the engine's `state` is
   * correct about what it can see, and this branch is correct about what
   * `NO_PRINT` means. The COMPOSITION is the defect, and a composition defect is
   * invisible from inside either half.
   *
   * The population is "spiked early, then died" -- a name that runs at 04:30 and
   * stops keeps the rank its morning earned, so it stays ON the board all day.
   * That is the shape most likely to meet all three at once, and one he watches
   * deliberately. A name still printing after a restart gets an anchor from its
   * next bar: a wrong percentage, not a false sentence.
   *
   * CLOSED UPSTREAM, AND IT COST NOTHING. `engine.ts:1151` now asks
   * `anchorObservable` -- were we watching at this session's open, OR was this
   * symbol replayed by the bootstrap -- per symbol, per session. When the answer
   * is no, an observed `NO_PRINT` is emitted as `UNKNOWN` instead.
   *
   * WHICH IS NOT A WORKAROUND: `UNKNOWN` means THE PRODUCER COULD NOT TELL, and
   * after a restart it genuinely cannot separate "did not trade" from "we were
   * not watching". So the false sentence is unreachable, this branch is right as
   * written, and nothing here changed.
   *
   * I HAD WRITTEN THAT THERE WAS NO CHEAPER INTERIM. There was, and it was free
   * -- no column, no schema, no render change. I looked for the fix in this file
   * and concluded none existed, which was true and useless: the question is
   * "could the producer observe it", and only the producer can answer. A gate
   * searched for at the wrong layer reads as absent.
   *
   * WHAT IS DELIBERATELY STILL UNGATED: a late anchor WITH a price yields `OPEN`
   * and a wrong percentage. Suppressing that would discard a number he asked for
   * to avoid a rare wrong one. So the false SENTENCE is closed; the wrong NUMBER
   * still wants `anchorLateScope` and the `LATE` mark, which is the informative
   * half rather than a correctness gate.
   */
  if (reading.state === 'NOT_STARTED' || reading.state === 'UNKNOWN') return null;

  if (reading.state === 'NO_PRINT' || reading.move === null) {
    return (
      <span
        className="num truncate text-[11px] whitespace-nowrap"
        title={`${reading.label}: this session has produced no print, so there is no move within it to measure. Any change on the row happened before it opened.`}
      >
        <span className="text-ink-3">{reading.label}</span>{' '}
        <span className="text-warn">not traded</span>
      </span>
    );
  }

  const up = reading.move >= 0;
  /*
   * ET, VIA THE SHARED FORMATTER, BECAUSE THIS RENDERED RAW UTC ON HIS BOARD.
   * `reading.at.slice(11, 16)` took the characters out of an ISO string, so a
   * 04:55 ET anchor displayed as 08:55 -- a time that had not happened yet at
   * 07:49 ET. He read it as a broken row. Slicing a timestamp is not formatting
   * it; the frame has to be converted and then NAMED.
   */
  const anchorAt = formatEtMinute(reading.at);
  const anchor =
    reading.trust === 'THIN' ? 'thin' : reading.trust === 'UNKNOWN' ? '?' : null;

  return (
    <span
      className="num truncate text-[11px] whitespace-nowrap"
      title={
        `${reading.label} from ${formatPrice(reading.openPrice)}` +
        (anchorAt ? ` at ${anchorAt}` : '') +
        (reading.tradeCount === null
          ? '. The feed reported no trade count for that minute, so how thin the anchor is cannot be said.'
          : ` on ${reading.tradeCount} trades in the anchoring minute`)
      }
    >
      <span className="text-ink-3">{reading.label}</span>{' '}
      <span className={up ? 'text-pos' : 'text-neg'}>
        {formatSignedPercent(reading.move)}
      </span>
      {anchor ? (
        <span className="ml-1 text-[9px] tracking-wide text-warn uppercase">{anchor}</span>
      ) : null}
    </span>
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
          ? '. Partial coverage: part of this session arrived as a reconstructed total with no per-minute notional behind it.'
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

export const WHY_TONE: Record<DeskWhy['tone'], string> = {
  pos: 'text-pos',
  warn: 'text-warn',
  neg: 'text-neg',
  dim: 'text-ink-3',
};

/** The no-catalyst mark: Commercial read 13's words, and the board's short form (Integration, 2026-10-07). */
export const NO_CATALYST_MARK = { full: 'no catalyst found in our sources', short: 'no catalyst found' } as const;

/**
 * The catalyst's warn marks, ONE source for the board's Why cell and the
 * session report's tag row (Integration's one-vocabulary call, 2026-10-02;
 * `docs/Design/report-b-spec.md`). A wording change here changes both.
 *
 * ONE EXCEPTION, `full`: the no-catalyst mark is Commercial 13's "no catalyst found in our sources" on the
 * report card (a stored, printed report has no hover, and the report checker strikes a bare "no catalyst"),
 * and stays "no catalyst found" on the board's Why cell, where the full words (9 px semibold, uppercase)
 * measure wider than the column at the 1,024 floor and would wrap the row; the board keeps the hover that
 * says "searched its sources". Integration's ruling, 2026-10-07.
 */
export function WhyMarks({ why, full = false }: { why: DeskWhy; full?: boolean }) {
  return (
    <>
      {why.explainsMove === false ? (
        <span className="text-[9px] font-semibold tracking-wide text-warn uppercase">
          not the move
        </span>
      ) : null}
      {/*
        * TWO CAUSES, TWO WORDS. This badge said `no fresh news` both when
        * the desk found NO catalyst and when it found an OLD one — the same
        * mark for "nothing happened" and "something did, a while ago". His
        * band word for the second is OLD.
        */}
      {why.code === 'NO_FRESH_CATALYST' ? (
        <span
          className="text-[9px] font-semibold tracking-wide text-warn uppercase"
          title="The desk searched its sources and found no catalyst for this move."
        >
          {full ? NO_CATALYST_MARK.full : NO_CATALYST_MARK.short}
        </span>
      ) : null}
      {why.code === 'OLD_CATALYST' ? (
        <span
          className="text-[9px] font-semibold tracking-wide text-warn uppercase"
          title="A catalyst exists but it is older than yesterday, and the desk does not think it explains today's move."
        >
          old
        </span>
      ) : null}
    </>
  );
}

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
      {/*
        * WRAPS rather than overflowing: the rare row carrying NOT THE MOVE
        * and OLD at once is wider than Why at the 1,024 floor, and a fixed
        * cell does not clip -- it would lean into Risk.
        */}
      <span className="flex flex-wrap items-baseline gap-x-1.5">
        {/*
          * THE LETTER EXPLAINS ITSELF NOW.
          *
          * It carried no title at all, and he read a green `A` as "fresh
          * catalyst" — reasonably, since the COLOUR does mean fresh. The
          * letter is the grade. Two quantities in one glyph, and only one of
          * them was ever named on screen.
          */}
        <span
          className={`num text-[13px] font-bold ${WHY_TONE[why.tone]}`}
          title={why.title}
        >
          {why.grade}
        </span>
        {/*
          * `.num` ONLY WHILE THIS HOLDS A NUMBER.
          *
          * The slot is Geist Mono with `tabular-nums` because it normally
          * carries an elapsed span, and tabular figures are what make a column
          * of ages scan. On a row promoted by the prior close it carries a
          * REASON instead — `since Fri close` — and prose set in a numerals
          * font is the small version of the mistake the reason exists to fix.
          *
          * READ OFF `ageIsPriorClose`, NEVER pattern-matched from the string.
          * A renderer testing for a digit would be a second place that decides
          * what this field means, and the two would drift the first time a
          * weekday abbreviation changed.
          *
          * The title is `eventAt` either way, so the exact ET instant the cell
          * stopped printing is one hover away rather than gone.
          */}
        {why.age ? (
          <span
            className={`text-[11px] text-ink-2 ${why.ageIsPriorClose ? '' : 'num'}`}
            title={why.eventAt ?? undefined}
          >
            {why.age}
          </span>
        ) : null}
        <WhyMarks why={why} />
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

export const RISK_TONE: Record<DeskRisk['tone'], string> = {
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

/**
 * The quantity the board RANKED ON, which changes identity at the bell.
 *
 * `participation` non-null means the after-hours board is showing, and it is
 * what that board ordered by. Daily RVOL is not merely less relevant then —
 * it is STALE: it stops moving at 16:00 and keeps whatever the day earned, so
 * a column headed with the ranking quantity would have been showing a number
 * that had ranked nothing since the close.
 *
 * NO `low` MARK ON PARTICIPATION. `rvolConfidence` is a statement about the
 * RVOL baseline, and whether it carries to this ratio has not been
 * established. Rendering it here would assert something nobody measured.
 */
export function RvolCell({
  telemetry,
  participation = null,
}: {
  telemetry: MarketTelemetry;
  participation?: number | null;
}) {
  if (participation !== null) {
    return (
      <span className="num text-[13px] font-semibold text-ink">{formatMultiple(participation)}</span>
    );
  }
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
  setupGrade,
  setupGradeNoneRecorded = false,
  companyHint,
}: {
  ticker: string;
  focused: boolean;
  onToggleFocus: (ticker: string) => void;
  stale?: boolean;
  ageSeconds?: number | null;
  retention?: string | null;
  /** The stored setup grade (null or absent is NOT_YET: the dash). */
  setupGrade?: SetupGrade | null;
  /** The payload's explicit null for this name (a pre-grading checkpoint row). */
  setupGradeNoneRecorded?: boolean;
  /** "Name. Country." as a hover on the ticker (contract row 4); absent when the desk has no name. */
  companyHint?: string | null;
}) {
  return (
    <span className="flex flex-col items-start">
      {/* Wraps instead of overflowing: star 14 + ticker + "Not graded" 47.9 + gaps is
          over the 112 px content box for any ticker wider than 42 px (a W-heavy
          five letters is 74), and "stale" adds 28 more. The badge drops to its own
          line only when it has to; a letter badge (18 px) fits every ticker. */}
      <span className="flex flex-wrap items-center gap-x-1">
        <FocusToggle ticker={ticker} focused={focused} onToggle={onToggleFocus} />
        <span className="text-[15px] font-bold tracking-tight text-ink" title={companyHint ?? undefined}>
          {ticker}
        </span>
        {setupGrade !== undefined ? <SetupGradeBadge grade={setupGrade} noneRecorded={setupGradeNoneRecorded} /> : null}
        {stale ? (
          <span
            className="text-[9px] font-semibold tracking-wide text-warn uppercase"
            title={`No market event for ${quietFor(ageSeconds)}. This is the last live print, not a current one.`}
          >
            stale
          </span>
        ) : null}
      </span>
      {/* Its own line: "RETAINED > $20" is 133 px and the cell is 128, so beside the
          ticker it overflowed into the next column (PFSA, measured 2026-10-03). */}
      {retention ? (
        <span className="text-[9px] font-semibold tracking-wide whitespace-nowrap text-accent uppercase">
          {retention}
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
