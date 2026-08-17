import { describe, expect, it } from 'vitest';

import {
  computeEvidenceFingerprint,
  evidenceChanged,
  hashContent,
  newAccessions,
} from '@/lib/research/fingerprint';
import type { NewResearchSource } from '@/lib/research/types';

function source(overrides: Partial<NewResearchSource> = {}): NewResearchSource {
  return {
    ticker: 'SLE',
    sourceType: 'SEC_FILING',
    title: '8-K',
    url: 'https://www.sec.gov/Archives/edgar/data/1/a.htm',
    publishedAt: '2026-08-17T11:00:00Z',
    fetchedAt: '2026-08-17T11:05:00Z',
    accession: '0001234567-26-000001',
    secForm: '8-K',
    authority: 'SEC',
    contentHash: 'hash-a',
    excerpt: null,
    metadata: {},
    active: true,
    ...overrides,
  };
}

describe('evidence fingerprint', () => {
  it('is stable when the same evidence is collected again', () => {
    const first = computeEvidenceFingerprint([source()]);
    // Only the fetch time differs; fetching is something we did, not the issuer.
    const second = computeEvidenceFingerprint([source({ fetchedAt: '2026-08-17T12:00:00Z' })]);
    expect(second).toBe(first);
  });

  it('ignores collection order', () => {
    const a = source();
    const b = source({ contentHash: 'hash-b', accession: '0001234567-26-000002' });
    expect(computeEvidenceFingerprint([a, b])).toBe(computeEvidenceFingerprint([b, a]));
  });

  it('changes when a new filing appears', () => {
    const before = computeEvidenceFingerprint([source()]);
    const after = computeEvidenceFingerprint([
      source(),
      source({ contentHash: 'hash-b', accession: '0001234567-26-000002', secForm: '424B5' }),
    ]);
    expect(after).not.toBe(before);
  });

  it('changes when a document body changes', () => {
    expect(computeEvidenceFingerprint([source({ contentHash: 'hash-z' })])).not.toBe(
      computeEvidenceFingerprint([source()]),
    );
  });

  it('changes when a source is superseded', () => {
    expect(computeEvidenceFingerprint([source({ active: false })])).not.toBe(
      computeEvidenceFingerprint([source()]),
    );
  });

  it('changes when shares outstanding moves', () => {
    const before = computeEvidenceFingerprint([source()], { sharesOutstanding: 10_000_000 });
    const after = computeEvidenceFingerprint([source()], { sharesOutstanding: 14_000_000 });
    expect(after).not.toBe(before);
  });

  it('treats absent and null structural facts identically', () => {
    expect(computeEvidenceFingerprint([source()], { sharesOutstanding: null })).toBe(
      computeEvidenceFingerprint([source()]),
    );
  });
});

describe('evidenceChanged', () => {
  it('reports change when nothing was analyzed before', () => {
    expect(evidenceChanged(null, 'fp-1')).toBe(true);
    expect(evidenceChanged(undefined, 'fp-1')).toBe(true);
  });

  it('reports no change for an identical fingerprint', () => {
    // This is the gate that stops a dashboard refresh or an elapsed refresh
    // interval from spending a model call.
    expect(evidenceChanged('fp-1', 'fp-1')).toBe(false);
  });

  it('reports change for a different fingerprint', () => {
    expect(evidenceChanged('fp-1', 'fp-2')).toBe(true);
  });

  it('does not trigger reanalysis when a filing set is merely re-read', () => {
    const stored = computeEvidenceFingerprint([source()]);
    const refetched = computeEvidenceFingerprint([source({ fetchedAt: '2026-08-17T18:00:00Z' })]);
    expect(evidenceChanged(stored, refetched)).toBe(false);
  });
});

describe('newAccessions', () => {
  it('finds only genuinely new accessions', () => {
    const known = new Set(['0001234567-26-000001']);
    expect(newAccessions(known, ['0001234567-26-000001'])).toEqual([]);
    expect(newAccessions(known, ['0001234567-26-000001', '0001234567-26-000002'])).toEqual([
      '0001234567-26-000002',
    ]);
  });
});

describe('hashContent', () => {
  it('is deterministic and differs on different content', () => {
    expect(hashContent('abc')).toBe(hashContent('abc'));
    expect(hashContent('abc')).not.toBe(hashContent('abd'));
  });
});
