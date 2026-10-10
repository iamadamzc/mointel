/**
 * CUT-ONLY (the reports release on the production line, Integration's ruling
 * (b)): the board's price range control (5e8b13c3) does not ride, so the panel
 * has no board range. With board = null the panel must request and show the
 * DEFAULT range's reports, and nothing may import the control's module.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { rangeLabel } from '@/components/SessionReports';
import { chooseReportRange, reportTimeline } from '@/lib/dashboard/sessionReports';
import { buildReportsPayload, type StoredReportRow } from '@/lib/desk/reports/api';
import type { SessionReport } from '@/lib/desk/reports/contract';
import type { ReportRange } from '@/lib/desk/reports/contract';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const RANGES: ReportRange[] = [
  { id: '1-20', label: '$1–$20', min: 1, max: 20 },
  { id: '20-50', label: '$20–$50', min: 20, max: 50 },
];
const RECAP = { tradingDate: '2026-09-28', targetTradingDate: '2026-09-29', scheduledFor: '2026-09-29T02:00:00.000Z' };

function published(rangeId: string, min: number, max: number): StoredReportRow {
  const report: SessionReport = {
    kind: 'PREMARKET',
    rangeId,
    range: { min, max },
    tradingDate: '2026-09-28',
    targetTradingDate: '2026-09-29',
    checkpoints: [{ id: 551, type: 'NEXT_DAY_RECAP', completedAt: '2026-09-29T02:00:09.248Z' }],
    publishedAt: '2026-09-29T02:01:30.000Z',
    late: false,
    headline: null,
    sections: [{ heading: 'Moved', lines: [{ ticker: rangeId === '1-20' ? 'SANG' : 'BIGR', liveFeed: null, text: 'x.' }] }],
    watchCount: 1,
    overall: null,
  };
  return { kind: 'PREMARKET', range_key: rangeId, trading_date: '2026-09-28', status: 'PUBLISHED', payload: JSON.stringify(report), missed_cause: null };
}

describe('the reports cut with no board range', () => {
  /*
   * The price selector now ships (his "ship that if its built", 2026-10-09), so the SHELL imports the board
   * range for the board itself. The REPORTS still take no board range: the panel shows the default range's
   * reports, labelled with their own range, whatever range a viewer sets on the board.
   */
  it('the reports get no board range, and the reports code does not import the price range control', () => {
    const shell = source('components/DashboardShell.tsx');
    expect(shell).toMatch(/const board: \{ min: number; max: number \} \| null = null;/);
    expect(shell).not.toMatch(/discovery\.priceMin/);
    for (const file of ['components/SessionReports.tsx', 'lib/dashboard/sessionReports.ts']) {
      expect(source(file), file).not.toMatch(/dashboard\/boardRange/);
    }
  });

  it('with board = null the DEFAULT range is chosen, and its report is the one shown', () => {
    const choice = chooseReportRange({ ranges: RANGES, defaultRangeId: '20-50', stored: null, board: null });
    expect(choice).toEqual({ kind: 'CHOSEN', range: RANGES[1], source: 'default' });

    const payload = buildReportsPayload(RECAP, [published('1-20', 1, 20), published('20-50', 20, 50)], RANGES, '20-50');
    const rangeId = choice?.kind === 'CHOSEN' ? choice.range.id : '';
    const view = reportTimeline(payload, rangeId, Date.parse('2026-09-29T03:00:00.000Z'));
    expect(view.current?.state).toBe('PUBLISHED');
    expect(view.current?.report?.rangeId).toBe('20-50');
    expect(view.current?.report?.sections[0]!.lines[0]!.ticker).toBe('BIGR');
  });

  it('a stored viewer choice still wins over the default', () => {
    const choice = chooseReportRange({ ranges: RANGES, defaultRangeId: '20-50', stored: '1-20', board: null });
    expect(choice).toEqual({ kind: 'CHOSEN', range: RANGES[0], source: 'viewer' });
  });

  it('the local rangeLabel prints what the control’s did', () => {
    expect(rangeLabel({ min: 1, max: 20 })).toBe('$1–$20');
    expect(rangeLabel({ min: 0.25, max: 12.5 })).toBe('$0.25–$12.50');
  });
});
