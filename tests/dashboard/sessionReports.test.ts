import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  MissedCause,
  ReportRange,
  ReportSlot,
  SessionReport,
  SessionReportsPayload,
} from '@/lib/desk/reports/contract';
import {
  briefingLineText,
  checkpointText,
  chooseReportRange,
  coverageText,
  EMPTY_SECTION_LINE,
  missedCauseText,
  outsideBoardRange,
  reportCoverage,
  reportTimeline,
  sessionText,
  watchLine,
} from '@/lib/dashboard/sessionReports';
import { NOTHING_LINE } from '@/lib/desk/reports/writer';

/*
 * Written from the design (design-seat.md), not from the implementation:
 * every expectation below is a sentence of that file.
 */

const RANGES: ReportRange[] = [
  { id: 'sub1', label: 'under $1', min: 0.25, max: 1 },
  { id: 'core', label: '$1–$20', min: 1, max: 20 },
  { id: 'upper', label: '$20–$50', min: 20, max: 50 },
];

// Monday 2026-09-28, EDT (UTC-4).
const AH_PRIOR = '2026-09-25T20:05:00Z'; // Fri 16:05 ET
const PREMARKET = '2026-09-26T02:05:00Z'; // Fri 22:05 ET, for Monday
const INTO_RTH = '2026-09-28T13:27:00Z'; // Mon 09:27 ET
const POWER = '2026-09-28T18:32:00Z'; // Mon 14:32 ET

function slot(kind: ReportSlot['kind'], scheduledFor: string, tradingDate = '2026-09-28'): ReportSlot {
  return {
    kind,
    rangeId: 'core',
    tradingDate,
    targetTradingDate: null,
    scheduledFor,
    relevantUntil: new Date(Date.parse(scheduledFor) + 30 * 60_000).toISOString(),
  };
}

function report(s: ReportSlot, publishedAt: string, extra: Partial<SessionReport> = {}): SessionReport {
  return {
    kind: s.kind,
    rangeId: s.rangeId,
    range: { min: 1, max: 20 },
    tradingDate: s.tradingDate,
    targetTradingDate: s.targetTradingDate,
    checkpoints: [{ id: 7, type: 'OPEN_SPIKE_ASSESSMENT', completedAt: s.scheduledFor }],
    publishedAt,
    late: false,
    headline: 'Three names moved.',
    sections: [],
    ...extra,
  };
}

const SLOTS = [
  slot('AFTER_HOURS', AH_PRIOR, '2026-09-25'),
  slot('PREMARKET', PREMARKET, '2026-09-28'),
  slot('INTO_RTH', INTO_RTH),
  slot('INTO_POWER_HOUR', POWER),
];

function payload(reports: SessionReport[], missedCauses: Record<string, MissedCause> = {}): SessionReportsPayload {
  return { ranges: RANGES, defaultRangeId: 'core', slots: SLOTS, reports, missedCauses };
}

const at = (iso: string, plusMinutes = 0) => Date.parse(iso) + plusMinutes * 60_000;

