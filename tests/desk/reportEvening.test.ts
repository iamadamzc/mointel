import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase, type MarketDatabase } from '@/lib/market/store/db';
import {
  claimAssessmentSlot,
  completeAssessment,
  insertAssessmentRanges,
  insertAssessmentTickers,
  type AssessmentTickerRecord,
} from '@/lib/market/store/assessmentRepo';
import { readLatestAnalysesAsOf, saveAnalysisVersion } from '@/lib/market/store/researchRepo';
import { pendingReports } from '@/lib/desk/reports/job';
import { reportPath } from '@/lib/desk/reports/path';
import { readReportInputs, runReport, writeNotBefore } from '@/lib/desk/reports/pipeline';
import { DEFAULT_REPORT_RANGES } from '@/lib/desk/reports/ranges';
import type { ResearchDossier } from '@/lib/research/types';

/*
 * The 8:30 pm EVENING report (his ruling "b"; Integration's rulings 2026-10-07):
 * it reads the 20:05 AFTER_HOURS_CLOSE checkpoint, is written no earlier than
 * 20:20 ET, serves by 20:30, and a line uses a research version NEWER BY ID
 * than its checkpoint's, read at the write moment, saying when (per-line
 * "research updated", print condition by id, never by generated_at alone).
 * Models are stubs: this tests the plumbing, not the prose.
 */

