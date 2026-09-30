import { describe, expect, it } from 'vitest';

import type { ReportFact } from '@/lib/desk/reports/facts';
import { verifyLine } from '@/lib/desk/reports/verify';
import {
  NOTHING_LINE,
  buildWriterPrompt,
  factSheet,
  parseDraft,
  reportableChangeNotes,
  writeReport,
  type ReportModel,
} from '@/lib/desk/reports/writer';

/**
 * The writer is handed phrases, not arithmetic -- so the property that
 * matters is that every phrase it is handed SURVIVES THE CHECKER. A sheet the
 * checker strikes would fail every faithful draft, which is the pre-registered
 * control failing by construction.
 *
 * Rows are the 2026-09-18 specimen rows (`facts-2026-09-18.md`), plus edge
 * values chosen where binary rounding and signs have already bitten.
 */

const fact = (over: Partial<ReportFact> & { ticker: string }): ReportFact => ({
  assessmentRank: 1,
  price: null,
  percentChange: null,
  rvol: null,
  sessionHigh: null,
  sessionLow: null,
  referenceClose: null,
  ahPercentChange: null,
  ahVolume: null,
  volume: null,
  referenceBasis: 'PRIOR_SESSION',
  cycle: null,
  catalyst: null,
  structure: null,
  haltState: null,
  warnings: [],
  changeSummary: '',
  liveFeed: null,
  ...over,
});

const IMCC_0925 = fact({
  ticker: 'IMCC',
  price: 3.31,
  percentChange: 90.23,
  sessionHigh: 5.06,
  structure: 'DIRTY_FLOAT',
  catalyst: 'WEAK_NEGATIVE_DILUTIVE',
  cycle: 'UNKNOWN',
  changeSummary: 'IMCC: -30.2% since prior assessment; -34.6% off session high.',
});

const TCRT_1430 = fact({
  ticker: 'TCRT',
  assessmentRank: 7,
  price: 1.255,
  percentChange: -21.5625,
  sessionHigh: 3.14,
  cycle: 'RED_BACKSIDE',
  catalyst: 'WEAK_NEGATIVE_DILUTIVE',
  changeSummary: 'TCRT: -32.4% since prior assessment; lost $1.84 support.',
  liveFeed: false,
});

const IMCC_RECAP = fact({
  ticker: 'IMCC',
  assessmentRank: 3,
  price: 3.17,
  percentChange: -25.06,
  ahPercentChange: -25.06,
  referenceClose: 4.23,
  referenceBasis: 'CURRENT_SESSION',
  changeSummary: 'IMCC: rank #1 → #4; lost $4.20 support; TRADING → UNKNOWN.',
});

const OBA_1430 = fact({
  ticker: 'OBA',
  assessmentRank: 6,
  price: 10.335,
  changeSummary: 'OBA: new HOD.',
  liveFeed: true,
});

const EDGES = [
  fact({ ticker: 'EDGA', price: 1.005, percentChange: -0.05, sessionHigh: 2.675, rvol: 12.25, volume: 12_500_000.4 }),
  fact({ ticker: 'EDGB', price: 0.125, percentChange: -0.04, sessionHigh: 0.125, sessionLow: 0.0999 }),
  fact({ ticker: 'EDGC', price: 19.995, percentChange: 1234.56, sessionHigh: 25.005 }),
];

const ALL = [IMCC_0925, TCRT_1430, IMCC_RECAP, OBA_1430, ...EDGES];

describe('every phrase the writer is handed survives the checker', () => {
  it.each(ALL.map((f) => [f.ticker, f] as const))('%s', (_, f) => {
    for (const line of factSheet(f)) {
      expect(verifyLine({ ticker: f.ticker, text: line }, [f]), line).toEqual([]);
    }
  });
});

