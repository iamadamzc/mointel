import { describe, expect, it } from 'vitest';

import { catalystEvidenceLatest } from '@/lib/dashboard/merge';
import type { AutoIntelligence } from '@/lib/research/view';

const intel = (
  ids: number[],
  evidence: Array<{ id: number; publishedAt: string | null; publishedPrecision?: string }>,
) =>
  ({
    evidence,
    analysis: { dossier: { catalyst: { evidenceSourceIds: ids } } },
  }) as unknown as AutoIntelligence;

/*
 * The trader's complaint: a catalyst summary he cannot date. The newest source
 * the conclusion RESTS ON was computed at merge.ts:270 and consumed only by the
 * sheet-vs-auto comparison -- nothing rendered it.
 */
describe('the newest cited source', () => {
  it('reports the newest source the catalyst actually cites', () => {
    const got = catalystEvidenceLatest(
      intel(
        [1, 2],
        [
          { id: 1, publishedAt: '2026-09-01T12:00:00.000Z', publishedPrecision: 'EXACT' },
          { id: 2, publishedAt: '2026-09-03T10:30:00.000Z', publishedPrecision: 'EXACT' },
        ],
      ),
    );
    expect(got).toBe('2026-09-03T10:30:00.000Z');
  });

  /*
   * Deliberately not the newest source in the BUNDLE. A registration statement
   * filed this morning says nothing about whether the analysis saw yesterday's
   * announcement, and using it would let a routine structural filing conceal a
   * stale catalyst.
   */
  it('ignores an uncited source, however new', () => {
    const got = catalystEvidenceLatest(
      intel(
        [1],
        [
          { id: 1, publishedAt: '2026-09-01T12:00:00.000Z', publishedPrecision: 'EXACT' },
          { id: 9, publishedAt: '2026-09-04T09:00:00.000Z', publishedPrecision: 'EXACT' },
        ],
      ),
    );
    expect(got).toBe('2026-09-01T12:00:00.000Z');
  });

  /*
   * A date-only page is stored at noon UTC so it lands on the right calendar
   * day -- and noon sorts AFTER a real 06:30 stamp for the same announcement,
   * which would rank the imprecise copy as the later event.
   */
  it('prefers an exact stamp over a date-only one from the same day', () => {
    const got = catalystEvidenceLatest(
      intel(
        [1, 2],
        [
          { id: 1, publishedAt: '2026-09-03T10:30:00.000Z', publishedPrecision: 'EXACT' },
          { id: 2, publishedAt: '2026-09-03T12:00:00.000Z', publishedPrecision: 'DATE_ONLY' },
        ],
      ),
    );
    expect(got).toBe('2026-09-03T10:30:00.000Z');
  });

  /*
   * Null rather than a guess: with nothing dated to compare, the surface must
   * say "none dated" rather than borrow a date from elsewhere.
   */
  it('returns null when nothing cited carries a date', () => {
    expect(catalystEvidenceLatest(intel([1], [{ id: 1, publishedAt: null }]))).toBeNull();
    expect(catalystEvidenceLatest(intel([], []))).toBeNull();
  });
});

describe('the card renders the date and does not grade it', () => {
  const read = () =>
    import('node:fs').then((fs) =>
      fs.promises.readFile('components/AutomaticIntelligence.tsx', 'utf8'),
    );

  it('renders the newest cited source', async () => {
    const source = await read();
    expect(source).toContain('catalystEvidenceLatest(intel)');
    expect(source).toContain('Newest cited source');
  });

  /*
   * The observation is a DATE. Whether three days is fresh is an OPINION, and
   * his differs from the model's -- which already renders its own verdict as
   * `catalyst.freshness` a few lines above.
   */
  it('attaches no freshness verdict of its own to the date', async () => {
    const source = await read();
    const at = source.indexOf('Newest cited source');
    expect(at).toBeGreaterThan(-1);
    const block = source.slice(at, at + 260);
    expect(block).not.toMatch(/stale|fresh|old|recent|outdated/i);
  });

  /*
   * An absent date is stated, not omitted. A missing line would read as "no
   * source" where the truth is "no source carried a date".
   */
  it('says when nothing cited was dated rather than rendering nothing', async () => {
    const source = await read();
    expect(source).toContain("'none dated'");
  });
});
