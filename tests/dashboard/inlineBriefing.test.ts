import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { InlineBriefing } from '@/components/SessionReports';
import { reportTimeline, type RangeChoice } from '@/lib/dashboard/sessionReports';
import type { ReportRange, ReportSlot, SessionReport, SessionReportsPayload } from '@/lib/desk/reports/contract';

/*
 * His ruling 2026-10-05: between sessions the session report gets greater
 * prominence. The briefing built from the 22:00 recap is laid out IN the page,
 * above the frozen recap board; a briefing that is not published stays the
 * worded line. Same ReportBody as the window, so the words cannot differ.
 */

const RANGES: ReportRange[] = [
  { id: 'core', label: '$1-$20', min: 1, max: 20 },
  { id: 'upper', label: '$20-$50', min: 20, max: 50 },
];
const PREMARKET = '2026-09-26T02:05:00Z'; // Fri 22:05 ET, for Monday

const slot: ReportSlot = {
  kind: 'PREMARKET',
  rangeId: 'core',
  tradingDate: '2026-09-28',
  targetTradingDate: null,
  scheduledFor: PREMARKET,
  relevantUntil: new Date(Date.parse(PREMARKET) + 30 * 60_000).toISOString(),
};

const published: SessionReport = {
  kind: 'PREMARKET',
  rangeId: 'core',
  range: { min: 1, max: 20 },
  tradingDate: '2026-09-28',
  targetTradingDate: null,
  checkpoints: [{ id: 7, type: 'NEXT_DAY_RECAP', completedAt: PREMARKET }],
  publishedAt: '2026-09-26T02:08:00Z',
  late: false,
  headline: 'Three names moved.',
  sections: [],
};

const payload = (reports: SessionReport[]): SessionReportsPayload => ({
  ranges: RANGES,
  defaultRangeId: 'core',
  slots: [slot],
  reports,
  missedCauses: {},
});

const choice: RangeChoice = { kind: 'CHOSEN', range: RANGES[0] } as RangeChoice;

function render(reports: SessionReport[], nowIso: string): string {
  const timeline = reportTimeline(payload(reports), 'core', Date.parse(nowIso));
  return renderToStaticMarkup(
    createElement(InlineBriefing, {
      timeline,
      choice,
      ranges: RANGES,
      onChooseRange: () => {},
      board: null,
      priceOf: () => null,
      nowMs: Date.parse(nowIso),
      onSelectTicker: () => {},
      onOpenCheckpoint: () => {},
      onOpen: () => {},
      read: false,
    }),
  );
}

describe('InlineBriefing', () => {
  it('lays the published briefing out in the page, with the report\'s own title and a Collapse control', () => {
    const html = render([published], '2026-09-26T03:00:00Z');
    expect(html).toContain('Premarket briefing');
    expect(html).toContain('Collapse');
    expect(html).toContain('aria-expanded="true"');
    // The checkpoint it was built on is a button to the frozen board, as in the window.
    expect(html).toContain('Open the frozen board this checkpoint recorded');
  });

  it('is not a modal: nothing dims, nothing takes focus', () => {
    const html = render([published], '2026-09-26T03:00:00Z');
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('aria-modal');
    expect(html).not.toContain('bg-black/60');
  });

  it('offers the range chooser when there is more than one range', () => {
    const html = render([published], '2026-09-26T03:00:00Z');
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('$20-$50');
  });

  it('keeps the worded one-row line when the briefing is not published, never a blank', () => {
    // 22:10 ET Friday, due at 22:05, nothing written yet: CHECKING.
    const html = render([], '2026-09-26T02:10:00Z');
    expect(html).toContain('Briefing');
    expect(html).not.toContain('Collapse');
    expect(html).not.toContain('Premarket briefing</h2>');
  });
});

describe('the shell uses it only between sessions', () => {
  const shell = readFileSync('components/DashboardShell.tsx', 'utf8');

  it('mounts InlineBriefing only under the off-hours condition, and BriefingLine otherwise', () => {
    expect(shell).toMatch(/reportChoice && offHours && reports \?\s*\(?\s*(\/\/[^\n]*\n\s*)?<InlineBriefing/);
    expect(shell).toContain('const offHours = isOffHoursEmpty(discovery?.sessionPhase, merged.discovery.length);');
  });

  it('opens the recap by default only through effectiveView, so a choice always wins', () => {
    expect(shell).toContain('effectiveView(viewChoice, offHours, recapToOpen(assessments))');
  });
});
