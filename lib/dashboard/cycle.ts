/**
 * The cycle, as the trader reads it.
 *
 * `lib/market/cycle.ts` computes the phase from daily bars. This module is the
 * only place that turns those six engine names into words, and the only place
 * that decides their colour.
 *
 * Two things worth knowing before changing anything here.
 *
 * **It is deterministic.** Same bars, same answer. The model's cycle
 * classification it replaces was 46% irreproducible across five draws on
 * byte-identical evidence, and — worse — 28 of 236 versions varied between two
 * *directions*, 17 of them across the frontside/backside boundary the playbook
 * acts on. A name could read as having turned when nothing about it had. So a
 * cycle change on the board now means the tape changed, which is a property it
 * has never had before.
 *
 * **It is not part of the Sheet/Auto apparatus.** There is no second opinion to
 * conflict with, so cycle leaves that machinery entirely. Anything that shows a
 * cycle conflict after this is showing a fiction.
 */

import type {
  CycleHistory,
  CyclePhase,
  CycleResult,
  TodayStartVerdict,
} from '@/lib/market/cycle';
import type { DeskRow } from './merge';
import type { DeskConclusion, ReadTone } from './deskRead';
import { formatEtHour, formatEtMinute } from '@/lib/format';

/**
 * Trader-facing words for the six phases. Settled with the desk owner
 * 2026-08-23.
 *
 * `PULLBACK` is deliberately NOT called "pullback". In this trader's playbook a
 * pullback is the micro pullback on rising volume that is his *entry trigger*;
 * as a cycle phase it means a multi-session position in the arc. One word, one
 * sense saying buy and the other saying context — worse than jargon, because
 * jargon is opaque and this gets confidently misread.
 *
 * `SHADOW` is `PRIOR RUN`: the state carries two facts — the name is not in
 * play, and its old high is still overhead — and a badge can say one. This says
 * the trade-relevant half, in the vocabulary the desk already uses.
 */
export const CYCLE_PHASE_LABEL: Record<CyclePhase, string> = {
  DAY_ONE: 'DAY 1',
  FRONTSIDE: 'FRONTSIDE',
  PULLBACK: 'OFF HIGH',
  BACKSIDE: 'BACKSIDE',
  SHADOW: 'PRIOR RUN',
  NO_CYCLE: 'NO RUN',
};

/**
 * One saturated element per row, so only the phase a trader acts against is
 * loud. `PRIOR RUN` and `NO RUN` are absences of a live move, not warnings, and
 * colouring them would spend the row's one colour on nothing happening.
 */
export function cyclePhaseTone(phase: CyclePhase): ReadTone {
  switch (phase) {
    case 'DAY_ONE':
    case 'FRONTSIDE':
      return 'pos';
    case 'PULLBACK':
      return 'warn';
    case 'BACKSIDE':
      return 'neg';
    default:
      return 'dim';
  }
}

/**
 * The arithmetic behind the badge, for the hover and for the drawer.
 *
 * Retracement is of the MOVE, never distance below the high, and the two
 * diverge badly at ordinary prices: a name based at $1.00 that ran to $1.20 has
 * given back half its move at $1.10, where the below-high figure reads a
 * reassuring 8%. The reassuring number appears on exactly the names that have
 * broken. `retracementPct` is also what decides the phase, so showing it keeps
 * the number and the word consistent.
 */