describe('reportTimeline: the six states', () => {
  it('before its time a slot is DUE and says when', () => {
    const t = reportTimeline(payload([]), 'core', at(PREMARKET, -60));
    expect(t.current?.slot.kind).toBe('AFTER_HOURS');
    // Friday's after-hours slot is long past its window with nothing written.
    expect(t.current?.state).toBe('MISSED');

    const before = reportTimeline(
      { ...payload([]), slots: SLOTS.slice(1) },
      'core',
      at(PREMARKET, -60),
    );
    expect(before.current?.state).toBe('DUE');
    expect(briefingLineText(before.current!, at(PREMARKET, -60))).toMatch(/due 10:05 pm ET/);
  });

  it('due with no checked report is BEING CHECKED — never draft text', () => {
    const t = reportTimeline(payload([]), 'core', at(INTO_RTH, 2));
    expect(t.current?.slot.kind).toBe('INTO_RTH');
    expect(t.current?.state).toBe('CHECKING');
    expect(briefingLineText(t.current!, 0)).toBe('Into-the-open briefing · being checked');
  });

  it('a checked report is PUBLISHED, and a late one stays published with the flag', () => {
    const s = SLOTS[2];
    const late = report(s, new Date(at(INTO_RTH, 9)).toISOString(), { late: true });
    const t = reportTimeline(payload([late]), 'core', at(INTO_RTH, 10));
    expect(t.current?.state).toBe('PUBLISHED');
    expect(t.current?.report?.late).toBe(true);
  });

  it('past relevantUntil with nothing written is MISSED, with only the stored cause', () => {
    const key = 'INTO_RTH:core:2026-09-28';
    const t = reportTimeline(
      payload([], {
        [key]: {
          kind: 'CHECKPOINT_INCOMPLETE',
          checkpoint: { id: 41, type: 'OPEN_SPIKE_ASSESSMENT', scheduledFor: '2026-09-28T13:25:00Z' },
          status: 'FAILED',
        },
      }),
      'core',
      at(INTO_RTH, 45),
    );
    expect(t.current?.state).toBe('MISSED');
    expect(t.current?.missedReason).toBe('The 9:25 am ET assessment did not finish.');
    expect(briefingLineText(t.current!, 0)).toMatch(/^No into-the-open briefing/);
  });

  it('no stored cause is no reason — "missed" and nothing guessed', () => {
    const t = reportTimeline(payload([]), 'core', at(INTO_RTH, 45));
    expect(t.current?.state).toBe('MISSED');
    expect(t.current?.missedReason).toBeNull();
  });

  it('MISSED IS NEVER FILLED FROM THE PREVIOUS SLOT', () => {
    const premarket = report(SLOTS[1], PREMARKET);
    const t = reportTimeline(payload([premarket]), 'core', at(INTO_RTH, 45));
    expect(t.current?.slot.kind).toBe('INTO_RTH');
    expect(t.current?.report).toBeNull();
    expect(t.current?.state).toBe('MISSED');
  });

  it('a slot is OVER once a later slot is due — supersession, not age', () => {
    const premarket = report(SLOTS[1], PREMARKET);
    // 90 minutes into premarket on Monday it is current, though ~58h old.
    const morning = reportTimeline(payload([premarket]), 'core', at(INTO_RTH, -90));
    expect(morning.current?.slot.kind).toBe('PREMARKET');
    expect(morning.current?.state).toBe('PUBLISHED');

    const later = reportTimeline(payload([premarket]), 'core', at(INTO_RTH, 1));
    expect(later.earlier.map((v) => v.slot.kind)).toEqual(['PREMARKET', 'AFTER_HOURS']);
    expect(later.earlier[0].state).toBe('OVER');
    expect(later.earlier[0].report).toBe(premarket);
  });

  it('an update is a second report for one slot: newest shown, older kept', () => {
    const original = report(SLOTS[1], PREMARKET);
    const update = report(SLOTS[1], '2026-09-28T11:03:00Z');
    const t = reportTimeline(payload([original, update]), 'core', at(INTO_RTH, -60));
    expect(t.current?.report).toBe(update);
    expect(t.current?.superseded).toEqual([original]);
  });

  it('reads only its own range', () => {
    const other = { ...report(SLOTS[2], INTO_RTH), rangeId: 'upper' };
    const t = reportTimeline(payload([other]), 'core', at(INTO_RTH, 5));
    expect(t.current?.report).toBeNull();
  });

  it('no slots at all is no line, not a missed one', () => {
    expect(reportTimeline({ ...payload([]), slots: [] }, 'core', at(INTO_RTH)).current).toBeNull();
  });
});

describe('chooseReportRange', () => {
  const base = { ranges: RANGES, defaultRangeId: 'core', stored: null };

  it('a board inside one range opens on it', () => {
    expect(chooseReportRange({ ...base, board: { min: 1, max: 20 } })).toEqual({
      kind: 'CHOSEN',
      range: RANGES[1],
      source: 'board',
    });
    expect(chooseReportRange({ ...base, board: { min: 25, max: 40 } })).toMatchObject({
      kind: 'CHOSEN',
      range: RANGES[2],
    });
  });

  it('a board spanning two ranges SAYS SO rather than guessing', () => {
    expect(chooseReportRange({ ...base, board: { min: 0.5, max: 10 } })).toEqual({
      kind: 'STRADDLE',
      candidates: [RANGES[0], RANGES[1]],
    });
  });

  it('meeting at a shared boundary is not overlap', () => {
    // $0.50-$20 spans under-$1 and $1-$20, and only TOUCHES $20-$50 at 20.
    expect(chooseReportRange({ ...base, board: { min: 0.5, max: 20 } })).toEqual({
      kind: 'STRADDLE',
      candidates: [RANGES[0], RANGES[1]],
    });
  });

  it("the viewer's own choice wins, and a stale stored id is ignored", () => {
    expect(
      chooseReportRange({ ...base, stored: 'upper', board: { min: 0.5, max: 10 } }),
    ).toMatchObject({ kind: 'CHOSEN', range: RANGES[2], source: 'viewer' });
    expect(
      chooseReportRange({ ...base, stored: 'gone', board: { min: 0.5, max: 10 } })?.kind,
    ).toBe('STRADDLE');
  });

  it('no board yet falls to the configured default; no ranges is nothing', () => {
    expect(chooseReportRange({ ...base, board: null })).toMatchObject({
      range: RANGES[1],
      source: 'default',
    });
    expect(chooseReportRange({ ...base, ranges: [], board: null })).toBeNull();
  });
});

