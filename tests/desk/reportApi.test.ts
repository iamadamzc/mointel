import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

import { reportTimeline } from '@/lib/dashboard/sessionReports';
import { REPORT_GRACE_MS, buildReportsPayload, readReportsPayload, reportSlots, type StoredReportRow } from '@/lib/desk/reports/api';
import type { SessionReport } from '@/lib/desk/reports/contract';
import { DEFAULT_REPORT_RANGES, reportRanges } from '@/lib/desk/reports/ranges';

const RECAP = { tradingDate: '2026-09-28', targetTradingDate: '2026-09-29', scheduledFor: '2026-09-29T02:00:00.000Z' };
const RANGES = DEFAULT_REPORT_RANGES;

function published(kind: SessionReport['kind'], tradingDate: string): StoredReportRow {
  const report: SessionReport = {
    kind,
    rangeId: '1-20',
    range: { min: 1, max: 20 },
    tradingDate,
    targetTradingDate: kind === 'PREMARKET' ? '2026-09-29' : null,
    checkpoints: [{ id: 551, type: 'NEXT_DAY_RECAP', completedAt: '2026-09-29T02:00:09.248Z' }],
    publishedAt: '2026-09-29T02:01:30.000Z',
    late: false,
    headline: null,
    sections: [{ heading: 'Moved', lines: [{ ticker: 'SANG', liveFeed: null, text: 'x.' }] }],
    watchCount: 1,
    overall: null,
  };
  return { kind, range_key: '1-20', trading_date: tradingDate, status: 'PUBLISHED', payload: JSON.stringify(report), missed_cause: null };
}

describe('the report slots, from the latest recap', () => {
  it('last night’s after-hours and premarket, then today’s three, each with a 30-minute grace', () => {
    const slots = reportSlots(RECAP, RANGES);
    expect(slots.map((s) => `${s.kind} ${s.tradingDate} ${s.scheduledFor}`)).toEqual([
      'AFTER_HOURS 2026-09-28 2026-09-28T20:00:00.000Z',
      'PREMARKET 2026-09-28 2026-09-29T02:00:00.000Z',
      'INTO_RTH 2026-09-29 2026-09-29T13:25:00.000Z',
      'INTO_POWER_HOUR 2026-09-29 2026-09-29T18:30:00.000Z',
      'AFTER_HOURS 2026-09-29 2026-09-29T20:00:00.000Z',
    ]);
    for (const s of slots) expect(Date.parse(s.relevantUntil) - Date.parse(s.scheduledFor)).toBe(REPORT_GRACE_MS);
    expect(slots[1]!.targetTradingDate).toBe('2026-09-29');
  });

  it('no recap, no slots', () => {
    expect(reportSlots(null, RANGES)).toEqual([]);
  });
});

describe('the payload', () => {
  it('a published row is a report, a missed row is its slot’s cause, and an unconfigured range is left out', () => {
    const missed: StoredReportRow = {
      kind: 'INTO_RTH',
      range_key: '1-20',
      trading_date: '2026-09-29',
      status: 'MISSED',
      payload: null,
      missed_cause: JSON.stringify({ kind: 'WRITER_FAILED', at: '2026-09-29T13:26:00.000Z' }),
    };
    const other = { ...published('INTO_POWER_HOUR', '2026-09-29'), range_key: '20-50' };
    const payload = buildReportsPayload(RECAP, [published('PREMARKET', '2026-09-28'), missed, other], RANGES, '1-20');
    expect(payload.reports.map((r) => r.kind)).toEqual(['PREMARKET']);
    expect(payload.missedCauses).toEqual({ 'INTO_RTH:1-20:2026-09-29': { kind: 'WRITER_FAILED', at: '2026-09-29T13:26:00.000Z' } });
    expect(payload.defaultRangeId).toBe('1-20');
  });

  it('the premarket report lands in the slot Design’s timeline shows (the keys agree)', () => {
    const payload = buildReportsPayload(RECAP, [published('PREMARKET', '2026-09-28')], RANGES, '1-20');
    const view = reportTimeline(payload, '1-20', Date.parse('2026-09-29T03:00:00.000Z'));
    expect(view.current?.slot.kind).toBe('PREMARKET');
    expect(view.current?.state).toBe('PUBLISHED');
    expect(view.current?.report?.watchCount).toBe(1);
  });
});

describe('reading the store', () => {
  function store(withTable: boolean) {
    const db = new Database(':memory:');
    db.exec(`CREATE TABLE desk_assessments (id INTEGER PRIMARY KEY, trading_date TEXT, target_trading_date TEXT,
      assessment_type TEXT, scheduled_for TEXT)`);
    db.prepare('INSERT INTO desk_assessments (trading_date, target_trading_date, assessment_type, scheduled_for) VALUES (?, ?, ?, ?)')
      .run('2026-09-28', '2026-09-29', 'NEXT_DAY_RECAP', '2026-09-29T02:00:00.000Z');
    if (withTable) {
      db.exec(`CREATE TABLE session_reports (id INTEGER PRIMARY KEY, kind TEXT, range_key TEXT, trading_date TEXT,
        status TEXT, payload TEXT, missed_cause TEXT)`);
      const row = published('PREMARKET', '2026-09-28');
      db.prepare('INSERT INTO session_reports (kind, range_key, trading_date, status, payload, missed_cause) VALUES (?, ?, ?, ?, ?, ?)')
        .run(row.kind, row.range_key, row.trading_date, row.status, row.payload, row.missed_cause);
    }
    return db;
  }

  it('no table is null (the route answers 404 and the panel does not mount), never an empty report list', () => {
    expect(readReportsPayload(store(false), new Date('2026-09-29T03:00:00Z'), RANGES, '1-20')).toBeNull();
  });

  it('with the table, the latest recap at or before now decides the slots, and stored reports fill them', () => {
    const payload = readReportsPayload(store(true), new Date('2026-09-29T03:00:00Z'), RANGES, '1-20');
    expect(payload?.slots).toHaveLength(5);
    expect(payload?.reports).toHaveLength(1);
    // Before that recap was scheduled, there is none to use.
    expect(readReportsPayload(store(true), new Date('2026-09-29T01:00:00Z'), RANGES, '1-20')?.slots).toEqual([]);
  });
});

describe('the range config', () => {
  it('defaults to $1-$20, reads REPORT_RANGES, and skips an entry that does not parse', () => {
    expect(reportRanges({})).toEqual({ ranges: [{ id: '1-20', label: '$1–$20', min: 1, max: 20 }], defaultRangeId: '1-20' });
    const set = reportRanges({ REPORT_RANGES: '1-20:1:20, 20-50:20:50, bad:5:1, x', REPORT_DEFAULT_RANGE: '20-50' });
    expect(set.ranges.map((r) => [r.id, r.label])).toEqual([
      ['1-20', '$1–$20'],
      ['20-50', '$20–$50'],
    ]);
    expect(set.defaultRangeId).toBe('20-50');
  });
});
