/**
 * The Why cell — why this name is moving, in a form a row can hold.
 *
 * Two facts decide whether a trader looks further: how good the catalyst is,
 * and how old it is. A grade with no age is unreadable (an A from three days
 * ago is not an A this morning) and an age with no grade says nothing. So the
 * cell carries both, plus the one thing the analysis is most confident about
 * and most often gets asked: does this actually explain the move.
 *
 * Nothing here interprets. Every value is selected from the accepted dossier or
 * the human sheet row, and a missing catalyst is reported as missing.
 */

import type { DeskRow } from '@/lib/dashboard/merge';
import { catalystAge, resolveCatalystFreshness } from '@/lib/research/time';
import type { CatalystFreshness } from '@/lib/research/types';

export type WhyCode =
  | 'GRADED'
  /** The desk searched and found no catalyst at all. */
  | 'NO_FRESH_CATALYST'
  /** A catalyst exists, and it is older than yesterday. */
  | 'OLD_CATALYST'
  | 'NOT_RESEARCHED'
  | 'RESEARCHING'
  | 'UNKNOWN';

export interface DeskWhy {
  code: WhyCode;
  /** 'A' | 'B' | 'C' | '—', or a word when there is no grade to give. */
  grade: string;
  /**
   * Relative age of the catalyst event: '12m', '16h', '3d'. Null when unknown.
   *
   * ON A ROW PROMOTED BY THE PRIOR CLOSE THIS CARRIES THE REASON INSTEAD --
   * `since Fri close` -- because the age and the colour are computed from
   * different quantities and disagree across a weekend. `ageIsPriorClose` says
   * which one is in here, so a renderer never has to pattern-match the string.
   */
  age: string | null;
  /**
   * True when `age` holds the prior-close reason rather than an elapsed span.
   *
   * The render reads this to drop `tabular-nums`: the slot is `.num` because it
   * normally holds a figure, and prose in a numerals font is the small version
   * of the same mistake this field exists to fix.
   */
  ageIsPriorClose: boolean;
  /** Absolute ET time behind the age, for the title and the drawer. */
  eventAt: string | null;
  /** One short line: the headline, clamped by CSS rather than cut here. */
  headline: string | null;
  /** The analysis's own answer to "does this explain the move". */
  explainsMove: boolean | null;
  freshness: CatalystFreshness | null;
  tone: 'pos' | 'warn' | 'neg' | 'dim';
  /**
   * What the letter and the colour each MEAN, from the same decision that
   * picks them.
   *
   * He read a green `A` as "fresh catalyst" and had no way to learn otherwise:
   * the letter carried no title at all. It is two quantities in one glyph —
   * the letter is STRENGTH and the colour is FRESHNESS — so the explanation is
   * computed here beside the tone rather than written into the component,
   * where the two could drift apart.
   */
  title: string;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Age as a trader reads it: minutes, then hours, then days.
 *
 * Never a raw ISO timestamp, and never in UTC. A catalyst's age is the whole
 * question; making somebody subtract two timestamps to find it is the defect.
 */
/**
 * How old the catalyst is, at the precision the source actually stated.
 *
 * THIS READ `Date.parse` ON EVERY TIMESTAMP, AND 77% OF THEM CARRY NO TIME OF
 * DAY. A bare calendar date is stored at noon UTC so it lands on the right ET
 * day; reading that back as an instant invents a clock the source never gave.
 * So a date-only catalyst from yesterday rendered `16h` -- precision from a
 * storage convention -- and the same row at another hour rendered `2d`, which
 * is a different DAY from the one the desk banded it into.
 *
 * HIS BANDS MADE THAT A VISIBLE CONTRADICTION rather than a quiet inaccuracy:
 * a yesterday bare date derives RECENT, and an age reading `2d` beside it says
 * OLD. On the majority of rows, the moment the bands ship.
 *
 * SO THE DAY COUNT COMES FROM THE ET CALENDAR, always, and hours are offered
 * only where a clock exists. `catalystAge` is the one implementation -- the
 * same seam as `resolveCatalystFreshness`, so the age and the band cannot
 * disagree about which day an event fell on.
 *
 * `today` RATHER THAN `0d`, because zero days is not how anyone says it and a
 * bare date from this morning is exactly the row he is looking for.
 */
export function relativeAge(at: string | null | undefined, nowMs: number): string | null {
  const age = catalystAge(at, new Date(nowMs));
  if (age === null) return null;

  if (age.precision === 'CLOCK') {
    if (age.elapsedMs < HOUR) return `${Math.max(1, Math.round(age.elapsedMs / MINUTE))}m`;
    if (age.elapsedMs < DAY) return `${Math.round(age.elapsedMs / HOUR)}h`;
  }

  return age.days === 0 ? 'today' : `${age.days}d`;
}

/**
 * `since Thu close` — the session whose close made a catalyst FRESH.
 *
 * THE WEEKDAY IS THE POINT AND IT IS WHY THIS IS NOT A CONSTANT. On a Friday
 * the prior session is Thursday; on a Monday it is Friday, and after a holiday
 * it is neither. A fixed word would be right four days in five, which is the
 * worst ratio a label can have.
 *
 * Taken from the boundary the desk actually banded on, formatted in ET through
 * `Intl` rather than derived from the instant by arithmetic. Null on anything
 * unparseable, so the caller keeps the age rather than printing a guess.
 */
export function priorCloseLabel(freshFrom: string | null | undefined): string | null {
  if (!freshFrom) return null;
  const ms = Date.parse(freshFrom);
  if (!Number.isFinite(ms)) return null;
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
  }).format(new Date(ms));
  return `since ${weekday} close`;
}

