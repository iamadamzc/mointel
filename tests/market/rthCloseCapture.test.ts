import { describe, expect, it, vi } from 'vitest';

import { RthCloseCapture } from '@/lib/market/rthCloseCapture';
import { SymbolAdmission, isolateInvalidSymbols } from '@/lib/market/symbolAdmission';

/**
 * The three ways a close capture can end, and the one it must never confuse.
 *
 * The original code latched success after the request, inside the try, so a
 * throw skipped it and the one-second flush timer asked again: 21,473 failures
 * in a day. Latching in the catch instead stops the loop and trades it for a
 * worse bug — one transient 500 would abandon the session's price reference
 * entirely, and a close nobody can capture looks exactly like a close nobody
 * will try to capture.
 *
 * These drive a clock rather than a worker, so a bounded backoff can be proven
 * without waiting ten minutes for it.
 */

const BACKOFF = [30_000, 60_000, 120_000, 300_000, 600_000];

function machine(startMs = Date.parse('2026-08-20T20:02:00.000Z')) {
  const clock = { ms: startMs };
  const capture = new RthCloseCapture({
    backoffMs: BACKOFF,
    degradedAfter: 4,
    now: () => new Date(clock.ms),
  });
  capture.beginTradingDate('2026-08-20');
  return { capture, clock, advance: (ms: number) => (clock.ms += ms) };
}

describe('a transient failure is not the end of the session', () => {
  it('recovers after one 500 and captures the close later', () => {
    const { capture, advance } = machine();

    expect(capture.shouldAttempt()).toBe(true);
    capture.noteAttempt();
    capture.recordFailure({ detail: 'Alpaca HTTP 500: service unavailable' });

    // Not latched, and not asked again immediately either.
    expect(capture.status.state).toBe('RETRY_SCHEDULED');
    expect(capture.isTerminal).toBe(false);
    expect(capture.shouldAttempt()).toBe(false);

    advance(BACKOFF[0]);
    expect(capture.shouldAttempt()).toBe(true);

    capture.noteAttempt();
    capture.recordSuccess(214);

    expect(capture.status.state).toBe('CAPTURED');
    expect(capture.status.capturedSymbols).toBe(214);
    expect(capture.isTerminal).toBe(true);
  });

  it('never latches success on a 401, 429, 500 or timeout', () => {
    for (const detail of [
      'Alpaca HTTP 401: unauthorized',
      'Alpaca HTTP 429: too many requests',
      'Alpaca HTTP 500: service unavailable',
      'TimeoutError',
      'something nobody classified',
    ]) {
      const { capture } = machine();
      capture.noteAttempt();
      capture.recordFailure({ detail });

      expect(capture.status.state, detail).not.toBe('CAPTURED');
      expect(capture.isTerminal, detail).toBe(false);
      expect(capture.status.capturedAt, detail).toBeNull();
    }
  });

  it('honours Retry-After when the provider sends one', () => {
    const { capture, advance } = machine();

    capture.noteAttempt();
    // The provider asks for 90s; the schedule would only have waited 30s.
    capture.recordFailure({ detail: 'Alpaca HTTP 429', retryAfterMs: 90_000 });

    advance(BACKOFF[0]);
    expect(capture.shouldAttempt()).toBe(false); // coming back early earns another 429

    advance(60_000);
    expect(capture.shouldAttempt()).toBe(true);
  });

  it('takes the longer of Retry-After and its own backoff', () => {
    const { capture, advance } = machine();

    capture.noteAttempt();
    // A 1s Retry-After must not shorten the wait into a hot loop.
    capture.recordFailure({ detail: 'Alpaca HTTP 429', retryAfterMs: 1_000 });

    advance(1_000);
    expect(capture.shouldAttempt()).toBe(false);
    advance(BACKOFF[0] - 1_000);
    expect(capture.shouldAttempt()).toBe(true);
  });
});

describe('bounded backoff rather than one request per second', () => {
  it('spaces persistent failures out and caps the interval', () => {
    const { capture, clock, advance } = machine();
    const attemptedAt: number[] = [];

    // Twelve hours of one-second ticks, compressed: at each tick, attempt only
    // if the machine allows it. The old code produced 21,473 requests here.
    for (let tick = 0; tick < 12 * 3600; tick += 1) {
      if (capture.shouldAttempt()) {
        attemptedAt.push(clock.ms);
        capture.noteAttempt();
        capture.recordFailure({ detail: 'Alpaca HTTP 500' });
      }
      advance(1000);
    }

    // 30s + 60s + 120s + 300s, then 600s for the rest of twelve hours.
    expect(attemptedAt.length).toBeLessThan(80);
    expect(attemptedAt.length).toBeGreaterThan(60);

    const gaps = attemptedAt.slice(1).map((at, index) => at - attemptedAt[index]);
    expect(gaps[0]).toBe(BACKOFF[0]);
    expect(gaps[1]).toBe(BACKOFF[1]);
    expect(gaps[2]).toBe(BACKOFF[2]);
    expect(gaps[3]).toBe(BACKOFF[3]);
    expect(gaps[gaps.length - 1]).toBe(BACKOFF[4]); // capped, not growing forever
  });

  it('reports degraded once it has been failing long enough to matter', () => {
    const { capture, advance } = machine();

    for (let failure = 0; failure < 3; failure += 1) {
      capture.noteAttempt();
      capture.recordFailure({ detail: 'Alpaca HTTP 500' });
      advance(BACKOFF[Math.min(failure, BACKOFF.length - 1)]);
    }
    expect(capture.status.state).toBe('RETRY_SCHEDULED');

    capture.noteAttempt();
    capture.recordFailure({ detail: 'Alpaca HTTP 500' });

    expect(capture.status.state).toBe('DEGRADED');
    // Degraded still retries. Silently abandoning the reference close is the
    // outcome this machine exists to prevent.
    expect(capture.isTerminal).toBe(false);
    expect(capture.status.consecutiveFailures).toBe(4);
  });
});

