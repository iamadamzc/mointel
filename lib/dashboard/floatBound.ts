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
import type { FloatCountChecks, FloatCountSource, FloatInsider, FloatBound as ResearchFloatBound } from '@/lib/research/floatRead';
import type { FloatCellReason } from '@/lib/research/insiderBound';
import type { Restatement } from '@/lib/research/floatRestate';

/**
 * Research's payload per ticker. Null, or absent, is NOT_YET: "Not computed".
 * L8 piece B: `filingsOnly` (PRODUCED only, Research 961c66c2) marks a bound for a name with no desk research: no
 * supply ledger, so warrants and share programs already in place are not counted.
 * L6: `restated` (PRODUCED only, Research's `Restatement`, lib/research/floatRestate.ts) marks a count restated
 * across listed splits; `bound` and every insider's shares are already in the restated units.
 */
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
    // L7: absent or malformed means no read of later filings, so today's cover words (the claim that says least).
    ...(sourceOf(r.countSource) ? { countSource: sourceOf(r.countSource)! } : {}),
    // L8 B: only `true` on a PRODUCED row marks it; anything else is an ordinary bound or not a bound.
    ...(r.state === 'PRODUCED' && r.filingsOnly === true ? { filingsOnly: true as const } : {}),
    // L6: only a PRODUCED bound can be restated; a malformed value is dropped (today's face, the claim that says least).
    ...(r.state === 'PRODUCED' && restatedOf(r.restated) ? { restated: restatedOf(r.restated)! } : {}),
  };
}

const rate = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** Research's `restated` (L6), or undefined when absent or any field is malformed. */
function restatedOf(raw: unknown): Restatement | undefined {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.splits) || r.splits.length === 0) return undefined;
  const splits: Restatement['splits'] = [];
  for (const s of r.splits) {
    if (s === null || typeof s !== 'object') return undefined;
    const o = s as Record<string, unknown>;
    if (!isDate(o.exDate) || !rate(o.newRate) || !rate(o.oldRate)) return undefined;
    splits.push({ exDate: o.exDate, newRate: o.newRate, oldRate: o.oldRate });
  }
  if (!rate(r.factor) || !rate(r.restatedShares) || typeof r.provenByBars !== 'boolean') return undefined;
  return { splits, factor: r.factor, restatedShares: r.restatedShares, provenByBars: r.provenByBars };
}