/** The ET calendar day of an instant, `Sep 25`, or null. */
export function etDay(at: string | null | undefined): string | null {
  if (!at) return null;
  const ms = Date.parse(at);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
  }).format(new Date(ms));
}

/** ET wall clock for the tooltip and the drawer. Never a UTC ISO string. */
export function etTimestamp(at: string | null | undefined): string | null {
  if (!at) return null;
  const ms = Date.parse(at);
  if (!Number.isFinite(ms)) return null;
  return `${new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(ms))} ET`;
}

const FRESHNESS_TONE: Record<CatalystFreshness, DeskWhy['tone']> = {
  FRESH: 'pos',
  RECENT: 'warn',
  STALE: 'warn',
  UNKNOWN: 'dim',
};

export function resolveWhy(row: DeskRow, nowMs: number = Date.now()): DeskWhy {
  const status = row.intelligenceState.status;

  if (status === 'NOT_ANALYZED') {
    return {
      code: 'NOT_RESEARCHED',
      grade: '—',
      age: null,
      ageIsPriorClose: false,
      eventAt: null,
      headline: 'Not researched',
      explainsMove: null,
      freshness: null,
      tone: 'dim',
      title: 'Not researched, so there is no catalyst grade and no freshness to colour.',
    };
  }

  if (status === 'ANALYSIS_PENDING') {
    return {
      code: 'RESEARCHING',
      grade: '—',
      age: null,
      ageIsPriorClose: false,
      eventAt: null,
      headline: 'Looking for the catalyst.',
      explainsMove: null,
      freshness: null,
      tone: 'dim',
      title: 'The desk is looking for the catalyst now. Nothing here is a grade yet.',
    };
  }

  const catalyst = row.intelligence?.analysis?.dossier.catalyst ?? null;
  // Desk only (Sheet switch-off step 3a, Integration 36th): the letter and the headline are the desk's own.
  // The Sheet's used to lead, so on a name where the two differed the row showed the Sheet's answer.
  const grade = catalyst ? gradeLetter(catalyst.catalystGrade) : '—';

  const headline = catalyst?.summary?.trim() || null;

  const eventAt = catalyst?.eventTimestamp ?? null;
  const age = relativeAge(eventAt, nowMs);

  if (!catalyst) {
    return {
      code: 'UNKNOWN',
      grade: '—',
      age: null,
      ageIsPriorClose: false,
      eventAt: null,
      headline: headline ?? 'No catalyst established.',
      explainsMove: null,
      freshness: null,
      tone: 'dim',
      // Marketing 644a67e0 S1, Commercial read 60.
      title: 'The desk has not established a catalyst for this name.',
    };
  }

  /*
   * COLOUR MEANS FRESHNESS, ALWAYS — his ruling, 2026-09-23.
   *
   * It used to fall back to `gradeTone(grade)` whenever there was no dossier
   * catalyst, so the same green carried FRESHNESS on most rows and STRENGTH on
   * some, with nothing on screen to tell them apart. A cue that changes
   * meaning by row is worse than no cue: it is read at a glance, which is the
   * one mode in which a reader cannot check which axis is lit.
   *
   * With no catalyst there is no freshness, so the letter goes dim and the
   * colour claims nothing. That costs a cue on unresearched rows and buys a
   * colour that means exactly one thing everywhere.
   */
  /*
   * ONE READ OF FRESHNESS, AND IT IS THE SEAM.
   *
   * Four places used to read `catalyst.freshness` independently — the tone,
   * the `noFresh` verdict, the returned field and the tooltip. Research is
   * replacing the stored value with a derived one (`resolveCatalystFreshness`,
   * read-time, so it also corrects dossiers already written). With four reads
   * that swap is four edits and the first one missed leaves the colour
   * disagreeing with the words beside it — which is the defect this column has
   * already produced twice.
   *
   * SO IT IS READ ONCE HERE, AND THAT IS NOW THE DERIVED READER (`f224f3d`).
   * Every consumer moved with it in one edit, including the freshness FILTER,
   * which asks this reading rather than the dossier.
   *
   * WHAT THE DERIVATION CORRECTS, measured by Research on the 2026-08-23
   * production snapshot: 33 of 227 analyses carrying an event timestamp
   * claimed FRESH on something older than the 36-hour window, and 19 more
   * claimed FRESH with no timestamp at all — 52 of 325, 16% unsupported. This
   * file computed the age arithmetically three lines above and still took the
   * colour from the model's word, so a catalyst stamped `28d` rendered green.
   *
   * HIS RULINGS SUPERSEDED THIS TWICE AND THE COMMENT IS REWRITTEN, NOT
   * PATCHED. It used to say the demotion goes to RECENT and the model keeps
   * its call past the window. On 2026-09-23 he ruled arm 5 STALE, because
   * STALE is what puts `no fresh news` on the row; on 2026-09-24 he defined
   * freshness as calendar bands, which removes the model from the judgement
   * altogether. A comment describing a rule that was replaced twice is worse
   * than none — it reads as the reason the code is shaped this way.
   *
   *     today       FRESH        yesterday   RECENT        older   STALE
   *
   * THE PRIOR-CLOSE REFINEMENT IS WIRED NOW, AND THE ROUTE IS THE POINT.
   *
   * This comment used to say the refinement COULD NOT be wired from this file,
   * and that was true of the obvious route: `resolveCatalystFreshness` takes
   * the prior session's close as an optional third argument, its own
   * documentation says the caller supplies it "because only the caller has the
   * store", and THIS CALLER IS THE BROWSER — `resolveWhy` runs inside
   * `'use client'` components, where there is no database, no exchange
   * calendar and no `previousTradingDate`.
   *
   * The server computes it once per snapshot and puts it on the payload
   * (`MarketSnapshot.catalystFreshFrom`, `7a0ad0c`), and the MERGE puts it on
   * the row. So this file reads it off the row like any other fact, and the
   * four callers of `resolveWhy` pass nothing and cannot forget anything. A
   * fourth argument would have been four call sites to keep in step, on the
   * one reading that has already produced a colour disagreeing with the words
   * beside it twice.
   *
   * NULL IS THE DAY BANDS, AND THAT IS A RULE RATHER THAN A FALLBACK — his
   * date-only ruling, unchanged. It is what an offline market, a degraded
   * snapshot and every test fixture get, and it is what 77% of stored
   * timestamps get anyway because a bare date states no time of day and cannot
   * be tested against an instant.
   *
   * THE REFINEMENT CAN ONLY PROMOTE. `resolveCatalystFreshness` returns FRESH
   * early or falls through to the same bands it always used, so no row can
   * move the other way and none can leave FRESH. That is by construction, not
   * by observation — which is what makes "any row demoting is a defect" a
   * usable tripwire rather than a hope.
   */
  const freshness: CatalystFreshness | null = catalyst
    ? resolveCatalystFreshness(
        catalyst.eventTimestamp,
        new Date(nowMs),
        row.catalystFreshFrom ? new Date(row.catalystFreshFrom) : null,
      )
    : null;

  const tone: DeskWhy['tone'] = freshness ? FRESHNESS_TONE[freshness] : 'dim';

  /*
   * A PROMOTED ROW SHOWS WHAT MADE IT GREEN, NOT HOW OLD IT IS. His ruling,
   * 2026-09-25, option (a): replace the age with the reason.
   *
   * THE DEFECT IT REMOVES IS A PAIRING, NOT A WRONG VALUE. The age is elapsed
   * days; the colour is the session boundary. Within one day they agree and
   * `16h` beside green reads fine — which is exactly why this was invisible on
   * the Friday it was found. ON A MONDAY THE BOUNDARY REACHES BACK ACROSS THE
   * WEEKEND (`MAX_FRESH_FROM_AGE_MS` is five days precisely so a long weekend
   * still qualifies), so the row renders `3d` in green and a name wearing
   * `no fresh news` on Friday is FRESH on Monday. A number beside a word reads
   * as the word's evidence, and `3 days old` is not evidence of freshness.
   *
   * ASKED BY CALLING THE SHIPPED FUNCTION TWICE, NOT BY ADDING A `via` FIELD
   * TO IT. "Promoted" means FRESH with the boundary and not FRESH without it,
   * which is the definition rather than a restatement of it — so this cannot
   * drift from the branch it describes, and `lib/research/time.ts` is
   * untouched. Both calls are pure; the second costs one more parse per row.
   *
   * NOTHING IS LOST. The exact ET instant is already the `title` on this
   * element (`DecisionCells.tsx:424` renders `why.eventAt` there), so the age
   * moves from the cell to the hover rather than disappearing.
   */
  const promotedByPriorClose =
    freshness === 'FRESH' &&
    catalyst !== null &&
    row.catalystFreshFrom !== null &&
    resolveCatalystFreshness(catalyst.eventTimestamp, new Date(nowMs)) !== 'FRESH';

  const priorClose = promotedByPriorClose ? priorCloseLabel(row.catalystFreshFrom) : null;

  /*
   * ONE BADGE FIRED FOR TWO DIFFERENT FACTS, AND THEY ARE NOT THE SAME NEWS.
   *
   * `no fresh news` fired both when the desk found NO catalyst and when it
   * found one that is old. Those argue differently: the first says nothing
   * happened, the second says something did and it was a while ago. He defined
   * the older band as OLD on 2026-09-24, so the row can now say which.
   *
   * BOTH STILL REQUIRE `plausiblyExplainsMove !== true`, unchanged. A month-old
   * catalyst the desk believes is still driving the move is old, and neither
   * "no fresh news" nor a warning is the right sentence about it.
   */
  const unexplained = catalyst !== null && catalyst.plausiblyExplainsMove !== true;
  const nothingFound = unexplained && catalyst.catalystStatus === 'NONE_FOUND';
  const onlyOld = unexplained && !nothingFound && freshness === 'STALE';

  /*
   * AN OLD CATALYST IS NOT THE MOVER'S REASON, AND THE ROW STOPS SAYING IT IS.
   * His ruling, 2026-09-29T14:46:55Z ("2, your recs"): the letter DIMS, and
   * the headline reads "No fresh catalyst · latest: <date> — <summary>".
   * `OLD` stays; NONE_FOUND rows are unchanged. The date and the summary are
   * the SAME item's -- the desk's catalyst, whose time made it OLD -- never
   * the Sheet's line under the desk's date. SLND showed a four-day-old
   * listing notice as an amber C headline this way.
   */
  const day = onlyOld ? etDay(eventAt) : null;
  const summary = catalyst?.summary?.trim() || null;
  const oldHeadline = onlyOld
    ? `No fresh catalyst · latest: ${[day, summary].filter(Boolean).join(' · ') || 'no summary'}`
    : null;

  return {
    code: nothingFound ? 'NO_FRESH_CATALYST' : onlyOld ? 'OLD_CATALYST' : 'GRADED',
    grade,
    /*
     * `priorClose ?? age`, never both. Two quantities in one slot is the thing
     * being removed, not a layout to economise on: `3d · since Fri close`
     * would put the contradiction inside one cell instead of across two.
     */
    age: priorClose ?? age,
    ageIsPriorClose: priorClose !== null,
    eventAt: etTimestamp(eventAt),
    headline: oldHeadline ?? headline,
    explainsMove: catalyst?.plausiblyExplainsMove ?? null,
    freshness,
    tone: onlyOld ? 'dim' : tone,
    title: onlyOld ? oldTitle(grade) : whyTitle(grade, freshness, priorClose),
  };
}