/** Unsigned, one decimal. A giveback is not a negative advance and must not wear a sign. */
function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function cycleDetail(current: CycleResult): string | null {
  if (current.phase === 'NO_CYCLE') return null;

  const parts = [
    // advancePct is a FRACTION (0.53 is a 53% move), like retracementPct, so it is scaled here.
    `up ${pct(current.advancePct * 100)} from ${current.baseClose.toFixed(2)}`,
    `high ${current.cycleHigh.toFixed(2)} on ${current.cycleHighDate}`,
  ];

  if (current.retracementPct > 0) {
    parts.push(`${pct(current.retracementPct * 100)} of the move given back`);
  }

  parts.push(
    current.sessionsSinceHigh === 0
      ? 'high is the latest session'
      : `${current.sessionsSinceHigh} session${current.sessionsSinceHigh === 1 ? '' : 's'} since the high`,
  );

  /*
   * The as-of, and the whole point of this line.
   *
   * Every number above is settled-only: `ensureDailyHistory` writes no bar until
   * 20:00 ET and `readDailyBars` defaults to EXCLUDE, so the latest bar is never
   * today's. During premarket -- the window he actually trades -- the reading is
   * a statement about YESTERDAY wearing the present tense.
   *
   * That matters beyond this string, because `cycleHigh` feeds `retracementPct`
   * and `retracementPct` decides the PHASE: a name gapping above yesterday's
   * cycle high is labelled OFF HIGH while it makes new highs. Dating the reading
   * does not fix the phase. It stops the reading claiming to be current, which
   * is a smaller thing done honestly rather than a fix pretending to be one.
   *
   * Stated as what IS true and never as "today not included" -- after 20:00 ET
   * today IS the latest session, and a clause that flips is the failure this
   * desk keeps finding. A bare date is true in every window.
   */
  parts.push(`through ${current.latestDate} close`);

  return parts.join(' · ');
}

/**
 * The cycle conclusion, or null when no dossier has computed one yet.
 *
 * **Null is not a reason to fall back to the model's classification.** That
 * field is being deleted, and reading it here would keep it alive past its own
 * removal — the caller shows the field as unresolved instead. A blank cycle on
 * a not-yet-recomputed name is honest and transient; a stale model verdict
 * wearing the new labels would be neither.
 */
/**
 * The word for a run that started TODAY and has no settled arc behind it.
 *
 * NOT `DAY 1`, AND THE TWO TESTS ARE WHY. The settled `isCycleStart` measures
 * CLOSE against prior close; the live `todayQualifiesAsCycleStart` measures
 * today's HIGH against it. A name that spikes 40% intraday and closes flat
 * qualifies live and will not qualify once the bar settles -- so a live `DAY 1`
 * would be a word that silently retracts overnight, and a reader comparing two
 * rows could not tell which kind of DAY 1 either was.
 *
 * It states the OBSERVATION rather than a classification, so nothing is taken
 * back tomorrow: the run did start today, whatever the settled bar later says
 * about its close. `NEW RUN` was considered and rejected -- one letter from
 * `NO RUN`, which is the word this replaces, on a board read at a glance.
 *
 * A CONSTANT because the wording is his to change and this is the only edit
 * that would take.
 */
export const LIVE_START_LABEL = 'STARTED TODAY';

export function resolveComputedCycle(history: CycleHistory | null | undefined): DeskConclusion | null {
  if (!history) return null;

  const phase = history.current.phase;

  /*
   * The settled classifier cannot see today, so NO_CYCLE means "no run in the
   * settled bars" -- not "no run". When the live overlay has qualified today,
   * saying NO RUN contradicts a verdict the same object carries.
   */
  if (phase === 'NO_CYCLE' && history.todayStart === 'QUALIFIED') {
    return {
      label: LIVE_START_LABEL,
      tone: cyclePhaseTone('DAY_ONE'),
      provenance: 'COMPUTED',
      title: null,
    };
  }

  return {
    label: CYCLE_PHASE_LABEL[phase],
    tone: cyclePhaseTone(phase),
    provenance: 'COMPUTED',
    title: cycleDetail(history.current),
  };
}

/** A row's computed phase, or null when no dossier has one yet. */
export function cyclePhaseOf(row: DeskRow | undefined | null): CyclePhase | null {
  return row?.intelligence?.analysis?.dossier?.computedCycle?.current.phase ?? null;
}

/**
 * How many rows sit in each phase.
 *
 * Computed here rather than read from `MarketSummary.freshFrontside` and its
 * siblings, which count the Sheet's cycle string (`lib/data/rows.ts:428`).
 * Mixing the two would put a sheet-derived count on a segment that applies a
 * phase-derived filter — click "fresh · 4", get zero rows. A count and the
 * filter it describes have to come from one source or they will disagree in
 * front of the trader.
 */
