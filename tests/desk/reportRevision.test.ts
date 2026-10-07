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
  readAssessment,
  type AssessmentTickerRecord,
} from '@/lib/market/store/assessmentRepo';
import { saveAnalysisVersion } from '@/lib/market/store/researchRepo';
import type { ReportLine, SessionReport } from '@/lib/desk/reports/contract';
import { storeSessionReport } from '@/lib/desk/reports/job';
import { runReport } from '@/lib/desk/reports/pipeline';
import type { ResearchDossier } from '@/lib/research/types';

/*
 * The evening report's 10 pm edition, R2 (Integration's ruling on
 * evening-revision-proposal-2026-10-07.md, inside his "same report, just edited
 * with new information"): the 22:00 PREMARKET run carries every UNCHANGED name's
 * 8:30 line verbatim (condition 1: byte-identical), decides "unchanged" by
 * research version id (condition 2), treats any other input change as changed
 * (condition 3), and writes and checks only the changed names. Models are stubs
 * that echo which edition wrote a line.
 */

const DATE = '2026-09-29'; // EDT
const AH_CLOSE = '2026-09-30T00:05:00.000Z'; // 20:05 ET
const RECAP = '2026-09-30T02:00:00.000Z'; // 22:00 ET
const EVENING_AT = new Date('2026-09-30T00:21:00.000Z');
const TEN_PM_AT = new Date('2026-09-30T02:01:00.000Z');
const RANGE = { id: '1-20', label: '$1-$20', min: 1, max: 20 };
const VERSIONS = { writerPrompt: 10, checkerPrompt: 7, writerModel: 'w', checkerModel: 'c' };
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
      catalystStatus: 'FRESH_FOUND', catalystType: 'COMPANY_NEWS', catalystGrade: 'LEGITIMATE_POSITIVE', summary,
      eventTimestamp: '2026-09-29', freshness: 'FRESH', whyTradersMayCare: null, plausiblyExplainsMove: true,
      confidence: 'MEDIUM', evidenceSourceIds: [], unknowns: [],
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

function ticker(t: string, rank: number, versionId: number | null, at: string, extra: Partial<AssessmentTickerRecord> = {}): AssessmentTickerRecord {
  return {
    ticker: t, assessmentRank: rank, liveSessionRank: rank, price: 5, percentChange: 12.5, rvol: 3.2, rvolRank: rank,
    ahPercentChange: null, ahVolume: null, ahParticipation: null, ahRank: null, volume: 100_000, spreadPct: null,
    sessionHigh: 5.2, sessionLow: 4.4, referenceClose: 4.44, referenceBasis: 'PRIOR_SESSION', priceAt: at,
    cycle: null, catalyst: null, structure: null, intelligenceStatus: versionId ? 'INTELLIGENCE_AVAILABLE' : 'ANALYZING',
    intelligenceSource: versionId ? 'AUTO' : 'NONE', analysisVersionId: versionId, evidenceFingerprint: null,
    cycleFingerprint: null, levelSummary: null, haltState: 'TRADING', focus: false, warnings: [], changedFields: [],
    changeSummary: '', ...extra,
  };
}

function checkpoint(db: MarketDatabase, type: string, scheduledFor: string, target: string | null, rows: AssessmentTickerRecord[]): number {
  const id = claimAssessmentSlot(db, {
    tradingDate: DATE, targetTradingDate: target, assessmentType: type, scheduledFor, startedAt: scheduledFor,
    generatedLate: false, sessionPhase: 'POST_MARKET', board: 'DAILY_RVOL', rankingDefinition: 'Daily RVOL',
  })!;
  insertAssessmentTickers(db, id, rows);
  insertAssessmentRanges(db, id, [
    { rangeKey: '1-20', rangeMin: 1, rangeMax: 20, countWindow: 'SESSION_TO_DATE', countsVersion: 1, eligible: 2800,
      traded: 2700, up: 1500, down: 1100, volumeBaseSeeded: 0, topN: 25, topTickers: rows.map((r) => r.ticker), rankingDefinition: 'Daily RVOL' },
  ]);
  completeAssessment(db, id, {
    completedAt: new Date(Date.parse(scheduledFor) + 20_000).toISOString(), status: 'COMPLETE', tickerCount: rows.length,
    modelCalls: 0, runtimeMs: 1, marketFingerprint: null, researchFingerprint: null, notes: '', metadata: {},
  });
  return id;
}

const writerPrompts: string[] = [];
afterEach(() => {
  writerPrompts.length = 0;
});