/** The letter's hover on an OLD row, where the colour no longer carries freshness. */
function oldTitle(grade: string): string {
  const meaning = GRADE_MEANING[grade];
  const letter = meaning ? `Catalyst grade ${grade}: ${meaning}.` : 'No catalyst grade established.';
  return `${letter} Dimmed: the latest catalyst is older than yesterday and the desk does not think it explains today's move, so the grade rates an old item, not this move.`;
}

const GRADE_MEANING: Record<string, string> = {
  A: 'strong, or legitimately positive',
  B: 'moderate, mixed or secondary',
  C: 'weak, negative or dilutive',
};

const FRESHNESS_MEANING: Record<CatalystFreshness, string> = {
  FRESH: 'green because the catalyst is FRESH',
  RECENT: 'amber because the catalyst is RECENT rather than fresh',
  STALE: 'amber because the catalyst is STALE',
  UNKNOWN: 'grey because the desk could not establish how fresh it is',
};

/**
 * The cell's own explanation of its two axes.
 *
 * TWO QUANTITIES IN ONE GLYPH, and naming only one of them is how the letter
 * came to be read as freshness. The letter is the GRADE — how strong the
 * catalyst is — and the colour is the FRESHNESS. A green `B` is a fresh
 * catalyst the desk rates moderate, which is unreadable unless both are said.
 */
