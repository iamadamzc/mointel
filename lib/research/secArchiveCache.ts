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
 *
 * THE BOUND (Integration 41st, L8 follow-up, 2026-10-15; Ops measured 67,205 documents / 206.4 MB after one full
 * night, with no bound). Files sit in a shard per FILING YEAR, read from the accession ({dir}/{yyyy}/{xx}/{sha}),
 * so age is known without the URL. `pruneArchiveCache` (at nightly start) drops year shards older than the current
 * year minus 2, which covers the run's 730-day window with margin; a document it drops costs one fetch if a stale
 * filer ever needs it, never a different result. The first layout ({dir}/{xx}/{sha}, before the bound) is still
 * read, and a hit there is MOVED into its year shard, so a night migrates what it uses without fetching; an
 * old-layout file not read in 7 days is pruned by its mtime. A size cap (`maxBytes`) STOPS WRITES above it and never
 * deletes on size, so nothing a run needs is evicted by a count.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/** An EDGAR archive document, addressed by accession: immutable once filed. */
export const ARCHIVE_DOCUMENT = /^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/\d+\/\d{18}\/[^?#\s]+$/;
const ACCESSION = /^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/\d+\/(\d{18})\//;
/** Year shards are "2026"; the first layout's shards are two hex digits. */
const YEAR_SHARD = /^\d{4}$/;
const LEGACY_SHARD = /^[0-9a-f]{2}$/;
/** Year shards older than the current year minus this are pruned. */
export const KEEP_YEARS_BACK = 2;
/** First-layout files not read (so not migrated) in this many days are pruned. */
export const LEGACY_MAX_AGE_DAYS = 7;

/**
 * The filing year of an archive URL, from its accession (10-digit filer, 2-digit year, 6-digit sequence); else null.
 * EDGAR began in 1993, so 90-99 are the 1990s (an old filing read for a stale filer), never the 2090s.
 */
export function archiveYear(url: string): number | null {
  const accession = ACCESSION.exec(url)?.[1];
  if (!accession) return null;
  const yy = Number(accession.slice(10, 12));
  return yy >= 90 ? 1900 + yy : 2000 + yy;
}

const keyOf = (url: string) => crypto.createHash('sha256').update(url).digest('hex');

/** Where a document is kept: its year shard, or the first layout's shard when the URL carries no accession. */
export function archiveCachePath(dir: string, url: string): string {
  const key = keyOf(url);
  const year = archiveYear(url);
  return year === null ? path.join(dir, key.slice(0, 2), `${key}.txt.gz`) : path.join(dir, String(year), key.slice(0, 2), `${key}.txt.gz`);
}

/** The first layout's path (before the bound), still read and migrated from. */
export function legacyArchiveCachePath(dir: string, url: string): string {
  const key = keyOf(url);
  return path.join(dir, key.slice(0, 2), `${key}.txt.gz`);
}

/** Every cached file: year shards' files and the first layout's. Never throws; a missing directory yields nothing. */
function cachedFiles(dir: string): Array<{ file: string; shard: string; legacy: boolean }> {
  const out: Array<{ file: string; shard: string; legacy: boolean }> = [];
  const list = (d: string) => {
    try {
      return fs.readdirSync(d);
    } catch {
      return [];
    }
  };
  for (const shard of list(dir)) {
    if (LEGACY_SHARD.test(shard)) {
      for (const name of list(path.join(dir, shard))) if (name.endsWith('.txt.gz')) out.push({ file: path.join(dir, shard, name), shard, legacy: true });
    } else if (YEAR_SHARD.test(shard)) {
      for (const sub of list(path.join(dir, shard))) {
        for (const name of list(path.join(dir, shard, sub))) if (name.endsWith('.txt.gz')) out.push({ file: path.join(dir, shard, sub, name), shard, legacy: false });
      }
    }
  }
  return out;
}

/**
 * The cache's size, so it cannot grow unseen (Ops's ask): the nightly run logs it at start. Never throws: a missing or
 * unreadable directory reads as empty.
 */
export function archiveCacheSize(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const { file } of cachedFiles(dir)) {
    try {
      bytes += fs.statSync(file).size;
      files += 1;
    } catch {
      // Gone between the listing and the stat.
    }
  }
  return { files, bytes };
}

