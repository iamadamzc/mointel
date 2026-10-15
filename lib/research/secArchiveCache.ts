/**
 * L8 defect fix (Integration 41st's ruling, 2026-10-14): a disk cache for SEC ARCHIVE documents, so a repeat night
 * does not fetch again what cannot have changed.
 *
 * WHY. The nightly float run computes every name for a NEW date each night, about 36 SEC requests a name (the first
 * night stopped at its 20,000 cap after 555 names): companyfacts and the submissions listing (2, which change), up to
 * 12 later filings read for a stated count (statedCount.ts MAX_STATED_READS), and one Form 3/4/5 XML per insider
 * filing in the last 730 days (floatJob.ts FLOAT_WINDOW_DAYS). The last two are EDGAR archive documents addressed by
 * accession number; a filed document never changes (an amendment is a new accession). So the same bytes come from
 * disk on every later night and the run's checks are unchanged.
 *
 * WHAT IS CACHED. Only a URL under https://www.sec.gov/Archives/edgar/data/{cik}/{18-digit accession}/{document}.
 * Never companyfacts or the submissions listing (data.sec.gov, mutable), never a failure (a throw is not stored).
 *
 * NEVER FAILS A NAME. A cache read or write that throws is ignored: the document is fetched, as without a cache.
 * Files are gzip, one per URL, named by the URL's sha256, written to a temporary name and renamed, so a reader in
 * another process never sees half a file.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/** An EDGAR archive document, addressed by accession: immutable once filed. */
export const ARCHIVE_DOCUMENT = /^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/\d+\/\d{18}\/[^?#\s]+$/;

export function archiveCachePath(dir: string, url: string): string {
  const key = crypto.createHash('sha256').update(url).digest('hex');
  return path.join(dir, key.slice(0, 2), `${key}.txt.gz`);
}

/** `getText` with archive documents served from `dir` after their first fetch. `dir` null: no cache (today's path). */
export function archiveCached(getText: (url: string) => Promise<string>, dir: string | null): (url: string) => Promise<string> {
  if (dir === null) return getText;
  return async (url: string) => {
    if (!ARCHIVE_DOCUMENT.test(url)) return getText(url);
    const file = archiveCachePath(dir, url);
    try {
      return zlib.gunzipSync(fs.readFileSync(file)).toString('utf8');
    } catch {
      // Not cached yet, or unreadable: fetch, as without a cache.
    }
    const text = await getText(url);
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const temporary = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
      fs.writeFileSync(temporary, zlib.gzipSync(Buffer.from(text, 'utf8')));
      fs.renameSync(temporary, file);
    } catch {
      // A cache that cannot be written costs only the next night's fetch.
    }
    return text;
  };
}
