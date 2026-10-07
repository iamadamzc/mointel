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
  it('last night’s after-hours and evening, then today’s four, each with a 30-minute grace; no premarket slot (its row is the 10 pm edition)', () => {
    const slots = reportSlots(RECAP, RANGES);
    expect(slots.map((s) => `${s.kind} ${s.tradingDate} ${s.scheduledFor}`)).toEqual([
      'AFTER_HOURS 2026-09-28 2026-09-28T20:00:00.000Z',
      'EVENING 2026-09-28 2026-09-29T00:05:00.000Z', // 20:05 ET, the AFTER_HOURS_CLOSE checkpoint
      'INTO_RTH 2026-09-29 2026-09-29T13:25:00.000Z',
      'INTO_POWER_HOUR 2026-09-29 2026-09-29T18:30:00.000Z',
      'AFTER_HOURS 2026-09-29 2026-09-29T20:00:00.000Z',
      'EVENING 2026-09-29 2026-09-30T00:05:00.000Z',
    ]);
    for (const s of slots) expect(Date.parse(s.relevantUntil) - Date.parse(s.scheduledFor)).toBe(REPORT_GRACE_MS);
    expect(slots[1]!.targetTradingDate).toBeNull();
  });

  it('an EVENING row is filed under its slot', () => {
    const payload = buildReportsPayload(RECAP, [published('EVENING', '2026-09-28')], RANGES, '1-20');
    expect(payload.reports.map((r) => `${r.kind} ${r.tradingDate}`)).toEqual(['EVENING 2026-09-28']);
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
    const payload = buildReportsPayload(RECAP, [published('AFTER_HOURS', '2026-09-28'), missed, other], RANGES, '1-20');
    expect(payload.reports.map((r) => r.kind)).toEqual(['AFTER_HOURS']);
    expect(payload.missedCauses).toEqual({ 'INTO_RTH:1-20:2026-09-29': { kind: 'WRITER_FAILED', at: '2026-09-29T13:26:00.000Z' } });
    expect(payload.defaultRangeId).toBe('1-20');
  });

  it('a published 10 pm edition (a PREMARKET row) is filed under the same date’s EVENING slot, which Design’s timeline shows', () => {
    const payload = buildReportsPayload(RECAP, [published('PREMARKET', '2026-09-28')], RANGES, '1-20');
    expect(payload.reports.map((r) => `${r.kind} ${r.tradingDate}`)).toEqual(['EVENING 2026-09-28']);
    const view = reportTimeline(payload, '1-20', Date.parse('2026-09-29T03:00:00.000Z'));
    expect(view.current?.slot.kind).toBe('EVENING');
    expect(view.current?.state).toBe('PUBLISHED');
    expect(view.current?.report?.watchCount).toBe(1);
  });

  it('with both editions, the slot shows the 10 pm one and keeps the 8:30 one as superseded', () => {
    const first = published('EVENING', '2026-09-28');
    first.payload = JSON.stringify({ ...JSON.parse(first.payload!), publishedAt: '2026-09-29T00:21:00.000Z' });
    const payload = buildReportsPayload(RECAP, [first, published('PREMARKET', '2026-09-28')], RANGES, '1-20');
    const view = reportTimeline(payload, '1-20', Date.parse('2026-09-29T03:00:00.000Z'));
    expect(view.current?.report?.publishedAt).toBe('2026-09-29T02:01:30.000Z');
    expect(view.current?.superseded.map((r) => r.publishedAt)).toEqual(['2026-09-29T00:21:00.000Z']);
  });

  it('a missed 10 pm edition shows nothing: the 8:30 edition stands and its slot gets no cause', () => {
    const missed: StoredReportRow = {
      kind: 'PREMARKET', range_key: '1-20', trading_date: '2026-09-28', status: 'MISSED', payload: null,
      missed_cause: JSON.stringify({ kind: 'WRITER_FAILED', at: '2026-09-29T02:01:00.000Z' }),
    };
    const payload = buildReportsPayload(RECAP, [published('EVENING', '2026-09-28'), missed], RANGES, '1-20');
    expect(payload.reports.map((r) => r.kind)).toEqual(['EVENING']);
    expect(payload.missedCauses).toEqual({});
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
    expect(payload?.slots).toHaveLength(6);
    expect(payload?.reports).toHaveLength(1);
    // Before that recap was scheduled, there is none to use.
    expect(readReportsPayload(store(true), new Date('2026-09-29T01:00:00Z'), RANGES, '1-20')?.slots).toEqual([]);
  });
});

