/**
 * THE FLOAT CELL: one mapping from the stored float state to the face, the
 * popover and the accessible name, for every surface that shows it.
 *
 * The float on this board is the SEC upper bound (his rulings 2026-10-05: "the
 * float is the SEC upper bound", "always show it, it's key"; the filed count's
 * date goes ON the face under his 90-day ruling). The state is computed by
 * Research (`lib/research/insiderBound.ts` `floatCell`) and stored; this module
 * applies NO rule of its own. It turns the stored state into Marketing's words
 * (`docs/marketing/float-page-draft.md`, v25 at 5ea4f398, Commercial 22b; his yes 2026-10-07T00:58:05.615Z): four faces,
 * one string per stored cause, and the page link.
 *
 * Words are claims. Nothing here may say the column is populated, that a number
 * is verified, or that the validation covers more than it does; changing a word
 * is changing passed copy, so Marketing and Commercial first.
 *
 * THE PAYLOAD IS RESEARCH'S `FloatBound` (`lib/research/floatRead.ts`, built by
 * `toFloatBound`), read here through `normalizeFloatBound`, the one place the wire
 * value enters: a missing or extra field never throws, a malformed entry is a
 * FAULT and reads "Cannot verify" (never the absence's "Not computed"), and an
 * absent or null entry is NOT_YET, the common case on the float's first day.
 */

import { BOUND_PREFIX, compactBound } from '@/lib/research/compactBound';
import type { FloatCountChecks, FloatInsider, FloatBound as ResearchFloatBound } from '@/lib/research/floatRead';
import type { FloatCellReason } from '@/lib/research/insiderBound';

/** Research's payload per ticker. Null, or absent, is NOT_YET: "Not computed". */
export type FloatBound = ResearchFloatBound;
export type FloatBoundReason = FloatCellReason;

const STATES: ReadonlySet<string> = new Set(['PRODUCED', 'UNKNOWN', 'CANNOT_VERIFY']);
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);

/**
 * The wire value to Research's type, defensively. Absent or null: null (NOT_YET).
 * Not an object, or an unknown state: a fault, CANNOT_VERIFY with no reason (the
 * generic "Cannot verify."). Each field is checked for its own type and falls back
 * to the value that claims least (null, 0, []), so PRODUCED without a usable
 * number or date is refused downstream by `floatCellView`.
 */
export function normalizeFloatBound(raw: unknown): FloatBound | null {
  if (raw === null || raw === undefined) return null;
  const fault: FloatBound = {
    state: 'CANNOT_VERIFY',
    reason: null,
    bound: null,
    countAsOf: null,
    countFiled: null,
    subtractedHolders: 0,
    filingsReadOn: '',
    holdingsFiledOn: [],
    countShares: null,
    countForm: null,
    insiders: [],
  };
  if (typeof raw !== 'object' || Array.isArray(raw)) return fault;
  const r = raw as Record<string, unknown>;
  if (typeof r.state !== 'string' || !STATES.has(r.state)) return fault;
  return {
    state: r.state as FloatBound['state'],
    reason: typeof r.reason === 'string' ? (r.reason as FloatBoundReason) : null,
    bound: typeof r.bound === 'number' && Number.isFinite(r.bound) ? r.bound : null,
    countAsOf: isDate(r.countAsOf) ? r.countAsOf : null,
    countFiled: isDate(r.countFiled) ? r.countFiled : null,
    subtractedHolders: typeof r.subtractedHolders === 'number' ? r.subtractedHolders : 0,
    filingsReadOn: isDate(r.filingsReadOn) ? r.filingsReadOn : '',
    holdingsFiledOn: Array.isArray(r.holdingsFiledOn) ? r.holdingsFiledOn.filter(isDate) : [],
    countShares: typeof r.countShares === 'number' && Number.isFinite(r.countShares) ? r.countShares : null,
    countForm: typeof r.countForm === 'string' ? r.countForm : null,
    // A malformed insider row is dropped, never shown with invented values.
    insiders: Array.isArray(r.insiders) ? r.insiders.flatMap(insiderOf) : [],
    // Absent stays absent: "no record of a check" is a different sentence from a recorded NOT_RUN (Commercial 89e).
    ...(checksOf(r.countChecks) ? { countChecks: checksOf(r.countChecks)! } : {}),
  };
}