/**
 * The bound, run at nightly start: year shards older than (now's year - KEEP_YEARS_BACK) are removed whole, and
 * first-layout files whose mtime is older than LEGACY_MAX_AGE_DAYS. Never throws; reports what it removed.
 */
export function pruneArchiveCache(dir: string, now: Date): { yearShards: string[]; legacyFiles: number; bytes: number } {
  const oldest = now.getUTCFullYear() - KEEP_YEARS_BACK;
  const legacyBefore = now.getTime() - LEGACY_MAX_AGE_DAYS * 86_400_000;
  const removed = { yearShards: [] as string[], legacyFiles: 0, bytes: 0 };
  const byShard = new Map<string, number>();
  for (const { file, shard, legacy } of cachedFiles(dir)) {
    try {
      const stat = fs.statSync(file);
      if (legacy) {
        if (stat.mtimeMs < legacyBefore) {
          fs.rmSync(file, { force: true });
          removed.legacyFiles += 1;
          removed.bytes += stat.size;
        }
      } else if (Number(shard) < oldest) {
        byShard.set(shard, (byShard.get(shard) ?? 0) + stat.size);
      }
    } catch {
      // A file that cannot be read or removed stays; it costs only space.
    }
  }
  for (const [shard, bytes] of byShard) {
    try {
      fs.rmSync(path.join(dir, shard), { recursive: true, force: true });
      removed.yearShards.push(shard);
      removed.bytes += bytes;
    } catch {
      // Stays until a later night.
    }
  }
  removed.yearShards.sort();
  return removed;
}

/** The default write-stop cap, 2 GB: about ten times the first full night's 206 MB. */
export const DEFAULT_ARCHIVE_CACHE_MAX_MB = 2048;

/**
 * The cap from FLOAT_ARCHIVE_CACHE_MAX_MB, in bytes: unset or unreadable is the default, "off" is no cap, a positive
 * number is megabytes.
 */
export function archiveCacheMaxBytes(setting: string | undefined): number | null {
  if (setting?.trim().toLowerCase() === 'off') return null;
  const mb = Number(setting);
  return (setting && Number.isFinite(mb) && mb > 0 ? mb : DEFAULT_ARCHIVE_CACHE_MAX_MB) * 1_048_576;
}

export interface ArchiveCacheCap {
  /** Above this many bytes the cache stops WRITING (reads go on). Null: no cap. */
  maxBytes: number | null;
  /** The cache's size when the run started (archiveCacheSize). */
  startBytes: number;
  /** Called once, when a write is first refused. */
  onFull?: (bytes: number) => void;
}

/** `getText` with archive documents served from `dir` after their first fetch. `dir` null: no cache (today's path). */
export function archiveCached(
  getText: (url: string) => Promise<string>,
  dir: string | null,
  cap: ArchiveCacheCap = { maxBytes: null, startBytes: 0 },
): (url: string) => Promise<string> {
  if (dir === null) return getText;
  let bytes = cap.startBytes;
  let full = false;
  return async (url: string) => {
    if (!ARCHIVE_DOCUMENT.test(url)) return getText(url);
    const file = archiveCachePath(dir, url);
    try {
      return zlib.gunzipSync(fs.readFileSync(file)).toString('utf8');
    } catch {
      // Not in its year shard yet.
    }
    const legacy = legacyArchiveCachePath(dir, url);
    if (legacy !== file) {
      try {
        const text = zlib.gunzipSync(fs.readFileSync(legacy)).toString('utf8');
        try {
          // Migrate: a first-layout hit moves into its year shard, so the next night finds it there.
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.renameSync(legacy, file);
        } catch {
          // Left where it is; it is still read from there.
        }
        return text;
      } catch {
        // Not cached at all, or unreadable: fetch, as without a cache.
      }
    }
    const text = await getText(url);
    if (cap.maxBytes !== null && bytes >= cap.maxBytes) {
      if (!full) cap.onFull?.(bytes);
      full = true;
      return text;
    }
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const temporary = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
      const gz = zlib.gzipSync(Buffer.from(text, 'utf8'));
      fs.writeFileSync(temporary, gz);
      fs.renameSync(temporary, file);
      bytes += gz.length;
    } catch {
      // A cache that cannot be written costs only the next night's fetch.
    }
    return text;
  };
}
