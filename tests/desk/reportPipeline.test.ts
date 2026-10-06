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
import { saveAnalysisVersion } from '@/lib/market/store/researchRepo';
import { readReportInputs, runReport } from '@/lib/desk/reports/pipeline';
import type { ResearchDossier } from '@/lib/research/types';

/*
 * The report pipeline end to end on a fixture store (it had NO test before v6):
 * the v6 wiring puts the computed tags on each line, regroups the surviving
 * lines under COMPUTED headings, and hands the narrative facts to the run.
 * Models are stubs, so this tests the plumbing, not the prose.
 */

const DATE = '2026-09-23';
const SCHEDULED = '2026-09-23T18:30:00.000Z'; // 14:30 ET, INTO_POWER_HOUR's checkpoint
const COMPLETED = '2026-09-23T18:30:20.000Z';
const dirs: string[] = [];
const open: MarketDatabase[] = [];
afterEach(() => {
  while (open.length) {
    const db = open.pop()!;
    if (db.open) db.close();
  }
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

function dossier(status: 'FRESH_FOUND' | 'NONE_FOUND', catalyst: Partial<ResearchDossier['catalyst']> = {}): ResearchDossier {
  return {
    ticker: 'AAA',
    companyName: 'Alpha Corp',
    cik: '0000000001',
    country: 'US',
    foreignIssuer: false,
    catalyst: {
      catalystStatus: status,
      catalystType: 'COMPANY_NEWS',
      catalystGrade: 'LEGITIMATE_POSITIVE',
      summary: 'Contract award announced.',
      eventTimestamp: '2026-09-23',
      freshness: 'FRESH',
      whyTradersMayCare: null,
      plausiblyExplainsMove: true,
      confidence: 'MEDIUM',
      evidenceSourceIds: [],
      unknowns: [],
      ...catalyst,
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

function fixture(catalyst: Partial<ResearchDossier['catalyst']> = {}): MarketDatabase {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-pipeline-'));
  dirs.push(dir);
  const db = openDatabase(path.join(dir, 'market.db'));
  open.push(db);
  const version = saveAnalysisVersion(db, {
    ticker: 'AAA', generatedAt: '2026-09-23T15:00:00Z', evidenceFingerprint: 'fp', model: 'test',
    dossier: dossier('FRESH_FOUND', catalyst), sourceIds: [], metadata: { coverageIncomplete: false },
  });
  const id = claimAssessmentSlot(db, {
    tradingDate: DATE, targetTradingDate: null, assessmentType: 'RTH_INTERVAL', scheduledFor: SCHEDULED,
    startedAt: SCHEDULED, generatedLate: false, sessionPhase: 'RTH', board: 'DAILY_RVOL', rankingDefinition: 'Daily RVOL',
  })!;
  insertAssessmentTickers(db, id, [ticker('AAA', 1, version.id, 'INTELLIGENCE_AVAILABLE'), ticker('BBB', 2, null, 'NOT_ANALYZED')]);
  insertAssessmentRanges(db, id, [
    { rangeKey: '1-20', rangeMin: 1, rangeMax: 20, countWindow: 'SESSION_TO_DATE', countsVersion: 1, eligible: 2800,
      traded: 2700, up: 1500, down: 1100, volumeBaseSeeded: 0, topN: 25, topTickers: ['AAA', 'BBB'], rankingDefinition: 'Daily RVOL' },
  ]);
  completeAssessment(db, id, {
    completedAt: COMPLETED, status: 'COMPLETE', tickerCount: 2, modelCalls: 0, runtimeMs: 1,
    marketFingerprint: null, researchFingerprint: null, notes: '', metadata: {},
  });
  return db;
}

// Worded from the fixture's computed facts: 2,700 traded so far today, AAA leads at +12.5% (the v2 sheet's whole percent: 13), 1 of 2 covered fresh.
const NARRATIVE = 'Across $1 to $20, 2,700 traded so far today, 1,500 up and 1,100 down. AAA tops the board, up 13 percent from the prior close. One of the 2 names the desk covers had fresh news in our sources.';
const prompts: Array<{ role: 'writer' | 'checker'; system: string; user: string }> = [];
function writerWith(narrative: string | null, aaa = 'Our sources found a contract award.') {
  return {
    complete: async (prompt: { system: string; user: string }) => {
      prompts.push({ role: 'writer', ...prompt });
      return JSON.stringify({
        narrative,
        lines: [
          { ticker: 'BBB', text: 'Not researched yet.' },
          { ticker: 'AAA', text: aaa },
        ],
      });
    },
  };
}
const writer = writerWith(null);
// Supports every line it is shown (the narrative is id O), so any strike below is a RULE's.
const checker = {
  complete: async (prompt: { system: string; user: string }) => {
    prompts.push({ role: 'checker', ...prompt });
    return JSON.stringify({
      verdicts: [...new Set(prompt.user.match(/^(?:O|S\d+L\d+)\b/gm) ?? [])].map((id) => ({ id, supported: true, note: '' })),
    });
  },
};
const SLOT = { kind: 'INTO_POWER_HOUR' as const, rangeId: '1-20', tradingDate: DATE, range: { min: 1, max: 20 } };
afterEach(() => {
  prompts.length = 0;
});

describe('the report pipeline, v6 wiring', () => {
  it('reads the inputs with the computed tags per name and the narrative facts', () => {
    const db = fixture();
    const read = readReportInputs(db, 'INTO_POWER_HOUR', DATE, { min: 1, max: 20 });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.inputs.tags.get('AAA')?.why.code).not.toBe('NOT_RESEARCHED');
    expect(read.inputs.tags.get('BBB')?.why.code).toBe('NOT_RESEARCHED');
    expect(read.inputs.narrative.breadth).toEqual({ window: 'SESSION_TO_DATE', eligible: 2800, traded: 2700, up: 1500, down: 1100 });
    expect(read.inputs.narrative.leader?.ticker).toBe('AAA');
    expect(read.inputs.narrative.fresh).toEqual({ count: 1, covered: 2 });
  });

  it('publishes lines under COMPUTED headings (fresh first), each carrying its tags', async () => {
    const db = fixture();
    const run = await runReport(db, { kind: 'INTO_POWER_HOUR', rangeId: '1-20', tradingDate: DATE, range: { min: 1, max: 20 } }, { writer, checker }, () => new Date(COMPLETED));
    expect(run.status).toBe('PUBLISHED');
    if (run.status !== 'PUBLISHED') return;
    expect(run.report.sections.map((s) => [s.heading, s.lines.map((l) => l.ticker)])).toEqual([
      ['FRESH NEWS', ['AAA']],
      ['NOT YET RESEARCHED', ['BBB']],
    ]);
    const lines = run.report.sections.flatMap((s) => s.lines);
    expect(lines.find((l) => l.ticker === 'BBB')?.tags?.risk.code).toBe('NOT_RESEARCHED');
    expect(lines.find((l) => l.ticker === 'AAA')?.tags?.why.explainsMove).toBe(true);
  });

  it('runs writer v6 and checker v6 on the narrative facts, and publishes the narrative in place of overall', async () => {
    const db = fixture();
    const run = await runReport(db, SLOT, { writer: writerWith(NARRATIVE), checker }, () => new Date(COMPLETED));
    expect(run.status).toBe('PUBLISHED');
    if (run.status !== 'PUBLISHED') return;
    expect(prompts.find((p) => p.role === 'writer')?.user).toContain('NARRATIVE FACTS (word these and nothing else):');
    expect(prompts.find((p) => p.role === 'checker')?.system).toContain('v6: THE NARRATIVE (id O)');
    expect(run.diagnostics.strikes).toEqual([]);
    expect(run.report.narrative).toBe(NARRATIVE);
    expect('overall' in run.report).toBe(false);
  });

  it('a narrative number that is no computed fact is struck by rule; the names still publish', async () => {
    const db = fixture();
    const run = await runReport(db, SLOT, { writer: writerWith(NARRATIVE.replace('2,700', '2,710')), checker }, () => new Date(COMPLETED));
    expect(run.status).toBe('PUBLISHED');
    if (run.status !== 'PUBLISHED') return;
    expect(run.diagnostics.strikes.map((s) => [s.id, s.reason])).toEqual([['O', 'NUMBER_WITHOUT_ROW']]);
    expect(run.report.narrative).toBeNull();
    expect(run.report.sections.flatMap((s) => s.lines.map((l) => l.ticker))).toEqual(['AAA', 'BBB']);
  });

  it('a citation token in a name line is struck end to end', async () => {
    const db = fixture();
    const run = await runReport(db, SLOT, { writer: writerWith(NARRATIVE, 'Our sources found a contract award [Source 7].'), checker }, () => new Date(COMPLETED));
    expect(run.status).toBe('PUBLISHED');
    if (run.status !== 'PUBLISHED') return;
    expect(run.diagnostics.strikes.map((s) => s.reason)).toContain('CITATION_TOKEN');
    expect(JSON.stringify(run.report)).not.toContain('[Source 7]');
  });

  it('a FRESH_FOUND catalyst the board calls OLD at the checkpoint is filed under OLDER NEWS and not counted fresh (Design, COLA)', async () => {
    // Researched as fresh, but the event is weeks before the checkpoint and the research does not say it explains the move.
    const db = fixture({ eventTimestamp: '2026-08-20', freshness: 'STALE', plausiblyExplainsMove: false });
    const read = readReportInputs(db, 'INTO_POWER_HOUR', DATE, { min: 1, max: 20 });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.inputs.tags.get('AAA')?.why.code).toBe('OLD_CATALYST');
    expect(read.inputs.research.get('AAA')?.catalyst.status).toBe('SECONDARY_STALE');
    expect(read.inputs.narrative.fresh).toEqual({ count: 0, covered: 2 });
    const run = await runReport(db, SLOT, { writer, checker }, () => new Date(COMPLETED));
    expect(run.status).toBe('PUBLISHED');
    if (run.status !== 'PUBLISHED') return;
    expect(run.report.sections.map((s) => [s.heading, s.lines.map((l) => l.ticker)])).toEqual([
      ['OLDER NEWS', ['AAA']],
      ['NOT YET RESEARCHED', ['BBB']],
    ]);
  });
});