const SPLITS: ReadonlySet<string> = new Set(['NONE', 'FOUND', 'UNPROVEN', 'NOT_RUN']);
const AGES: ReadonlySet<string> = new Set(['WITHIN', 'TOO_OLD', 'AFTER_DATE', 'NOT_RUN']);

/** Research's `countChecks`, or undefined when absent or malformed (either value outside its union): no record. */
function checksOf(raw: unknown): FloatCountChecks | undefined {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const c = raw as Record<string, unknown>;
  if (typeof c.split !== 'string' || !SPLITS.has(c.split) || typeof c.age !== 'string' || !AGES.has(c.age)) return undefined;
  return { split: c.split as FloatCountChecks['split'], age: c.age as FloatCountChecks['age'] };
}

function insiderOf(raw: unknown): FloatInsider[] {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const i = raw as Record<string, unknown>;
  if (typeof i.ownerCik !== 'string' || typeof i.shares !== 'number' || !Number.isFinite(i.shares)) return [];
  return [
    {
      ownerCik: i.ownerCik,
      ownerName: typeof i.ownerName === 'string' ? i.ownerName : null,
      title: typeof i.title === 'string' ? i.title : null,
      shares: i.shares,
      heldAsOf: isDate(i.heldAsOf) ? i.heldAsOf : null,
      filedOn: Array.isArray(i.filedOn) ? i.filedOn.filter(isDate) : [],
    },
  ];
}

/** `filedCount`: a refused row printing the company's FILED share count (float fix 1); never a bound, never sorted. */
export type FloatFaceKind = 'bound' | 'filedCount' | 'unknown' | 'cannotVerify' | 'notComputed';

/** The filed-count face's one icon: `caveat` (checks passed, refused for another reason) or `warning`. */
export type FiledCountIcon = 'caveat' | 'warning';

export interface FloatCellView {
  kind: FloatFaceKind;
  /** The number on the face ("≤ 12.3M", "12.3M sh") or the word. */
  face: string;
  /** The filed count's date beside the number (m/d), bound face only. */
  date: string | null;
  /** The filed-count face's icon and its hover; null on every other face. */
  icon: { kind: FiledCountIcon; title: string } | null;
  ariaLabel: string;
  /** The popover's paragraphs, before the page link (kept for surfaces that print prose). */
  paragraphs: string[];
  /** The click-through panel (his Variant A): rows, then per-insider rows when names may print. */
  details: FloatDetails;
}

/*
 * THE CLICK-THROUGH, VARIANT A (his choice, 2026-10-07T00:51:24.442Z, "A, hedge it"; sketch
 * docs/Design/float-cell-more-to-know-2026-10-07.md). Words: Marketing
 * docs/marketing/float-click-through-words-2026-10-07.md at 1ee54def, passed by Commercial (23b, 23c).
 * Commercial 23's build conditions, both enforced here:
 * - NO per-insider date prints: Research 1cfc0d14 now carries the subtracted holding's own date
 *   (`heldAsOf`), but the passed row form has no date, so a row is "{owner}: {shares} shares subtracted,
 *   held directly." only, until Marketing's words add one;
 * - owner NAMES only on the signed-in board ("not on the public page, in reports or in exports"):
 *   the caller passes `namesAllowed`, and SHOW_INSIDER_NAMES switches them off everywhere in one place.
 *   An insider filed with no name reads "An insider" on that row only (Integration 32nd); the others keep theirs.
 * Never "at least", "probably", or "available to trade" as the thing bounded.
 */
export const SHOW_INSIDER_NAMES = true;

export interface FloatDetailRow {
  /** Null for the headline and the read-on line, which carry no label. */
  label: string | null;
  text: string;
}

export interface FloatDetails {
  rows: FloatDetailRow[];
  /** "{owner}: {shares} shares subtracted, held directly.", largest first; empty when names may not print. */
  insiders: string[];
}