const DATE = '2026-09-29'; // EDT: 20:05 ET is 00:05Z the next day
const AH_CLOSE = '2026-09-30T00:05:00.000Z';
const COMPLETED = '2026-09-30T00:05:20.000Z';
const at = (etClock: string) => new Date(`2026-09-30T00:${etClock}.000Z`); // "MM:SS" past 20:00 ET
const RANGE = { min: 1, max: 20 };
const dirs: string[] = [];
const open: MarketDatabase[] = [];
afterEach(() => {
  while (open.length) {
    const db = open.pop()!;
    if (db.open) db.close();
  }
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

function dossier(ticker: string, summary: string): ResearchDossier {
  return {
    ticker,
    companyName: `${ticker} Corp`,
    cik: '0000000001',
    country: 'US',
    foreignIssuer: false,
    catalyst: {
      catalystStatus: 'FRESH_FOUND',
      catalystType: 'COMPANY_NEWS',
      catalystGrade: 'LEGITIMATE_POSITIVE',
      summary,
      eventTimestamp: '2026-09-29',
      freshness: 'FRESH',
      whyTradersMayCare: null,
      plausiblyExplainsMove: true,
      confidence: 'MEDIUM',
      evidenceSourceIds: [],
      unknowns: [],
    },
    structure: {
      sharesOutstanding: null, sharesOutstandingDate: null, displayedFloat: null, displayedFloatDate: null,
      displayedFloatSource: null, floatConfidence: 'UNKNOWN', structureClassification: 'CLEAN', supplyLedger: [],
      structuralWarnings: [], reverseSplitHistory: [], knownRegistrationStatus: null, summary: null,
      confidence: 'MEDIUM', evidenceSourceIds: [], unknowns: [],
    },
    cycle: {
      cycleClassification: 'GREEN_FRESH_FRONTSIDE', reasoning: null, currentCycleHigh: null,
      currentCycleHighConfidence: 'UNKNOWN', currentGivebackPct: null, historicalResistance: null,
      formerRunnerStatus: 'UNKNOWN', recentMajorRuns: [], cycleWarnings: [], confidence: 'LOW',
      evidenceSourceIds: [], unknowns: [],
    },
  } as unknown as ResearchDossier;
}

function save(db: MarketDatabase, ticker: string, generatedAt: string, summary: string) {
  return saveAnalysisVersion(db, {
    ticker, generatedAt, evidenceFingerprint: `fp-${generatedAt}`, model: 'test',
    dossier: dossier(ticker, summary), sourceIds: [], metadata: { coverageIncomplete: false },
  });
}

function ticker(t: string, rank: number, versionId: number | null, status: string): AssessmentTickerRecord {
  return {
    ticker: t, assessmentRank: rank, liveSessionRank: rank, price: 5, percentChange: 12.5, rvol: 3.2, rvolRank: rank,
    ahPercentChange: null, ahVolume: null, ahParticipation: null, ahRank: null, volume: 100_000, spreadPct: null,
    sessionHigh: 5.2, sessionLow: 4.4, referenceClose: 4.44, referenceBasis: 'PRIOR_SESSION', priceAt: COMPLETED,
    cycle: null, catalyst: null, structure: null, intelligenceStatus: status, intelligenceSource: versionId ? 'AUTO' : 'NONE',
    analysisVersionId: versionId, evidenceFingerprint: null, cycleFingerprint: null, levelSummary: null, haltState: 'TRADING',
    focus: false, warnings: [], changedFields: [], changeSummary: '',
  };
}

/**
 * A completed 20:05 checkpoint: AAA captured with `aaaVersion`, BBB captured with
 * none. `before` runs first, so a version it saves exists AT CAPTURE.
 */
function fixture(options: { aaaGeneratedAt?: string; type?: string; scheduledFor?: string } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-evening-'));
  dirs.push(dir);
  const db = openDatabase(path.join(dir, 'market.db'));
  open.push(db);
  const captured = save(db, 'AAA', options.aaaGeneratedAt ?? '2026-09-29T19:00:00.000Z', 'Contract award announced.');
  const scheduledFor = options.scheduledFor ?? AH_CLOSE;
  const id = claimAssessmentSlot(db, {
    tradingDate: DATE, targetTradingDate: null, assessmentType: options.type ?? 'AFTER_HOURS_CLOSE', scheduledFor,
    startedAt: scheduledFor, generatedLate: false, sessionPhase: 'POST_MARKET', board: 'DAILY_RVOL', rankingDefinition: 'Daily RVOL',
  })!;
  insertAssessmentTickers(db, id, [ticker('AAA', 1, captured.id, 'INTELLIGENCE_AVAILABLE'), ticker('BBB', 2, null, 'ANALYZING')]);
  insertAssessmentRanges(db, id, [
    { rangeKey: '1-20', rangeMin: 1, rangeMax: 20, countWindow: 'SESSION_TO_DATE', countsVersion: 1, eligible: 2800,
      traded: 2700, up: 1500, down: 1100, volumeBaseSeeded: 0, topN: 25, topTickers: ['AAA', 'BBB'], rankingDefinition: 'Daily RVOL' },
  ]);
  completeAssessment(db, id, {
    completedAt: new Date(Date.parse(scheduledFor) + 20_000).toISOString(), status: 'COMPLETE', tickerCount: 2, modelCalls: 0,
    runtimeMs: 1, marketFingerprint: null, researchFingerprint: null, notes: '', metadata: {},
  });
  return { db, captured, assessmentId: id };
}

describe('EVENING: when it may be written', () => {
  it('the write-not-before is 20:20 ET on the trading date; other kinds have none', () => {
    expect(writeNotBefore('EVENING', DATE)?.toISOString()).toBe('2026-09-30T00:20:00.000Z');
    expect(writeNotBefore('AFTER_HOURS', DATE)).toBeNull();
    expect(writeNotBefore('PREMARKET', DATE)).toBeNull();
  });

  it('the runner does not queue it before 20:20 ET, and does at 20:20', () => {
    const { db, assessmentId } = fixture();
    const range = DEFAULT_REPORT_RANGES[0]!;
    const evening = (now: Date) => pendingReports(db, [range], now).filter((slot) => slot.kind === 'EVENING');
    expect(evening(at('19:59'))).toEqual([]);
    expect(evening(at('20:00'))).toEqual([{ assessmentId, kind: 'EVENING', tradingDate: DATE, range }]);
  });
});

describe('EVENING: the per-line research update, by version id', () => {
  it('a version newer by id, saved after the checkpoint and before the write, is used and dated; a name captured with none takes its first', () => {
    const { db } = fixture();
    const newerA = save(db, 'AAA', '2026-09-30T00:12:00.000Z', 'Offering priced.');
    const firstB = save(db, 'BBB', '2026-09-30T00:15:00.000Z', 'Merger announced.');
    const read = readReportInputs(db, 'EVENING', DATE, RANGE, at('20:00'));
    if (!read.ok) throw new Error('expected inputs');
    expect(read.inputs.researchVersions.get('AAA')).toEqual({ id: newerA.id, updatedAt: '2026-09-30T00:12:00.000Z' });
    expect(read.inputs.researchVersions.get('BBB')).toEqual({ id: firstB.id, updatedAt: '2026-09-30T00:15:00.000Z' });
    // The line is WRITTEN from the newer research, not only labelled with it.
    expect(JSON.stringify(read.inputs.research.get('AAA'))).toContain('Offering priced.');
    expect(JSON.stringify(read.inputs.research.get('BBB'))).toContain('Merger announced.');
  });

  it('a version generated after the write moment is not read', () => {
    const { db, captured } = fixture();
    save(db, 'AAA', '2026-09-30T00:25:00.000Z', 'Offering priced.');
    const read = readReportInputs(db, 'EVENING', DATE, RANGE, at('20:00'));
    if (!read.ok) throw new Error('expected inputs');
    expect(read.inputs.researchVersions.get('AAA')).toEqual({ id: captured.id, updatedAt: null });
    expect(read.inputs.researchVersions.get('BBB')).toEqual({ id: null, updatedAt: null });
  });

  it('the captured version is never "updated", even when its generated_at is after the checkpoint (by id, not by time)', () => {
    const { db, captured } = fixture({ aaaGeneratedAt: '2026-09-30T00:05:10.000Z' });
    const read = readReportInputs(db, 'EVENING', DATE, RANGE, at('20:00'));
    if (!read.ok) throw new Error('expected inputs');
    expect(read.inputs.researchVersions.get('AAA')).toEqual({ id: captured.id, updatedAt: null });
  });

  it('without a write moment nothing is updated', () => {
    const { db, captured } = fixture();
    save(db, 'AAA', '2026-09-30T00:12:00.000Z', 'Offering priced.');
    const read = readReportInputs(db, 'EVENING', DATE, RANGE);
    if (!read.ok) throw new Error('expected inputs');
    expect(read.inputs.researchVersions.get('AAA')).toEqual({ id: captured.id, updatedAt: null });
  });

  it('readLatestAnalysesAsOf: the newest version per ticker at or before the moment', () => {
    const { db, captured } = fixture();
    const newer = save(db, 'AAA', '2026-09-30T00:12:00.000Z', 'Offering priced.');
    expect(readLatestAnalysesAsOf(db, ['AAA', 'BBB'], '2026-09-30T00:11:59.000Z').get('AAA')?.id).toBe(captured.id);
    expect(readLatestAnalysesAsOf(db, ['AAA', 'BBB'], '2026-09-30T00:12:00.000Z').get('AAA')?.id).toBe(newer.id);
    expect(readLatestAnalysesAsOf(db, ['AAA', 'BBB'], '2026-09-30T00:12:00.000Z').has('BBB')).toBe(false);
  });
});

const writer = {
  complete: async () =>
    JSON.stringify({
      narrative: null,
      lines: [
        { ticker: 'AAA', text: 'Our sources found an offering.' },
        { ticker: 'BBB', text: 'Our sources found a merger.' },
      ],
    }),
};
const checker = {
  complete: async (prompt: { system: string; user: string }) =>
    JSON.stringify({
      verdicts: [...new Set(prompt.user.match(/^(?:O|S\d+L\d+)\b/gm) ?? [])].map((id) => ({ id, supported: true, note: '' })),
    }),
};
const SLOT = { kind: 'EVENING' as const, rangeId: '1-20', tradingDate: DATE, range: RANGE };

describe('EVENING: the published report', () => {
  it('each line carries its research version id, and the update time only where a newer version was used', async () => {
    const { db, captured } = fixture();
    const firstB = save(db, 'BBB', '2026-09-30T00:15:00.000Z', 'Merger announced.');
    const run = await runReport(db, SLOT, { writer, checker }, () => at('20:30'));
    if (run.status !== 'PUBLISHED') throw new Error(`expected PUBLISHED, got ${JSON.stringify(run)}`);
    const lines = run.report.sections.flatMap((section) => section.lines).filter((line) => line.ticker !== null);
    const byTicker = new Map(lines.map((line) => [line.ticker, line]));
    expect(byTicker.get('AAA')).toMatchObject({ researchVersionId: captured.id, researchUpdatedAt: null });
    expect(byTicker.get('BBB')).toMatchObject({ researchVersionId: firstB.id, researchUpdatedAt: '2026-09-30T00:15:00.000Z' });
    expect(run.report.kind).toBe('EVENING');
    expect(run.report.checkpoints[0]!.type).toBe('AFTER_HOURS_CLOSE');
  });

  it('serves by 20:30 ET: published at 20:30 is on time, after it is late', async () => {
    const onTime = await runReport(fixture().db, SLOT, { writer, checker }, () => at('30:00'));
    const late = await runReport(fixture().db, SLOT, { writer, checker }, () => at('30:01'));
    if (onTime.status !== 'PUBLISHED' || late.status !== 'PUBLISHED') throw new Error('expected PUBLISHED');
    expect(onTime.report.late).toBe(false);
    expect(late.report.late).toBe(true);
  });
});

describe('EVENING carries the evening recap content', () => {
  it('its narrative takes the recap branch (no intraday leader); the intraday control takes the other', () => {
    const evening = readReportInputs(fixture().db, 'EVENING', DATE, RANGE, at('20:00'));
    const intraday = readReportInputs(
      fixture({ type: 'RTH_INTERVAL', scheduledFor: '2026-09-29T18:30:00.000Z' }).db,
      'INTO_POWER_HOUR',
      DATE,
      RANGE,
    );
    if (!evening.ok || !intraday.ok) throw new Error('expected inputs');
    expect(evening.inputs.narrative.leader).toBeNull();
    expect(evening.inputs.narrative.intradayNamed).toBeNull();
    expect(intraday.inputs.narrative.leader).toMatchObject({ ticker: 'AAA' });
  });

  it('its price path is the after-hours arc from today’s close', () => {
    const row = { price: 5, priceAt: '2026-09-29T23:59:00.000Z', sessionHigh: 9, referenceClose: 3, referenceBasis: 'PRIOR_SESSION' };
    expect(reportPath('EVENING', row, { referenceClose: 4, high: 6 })).toEqual({ from: 4, high: 6, now: 5, fromBasis: 'TODAY_CLOSE' });
    expect(reportPath('AFTER_HOURS', row, { referenceClose: 4, high: 6 })).toEqual({ from: 3, high: 9, now: 5, fromBasis: 'PRIOR_CLOSE' });
  });
});

describe('the fields stay off the kinds that do not carry them', () => {
  it('an intraday report has neither field on its lines', async () => {
    const { db } = fixture({ type: 'RTH_INTERVAL', scheduledFor: '2026-09-29T18:30:00.000Z' });
    const run = await runReport(
      db,
      { ...SLOT, kind: 'INTO_POWER_HOUR' },
      { writer, checker },
      () => new Date('2026-09-29T18:40:00.000Z'),
    );
    if (run.status !== 'PUBLISHED') throw new Error(`expected PUBLISHED, got ${JSON.stringify(run)}`);
    for (const line of run.report.sections.flatMap((section) => section.lines)) {
      expect(line).not.toHaveProperty('researchVersionId');
      expect(line).not.toHaveProperty('researchUpdatedAt');
    }
  });
});
