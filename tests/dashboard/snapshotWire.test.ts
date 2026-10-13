/**
 * S4 (A9): /api/market and its review twin sent the dossier raw. The board
 * cleaned it in the browser, so the page read clean while the JSON on the wire
 * carried citation tokens, em dashes and the ticker's own source ids. Both
 * routes now clean the snapshot on the server.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { readableIntelligence, readableSnapshot } from '@/lib/dashboard/merge';
import type { MarketSnapshot } from '@/lib/market/types';
import type { AutoIntelligence } from '@/lib/research/view';

const D = String.fromCharCode(0x2014);

const auto = {
  ticker: 'RPGL',
  status: 'COMPLETE',
  statusLabel: 'Analysed',
  analysis: {
    id: 1, ticker: 'RPGL', generatedAt: '2026-10-13T10:00:00Z', evidenceFingerprint: 'f', model: 'm',
    analysisVersion: 1, sourceIds: [96174], supersedesId: null, metadata: {},
    dossier: {
      catalyst: {
        summary: `Signed a supply deal [Source 96174] ${D} a filed 8-K [1043].`,
        whyTradersMayCare: 'A fresh contract.',
        grade: 'B',
        unknowns: [],
      },
    },
  },
  provenance: 'AUTO', generatedAt: null, model: null, schemaVersion: null, analysisVersionId: null,
  coverageIncomplete: false,
  evidence: [{ title: `8-K ${D} current report`, url: 'https://www.sec.gov/x' }],
  tickerSourceIds: [1043, 96174],
} as unknown as AutoIntelligence;

const demand = { RPGL: { price: 3.2 } };
const snapshot = { demand, intelligence: { RPGL: auto } } as unknown as MarketSnapshot;

describe('the market snapshot leaves the server clean', () => {
  const out = readableSnapshot(snapshot);
  const wire = JSON.stringify(out);

  it('carries no citation token, no em dash and no ticker source ids', () => {
    // The dossier's prose, not the whole payload: `sourceIds: [96174]` is a real array.
    expect(JSON.stringify(out.intelligence.RPGL!.analysis!.dossier)).not.toMatch(/\[(Sources? )?\d+(, \d+)*\]/);
    expect(wire).not.toContain(D);
    expect(wire).not.toContain('tickerSourceIds');
    expect(wire).toContain('Signed a supply deal, a filed 8-K.');
  });

  it('leaves everything else as it was, and never rewrites what it was handed', () => {
    expect(out.demand).toBe(demand);
    expect(JSON.stringify(snapshot)).toContain('[Source 96174]');
  });

  it('is a no-op for the browser pass that follows it', () => {
    const cleaned = out.intelligence.RPGL!;
    expect(readableIntelligence(cleaned)).toEqual(cleaned);
  });

  it('is what both market routes send', () => {
    for (const route of ['app/api/market/route.ts', 'app/review/[token]/api/market/route.ts']) {
      const source = fs.readFileSync(path.join(process.cwd(), route), 'utf8');
      expect(source, route).toContain('readableSnapshot(getMarketSnapshot(');
      expect(source, route).not.toMatch(/json\(getMarketSnapshot\(/);
    }
  });
});