export const FLOAT_DETAILS_WORDS = {
  headline: (x: string, d: string) =>
    // TMI Float (his yes 2026-10-09T22:52:40.779Z; Marketing 00130acf, Commercial read 67).
    `TMI Float, shares outstanding less insider holdings: no more than ${x} shares as of ${d}, when the filings line up.`,
  definitionLabel: 'Float, taking it as shares outstanding less insider holdings',
  definition:
    'The number above subtracts only the insider holdings the desk can see, so it is an upper bound on that figure, not on the shares that can trade on a given day, which can be more, because insiders can sell.',
  countLabel: 'Filed share count',
  count: (shares: string, asOf: string, form: string, filed: string) => `${shares} shares as of ${asOf}, from a ${form} filed ${filed}.`,
  insidersLabel: "Less insiders' holdings",
  insiders: (n: number, total: string, fetched: string, d: string) =>
    `${n} insider${n === 1 ? '' : 's'}, ${total} shares, as filed through ${fetched}. For each insider we take the smaller of their holding as of the count's date and their latest holding dated on or before ${d}, so a sale filed since the count is added back and a sale not yet filed cannot be seen.`,
  insiderRow: (owner: string, shares: string) => `${owner}: ${shares} shares subtracted, held directly.`,
  /** The owner on a row whose filing carries no name (Marketing 1ee54def's no-name form, capitalised to open the row). */
  unnamedInsider: 'An insider',
  notSubtractedLabel: 'Not subtracted',
  notSubtracted:
    "Indirect holdings, joint filings, the beneficial-ownership totals reported on Schedule 13D or 13G, owners with no holding on file as of the count's date or within the filing window, and holdings left out because of a share split. Leaving each of them out can only leave this figure higher than the true one, when the filings line up.",
  linedUpLabel: 'Lined up means',
  linedUp: (countDate: string, d: string) =>
    `A filed count dated ${countDate}, at most 90 days before ${d}, no share issuance the desk has flagged, no final prospectus for an offering of securities (SEC form 424B1, 424B2, 424B4 or 424B5) and no report of an unregistered sale of shares (Form 8-K item 3.02) filed on or after the count date, and no share split since the count. A sale not yet filed cannot be seen.`,
  readOn: (fetched: string) => `Filings read on ${fetched}.`,
  ariaSuffix: '; details on click',
} as const;

const exactShares = (n: number) => Math.round(n).toLocaleString('en-US');

/** {D-label}: the date the claim is for (the board's date); "the checkpoint" where no date is shown. */
function dLabel(surface: FloatSurface): string {
  return longDate(surface.dateShown) ?? 'the checkpoint';
}

/**
 * The public page's route (Web's, 2026-10-05). A URL a stranger reads is public
 * copy and is his to approve; if he renames it, this value and Web's route
 * directory change in the same release, which must also carry the nginx
 * exemption or the link 401s for a stranger.
 */
export const FLOAT_PAGE_HREF = '/are-float-quotes-real';

export const FLOAT_PAGE_LINK_LEAD = 'Read how float numbers are made:';
export const FLOAT_PAGE_LINK_LABEL = 'Are float quotes real?';

/** The once-only legend under the board, and the column header's hover once the float is wired. v25, verbatim. */
export const FLOAT_LEGEND =
  "TMI Float: shares outstanding less insider holdings, computed from SEC filings. An upper bound as of the date of the board or report, when the filings line up. The date beside the number is the filed share count's.";

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(iso: string | null | undefined): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? { y, m, d } : null;
}

/** "9/22": month and day, no year (a count within 90 days cannot be mistaken across years). */
export function shortDate(iso: string | null | undefined): string | null {
  const p = parts(iso);
  return p ? `${p.m}/${p.d}` : null;
}

/** "Sep 22, 2026": the full date, for the popover and the accessible name. */
export function longDate(iso: string | null | undefined): string | null {
  const p = parts(iso);
  return p ? `${MONTHS[p.m - 1]} ${p.d}, ${p.y}` : null;
}