export function countCyclePhases(rows: Iterable<DeskRow>): Record<CyclePhase, number> {
  const counts: Record<CyclePhase, number> = {
    DAY_ONE: 0,
    FRONTSIDE: 0,
    PULLBACK: 0,
    BACKSIDE: 0,
    SHADOW: 0,
    NO_CYCLE: 0,
  };
  for (const row of rows) {
    const phase = cyclePhaseOf(row);
    if (phase) counts[phase] += 1;
  }
  return counts;
}

/**
 * The chip's high reference and the two prices beneath it.
 *
 * He asked for prices rather than a percentage: *"dont do a percentage - it's
 * deceptive… OFF HIGH - $1.20→ $1.00"*. **A ratio hides its denominator; two
 * prices carry theirs**, and he does the arithmetic he actually trades on.
 *
 * **The reference is `max(cycleHigh, sessionHigh)`, and that alone removes the
 * contradiction this began with.** `cycleHigh` is settled-only, so a name that
 * gapped overnight could sit ABOVE it — printing "OFF HIGH · $1.20 → $1.80", a
 * price above the high beside a word saying it is off it. Taking the maximum
 * makes `now > high` STRUCTURALLY IMPOSSIBLE rather than merely unlikely.
 */
/**
 * TWO SHAPES, BECAUSE THE SECOND IS NOT A PAIR WITH A FIELD MISSING.
 *
 * `PRIOR_ONLY` is the desk declining to say which high the move is measured
 * against. Modelling it as a pair with a null `now` would let a caller render
 * an arrow to nothing, and would let an optional field carry a decision that
 * the type should force. A union makes the branch unavoidable at every call
 * site, which is the point.
 */
export interface HighPairReading {
  kind: 'PAIR';
  /**
   * Label override, or null to keep the arc's phase word.
   *
   * Fires ONLY when today's high has actually beaten the arc — read literally
   * from *"change to NEW HIGH if the high is new"*. A name sitting at its OLD
   * cycle high keeps its phase word, because that high is not new and reading
   * the instruction more broadly would label names he did not describe.
   */
  label: 'NEW HIGH' | 'OFF HIGH' | null;
  /**
   * Tone for the override.
   *
   * **Must follow the label.** Without it NEW HIGH renders in the `neg` colour
   * of the stale BACKSIDE verdict underneath — a word saying one thing while
   * its colour says the opposite, which is the label-and-number mismatch one
   * layer up.
   */
  tone: ReadTone | null;
  /** The reference high, for the left of the pair. */
  high: number;
  /** Live price, for the right. Matches his screen; `latestClose` would not. */
  now: number;
}

/**
 * The prior high alone, when supersession cannot be established.
 *
 * No `now`, deliberately. There is no comparison to draw, because the thing
 * being compared against is what is in doubt. The date is not decoration: it is
 * what stops the number reading as a current level.
 */
export interface PriorHighReading {
  kind: 'PRIOR_ONLY';
  high: number;
  /** Trading date the high was set, `YYYY-MM-DD`. */
  at: string;
}

export type HighReading = HighPairReading | PriorHighReading;

/**
 * Null when there is nothing to show — no cycle, or no live price.
 *
 * **The band is the SPREAD, and it is not optional for the reason it looks
 * like.** `reference` is a MAXIMUM, so price can never exceed it: `price ===
 * reference` holds for one print and is false immediately after. Without a
 * band NEW HIGH would appear and vanish on the same tick. Off by less than the
 * spread is not off — the difference was not sellable — and it is the same
 * instrument the colour on this row already uses, rather than a second invented
 * band.
 *
 * **No spread means no override**, not a guess. The prices still render, because
 * they are observations and need no band; only the verdict does.
 */
/**
 * A TRADING DATE IS A CALENDAR DATE, NOT AN INSTANT, so it is split rather than
 * parsed. `new Date('2026-09-15')` is UTC midnight, and formatting that in ET
 * rolls it back to the 14th -- the timezone trap one field over from the one
 * that put a UTC clock on his board in September.
 */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function formatTradingDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const [y, m, d] = date.split('-');
  const month = MONTHS[Number(m) - 1];
  if (!y || !month || !d) return null;
  return `${month} ${Number(d)}`;
}

