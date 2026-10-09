/**
 * A SHEET LEVEL CARRIES ITS SOURCE'S OWN DATE (Integration 36th, option (a), on Research's OFAL finding,
 * 2026-10-09). OFAL's ladder showed the Sheet's 1.23 and 1.34 "daily support" and 1.44 from a RESEARCH row
 * dated 2026-08-13, eight weeks old, with nothing on the level saying so. The RESEARCH row's report date now
 * travels with every level built from that row (daily support, daily resistance) and prints beside it.
 *
 * The TODAY tab's key levels carry no date in their row, so they get none: no date is invented from when the
 * desk read the Sheet, which is not when the level was written.
 *
 * A calendar date, not an instant: "2026-08-13" is Aug 13 everywhere, so it is never passed through a time
 * zone (UTC midnight read in ET is the day before). Format as the source labels' (Marketing 488b3baa, answer
 * 5): "Aug 13", with the year when it is not the reader's ET year.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Between the level's type and its date: "1.23 support dated Aug 13" (Marketing 1487cd93, Commercial read 55).
 * Not ", ": before "LOST SUPPORT" the bare date read as the day support was lost. Not "from" or "as of":
 * each claims more (when the level began, or that it held then). "dated" is true of the row either way.
 */
export const LEVEL_DATE_SEPARATOR = ' dated ';

function valid(y: number, m: number, d: number): boolean {
  if (!(y >= 1900 && m >= 1 && m <= 12 && d >= 1)) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The Sheet's report date as YYYY-MM-DD, or null. Only a cell that IS yyyy-mm-dd (Commercial read 55 (2)):
 * any other form is null and prints no date, since a general parse can invent a year or swap day and month,
 * and a cell with a time after it is an instant, not a calendar date.
 */
export function sheetCalendarDate(raw: string | null | undefined): string | null {
  const iso = (raw?.trim() ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!iso) return null;
  const [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  return valid(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null;
}

const ET_YEAR = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric' });

/** In a hover title, the Sheet's own term (Marketing 15a8c9f3): "1.23 support, report date Aug 13". */
export const LEVEL_DATE_HOVER_SEPARATOR = ', report date ';

/**
 * Between a dated level and a state tag in the same text run (Commercial read 55 advisory, Marketing
 * 15a8c9f3): "1.23 support dated Aug 13 · LOST SUPPORT", so the date never reads as when support was lost.
 */
export const LEVEL_TAG_AFTER_DATE = ' · ';

/** The hover form of `levelDateSuffix`: ", report date Aug 13", or "". */
export function levelDateHoverSuffix(ymd: string | null | undefined): string {
  const text = levelDateText(ymd, Date.now());
  return text ? `${LEVEL_DATE_HOVER_SEPARATOR}${text}` : '';
}

/** What goes before a state tag: " · " after a printed date, the plain space otherwise. */
export function levelTagLead(ymd: string | null | undefined): string {
  return levelDateText(ymd, Date.now()) ? LEVEL_TAG_AFTER_DATE : ' ';
}

/** What follows a level's type: " dated Aug 13", or "" for an undated level. Reads the clock (the year rule), so renderers call it rather than read the clock in render. */
export function levelDateSuffix(ymd: string | null | undefined): string {
  const text = levelDateText(ymd, Date.now());
  return text ? `${LEVEL_DATE_SEPARATOR}${text}` : '';
}

/** "Aug 13" in the reader's ET year, "Aug 13, 2025" otherwise; null for no date. */
export function levelDateText(ymd: string | null | undefined, nowMs: number): string | null {
  const parts = ymd?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return null;
  const [y, m, d] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  if (!valid(y, m, d)) return null;
  const text = `${MONTHS[m - 1]} ${d}`;
  return Number.isFinite(nowMs) && ET_YEAR.format(new Date(nowMs)) === String(y) ? text : `${text}, ${y}`;
}
