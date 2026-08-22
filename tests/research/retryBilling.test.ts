import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_MAX_BACKOFF_MS,
  backoffMs,
  evaluateRetry,
  nextRetryState,
  type RetryState,
} from '@/lib/research/retry';
import { describeFailure, isBillingError } from '@/lib/research/providerError';

/**
 * A top-up has to heal the board on its own.
 *
 * Twice — 19 and 21 August — the OpenAI balance emptied, every Top-12 name
 * failed three times against unchanged evidence, and the retry policy left all
 * of them terminally blocked. Adding money fixed the provider and nothing else:
 * the desk stayed dark until someone released each ticker by hand. On the 21st
 * that was 58 failed jobs across 21 tickers with the whole board dark from
 * 04:00 to 08:00 ET.
 *
 * The failure was never about the tickers. These tests pin that distinction.
 */

const FINGERPRINT = 'evidence-abc';
const NOW = new Date('2026-08-21T12:00:00.000Z');

/** What the interpreter actually records when the account is empty. */
const BILLING_ERROR = describeFailure({
  status: 429,
  code: 'credit_balance_exhausted',
  type: null,
  billing: true,
});

/** What it records when the provider genuinely means "slow down". */
const RATE_LIMIT_ERROR = describeFailure({
  status: 429,
  code: 'rate_limit_exceeded',
  type: 'requests',
  billing: false,
});

function stateAfter(failures: number, error: string): RetryState {
  let state: RetryState | null = null;
  for (let i = 0; i < failures; i += 1) {
    state = nextRetryState({
      previous: state,
      ticker: 'JUNS',
      tradingDate: '2026-08-21',
      evidenceFingerprint: FINGERPRINT,
      error,
      now: new Date(NOW.getTime() - (failures - i) * 60_000),
    });
  }
  return state!;
}

describe('recognising a billing failure after the fact', () => {
  it('reads the marker back out of a recorded error line', () => {
    expect(isBillingError(BILLING_ERROR)).toBe(true);
    expect(isBillingError('HTTP 429 (insufficient_quota)')).toBe(true);
  });

  it('does not mistake a rate limit for an empty account', () => {
    expect(isBillingError(RATE_LIMIT_ERROR)).toBe(false);
    expect(isBillingError('HTTP 429')).toBe(false);
    expect(isBillingError(null)).toBe(false);
  });
});

describe('the attempt ceiling', () => {
  it('still stops a name that keeps failing on its own evidence', () => {
    const verdict = evaluateRetry({
      state: stateAfter(DEFAULT_MAX_ATTEMPTS, RATE_LIMIT_ERROR),
      currentFingerprint: FINGERPRINT,
      now: NOW,
    });

    expect(verdict.allow).toBe(false);
    expect(verdict.blocked).toBe(true);
  });

  it('never becomes terminal for a billing failure', () => {
    const state = stateAfter(DEFAULT_MAX_ATTEMPTS, BILLING_ERROR);

    // At the ceiling it is deferred, not given up on. The distinction is the
    // whole point: `blocked` is what needs a person, and this does not.
    const during = evaluateRetry({ state, currentFingerprint: FINGERPRINT, now: NOW });
    expect(during.blocked).toBe(false);
    expect(during.allow).toBe(false);

    // And once the backoff elapses it goes again, which is what a name past the
    // ceiling on any other error would never do.
    const after = evaluateRetry({
      state,
      currentFingerprint: FINGERPRINT,
      now: new Date(Date.parse(state.nextAttemptAt!) + 1_000),
    });
    expect(after.allow).toBe(true);
    expect(after.reason).toContain('billing');
  });

  it('holds even long past the ceiling, because money is fixed elsewhere', () => {
    // Four hours of a five-second reconciliation loop, as on 21 August.
    const verdict = evaluateRetry({
      state: stateAfter(20, BILLING_ERROR),
      currentFingerprint: FINGERPRINT,
      now: NOW,
    });

    expect(verdict.blocked).toBe(false);
  });

  it('blocks again once the name fails for its own reasons', () => {
    // Billing failures first, then a real one: the ceiling reasserts itself.
    let state = stateAfter(3, BILLING_ERROR);
    state = nextRetryState({
      previous: state,
      ticker: 'JUNS',
      tradingDate: '2026-08-21',
      evidenceFingerprint: FINGERPRINT,
      error: RATE_LIMIT_ERROR,
      now: NOW,
    });

    const verdict = evaluateRetry({
      state,
      currentFingerprint: FINGERPRINT,
      now: new Date(NOW.getTime() + DEFAULT_MAX_BACKOFF_MS * 2),
    });

    expect(verdict.blocked).toBe(true);
  });
});

describe('backoff', () => {
  it('doubles as before within the ordinary ceiling', () => {
    expect(backoffMs(1)).toBe(30_000);
    expect(backoffMs(2)).toBe(60_000);
    expect(backoffMs(3)).toBe(120_000);
  });

  it('is capped, so a long outage cannot schedule a name past the close', () => {
    expect(backoffMs(50)).toBe(DEFAULT_MAX_BACKOFF_MS);
    // 2 ** 2000 is Infinity; an unclamped Date built from it throws.
    expect(backoffMs(2000)).toBe(DEFAULT_MAX_BACKOFF_MS);
  });

  it('keeps nextAttemptAt a representable date at any attempt count', () => {
    const state = stateAfter(60, BILLING_ERROR);
    expect(state.nextAttemptAt).not.toBeNull();
    expect(Number.isNaN(Date.parse(state.nextAttemptAt!))).toBe(false);
  });
});

describe('the morning of 21 August', () => {
  it('releases the whole board once the balance is topped up', () => {
    const board = ['JUNS', 'IBG', 'JXG', 'BCCQ', 'ZKH', 'MZYX', 'BWIV'];

    const blocked = board.filter((ticker) => {
      const state = { ...stateAfter(4, BILLING_ERROR), ticker };
      // A top-up changes nothing the desk can see: same evidence, same errors
      // on file. Only the backoff has elapsed.
      return evaluateRetry({
        state,
        currentFingerprint: FINGERPRINT,
        now: new Date(NOW.getTime() + DEFAULT_MAX_BACKOFF_MS + 1_000),
      }).allow === false;
    });

    expect(blocked).toEqual([]);
  });
});