const UNKNOWN_TEXT: Partial<Record<FloatBoundReason, string>> = {
  NO_FILED_COUNT: 'No filed share count.',
  NO_CIK: 'We could not match this name to an SEC filer, so there is no filed share count to start from.',
  COUNT_SPLIT_ACROSS_FILINGS: 'The filed share count is split across several filings, so no single count applies.',
  // Marketing fd7b7322, Commercial read 54 (7e0ac597): stored only on SEC's 404 from companyfacts (floatJob.ts).
  COMPANY_FACTS_NOT_AVAILABLE: "We could not read a filed share count for this name: SEC's company-facts data returned nothing for it.",
};

function cannotVerifyText(
  reason: FloatBoundReason | null,
  countDate: string | null,
  fetchedDate: string | null,
): string {
  switch (reason) {
    case 'COUNT_TOO_OLD':
      return `Cannot verify: the latest filed share count is from ${countDate ?? 'an unknown date'}, too old to rely on.`;
    case 'ISSUANCE_FLAGGED':
    // A filed offering or an 8-K item 3.02 after the count: Commercial 5p (bbfb7a17)
    // found this sentence true of it, so the two causes share it by ruling.
    case 'ISSUANCE_FILED':
      return 'Cannot verify: shares may have been issued since the filed count.';
    case 'SPLIT_SINCE_COUNT':
      return "Cannot verify: a share split fell after the filed count's date, or we could not rule one out, so the count may be in different share units.";
    case 'ISSUANCE_NOT_CHECKED':
      return "Cannot verify: we have not yet reviewed this company's share supply, so share issuance was not checked.";
    case 'BOUND_OUT_OF_RANGE':
      return "Cannot verify: the computed figure did not pass the desk's own sanity check, so it is not shown.";
    case 'FILINGS_NOT_REREAD':
      return `Cannot verify: the desk has not read this company's filings since ${fetchedDate ?? 'an unknown date'}.`;
    case 'UNREGISTERED_SALE_NOT_CHECKABLE':
      // A count from a Form 20-F or 40-F (Research refuses by the count's form). Commercial 21e's words, v25.
      return "Cannot verify: this company's filed share count is from a Form 20-F or 40-F, whose filers are not required to file 8-Ks, so the desk does not check for unregistered share sales since the count.";
    default:
      // A cause this module has no words for must not borrow another's.
      return 'Cannot verify.';
  }
}

const NOT_COMPUTED_TEXT = 'The desk has not computed a TMI Float for this name.';

/**
 * The surface the cell is on. The claim's one date, {D-label} (v25), is the board's
 * own date where one is shown, and "the checkpoint" on reports, exports and stored copies.
 */
export interface FloatSurface {
  /** The live board's date, YYYY-MM-DD. Absent means a report, export or stored copy. */
  dateShown?: string | null;
  /** True only on the signed-in board: owner names may print (Commercial 23b). Absent: no names. */
  namesAllowed?: boolean;
}

export function floatCellView(raw: FloatBound | null | undefined, surface: FloatSurface = {}): FloatCellView {
  const view = floatCellFace(raw, surface);
  // Every face opens the panel, so every accessible name says so (Marketing 1ee54def, the marker).
  return { ...view, ariaLabel: `${view.ariaLabel}${FLOAT_DETAILS_WORDS.ariaSuffix}` };
}

