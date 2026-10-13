import { describe, expect, it } from 'vitest';

import { ADVICE_ASK, FORECAST_ASK, NOT_ADVICE_CARVE_OUTS, type CheckerModel } from '@/lib/desk/reports/check';
import type { SessionReport } from '@/lib/desk/reports/contract';
import {
  buildNightScanPrompt,
  journalLine,
  morningNote,
  parseNightScan,
  runNightScan,
  scanLines,
  type StoredReportRow,
} from '@/lib/desk/reports/nightScan';

/*
 * Read 82 (iii), the night scan (Commercial db4f572d; Integration's design and conditions, 2026-10-13): the same two
 * questions as the checker, every published line read, hits and silent nights told apart, the stop never passed.
 */

const report = (over: Partial<SessionReport> = {}): SessionReport =>
  ({
    kind: 'INTO_POWER_HOUR',
    rangeId: '1-20',
    range: { min: 1, max: 20 },
    tradingDate: '2026-10-14',
    targetTradingDate: null,
    checkpoints: [],
    publishedAt: '2026-10-14T19:00:00.000Z',
    late: false,
    headline: null,
    narrative: 'AAA tops the board, up 13 percent from the prior close.',
    sections: [
      {
        heading: 'Catalysts',
        lines: [
          { ticker: 'AAA', text: 'Our sources found a contract award.' },
          { ticker: 'BBB', text: '' },
          { ticker: 'CCC', text: 'CCC looks cheap here.' },
        ],
      },
    ],
    ...over,
  }) as SessionReport;

let nextId = 1;
const row = (payload: SessionReport, diagnostics: unknown = { run: { checker: { ran: 'claude-opus-5-5' } } }): StoredReportRow => ({
  id: nextId++,
  kind: payload.kind,
  range_key: payload.rangeId,
  trading_date: payload.tradingDate,
  published_at: payload.publishedAt,
  payload: JSON.stringify(payload),
  diagnostics: JSON.stringify(diagnostics),
});

/** Answers every id it is shown; `flag` names the ids to call advice. */
const model = (flag: string[] = []): CheckerModel & { calls: number } => {
  const m = {
    calls: 0,
    complete: async (prompt: { system: string; user: string }) => {
      m.calls += 1;
      const ids = prompt.user.split('\n').map((line) => /^(H|O|V|S\d+L\d+): /.exec(line)?.[1]).filter((id): id is string => Boolean(id));
      return JSON.stringify({ answers: ids.map((id) => ({ id, advice: flag.includes(id), forecast: false, phrase: flag.includes(id) ? 'looks cheap' : '' })) });
    },
  };
  return m;
};

const OPTIONS = { runAt: '2026-10-15T03:45:00.000Z', windowStart: '2026-10-14T03:45:00.000Z', windowEnd: '2026-10-15T03:45:00.000Z', stopUsd: 0.25, reserveUsd: 0.06 };

