/**
 * THE SETUP GRADE: one mapping for every surface that shows it.
 *
 * Research stores a grade and the five readings it rests on, computed ONCE at
 * the checkpoint (`docs/research/sheet-reproduction/field-contract-final-2026-10-05.md`
 * section 2). This module applies NO threshold: it only turns the stored enums
 * into the words Marketing wrote and Commercial passed
 * (`docs/marketing/setup-grade-words-draft.md`, v3 `5855bf61`). The badge, the
 * tooltip, the drawer lines, the filter options and every aria-label read from
 * here, so no surface can drift from another.
 *
 * STORED ENUMS ARE NEVER RENAMED. AVOID stays AVOID in the payload and in the
 * store; it is displayed as "D" here and nowhere else. UNKNOWN is the "Not
 * graded" state, NOT_YET is the dash, and a missing grade (null) is NOT_YET.
 *
 * WORDS ARE READINGS: no forward tense, no imperative, and none of "pick",
 * "signal", "opportunity", "avoid", "priority" or "next-session" reaches a
 * reader. Changing a word here is changing approved copy: Marketing and
 * Commercial first.
 */

export type StoredGrade = 'A' | 'B' | 'C' | 'AVOID' | 'UNKNOWN' | 'NOT_YET';
export type StoredReading = 'STRONG' | 'LIMITED' | 'RISK' | 'UNKNOWN' | 'NOT_YET';

export const CRITERIA = ['structure', 'catalyst', 'volume', 'liquidity', 'supply'] as const;
export type Criterion = (typeof CRITERIA)[number];

/** What the payload carries per ticker. Null, or absent, is NOT_YET. */
export interface SetupGrade {
  grade: StoredGrade;
  basis: Record<Criterion, StoredReading>;
  /** Which rule set produced it, e.g. 'rubric-2026-10-05'. */
  rule: string;
  /** The parent checkpoint's completed_at, ISO. The tooltip's time. */
  checkpointCompletedAt: string;
}

export type SetupGradeKind = 'letter' | 'notGraded' | 'dash';
export type SetupGradeLetter = 'A' | 'B' | 'C' | 'D';
export type SetupGradeTone = 'accent' | 'neutral' | 'dim' | 'neg';

export interface SetupGradeView {
  kind: SetupGradeKind;
  /** What the badge prints: the letter, "Not graded", or a dash. */
  label: string;
  letter: SetupGradeLetter | null;
  tone: SetupGradeTone;
  /** The tooltip, one string, as the popover shows it. */
  tooltip: string;
  /** The badge's accessible name. */
  ariaLabel: string;
}

/** Criterion names as a reader sees them. The cycle is "cycle", not "Structure". */
export const CRITERION_NAME: Record<Criterion, string> = {
  structure: 'cycle',
  catalyst: 'catalyst',
  volume: 'relative volume',
  liquidity: 'liquidity',
  supply: 'share supply',
};

const READING_SENTENCE: Record<'A' | 'B' | 'C' | 'D', string> = {
  A: 'The highest grade on these criteria.',
  B: 'One or more criteria read below the strongest, or could not be read.',
  C: 'A weaker reading: the cycle reads as a backside.',
  D: 'Risk outweighs the setup.',
};

export const NOT_GRADED_REASON = 'Fewer than three of the five criteria could be read.';
export const NO_RESEARCH_TOOLTIP = 'The desk has no research on this name at this checkpoint.';
/** The board's own empty-cell glyph (U+2014), built by code so no source line carries it. */
export const DASH = String.fromCharCode(0x2014);

/**
 * The standing legend, once per board. Verbatim; "have not been tested against
 * outcomes" is a factual claim that EXPIRES the day any outcome test runs, and
 * is then deleted, never replaced with a result.
 */
export const SETUP_GRADE_LEGEND =
  'Setup grade is the desk’s own automatic reading of five criteria at the checkpoint shown: cycle, catalyst, relative volume, liquidity and share supply. It is the same for every reader. It is not a prediction, not a recommendation, and the grades have not been tested against outcomes. A dash in this column means the desk has no research on the name at that checkpoint. Not graded means fewer than three of the five criteria could be read.';

/** The five readings in words, one line per criterion (the drawer's detail lines). */
export const READING_LINE: Record<Criterion, Record<StoredReading, string>> = {
  structure: {
    STRONG: 'Fresh or frontside.',
    LIMITED: 'Frontside, with a warning.',
    RISK: 'Backside.',
    UNKNOWN: 'The cycle could not be read.',
    NOT_YET: 'The cycle could not be read.',
  },
  catalyst: {
    STRONG: 'A strong or clearly positive catalyst.',
    LIMITED: 'A moderate or mixed catalyst, or none found in our sources.',
    RISK: 'A weak, negative or dilutive catalyst.',
    UNKNOWN: 'The catalyst could not be graded.',
    NOT_YET: 'The catalyst could not be graded.',
  },
  volume: {
    STRONG: 'Reads heavy on the desk’s scale.',
    LIMITED: 'Reads moderate on the desk’s scale.',
    RISK: 'Reads light on the desk’s scale.',
    UNKNOWN: 'Volume could not be read.',
    NOT_YET: 'Volume could not be read.',
  },
  liquidity: {
    STRONG: 'Tight spread, deep dollar volume.',
    LIMITED: 'In between.',
    RISK: 'Wide spread or thin dollar volume.',
    UNKNOWN: 'Spread or dollar volume could not be read.',
    NOT_YET: 'Spread or dollar volume could not be read.',
  },
  supply: {
    STRONG: 'A clean share structure with a small float bound.',
    LIMITED: 'A caution on the share structure, or clean without a small bound.',
    RISK: 'A dirty float.',
    UNKNOWN: 'The share structure could not be read.',
    NOT_YET: 'The share structure could not be read.',
  },
};

