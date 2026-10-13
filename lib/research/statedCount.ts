/**
 * Float fix 2, piece 2: the newest share count a LATER filing states. His yes on 8-K and 424B (Integration chat, uuid
 * da37a14b) and on registration and proxy statements (uuid d157f781, 2026-10-13T15:45:21.334Z, "yes, read registration
 * and proxy statements too"). The survey (`8e24cf6a`, docs/research/stated-count/result.md): 12 of 78 sampled names had
 * a newer stated common-share count than the SEC cover count, mostly in registration statements, prospectuses and
 * proxies; two covers were years old.
 *
 * The matcher is the survey's, unchanged, with its control: common stock only, and a count is taken only from a
 * sentence that carries its own date ("N shares of common stock ... outstanding as of DATE", "As of DATE, there were N
 * shares of common stock ... outstanding"). Anything else is not read, never guessed. Two different counts for the
 * newest date are a conflict: the cover count stands.
 */
import type { SubmissionsRecent } from './floatJob';

/** The forms read: 8-K, 424B1 to 424B5, S-1/S-3/F-1/F-3 and amendments, DEF/PRE 14A/14C. */
export const STATED_COUNT_FORMS = /^(?:8-K(?:\/A)?|424B[1-5]|(?:S-1|S-3|F-1|F-3)(?:\/A)?|(?:DEF|PRE) 14[AC])$/;
/** At most this many later filings opened a name per run, newest first (the survey's busy filers had hundreds). */
export const MAX_STATED_READS = 12;

const COUNT = String.raw`(\d{1,3}(?:,\d{3})+|\d{5,})`;
const DATE = String.raw`((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})`;
const CLASS = String.raw`(?:shares\s+of\s+(?:the\s+(?:Company|Registrant|Issuer)['’]s\s+|our\s+|its\s+)?(?:Class\s+A\s+)?(?:common\s+stock|ordinary\s+shares)|(?:Class\s+A\s+)?common\s+shares)`;
const STATED: RegExp[] = [
  new RegExp(COUNT + String.raw`\s+` + CLASS + String.raw`[^.;]{0,80}?\boutstanding\s+(?:as\s+of|at|on)\s+` + DATE, 'gi'),
  new RegExp(String.raw`(?:As\s+of|At|On)\s+` + DATE + String.raw`,\s+(?:there\s+were\s+|we\s+had\s+|the\s+(?:Company|Registrant|Issuer)\s+had\s+)?` + COUNT + String.raw`\s+` + CLASS + String.raw`[^.;]{0,60}?(?:issued\s+and\s+)?outstanding`, 'gi'),
];

export interface Stated {
  shares: number;
  asOf: string;
}

function isoDate(text: string): string | null {
  const t = Date.parse(`${text.replace(/\s+/g, ' ')} 12:00 UTC`);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
}

/**
 * Commercial read 99 (1): a prospectus's "shares outstanding after this offering" assumes full sale and is never the
 * count. A match whose words carry such a condition is refused (the first pattern's gap can reach past "to be
 * outstanding after this offering" to a later "outstanding as of").
 */
const CONDITIONAL = /\b(?:after|following|upon|assum\w*|to\s+be\s+outstanding|pro\s+forma)\b/i;

/** Every dated common-share count in the text (the survey's `statedCounts`), less read 99's conditional figures. */
export function statedCounts(text: string): Stated[] {
  const out: Stated[] = [];
  for (const [i, pattern] of STATED.entries()) {
    const re = new RegExp(pattern.source, pattern.flags);
    for (let m = re.exec(text); m !== null; m = re.exec(text)) {
      if (CONDITIONAL.test(m[0])) {
        // Refused: search again from just past its start, so a dated count INSIDE it (the base count) is still found. A
        // tail of the refused number ("0,000,000") runs to the same "outstanding as of", so it carries the same refused
        // words and is refused too (a guard against it was a mutant that survived: nothing reached it).
        re.lastIndex = m.index + 1;
        continue;
      }
      const [countText, dateText] = i === 0 ? [m[1]!, m[2]!] : [m[2]!, m[1]!];
      const shares = Number(countText.replace(/,/g, ''));
      const asOf = isoDate(dateText);
      if (asOf && shares > 0) out.push({ shares, asOf });
    }
  }
  return out;
}

