/**
 * His rule, 2026-09-30T10:43:39Z: "no em dashes in any writing. hard rule."
 *
 * The desk's own copy is written without them and a test keeps it that way.
 * This is for the text the desk did NOT write but shows him: the model's
 * dossier prose and the market worker's stored event messages. It is applied
 * when that text reaches the board, so the guarantee does not depend on a
 * prompt being obeyed or on rows written before the rule existed.
 *
 * By POSITION, never a blind swap, so a sentence still reads:
 *   - between two numbers it is a range and becomes an en dash ("04:00–20:00");
 *   - a pair around a phrase is an aside and becomes parentheses;
 *   - at the start or end of the text it is dropped;
 *   - anywhere else it becomes a comma.
 * A bare dash standing alone is the empty-value glyph, which he ruled is not
 * writing ("keep it. fine for that, not writing.", 10:48:04Z), and is kept.
 */

const EM_DASH = '—';
const EN_DASH = '–';

export function withoutEmDash(text: string): string {
  const decoded = text.replace(/&mdash;|&#8212;|&#x2014;/gi, EM_DASH);
  if (!decoded.includes(EM_DASH)) return text;
  if (decoded.trim() === EM_DASH) return text;
  return decoded
    .replace(/(\d)\s*—\s*(?=[\d$])/g, `$1${EN_DASH}`)
    .replace(/\s*—\s*([^—.!?\n]{1,120}?)\s*—\s*/g, ' ($1) ')
    .replace(/^\s*—\s*/, '')
    .replace(/\s*—\s*$/, '')
    .replace(/\s*—\s*/g, ', ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\)\s+([.,;:!?])/g, ')$1')
    .replace(/,\s*([.,;:!?])/g, '$1')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/**
 * Every string inside a value, rewritten; numbers, booleans, nulls and the
 * shape untouched. For a dossier, whose prose fields are many and nested.
 */
export function withoutEmDashDeep<T>(value: T): T {
  if (typeof value === 'string') return withoutEmDash(value) as T;
  if (Array.isArray(value)) return value.map((item) => withoutEmDashDeep(item)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = withoutEmDashDeep(item);
    return out as T;
  }
  return value;
}
