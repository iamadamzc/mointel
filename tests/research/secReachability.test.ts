import { describe, expect, it } from 'vitest';

import { SecClient } from '../../lib/research/sec/client';

const CONFIG = {
  userAgent: 'Test Desk test@example.com',
  maxRequestsPerSecond: 50,
  activePollSeconds: 60,
};

function response(body: string, status = 200): Response {
  return new Response(body, { status });
}

function client(fetchImpl: typeof fetch) {
  return new SecClient({
    config: CONFIG as never,
    fetchImpl,
    sleep: async () => {},
  });
}

/**
 * On 2026-09-04 the desk reported `secAvailable: true` for hours while every
 * request from that box returned 403, because secAvailability only checks that
 * a User-Agent string exists and contains an "@". Two threads spent a morning
 * reasoning about an outage the health endpoint could not have seen either way.
 *
 * These assert the record reports what SEC ACTUALLY DID.
 */
describe('SEC reachability is observed, not configured', () => {
  /**
   * The load-bearing one. A client that has made no request has observed
   * nothing, and "nothing observed" must not collapse into "fine" — that
   * collapse IS the defect. UNKNOWN is a state, not a default.
   */
  it('reports UNKNOWN before any request, not REACHABLE', async () => {
    const c = client(async () => response('{}'));
    expect(c.reachability.state).toBe('UNKNOWN');
  });

  it('reports REACHABLE after a success', async () => {
    const c = client(async () => response('{"ok":true}'));
    await c.get('https://data.sec.gov/x.json');
    expect(c.reachability.state).toBe('REACHABLE');
  });

  /**
   * The case that actually happened: 403 on every attempt until the client
   * gives up. Before this record that was invisible to health.
   */
  it('reports UNREACHABLE with the status after every attempt is refused', async () => {
    const c = client(async () => response('blocked', 403));
    await expect(c.get('https://www.sec.gov/files/x.json')).rejects.toThrow();

    const r = c.reachability;
    expect(r.state).toBe('UNREACHABLE');
    if (r.state !== 'UNREACHABLE') throw new Error('unreachable');
    expect(r.status).toBe(403);
    expect(r.consecutiveFailures).toBe(1);
  });

  /**
   * A 404 is SEC ANSWERING. Recording it as an outage would make a missing
   * filing look like a blocked desk, which is the same conflation in the
   * opposite direction.
   */
  it('treats a 404 as reachable, because an answer is not an outage', async () => {
    const c = client(async () => response('not found', 404));
    await expect(c.get('https://data.sec.gov/missing.json')).rejects.toThrow();
    expect(c.reachability.state).toBe('REACHABLE');
  });

  it('recovers to REACHABLE and clears the failure count after a success', async () => {
    let fail = true;
    const c = client(async () => (fail ? response('blocked', 403) : response('{}')));

    await expect(c.get('https://www.sec.gov/a.json')).rejects.toThrow();
    expect(c.reachability.state).toBe('UNREACHABLE');

    fail = false;
    await c.get('https://www.sec.gov/b.json');

    const r = c.reachability;
    expect(r.state).toBe('REACHABLE');

    // And a later failure starts counting from one again rather than resuming.
    fail = true;
    await expect(c.get('https://www.sec.gov/c.json')).rejects.toThrow();
    const again = c.reachability;
    if (again.state !== 'UNREACHABLE') throw new Error('expected UNREACHABLE');
    expect(again.consecutiveFailures).toBe(1);
  });
});