function floatCellFace(raw: FloatBound | null | undefined, surface: FloatSurface): FloatCellView {
  const bound = normalizeFloatBound(raw);
  if (!bound) {
    return {
      kind: 'notComputed',
      face: 'Not computed',
      date: null,
      icon: null,
      ariaLabel: 'TMI Float not computed for this name',
      paragraphs: [NOT_COMPUTED_TEXT],
      details: refusedDetails(NOT_COMPUTED_TEXT),
    };
  }
  const countDate = longDate(bound.countAsOf);

  if (bound.state === 'PRODUCED') {
    // A produced state with no usable number, count date or read date must not print a bare "<= X":
    // both dates are in the claim's words, so it reads as the check failing, never as a number.
    // (Research's `toFloatBound` always sets the read date; only a malformed wire value lacks it.)
    const fetched = longDate(bound.filingsReadOn);
    if (bound.bound === null || !(bound.bound > 0) || countDate === null || fetched === null) {
      const reason = cannotVerifyText('BOUND_OUT_OF_RANGE', null, null);
      return {
        kind: 'cannotVerify',
        face: 'Cannot verify',
        date: null,
        icon: null,
        ariaLabel: 'float cannot be verified for this name',
        paragraphs: [reason],
        details: refusedDetails(reason),
      };
    }
    const compact = compactBound(bound.bound);
    const amount = compact.startsWith(BOUND_PREFIX) ? compact.slice(BOUND_PREFIX.length) : compact;
    const d = dLabel(surface);
    return {
      kind: 'bound',
      face: compact,
      date: shortDate(bound.countAsOf),
      icon: null,
      ariaLabel: `no more than ${amount} shares as of ${d}, computed from the share count dated ${countDate} and insider holdings filed through ${fetched}, when the filings line up`,
      // The v25 popover, verbatim, split before "Lined up means".
      paragraphs: [
        `Taking float as shares outstanding less insider holdings, it is no more than ${amount} shares as of ${d}, when the filings line up. Computed from the company's filed share count, less insider holdings as filed through ${fetched}, counting any sale dated on or before ${d} that was filed by ${fetched}. Filings read on ${fetched}.`,
        `Lined up means: a filed count dated ${countDate}, at most 90 days before ${d}, no share issuance the desk has flagged, no final prospectus for an offering of securities (SEC form 424B1, 424B2, 424B4 or 424B5) and no report of an unregistered sale of shares (Form 8-K item 3.02) filed on or after the count date, and no share split since the count. A sale not yet filed cannot be seen.`,
      ],
      details: boundDetails(bound, amount, countDate, surface),
    };
  }

  if (bound.state === 'UNKNOWN') {
    const reason = (bound.reason && UNKNOWN_TEXT[bound.reason]) || 'No filed share count.';
    return {
      kind: 'unknown',
      face: 'Unknown',
      date: null,
      icon: null,
      ariaLabel: 'float unknown for this name',
      paragraphs: [reason],
      details: refusedDetails(reason),
    };
  }

  const reason = cannotVerifyText(bound.reason, countDate, longDate(bound.filingsReadOn));
  const filed = filedCountFace(bound, reason);
  if (filed) return filed;
  return {
    kind: 'cannotVerify',
    face: 'Cannot verify',
    date: null,
    icon: null,
    ariaLabel: 'float cannot be verified for this name',
    paragraphs: [reason],
    details: refusedDetails(reason),
  };
}

/**
 * The panel for a PRODUCED bound. A row whose inputs are not on the payload is left out (an old row
 * with no count shares or form, a fetch date that does not parse), never filled with a placeholder.
 * Per-insider rows print only when `namesAllowed`; an insider with no filed name reads "An insider" on
 * its own row. Where names may not print, row 4 keeps its count and total and no per-insider row prints.
 */
function boundDetails(bound: FloatBound, amount: string, countDate: string, surface: FloatSurface): FloatDetails {
  const W = FLOAT_DETAILS_WORDS;
  const d = dLabel(surface);
  const fetched = longDate(bound.filingsReadOn);
  const countFiled = longDate(bound.countFiled);
  const subtracted = bound.insiders.filter((i) => i.shares > 0);
  const total = subtracted.reduce((sum, i) => sum + i.shares, 0);
  const rows: FloatDetailRow[] = [
    { label: null, text: W.headline(amount, d) },
    { label: W.definitionLabel, text: W.definition },
  ];
  if (bound.countShares !== null && bound.countForm && countFiled) {
    rows.push({ label: W.countLabel, text: W.count(exactShares(bound.countShares), countDate, bound.countForm, countFiled) });
  }
  if (fetched) rows.push({ label: W.insidersLabel, text: W.insiders(subtracted.length, exactShares(total), fetched, d) });
  rows.push({ label: W.notSubtractedLabel, text: W.notSubtracted });
  rows.push({ label: W.linedUpLabel, text: W.linedUp(countDate, d) });
  if (fetched) rows.push({ label: null, text: W.readOn(fetched) });
  const named = SHOW_INSIDER_NAMES && surface.namesAllowed === true;
  return {
    rows,
    insiders: named ? subtracted.map((i) => W.insiderRow(i.ownerName?.trim() || W.unnamedInsider, exactShares(i.shares))) : [],
  };
}

