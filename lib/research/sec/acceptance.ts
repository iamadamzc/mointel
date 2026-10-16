/**
 * WHEN EDGAR ACCEPTED A FILING, FROM THE FILING'S OWN HEADER (Integration 42nd's ruling, 2026-10-16).
 *
 * The submissions JSON's `acceptanceDateTime` is wrong for a share of filings, and the way it is wrong changed around
 * 2026-10-02: against each filing's index header, 858 of 10,446 stored rows were off (docs/research/sec-acceptance/ on
 * f4fa9c89). Before 10-02 a few percent a day read 4 h EARLY (the Eastern clock written with a Z); from 10-02 a rising
 * share read LATE by the Eastern offset (true UTC plus 4 h in summer, 5 h in winter), 166 of 297 rows fetched 10-14.
 * The header's ACCEPTANCE-DATETIME was right in every case read, so it is the only source of the instant here.
 *
 * The header gives Eastern local time with no zone. It is converted by the US daylight rule: EDT (UTC-4) from the
 * second Sunday of March at 02:00 to the first Sunday of November at 02:00, EST (UTC-5) otherwise. On the November
 * day the hour 01:00-01:59 happens twice; it is read as EDT, the first one (EDGAR accepts no filing at that hour).
 *
 * A read that fails for any reason returns null, and the caller stores the filing DATE with UNKNOWN precision: never
 * the JSON instant, which is wrong a share of the time with no sign of which.
 */
import type { SecClient } from './client';

/** The filing's index header page: small, and it carries ACCEPTANCE-DATETIME. */
export function filingHeaderUrl(cik: string, accession: string): string {
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replace(/-/g, '')}/${accession}-index-headers.html`;
}

/** The nth (1-based) Sunday of a month, as a day of the month. */
function nthSunday(year: number, monthIndex: number, n: number): number {
  const firstDow = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  return 1 + ((7 - firstDow) % 7) + 7 * (n - 1);
}

/** Hours to add to an Eastern local time to get UTC: 4 in daylight time, 5 in standard time. */
export function easternOffsetHours(year: number, monthIndex: number, day: number, hour: number): 4 | 5 {
  const marchSwitch = nthSunday(year, 2, 2);
  const novemberSwitch = nthSunday(year, 10, 1);
  const after = (m: number, d: number) => monthIndex > m || (monthIndex === m && (day > d || (day === d && hour >= 2)));
  return after(2, marchSwitch) && !after(10, novemberSwitch) ? 4 : 5;
}

/** "YYYYMMDDHHMMSS" Eastern to an ISO UTC instant ("...000Z"); null when it is not that shape. */
export function easternToUtc(stamp: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(stamp);
  if (!m) return null;
  const [year, month, day, hour, minute, second] = m.slice(1).map(Number) as [number, number, number, number, number, number];
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
  const offset = easternOffsetHours(year, month - 1, day, hour);
  return new Date(Date.UTC(year, month - 1, day, hour + offset, minute, second)).toISOString();
}

/** ACCEPTANCE-DATETIME from a filing header page (or an .hdr.sgml), as UTC; null when absent. */
export function parseAcceptance(text: string): string | null {
  const m = /ACCEPTANCE-DATETIME(?:&gt;|>)\s*(\d{14})/.exec(text);
  return m ? easternToUtc(m[1]!) : null;
}

/** The filing's acceptance instant from its header, through the rate-limited client; null on any failure. */
export async function filingAcceptance(client: Pick<SecClient, 'get'>, cik: string, accession: string): Promise<string | null> {
  try {
    const { body } = await client.get(filingHeaderUrl(cik, accession));
    return parseAcceptance(body);
  } catch {
    return null;
  }
}