function whyTitle(
  grade: string,
  freshness: CatalystFreshness | null,
  priorClose: string | null = null,
): string {
  const meaning = GRADE_MEANING[grade];
  const letter = meaning
    ? `Catalyst grade ${grade}: ${meaning}. That is how STRONG it is, not how fresh.`
    : 'No catalyst grade established.';

  // Silence rather than a sentence about a colour that is carrying nothing:
  // with no freshness the letter renders dim and says only what it is.
  const colour = freshness ? ` The colour is its FRESHNESS: ${FRESHNESS_MEANING[freshness]}.` : '';
  /*
   * THE CELL NO LONGER STATES THE AGE, SO THE HOVER MUST SAY WHY. Without this
   * the row says `since Fri close` in green and the reader is left to work out
   * whether that is one day or four -- which is the information the change
   * moved off the cell, not information it was entitled to delete.
   */
  const why = priorClose
    ? ` It is FRESH because it broke after the prior session's close (${priorClose}), so the market has not traded on it yet -- not because it is recent by the calendar. The exact time is below.`
    : '';
  return `${letter}${colour}${why}`;
}

function gradeLetter(grade: string): string {
  if (grade === 'STRONG' || grade === 'LEGITIMATE_POSITIVE') return 'A';
  if (grade === 'MODERATE_MIXED_SECONDARY') return 'B';
  if (grade === 'WEAK_NEGATIVE_DILUTIVE' || grade === 'NONE') return 'C';
  return '—';
}

function gradeTone(grade: string): DeskWhy['tone'] {
  if (grade === 'A') return 'pos';
  if (grade === 'C') return 'warn';
  return 'dim';
}

/**
 * The catalyst, as a row's accessible name says it.
 *
 * The cell prints "—" when there is no grade, and the row's spoken label used
 * to interpolate it: a screen reader heard "[dash] catalyst", a glyph read
 * aloud in place of a fact (and his no-em-dash rule's empty-cell exception is
 * for a cell, not for a sentence). So the label says WHY there is no grade, the
 * same distinction the cell's hover draws.
 */
export function whySpoken(why: Pick<DeskWhy, 'grade' | 'code'>): string {
  const grade = why.grade.trim();
  if (/^[A-Z]$/.test(grade)) return `${grade} catalyst`;
  if (grade !== '' && grade !== '\u2014') return `catalyst ${grade}`;
  if (why.code === 'NOT_RESEARCHED') return 'not researched';
  if (why.code === 'RESEARCHING') return 'catalyst being researched';
  return 'no catalyst grade';
}