describe('what the writer is never shown', () => {
  it('no band ordinal from the change notes', () => {
    const sheet = factSheet(IMCC_RECAP).join('\n');
    expect(sheet).not.toMatch(/#1|#4|Top 12/);
    expect(sheet).toContain('lost $4.20 support');
  });

  it('keeps only the allowlisted notes, and drops the unknown', () => {
    expect(
      reportableChangeNotes(
        'ACME: rank #3 → #9; left Top 12; +10.8% since prior assessment; -6.3% off session high; lost $1.84 support; new HOD; TRADING → UNKNOWN; structure unknown → CLEAN.',
      ),
    ).toEqual([
      'up 10.8% since the previous checkpoint',
      'lost $1.84 support',
      'printed a new high of day',
    ]);
  });

  it('no percent without a recorded basis', () => {
    const sheet = factSheet(fact({ ticker: 'NOBS', price: 2, percentChange: 40, referenceBasis: null }));
    expect(sheet.join('\n')).not.toContain('40');
  });

  it('no halt unless the desk observed one', () => {
    for (const haltState of ['UNKNOWN', 'TRADING', null]) {
      expect(factSheet(fact({ ticker: 'H', haltState })).join('\n')).not.toMatch(/halt/i);
    }
    expect(factSheet(fact({ ticker: 'H', haltState: 'HALTED' })).join('\n')).toMatch(/halted/);
  });

  it('no engine constant', () => {
    for (const f of ALL) {
      expect(factSheet(f).join('\n')).not.toMatch(/\b[A-Z][A-Z0-9]*(_[A-Z0-9]+)+\b/);
    }
  });
});

describe('the frame travels with the percent', () => {
  it('prior close for the intraday checkpoints', () => {
    expect(factSheet(TCRT_1430)).toContain('change: down 21.6% from the prior close');
  });

  it('the after-hours move, from that day’s own close, at the recap', () => {
    expect(factSheet(IMCC_RECAP)).toContain(
      'change: down 25.1% after hours, from the regular-session close of $4.23',
    );
  });

  it('a gap in research is said, not hidden', () => {
    const sheet = factSheet(OBA_1430);
    expect(sheet).toContain('catalyst our sources found: no research on file at this checkpoint');
    expect(sheet).toContain('since the previous checkpoint: printed a new high of day');
  });

  it('a backside read carries its long-only meaning', () => {
    expect(factSheet(TCRT_1430).join('\n')).toContain('an exit-and-avoid read, never a setup');
  });
});

describe('the prompt', () => {
  const checkpoint = { id: 433, type: 'RTH_INTERVAL' as const, completedAt: '2026-09-18T18:30:12.000Z' };

  it('names the checkpoint time in ET from completedAt, never the schedule', () => {
    const { user } = buildWriterPrompt({
      kind: 'INTO_POWER_HOUR',
      range: { min: 1, max: 20 },
      checkpoint,
      facts: [TCRT_1430, OBA_1430],
    });
    expect(user).toContain('Checkpoint time: 14:30 ET.');
    expect(user).toContain('The 2 highest-ranked names in this range');
  });

  it('says so when the range holds nothing', () => {
    const { user } = buildWriterPrompt({ kind: 'INTO_RTH', range: { min: 20, max: 50 }, checkpoint, facts: [] });
    expect(user).toContain('No names ranked in this range at this checkpoint.');
  });
});

describe('a draft, or the reason it is not one', () => {
  const good = {
    headline: 'Two names carried the premarket.',
    sections: [
      { heading: 'Held', lines: [{ ticker: 'IMCC', text: 'IMCC held #1 at $3.31.' }] },
      { heading: 'Gave it back', lines: [{ ticker: null, text: NOTHING_LINE }] },
    ],
  };

  it('accepts the contract shape, fenced or not', () => {
    expect(parseDraft(JSON.stringify(good))).toEqual({ ok: true, draft: good });
    expect(parseDraft('```json\n' + JSON.stringify(good) + '\n```')).toEqual({ ok: true, draft: good });
  });

  it('refuses an empty section rather than filling it', () => {
    const bad = { ...good, sections: [{ heading: 'Held', lines: [] }] };
    expect(parseDraft(JSON.stringify(bad))).toEqual({ ok: false, error: 'empty section "Held"' });
  });

  it.each([
    ['not JSON', 'Here is your report'],
    ['no headline', JSON.stringify({ ...good, headline: ' ' })],
    ['no sections', JSON.stringify({ ...good, sections: [] })],
    ['line without text', JSON.stringify({ ...good, sections: [{ heading: 'H', lines: [{ ticker: 'X', text: '' }] }] })],
    ['bad ticker', JSON.stringify({ ...good, sections: [{ heading: 'H', lines: [{ ticker: 7, text: 'x' }] }] })],
  ])('refuses: %s', (error, raw) => {
    expect(parseDraft(raw)).toEqual({ ok: false, error });
  });
});

describe('writeReport', () => {
  const input = {
    kind: 'INTO_RTH' as const,
    range: { min: 1, max: 20 },
    checkpoint: { id: 423, type: 'OPEN_SPIKE_ASSESSMENT' as const, completedAt: '2026-09-18T13:25:10.000Z' },
    facts: [IMCC_0925],
  };
  const at = () => new Date('2026-09-18T13:26:00.000Z');
  const model = (reply: () => Promise<string>): ReportModel => ({ complete: reply });

  it('returns the parsed draft', async () => {
    const draft = { headline: 'H', sections: [{ heading: 'S', lines: [{ ticker: null, text: NOTHING_LINE }] }] };
    await expect(writeReport(input, model(async () => JSON.stringify(draft)), at)).resolves.toEqual({
      ok: true,
      draft,
    });
  });

  it('a malformed reply is WRITER_FAILED, not a partial report', async () => {
    await expect(writeReport(input, model(async () => '{"headline":'), at)).resolves.toEqual({
      ok: false,
      cause: { kind: 'WRITER_FAILED', at: '2026-09-18T13:26:00.000Z' },
    });
  });

  it('a model error is WRITER_FAILED, and is not retried here', async () => {
    let calls = 0;
    const failing = model(async () => {
      calls += 1;
      throw new Error('timeout');
    });
    await expect(writeReport(input, failing, at)).resolves.toEqual({
      ok: false,
      cause: { kind: 'WRITER_FAILED', at: '2026-09-18T13:26:00.000Z' },
    });
    expect(calls).toBe(1);
  });
});
