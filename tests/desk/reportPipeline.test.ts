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

// Worded from the fixture's computed facts: AAA leads at +12.5% (the v2 sheet's whole percent: 13), 1 of 2 covered fresh. Breadth and the range are not on the sheet, so a stated one is struck (seam read, Integration 28th).
const NARRATIVE = 'AAA tops the board, up 13 percent from the prior close. One of the 2 names the desk covers had fresh news in our sources.';
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
      ['FRESH NEWS FOUND', ['AAA']],
      ['NOT RESEARCHED AT THIS CHECKPOINT', ['BBB']],
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
    // Step 4: the intraday kinds carry no footnotes (G and the split count are the recap's).
    expect(run.report.narrativeFootnotes).toBeNull();
  });

  it('a narrative number that is no computed fact is struck by rule; the names still publish', async () => {
    const db = fixture();
    const run = await runReport(db, SLOT, { writer: writerWith(NARRATIVE.replace('up 13 percent', 'up 14 percent')), checker }, () => new Date(COMPLETED));
    expect(run.status).toBe('PUBLISHED');
    if (run.status !== 'PUBLISHED') return;
    expect(run.diagnostics.strikes.map((s) => [s.id, s.reason])).toEqual([['O', 'NUMBER_WITHOUT_ROW']]);
    expect(run.report.narrative).toBeNull();
    expect(run.report.sections.flatMap((s) => s.lines.map((l) => l.ticker))).toEqual(['AAA', 'BBB']);
  });

  it('diagnostics keep each struck line\'s words, which the published report drops (his question 2026-10-12)', async () => {
    const db = fixture();
    const struck = NARRATIVE.replace('up 13 percent', 'up 14 percent');
    const line = 'Our sources found a contract award [Source 7].';
    const run = await runReport(db, SLOT, { writer: writerWith(struck, line), checker }, () => new Date(COMPLETED));
    expect(run.status).toBe('PUBLISHED');
    if (run.status !== 'PUBLISHED') return;
    expect(run.report.narrative).toBeNull();
    expect(run.diagnostics.strikes.find((s) => s.id === 'O')?.text).toBe(struck);
    expect(run.diagnostics.strikes.find((s) => s.reason === 'CITATION_TOKEN')?.text).toBe(line);
  });

  describe('the Claude checker and its OpenAI fallback (his "move it", uuid e51e9b47)', () => {
    const names = { primary: 'claude-opus-5-5', fallback: 'gpt-terra' };
    const counted = () => {
      let calls = 0;
      return {
        complete: async (prompt: { system: string; user: string }) => {
          calls += 1;
          return checker.complete(prompt);
        },
        get calls() {
          return calls;
        },
      };
    };
    const failing = (error: Error) => ({
      complete: async () => {
        throw error;
      },
    });

    it('Claude checks: the record says so, and the fallback is never called', async () => {
      const fallback = counted();
      const run = await runReport(fixture(), SLOT, { writer: writerWith(NARRATIVE), checker, checkerFallback: fallback, checkerNames: names }, () => new Date(COMPLETED));
      expect(run.status).toBe('PUBLISHED');
      expect(run.diagnostics?.checker).toEqual({ ran: 'claude-opus-5-5' });
      expect(fallback.calls).toBe(0);
    });

    it('a failed Claude CALL (no credits, rate limit, timeout, refusal) is checked on OpenAI, never silently: the failure is kept', async () => {
      const fallback = counted();
      const run = await runReport(
        fixture(),
        SLOT,
        { writer: writerWith(NARRATIVE), checker: failing(new Error('claude: HTTP 400 billing_error')), checkerFallback: fallback, checkerNames: names },
        () => new Date(COMPLETED),
      );
      expect(run.status).toBe('PUBLISHED');
      expect(fallback.calls).toBe(1);
      expect(run.diagnostics?.checker).toEqual({ ran: 'gpt-terra', fallbackFrom: { model: 'claude-opus-5-5', failure: 'call: claude: HTTP 400 billing_error', reply: null } });
    });

    it('a Claude REPLY that is not a verdict for every line falls back too, and the reply is kept', async () => {
      const fallback = counted();
      const run = await runReport(
        fixture(),
        SLOT,
        { writer: writerWith(NARRATIVE), checker: { complete: async () => 'I cannot check this.' }, checkerFallback: fallback, checkerNames: names },
        () => new Date(COMPLETED),
      );
      expect(run.status).toBe('PUBLISHED');
      expect(fallback.calls).toBe(1);
      expect(run.diagnostics?.checker).toEqual({ ran: 'gpt-terra', fallbackFrom: { model: 'claude-opus-5-5', failure: 'reply: not a verdict for every line', reply: 'I cannot check this.' } });
    });

    it('BOTH failing is CHECKER_FAILED (closed), with both recorded; nothing publishes', async () => {
      const run = await runReport(
        fixture(),
        SLOT,
        { writer: writerWith(NARRATIVE), checker: failing(new Error('claude: HTTP 529')), checkerFallback: failing(new Error('openai down')), checkerNames: names },
        () => new Date(COMPLETED),
      );
      expect(run.status).toBe('MISSED');
      expect(run.status === 'MISSED' && run.cause.kind).toBe('CHECKER_FAILED');
      expect(run.diagnostics?.checker).toEqual({ ran: 'gpt-terra', fallbackFrom: { model: 'claude-opus-5-5', failure: 'call: claude: HTTP 529', reply: null } });
    });

    it('with no fallback (no Reports key) a failed check is CHECKER_FAILED as before, and no checker record is invented', async () => {
      const run = await runReport(fixture(), SLOT, { writer: writerWith(NARRATIVE), checker: failing(new Error('x')) }, () => new Date(COMPLETED));
      expect(run.status).toBe('MISSED');
      expect(run.diagnostics).toEqual({ lines: 0, strikes: [], writerMs: expect.any(Number), checkerMs: expect.any(Number) });
    });
  });

  it('a citation token in a name line is struck end to end', async () => {
    const db = fixture();
    const run = await runReport(db, SLOT, { writer: writerWith(NARRATIVE, 'Our sources found a contract award [Source 7].'), checker }, () => new Date(COMPLETED));
    expect(run.status).toBe('PUBLISHED');
    if (run.status !== 'PUBLISHED') return;
    expect(run.diagnostics.strikes.map((s) => s.reason)).toContain('CITATION_TOKEN');
    expect(JSON.stringify(run.report)).not.toContain('[Source 7]');
  });

  it('a recap (PREMARKET) run carries the computed footnote counts, equal to the facts (Integration 30th: pins the wiring)', async () => {
    const db = fixture();
    // The evening recap of DATE, targeting the next session; the same two names.
    const recapAt = '2026-09-24T02:00:20.000Z'; // 22:00 ET on DATE
    const id = claimAssessmentSlot(db, {
      tradingDate: DATE, targetTradingDate: '2026-09-24', assessmentType: 'NEXT_DAY_RECAP', scheduledFor: '2026-09-24T02:00:00.000Z',
      startedAt: '2026-09-24T02:00:00.000Z', generatedLate: false, sessionPhase: 'NEXT_DAY_PREP', board: 'DAILY_RVOL', rankingDefinition: 'Daily RVOL',
    })!;
    insertAssessmentTickers(db, id, [ticker('AAA', 1, null, 'NOT_ANALYZED'), ticker('BBB', 2, null, 'NOT_ANALYZED')]);
    completeAssessment(db, id, {
      completedAt: recapAt, status: 'COMPLETE', tickerCount: 2, modelCalls: 0, runtimeMs: 1,
      marketFingerprint: null, researchFingerprint: null, notes: '', metadata: {},
    });
    // NOCL traded with no official close (noClose 1); REV is a 1-for-5 basis jump (splitExcluded 1); UPX counts.
    // The close is the OFFICIAL one (reference_rth_close, CURRENT_SESSION, this date); here it equals the bell capture.
    const ts = db.prepare(
      `INSERT INTO ticker_session (symbol, trading_date, feed, updated_at, price, previous_close, cumulative_volume, rth_final_close, rth_final_high, rth_final_low, rth_final_volume,
                                   reference_rth_close, reference_rth_close_date, reference_rth_close_basis)
       VALUES (?, ?, 'sip', '2026-09-23T20:00:00Z', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    ts.run('NOCL', DATE, 5, 4, 1000, null, null, null, null, null, null, null);
    ts.run('REV', DATE, 2.5, 0.5, 900, 2.5, 2.7, 2.4, 900, 2.5, DATE, 'CURRENT_SESSION');
    ts.run('UPX', DATE, 4.4, 4, 900, 4.4, 4.5, 4, 900, 4.4, DATE, 'CURRENT_SESSION');

    const read = readReportInputs(db, 'PREMARKET', DATE, { min: 1, max: 20 });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect([read.inputs.narrative.noClose, read.inputs.narrative.splitExcluded]).toEqual([1, 1]);
    const run = await runReport(db, { kind: 'PREMARKET', rangeId: '1-20', tradingDate: DATE, range: { min: 1, max: 20 } }, { writer, checker }, () => new Date(recapAt));
    expect(run.status).toBe('PUBLISHED');
    if (run.status !== 'PUBLISHED') return;
    expect(run.report.narrativeFootnotes).toEqual({ noClose: 1, splitExcluded: 1 });
  });

  it('a FRESH_FOUND catalyst the board calls OLD at the checkpoint is filed under OLDER OR SECONDARY NEWS and not counted fresh (Design, COLA)', async () => {
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
      ['OLDER OR SECONDARY NEWS', ['AAA']],
      ['NOT RESEARCHED AT THIS CHECKPOINT', ['BBB']],
    ]);
  });

  it('a FRESH_FOUND catalyst the board bands STALE is demoted even when the research says it explains the move (Integration, JONE)', async () => {
    // JONE on the 10-05 recap: a 34-day-old event, explainsMove true, so the card is GRADED (not OLD) but its freshness is STALE.
    const db = fixture({ eventTimestamp: '2026-08-20', freshness: 'STALE', plausiblyExplainsMove: true });
    const read = readReportInputs(db, 'INTO_POWER_HOUR', DATE, { min: 1, max: 20 });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.inputs.tags.get('AAA')?.why.code).toBe('GRADED');
    expect(read.inputs.tags.get('AAA')?.why.freshness).toBe('STALE');
    expect(read.inputs.research.get('AAA')?.catalyst.status).toBe('SECONDARY_STALE');
    expect(read.inputs.narrative.fresh).toEqual({ count: 0, covered: 2 });
    const run = await runReport(db, SLOT, { writer, checker }, () => new Date(COMPLETED));
    expect(run.status).toBe('PUBLISHED');
    if (run.status !== 'PUBLISHED') return;
    expect(run.report.sections.map((s) => [s.heading, s.lines.map((l) => l.ticker)])).toEqual([
      ['OLDER OR SECONDARY NEWS', ['AAA']],
      ['NOT RESEARCHED AT THIS CHECKPOINT', ['BBB']],
    ]);
  });

  it.each([
    ['RECENT (yesterday)', '2026-09-22', 'RECENT'],
    ['FRESH (today)', '2026-09-23', 'FRESH'],
  ])('a FRESH_FOUND catalyst the board bands %s stays fresh (Integration, JONE ruling)', (_label, eventTimestamp, band) => {
    const db = fixture({ eventTimestamp, plausiblyExplainsMove: true });
    const read = readReportInputs(db, 'INTO_POWER_HOUR', DATE, { min: 1, max: 20 });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.inputs.tags.get('AAA')?.why.freshness).toBe(band);
    expect(read.inputs.research.get('AAA')?.catalyst.status).toBe('FRESH_FOUND');
    expect(read.inputs.narrative.fresh).toEqual({ count: 1, covered: 2 });
  });
});
