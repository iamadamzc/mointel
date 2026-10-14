import { describe, expect, it } from 'vitest';

import type { FloatBoundRow, FloatJobInput } from '@/lib/research/floatJob';
import { NO_ANALYSIS } from '@/lib/research/insiderBound';
import {
  endOfEtDay,
  exitCodeFor,
  nameJob,
  parseDeadline,
  parseNightlyArgs,
  planFloatNightly,
  runFloatNightly,
  type NameDossier,
  type NightlyDeps,
} from '@/lib/research/floatNightly';
import type { SupplyBlock } from '@/lib/research/types';

/**
 * The nightly float run (his ruling: the float count runs every night on its own over every eligible name). Fakes
 * only: no store, no network, no SEC. Each guard is pinned in both directions: it stops before the next name past its
 * line, and it does not stop short of it.
 */

const MB = 1_048_576;
const D = '2026-10-13';

interface Fake {
  deps: NightlyDeps;
  ran: string[];
  logs: string[];
}

function fake(options: {
  names: string[];
  stored?: Array<[string, string]>;
  rss?: (call: number) => number;
  secPerName?: number;
  msPerName?: number;
  throws?: string[];
}): Fake {
  const ran: string[] = [];
  const logs: string[] = [];
  const stored = new Set((options.stored ?? []).map(([s, d]) => `${s}|${d}`));
  let rssCalls = 0;
  let sec = 0;
  let clock = 0;
  const deps: NightlyDeps = {
    listNames: () => options.names,
    hasRow: (symbol, date) => stored.has(`${symbol}|${date}`),
    runName: async (symbol) => {
      ran.push(symbol);
      sec += options.secPerName ?? 0;
      clock += options.msPerName ?? 0;
      if (options.throws?.includes(symbol)) throw new Error('boom');
    },
    rss: () => (options.rss ? options.rss(rssCalls++) : 100 * MB),
    secRequests: () => sec,
    now: () => clock,
    log: (line) => logs.push(line),
  };
  return { deps, ran, logs };
}

describe('runFloatNightly: the memory guard', () => {
  it('stops before the next name when rss is above the cap, with one log line', async () => {
    const f = fake({ names: ['A', 'B', 'C'], rss: (call) => (call === 0 ? 800 : 1000) * MB });
    const summary = await runFloatNightly(f.deps, { date: D, maxRssMb: 900 });
    expect(f.ran).toEqual(['A']);
    expect(summary.stopped).toBe('memory');
    expect(summary.computed).toBe(1);
    expect(summary.lastRss).toBe(1000 * MB);
    const stops = f.logs.filter((line) => line.includes('STOPPED'));
    expect(stops).toHaveLength(1);
    expect(stops[0]).toContain('memory');
    expect(stops[0]).toContain('rss=1000.0MB');
    expect(stops[0]).toContain('done 1 of 3');
  });

  it('does not stop at or below the cap', async () => {
    const f = fake({ names: ['A', 'B', 'C'], rss: () => 900 * MB });
    const summary = await runFloatNightly(f.deps, { date: D, maxRssMb: 900 });
    expect(f.ran).toEqual(['A', 'B', 'C']);
    expect(summary.stopped).toBe('none');
  });
});

describe('runFloatNightly: the SEC request cap', () => {
  it('stops before the next name once the count is at the cap', async () => {
    const f = fake({ names: ['A', 'B', 'C'], secPerName: 10 });
    const summary = await runFloatNightly(f.deps, { date: D, maxSecRequests: 20 });
    expect(f.ran).toEqual(['A', 'B']);
    expect(summary.stopped).toBe('sec_cap');
    expect(summary.secRequests).toBe(20);
  });

  it('does not stop while the count is below the cap', async () => {
    const f = fake({ names: ['A', 'B', 'C'], secPerName: 10 });
    const summary = await runFloatNightly(f.deps, { date: D, maxSecRequests: 21 });
    expect(f.ran).toEqual(['A', 'B', 'C']);
    expect(summary.stopped).toBe('none');
    expect(summary.secRequests).toBe(30);
  });
});