export interface StatedCandidate {
  form: string;
  filingDate: string;
  accession: string;
  primaryDocument: string;
}

/**
 * The listing's filings that may state a count newer than the cover's: the forms above, filed after the cover's as-of
 * date and on or before D (a later filing is look-ahead), newest first.
 */
export function statedCountFilings(data: SubmissionsRecent, coverAsOf: string, asOfDate: string): StatedCandidate[] {
  const r = data.filings.recent;
  const out: StatedCandidate[] = [];
  for (let i = 0; i < r.accessionNumber.length; i += 1) {
    const form = r.form[i]!;
    const filingDate = r.filingDate[i]!;
    if (!STATED_COUNT_FORMS.test(form) || filingDate <= coverAsOf || filingDate > asOfDate || !r.primaryDocument[i]) continue;
    out.push({ form, filingDate, accession: r.accessionNumber[i]!, primaryDocument: r.primaryDocument[i]! });
  }
  return out.sort((a, b) => b.filingDate.localeCompare(a.filingDate) || b.accession.localeCompare(a.accession));
}

/** What the read found, stored on the row so the hover can name the filing and a reader can see what was not read. */
export interface StatedCountCheck {
  /** The newer count, dated by its own sentence, and the filing that states it; null = the cover count stands. */
  found: { shares: number; asOf: string; filed: string; accession: string; form: string } | null;
  /** Filings opened and read. */
  read: number;
  /** Filings whose document could not be fetched. */
  unread: number;
  /** Candidate filings past MAX_STATED_READS, not opened. */
  capped: number;
  /** The newest date carried two different counts: none is used. */
  conflict: { asOf: string; shares: number[] } | null;
}

/**
 * Newest first. A filing cannot state a date after its own filing date, so once a filing is no newer than the best date
 * found, no older filing can beat it and the read stops. Only a count dated after the cover's as-of date and on or
 * before D counts.
 */
export async function newestStatedCount(
  candidates: readonly StatedCandidate[],
  readText: (candidate: StatedCandidate) => Promise<string>,
  coverAsOf: string,
  asOfDate: string,
): Promise<StatedCountCheck> {
  let read = 0;
  let unread = 0;
  let opened = 0;
  let best: { asOf: string; values: Map<number, StatedCandidate> } | null = null;
  let capped = 0;
  for (const [i, candidate] of candidates.entries()) {
    if (best && candidate.filingDate <= best.asOf) break;
    if (opened >= MAX_STATED_READS) {
      // Not opened, and each could still have stated a newer date than the best found.
      capped = candidates.slice(i).filter((c) => !best || c.filingDate > best.asOf).length;
      break;
    }
    opened += 1;
    let text: string;
    try {
      text = await readText(candidate);
    } catch {
      unread += 1;
      continue;
    }
    read += 1;
    for (const stated of statedCounts(text)) {
      if (stated.asOf <= coverAsOf || stated.asOf > asOfDate || stated.asOf > candidate.filingDate) continue;
      if (!best || stated.asOf > best.asOf) best = { asOf: stated.asOf, values: new Map([[stated.shares, candidate]]) };
      else if (stated.asOf === best.asOf && !best.values.has(stated.shares)) best.values.set(stated.shares, candidate);
    }
  }
  if (!best) return { found: null, read, unread, capped, conflict: null };
  if (best.values.size > 1) return { found: null, read, unread, capped, conflict: { asOf: best.asOf, shares: [...best.values.keys()].sort((a, b) => a - b) } };
  const [[shares, from]] = [...best.values.entries()] as [[number, StatedCandidate]];
  return { found: { shares, asOf: best.asOf, filed: from.filingDate, accession: from.accession, form: from.form }, read, unread, capped, conflict: null };
}