export function highReading(
  arc: CycleResult | null | undefined,
  todayStart: TodayStartVerdict | null | undefined,
  sessionHigh: number | null | undefined,
  price: number | null | undefined,
  spread: number | null | undefined,
): HighReading | null {
  if (price === null || price === undefined || !Number.isFinite(price)) return null;

  const liveHigh =
    sessionHigh !== null && sessionHigh !== undefined && Number.isFinite(sessionHigh)
      ? (sessionHigh as number)
      : null;

  /*
   * NO SETTLED ARC, BUT TODAY STARTED ONE -- and this arm was unreachable.
   *
   * A COMPOSITION DEFECT, invisible from inside either half. The guard
   * `arc.phase === 'NO_CYCLE'` was the FIRST line of this function and correct
   * on its own: with no arc there is no `cycleHigh` to measure against, and
   * every line below it reads one. The supersession branch thirty lines down
   * was correct on its own too. But the guard ran first, so the branch was
   * dead for EXACTLY the population it was written for -- a name whose entire
   * run is today, which by construction has no settled cycle because
   * `classifyCycle` reads settled bars and today is not one.
   *
   * The desk therefore computed `todayStart = QUALIFIED`, knew a run had
   * started, and rendered NO RUN. Found on DCOY by Research; verified here.
   *
   * MOVING THE GUARD LOWER WOULD CRASH RATHER THAN FIX IT: `cycleHigh` does
   * not exist on `{ phase: 'NO_CYCLE' }`. There is no prior high in this case
   * and there should not be -- the reference is TODAY'S OWN HIGH, which is the
   * only high there is. So this is its own arm, not a relaxed guard.
   */
  if (!arc || arc.phase === 'NO_CYCLE') {
    if (todayStart !== 'QUALIFIED' || liveHigh === null) return null;
    return liveVerdict(liveHigh, price, spread);
  }

  const cycleHigh = arc.cycleHigh;

  /*
   * UNVERIFIABLE: THE PAIR GOES, NOT JUST THE VERDICT.
   *
   * The desk cannot say whether today started a new cycle, so it cannot say
   * which high the current move is measured against. `cycleHigh` would assert
   * the old run still governs; `sessionHigh` would assert today's does. Showing
   * either answers the question we have just admitted we cannot answer -- and
   * stripping only the phase word leaves `$5.49 -> $1.64` still saying "far off
   * its high", which is the same claim unlabelled.
   *
   * What survives is that the old high is overhead supply, which holds whichever
   * cycle is current. So: the prior high, dated, with no arrow and no verdict.
   */
  if (todayStart === 'UNVERIFIABLE') {
    return { kind: 'PRIOR_ONLY', high: cycleHigh, at: arc.cycleHighDate };
  }

  /*
   * QUALIFIED: TODAY SUPERSEDES, SO THE REFERENCE IS TODAY'S OWN HIGH.
   *
   * `cycle.ts` already states the rule -- a qualifying start day supersedes --
   * and when it fires the prior run is not what the move is measured against.
   * Taking `max(cycleHigh, sessionHigh)` here would keep a dead run's high as
   * the reference on a name that has started a new one, which is how a day-one
   * frontside came to read BACKSIDE at rank 3.
   */
  const superseded = todayStart === 'QUALIFIED' && liveHigh !== null;
  const beat = superseded || (liveHigh !== null && liveHigh > cycleHigh);
  const high = beat ? (liveHigh as number) : cycleHigh;

  if (!beat) return { kind: 'PAIR', label: null, tone: null, high, now: price };

  /*
   * Compared at six decimals, because the raw subtraction is not stable at the
   * boundary: `1.5 - 1.49` is 0.010000000000000009 and would read as OUTSIDE a
   * one-cent spread. Quotes are never finer than four decimals, so rounding at
   * six cannot change a real decision and removes the float noise that would
   * otherwise flip the label on an exact-boundary print.
   */
  return liveVerdict(high, price, spread);
}

