import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { withoutEmDash, withoutEmDashDeep } from '@/lib/dashboard/prose';
import { readableIntelligence } from '@/lib/dashboard/merge';
import type { AutoIntelligence } from '@/lib/research/view';

/*
 * His rule (2026-09-30T10:43:39Z): "no em dashes in any writing. hard rule."
 * For text the desk shows but did not write. Written from the rules in
 * prose.ts's header, by position, never a blind swap.
 */
const D = '—';

describe('withoutEmDash', () => {
  it('a lone dash inside a sentence becomes a comma', () => {
    expect(withoutEmDash(`Entered the tracked discovery population at $3.20 ${D} RVOL 3.2x`)).toBe(
      'Entered the tracked discovery population at $3.20, RVOL 3.2x',
    );
    expect(withoutEmDash(`Strong catalyst${D}FDA approval`)).toBe('Strong catalyst, FDA approval');
  });

  it('a pair around a phrase is an aside, and becomes parentheses', () => {
    expect(withoutEmDash(`The offering ${D} 5M shares at $2 ${D} closes Friday.`)).toBe(
      'The offering (5M shares at $2) closes Friday.',
    );
  });

  it('never pairs across a sentence end', () => {
    expect(withoutEmDash(`Filed today ${D} an 8-K. Priced ${D} at the market.`)).toBe(
      'Filed today, an 8-K. Priced, at the market.',
    );
  });

  it('between two numbers it is a range, and becomes an en dash', () => {
    expect(withoutEmDash(`The cycle frame is 04:00${D}20:00`)).toBe('The cycle frame is 04:00–20:00');
    expect(withoutEmDash(`between $2 ${D} $5`)).toBe('between $2–$5');
  });

  it('at the start or the end of the text it is dropped, and punctuation closes up', () => {
    expect(withoutEmDash(`${D} no conclusion drawn`)).toBe('no conclusion drawn');
    expect(withoutEmDash(`still watching filings ${D}`)).toBe('still watching filings');
    expect(withoutEmDash(`held ${D}.`)).toBe('held.');
  });

  it('the entity forms render as the dash, so they are rewritten too', () => {
    expect(withoutEmDash('Priced &mdash; at the market')).toBe('Priced, at the market');
    expect(withoutEmDash('Priced &#8212; at the market')).toBe('Priced, at the market');
  });

  it('keeps the bare empty-value glyph, which he ruled is not writing', () => {
    expect(withoutEmDash(D)).toBe(D);
    expect(withoutEmDash(` ${D} `)).toBe(` ${D} `);
  });

  it('returns text with no dash exactly as it came, spacing and all', () => {
    const text = '  A plain sentence, with  two spaces.  ';
    expect(withoutEmDash(text)).toBe(text);
  });

  it('rewrites every string in a nested value and nothing else', () => {
    const value = { a: `x ${D} y`, n: 3, ok: true, none: null, list: [`p ${D} q`, D], deep: { s: `r ${D} s` } };
    expect(withoutEmDashDeep(value)).toEqual({
      a: 'x, y', n: 3, ok: true, none: null, list: ['p, q', D], deep: { s: 'r, s' },
    });
  });
});

describe('the dossier reaches every row without a dash', () => {
  const auto = {
    ticker: 'ACME',
    status: 'COMPLETE',
    statusLabel: `Analysed ${D} desk`,
    analysis: {
      id: 1, ticker: 'ACME', generatedAt: '2026-09-30T10:00:00Z', evidenceFingerprint: 'f', model: 'm',
      analysisVersion: 1, sourceIds: [1], supersedesId: null, metadata: {},
      dossier: { catalyst: { summary: `FDA nod ${D} phase 3 met`, grade: 'A' }, structure: { summary: D } },
    },
    provenance: 'AUTO', generatedAt: null, model: null, schemaVersion: null, analysisVersionId: null,
    coverageIncomplete: false,
    evidence: [{
      id: 1, title: `8-K ${D} 2026-09-29`, url: 'https://www.sec.gov/x', authority: 'SEC', sourceType: 'SEC_FILING',
      secForm: '8-K', accession: null, publishedAt: null, publishedPrecision: 'DAY',
    }],
  } as unknown as AutoIntelligence;

  it('cleans the dossier prose, the status and the source titles, and keeps the glyph and the URL', () => {
    const out = readableIntelligence(auto)!;
    const dossier = out.analysis!.dossier as unknown as { catalyst: { summary: string; grade: string }; structure: { summary: string } };
    expect(dossier.catalyst.summary).toBe('FDA nod, phase 3 met');
    expect(dossier.catalyst.grade).toBe('A');
    expect(dossier.structure.summary).toBe(D);
    expect(out.statusLabel).toBe('Analysed, desk');
    expect(out.evidence[0].title).toBe('8-K, 2026-09-29');
    expect(out.evidence[0].url).toBe('https://www.sec.gov/x');
  });

  it('never rewrites the payload it was handed', () => {
    readableIntelligence(auto);
    expect(auto.statusLabel).toBe(`Analysed ${D} desk`);
  });

  it('is what mergeDesk hands every row', () => {
    const source = readFileSync(join(process.cwd(), 'lib/dashboard/merge.ts'), 'utf8');
    expect(source).toMatch(/map\(\(\[ticker, auto\]\) => \[ticker, readableIntelligence\(auto\)\]\)/);
  });
});

describe('the desk event feed', () => {
  it('shows a stored event message cleaned, in the text and in the hover', () => {
    const source = readFileSync(join(process.cwd(), 'components/DeskEventFeed.tsx'), 'utf8');
    expect(source).toContain('title={withoutEmDash(item.event.message)}');
    expect(source).toContain('{withoutEmDash(item.event.message)}');
    expect(source).not.toMatch(/\{item\.event\.message\}/);
  });
});
