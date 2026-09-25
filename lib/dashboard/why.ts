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
  /** Relative age of the catalyst event: '12m', '16h', '3d'. Null when unknown. */
  age: string | null;
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
      eventAt: null,
      headline: 'Not researched yet.',
      explainsMove: null,
      freshness: null,
      tone: 'dim',
      title: 'Not researched yet, so there is no catalyst grade and no freshness to colour.',
    };
  }

  if (status === 'ANALYSIS_PENDING') {
    return {
      code: 'RESEARCHING',
      grade: '—',
      age: null,
      eventAt: null,
      headline: 'Looking for the catalyst.',
      explainsMove: null,
      freshness: null,
      tone: 'dim',
      title: 'The desk is looking for the catalyst now. Nothing here is a grade yet.',
    };
  }

  const catalyst = row.intelligence?.analysis?.dossier.catalyst ?? null;
  const sheetGrade = row.research?.catalyst.gradeBucket ?? null;
  const grade =
    sheetGrade && sheetGrade !== 'UNCLASSIFIED'
      ? sheetGrade
      : catalyst
        ? gradeLetter(catalyst.catalystGrade)
        : '—';

  const headline =
    row.research?.catalyst.latest?.trim() || catalyst?.summary?.trim() || null;

  const eventAt = catalyst?.eventTimestamp ?? null;
  const age = relativeAge(eventAt, nowMs);

  if (!catalyst && (!sheetGrade || sheetGrade === 'UNCLASSIFIED')) {
    return {
      code: 'UNKNOWN',
      grade: '—',
      age: null,
      eventAt: null,
      headline: headline ?? 'No catalyst established.',
      explainsMove: null,
      freshness: null,
      tone: 'dim',
      title: 'No catalyst established for this name, from either the outside research or the desk.',
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

  return {
    code: nothingFound ? 'NO_FRESH_CATALYST' : onlyOld ? 'OLD_CATALYST' : 'GRADED',
    grade,
    age,
    eventAt: etTimestamp(eventAt),
    headline,
    explainsMove: catalyst?.plausiblyExplainsMove ?? null,
    freshness,
    tone,
    title: whyTitle(grade, freshness),
  };
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
function whyTitle(grade: string, freshness: CatalystFreshness | null): string {
  const meaning = GRADE_MEANING[grade];
  const letter = meaning
    ? `Catalyst grade ${grade} — ${meaning}. That is how STRONG it is, not how fresh.`
    : 'No catalyst grade established.';

  // Silence rather than a sentence about a colour that is carrying nothing:
  // with no freshness the letter renders dim and says only what it is.
  const colour = freshness ? ` The colour is its FRESHNESS: ${FRESHNESS_MEANING[freshness]}.` : '';
  return `${letter}${colour}`;
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
