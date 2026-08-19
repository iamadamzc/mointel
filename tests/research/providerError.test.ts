import { describe, expect, it } from 'vitest';

import {
  BILLING_ERROR_CODES,
  describeFailure,
  readProviderFailure,
} from '@/lib/research/providerError';

/**
 * Telling "slow down" apart from "the account is empty".
 *
 * On 19 August the desk recorded 47 identical `HTTP 429`s. They read exactly
 * like SEC throttling, were reported as such, and the real cause — an exhausted
 * OpenAI balance — only surfaced when the API was probed by hand. Waiting fixes
 * a rate limit and does nothing at all for a spent balance.
 */

function failed(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('reading a provider failure', () => {
  it('keeps the code and type', async () => {
    const failure = await readProviderFailure(
      failed(429, { error: { code: 'insufficient_quota', type: 'insufficient_quota' } }),
    );

    expect(failure.status).toBe(429);
    expect(failure.code).toBe('insufficient_quota');
    expect(failure.billing).toBe(true);
  });

  it('marks a genuine rate limit as not billing', async () => {
    const failure = await readProviderFailure(
      failed(429, { error: { code: 'rate_limit_exceeded', type: 'requests' } }),
    );

    expect(failure.billing).toBe(false);
    expect(describeFailure(failure)).toBe('HTTP 429 (rate_limit_exceeded)');
  });

  it('never quotes the message, however tempting', async () => {
    // The message can echo the request, and the request carries evidence.
    const failure = await readProviderFailure(
      failed(400, {
        error: {
          code: 'context_length_exceeded',
          type: 'invalid_request_error',
          message: 'Your input contained XOS 8-K exhibit text and a private prompt',
        },
      }),
    );

    expect(JSON.stringify(failure)).not.toContain('XOS');
    expect(JSON.stringify(failure)).not.toContain('prompt');
    expect(failure.code).toBe('context_length_exceeded');
  });

  it('rejects a code that is not enum-shaped', async () => {
    // "It should be an enum" is not the same as "it is".
    const failure = await readProviderFailure(
      failed(500, { error: { code: 'unexpected: the prompt was "buy XOS now"', type: 'x'.repeat(200) } }),
    );

    expect(failure.code).toBeNull();
    expect(failure.type).toBeNull();
    expect(describeFailure(failure)).toBe('HTTP 500');
  });

  it('survives a body that is not JSON at all', async () => {
    const failure = await readProviderFailure(new Response('<html>502</html>', { status: 502 }));

    expect(failure.status).toBe(502);
    expect(failure.code).toBeNull();
    expect(describeFailure(failure)).toBe('HTTP 502');
  });

  it('recognises the billing codes that mean money, not pace', () => {
    expect(BILLING_ERROR_CODES.has('insufficient_quota')).toBe(true);
    expect(BILLING_ERROR_CODES.has('credit_balance_exhausted')).toBe(true);
    expect(BILLING_ERROR_CODES.has('rate_limit_exceeded')).toBe(false);
  });

  it('distinguishes the two 429s in the text a job stores', async () => {
    const billing = await readProviderFailure(
      failed(429, { error: { code: 'insufficient_quota', type: 'insufficient_quota' } }),
    );
    const paced = await readProviderFailure(
      failed(429, { error: { code: 'rate_limit_exceeded', type: 'requests' } }),
    );

    // The whole point: these were indistinguishable, and they need opposite responses.
    expect(describeFailure(billing)).not.toBe(describeFailure(paced));
  });
});