describe('outsideBoardRange: "not in your range"', () => {
  it('only where the board and the report range differ', () => {
    expect(outsideBoardRange(0.6, { min: 1, max: 20 }, RANGES[1])).toBe(false);
    expect(outsideBoardRange(12, { min: 0.5, max: 10 }, RANGES[1])).toBe(true);
    expect(outsideBoardRange(8, { min: 0.5, max: 10 }, RANGES[1])).toBe(false);
  });

  it('never on an unknown price', () => {
    expect(outsideBoardRange(null, { min: 0.5, max: 10 }, RANGES[1])).toBe(false);
    expect(outsideBoardRange(Number.NaN, { min: 0.5, max: 10 }, RANGES[1])).toBe(false);
  });
});

describe('the words', () => {
  it('coverage is m of n over the report’s own names', () => {
    expect(coverageText({ named: 7, withLiveFeed: 5, unknown: 0 })).toBe('5 of 7 names had live trade data');
    expect(coverageText({ named: 1, withLiveFeed: 0, unknown: 0 })).toBe('0 of 1 name had live trade data');
    expect(coverageText({ named: 0, withLiveFeed: 0, unknown: 0 })).toBeNull();
  });

  it('coverage is counted from the lines, so it cannot disagree with their marks', () => {
    const coverage = reportCoverage({
      sections: [
        { heading: 'a', lines: [
          { ticker: 'INLF', liveFeed: true, text: 'x' },
          { ticker: 'MGLD', liveFeed: false, text: 'x' },
          { ticker: null, liveFeed: false, text: 'a sentence about no name' },
        ] },
        { heading: 'b', lines: [
          // Named twice, counted once, and live because one of its lines was.
          { ticker: 'MGLD', liveFeed: true, text: 'named twice' },
          { ticker: 'KITT', liveFeed: true, text: 'x' },
        ] },
      ],
    });
    expect(coverage).toEqual({ named: 3, withLiveFeed: 3, unknown: 0 });
  });

  it('A NULL FEED IS NOT A FALSE: unrecorded names are never counted as without', () => {
    const coverage = reportCoverage({
      sections: [{ heading: 'a', lines: [
        { ticker: 'INLF', liveFeed: true, text: 'x' },
        { ticker: 'MGLD', liveFeed: false, text: 'x' },
        { ticker: 'JAB', liveFeed: null, text: 'x' },
        // A later line that could not say does not erase an earlier false,
        // and a later true beats an earlier null.
        { ticker: 'KITT', liveFeed: null, text: 'x' },
        { ticker: 'KITT', liveFeed: true, text: 'x' },
      ] }],
    });
    expect(coverage).toEqual({ named: 4, withLiveFeed: 2, unknown: 1 });
    expect(coverageText(coverage)).toBe('2 of 3 names had live trade data; not recorded for 1 more');
    // All unknown reads as absent (Integration 35th, Commercial's condition): no header text at all.
    expect(coverageText({ named: 2, withLiveFeed: 0, unknown: 2 })).toBeNull();
  });

  it('a checkpoint is named by its completed ET minute and label, never its id', () => {
    expect(
      checkpointText({ type: 'OPEN_SPIKE_ASSESSMENT', completedAt: '2026-09-28T13:26:00Z' }, Date.parse('2026-09-28T14:00:00Z')),
    ).toBe('9:26 am ET open spike assessment');
    // The label's own clock is dropped so two times cannot disagree.
    expect(checkpointText({ type: 'NEXT_DAY_RECAP', completedAt: '2026-09-26T02:03:00Z' }, Date.parse('2026-09-26T03:00:00Z'))).toBe(
      '10:03 pm ET recap',
    );
    // Read on another ET day, the date joins the time (the v6 report lines' rule).
    expect(checkpointText({ type: 'NEXT_DAY_RECAP', completedAt: '2026-09-26T02:03:00Z' }, Date.parse('2026-09-26T14:00:00Z'))).toBe(
      'Sep 25, 10:03 pm ET recap',
    );
  });

  it('a session is a calendar day, not an instant', () => {
    expect(sessionText('2026-09-28')).toBe('Mon, Sep 28');
    expect(sessionText('garbage')).toBeNull();
  });
});

/*
 * From Marketing's table (marketing.md, 809e4c4), one row per kind, and his
 * ruling: "we're watching N names into premarket".
 */