/** Writes one line per name its sheet shows, saying which edition wrote it. */
function writer(edition: string, narrative: string | null = null) {
  return {
    complete: async (prompt: { system: string; user: string }) => {
      writerPrompts.push(prompt.user);
      const names = [...prompt.user.matchAll(/^([A-Z]+): ranked #/gm)].map((m) => m[1]!);
      return JSON.stringify({ narrative, lines: names.map((name) => ({ ticker: name, text: `Our sources found news for ${name} (${edition}).` })) });
    },
  };
}

/** Supports every line it is shown, except the ids in `strike`. */
function checker(strike: string[] = []) {
  return {
    complete: async (prompt: { system: string; user: string }) =>
      JSON.stringify({
        verdicts: [...new Set(prompt.user.match(/^(?:O|S\d+L\d+)\b/gm) ?? [])].map((id) => ({ id, supported: !strike.includes(id), note: '' })),
      }),
  };
}

const refuse = { complete: async () => Promise.reject(new Error('a model was called')) };

function lines(report: SessionReport): Map<string, ReportLine> {
  return new Map(report.sections.flatMap((s) => s.lines).filter((l) => l.ticker !== null).map((l) => [l.ticker!, l]));
}

/** The 8:30 edition written and stored; returns it. */
async function evening(db: MarketDatabase, rows: AssessmentTickerRecord[], strike: string[] = [], narrative: string | null = null) {
  const id = checkpoint(db, 'AFTER_HOURS_CLOSE', AH_CLOSE, null, rows);
  const run = await runReport(
    db,
    { kind: 'EVENING', rangeId: RANGE.id, tradingDate: DATE, range: RANGE },
    { writer: writer('first', narrative), checker: checker(strike) },
    () => EVENING_AT,
  );
  if (run.status !== 'PUBLISHED') throw new Error(`8:30 edition not published: ${JSON.stringify(run)}`);
  expect(
    storeSessionReport(db, { kind: 'EVENING', range: RANGE, assessment: readAssessment(db, id)!, run, versions: VERSIONS, usage: [], createdAt: EVENING_AT.toISOString() }),
  ).toBe(true);
  return run.report;
}

async function tenPm(db: MarketDatabase, rows: AssessmentTickerRecord[], models = { writer: writer('second'), checker: checker() }) {
  checkpoint(db, 'NEXT_DAY_RECAP', RECAP, '2026-09-30', rows);
  const run = await runReport(db, { kind: 'PREMARKET', rangeId: RANGE.id, tradingDate: DATE, range: RANGE }, models, () => TEN_PM_AT);
  if (run.status !== 'PUBLISHED') throw new Error(`10 pm edition not published: ${JSON.stringify(run)}`);
  return run.report;
}

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mointel-revision-'));
  dirs.push(dir);
  const db = openDatabase(path.join(dir, 'market.db'));
  open.push(db);
  const v1 = save(db, 'AAA', '2026-09-29T19:00:00.000Z', 'Contract award announced.');
  return { db, v1 };
}

describe('the 10 pm edition carries unchanged names and rewrites changed ones', () => {
  it('an unchanged name keeps its 8:30 line byte for byte; a name with a new research version is re-written, and only it is sent', async () => {
    const { db, v1 } = fixture();
    const first = await evening(db, [ticker('AAA', 1, v1.id, AH_CLOSE), ticker('BBB', 2, null, AH_CLOSE)]);
    const v2 = save(db, 'BBB', '2026-09-30T01:00:00.000Z', 'Merger announced.');
    const second = await tenPm(db, [ticker('AAA', 1, v1.id, AH_CLOSE), ticker('BBB', 2, v2.id, AH_CLOSE)]);

    const before = lines(first);
    const after = lines(second);
    expect(after.get('AAA')!.text).toBe(before.get('AAA')!.text);
    expect(Buffer.from(after.get('AAA')!.text).equals(Buffer.from(before.get('AAA')!.text))).toBe(true);
    expect(after.get('BBB')!.text).toBe('Our sources found news for BBB (second).');
    expect(second.revisionOf).toMatchObject({ publishedAt: first.publishedAt, changedTickers: ['BBB'] });

    const sent = writerPrompts.at(-1)!;
    expect(sent).toContain('BBB: ranked #2');
    expect(sent).not.toContain('AAA: ranked #1');
    expect(sent).toContain('only the names whose facts changed since the 8:30 pm edition');
    // The 10 pm edition prints no "written again after this checkpoint" note: its checkpoint captured these versions.
    for (const line of after.values()) expect(line).not.toHaveProperty('researchUpdatedAt');
    expect(after.get('BBB')!.researchVersionId).toBe(v2.id);
  });

  it('when nothing changed, no model is called and the 8:30 content is the 10 pm edition', async () => {
    const { db, v1 } = fixture();
    const first = await evening(db, [ticker('AAA', 1, v1.id, AH_CLOSE), ticker('BBB', 2, null, AH_CLOSE)]);
    const second = await tenPm(db, [ticker('AAA', 1, v1.id, AH_CLOSE), ticker('BBB', 2, null, AH_CLOSE)], { writer: refuse, checker: refuse });
    expect([...lines(second).values()].map((l) => l.text)).toEqual([...lines(first).values()].map((l) => l.text));
    expect(second.narrative).toBe(first.narrative ?? null);
    expect(second.revisionOf).toEqual({ publishedAt: first.publishedAt, changedTickers: [], narrativeChanged: false });
    expect(second.watchCount).toBe(2);
  });

  it('a struck 8:30 line stays struck when its name is unchanged', async () => {
    const { db, v1 } = fixture();
    const first = await evening(db, [ticker('AAA', 1, v1.id, AH_CLOSE), ticker('BBB', 2, null, AH_CLOSE)], ['S1L1']);
    expect(lines(first).get('AAA')!.text).toBe('');
    const second = await tenPm(db, [ticker('AAA', 1, v1.id, AH_CLOSE), ticker('BBB', 2, null, AH_CLOSE)], { writer: refuse, checker: refuse });
    expect(lines(second).get('AAA')!.text).toBe('');
  });
});

describe('what counts as changed (condition 3): anything the writer is shown', () => {
  it('a note the writer is shown at 22:00 makes a name changed with the same version; the unchanged narrative keeps its 8:30 words', async () => {
    const { db, v1 } = fixture();
    const first = await evening(db, [ticker('AAA', 1, v1.id, AH_CLOSE), ticker('BBB', 2, null, AH_CLOSE)], [], 'Our sources had little new this evening.');
    expect(first.narrative).toBe('Our sources had little new this evening.');
    const second = await tenPm(
      db,
      [ticker('AAA', 1, v1.id, AH_CLOSE, { changeSummary: 'AAA: +3.5% since prior assessment.' }), ticker('BBB', 2, null, AH_CLOSE)],
      { writer: writer('second', 'A narrative the second writer offered.'), checker: checker() },
    );
    expect(second.revisionOf).toMatchObject({ changedTickers: ['AAA'], narrativeChanged: false });
    expect(lines(second).get('AAA')!.text).toBe('Our sources found news for AAA (second).');
    expect(lines(second).get('BBB')!.text).toBe(lines(first).get('BBB')!.text);
    expect(second.narrative).toBe(first.narrative ?? null);
  });

  it('a different price with the same version makes a name changed (its sheet differs)', async () => {
    const { db, v1 } = fixture();
    await evening(db, [ticker('AAA', 1, v1.id, AH_CLOSE), ticker('BBB', 2, null, AH_CLOSE)]);
    const second = await tenPm(db, [ticker('AAA', 1, v1.id, AH_CLOSE, { price: 6 }), ticker('BBB', 2, null, AH_CLOSE)]);
    expect(second.revisionOf?.changedTickers).toEqual(['AAA']);
  });

  it('a changed narrative alone is re-written, with no name sent', async () => {
    const { db, v1 } = fixture();
    await evening(db, [ticker('AAA', 1, v1.id, AH_CLOSE), ticker('BBB', 2, null, AH_CLOSE)]);
    // The stored 8:30 narrative key no longer matches, as when the recap counts moved.
    const row = db.prepare("SELECT payload FROM session_reports WHERE kind = 'EVENING'").get() as { payload: string };
    db.prepare("UPDATE session_reports SET payload = ? WHERE kind = 'EVENING'").run(JSON.stringify({ ...JSON.parse(row.payload), narrativeKey: 'stale' }));
    const second = await tenPm(db, [ticker('AAA', 1, v1.id, AH_CLOSE), ticker('BBB', 2, null, AH_CLOSE)], {
      writer: writer('second', 'Our sources had little new this evening.'),
      checker: checker(),
    });
    expect(writerPrompts.at(-1)).toContain('No name changed since the 8:30 pm edition');
    expect(second.revisionOf).toMatchObject({ changedTickers: [], narrativeChanged: true });
    expect(second.narrative).toBe('Our sources had little new this evening.');
    expect(lines(second).size).toBe(2);
  });
});

describe('with no 8:30 edition', () => {
  it('the 10 pm edition is written in full and says it revises nothing', async () => {
    const { db, v1 } = fixture();
    const second = await tenPm(db, [ticker('AAA', 1, v1.id, AH_CLOSE), ticker('BBB', 2, null, AH_CLOSE)]);
    expect(second.revisionOf).toBeNull();
    const sent = writerPrompts.at(-1)!;
    expect(sent).toContain('AAA: ranked #1');
    expect(sent).toContain('BBB: ranked #2');
    expect(sent).not.toContain('since the 8:30 pm edition');
  });
});
