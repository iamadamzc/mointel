/**
 * The new-report notice and opening on the current report (his asks, 2026-10-07T23:58:21.075Z; Integration
 * 35th's rulings; his answer on 07:00 to 10:00 ET, "Show the mark only"). Words: Marketing 36b37d86,
 * Commercial read 33.
 */

import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BriefingLine } from '@/components/SessionReports';
import {
  DISMISS_WORDS,
  editionIsRead,
  inMarkOnlyWindow,
  openOnLoad,
  reportMark,
  reportReadKey,
  tabTitle,
} from '@/lib/dashboard/reportNotice';
import type { SlotView } from '@/lib/dashboard/sessionReports';
import type { SessionReport } from '@/lib/desk/reports/contract';

const EM_DASH = String.fromCharCode(0x2014);

const report = (over: Partial<SessionReport> = {}): SessionReport =>
  ({
    kind: 'INTO_RTH',
    rangeId: '1-20',
    range: { min: 1, max: 20 },
    tradingDate: '2026-10-08',
    targetTradingDate: null,
    checkpoints: [],
    publishedAt: '2026-10-08T13:31:00.000Z', // 9:31 am EDT
    late: false,
    headline: null,
    sections: [],
    watchCount: 3,
    narrative: null,
    ...over,
  }) as SessionReport;

const view = (r: SessionReport | null, state: SlotView['state'] = 'PUBLISHED', superseded: SessionReport[] = []): SlotView =>
  ({ slot: { kind: r?.kind ?? 'INTO_RTH' }, state, report: r, superseded, missedReason: null }) as unknown as SlotView;

// 2026-10-08 is a Thursday. EDT is UTC-4.
const THU_0930_ET = Date.parse('2026-10-08T13:30:00.000Z');

const EIGHT_THIRTY = report({ kind: 'EVENING', tradingDate: '2026-10-07', publishedAt: '2026-10-08T00:30:00.000Z' });
const tenPm = (changedTickers: string[], narrativeChanged: boolean) =>
  report({
    kind: 'EVENING',
    tradingDate: '2026-10-07',
    publishedAt: '2026-10-08T02:02:00.000Z',
    revisionOf: { publishedAt: EIGHT_THIRTY.publishedAt, changedTickers, narrativeChanged },
  });

describe('the mark on the briefing line', () => {
  it('"New" on a published, unread current report, with the published time in the hover and the announcement', () => {
    const mark = reportMark(view(report()), [], THU_0930_ET);
    expect(mark).toEqual({
      kind: 'NEW',
      label: 'New',
      title: 'Published 9:31 am ET. Not opened in this browser.',
      announcement: 'New report: Into-the-open briefing, published 9:31 am ET.',
    });
  });

  it('no mark once read, while checking, missed or empty', () => {
    expect(reportMark(view(report()), [reportReadKey(report())], THU_0930_ET)).toBeNull();
    expect(reportMark(view(null, 'CHECKING'), [], THU_0930_ET)).toBeNull();
    expect(reportMark(view(null, 'MISSED'), [], THU_0930_ET)).toBeNull();
    expect(reportMark(null, [], THU_0930_ET)).toBeNull();
  });

  it('the 10 pm edition that wrote lines or the summary: "Revised"', () => {
    const late = Date.parse('2026-10-08T03:00:00.000Z'); // 11:00 pm ET, Oct 7
    for (const edition of [tenPm(['AAA'], false), tenPm([], true)]) {
      const mark = reportMark(view(edition, 'PUBLISHED', [EIGHT_THIRTY]), [reportReadKey(EIGHT_THIRTY)], late);
      expect(mark?.kind).toBe('REVISED');
      expect(mark?.title).toBe('Revised edition published 10:02 pm ET. Not opened in this browser.');
      expect(mark?.announcement).toBe('Revised report: Evening briefing, published 10:02 pm ET.');
    }
  });

  it('a "Published again" 10 pm edition: silent when its 8:30 edition was read; "New" when it was not', () => {
    const late = Date.parse('2026-10-08T03:00:00.000Z');
    const again = tenPm([], false);
    expect(reportMark(view(again, 'PUBLISHED', [EIGHT_THIRTY]), [reportReadKey(EIGHT_THIRTY)], late)).toBeNull();
    expect(reportMark(view(again, 'PUBLISHED', [EIGHT_THIRTY]), [], late)?.kind).toBe('NEW');
    expect(editionIsRead(again, [EIGHT_THIRTY], [reportReadKey(EIGHT_THIRTY)])).toBe(true);
    // A revision that wrote something is never read through its 8:30 edition.
    expect(editionIsRead(tenPm(['AAA'], false), [EIGHT_THIRTY], [reportReadKey(EIGHT_THIRTY)])).toBe(false);
  });

  it('read on another ET day: the date joins the time', () => {
    const nextMorning = Date.parse('2026-10-09T12:00:00.000Z');
    expect(reportMark(view(report()), [], nextMorning)?.title).toBe('Published Oct 8, 9:31 am ET. Not opened in this browser.');
  });

  it('the read key is the shell key since v5: slot and edition time', () => {
    expect(reportReadKey(report())).toBe('INTO_RTH:1-20:2026-10-08@2026-10-08T13:31:00.000Z');
  });
});