describe('the night scan (read 82 (iii))', () => {
  it('reads every published line with words in it, and no struck (empty) card', () => {
    expect(scanLines(report()).map((l) => l.id)).toEqual(['O', 'S1L1', 'S1L3']);
    expect(scanLines(report({ headline: 'A headline.', overall: 'An overall line.' })).map((l) => l.id)).toEqual(['H', 'O', 'V', 'S1L1', 'S1L3']);
  });

  it('asks the checker\'s two questions and carve-outs in the checker\'s own words, and shows every line by id', () => {
    const prompt = buildNightScanPrompt({ kind: 'INTO_POWER_HOUR', tradingDate: '2026-10-14' }, scanLines(report()));
    expect(prompt.system).toContain(ADVICE_ASK);
    expect(prompt.system).toContain(FORECAST_ASK);
    for (const carveOut of NOT_ADVICE_CARVE_OUTS) expect(prompt.system).toContain(carveOut);
    expect(prompt.user).toContain('S1L3: CCC looks cheap here.');
    expect(prompt.user).toContain('O: AAA tops the board');
  });

  it('a reply is an answer for every line exactly once, or the report is not read', () => {
    const lines = scanLines(report());
    const answer = (id: string, advice = false) => ({ id, advice, forecast: false, phrase: advice ? 'cheap' : '' });
    expect(parseNightScan(JSON.stringify({ answers: [answer('O'), answer('S1L1'), answer('S1L3', true)] }), lines)).toEqual({
      ok: true,
      hits: [{ id: 'S1L3', ticker: 'CCC', text: 'CCC looks cheap here.', advice: true, forecast: false, phrase: 'cheap' }],
    });
    expect(parseNightScan('not json', lines).ok).toBe(false);
    expect(parseNightScan(JSON.stringify({ answers: [answer('O'), answer('S1L1')] }), lines).ok).toBe(false);
    expect(parseNightScan(JSON.stringify({ answers: [answer('O'), answer('S1L1'), answer('S1L1')] }), lines).ok).toBe(false);
    expect(parseNightScan(JSON.stringify({ answers: [answer('O'), answer('S1L1'), answer('S9L9')] }), lines).ok).toBe(false);
    expect(parseNightScan(JSON.stringify({ answers: [answer('O'), answer('S1L1'), { id: 'S1L3', advice: 'yes', forecast: false, phrase: '' }] }), lines).ok).toBe(false);
  });

  it('a hit reaches the note with its report, line, ticker and phrase; the journal line carries the counts', async () => {
    const m = model(['S1L3']);
    const scan = await runNightScan([row(report())], m, { ...OPTIONS, spent: () => 0 });
    expect(m.calls).toBe(1);
    expect(journalLine(scan, '2026-10-14')).toBe('night scan 2026-10-14: 1 reports read, 1 hits, 0 fallback-checked');
    const note = morningNote(scan, '2026-10-14');
    expect(note).toContain('INTO_POWER_HOUR 2026-10-14 (1-20, row');
    expect(note).toContain('S1L3 CCC: advice; "looks cheap" in: CCC looks cheap here.');
  });

  it('a clean night says so with the count read, so it never reads like a night that did not run', async () => {
    const scan = await runNightScan([row(report()), row(report())], model(), { ...OPTIONS, spent: () => 0 });
    expect(journalLine(scan, '2026-10-14')).toBe('night scan 2026-10-14: 2 reports read, 0 hits, 0 fallback-checked');
    expect(morningNote(scan, '2026-10-14')).toContain('  none, in 2 reports read');
    const empty = await runNightScan([], model(), { ...OPTIONS, spent: () => 0 });
    expect(journalLine(empty, '2026-10-14')).toBe('night scan 2026-10-14: 0 reports read, 0 hits, 0 fallback-checked');
  });

  it('the stop is never passed: a report whose call could cross it is NOT READ, named, and counted in the journal line', async () => {
    let spend = 0;
    const m: CheckerModel = {
      complete: async (prompt) => {
        spend += 0.1;
        return model().complete(prompt);
      },
    };
    const scan = await runNightScan([row(report()), row(report()), row(report())], m, { ...OPTIONS, spent: () => spend });
    expect(scan.reports.map((r) => r.status)).toEqual(['READ', 'READ', 'NOT_RUN']);
    expect(scan.spendUsd).toBeLessThanOrEqual(OPTIONS.stopUsd);
    expect(journalLine(scan, '2026-10-14')).toBe('night scan 2026-10-14: 2 reports read, 0 hits, 0 fallback-checked, 1 NOT READ');
    expect(morningNote(scan, '2026-10-14')).toContain('NOT_RUN, stop: $0.2000 spent');
  });

  it('a failed call or a bad reply is FAILED and named; the other reports are still read', async () => {
    const failing: CheckerModel = {
      complete: async () => {
        throw new Error('openai: HTTP 500');
      },
    };
    const scan = await runNightScan([row(report())], failing, { ...OPTIONS, spent: () => 0 });
    expect(scan.reports[0]!.status).toBe('FAILED');
    expect(morningNote(scan, '2026-10-14')).toContain('FAILED, call: openai: HTTP 500');
    const bad = await runNightScan([row(report()), row(report())], { complete: async () => '{}' }, { ...OPTIONS, spent: () => 0 });
    expect(bad.reports.map((r) => r.status)).toEqual(['FAILED', 'FAILED']);
  });

  it('names the reports an OpenAI checker decided (word list on), the fallback among them', async () => {
    const fellBack = row(report(), { run: { checker: { ran: 'terra', fallbackFrom: { model: 'claude-opus-5-5' }, wordList: true } } });
    const noKey = row(report(), { run: { checker: { ran: 'terra', wordList: true } } });
    const claude = row(report());
    const scan = await runNightScan([fellBack, noKey, claude], model(), { ...OPTIONS, spent: () => 0 });
    expect(scan.reports.map((r) => [r.wordList, r.fallbackFrom])).toEqual([[true, 'claude-opus-5-5'], [true, null], [false, null]]);
    expect(journalLine(scan, '2026-10-14')).toBe('night scan 2026-10-14: 3 reports read, 0 hits, 1 fallback-checked');
    const note = morningNote(scan, '2026-10-14');
    expect(note).toContain(': fallback after claude-opus-5-5 failed');
    expect(note).toContain(': OpenAI was the first checker');
  });

  it('lists every dash replacement, the " to " between two figures marked TO for read 94 (3)', async () => {
    const dashes = [
      { id: 'S1L1', before: 'It gained 20% - 30 minutes later it fell.' },
      { id: 'O', before: 'AAA led - BBB followed.' },
    ];
    const scan = await runNightScan([row(report(), { run: { checker: { ran: 'claude-opus-5-5' }, dashes } })], model(), { ...OPTIONS, spent: () => 0 });
    const note = morningNote(scan, '2026-10-14');
    expect(note).toContain('TO INTO_POWER_HOUR 2026-10-14');
    expect(note).toContain('S1L1: It gained 20% - 30 minutes later it fell. => It gained 20% to 30 minutes later it fell.');
    expect(note).toContain('O: AAA led - BBB followed. => AAA led, BBB followed.');
    expect(note).not.toContain('TO INTO_POWER_HOUR 2026-10-14 (1-20, row ' + String(nextId - 1) + ') O:');
  });
});
