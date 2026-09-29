/**
 * What each catalyst grade means -- one text, read by the prompt AND the
 * schema, so the two cannot say different things.
 *
 * Until this existed the prompt defined no grade and `schema.ts` declared the
 * enum with no description, so the model decided what each meant. Measured on
 * the 2026-08-23 snapshot: 15 analyses mentioning a reverse split graded 6
 * red, 6 mixed, 2 unknown, 1 none, and one ticker (SCNI) red once and mixed
 * once. The same event receiving different grades is the defect.
 *
 * HIS RULING, 2026-09-29T14:46:55Z ("2, your recs"), adopting Integration's
 * recommendations on `docs/research/catalyst-grade-definitions-draft.md`:
 * adopt the definitions and the ambiguous-event placements; reverse splits BY
 * CONTEXT (option C); do NOT split WEAK_NEGATIVE_DILUTIVE now.
 *
 * ONE CLAUSE OF THE DRAFT IS NOT HERE, ON PURPOSE. The draft defined STRONG
 * and LEGITIMATE_POSITIVE as "fresh" events and MODERATE_MIXED_SECONDARY as
 * including "an event outside the fresh window". That asks the model to judge
 * AGE -- the question his 2026-09-24 ruling took away from it (`a12bfd6`:
 * freshness is his calendar bands, computed from `eventTimestamp`). A grade
 * here says WHAT KIND of event it is; how old it is stays arithmetic. Keeping
 * the clause would have given one fact two authorities, one of them the model.
 */

import type { CatalystGrade } from '../types';

export const CATALYST_GRADE_DEFINITIONS: Record<CatalystGrade, string> = {
  STRONG:
    'a company-specific event that could by itself explain a large move, cited from a primary source, with its material number stated (deal value, trial result, approval).',
  LEGITIMATE_POSITIVE:
    'a company-specific favourable event, verifiable from a cited primary source (release or filing), not necessarily transformative: a contract award, a partnership, an approval, listing compliance regained when the exchange notice confirms it.',
  MODERATE_MIXED_SECONDARY:
    'favourable and adverse elements together, OR only secondary coverage (roundups, recaps). The summary says which.',
  WEAK_NEGATIVE_DILUTIVE:
    'an adverse event (failed trial, delisting or non-compliance notice, restatement, going-concern doubt, late filing) OR new share supply (offering, PIPE, ATM, warrant exercise, resale registration).',
  NONE: 'coverage was adequate and no company-specific event is in the evidence.',
  UNKNOWN: 'coverage was incomplete, or the event cannot be classified from the evidence.',
};

/**
 * The events the snapshot graded inconsistently, and where each sits.
 *
 * Capacity is not issuance: a shelf with no takedown and a proposal to raise
 * authorised shares are the ability to create supply, which is what the
 * dossier's supply ledger already distinguishes (`SHELF_CAPACITY`,
 * `NOT_YET_ACTIVE`).
 */
export const CATALYST_GRADE_PLACEMENTS: readonly string[] = [
  'A shelf registration with no takedown, or a proposal to increase authorised shares: MODERATE_MIXED_SECONDARY. It is capacity to issue, not issuance.',
  'Listing compliance regained, or an uplisting: LEGITIMATE_POSITIVE when the exchange notice confirms it.',
  'A pure identifier change (CUSIP, name or ticker) is not a catalyst: grade as if it were absent.',
  'A REVERSE SPLIT, or an ADS ratio change, is graded BY CONTEXT. If the evidence also shows a listing deficiency or delisting notice, or a financing (offering, PIPE, ATM, warrant exercise), it is WEAK_NEGATIVE_DILUTIVE, and the summary names that paired event. Otherwise it is MODERATE_MIXED_SECONDARY as a structural change, and the summary says no financing or listing notice was found alongside it.',
];

/** The prompt block. */
export function catalystGradePromptBlock(): string {
  const grades = (Object.keys(CATALYST_GRADE_DEFINITIONS) as CatalystGrade[])
    .map((grade) => `- ${grade}: ${CATALYST_GRADE_DEFINITIONS[grade]}`)
    .join('\n');
  const placements = CATALYST_GRADE_PLACEMENTS.map((rule) => `- ${rule}`).join('\n');
  return [
    'catalystGrade says what KIND of event the catalyst is. It does not say how old it is:',
    'the desk computes age from eventTimestamp, so never grade an event down or up for its age.',
    grades,
    '',
    'Where these events sit:',
    placements,
  ].join('\n');
}

/** The schema's description of the field: the same text, compressed to one string. */
export function catalystGradeSchemaDescription(): string {
  return catalystGradePromptBlock().replace(/\n+/g, ' ');
}
