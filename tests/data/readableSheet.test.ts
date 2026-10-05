/**
 * The Sheet's labels reach the page with no em dash (his rule, 2026-09-30:
 * "no em dashes in any writing. hard rule."), and only the WORDS change.
 *
 * The known positive is what the live desk showed on 2026-10-01 (design.md row
 * R1): every dossier printed the Sheet's grade, priority, cycle and structure
 * labels with the dash, in visible text, tooltips and row labels. Those labels
 * are put through the real row normaliser here, then through the payload both
 * dashboard routes serve.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readableSheet } from '@/lib/data/readable';
import { normalizeSheetRows } from '@/lib/data/rows';
import type { DashboardState } from '@/lib/data/types';

const EM = String.fromCharCode(0x2014);

function todayRow(): string[] {
  const row: string[] = new Array(27).fill('');
  row[0] = `C ${EM} BACKSIDE / OPPORTUNISTIC`;
  row[1] = 'IMCC';
  row[3] = `🟡 FRONTSIDE ${EM} WARNING`;
  row[8] = `UNKNOWN ${EM} Overhang/Float Unknown`;
  row[9] = `C ${EM} WEAK/NONE`;
  row[15] = `HIGH-RISK DIRTY FLOAT ${EM} 9.44x registered resale vs displayed float.`;
  row[17] = `No fresh catalyst ${EM} same-day ownership filings only.`;
  row[25] = `B ${EM} SECONDARY`;
  return row;
}

function researchRow(): string[] {
  const row: string[] = new Array(37).fill('');
  row[0] = '2026-09-30';
  row[1] = 'IMCC';
  row[10] = `https://example.com/a${EM}b`;
  row[14] = `A ${EM} STRONG/FRESH`;
  row[18] = `🟡 FRONTSIDE ${EM} WARNING`;
  row[30] = `https://example.com/c${EM}d`;
  row[34] = `UNKNOWN ${EM} ratio Unknown; shelf/ATM mechanics are not reconciled.`;
  row[35] = `DIRTY FLOAT ${EM} ratio Unknown: an effective F-1 registers resale shares.`;
  return row;
}

function payload(): DashboardState {
  const { tickers, research } = normalizeSheetRows([todayRow()], [researchRow()]);
  return {
    tickers,
    research,
    summary: { namesTracked: 1, freshFrontside: 0, frontsideWarning: 1, backside: 0, dirtyFloat: 1, strongCatalysts: 0 },
    meta: {
      provider: 'google-sheets',
      fetchedAt: '2026-10-01T02:30:00.000Z',
      sourceUpdatedAt: null,
      error: null,
      sourceTitle: 'Trading Desk',
      warnings: [],
      stale: false,
      cacheAgeMs: 0,
    },
  };
}

/** Every string in a value, with the key it sits under. */
function strings(value: unknown, key = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[key, value]];
  if (Array.isArray(value)) return value.flatMap((item) => strings(item, key));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => strings(v, k));
  return [];
}

describe('the Sheet as the board shows it', () => {
  const before = payload();
  const after = readableSheet(before);
  const ticker = after.tickers[0]!;
  const record = after.research.IMCC!;

  it('the known positive carries the dash before cleaning (the check can see it)', () => {
    const dashed = strings(before).filter(([, text]) => text.includes(EM) && text.trim() !== EM);
    expect(dashed.length).toBeGreaterThanOrEqual(10);
  });

  // The Sheet's priority family left the payload on 2026-10-05 (lib/data/types.ts):
  // the desk shows its own Setup grade, so there is no priority label to clean.
  it('removes it from every label family: grade, cycle, structure, float, warning', () => {
    expect(ticker.catalyst.gradeRaw).toBe('C, WEAK/NONE');
    expect(ticker.cycle.raw).toBe('🟡 FRONTSIDE, WARNING');
    expect(ticker.structure.raw).toBe('HIGH-RISK DIRTY FLOAT, 9.44x registered resale vs displayed float.');
    expect(ticker.structure.floatRaw).toBe('UNKNOWN, Overhang/Float Unknown');
    expect(ticker.warning.current).toBe('No fresh catalyst, same-day ownership filings only.');
    expect(record.catalystGradeRaw).toBe('A, STRONG/FRESH');
    expect(record.cycleClassificationRaw).toBe('🟡 FRONTSIDE, WARNING');
    expect(record.floatQualityRaw).toBe('UNKNOWN, ratio Unknown; shelf/ATM mechanics are not reconciled.');
    expect(record.overhangFloat).toBe('DIRTY FLOAT, ratio Unknown: an effective F-1 registers resale shares.');
  });

  it('leaves no dash in any written string, apart from addresses and the fingerprint', () => {
    const left = strings(after).filter(
      ([key, text]) => text.includes(EM) && text.trim() !== EM && !/Urls?$/.test(key) && key !== 'changeSignature',
    );
    expect(left).toEqual([]);
  });

  it('keeps the lone empty-value dash (his exception), every URL and the change signature', () => {
    const lone = strings(before).filter(([, text]) => text.trim() === EM).length;
    expect(lone).toBeGreaterThan(0);
    expect(strings(after).filter(([, text]) => text.trim() === EM).length).toBe(lone);
    expect(record.floatSourceUrls).toEqual(before.research.IMCC!.floatSourceUrls);
    expect(record.structureSourceUrls).toEqual(before.research.IMCC!.structureSourceUrls);
    expect(JSON.stringify(record)).toContain(`a${EM}b`);
    expect(ticker.changeSignature).toBe(before.tickers[0]!.changeSignature);
  });

  it('changes words only: every state, bucket and number is what the raw text parsed to', () => {
    const shape = (s: DashboardState) =>
      JSON.stringify(s, (_key, value) => (typeof value === 'string' ? 'S' : value));
    expect(shape(after)).toBe(shape(before));
    expect(ticker.cycle.state).toBe(before.tickers[0]!.cycle.state);
    expect(ticker.structure.state).toBe(before.tickers[0]!.structure.state);
    expect(ticker.catalyst.gradeBucket).toBe(before.tickers[0]!.catalyst.gradeBucket);
  });

  it('does not change the payload it was given', () => {
    expect(before.tickers[0]!.cycle.raw).toContain(EM);
  });
});

describe('both dashboard routes serve the cleaned payload', () => {
  for (const path of ['app/api/dashboard/route.ts', 'app/review/[token]/api/dashboard/route.ts']) {
    it(path, () => {
      const source = readFileSync(join(process.cwd(), path), 'utf8');
      expect(source).toMatch(/dashboardResponseParts\(\s*readableSheet\(scopeResearch\(/);
    });
  }
});