/**
 * Price against the high this move is measured from, once that high is chosen.
 *
 * Extracted so the settled-arc path and the started-today path cannot answer
 * the same question differently -- they were one expression, and the second
 * path was added by making the first reachable rather than by copying it.
 *
 * Compared at six decimals, because the raw subtraction is not stable at the
 * boundary: `1.5 - 1.49` is 0.010000000000000009 and would read as OUTSIDE a
 * one-cent spread. Quotes are never finer than four decimals, so rounding at
 * six cannot change a real decision and removes the float noise that would
 * otherwise flip the label on an exact-boundary print.
 */
function liveVerdict(high: number, price: number, spread: number | null | undefined): HighReading {
  // No spread means no verdict, not a guessed band. The prices still render:
  // they are observations and need no band; only the word does.
  if (spread === null || spread === undefined || !Number.isFinite(spread)) {
    return { kind: 'PAIR', label: null, tone: null, high, now: price };
  }
  const scaled = (v: number) => Math.round(v * 1e6);
  const atHigh = scaled(high - price) <= scaled(Math.abs(spread));
  return atHigh
    ? { kind: 'PAIR', label: 'NEW HIGH', tone: 'pos', high, now: price }
    : { kind: 'PAIR', label: 'OFF HIGH', tone: 'warn', high, now: price };
}

/** Prices as he wrote them: dollar signs, four decimals under $1, two above. */
export function formatHighPair(reading: HighReading): string {
  const fmt = (v: number) => `$${v.toFixed(v < 1 ? 4 : 2)}`;
  if (reading.kind === 'PRIOR_ONLY') {
    /*
     * NO ARROW. The arrow is the claim -- it says "from this, to that" -- and
     * this arm exists because the desk cannot say what the move is measured
     * from. The date does the work the arrow would have done wrongly: it puts
     * the number in the past rather than offering it as a current level.
     */
    const at = formatTradingDate(reading.at);
    return at ? `prior high ${fmt(reading.high)} · ${at}` : `prior high ${fmt(reading.high)}`;
  }
  return `${fmt(reading.high)} → ${fmt(reading.now)}`;
}

/**
 * What each phase word MEANS, in the language of the stock.
 *
 * Keyed by `CyclePhase` rather than by the rendered label, and that is the
 * point rather than a preference: `PULLBACK` renders as `OFF HIGH`, and
 * `highReading` produces a DIFFERENT `OFF HIGH` from a different quantity. A
 * map keyed by the word would hand the phase's explanation to the override's
 * badge, which is how a tooltip comes to describe a number that did not
 * compute the label above it.
 *
 * Every sentence here is what `classifyCycle` actually tests, not what the
 * word suggests — `lib/market/cycle.ts:410-432`.
 */
const PHASE_TERM: Record<CyclePhase, string> = {
  DAY_ONE: 'First session of this advance, and the high is the most recent settled session.',
  FRONTSIDE: 'Still advancing: the high is the most recent settled session.',
  PULLBACK: 'The high is an earlier session, but most of the advance is still intact.',
  BACKSIDE: 'Most of the advance has been given back.',
  SHADOW: 'The run is over and the name has gone quiet. The old high is still overhead supply.',
  NO_CYCLE: 'No qualifying advance on record.',
};

/**
 * What the LIVE override means, which is a different question from the phase.
 *
 * The phase is computed from SETTLED daily bars and says where the name sits in
 * its arc. These two compare TODAY'S price against the high that arc is
 * measured from. Both can be true at once — a name can be on the backside and
 * also at a new high — so the title below states both rather than choosing.
 */
const LIVE_TERM: Record<string, string> = {
  'NEW HIGH': 'Price is within one spread of the high this move is measured against.',
  'OFF HIGH': 'Price is more than one spread below the high this move is measured against.',
};

export interface CycleBadgeReading {
  label: string;
  tone: string;
  /** Always present: he asked that every term on the board explain itself. */
  title: string;
}