/** A refused face's panel: its one-sentence reason and the definition (Marketing: "add only row 2 and the link"). */
function refusedDetails(reason: string): FloatDetails {
  return {
    rows: [
      { label: null, text: reason },
      { label: FLOAT_DETAILS_WORDS.definitionLabel, text: FLOAT_DETAILS_WORDS.definition },
    ],
    insiders: [],
  };
}

/*
 * FLOAT FIX 1: THE FILED COUNT ON A REFUSED ROW. His "3, yes, when can't verify place a very small icon or somethign
 * with a tooltip and link toexplanation" (Integration chat, 2026-10-13T09:39:59.808Z) and his ruling on the two cases
 * put to him, "3, no show a number and another icon with a link and a tooltip, yes, with warning"
 * (2026-10-13T09:57:22.409Z): a refused row with a filed count prints that count, never as a TMI Float, with ONE
 * icon: `caveat` where the split and age checks both passed, `warning` where either did not or was not recorded.
 * Still the word, with no number: no filed count, a count dated after the board date, BOUND_OUT_OF_RANGE (the count
 * itself is suspect: insiderBound.ts look-ahead and bound <= 0; Integration 39th), the no-reason fault.
 * Research computes the checks (`countChecks`, ba6afbba); this module applies no rule of its own beyond the table.
 * Commercial reads 89 to 89e: the unit on the face, "filed" and the date in the hover, the warning says its case
 * plainly, never "current", "latest" or "float" for the count; sort, filter and comparison stay bounds only.
 */
export const FILED_COUNT_RULE = {
  /** Reasons that never print the count. */
  noNumberReasons: new Set<FloatBoundReason>(['BOUND_OUT_OF_RANGE']),
  /** Ages that never print the count. */
  noNumberAges: new Set<FloatCountChecks['age']>(['AFTER_DATE']),
  /** The checks under which the icon is the caveat; anything else, or no record, is the warning. */
  caveat: (checks: FloatCountChecks) => checks.split === 'NONE' && checks.age === 'WITHIN',
} as const;

/*
 * MARKETING'S WORDS, docs/marketing/float-fix1-words-2026-10-13.md at 2aff6193 (items 1 to 12), for Commercial's
 * read against 89e and then his eye before ship. NOT YET PASSED.
 */
export const FILED_COUNT_WORDS = {
  unit: 'sh',
  /** The hover's first line on either icon: what the number is, with its date. */
  what: (date: string) => `The company's filed share count as of ${date}, with no insider holdings subtracted. It is not a TMI Float.`,
  /** The issuance causes' caveat (the stored reason says shares may have been issued since). */
  mayBeHigher: 'The true share count may be higher.',
  preSplit: 'This count may be in pre-split share units.',
  splitNotChecked: 'The desk has not checked for a share split since this count.',
  noRecord: 'We have no record of a share split check for this count.',
  tooOld: (date: string, days: number) => `This count is from ${date}, more than ${days} days ago.`,
  headline: (shares: string, asOf: string, form: string | null, filed: string | null) =>
    `The desk could not verify a TMI Float for this name. The company's filed share count is ${shares} shares as of ${asOf}${form && filed ? `, from a ${form} filed ${filed}` : ''}.`,
  definitionLabel: 'What a TMI Float is',
  definition:
    'A TMI Float is shares outstanding less the insider holdings the desk can see. The number on this cell is the filed share count with nothing subtracted.',
  aria: (shares: string, date: string) => `filed share count ${shares} as of ${date}; TMI Float could not be verified`,
  /** One sentence after FLOAT_LEGEND, where the legend and the header hover print. */
  legend: "Where a TMI Float cannot be verified, the cell may show the company's filed share count with an icon. Nothing is subtracted from it, so it is not a TMI Float.",
} as const;

