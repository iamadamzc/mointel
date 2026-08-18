import { describe, expect, it } from 'vitest';

import { normaliseTimestamp, publishedDisplay } from '@/lib/research/time';
import { authorityForKind, sourceTypeForKind } from '@/lib/research/catalyst/discovery';
import { clusterSources, selectCanonical } from '@/lib/research/catalyst/cluster';

/**
 * What a source actually claims about when it was published.
 *
 * A company press page usually carries a date and no clock. Storing that at
 * noon UTC is a convenience — it lands the release on the right calendar day in
 * market time — but noon is not a time the issuer published, and MCP was
 * reporting it as one: Einride's own pages came back as `2026-08-18T12:00:00Z`
 * while the dossier said date-only, and the newswire copy of the same
 * announcement carried a real 06:30 ET stamp.
 *
 * Noon is also later than 06:30 ET, so the fabricated value outranked the real
 * one in any comparison sorted by time.
 */

const NEWSWIRE_EXACT = '2026-08-18T10:30:00.000Z'; // 06:30 ET, as GlobeNewswire stamped it
const HEADLINE = 'Einride Partners with Tesla for the World’s Largest Tesla Semi Deployment';

describe('reading a date-only timestamp back out', () => {
  it('publishes the date, not the noon it was stored at', () => {
    const stored = normaliseTimestamp('2026-08-18', 'DATE_ONLY');

    expect(stored.utc).toBe('2026-08-18T12:00:00.000Z');
    expect(stored.etClock).toBeNull();
    expect(publishedDisplay(stored.utc, stored.precision)).toBe('2026-08-18');
  });

  it('publishes an exact timestamp unchanged', () => {
    expect(publishedDisplay(NEWSWIRE_EXACT, 'EXACT')).toBe(NEWSWIRE_EXACT);
  });

  it('publishes nothing for a source with no date at all', () => {
    expect(publishedDisplay(null, 'UNKNOWN')).toBeNull();
  });

  it('does not invent a clock for a date-only value', () => {
    const stored = normaliseTimestamp('August 18, 2026', 'DATE_ONLY');
    expect(stored.precision).toBe('DATE_ONLY');
    expect(stored.etClock).toBeNull();
  });
});

/* ----------------------------------------------------------- deduplication */

function source(
  id: number,
  overrides: Partial<Parameters<typeof selectCanonical>[0][number]>,
): Parameters<typeof selectCanonical>[0][number] {
  return {
    id,
    title: HEADLINE,
    url: `https://example.test/${id}`,
    publishedAt: NEWSWIRE_EXACT,
    contentHash: null,
    authority: 'NEWSWIRE',
    accession: null,
    sourceType: 'NEWSWIRE',
    ...overrides,
  } as Parameters<typeof selectCanonical>[0][number];
}

describe('one announcement arriving twice with different precision', () => {
  const newswire = source(1, {
    authority: 'NEWSWIRE',
    sourceType: 'NEWSWIRE',
    url: 'https://www.globenewswire.com/news-release/2026/08/18/einride-tesla.html',
    publishedAt: NEWSWIRE_EXACT,
  });
  const companyOriginal = source(2, {
    authority: 'COMPANY_IR',
    sourceType: 'COMPANY_NEWSROOM',
    url: 'https://www.einride.tech/press/einride-partners-with-tesla',
    // Date-only, stored at noon so it lands on the right calendar day.
    publishedAt: '2026-08-18T12:00:00.000Z',
  });

  it('collapses the copies into a single announcement', () => {
    const clusters = clusterSources('ENRD', [newswire, companyOriginal]);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].memberIds.sort()).toEqual([newswire.id, companyOriginal.id]);
    expect(clusters[0].canonicalId).toBe(companyOriginal.id);
  });

  it('prefers the company original as canonical over the newswire copy', () => {
    // Authority decides, not richness or recency: COMPANY_IR outranks NEWSWIRE.
    expect(selectCanonical([newswire, companyOriginal]).id).toBe(companyOriginal.id);
  });

  it('keeps the exact newswire stamp on its own record', () => {
    clusterSources('ENRD', [newswire, companyOriginal]);

    // Clustering groups; it does not rewrite members. The precise time survives
    // so chronology has something honest to use.
    expect(newswire.publishedAt).toBe(NEWSWIRE_EXACT);
  });

  it('does not lend the newswire clock to the date-only company page', () => {
    clusterSources('ENRD', [newswire, companyOriginal]);

    // Being the canonical member of a cluster does not grant it a time it never
    // published; it still reads out as a date.
    expect(companyOriginal.publishedAt).toBe('2026-08-18T12:00:00.000Z');
    expect(publishedDisplay(companyOriginal.publishedAt, 'DATE_ONLY')).toBe('2026-08-18');
  });
});

/* -------------------------------------------------------- authority mapping */

describe('authority and source type agree about a host', () => {
  it('files an issuer newsroom as a company source, not a newswire', () => {
    // The pair drifted: everything that was not SECONDARY was filed NEWSWIRE,
    // so einride.tech arrived as authority COMPANY_IR and type NEWSWIRE at once.
    expect(authorityForKind('COMPANY_NEWSROOM')).toBe('COMPANY_IR');
    expect(sourceTypeForKind('COMPANY_NEWSROOM')).toBe('COMPANY_NEWSROOM');
  });

  it('files an IR page as a company source', () => {
    expect(authorityForKind('COMPANY_IR')).toBe('COMPANY_IR');
    expect(sourceTypeForKind('COMPANY_IR')).toBe('COMPANY_IR');
  });

  it('files a newswire as a newswire', () => {
    expect(authorityForKind('NEWSWIRE')).toBe('NEWSWIRE');
    expect(sourceTypeForKind('NEWSWIRE')).toBe('NEWSWIRE');
  });

  it('files an aggregator as secondary on both axes', () => {
    expect(authorityForKind('SECONDARY')).toBe('SECONDARY');
    expect(sourceTypeForKind('SECONDARY')).toBe('SECONDARY_DISCOVERY');
  });

  it('never files a company kind as a newswire type', () => {
    for (const kind of ['COMPANY_IR', 'COMPANY_NEWSROOM'] as const) {
      expect(sourceTypeForKind(kind)).not.toBe('NEWSWIRE');
    }
  });
});
