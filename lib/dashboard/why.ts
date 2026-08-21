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
import type { CatalystFreshness } from '@/lib/research/types';

export type WhyCode = 'GRADED' | 'NO_FRESH_CATALYST' | 'NOT_RESEARCHED' | 'RESEARCHING' | 'UNKNOWN';

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
export function relativeAge(at: string | null | undefined, nowMs: number): string | null {
  if (!at) return null;
  const ms = Date.parse(at);
  if (!Number.isFinite(ms)) return null;

  const elapsed = nowMs - ms;
  if (elapsed < 0) return null;
  if (elapsed < HOUR) return `${Math.max(1, Math.round(elapsed / MINUTE))}m`;
  if (elapsed < DAY) return `${Math.round(elapsed / HOUR)}h`;
  return `${Math.round(elapsed / DAY)}d`;
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
    };
  }

  const noFresh =
    catalyst !== null &&
    (catalyst.catalystStatus === 'NONE_FOUND' || catalyst.freshness === 'STALE') &&
    catalyst.plausiblyExplainsMove !== true;

  return {
    code: noFresh ? 'NO_FRESH_CATALYST' : 'GRADED',
    grade,
    age,
    eventAt: etTimestamp(eventAt),
    headline,
    explainsMove: catalyst?.plausiblyExplainsMove ?? null,
    freshness: catalyst?.freshness ?? null,
    tone: catalyst ? FRESHNESS_TONE[catalyst.freshness] : gradeTone(grade),
  };
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