describe('runFloatNightly: the deadline', () => {
  it('stops before the next name at or after the deadline', async () => {
    const f = fake({ names: ['A', 'B', 'C'], msPerName: 100 });
    const summary = await runFloatNightly(f.deps, { date: D, deadlineMs: 150 });
    expect(f.ran).toEqual(['A', 'B']);
    expect(summary.stopped).toBe('deadline');
  });

  it('does not stop before the deadline', async () => {
    const f = fake({ names: ['A', 'B', 'C'], msPerName: 100 });
    const summary = await runFloatNightly(f.deps, { date: D, deadlineMs: 201 });
    expect(f.ran).toEqual(['A', 'B', 'C']);
    expect(summary.stopped).toBe('none');
  });

  it('has no deadline when none is given', async () => {
    const f = fake({ names: ['A', 'B', 'C'], msPerName: 1e12 });
    expect((await runFloatNightly(f.deps, { date: D, deadlineMs: null })).stopped).toBe('none');
    expect(f.ran).toEqual(['A', 'B', 'C']);
  });
});

describe('runFloatNightly: the limit', () => {
  it('stops after N names attempted', async () => {
    const f = fake({ names: ['A', 'B', 'C', 'D'] });
    const summary = await runFloatNightly(f.deps, { date: D, limit: 2 });
    expect(f.ran).toEqual(['A', 'B']);
    expect(summary.stopped).toBe('limit');
  });

  it('does not count a skipped name toward the limit', async () => {
    const f = fake({ names: ['A', 'B', 'C', 'D'], stored: [['A', D]] });
    const summary = await runFloatNightly(f.deps, { date: D, limit: 2 });
    expect(f.ran).toEqual(['B', 'C']);
    expect(summary.skipped).toBe(1);
    expect(summary.stopped).toBe('limit');
  });

  it('ends with none when the limit equals the names left', async () => {
    const f = fake({ names: ['A', 'B', 'C'] });
    const summary = await runFloatNightly(f.deps, { date: D, limit: 3 });
    expect(f.ran).toEqual(['A', 'B', 'C']);
    expect(summary.stopped).toBe('none');
  });
});

describe('runFloatNightly: names', () => {
  it('skips a name with a stored row for D and computes one whose row is for another date', async () => {
    const f = fake({ names: ['A', 'B', 'C'], stored: [['B', D], ['C', '2026-10-12']] });
    const summary = await runFloatNightly(f.deps, { date: D });
    expect(f.ran).toEqual(['A', 'C']);
    expect(summary).toMatchObject({ listed: 3, skipped: 1, computed: 2, failed: 0, stopped: 'none' });
  });

  it('logs a name that throws and goes on with the others', async () => {
    const f = fake({ names: ['A', 'B', 'C'], throws: ['B'] });
    const summary = await runFloatNightly(f.deps, { date: D });
    expect(f.ran).toEqual(['A', 'B', 'C']);
    expect(summary).toMatchObject({ computed: 2, failed: 1, stopped: 'none' });
    expect(f.logs.some((line) => line.includes(`B ${D} not stored: boom`))).toBe(true);
  });

  it('visits names sorted by symbol, each once', async () => {
    const f = fake({ names: ['MTR', 'AAPL', 'GPUS', 'AAPL'] });
    const summary = await runFloatNightly(f.deps, { date: D });
    expect(f.ran).toEqual(['AAPL', 'GPUS', 'MTR']);
    expect(summary.listed).toBe(3);
  });
});

describe('planFloatNightly: the dry run', () => {
  it('lists the pending names sorted and the skip count, and computes nothing', () => {
    const f = fake({ names: ['C', 'A', 'B'], stored: [['B', D]] });
    const plan = planFloatNightly(f.deps, D);
    expect(plan).toEqual({ listed: 3, skipped: 1, pending: ['A', 'C'] });
    expect(f.ran).toEqual([]);
  });
});

describe('exitCodeFor: Ops exit contract', () => {
  it('exits 75 at the memory guard', () => {
    expect(exitCodeFor({ stopped: 'memory' })).toBe(75);
  });

  it('exits 76 at the SEC cap', () => {
    expect(exitCodeFor({ stopped: 'sec_cap' })).toBe(76);
  });

  it('exits 0 when finished, at the deadline or at the limit', () => {
    expect(exitCodeFor({ stopped: 'none' })).toBe(0);
    expect(exitCodeFor({ stopped: 'deadline' })).toBe(0);
    expect(exitCodeFor({ stopped: 'limit' })).toBe(0);
  });
});

