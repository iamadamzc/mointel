import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The desk's billing routes (Integration 42nd, 2026-10-17): signed-in, cross-site POSTs refused, Billing's library
 * called with the admitted user's id. The gate itself is enforced for every route by tests/auth/requestGate.test.ts.
 */

const gate = vi.hoisted(() => ({ refuse: false, userId: 7 as number | null, owner: false }));
const calls = vi.hoisted(() => ({ state: [] as number[], cancel: [] as number[], remove: [] as number[] }));

vi.mock('@/lib/auth/requestGate', () => ({
  gateApiRequest: () => (gate.refuse ? new Response(JSON.stringify({ error: 'not admitted' }), { status: 401 }) : null),
  sessionIdFromCookieHeader: () => 'sid',
  admissionForSession: () => (gate.userId === null ? { state: 'anonymous' } : { state: 'admitted', userId: gate.userId }),
}));
vi.mock('@/lib/auth/db', () => ({ getIdentityDb: () => ({}) }));
vi.mock('@/lib/billing/stripeClient', () => ({ stripeFromEnv: () => ({}) }));
vi.mock('@/lib/billing/store', () => ({ isDeskOwner: () => gate.owner }));
vi.mock('@/lib/billing/account', () => ({
  billingStateFor: (_db: unknown, userId: number) => {
    calls.state.push(userId);
    return { door: 'ok', userId };
  },
  cancelAtPeriodEnd: async (_deps: unknown, userId: number) => {
    calls.cancel.push(userId);
    return { kind: 'cancelled', endsOn: '2026-11-17T01:00:00.000Z' };
  },
  removeDefaultCard: async (_deps: unknown, userId: number) => {
    calls.remove.push(userId);
    return { kind: 'refused_live_plan' };
  },
}));

import { crossSiteRefusal } from '@/lib/desk/billingRoutes';
import { POST as cancel } from '@/app/api/billing/cancel/route';
import { POST as removeCard } from '@/app/api/billing/card/remove/route';
import { GET as state } from '@/app/api/billing/state/route';

const req = (method: string, headers: Record<string, string> = {}) =>
  new Request('http://127.0.0.1:3000/api/billing/x', { method, headers: { host: 'tmitrader.com', ...headers } });

beforeEach(() => {
  gate.refuse = false;
  gate.userId = 7;
  gate.owner = false;
  calls.state = [];
  calls.cancel = [];
  calls.remove = [];
});

describe('crossSiteRefusal', () => {
  it('admits a same-site Origin and a request with none; refuses another site and an unreadable Origin', () => {
    expect(crossSiteRefusal(req('POST', { origin: 'https://tmitrader.com' }))).toBeNull();
    expect(crossSiteRefusal(req('POST'))).toBeNull();
    expect(crossSiteRefusal(req('POST', { origin: 'https://evil.example' }))?.status).toBe(403);
    expect(crossSiteRefusal(req('POST', { origin: 'not a url' }))?.status).toBe(403);
  });
});

describe('the routes', () => {
  it('state: Billing reader for the admitted user, no-store', async () => {
    const response = await state(req('GET'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ door: 'ok', userId: 7 });
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(calls.state).toEqual([7]);
  });

  it('the owner gets no billing state (null): the desk shows nothing billing-related, the Billing button included', async () => {
    gate.owner = true;
    const response = await state(req('GET'));
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
    expect(calls.state).toEqual([]);
  });

  it('a request the gate refuses never reaches the library', async () => {
    gate.refuse = true;
    expect((await state(req('GET'))).status).toBe(401);
    expect((await cancel(req('POST'))).status).toBe(401);
    expect(calls.state).toEqual([]);
    expect(calls.cancel).toEqual([]);
  });

  it('cancel: one step for the admitted user; a cross-site POST is refused before the library', async () => {
    const ok = await cancel(req('POST', { origin: 'https://tmitrader.com' }));
    expect(await ok.json()).toEqual({ kind: 'cancelled', endsOn: '2026-11-17T01:00:00.000Z' });
    expect(calls.cancel).toEqual([7]);
    expect((await cancel(req('POST', { origin: 'https://evil.example' }))).status).toBe(403);
    expect(calls.cancel).toEqual([7]);
  });

  it('remove card: a live plan is refused with 409', async () => {
    const response = await removeCard(req('POST'));
    expect(response.status).toBe(409);
    expect(calls.remove).toEqual([7]);
  });
});