describe('a stored report reads without the model citation tokens it was written with (RPGL "[1043]")', () => {
  const NOW = new Date('2026-09-29T03:00:00Z');

  /** A store with one stored premarket report whose RPGL company line carries `business`, and RPGL's source ids 1..2 (the other ticker owns 3). */
  function storeWith(business: string | null, withSources = true) {
    const db = new Database(':memory:');
    db.exec(`CREATE TABLE desk_assessments (id INTEGER PRIMARY KEY, trading_date TEXT, target_trading_date TEXT,
      assessment_type TEXT, scheduled_for TEXT)`);
    db.prepare('INSERT INTO desk_assessments (trading_date, target_trading_date, assessment_type, scheduled_for) VALUES (?, ?, ?, ?)')
      .run('2026-09-28', '2026-09-29', 'NEXT_DAY_RECAP', '2026-09-29T02:00:00.000Z');
    db.exec(`CREATE TABLE session_reports (id INTEGER PRIMARY KEY, kind TEXT, range_key TEXT, trading_date TEXT,
      status TEXT, payload TEXT, missed_cause TEXT)`);
    const row = published('PREMARKET', '2026-09-28');
    const report = JSON.parse(row.payload!) as SessionReport;
    report.sections = [
      {
        heading: 'Moved',
        lines: [
          { ticker: 'RPGL', liveFeed: null, text: 'Kept as stored [2].', company: { name: 'Republic Power', country: 'United States', business } },
          { ticker: 'OTHR', liveFeed: null, text: 'y.', company: { name: 'Other Co', country: null, business: 'Other business [1].' } },
        ],
      },
    ];
    db.prepare('INSERT INTO session_reports (kind, range_key, trading_date, status, payload, missed_cause) VALUES (?, ?, ?, ?, ?, ?)')
      .run(row.kind, row.range_key, row.trading_date, row.status, JSON.stringify(report), row.missed_cause);
    if (withSources) {
      db.exec('CREATE TABLE research_sources (id INTEGER PRIMARY KEY, ticker TEXT)');
      for (const [id, ticker] of [[1, 'RPGL'], [2, 'RPGL'], [3, 'OTHR']] as const) {
        db.prepare('INSERT INTO research_sources (id, ticker) VALUES (?, ?)').run(id, ticker);
      }
    }
    return db;
  }

  const lines = (db: ReturnType<typeof storeWith>) => readReportsPayload(db, NOW, RANGES, '1-20')!.reports[0]!.sections[0]!.lines;

  it('removes a lone short bracket that is one of the ticker source ids from company.business, and keeps a year it does not own', () => {
    const [rpgl] = lines(storeWith('Power services [1] listed in [2026].'));
    expect(rpgl!.company!.business).toBe('Power services listed in [2026].');
  });

  it('removes a 5-digit bracket whether or not the ticker owns it (production\'s stored form: 2026-10-01, 7 strings)', () => {
    const [rpgl] = lines(storeWith('Power services [30265] listed in [2026].'));
    expect(rpgl!.company!.business).toBe('Power services listed in [2026].');
    // No research_sources table, so no owned ids: the forms that need none (5-digit, comma lists) still go.
    const noOwned = lines(storeWith('Power services [30265] and [30266, 30267].', false))[0]!;
    expect(noOwned.company!.business).toBe('Power services and.');
  });

  it('uses each ticker\'s OWN ids: another ticker\'s id leaves the bracket, and the writer\'s sentence is untouched', () => {
    const [rpgl, othr] = lines(storeWith('Power services [3].'));
    expect(rpgl!.company!.business).toBe('Power services [3].');
    expect(rpgl!.text).toBe('Kept as stored [2].');
    // OTHR owns source 3, not 1: its "[1]" stays.
    expect(othr!.company!.business).toBe('Other business [1].');
  });

  it('with no research_sources table a lone SHORT bracket stays (no owned ids), and a null business stays null', () => {
    expect(lines(storeWith('Power services [1].', false))[0]!.company!.business).toBe('Power services [1].');
    expect(lines(storeWith(null))[0]!.company!.business).toBeNull();
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
