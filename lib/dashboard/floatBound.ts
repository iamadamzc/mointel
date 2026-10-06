/**
 * THE FLOAT CELL: one mapping from the stored float state to the face, the
 * popover and the accessible name, for every surface that shows it.
 *
 * The float on this board is the SEC upper bound (his rulings 2026-10-05: "the
 * float is the SEC upper bound", "always show it, it's key"; the filed count's
 * date goes ON the face under his 90-day ruling). The state is computed by
 * Research (`lib/research/insiderBound.ts` `floatCell`) and stored; this module
 * applies NO rule of its own. It turns the stored state into Marketing's words
 * (`docs/marketing/float-page-draft.md`, v20 at 6fed4658; v19 Commercial-passed at 3763ef0c): four faces,
 * one string per stored cause, and the page link.
 *
 * Words are claims. Nothing here may say the column is populated, that a number
 * is verified, or that the validation covers more than it does; changing a word
 * is changing passed copy, so Marketing and Commercial first.
 *
 * THE PAYLOAD SHAPE BELOW IS PROVISIONAL: the retired Research seat gave it, the
 * float job that produces it is not built, and the new Research seat owns the
 * definition. It is a consumer type, not a contract.
 */

import { BOUND_PREFIX, compactBound } from '@/lib/research/compactBound';
import type { FloatCellReason } from '@/lib/research/insiderBound';

export type FloatBoundState = 'PRODUCED' | 'UNKNOWN' | 'CANNOT_VERIFY' | 'NOT_YET';

/**
 * The stored causes: the eight `floatCell` produces, plus FILINGS_NOT_REREAD, the
 * sixth Cannot verify reason of Marketing's v16 (shown when a stored row is more
 * than four days older than the date shown). Research owns when it is stored.
 * ISSUANCE_FILED is Research's rule I-D (`lib/research/insiderBound.ts` on
 * research/float-job 16077d58); it is named here too so this module compiles on a
 * base that does not carry it yet. Once Research's type lands both names are redundant.
 */
export type FloatBoundReason = FloatCellReason | 'FILINGS_NOT_REREAD' | 'ISSUANCE_FILED';

/** What the payload carries per ticker. Null, or absent, is NOT_YET: "Not computed". */
export interface FloatBound {
  state: FloatBoundState;
  /** The stored cause, for UNKNOWN and CANNOT_VERIFY. */
  reason: FloatBoundReason | null;
  /** Shares, only for PRODUCED. */
  bound: number | null;
  /** The filed count's as-of date, YYYY-MM-DD. */
  countAsOf: string | null;
  /** The dates the subtracted holdings were filed, YYYY-MM-DD. */
  holdingDates: string[];
  /** The date the desk last read the company's filings, YYYY-MM-DD. */
  fetchedOn: string | null;
}

export type FloatFaceKind = 'bound' | 'unknown' | 'cannotVerify' | 'notComputed';

export interface FloatCellView {
  kind: FloatFaceKind;
  /** The number on the face ("≤ 12.3M") or the word. */
  face: string;
  /** The filed count's date beside the number (m/d), bound face only. */
  date: string | null;
  ariaLabel: string;
  /** The popover's paragraphs, before the page link. */
  paragraphs: string[];
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

/** The once-only legend under the board. Verbatim. */
export const FLOAT_LEGEND =
  "Float: computed from SEC filings. An upper bound as of the date shown, when the filings line up. The date is the filed share count's.";

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
    default:
      // A cause this module has no words for must not borrow another's.
      return 'Cannot verify.';
  }
}

const NOT_COMPUTED: FloatCellView = {
  kind: 'notComputed',
  face: 'Not computed',
  date: null,
  ariaLabel: 'float not computed for this name',
  paragraphs: ['The desk has not computed a float for this name.'],
};

/**
 * Where the 90-day rule is measured FROM, in the words of the surface.
 *
 * On the live board it is "the date shown", with that date printed (the
 * board's own date, `dateShown`); on reports, exports and stored copies it is
 * "the checkpoint". Marketing v16, item 4: Design chooses by surface.
 */
export interface FloatSurface {
  /** The live board's date, YYYY-MM-DD. Absent means a report, export or stored copy. */
  dateShown?: string | null;
}

function measuredFrom(surface: FloatSurface): string {
  const shown = longDate(surface.dateShown);
  return surface.dateShown && shown ? `the date shown (${shown})` : 'the checkpoint';
}

export function floatCellView(bound: FloatBound | null | undefined, surface: FloatSurface = {}): FloatCellView {
  if (!bound || bound.state === 'NOT_YET') return NOT_COMPUTED;
  const countDate = longDate(bound.countAsOf);

  if (bound.state === 'PRODUCED') {
    // A produced state with no usable number or no count date must not print a bare "≤ X":
    // the date is part of the claim, so it reads as the check failing, never as a number.
    if (bound.bound === null || !(bound.bound > 0) || countDate === null) {
      return {
        kind: 'cannotVerify',
        face: 'Cannot verify',
        date: null,
        ariaLabel: 'float cannot be verified for this name',
        paragraphs: [cannotVerifyText('BOUND_OUT_OF_RANGE', null, null)],
      };
    }
    const compact = compactBound(bound.bound);
    const amount = compact.startsWith(BOUND_PREFIX) ? compact.slice(BOUND_PREFIX.length) : compact;
    const holdings = bound.holdingDates.map(longDate).filter((d): d is string => d !== null);
    const fetched = longDate(bound.fetchedOn);
    return {
      kind: 'bound',
      face: compact,
      date: shortDate(bound.countAsOf),
      ariaLabel: `no more than ${amount} shares as of ${countDate}, computed from SEC filings, when the filings line up`,
      paragraphs: [
        `No more than ${amount} shares as of ${countDate}, when the filings line up. Computed from the company's filed share count, less insider holdings filed on ${holdings.length > 0 ? holdings.join(', ') : 'the dates in the filings'}.${fetched ? ` Filings read on ${fetched}.` : ''}`,
        `Lined up means: a filed count dated ${countDate}, at most 90 days before ${measuredFrom(surface)}, no share issuance the desk has flagged, no final prospectus for an offering of shares (SEC form 424B1, 424B4 or 424B5) and no report of an unregistered sale of shares (Form 8-K item 3.02) filed on or after the count date, no share split since the count, and holdings dated at or before the count. Insider sales after the count date are not reflected.`,
      ],
    };
  }

  if (bound.state === 'UNKNOWN') {
    return {
      kind: 'unknown',
      face: 'Unknown',
      date: null,
      ariaLabel: 'float unknown for this name',
      paragraphs: [(bound.reason && UNKNOWN_TEXT[bound.reason]) || 'No filed share count.'],
    };
  }

  return {
    kind: 'cannotVerify',
    face: 'Cannot verify',
    date: null,
    ariaLabel: 'float cannot be verified for this name',
    paragraphs: [cannotVerifyText(bound.reason, countDate, longDate(bound.fetchedOn))],
  };
}

/** The sort value: the bound, only where it is PRODUCED. A refused or absent float has no number to order by. */
export function floatSortValue(bound: FloatBound | null | undefined): number | null {
  return bound?.state === 'PRODUCED' && bound.bound !== null && bound.bound > 0 ? bound.bound : null;
}