/** The 90 days of his ruling, for the warning's words only (Research decides TOO_OLD; FLOAT_MAX_AGE_DAYS). */
const COUNT_MAX_AGE_DAYS = 90;

const ISSUANCE_REASONS: ReadonlySet<string> = new Set(['ISSUANCE_FILED', 'ISSUANCE_FLAGGED', 'ISSUANCE_NOT_CHECKED', 'UNREGISTERED_SALE_NOT_CHECKABLE']);

/**
 * A share count, compact, ROUNDED TO NEAREST at three significant digits ("12.3M", "842K", "1.20B"). Not
 * `compactBound`: that rounds UP because "no more than" must never understate; a filed count is not a bound.
 */
export function compactCount(shares: number): string {
  const units: Array<[string, number]> = [['K', 1e3], ['M', 1e6], ['B', 1e9], ['T', 1e12]];
  const whole = Math.round(shares);
  if (whole < 1000) return String(whole);
  let i = units.findIndex(([, size], k) => whole < size * 1000 || k === units.length - 1);
  let text = (whole / units[i]![1]).toPrecision(3);
  // Rounding can carry into the next unit (999,600 is "1.00e+3" K): show it in that unit instead ("1.00M").
  if (Number(text) >= 1000 && i < units.length - 1) {
    i += 1;
    text = (whole / units[i]![1]).toPrecision(3);
  }
  return `${text}${units[i]![0]}`;
}

function filedCountFace(bound: FloatBound, reason: string): FloatCellView | null {
  const W = FILED_COUNT_WORDS;
  if (bound.state !== 'CANNOT_VERIFY' || bound.reason === null || FILED_COUNT_RULE.noNumberReasons.has(bound.reason)) return null;
  if (bound.countShares === null || !(bound.countShares > 0)) return null;
  const asOf = longDate(bound.countAsOf);
  if (asOf === null) return null;
  const checks = bound.countChecks;
  if (checks && FILED_COUNT_RULE.noNumberAges.has(checks.age)) return null;

  const warnings: string[] = [];
  if (!checks) warnings.push(W.noRecord);
  else {
    if (checks.split === 'FOUND' || checks.split === 'UNPROVEN') warnings.push(W.preSplit);
    if (checks.split === 'NOT_RUN') warnings.push(W.splitNotChecked);
    if (checks.age === 'TOO_OLD') warnings.push(W.tooOld(asOf, COUNT_MAX_AGE_DAYS));
  }
  const icon: FiledCountIcon = checks && FILED_COUNT_RULE.caveat(checks) ? 'caveat' : 'warning';
  const higher = ISSUANCE_REASONS.has(bound.reason) ? [W.mayBeHigher] : [];
  const lines = [W.what(asOf), reason, ...higher, ...(icon === 'warning' ? warnings : [])];
  const count = compactCount(bound.countShares);
  const exact = Math.round(bound.countShares).toLocaleString('en-US');
  return {
    kind: 'filedCount',
    face: `${count} ${W.unit}`,
    date: null,
    icon: { kind: icon, title: lines.join(' ') },
    ariaLabel: [W.aria(count, asOf), reason, ...higher, ...(icon === 'warning' ? warnings : [])].join('; '),
    // The drawer prints paragraphs[0] for any face that is not a bound: the stored reason, as before (Commercial (b)).
    paragraphs: [reason],
    details: {
      rows: [
        { label: null, text: W.headline(exact, asOf, bound.countForm, longDate(bound.countFiled)) },
        { label: null, text: [reason, ...higher, ...(icon === 'warning' ? warnings : [])].join(' ') },
        { label: W.definitionLabel, text: W.definition },
      ],
      insiders: [],
    },
  };
}

/** The sort value: the bound, only where it is PRODUCED. A refused or absent float has no number to order by. */
export function floatSortValue(raw: FloatBound | null | undefined): number | null {
  const bound = normalizeFloatBound(raw);
  return bound?.state === 'PRODUCED' && bound.bound !== null && bound.bound > 0 ? bound.bound : null;
}
