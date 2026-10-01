import { describe, expect, it } from 'vitest';

import { citationCensus } from '@/lib/research/citationCensus';

const row = (id: number, dossier: unknown) => ({ id, dossier: JSON.stringify(dossier) });

describe('citationCensus: the same pattern as the strip, counted', () => {
  it('counts affected versions by form and by top-level field, for all and for current, and never counts numeric id arrays', () => {
    const rows = [
      row(1, { catalyst: { summary: 'Deal. [Source 115982]', evidenceSourceIds: [115982, 4473] } }),
      row(2, { structure: { notes: ['Resale filed [4473,4498].'] }, cik: '0001873454 [28899]' }),
      row(3, { catalyst: { summary: 'Clean text, a year [2026] and [sic].', evidenceSourceIds: [1, 2] } }),
      { id: 4, dossier: 'not json' },
    ];
    const { all, current, unreadable } = citationCensus(rows, new Set([2, 3]));

    expect(unreadable).toBe(1);
    expect(all).toEqual({
      versions: 3,
      affected: 2,
      byForm: { SOURCE: 1, LIST: 1, SINGLE: 1 },
      byField: { catalyst: 1, structure: 1, cik: 1 },
    });
    // Version 2 carries a LIST and, in its cik, a SINGLE: a version counts under
    // every form it carries, so the forms do not sum to `affected`.
    expect(current).toEqual({
      versions: 2,
      affected: 1,
      byForm: { SOURCE: 0, LIST: 1, SINGLE: 1 },
      byField: { structure: 1, cik: 1 },
    });
  });
});
