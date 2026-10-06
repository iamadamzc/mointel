/**
 * Engine vocabulary, said in words.
 *
 * `SECONDARY_STALE`, `AUTO_SOURCE_GAP`, `YELLOW_FRONTSIDE_WARNING` and
 * `REGISTERED_RESALE · POSSIBLY_ACTIVE` were all rendered verbatim into a
 * trader's dossier. They describe how the engine reached a conclusion, not
 * anything true about the stock, and that is the class of label this desk has
 * rejected before.
 *
 * This lives outside the component that renders it for one reason: it is the
 * rule, and a rule that cannot be tested is a habit. The first pass at this
 * humanised the comparison table's *reason* column and missed its value
 * columns, which only showed up against production data — there is no
 * comparison table to render until a ticker has both an outside read and a desk
 * accepted dossier, and no local fixture had both.
 */

import { CATALYST_GRADE_LABEL, CYCLE_LABEL, STRUCTURE_LABEL } from '@/lib/research/view';

/** Phrases for the values that carry more meaning than a de-underscoring gives. */
const ENUM_PHRASE: Record<string, string> = {
  /* Why two sides differ. */
  AUTO_SOURCE_GAP: 'the desk research had not seen the newer source',
  INTERPRETATION_DIFFERENCE: 'both sides had evidence and read it differently',
  SHEET_ONLY: 'only the outside research reached a conclusion',
  AUTO_ONLY: 'only the desk research reached a conclusion',
  AGREE: 'agree',
  DISAGREE: 'disagree',

  /* Catalyst. */
  NONE_FOUND: 'no catalyst found in our sources',
  FRESH_FOUND: 'fresh catalyst found',
  SECONDARY_STALE: 'secondary and stale',
  LEGITIMATE_POSITIVE: 'legitimate positive',
  MODERATE_MIXED_SECONDARY: 'moderate / mixed / secondary',
  WEAK_NEGATIVE_DILUTIVE: 'weak / negative / dilutive',

  /* Structure and supply. Capacity is never restated as selling. */
  DIRTY_FLOAT: 'dirty float',
  UNKNOWN_STRUCTURE: 'unknown structure',
  POSSIBLY_ACTIVE: 'possibly active',
  NOT_YET_ACTIVE: 'not yet active',
  REGISTERED_RESALE: 'registered resale',
  SHELF_CAPACITY: 'shelf capacity',

  /* Cycle. The colour word is kept: it is how the desk says these out loud. */
  GREEN_FRESH_FRONTSIDE: 'green, fresh / frontside',
  YELLOW_FRONTSIDE_WARNING: 'yellow, frontside warning',
  RED_BACKSIDE: 'red, backside',
  FORMER_RUNNER: 'former runner',
  FORMER_SUPERRUNNER: 'former superrunner',

  /* Evidence. */
  SEC_SUBMISSIONS: 'SEC submissions',
  SEC_FILING: 'SEC filing',
  ISSUER_NEWSROOM: 'issuer newsroom',
};

/**
 * One engine value, in trader language.
 *
 * A named phrase when there is one; otherwise the underscores go and the
 * shouting stops. Nothing reaches a trader-facing surface in SCREAMING_SNAKE.
 */
export function humanise(value: string | null | undefined): string {
  if (!value) return 'unknown';
  const known = ENUM_PHRASE[value];
  if (known) return known;
  return value.replace(/_/g, ' ').toLowerCase();
}

/** True when a string still reads as an engine constant rather than as English. */
export function looksLikeEnum(value: string): boolean {
  return /\b[A-Z][A-Z0-9]*(_[A-Z0-9]+)+\b/.test(value);
}

/**
 * A stored assessment value, in the words the rest of the desk uses.
 *
 * WHY NOT JUST `humanise`. These four columns hold the dossier's typed enums,
 * and every one of them already HAS a canonical label that other surfaces
 * render — `RED_BACKSIDE` is `RED — BACKSIDE` in the drawer and on the board.
 * Lower-casing it here would give one value two vocabularies, which is the
 * defect that put `OFF HIGH` on one table and `BACKSIDE` on another for the
 * same ticker. So the canonical map is asked first.
 *
 * `humanise` IS THE FLOOR, NOT THE ANSWER. The columns are typed `string |
 * null` in the store, so a row written under an older vocabulary can hold a
 * value no current map knows. That value still must not reach the trader as
 * SCREAMING_SNAKE, so it falls through to `humanise` rather than to itself.
 *
 * HALT IS SILENT WHEN TRADING, matching `HaltBadge`, which renders nothing in
 * that state. A column reading `trading` on every row is a constant dressed as
 * content — and two conventions for one field is how the vocabularies split in
 * the first place.
 */
export function snapshotLabel(
  field: 'cycle' | 'catalyst' | 'structure' | 'halt',
  value: string | null | undefined,
): string {
  if (!value) return '—';

  const canonical =
    field === 'cycle'
      ? CYCLE_LABEL[value as keyof typeof CYCLE_LABEL]
      : field === 'catalyst'
        ? CATALYST_GRADE_LABEL[value as keyof typeof CATALYST_GRADE_LABEL]
        : field === 'structure'
          ? STRUCTURE_LABEL[value as keyof typeof STRUCTURE_LABEL]
          : undefined;
  if (canonical) return canonical;

  if (field === 'halt') {
    if (value === 'TRADING') return '—';
    if (value === 'HALTED') return 'Halted';
    if (value === 'RESUMING') return 'Resuming';
  }

  return humanise(value);
}
