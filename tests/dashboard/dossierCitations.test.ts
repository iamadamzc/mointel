/**
 * Design row C: the model's citation tokens printed verbatim on the board (Why
 * and Risk cells, their tooltips) and in the dossier; rendered locally on
 * e8822583, 2026-10-01. The pattern is Research's (`withoutCitationsDeep`,
 * lib/research/citations.ts); what is tested here is that every row takes its
 * dossier through it, in each field family the render showed it in, and that
 * nothing but the token changes.
 */

import { describe, expect, it } from 'vitest';

import { readableIntelligence } from '@/lib/dashboard/merge';
import type { AutoIntelligence } from '@/lib/research/view';

const D = String.fromCharCode(0x2014);

const auto = {
  ticker: 'TGE',
  status: 'COMPLETE',
  statusLabel: 'Analysed',
  analysis: {
    id: 1, ticker: 'TGE', generatedAt: '2026-09-30T10:00:00Z', evidenceFingerprint: 'f', model: 'm',
    analysisVersion: 1, sourceIds: [115982, 96174], supersedesId: null, metadata: {},
    dossier: {
      catalyst: {
        summary: 'Reported 1H 2026 net profit of US$22.8 million [Source 115982] and a fresh filing.',
        whyTradersMayCare: `A strong release [96174, 96176] ${D} the desk reads it as explaining the move.`,
        grade: 'A',
        unknowns: ['Whether revenue is comparable [Sources 96174, 96176].'],
      },
      structure: {
        summary: 'Registered resale of 57,401,944 shares [Source 96180].',
        structuralWarnings: ['An effective F-1 [96181] registers resale shares.', 'Listed as [NASDAQ: TGE] in [2026].'],
        sharesOutstanding: 62974309,
      },
      cycle: { reasoning: 'Yellow, frontside warning [Source 96190].', recentMajorRuns: [] },
    },
  },
  provenance: 'AUTO', generatedAt: null, model: null, schemaVersion: null, analysisVersionId: null,
  coverageIncomplete: false,
  evidence: [],
} as unknown as AutoIntelligence;

type Dossier = {
  catalyst: { summary: string; whyTradersMayCare: string; grade: string; unknowns: string[] };
  structure: { summary: string; structuralWarnings: string[]; sharesOutstanding: number };
  cycle: { reasoning: string };
};

describe('every row takes its dossier without citation tokens', () => {
  const out = readableIntelligence(auto)!;
  const dossier = out.analysis!.dossier as unknown as Dossier;

  it('removes them from each field family the board and the dossier print', () => {
    expect(dossier.catalyst.summary).toBe('Reported 1H 2026 net profit of US$22.8 million and a fresh filing.');
    expect(dossier.catalyst.unknowns).toEqual(['Whether revenue is comparable.']);
    expect(dossier.structure.summary).toBe('Registered resale of 57,401,944 shares.');
    expect(dossier.structure.structuralWarnings[0]).toBe('An effective F-1 registers resale shares.');
    expect(dossier.cycle.reasoning).toBe('Yellow, frontside warning.');
  });

  it('cleans the token and the dash in the same string', () => {
    expect(dossier.catalyst.whyTradersMayCare).toBe('A strong release, the desk reads it as explaining the move.');
  });

  it('keeps real brackets, numbers and ids', () => {
    expect(dossier.structure.structuralWarnings[1]).toBe('Listed as [NASDAQ: TGE] in [2026].');
    expect(dossier.structure.sharesOutstanding).toBe(62974309);
    expect(dossier.catalyst.grade).toBe('A');
    expect(out.analysis!.sourceIds).toEqual([115982, 96174]);
  });

  it('never rewrites the payload it was handed', () => {
    const original = auto.analysis!.dossier as unknown as Dossier;
    expect(original.catalyst.summary).toContain('[Source 115982]');
  });
});

describe('the ticker\'s own source ids count as citations, cited or not (RPGL "[1043]")', () => {
  // 1043 is a source the ticker holds (its SEC_SUBMISSIONS row) that the dossier did not cite;
  // 2026 is a year, and the ticker owns no source 2026.
  const withIds = {
    ...auto,
    ticker: 'RPGL',
    tickerSourceIds: [1043, 115982],
    analysis: {
      ...auto.analysis!,
      dossier: {
        ...(auto.analysis!.dossier as object),
        structure: {
          summary: 'The company filed a resale registration [1043] in [2026].',
          structuralWarnings: [],
          sharesOutstanding: 1,
        },
      },
    },
  } as unknown as AutoIntelligence;

  it('removes a lone short citation that is one of the ticker\'s source ids, and keeps a year it does not own', () => {
    const out = readableIntelligence(withIds)!;
    const structure = (out.analysis!.dossier as unknown as Dossier).structure;
    expect(structure.summary).toBe('The company filed a resale registration in [2026].');
  });

  it('leaves the bracket when the ids are not supplied (the earlier behaviour)', () => {
    const { tickerSourceIds: _ids, ...bare } = withIds;
    void _ids;
    const out = readableIntelligence(bare as AutoIntelligence)!;
    expect((out.analysis!.dossier as unknown as Dossier).structure.summary).toContain('[1043]');
  });

  it('does not pass the id list on to the payload', () => {
    expect('tickerSourceIds' in readableIntelligence(withIds)!).toBe(false);
  });
});
