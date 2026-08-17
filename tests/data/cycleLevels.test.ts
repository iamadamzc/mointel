import { describe, expect, it } from 'vitest';

import { classifyLevel, deriveCycleLevels } from '@/lib/data/cycleLevels';
import { normalizeSheetRows } from '@/lib/data/rows';

/** Builds a TODAY row with the columns this test cares about. */
function todayRow(overrides: Record<number, string> = {}): string[] {
  const row = new Array<string>(27).fill('');
  row[0] = 'A — PRIMARY';
  row[1] = 'FIEE';
  row[2] = 'Japan';
  row[3] = '🟢 FRESH / FRONTSIDE';
  row[4] = '$5.00';
  row[5] = '$6.22';
  row[6] = '24.4%';
  row[12] = '$10.59';
  row[13] = '41.3%';
  row[14] = 'No verified current former superrunner; 52-week high $10.59';
  for (const [index, value] of Object.entries(overrides)) row[Number(index)] = value;
  return row;
}

function researchRow(overrides: Record<number, string> = {}): string[] {
  const row = new Array<string>(37).fill('');
  row[0] = '2026-08-14';
  row[1] = 'FIEE';
  row[3] = 'FiEE, Inc.';
  row[16] = '$10.59 (52-week proxy)';
  row[17] = '41.3%';
  for (const [index, value] of Object.entries(overrides)) row[Number(index)] = value;
  return row;
}

function levelsFor(today: string[], research: string[], currentPrice: number | null = 6.22) {
  const normalized = normalizeSheetRows([today], [research]);
  return deriveCycleLevels({
    ticker: normalized.tickers[0] ?? null,
    research: normalized.research.FIEE ?? null,
    currentPrice,
  });
}

describe('level classification', () => {
  it('recognises historical levels from the cell text', () => {
    for (const raw of [
      '$10.59 (52-week proxy)',
      '$10.59 52-week high',
      '$46.50 all-time high',
      '$28.40 prior run high',
      '$66.00 historical resistance',
    ]) {
      const reading = classifyLevel(raw, 'test');
      expect(reading?.kind, raw).toBe('HISTORICAL');
      expect(reading?.value, raw).toBeGreaterThan(0);
    }
  });

  it('recognises an affirmatively current-cycle level', () => {
    const reading = classifyLevel('$7.21 current cycle high', 'test');
    expect(reading?.kind).toBe('CURRENT_CYCLE');
    expect(reading?.value).toBe(7.21);
  });

  it('leaves an unqualified level unverified rather than assuming it is current', () => {
    const reading = classifyLevel('$10.59', 'test');
    expect(reading?.kind).toBe('UNVERIFIED');
    expect(reading?.value).toBe(10.59);
  });

  it('returns null for an empty cell', () => {
    expect(classifyLevel('', 'test')).toBeNull();
    expect(classifyLevel('   ', 'test')).toBeNull();
  });
});

describe('FIEE: a 52-week proxy must not become the current cycle high', () => {
  const levels = levelsFor(todayRow(), researchRow());

  it('maps $10.59 to historical resistance, not current cycle high', () => {
    expect(levels.currentCycleHigh).toBeNull();
    expect(levels.historicalResistance?.value).toBe(10.59);
    expect(levels.historicalResistance?.label).toBe('52-week high');
    expect(levels.historicalResistance?.field).toContain('Recent Cycle High');
  });

  it('does not calculate a current giveback from a historical level', () => {
    expect(levels.givebackFromCurrentCycleHighPct).toBeNull();
  });

  it('preserves the sheet 41.3% for audit, tied to its historical basis', () => {
    expect(levels.sheetReportedFlush?.raw).toBe('41.3%');
    expect(levels.sheetReportedFlush?.value).toBe(41.3);
    expect(levels.sheetReportedFlush?.basisKind).toBe('HISTORICAL');
    expect(levels.notes.join(' ')).toMatch(/not a current-cycle giveback/i);
  });

  it('carries the bare TODAY $10.59 into historical too, rather than promoting it', () => {
    // TODAY's "Recent Run High" is an unlabelled $10.59; it matches the
    // RESEARCH level annotated as a 52-week proxy, so it inherits that meaning.
    expect(levels.unverifiedRunHigh).toBeNull();
  });
});

describe('corroboration and genuine current-cycle levels', () => {
  it('uses the sheet narrative to classify an otherwise bare level', () => {
    // No RESEARCH record at all; only the TODAY prior-runner text mentions the
    // 52-week high at the same price.
    const normalized = normalizeSheetRows([todayRow()], []);
    const levels = deriveCycleLevels({
      ticker: normalized.tickers[0]!,
      research: null,
      currentPrice: 6.22,
    });

    expect(levels.currentCycleHigh).toBeNull();
    expect(levels.historicalResistance?.value).toBe(10.59);
    expect(levels.historicalResistance?.reason).toMatch(/narrative/i);
  });

  it('computes a giveback only from a genuine current-cycle high', () => {
    const levels = levelsFor(
      todayRow({ 12: '$7.21 current cycle high' }),
      researchRow({ 16: '$7.21 current cycle high', 17: '' }),
      6.22,
    );

    expect(levels.currentCycleHigh?.value).toBe(7.21);
    expect(levels.historicalResistance).toBeNull();
    expect(levels.givebackFromCurrentCycleHighPct).toBeCloseTo(13.73, 2);
  });

  it('reports no giveback when the price is unknown', () => {
    const levels = levelsFor(
      todayRow({ 12: '$7.21 current cycle high' }),
      researchRow({ 16: '$7.21 current cycle high' }),
      null,
    );
    expect(levels.currentCycleHigh?.value).toBe(7.21);
    expect(levels.givebackFromCurrentCycleHighPct).toBeNull();
  });

  it('keeps a genuinely unverified level separate from both buckets', () => {
    const levels = levelsFor(
      todayRow({ 12: '$3.40', 14: 'No prior runner notes' }),
      researchRow({ 16: '', 17: '' }),
      3,
    );

    expect(levels.currentCycleHigh).toBeNull();
    expect(levels.historicalResistance).toBeNull();
    expect(levels.unverifiedRunHigh?.value).toBe(3.4);
    expect(levels.givebackFromCurrentCycleHighPct).toBeNull();
  });

  it('handles a ticker with no level data at all', () => {
    const levels = levelsFor(todayRow({ 12: '', 13: '', 14: '' }), researchRow({ 16: '', 17: '' }));
    expect(levels.currentCycleHigh).toBeNull();
    expect(levels.historicalResistance).toBeNull();
    expect(levels.unverifiedRunHigh).toBeNull();
    expect(levels.sheetReportedFlush).toBeNull();
  });
});
