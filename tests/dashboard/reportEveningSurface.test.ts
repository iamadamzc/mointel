/**
 * The 8:30 pm EVENING report on the surface (his "b", 2026-10-07T02:33:24.356Z; Research's contract
 * 269b57e6). Words: Marketing 2e386dc7, passed by Commercial 28.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { SessionReport } from '@/lib/desk/reports/contract';
import { reportBlocks, reportTitle, researchWrittenAgainNote, watchLine } from '@/lib/dashboard/sessionReports';

const EM_DASH = String.fromCharCode(0x2014);

describe('the EVENING title and watch sentence', () => {
  it("reads Marketing's words", () => {
    expect(reportTitle('EVENING')).toBe('Evening briefing');
    expect(watchLine('EVENING', 7)).toBe("We're watching 7 names into the next premarket.");
    expect(watchLine('EVENING', 1)).toBe("We're watching 1 name into the next premarket.");
    expect(watchLine('EVENING', 0)).toBe('Nothing on watch into the next premarket.');
  });

  it('leaves the other kinds as they were', () => {
    expect(reportTitle('PREMARKET')).toBe('Premarket briefing');
    expect(reportTitle('AFTER_HOURS')).toBe('After-hours briefing');
  });
});

describe('the research-written-again note', () => {
  // 2026-10-07T00:12:00Z is Oct 6, 8:12 pm EDT.
  const noteAt = '2026-10-07T00:12:00Z';
  const sameEtDay = Date.parse('2026-10-07T01:00:00Z'); // Oct 6, 9:00 pm ET: same ET day, a different UTC day
  const nextMorning = Date.parse('2026-10-07T12:00:00Z'); // Oct 7, 8:00 am ET

  it('the same ET day: the time alone, 12-hour, lower-case pm, ET', () => {
    expect(researchWrittenAgainNote(noteAt, sameEtDay)).toBe('Research written again at 8:12 pm ET, after this checkpoint.');
  });

  it('read on another ET day: the date is added, so a stored copy never shows a bare clock', () => {
    expect(researchWrittenAgainNote(noteAt, nextMorning)).toBe(
      'Research written again Oct 6, 8:12 pm ET, after this checkpoint.',
    );
  });

  it('the ET day, not the UTC day, decides (00:12Z is still the evening before in ET)', () => {
    expect(researchWrittenAgainNote(noteAt, sameEtDay)).not.toContain('Oct');
  });

  it('am, and the winter offset, through the market zone', () => {
    // 2026-12-01T14:05:00Z is 9:05 am EST (UTC-5), not 10:05.
    expect(researchWrittenAgainNote('2026-12-01T14:05:00Z', Date.parse('2026-12-01T20:00:00Z'))).toBe(
      'Research written again at 9:05 am ET, after this checkpoint.',
    );
  });

  it('no newer version, or a time that does not parse: no note', () => {
    expect(researchWrittenAgainNote(null, nextMorning)).toBeNull();
    expect(researchWrittenAgainNote(undefined, nextMorning)).toBeNull();
    expect(researchWrittenAgainNote('soon', nextMorning)).toBeNull();
  });

  it('plain spaces only, and no em dash', () => {
    const note = researchWrittenAgainNote(noteAt, nextMorning) as string;
    expect(/[^\x20-\x7e]/.test(note)).toBe(false);
    expect(note.includes(EM_DASH)).toBe(false);
  });
});

describe('the card carries the note', () => {
  const line = (ticker: string, researchUpdatedAt?: string | null) => ({
    ticker,
    liveFeed: true,
    text: `${ticker} line.`,
    ...(researchUpdatedAt === undefined ? {} : { researchUpdatedAt }),
  });
  const report = (lines: ReturnType<typeof line>[]) =>
    ({ sections: [{ heading: '', lines }] }) as unknown as Pick<SessionReport, 'sections'>;

  it("takes the name's first non-null researchUpdatedAt; absent or null leaves it null", () => {
    const blocks = reportBlocks(report([line('AAA', null), line('AAA', '2026-10-07T00:12:00Z'), line('BBB'), line('CCC', null)]));
    const at = Object.fromEntries(blocks.flatMap((b) => (b.kind === 'NAME' ? [[b.ticker, b.researchUpdatedAt]] : [])));
    expect(at).toEqual({ AAA: '2026-10-07T00:12:00Z', BBB: null, CCC: null });
  });

  it('NameCard prints it on its own line under the header, with the reader clock', () => {
    const src = readFileSync('components/SessionReports.tsx', 'utf8');
    expect(src).toContain('researchWrittenAgainNote(block.researchUpdatedAt, nowMs)');
    expect(src).toContain('nowMs={nowMs}');
    expect(src.indexOf('{writtenAgain ?')).toBeLessThan(src.indexOf('<TagRow tags={block.tags} />'));
  });
});