describe('his 07:00 to 10:00 ET weekday window: the mark only', () => {
  const at = (iso: string) => inMarkOnlyWindow(Date.parse(iso));

  it('a weekday, summer time: 06:59 out, 07:00 in, 09:59 in, 10:00 out', () => {
    expect(at('2026-10-08T10:59:00.000Z')).toBe(false);
    expect(at('2026-10-08T11:00:00.000Z')).toBe(true);
    expect(at('2026-10-08T13:59:00.000Z')).toBe(true);
    expect(at('2026-10-08T14:00:00.000Z')).toBe(false);
  });

  it('a weekday, winter time (UTC-5): 07:00 ET is 12:00Z', () => {
    expect(at('2026-12-03T11:59:00.000Z')).toBe(false);
    expect(at('2026-12-03T12:00:00.000Z')).toBe(true);
    expect(at('2026-12-03T15:00:00.000Z')).toBe(false);
  });

  it('Saturday and Sunday at 08:00 ET: outside it', () => {
    expect(at('2026-10-10T12:00:00.000Z')).toBe(false);
    expect(at('2026-10-11T12:00:00.000Z')).toBe(false);
  });

  it('the ET day decides, not the UTC day (Friday 23:30 ET is Saturday in UTC)', () => {
    // Monday 2026-10-12 08:00 ET is 12:00Z, inside; Sunday 2026-10-11 23:30 ET is Monday 03:30Z, outside.
    expect(at('2026-10-12T12:00:00.000Z')).toBe(true);
    expect(at('2026-10-12T03:30:00.000Z')).toBe(false);
  });
});

describe('opening on load', () => {
  const ten = Date.parse('2026-10-08T14:05:00.000Z'); // 10:05 am ET Thursday

  it('opens a published, unread current report outside the window', () => {
    expect(openOnLoad(view(report()), [], ten)).toBe(true);
  });

  it('inside the window it does not open (the mark shows instead)', () => {
    expect(openOnLoad(view(report()), [], THU_0930_ET)).toBe(false);
    expect(reportMark(view(report()), [], THU_0930_ET)).not.toBeNull();
  });

  it('never for a read report, a silent edition whose 8:30 was read, or no report (no fallback)', () => {
    expect(openOnLoad(view(report()), [reportReadKey(report())], ten)).toBe(false);
    const late = Date.parse('2026-10-08T03:00:00.000Z');
    expect(openOnLoad(view(tenPm([], false), 'PUBLISHED', [EIGHT_THIRTY]), [reportReadKey(EIGHT_THIRTY)], late)).toBe(false);
    expect(openOnLoad(view(null, 'CHECKING'), [], ten)).toBe(false);
    expect(openOnLoad(view(null, 'MISSED'), [], ten)).toBe(false);
    expect(openOnLoad(null, [], ten)).toBe(false);
  });

  it('the notice hooks sit ABOVE the shell early return (a hook after it changes the hook count and crashes the desk)', () => {
    const shell = readFileSync('components/DashboardShell.tsx', 'utf8');
    const early = shell.indexOf('  if (!data) {');
    expect(early).toBeGreaterThan(0);
    for (const hook of ['const openDecided = useRef(false);', 'document.title = tabTitle(document.title, mark !== null);']) {
      expect(shell.indexOf(hook)).toBeGreaterThan(0);
      expect(shell.indexOf(hook)).toBeLessThan(early);
    }
  });

  it('the shell decides once per load, after the read list is loaded, and never on a later poll', () => {
    const shell = readFileSync('components/DashboardShell.tsx', 'utf8');
    expect(shell).toContain('if (openDecided.current || !readLoaded || !timeline) return;');
    expect(shell).toContain('openDecided.current = true;');
    expect(shell).toContain('if (openOnLoad(timeline.current, readReports, now)) openReport();');
  });
});

describe('the tab title and the words', () => {
  it('"(1) " while marked, never doubled, removed when not', () => {
    expect(tabTitle('The Momentum Intelligence Trading Desk', true)).toBe('(1) The Momentum Intelligence Trading Desk');
    expect(tabTitle('(1) The Momentum Intelligence Trading Desk', true)).toBe('(1) The Momentum Intelligence Trading Desk');
    expect(tabTitle('(1) The Momentum Intelligence Trading Desk', false)).toBe('The Momentum Intelligence Trading Desk');
  });

  it("Dismiss is Marketing's words; no em dash in any string", () => {
    expect(DISMISS_WORDS).toEqual({
      label: 'Dismiss',
      title: 'Marks this report as read in this browser. You can still open it from this line.',
    });
    const mark = reportMark(view(report()), [], THU_0930_ET)!;
    for (const s of [mark.label, mark.title, mark.announcement, DISMISS_WORDS.label, DISMISS_WORDS.title]) {
      expect(s.includes(EM_DASH)).toBe(false);
    }
  });
});

describe('the marked line, server-rendered', () => {
  const choice = { kind: 'CHOSEN', range: { id: '1-20', label: '$1 to $20', min: 1, max: 20 } } as never;
  const render = (mark: ReturnType<typeof reportMark>) =>
    renderToStaticMarkup(
      createElement(BriefingLine, {
        timeline: { current: view(report()), earlier: [] },
        choice,
        onChooseRange: () => {},
        onOpen: () => {},
        read: false,
        mark,
        onDismiss: () => {},
        nowMs: THU_0930_ET,
      }),
    );

  it('marked: the accent edge and tint, the "New" text with its hover, and Dismiss', () => {
    const html = render(reportMark(view(report()), [], THU_0930_ET));
    expect(html).toContain('border-l-accent bg-accent/10');
    expect(html).toContain('title="Published 9:31 am ET. Not opened in this browser."');
    expect(html).toContain('>New<');
    expect(html).toContain(`title="${DISMISS_WORDS.title}"`);
    expect(html).toContain('>Dismiss<');
  });

  it('unmarked: the same 2 px edge, transparent, and no Dismiss', () => {
    const html = render(null);
    expect(html).toContain('border-l-2');
    expect(html).toContain('border-l-transparent bg-desk');
    expect(html).not.toContain('>Dismiss<');
    expect(html).not.toContain('>New<');
  });
});
