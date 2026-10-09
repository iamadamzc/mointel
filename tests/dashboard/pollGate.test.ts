/**
 * The market poll must not starve itself.
 *
 * The old poll -- a 1 s interval that aborted the request in flight -- lands
 * nothing whenever responses take longer than the interval, and the board then
 * keeps its last payload while its header says LIVE. Measured 2026-09-29 (Ops):
 * about 90% of polls land at rest; under concurrent load the snapshot build ran
 * 2.4-8.9 s and almost none did.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { POLL_STUCK_AFTER_MS, pollDecision, type PollDecision } from '@/lib/dashboard/pollGate';

describe('the poll gate', () => {
  it('starts when nothing is in flight, forced or not', () => {
    expect(pollDecision(null, 5_000, false)).toBe('START');
    expect(pollDecision(null, 5_000, true)).toBe('START');
  });

  it('SKIPS a tick while a slow request is still inside its budget (the live case)', () => {
    expect(pollDecision(0, 1_200, false)).toBe('SKIP');
  });

  it('replaces at once on a change of query', () => {
    expect(pollDecision(0, 1_200, true)).toBe('REPLACE');
  });

  it('replaces a request that has hung past the bound, and not one millisecond before', () => {
    expect(pollDecision(0, POLL_STUCK_AFTER_MS - 1, false)).toBe('SKIP');
    expect(pollDecision(0, POLL_STUCK_AFTER_MS, false)).toBe('REPLACE');
  });
});

/**
 * The live timing, simulated: a tick every 1,000 ms, every response taking
 * `latencyMs`. Counts snapshots that land in 30 s under a policy.
 */
function landedIn30s(latencyMs: number, policy: (startedAt: number | null, now: number) => PollDecision): number {
  // Declared through `as` so the closure's writes are not narrowed away.
  let inflight = null as { startedAt: number; id: number } | null;
  let landed = 0;
  let nextId = 0;
  const events: Array<{ at: number; kind: 'tick' } | { at: number; kind: 'done'; id: number }> = [];
  for (let t = 0; t < 30_000; t += 1_000) events.push({ at: t, kind: 'tick' });

  const start = (now: number) => {
    inflight = { startedAt: now, id: nextId++ };
    events.push({ at: now + latencyMs, kind: 'done', id: inflight.id });
  };

  // Ticks sort before completions at the same instant: the worst case.
  const order = () => events.sort((a, b) => a.at - b.at || (a.kind === 'tick' ? -1 : 1));
  order();
  while (events.length > 0) {
    const event = events.shift()!;
    if (event.at >= 30_000) break;
    if (event.kind === 'tick') {
      const decision = policy(inflight?.startedAt ?? null, event.at);
      if (decision === 'SKIP') continue;
      start(event.at); // START, or REPLACE: the old id can no longer land
      order();
    } else if (inflight && inflight.id === event.id) {
      landed += 1;
      inflight = null;
    }
  }
  return landed;
}

describe('the live timing, simulated', () => {
  const abortEveryTick = (): PollDecision => 'REPLACE';
  const gated = (startedAt: number | null, now: number) => pollDecision(startedAt, now, false);

  it('reproduces the freeze under the old policy: nothing lands after the first at 1,200 ms', () => {
    // The first request is not replaced until the second tick... and it is
    // still 200 ms short, so under abort-every-tick NOTHING lands at all.
    expect(landedIn30s(1_200, abortEveryTick)).toBe(0);
  });

  it('lands a snapshot about every other second under the gate at the same latency', () => {
    expect(landedIn30s(1_200, gated)).toBeGreaterThanOrEqual(14);
  });

  it('is unchanged for a fast server', () => {
    expect(landedIn30s(300, gated)).toBe(landedIn30s(300, abortEveryTick));
    expect(landedIn30s(300, gated)).toBe(30);
  });
});

describe('the market hook uses the gate', () => {
  const src = readFileSync(join(process.cwd(), 'lib/hooks/useMarket.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('asks the gate before starting a request', () => {
    expect(src).toContain('pollDecision(');
    expect(src).toMatch(/if \(decision === 'SKIP'\) return;/);
  });

  it('never aborts unconditionally ahead of a fetch', () => {
    expect(src).not.toMatch(/inflightRef\.current\?\.(controller\.)?abort\(\);\s*const controller/);
  });

  it('frees the slot when its own request settles, and only its own', () => {
    // Without this every tick SKIPS until the stuck bound: a board that
    // updates every 15 s, which no other test here would notice.
    expect(src).toMatch(/finally \{[\s\S]*?if \(inflightRef\.current === flight\) inflightRef\.current = null;/);
  });

  it('forces only the first load of a query; ticks and visibility never force', () => {
    // The range rides the same gate (the price selector): a new range is a change of query, so it re-runs
    // the effect and its first load forces; ticks and visibility still never force.
    expect(src).toMatch(/void load\(symbolsKey, rangeKey, true\);/);
    expect(src.match(/void load\(symbolsKey, rangeKey, false\)/g)?.length).toBe(2);
  });
});
