/**
 * Citation tokens the INTERPRETER MODEL writes into dossier prose, removed.
 *
 * The model is told to cite source ids (`openaiInterpreter.ts`), and it does so
 * in `evidenceSourceIds`, but it also leaves the ids inline in its text, in two
 * forms seen in production (Design's find, measured 2026-10-01, `04fefaa7`):
 *   "...and a SPAC sponsor manager. [Source 115982]"         (TGE, version 2624)
 *   "...commercialization businesses [96174, 96176, 119985]."  (DKI, version 2625)
 * 28 of 57 business descriptions written since 2026-10-01T00:00Z carry a
 * bracket, and "[Source" sits in 120 older versions' other fields. A reader
 * sees a database id, which means nothing to him, on a surface he pays for.
 *
 * WHAT THE PATTERN ADMITS (removes), with any whitespace before it:
 *   - a bracket opening with "Source" or "Sources" (any case), then one or more
 *     ids, each optionally re-prefixed: "[Source 115982]",
 *     "[Source 119113, Source 118074]", "[Sources 4512, 4513]";
 *   - a bracket of BARE numbers of FIVE OR MORE DIGITS, comma-separated:
 *     "[96174, 96176, 119985]". Five digits because every source id seen is
 *     five or six, and it keeps a year ("[2026]") or a footnote ("[1]").
 * WHAT IT REFUSES (keeps): any bracket with a letter that is not the Source
 * prefix ("[sic]", "[NASDAQ: TGE]", "[Q3]"), a bare number under five digits,
 * and anything with other punctuation inside ("[$1.2M]", "[1-3]").
 *
 * One pattern for every surface: the interpreter's write (`guardrails.ts`),
 * and the readers that show stored text, so rows already written are cleaned
 * without re-analysis.
 */

const CITATION =
  /\s*\[(?:sources?\s*\d+(?:\s*,\s*(?:sources?\s*)?\d+)*|\d{5,}(?:\s*,\s*\d{5,})*)\]/gi;

/** The text with every citation token removed; nothing else changes. */
export function withoutCitations(text: string): string {
  return text.replace(CITATION, '');
}

/** Every string in a JSON-shaped value, with citation tokens removed. Numbers, ids and keys are untouched. */
export function withoutCitationsDeep<T>(value: T): T {
  if (typeof value === 'string') return withoutCitations(value) as T;
  if (Array.isArray(value)) return value.map((item) => withoutCitationsDeep(item)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = withoutCitationsDeep(item);
    return out as T;
  }
  return value;
}
