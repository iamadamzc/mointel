/**
 * The desk's own UNKNOWN structure never reads NO FLAG FOUND (Research's finding on design/sheet-off,
 * Integration 37th's corrected ruling). A dossier that classified the structure UNKNOWN, with no warning,
 * fell through to the green "Researched; no structural problem established."
 */

import { describe, expect, it } from 'vitest';

import type { DeskRow } from '@/lib/dashboard/merge';
import { STRUCTURE_UNKNOWN_DETAIL, resolveRisk } from '@/lib/dashboard/risk';

type Ledger = Array<{ type: string; amountShares: number | null; dollarCapacity: number | null; status: string }>;

const row = (classification: string, warnings: string[] = [], ledger: Ledger = []): DeskRow =>
  ({
    ticker: 'UNKN',
    intelligenceState: { status: 'ANALYZED' },
    intelligence: {
      analysis: {
        dossier: {
          structure: {
            structureClassification: classification,
            structuralWarnings: warnings,
            supplyLedger: ledger,
            summary: null,
          },
        },
      },
    },
  }) as unknown as DeskRow;

describe('the desk UNKNOWN structure', () => {
  it('reads STRUCTURE UNKNOWN, dim, never NO FLAG FOUND', () => {
    const risk = resolveRisk(row('UNKNOWN'));
    expect(risk.code).toBe('STRUCTURE_UNKNOWN');
    expect(risk.label).toBe('STRUCTURE UNKNOWN');
    expect(risk.tone).toBe('dim');
    expect(risk.label).not.toBe('NO FLAG FOUND');
  });

  it('also with only dollar capacity on the ledger (no share supply to say SUPPLY OVERHEAD)', () => {
    const ledger = [{ type: 'SHELF_CAPACITY', amountShares: null, dollarCapacity: 30_000_000, status: 'NOT_YET_ACTIVE' }];
    expect(resolveRisk(row('UNKNOWN', [], ledger)).code).toBe('STRUCTURE_UNKNOWN');
  });

  it('a warning still reads as caution, and a CLEAN classification is still NO FLAG FOUND', () => {
    expect(resolveRisk(row('UNKNOWN', ['Shares outstanding predate an issuance.'])).code).toBe('STRUCTURE_CAUTION');
    expect(resolveRisk(row('CLEAN')).code).toBe('STRUCTURE_CLEAN');
  });

  it('carries the passed words (Marketing a73aa6ed, Commercial read 65), never a placeholder', () => {
    expect(STRUCTURE_UNKNOWN_DETAIL).toBe('The desk researched this name and could not establish its structure.');
    expect(resolveRisk(row('UNKNOWN')).detail).toBe(STRUCTURE_UNKNOWN_DETAIL);
  });
});
