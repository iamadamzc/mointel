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
 * ALSO (2026-10-09, the XRTX census `4b407649`: 169 of 181 escaped ids): the Source-prefixed form in PARENTHESES,
 * "(Source 12298)", "(Sources 138096, 138131)", "(Source 93163.)", and a semicolon between Source ids in either
 * bracket, "[Source 79129; Source 79145]". NOT a bare number list in parentheses: "(1,000)" or "(4,166,666 units)"
 * can be a real figure. NOT the bare form "Source 28817 provides ...": removing it breaks the sentence; the interpreter
 * prompt forbids it instead (`openaiInterpreter.ts`, INTERPRETER_PROMPT_VERSION 5).
 *
 * UNLESS THE TEXT'S OWN CITED IDS ARE KNOWN. A lone 1-to-4-digit bracket whose
 * value is one of the dossier's `evidenceSourceIds` IS a citation, whatever it
 * looks like: "...must not be treated as float. [2040]" (BLND) is source 2040,
 * not a year. Measured on the local 09-29 copy
 * (`docs/research/citation-residual/result.md`): of the 294 lone short brackets
 * the pattern above leaves in current dossiers, 289 are the dossier's own cited
 * ids, 0 are anything but a source id, and all 17 year-like ones read as
 * citations. A year the dossier did not cite is kept. With no ids (the report
 * company line), the lone short bracket is kept as before.
 *
 * PUNCTUATION. A token between two sentence stops leaves ONE stop:
 * "manager. [Source 115982]." becomes "manager.", never "manager.." (Design).
 *
 * One pattern for every surface: the interpreter's write (`guardrails.ts`) and
 * the readers that show stored text, so rows already written are cleaned
 * without re-analysis.
 */

const CITATION =
  /([.!?])?\s*(?:\[(?:sources?\s*\d+(?:\s*[,;]\s*(?:sources?\s*)?\d+)*|\d+(?:\s*,\s*\d+)+|\d{5,})\]|\(sources?\s*\d+(?:\s*[,;]\s*(?:sources?\s*)?\d+)*\.?\))([.!?])?/gi;

/** A lone bare number of 1 to 4 digits, removed only when it is a cited id. */
const LONE_SHORT = /([.!?])?\s*\[(\d{1,4})\]([.!?])?/g;

const keepOneStop = (before: string | undefined, after: string | undefined): string =>
  before && after ? before : `${before ?? ''}${after ?? ''}`;

/**
 * The text with every citation token removed; nothing else changes. `citedIds`,
 * when given, also removes a lone short bracket holding one of those ids.
 */
export function withoutCitations(text: string, citedIds?: ReadonlySet<number>): string {
  const cleaned = text.replace(CITATION, (_token, before: string | undefined, after: string | undefined) =>
    keepOneStop(before, after),
  );
  if (!citedIds || citedIds.size === 0) return cleaned;
  return cleaned.replace(
    LONE_SHORT,
    (token: string, before: string | undefined, digits: string, after: string | undefined) =>
      citedIds.has(Number(digits)) ? keepOneStop(before, after) : token,
  );
}

/**
 * Every number in an `evidenceSourceIds` array anywhere in the value: for a
 * dossier, the union of its blocks' cited ids, which is what the pipeline stores
 * as the version's `source_ids` (`pipeline.ts`).
 */
export function citedSourceIds(value: unknown, out: Set<number> = new Set()): Set<number> {
  if (Array.isArray(value)) {
    for (const item of value) citedSourceIds(item, out);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === 'evidenceSourceIds' && Array.isArray(item)) {
        for (const id of item) if (typeof id === 'number' && Number.isInteger(id)) out.add(id);
      } else {
        citedSourceIds(item, out);
      }
    }
  }
  return out;
}

/**
 * Every string in a JSON-shaped value, with citation tokens removed. Numbers, ids
 * and keys are untouched. The value's own `evidenceSourceIds` are collected once,
 * so a dossier's lone short citations go too (see the header).
 *
 * `knownSourceIds`: every research source id of the same ticker, cited or not. The
 * model also writes the id of a source it read but did not cite (RPGL "[1043]", the
 * ticker's SEC_SUBMISSIONS row, absent from version 2694's cited list), and that is a
 * citation as much as a cited one. The cost: a lone bracket that happens to equal one of
 * the ticker's source ids is removed even if it was meant as a year; a number the ticker
 * does not own keeps its bracket.
 */
export function withoutCitationsDeep<T>(value: T, knownSourceIds?: ReadonlySet<number>): T {
  const ids = citedSourceIds(value);
  if (knownSourceIds) for (const id of knownSourceIds) ids.add(id);
  return deep(value, ids);
}

function deep<T>(value: T, citedIds: ReadonlySet<number>): T {
  if (typeof value === 'string') return withoutCitations(value, citedIds) as T;
  if (Array.isArray(value)) return value.map((item) => deep(item, citedIds)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = deep(item, citedIds);
    return out as T;
  }
  return value;
}