const ET_TIME = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const ET_DAY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const ET_DAY_LABEL = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
});

/**
 * The checkpoint's time in ET. A bare clock time read the next morning is a
 * value with no frame, so a checkpoint that was not today (in ET) carries its
 * day: "Oct 4, 20:05". Today's reads "15:42", as Marketing's template has it.
 * The dated form is an addition to the approved template and is flagged to
 * Marketing.
 */
export function checkpointTimeET(completedAtIso: string, nowIso: string): string {
  const at = new Date(completedAtIso);
  const time = ET_TIME.format(at);
  if (ET_DAY.format(at) === ET_DAY.format(new Date(nowIso))) return time;
  return `${ET_DAY_LABEL.format(at)}, ${time}`;
}

const GROUPS: ReadonlyArray<{ title: string; match: (r: StoredReading) => boolean }> = [
  { title: 'Strong', match: (r) => r === 'STRONG' },
  { title: 'Limited', match: (r) => r === 'LIMITED' },
  { title: 'Risk', match: (r) => r === 'RISK' },
  { title: 'Not readable', match: (r) => r === 'UNKNOWN' || r === 'NOT_YET' },
];

/**
 * "Strong: relative volume, catalyst. Limited: cycle. Not readable: share
 * supply." Groups in that order, empty groups omitted; inside a group the
 * criteria follow the legend's order (cycle, catalyst, relative volume,
 * liquidity, share supply). "Rests on", never "drove": it names the basis and
 * claims no cause.
 */
export function basisLine(basis: Record<Criterion, StoredReading>): string {
  const parts: string[] = [];
  for (const group of GROUPS) {
    const names = CRITERIA.filter((c) => group.match(basis[c])).map((c) => CRITERION_NAME[c]);
    if (names.length > 0) parts.push(`${group.title}: ${names.join(', ')}.`);
  }
  return parts.join(' ');
}

const DASH_VIEW: SetupGradeView = {
  kind: 'dash',
  label: DASH,
  letter: null,
  tone: 'dim',
  tooltip: NO_RESEARCH_TOOLTIP,
  ariaLabel: 'No setup grade: the desk has no research on this name at this checkpoint',
};

/** The one mapping. `nowIso` only frames the checkpoint time (today or dated). */
export function setupGradeView(grade: SetupGrade | null | undefined, nowIso: string): SetupGradeView {
  if (!grade || grade.grade === 'NOT_YET') return DASH_VIEW;
  const when = checkpointTimeET(grade.checkpointCompletedAt, nowIso);
  const basis = basisLine(grade.basis);

  if (grade.grade === 'UNKNOWN') {
    return {
      kind: 'notGraded',
      label: 'Not graded',
      letter: null,
      tone: 'dim',
      tooltip: `Not graded as of ${when} ET. ${NOT_GRADED_REASON} ${basis}`.trim(),
      ariaLabel: 'Setup grade: not graded',
    };
  }

  const letter: SetupGradeLetter = grade.grade === 'AVOID' ? 'D' : grade.grade;
  return {
    kind: 'letter',
    label: letter,
    letter,
    tone: letter === 'A' ? 'accent' : letter === 'B' ? 'neutral' : letter === 'C' ? 'dim' : 'neg',
    tooltip: `Setup grade ${letter} as of ${when} ET. ${READING_SENTENCE[letter]} ${basis}`.trim(),
    ariaLabel: `Setup grade ${letter}`,
  };
}

/** The filter's options. "Not graded" is UNKNOWN only: a dash row is a different state. */
export type SetupGradeFilter = 'ALL' | 'A' | 'B' | 'C' | 'D' | 'NOT_GRADED';

export const SETUP_GRADE_FILTERS: ReadonlyArray<{ value: SetupGradeFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'A', label: 'Setup grade A' },
  { value: 'B', label: 'Setup grade B' },
  { value: 'C', label: 'Setup grade C' },
  { value: 'D', label: 'Setup grade D' },
  { value: 'NOT_GRADED', label: 'Not graded' },
];

/**
 * His 2026-09-23 rule, kept: a selected grade HIDES every row that does not
 * match, and a row with no grade never matches one.
 */
export function matchesSetupGradeFilter(
  grade: SetupGrade | null | undefined,
  filter: SetupGradeFilter,
): boolean {
  if (filter === 'ALL') return true;
  const stored = grade?.grade ?? 'NOT_YET';
  if (filter === 'NOT_GRADED') return stored === 'UNKNOWN';
  if (filter === 'D') return stored === 'AVOID';
  return stored === filter;
}

/** Sort rank, best first. A Priority sort chip uses it; it is never the default. */
const RANK: Record<StoredGrade, number> = { A: 0, B: 1, C: 2, AVOID: 3, UNKNOWN: 4, NOT_YET: 5 };
export function setupGradeRank(grade: SetupGrade | null | undefined): number {
  return RANK[grade?.grade ?? 'NOT_YET'];
}