/**
 * The cycle badge: ONE decision over label, tone and tooltip.
 *
 * WHY THIS EXISTS AS A FUNCTION RATHER THAN AS JSX IN TWO PLACES. The Discovery
 * row and the researched row each built this badge themselves, and they drifted
 * twice. The first time the researched table was still reading the Sheet's
 * `ticker.cycle` after every other surface had moved to the computed phase. The
 * second time — found on the live board 2026-09-22 — Discovery had taken
 * `highReading`'s override and the researched table had not, so THREE of the
 * four tickers on both tables showed different cycle verdicts at the same
 * moment: GRML `OFF HIGH $12.10 → $10.49` against `DAY 1`, QNME and TOPS
 * `OFF HIGH` against `BACKSIDE`.
 *
 * Neither was stale data. Both surfaces read the same `computedCycle` object
 * through different readings, which is worse than stale — there is nothing to
 * refresh and nothing looks broken from inside either file. A third correction
 * would have been the second time this cell was fixed by hand, so it is one
 * function now and the two tables have nothing left to disagree about.
 *
 * AND THE TOOLTIP COMES FROM THE SAME DECISION AS THE LABEL. It previously did
 * not: an override badge reading `OFF HIGH` carried `cycleDetail`, which
 * describes the settled phase — a tooltip explaining a different quantity from
 * the one that produced the word above it.
 */
export function cycleBadge(
  high: HighReading | null | undefined,
  phase: CycleResult | null | undefined,
  conclusion: DeskConclusion | null | undefined,
  todayStart?: TodayStartVerdict | null,
  /** The qualification moment, for the started-hour label he asked for. */
  started?: StartedReading | null,
): CycleBadgeReading | null {
  /*
   * A run that started today has no settled arc, so `PHASE_TERM` has nothing
   * to say about it -- `NO_CYCLE` reads "No qualifying advance on record",
   * which is the same false sentence the badge used to show, moved into the
   * tooltip. It gets its own, and it names the looser basis rather than
   * leaving a reader to assume this is the settled test.
   */
  const liveStart = phase?.phase === 'NO_CYCLE' && todayStart === 'QUALIFIED';
  /*
   * The hour rides on the SAME word, so there is one label rather than two
   * that could disagree: `STARTED 5AM` where the hour is earned, `STARTED
   * TODAY` where it is not. A reader never has to work out which variant they
   * are looking at, because the fallback IS the word that was already there.
   */
  const startWord = liveStart ? (started?.label ?? LIVE_START_LABEL) : LIVE_START_LABEL;
  const startDetail = liveStart && started?.detail ? ` ${started.detail}` : '';
  const settled = liveStart
    ? `${startWord}. Today cleared the volume and advance a run needs, measured on today's HIGH against the prior close. The settled test uses the CLOSE, so this may not become a DAY 1 once the session settles.${startDetail}`
    : phase && conclusion
      ? `${conclusion.label}. ${PHASE_TERM[phase.phase]}${
          conclusion.title ? ` ${conclusion.title}` : ''
        }`
      : null;

  if (high && high.kind === 'PAIR' && high.label) {
    /*
     * The override won the word, so the phase is stated INSIDE the tooltip
     * rather than dropped. It is the sentence the researched table used to show
     * as its whole badge, and a reader who saw both surfaces needs to find it
     * somewhere or the two still disagree — just more quietly.
     */
    return {
      label: high.label,
      tone: high.tone ?? 'dim',
      /*
       * THE PREFIX IS CONDITIONAL, AND SEEING IT RENDERED IS WHAT CAUGHT IT.
       *
       * "Settled reading: STARTED TODAY" is a contradiction -- STARTED TODAY
       * is precisely the LIVE reading, produced because there is no settled
       * one. The prefix is right for a real phase and wrong for this branch,
       * and it read correctly in every test because the tests asserted the
       * sentence's CONTENT and never its composition.
       */
      title: settled
        ? `${LIVE_TERM[high.label] ?? ''} ${liveStart ? '' : 'Settled reading: '}${settled}`.replace(/\s+/g, ' ').trim()
        : (LIVE_TERM[high.label] ?? high.label),
    };
  }

  if (!conclusion || !phase) return null;

  // The live-start branch takes its word from `started` too, so the badge and
  // its tooltip cannot name the start differently.
  const label = liveStart ? startWord : conclusion.label;
  return { label, tone: conclusion.tone, title: settled ?? conclusion.label };
}