describe('watchLine: the opening sentence', () => {
  it('names where each kind of report is headed', () => {
    expect(watchLine('PREMARKET', 7)).toBe("We're watching 7 names into the premarket.");
    expect(watchLine('INTO_RTH', 7)).toBe("We're watching 7 names into the open.");
    expect(watchLine('INTO_POWER_HOUR', 7)).toBe("We're watching 7 names into the last hour.");
    expect(watchLine('AFTER_HOURS', 7)).toBe("We're watching 7 names into after-hours.");
  });

  it('one is a name, not names', () => {
    expect(watchLine('PREMARKET', 1)).toBe("We're watching 1 name into the premarket.");
  });

  it('a quiet session says nothing is on watch, never "watching 0 names"', () => {
    expect(watchLine('PREMARKET', 0)).toBe('Nothing on watch into the premarket.');
    expect(watchLine('INTO_RTH', 0)).toBe('Nothing on watch into the open.');
    expect(watchLine('INTO_POWER_HOUR', 0)).toBe('Nothing on watch into the last hour.');
    expect(watchLine('AFTER_HOURS', 0)).toBe('Nothing on watch into after-hours.');
  });

  it('prints nothing for a count it cannot trust, rather than a guessed number', () => {
    for (const bad of [-1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(watchLine('PREMARKET', bad)).toBeNull();
    }
  });
});

describe('a section with no line', () => {
  it("reads Marketing's line, which speaks about the report and not the sources", () => {
    expect(EMPTY_SECTION_LINE).toBe('No line for this section in this report.');
  });

  it("is never the writer's checked absence: after a strike the sources DO hold a name", () => {
    expect(EMPTY_SECTION_LINE).not.toBe(NOTHING_LINE);
    expect(EMPTY_SECTION_LINE).not.toMatch(/sources|nothing|removed|struck|checked/i);
  });

  // SUPERSEDED for the window by his "b" (2026-10-01T02:24:33Z): the headings are
  // hidden until v6 computes them, so an empty section prints nothing at all
  // (tests/dashboard/reportBlocks.test.ts). The line stays defined for v6.
  it('is not printed while the headings are hidden, and the claim is nowhere in the window', () => {
    const source = readFileSync(join(process.cwd(), 'components/SessionReports.tsx'), 'utf8');
    expect(source).not.toContain('EMPTY_SECTION_LINE');
    expect(source).not.toContain(NOTHING_LINE);
    expect(source).not.toMatch(/Nothing in our sources/);
  });
});

describe('missedCauseText: the trader words, keyed on kind only', () => {
  const checkpoint = { type: 'OPEN_SPIKE_ASSESSMENT' as const, scheduledFor: '2026-09-28T13:25:00Z' };
  const at = '2026-09-28T13:31:00Z';
  const causes: MissedCause[] = [
    { kind: 'CHECKPOINT_NOT_RUN', checkpoint, evidence: 'RECORDED_MISSED' },
    { kind: 'CHECKPOINT_NOT_RUN', checkpoint, evidence: 'NO_ROW' },
    { kind: 'CHECKPOINT_INCOMPLETE', checkpoint: { ...checkpoint, id: 9 }, status: 'PARTIAL' },
    { kind: 'WRITER_FAILED', at },
    { kind: 'CHECKER_FAILED', at },
    { kind: 'ALL_STRUCK', at },
    { kind: 'NOT_ATTEMPTED' },
  ];

  it("each cause reads as Design worded it, with the CHECKPOINT's time", () => {
    expect(causes.map((cause) => missedCauseText(cause))).toEqual([
      'No 9:25 am ET assessment ran.',
      'No 9:25 am ET assessment ran.',
      'The 9:25 am ET assessment did not finish.',
      'The report could not be written.',
      'The report could not be checked, so it is not shown.',
      'Every line failed its check, so nothing is shown.',
      'No report was attempted.',
    ]);
  });

  it('with the reader clock: the time alone on the same ET day, the date on another (12-hour ET)', () => {
    expect(missedCauseText(causes[0], Date.parse('2026-09-28T15:00:00Z'))).toBe('No 9:25 am ET assessment ran.');
    expect(missedCauseText(causes[2], Date.parse('2026-09-29T15:00:00Z'))).toBe('The Sep 28, 9:25 am ET assessment did not finish.');
  });

  it('two diagnoses of a checkpoint that did not run read as ONE sentence', () => {
    expect(missedCauseText(causes[0])).toBe(missedCauseText(causes[1]));
  });

  it('never prints a kind, a status or an evidence code', () => {
    for (const text of causes.map((cause) => missedCauseText(cause))) {
      expect(text).not.toMatch(/[A-Z]{2,}_[A-Z]/);
      expect(text).not.toMatch(/PARTIAL|FAILED|RUNNING|NO_ROW|RECORDED/);
    }
  });
});