describe('once captured, the desk stops asking', () => {
  it('produces zero further attempts across a hundred flush cycles', () => {
    /*
     * The regression the earlier version of this fix did not cover. Proving
     * that a refused symbol never reaches the client is not the same as proving
     * that a SUCCESSFUL capture ends the episode.
     */
    const { capture, advance } = machine();

    capture.noteAttempt();
    capture.recordSuccess(214);
    const attemptsAfterSuccess = capture.status.attempts;

    let allowed = 0;
    for (let cycle = 0; cycle < 100; cycle += 1) {
      if (capture.shouldAttempt()) allowed += 1;
      advance(1000);
    }

    expect(allowed).toBe(0);
    expect(capture.status.attempts).toBe(attemptsAfterSuccess);
  });
});

describe('nothing valid left to ask about', () => {
  it('ends the episode explicitly instead of looping on an empty set', () => {
    const { capture, advance } = machine();

    capture.recordNoValidSymbols('every tracked symbol was refused (3 of 3)');

    expect(capture.status.state).toBe('NO_VALID_SYMBOLS');
    expect(capture.isTerminal).toBe(true);
    expect(capture.status.lastError).toContain('every tracked symbol was refused');

    let allowed = 0;
    for (let cycle = 0; cycle < 100; cycle += 1) {
      if (capture.shouldAttempt()) allowed += 1;
      advance(1000);
    }
    expect(allowed).toBe(0);
  });
});

describe('a new trading date starts clean', () => {
  it('resets after a degraded session', () => {
    const { capture, advance } = machine();

    for (let failure = 0; failure < 5; failure += 1) {
      capture.noteAttempt();
      capture.recordFailure({ detail: 'Alpaca HTTP 500' });
      advance(BACKOFF[Math.min(failure, BACKOFF.length - 1)]);
    }
    expect(capture.status.state).toBe('DEGRADED');

    capture.beginTradingDate('2026-08-21');

    expect(capture.status.state).toBe('PENDING');
    expect(capture.status.attempts).toBe(0);
    expect(capture.status.consecutiveFailures).toBe(0);
    expect(capture.status.lastError).toBeNull();
    expect(capture.shouldAttempt()).toBe(true);
  });

  it('resets after a terminal session, because yesterday is not evidence', () => {
    const { capture } = machine();
    capture.recordNoValidSymbols('every tracked symbol was refused');
    expect(capture.isTerminal).toBe(true);

    capture.beginTradingDate('2026-08-21');

    expect(capture.isTerminal).toBe(false);
    expect(capture.shouldAttempt()).toBe(true);
  });

  it('is idempotent for the date it is already on', () => {
    const { capture } = machine();
    capture.noteAttempt();
    capture.recordSuccess(214);

    capture.beginTradingDate('2026-08-20');

    // A flush tick must not reset the day it is in the middle of.
    expect(capture.status.state).toBe('CAPTURED');
  });
});

describe('one invalid member, the rest captured, the episode latched', () => {
  it('quarantines the offender and latches on the valid subset', async () => {
    const { capture } = machine();
    const admission = new SymbolAdmission({
      knownSymbols: () => new Set(['BEEM', 'EVAX', 'OBSERVED PM']),
    });

    const bad = (symbol: string) => Object.assign(new Error('http'), { __symbol: symbol });
    const request = vi.fn(async (symbols: string[]) => {
      if (symbols.includes('OBSERVED PM')) throw bad('OBSERVED PM');
      return new Map(symbols.map((symbol) => [symbol, { dailyBar: { c: 1 } }]));
    });

    const { accepted } = admission.validate(['BEEM', 'OBSERVED PM', 'EVAX'], 'rth-close-capture');
    capture.noteAttempt();
    const snapshots = await isolateInvalidSymbols({
      symbols: accepted,
      request,
      invalidSymbol: (error) => (error as { __symbol?: string }).__symbol ?? null,
      onQuarantine: (symbol) =>
        admission.reject(symbol, 'rth-close-capture', 'provider rejected: invalid symbol'),
      empty: () => new Map(),
    });
    capture.recordSuccess(snapshots.size);

    expect([...snapshots.keys()]).toEqual(['BEEM', 'EVAX']);
    expect(capture.status.state).toBe('CAPTURED');
    expect(capture.status.capturedSymbols).toBe(2);
    expect(admission.has('OBSERVED PM')).toBe(true);

    // And the next cycle re-validates against the quarantine, so the offender
    // is gone from the request rather than merely gone from the response.
    expect(admission.validate(['BEEM', 'OBSERVED PM'], 'rth-close-capture').accepted).toEqual([
      'BEEM',
    ]);
  });
});
