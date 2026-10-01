/**
 * Citation tokens the INTERPRETER MODEL writes into dossier prose, removed.
 *
 * The model is told to cite source ids (`openaiInterpreter.ts`), and it does so
 * in `evidenceSourceIds`, but it also leaves the ids inline in its text. Forms
 * seen (Design's finds, 2026-10-01; production counts `04fefaa7`):
 *   "...and a SPAC sponsor manager. [Source 115982]."           (TGE, version 2624)
 *   "...commercialization businesses [96174, 96176, 119985]."    (DKI, version 2625)
 *   "...[4473,4498]"                                              (August dossiers)
 * A reader sees a database id, which means nothing to him, on a surface he pays
 * for.
 *
 * WHAT THE PATTERN ADMITS (removes), with any whitespace before it:
 *   - a bracket opening with "Source" or "Sources" (any case), then one or more
 *     ids, each optionally re-prefixed: "[Source 115982]",
 *     "[Source 119113, Source 118074]", "[Sources 4512, 4513]";
 *   - a bracket of TWO OR MORE comma-separated bare numbers, at any width:
 *     "[96174, 96176, 119985]", "[4473,4498]". A comma list of bare numbers is
 *     unambiguous in this prose (Design), and the earliest ids are short;
 *   - a bracket holding ONE bare number of FIVE OR MORE digits: "[115982]".
 * WHAT IT REFUSES (keeps): a single bare number under five digits ("[2026]",
 * "[4460]", "[1]": a year or a footnote reads the same as a short id), any
 * bracket with a letter that is not the Source prefix ("[sic]",
 * "[NASDAQ: TGE]", "[Q3]"), and any other punctuation inside ("[$1.2M]",
 * "[1-3]").
 *
 * PUNCTUATION. A token between two sentence stops leaves ONE stop:
 * "manager. [Source 115982]." becomes "manager.", never "manager.." (Design).
 *
 * One pattern for every surface: the interpreter's write (`guardrails.ts`) and
 * the readers that show stored text, so rows already written are cleaned
 * without re-analysis.
 */

const CITATION =
  /([.!?])?\s*\[(?:sources?\s*\d+(?:\s*,\s*(?:sources?\s*)?\d+)*|\d+(?:\s*,\s*\d+)+|\d{5,})\]([.!?])?/gi;

/** The text with every citation token removed; nothing else changes. */
export function withoutCitations(text: string): string {
  return text.replace(CITATION, (_token, before: string | undefined, after: string | undefined) =>
    before && after ? before : `${before ?? ''}${after ?? ''}`,
  );
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