describe('nameJob: one name', () => {
  const row = (symbol: string) => ({ symbol, holdings: [], cell: { state: 'UNKNOWN', reason: 'NO_FILED_COUNT' } }) as unknown as FloatBoundRow;
  const ledger = [{ kind: 'warrants' }] as unknown as SupplyBlock[];

  function job(dossier: NameDossier | null, compute?: (input: FloatJobInput) => Promise<FloatBoundRow>) {
    const inputs: FloatJobInput[] = [];
    const stored: FloatBoundRow[] = [];
    const resolved: string[] = [];
    const run = nameJob({
      readDossier: () => dossier,
      resolveCik: async (symbol) => {
        resolved.push(symbol);
        return '0001234567';
      },
      compute: async (input) => {
        inputs.push(input);
        return compute ? compute(input) : row(input.symbol);
      },
      store: (r) => stored.push(r),
      log: () => {},
    });
    return { run, inputs, stored, resolved };
  }

  it('gives a name with no research NO_ANALYSIS (a filings-only bound, never null) and the ticker map CIK', async () => {
    const j = job(null);
    await j.run('NEWCO', D);
    expect(j.resolved).toEqual(['NEWCO']);
    expect(j.inputs).toEqual([{ symbol: 'NEWCO', cik: '0001234567', asOfDate: D, dossier: NO_ANALYSIS }]);
    expect(j.stored).toHaveLength(1);
  });

  it('gives a researched name its ledger, version id and dossier CIK, without asking the map', async () => {
    const j = job({ analysisVersionId: 42, ledger, cik: '0000999' });
    await j.run('OLDCO', D);
    expect(j.resolved).toEqual([]);
    expect(j.inputs).toEqual([{ symbol: 'OLDCO', cik: '0000999', asOfDate: D, dossier: { analysisVersionId: 42, ledger } }]);
  });

  it('stores nothing when the compute throws', async () => {
    const j = job(null, async () => {
      throw new Error('companyfacts 503');
    });
    await expect(j.run('NEWCO', D)).rejects.toThrow('companyfacts 503');
    expect(j.stored).toEqual([]);
  });
});

describe('dates and flags', () => {
  it('bounds research as of D at the end of D in ET', () => {
    expect(endOfEtDay('2026-10-13')).toBe('2026-10-14T04:00:00.000Z');
  });

  it('reads an ISO deadline as that instant', () => {
    expect(parseDeadline('2026-10-14T08:00:00Z', Date.parse('2026-10-14T01:00:00Z'), '2026-10-13')).toBe(Date.parse('2026-10-14T08:00:00Z'));
  });

  it('reads HH:MM as the next such ET time after the start, today or tomorrow', () => {
    const start = Date.parse('2026-10-13T12:00:00Z'); // 08:00 EDT
    expect(parseDeadline('09:30', start, '2026-10-13')).toBe(Date.parse('2026-10-13T13:30:00Z'));
    expect(parseDeadline('04:00', start, '2026-10-13')).toBe(Date.parse('2026-10-14T08:00:00Z'));
  });

  it('refuses a bare date or garbage as a deadline', () => {
    expect(() => parseDeadline('2026-10-14', 0, '2026-10-13')).toThrow();
    expect(() => parseDeadline('soon', 0, '2026-10-13')).toThrow();
    expect(() => parseDeadline('25:00', 0, '2026-10-13')).toThrow();
  });

  it('parses the flags in both forms, with the defaults', () => {
    expect(parseNightlyArgs([])).toEqual({ date: null, maxRssMb: 900, maxSecRequests: 20_000, limit: null, deadline: null, rate: null, dryRun: false });
    expect(parseNightlyArgs(['--date', D, '--max-rss-mb=800', '--max-sec-requests', '500', '--limit=3', '--deadline', '2026-10-14T08:00:00Z', '--rate=2', '--dry-run'])).toEqual({
      date: D,
      maxRssMb: 800,
      maxSecRequests: 500,
      limit: 3,
      deadline: '2026-10-14T08:00:00Z',
      rate: 2,
      dryRun: true,
    });
  });

  it('refuses an unknown flag or a bad value', () => {
    expect(() => parseNightlyArgs(['--fast'])).toThrow('unknown flag');
    expect(() => parseNightlyArgs(['--limit', '0'])).toThrow();
    expect(() => parseNightlyArgs(['--date', '10/13/2026'])).toThrow();
    expect(() => parseNightlyArgs(['--rate'])).toThrow('needs a value');
  });
});