const count0 = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** Research's `countSource` (L7), or undefined when absent or any field is malformed. */
function sourceOf(raw: unknown): FloatCountSource | undefined {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const s = raw as Record<string, unknown>;
  if (typeof s.stated !== 'boolean' || !count0(s.read) || !count0(s.unread) || !count0(s.capped)) return undefined;
  if (s.conflictAsOf !== null && !isDate(s.conflictAsOf)) return undefined;
  return { stated: s.stated, read: s.read, unread: s.unread, capped: s.capped, conflictAsOf: s.conflictAsOf };
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
  // The defined-term form (Marketing cf2491a5, Commercial read 91 PASS; matches FLOAT_LEGEND): bound and refused panels.
  definitionLabel: 'TMI Float: shares outstanding less insider holdings',
  definition:
    'The number above subtracts only the insider holdings the desk can see, so it is an upper bound on that figure, not on the shares that can trade on a given day, which can be more, because insiders can sell.',
  /**
   * L14 (his "add it to the list, fix it tonight", 2026-10-14T01:19:18.784Z): the definition row's text on a REFUSED
   * panel (Not computed, Unknown, Cannot verify with no number), which shows no number for "the number above" to name.
   * Marketing b76bd4bc (docs/marketing/float-l14-words-2026-10-14.md); Commercial reads the built string; he sees it
   * before ship. NOT YET PASSED.
   */
  refusedDefinition:
    'The desk can subtract only the insider holdings it can see, so a TMI Float it shows is an upper bound on that figure, not on the shares that can trade on a given day, which can be more, because insiders can sell.',
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
  "TMI Float: shares outstanding less insider holdings, computed from SEC filings. An upper bound as of the date of the board or report, when the filings line up. The date beside the number is the filed share count's; where no date shows, it is in the hover.";

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
    // L8 B: an unscreened bound carries the circled i. L6: a restated bound names its split(s); the triangle stays
    // unless the bars prove the ratio (read 104). Both (Commercial 114 (2), Integration's ruling): ONE icon, the
    // triangle wins; its hover is the L6 sentence then the L8 sentence. A marked bound's date leaves the face.
    const filingsOnly = bound.filingsOnly === true;
    const restated = bound.restated && !bound.restated.provenByBars ? bound.restated : null;
    const l6Hover = restated ? RESTATED_WORDS.hover(countDate, restated.splits) : null;
    const l8Hover = filingsOnly ? FILINGS_ONLY_WORDS.hover(amount, countDate) : null;
    const hover = [l6Hover, l8Hover].filter((s): s is string => s !== null).join(' ');
    return {
      kind: 'bound',
      face: compact,
      date: hover && !MARKED_BOUND_DATE_ON_FACE ? null : shortDate(bound.countAsOf),
      // With the date off the face, each hover sentence carries the count's date (L6 v9, L8 Commercial 115).
      icon: hover ? { kind: restated ? 'warning' : 'caveat', title: hover } : null,
      ariaLabel:
        `no more than ${amount} shares as of ${d}, computed from the share count dated ${countDate} and insider holdings filed through ${fetched}, when the filings line up` +
        (bound.restated ? RESTATED_WORDS.aria(bound.restated.splits) : '') +
        (filingsOnly ? FILINGS_ONLY_WORDS.aria : ''),
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
    // L8 B: the one extra line under the headline (Marketing 84d0b9fd, his "approved").
    ...(bound.filingsOnly ? [{ label: null, text: FILINGS_ONLY_WORDS.panel }] : []),
    { label: W.definitionLabel, text: W.definition },
  ];
  if (bound.countShares !== null && bound.countForm && countFiled) {
    const shares = exactShares(bound.countShares);
    rows.push({
      label: W.countLabel,
      text: bound.countSource?.stated
        ? STATED_COUNT_WORDS.count(shares, bound.countForm, countFiled, countDate)
        : W.count(shares, countDate, bound.countForm, countFiled),
    });
  }
  // L6 v8: the restated count, so the panel adds up (the headline is this less the insiders below).
  if (bound.restated) {
    rows.push({ label: RESTATED_WORDS.countLabel, text: RESTATED_WORDS.count(exactShares(bound.restated.restatedShares), countDate, bound.restated.splits) });
    // Integration 40th: the panel carries no less caveat than the hover (the approved sentence, its own line).
    rows.push({ label: null, text: RESTATED_WORDS.mayMiss });
  }
  const laterLine = laterFilingsLine(bound.countSource);
  if (laterLine) rows.push({ label: null, text: laterLine });
  if (fetched) {
    const insidersText = bound.restated
      ? RESTATED_WORDS.insiders(subtracted.length, exactShares(total), fetched, d)
      : W.insiders(subtracted.length, exactShares(total), fetched, d);
    rows.push({ label: W.insidersLabel, text: insidersText });
  }
  rows.push({ label: W.notSubtractedLabel, text: W.notSubtracted });
  rows.push({ label: W.linedUpLabel, text: bound.restated ? RESTATED_WORDS.linedUp(countDate, d) : W.linedUp(countDate, d) });
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
      // L14: never "the number above" here; a refused panel shows no number.
      { label: FLOAT_DETAILS_WORDS.definitionLabel, text: FLOAT_DETAILS_WORDS.refusedDefinition },
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
  // His words, 2026-10-13T10:28:14.413Z (Integration chat): "dont say "the desk has not checked..." say "there may
  // have been a split, needs verification"". The no-record case reads the same to a user (Integration 39th).
  splitNotChecked: 'There may have been a split, needs verification.',
  noRecord: 'There may have been a split, needs verification.',
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

/*
 * L7: A COUNT A LATER FILING STATES. His "yes to all three" (Integration chat, 2026-10-13T21:36:56.972Z) to Marketing's
 * words, docs/marketing/float-stated-count-words-2026-10-13.md at caf7523f (Commercial reads 99, 101, 101a). "As stated
 * in" only when `countSource.stated`; a cover count keeps today's words. The article comes from the form.
 */
/*
 * L8 PIECE B: A BOUND FOR A NAME WITH NO DESK RESEARCH. His "approved" (Integration chat, uuid 16379c7e,
 * 2026-10-14T01:17:42.726Z) to Marketing 84d0b9fd's FINAL text (66b81507; Commercial read 110a), verbatim.
 * The hover names the COUNT's date, which leaves the face: his "count date tonight" (Marketing chat, 2026-10-14;
 * Integration verifies the timestamp), Marketing 4eb509d9, Commercial read 115. FLOAT_LEGEND's last sentence
 * changed in the same commit ("; where no date shows, it is in the hover").
 */
export const FILINGS_ONLY_WORDS = {
  hover: (x: string, countDate: string) =>
    `No more than ${x} shares, from the filed share count as of ${countDate}, not counting warrants, convertible notes or share-sale programs already in place. There may be some, and they need verifying; the true figure may be higher.`,
  panel:
    'There may be warrants, convertible notes or share-sale programs in place that this number does not count; they need verifying, and the true figure may be higher. Shares from those can be added with no new filing.',
  aria: '; not counting warrants, convertible notes or share-sale programs already in place; may need verifying; the true figure may be higher',
} as const;

/**
 * Integration's width ruling (L6 point 5, applied to L8): a marked bound (circled i or triangle) moves the count's
 * date off the face, because "≤ 12.4M 12/31" plus an icon measures past the 86 px column. One switch for both.
 */
export const MARKED_BOUND_DATE_ON_FACE = false;

/*
 * L6: A BOUND RESTATED FOR LISTED SPLITS (option (a), Commercial reads 98, 104, 108; Integration 40th's rulings
 * 2026-10-14). The hover is Marketing a65caa91 verbatim for one and two splits; three or more list the same pattern
 * (Integration (1), to him as one line). The article follows how the ratio is said (articleFor, "an 8-for-1").
 * Three-or-more form and the restated "Lined up means" row: Marketing 14a0b60a (B), (A). NOT YET PASSED: Commercial
 * reads the built strings, then he sees them before ship.
 */
export const RESTATED_WORDS = {
  /** {splits}: "a 1-for-10 split on Sep 3, 2026", joined with "and" for two, commas then "and" for three or more. */
  splits: (splits: ReadonlyArray<{ exDate: string; newRate: number; oldRate: number }>) => {
    const parts = splits.map((s) => {
      const ratio = `${s.newRate}-for-${s.oldRate}`;
      return `${articleFor(ratio)} ${ratio} split on ${longDate(s.exDate) ?? s.exDate}`;
    });
    return parts.length <= 2 ? parts.join(' and ') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  },
  /** v9 (Marketing 8d88c749, Commercial 113a): the opening names the count's date, which leaves the face. */
  hover: (countDate: string, splits: ReadonlyArray<{ exDate: string; newRate: number; oldRate: number }>) =>
    `Filed share count as of ${countDate}, restated for ${RESTATED_WORDS.splits(splits)}, as announced. ${RESTATED_WORDS.mayMiss}`,
  /** The approved caveat, also the panel's own line after "Restated share count". */
  mayMiss: 'The split list can miss a split.',
  /** v8 (Marketing 95201471, Commercial 113): appended to the bound's accessible name. */
  aria: (splits: ReadonlyArray<{ exDate: string; newRate: number; oldRate: number }>) =>
    `; restated for ${RESTATED_WORDS.splits(splits)}, as announced; the split list can miss a split`,
  /** v8: the panel row after "Filed share count", so the panel's arithmetic reconciles (Integration's changed (3)). */
  countLabel: 'Restated share count',
  count: (shares: string, countDate: string, splits: ReadonlyArray<{ exDate: string; newRate: number; oldRate: number }>) =>
    `${shares} shares as of ${countDate}, restated for ${RESTATED_WORDS.splits(splits)}, as announced.`,
  /**
   * v10 (Marketing 8b712567, Commercial 113b): inserted after "{total} shares" in the insiders row. Research's L6 plan
   * (items 4, 4a): every used holding is in the post-split units, so the total is in the same units as the restated count.
   */
  insiders: (n: number, total: string, fetched: string, d: string) =>
    FLOAT_DETAILS_WORDS.insiders(n, total, fetched, d).replace(`${total} shares, as filed through`, `${total} shares, in the same share units, as filed through`),
  /**
   * The "Lined up means" row on a RESTATED bound (Marketing 14a0b60a (A)): the passed row with its last two clauses
   * replaced; everything before is unchanged. Built from the passed row so the two can never drift apart.
   */
  linedUp: (countDate: string, d: string) =>
    FLOAT_DETAILS_WORDS.linedUp(countDate, d).replace(
      ', and no share split since the count. A sale not yet filed cannot be seen.',
      ', and any share split since the count restated by its announced ratio. A sale not yet filed, and a split the split list does not contain, cannot be seen.',
    ),
} as const;

export const STATED_COUNT_WORDS = {
  /** Case 1 and 2: the bound panel's count row. */
  count: (shares: string, form: string, filed: string, asOf: string) =>
    `${shares} shares, as stated in ${articleFor(form)} ${form} filed ${filed}, as of ${asOf}.`,
  /** Case 1 and 2: the filed-count face's panel headline. */
  headline: (shares: string, form: string, filed: string, asOf: string) =>
    `The desk could not verify a TMI Float for this name. The company's filed share count is ${shares} shares, as stated in ${articleFor(form)} ${form} filed ${filed}, as of ${asOf}.`,
  /** Case 1 and 2: the filed-count face's first hover sentence. */
  what: (form: string, filed: string, asOf: string) =>
    `The company's share count as stated in ${articleFor(form)} ${form} filed ${filed}, as of ${asOf}, with no insider holdings subtracted. It is not a TMI Float.`,
  /** Case 3: every later filing was read and none gave a newer dated count. */
  noneNewer: (n: number) => `The desk also read ${n} later ${n === 1 ? 'filing' : 'filings'} and found no newer dated share count.`,
  /** Case 4: the newest date carried different counts; none used. */
  conflict: (asOf: string) => `Later filings give different counts as of ${asOf}, so the desk used none of them.`,
  /** Case 5: not every later filing was read. */
  notAllRead: 'The desk could not read every later filing, so a newer count may exist.',
} as const;

/**
 * "a" or "an" by how the form is SAID (Commercial read 101): a single letter whose name opens with a vowel sound
 * ("an S-1", "an F-3"), an 8 or an 11/18 ("an 8-K"); otherwise "a" ("a 424B3", "a DEF 14A", "a PRE 14C", "a 10-Q").
 */
export function articleFor(form: string): 'a' | 'an' {
  const f = form.trim().toUpperCase();
  if (/^[AEFHILMNORSX](?=-|\d|$)/.test(f)) return 'an';
  if (/^8/.test(f) || /^1[18](?!\d)/.test(f)) return 'an';
  return 'a';
}

/**
 * The panel's one extra line about later filings (cases 3 to 5), or null. Case 5 (not every filing read) is said
 * whether or not a count was found, so it leads; then a conflict; then case 3, only when everything was read and
 * nothing newer or conflicting was found.
 */
export function laterFilingsLine(source: FloatCountSource | undefined): string | null {
  if (!source) return null;
  const W = STATED_COUNT_WORDS;
  if (source.unread > 0 || source.capped > 0) return W.notAllRead;
  if (source.conflictAsOf) return W.conflict(longDate(source.conflictAsOf) ?? source.conflictAsOf);
  if (!source.stated && source.read > 0) return W.noneNewer(source.read);
  return null;
}

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
    // Not on COUNT_TOO_OLD: its stored reason already says the count is too old (Integration 39th, render 2026-10-13).
    if (checks.age === 'TOO_OLD' && bound.reason !== 'COUNT_TOO_OLD') warnings.push(W.tooOld(asOf, COUNT_MAX_AGE_DAYS));
  }
  const icon: FiledCountIcon = checks && FILED_COUNT_RULE.caveat(checks) ? 'caveat' : 'warning';
  const higher = ISSUANCE_REASONS.has(bound.reason) ? [W.mayBeHigher] : [];
  const count = compactCount(bound.countShares);
  const exact = Math.round(bound.countShares).toLocaleString('en-US');
  // L7: a count a later filing states names that filing; it needs the form and filing date to say so.
  const filedOn = longDate(bound.countFiled);
  const stated = bound.countSource?.stated && bound.countForm && filedOn ? { form: bound.countForm, filed: filedOn } : null;
  const what = stated ? STATED_COUNT_WORDS.what(stated.form, stated.filed, asOf) : W.what(asOf);
  const headline = stated ? STATED_COUNT_WORDS.headline(exact, stated.form, stated.filed, asOf) : W.headline(exact, asOf, bound.countForm, filedOn);
  const laterLine = laterFilingsLine(bound.countSource);
  const lines = [what, reason, ...higher, ...(icon === 'warning' ? warnings : [])];
  return {
    kind: 'filedCount',
    face: `${count} ${W.unit}`,
    date: null,
    icon: { kind: icon, title: lines.join(' ') },
    // Each sentence's own full stop is dropped before "; ", so a screen reader never hears ".;" (render 2026-10-13).
    ariaLabel: [W.aria(count, asOf), reason, ...higher, ...(icon === 'warning' ? warnings : [])].map((s) => s.replace(/\.$/, '')).join('; '),
    // The drawer prints paragraphs[0] for any face that is not a bound: the stored reason, as before (Commercial (b)).
    paragraphs: [reason],
    details: {
      rows: [
        { label: null, text: headline },
        ...(laterLine ? [{ label: null, text: laterLine }] : []),
        { label: null, text: [reason, ...higher, ...(icon === 'warning' ? warnings : [])].join(' ') },
        { label: W.definitionLabel, text: W.definition },
      ],
      insiders: [],
    },
  };
}

/**
 * The sort value: the bound, only where it is PRODUCED. A refused or absent float has no number to order by.
 * L8 B (Commercial's condition (4)): a filings-only bound is shown, not ranked, as these names were unranked before.
 */
export function floatSortValue(raw: FloatBound | null | undefined): number | null {
  const bound = normalizeFloatBound(raw);
  if (bound?.filingsOnly) return null;
  return bound?.state === 'PRODUCED' && bound.bound !== null && bound.bound > 0 ? bound.bound : null;
}
