import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { clusterSources, normaliseHeadline } from '@/lib/research/catalyst/cluster';
import { exhibitTitle } from '@/lib/research/catalyst/exhibits';
import type { ResearchSource } from '@/lib/research/types';
import { toEvidenceLink } from '@/lib/research/view';

/*
 * The exhibit's stored title (Marketing 7b332c27, Commercial read 50) and the exhibit type on the
 * drawer's evidence row (Design's rule 3). WORX, 2026-10-08, showed the old title in the drawer:
 * "EX-99.1: 8-K 2026-10-05T21:08:55.000Z".
 */

describe('exhibitTitle', () => {
  it('is "{exhibitType} to {parentForm}"', () => {
    expect(exhibitTitle('EX-99.1', '8-K')).toBe('EX-99.1 to 8-K');
    expect(exhibitTitle('EX-10.1', '8-K/A')).toBe('EX-10.1 to 8-K/A');
  });

  it('is the exhibit type alone with no parent form, never "to" followed by nothing or "null"', () => {
    expect(exhibitTitle('EX-99.1', null)).toBe('EX-99.1');
    expect(exhibitTitle('EX-99.1', '')).toBe('EX-99.1');
    expect(exhibitTitle('EX-99.1', '  ')).toBe('EX-99.1');
  });

  it('carries no date or time', () => {
    expect(exhibitTitle('EX-99.1', '8-K')).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

const source = (overrides: Partial<ResearchSource>): ResearchSource => ({
  id: 161090,
  ticker: 'WORX',
  sourceType: 'SEC_EXHIBIT',
  title: 'EX-99.1: 8-K 2026-10-05T21:08:55.000Z',
  url: 'https://www.sec.gov/Archives/edgar/data/1/000121390026106749/ex99-1.htm',
  publishedAt: '2026-10-05T21:08:55Z',
  fetchedAt: '2026-10-08T21:50:00Z',
  accession: '0001213900-26-106749',
  secForm: '8-K',
  authority: 'SEC',
  contentHash: 'hash',
  documentFingerprint: 'doc',
  excerpt: null,
  metadata: { parentAccession: '0001213900-26-106749', parentForm: '8-K', exhibitType: 'EX-99.1' },
  active: true,
  clusterId: null,
  canonical: true,
  publishedPrecision: 'INFERRED',
  ...overrides,
});

describe('toEvidenceLink exhibitType', () => {
  it("is the exhibit's stored type, beside the parent form as secForm", () => {
    const link = toEvidenceLink(source({}));
    expect(link.exhibitType).toBe('EX-99.1');
    expect(link.secForm).toBe('8-K');
  });

  it('is null for a source that is not an exhibit, even one whose metadata names a type', () => {
    expect(toEvidenceLink(source({ sourceType: 'SEC_FILING', metadata: { exhibitType: 'EX-99.1' } })).exhibitType).toBeNull();
  });

  it('is null for an exhibit with no usable stored type', () => {
    expect(toEvidenceLink(source({ metadata: {} })).exhibitType).toBeNull();
    expect(toEvidenceLink(source({ metadata: { exhibitType: 99 } })).exhibitType).toBeNull();
    expect(toEvidenceLink(source({ metadata: { exhibitType: ' ' } })).exhibitType).toBeNull();
  });
});

/*
 * Clustering with the new title (Integration 36th's condition; option F1). "EX-99.1 to 8-K" has no
 * headline words, so exhibits key by their filing's accession. Replay: docs/research/source-titles/
 * exhibit-cluster-replay.py (as built, 1,070 cluster ids shared on 704 tickers; with F1, none new).
 */
describe('exhibit clustering by accession', () => {
  const AT = '2026-10-05T21:08:55Z';
  const exhibit = (id: number, accession: string, exhibitType: string) =>
    source({ id, accession, title: exhibitTitle(exhibitType, '8-K'), publishedAt: AT, contentHash: `h${id}` });
  const idFor = (basis: string) => createHash('sha256').update(basis).digest('hex').slice(0, 16);

  it('puts the exhibits of one filing in one cluster', () => {
    const clusters = clusterSources('WORX', [exhibit(1, 'A-1', 'EX-99.1'), exhibit(2, 'A-1', 'EX-10.1')]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].memberIds.sort()).toEqual([1, 2]);
  });

  it('keeps two filings published at one instant apart, under different ids', () => {
    const clusters = clusterSources('WORX', [exhibit(1, 'A-1', 'EX-99.1'), exhibit(2, 'A-2', 'EX-99.1')]);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].clusterId).not.toBe(clusters[1].clusterId);
  });

  it('does not merge an exhibit with a non-exhibit that shares its accession', () => {
    const clusters = clusterSources('WORX', [
      exhibit(1, 'A-1', 'EX-99.1'),
      source({ id: 2, sourceType: 'NEWSWIRE', authority: 'NEWSWIRE', accession: 'A-1', title: 'SCWorx Announces Financing', contentHash: 'h2' }),
    ]);
    expect(clusters).toHaveLength(2);
  });

  it('keeps the id of a stored exhibit with the old title (the catalyst fingerprint hashes it)', () => {
    const old = 'EX-99.1: 8-K 2026-10-05T21:08:55.000Z';
    const [cluster] = clusterSources('WORX', [source({ id: 1, accession: 'A-1', title: old, publishedAt: AT })]);
    expect(cluster.clusterId).toBe(idFor(`WORX|${normaliseHeadline(old)}|${AT}`));
  });

  it('keys only an exhibit by accession, not another source whose title has no headline words', () => {
    const [cluster] = clusterSources('WORX', [
      source({ id: 1, sourceType: 'NEWSWIRE', authority: 'NEWSWIRE', accession: 'A-1', title: '8-K', publishedAt: AT }),
    ]);
    expect(cluster.clusterId).toBe(idFor(`WORX||${AT}`));
  });
});