/**
 * Why a prior high is shown alone, and what frame it was measured in.
 *
 * ONE STRING, TWO TABLES. It was written out in full in both `DiscoveryBoard`
 * and `MomentumTable` — the same duplication that let their cycle badges drift
 * into contradicting each other on the live board.
 *
 * THE FRAME CLAUSE WAS WRONG THE MOMENT THE FRAME WAS RULED. It said highs
 * before today "exclude after-hours", full stop. He ruled premarket into the
 * cycle frame on 2026-09-22, so the desk's frame is now 04:00–20:00 while the
 * stored daily high is not — and two measurements of that stored column
 * disagree about whether it starts at 04:00 or 09:30. Under EITHER reading it
 * excludes after-hours; under one of them it excludes premarket too. So the
 * sentence names what is certain and marks the rest as possible, rather than
 * asserting the narrower exclusion that happens to be the one already written.
 *
 * AND IT ENDS ON THE DIRECTION, WHICH IS THE PART A READER CAN ACT ON. A high
 * measured over fewer hours can only be lower than the same day's true high,
 * never higher. That makes it a BOUND rather than an uncertainty — "may be
 * wrong" gets discounted in both directions, "can only be understated" cannot.
 */
export const PRIOR_HIGH_ONLY_TITLE =
  'The desk cannot establish whether today started a new cycle, so it will not say which high this move is measured against. The prior high is shown because it is overhead supply either way. The cycle frame is 04:00–20:00, but highs before today are stored over a narrower window (they exclude after-hours and may exclude premarket), so a prior high can only be understated, never overstated.';

export interface StartedReading {
  /** `STARTED 5AM` when the hour can be stood behind, else `STARTED TODAY`. */
  label: string;
  /** The precise minute and the RVOL at that moment, when known. */
  detail: string;
}

/**
 * The hour a run started, which he asked for, with the guard he approved.
 *
 * His definition, 2026-09-22: the moment the name first broke RVOL. The desk
 * has no such moment as a THRESHOLD CROSSING — `rankByRvol` ranks every name
 * carrying an RVOL and rank is relative to that day's field, so nothing is
 * ever "crossed". `qualified.at` is his answer as the desk actually records
 * it: the first instant the name entered the tracked population, ranked by
 * RVOL with its price inside the band. It carries the RVOL from that instant,
 * which is why the detail can say what the reading WAS rather than only when.
 *
 * `observed` IS THE WHOLE GUARD AND IT IS NOT OPTIONAL POLISH. These stamps
 * latch when the desk FIRST SEES a name. If the worker restarts at 05:30, a
 * name that broke at 04:10 is stamped 05:30 — and `STARTED 5AM` would then be
 * a market claim manufactured from a process fact, stated on the board with no
 * mark on it. That is the defect class this desk keeps paying for, so the
 * hour is shown only when the producer says it was watching from the session
 * open.
 *
 * ABSENT MEANS SILENT, NOT ASSUMED. `observed` is undefined until the field
 * exists on the payload, and an undefined guard degrades to `STARTED TODAY` —
 * the word already on the board — rather than to an unguarded hour. So this
 * ships dark and lights up when the field lands, and the failure mode of it
 * never landing is the status quo rather than a wrong time.
 */
export function startedLabel(input: {
  qualifiedAt: string | null | undefined;
  qualifiedRvol: number | null | undefined;
  /** Producer's answer to "were we watching from the session open". */
  observed: boolean | null | undefined;
}): StartedReading {
  const { qualifiedAt, qualifiedRvol, observed } = input;
  const minute = formatEtMinute(qualifiedAt);
  const rvol = typeof qualifiedRvol === 'number' && Number.isFinite(qualifiedRvol)
    ? `, RVOL ${qualifiedRvol.toFixed(1)}x at that moment`
    : '';

  if (observed !== true || !minute) {
    return {
      label: LIVE_START_LABEL,
      detail: minute
        ? `First ranked at ${minute}${rvol}, but the desk was not watching from the session open, so that is when it was FIRST SEEN and not necessarily when it started.`
        : 'The desk has no first-ranked time for this name.',
    };
  }

  const hour = formatEtHour(qualifiedAt);
  return {
    label: hour ? `STARTED ${hour}` : LIVE_START_LABEL,
    detail: `First ranked at ${minute}${rvol}.`,
  };
}
