/**
 * SEC exhibit identification.
 *
 * The press release attached to an 8-K or 6-K is usually where the actual
 * announcement text lives — the filing body often says little more than "see
 * Exhibit 99.1". So the exhibit is the catalyst evidence, and it is worth
 * retrieving separately and linking back to its parent filing.
 *
 * Selection is deliberate, never "fetch everything attached". A filing can
 * carry dozens of items, most of them graphics, XBRL fragments and cover-page
 * XML that cost a request and say nothing.
 */

import { accessionPathSegment } from '../sec/submissions';
import { cikPathSegment } from '../sec/tickerMap';

/**
 * Directory listing for one filing.
 *
 * Note this does NOT carry exhibit types: its `type` field holds an icon name
 * such as TEXT.GIF, not EX-99.1. Exhibit types come from the filing index page
 * — see `filingIndexHtmlUrl` and `parseFilingIndexHtml`.
 */
export function filingIndexJsonUrl(cik: string, accession: string): string {
  return [
    'https://www.sec.gov/Archives/edgar/data',
    cikPathSegment(cik),
    accessionPathSegment(accession),
    'index.json',
  ].join('/');
}

/** Filing index page, whose table states each document's exhibit type. */
export function filingIndexHtmlUrl(cik: string, accession: string): string {
  return [
    'https://www.sec.gov/Archives/edgar/data',
    cikPathSegment(cik),
    accessionPathSegment(accession),
    `${accession}-index.htm`,
  ].join('/');
}

/**
 * Extracts document rows from the filing index page.
 *
 * The page lists each document with a Type column carrying the real exhibit
 * designation (EX-99.1, EX-10.1, and so on). Parsing is row-based and tolerant:
 * SEC has several table layouts across filing ages, so a row that does not
 * yield both a document and a type is skipped rather than failing the filing.
 */
export function parseFilingIndexHtml(html: string): FilingIndexItem[] {
  const items: FilingIndexItem[] = [];
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];

  for (const row of rows) {
    const cells = (row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? []).map((cell) =>
      cell
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    );
    if (cells.length < 3) continue;

    const hrefMatch = row.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;

    const fileName = hrefMatch[1].split('/').pop()?.split('?')[0];
    if (!fileName) continue;

    // The type is whichever cell looks like a form or exhibit designation.
    const type = cells.find((cell) => /^(EX-|8-K|6-K|10-|20-F|40-F|S-|F-|424|GRAPHIC)/i.test(cell));
    if (!type) continue;

    const sizeCell = cells[cells.length - 1];
    const size = Number(sizeCell.replace(/[^0-9]/g, ''));

    items.push({
      name: fileName,
      type: type.trim().toUpperCase(),
      size: Number.isFinite(size) && size > 0 ? size : null,
      lastModified: null,
    });
  }

  return items;
}

export function exhibitUrl(cik: string, accession: string, fileName: string): string {
  return [
    'https://www.sec.gov/Archives/edgar/data',
    cikPathSegment(cik),
    accessionPathSegment(accession),
    fileName,
  ].join('/');
}

/**
 * An exhibit's stored title, in Marketing's exact words (`docs/marketing/source-title-words-2026-10-09.md`
 * at 7b332c27; Commercial read 50 passed): "{exhibitType} to {parentForm}", e.g. "EX-99.1 to 8-K". With no
 * parent form, the exhibit type alone. No date or time: the drawer prints the date, and `publishedAt` holds
 * the time. Rows stored before this keep "EX-99.1: 8-K {ISO time}"; the drawer labels those from fields.
 */
export function exhibitTitle(exhibitType: string, parentForm: string | null): string {
  const form = parentForm?.trim() ?? '';
  return form === '' ? exhibitType : `${exhibitType} to ${form}`;
}

export interface FilingIndexResponse {
  directory?: {
    name?: string;
    item?: Array<{
      name?: string;
      type?: string;
      size?: string | number;
      'last-modified'?: string;
    }>;
  };
}

export interface FilingIndexItem {
  name: string;
  /** SEC's declared item type, e.g. EX-99.1, 8-K, GRAPHIC. */
  type: string;
  size: number | null;
  lastModified: string | null;
}

export function parseFilingIndex(response: FilingIndexResponse): FilingIndexItem[] {
  const items = response.directory?.item ?? [];
  const parsed: FilingIndexItem[] = [];

  for (const item of items) {
    if (!item.name) continue;
    const size = item.size === undefined ? null : Number(item.size);
    parsed.push({
      name: item.name,
      type: (item.type ?? '').trim().toUpperCase(),
      size: Number.isFinite(size) ? (size as number) : null,
      lastModified: item['last-modified'] ?? null,
    });
  }

  return parsed;
}

/** File extensions that can carry readable release text. */
const READABLE_EXTENSIONS = /\.(htm|html|txt)$/i;

/**
 * Item types that never contain a press release. Excluded before anything is
 * fetched, because each one would be a wasted SEC request.
 */
const NON_RELEASE_TYPES = new Set([
  'GRAPHIC',
  'EX-101.INS',
  'EX-101.SCH',
  'EX-101.CAL',
  'EX-101.DEF',
  'EX-101.LAB',
  'EX-101.PRE',
  'XML',
  'EXCEL',
  'JSON',
  'ZIP',
  'EX-FILING FEES',
  'CORRESP',
  'SC 13D',
]);

/**
 * Exhibit types that carry announcements.
 *
 * EX-99.1 is the overwhelmingly common home of a press release; EX-99.2 is
 * usually the accompanying deck or a second release. Anything under EX-99 is a
 * candidate, and EX-10 material agreements are included because financing
 * announcements frequently arrive that way.
 */
const RELEASE_TYPE_PATTERNS = [/^EX-99(\.\d+)?$/, /^EX-10(\.\d+)?$/];

export interface ExhibitCandidate extends FilingIndexItem {
  /** Lower is fetched first. */
  priority: number;
  reason: string;
}

/**
 * Chooses which exhibits are likely to carry the announcement.
 *
 * Returns them ordered, capped by the caller. A filing whose index lists no
 * plausible release exhibit returns an empty list rather than a guess — the
 * parent filing body has already been collected in Phase 2 either way.
 */
export function selectReleaseExhibits(
  items: readonly FilingIndexItem[],
  options: { max?: number } = {},
): ExhibitCandidate[] {
  const max = options.max ?? 2;
  const candidates: ExhibitCandidate[] = [];

  for (const item of items) {
    if (NON_RELEASE_TYPES.has(item.type)) continue;
    if (!READABLE_EXTENSIONS.test(item.name)) continue;

    const matchesReleaseType = RELEASE_TYPE_PATTERNS.some((pattern) => pattern.test(item.type));
    if (!matchesReleaseType) continue;

    // EX-99.1 first, then other EX-99, then EX-10 material agreements.
    let priority = 3;
    let reason = 'material agreement exhibit';
    if (item.type === 'EX-99.1') {
      priority = 1;
      reason = 'primary release exhibit';
    } else if (item.type.startsWith('EX-99')) {
      priority = 2;
      reason = 'supplementary release exhibit';
    }

    candidates.push({ ...item, priority, reason });
  }

  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.name.localeCompare(b.name);
  });

  return candidates.slice(0, max);
}
