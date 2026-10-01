import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The review mirror of /api/reports (his "1 yes", 2026-10-01T02:36:53Z): the
 * guard is the real `guardReviewApi`, unchanged; only the token store and the
 * report read are stubbed, so these tests exercise the route's own decisions.
 */

const verify = vi.fn();
vi.mock('@/lib/review/tokens', () => ({ verifyReviewToken: (raw: string) => verify(raw) }));

const getSessionReports = vi.fn();
vi.mock('@/lib/market/readModel', () => ({ getSessionReports: () => getSessionReports() }));

import * as ownerRoute from '@/app/api/reports/route';
import * as reviewRoute from '@/app/review/[token]/api/reports/route';
import { REVIEW_HEADERS } from '@/lib/review/access';

const TOKEN = 'a'.repeat(32);
const PAYLOAD = { reports: [{ kind: 'PREMARKET', sections: [{ heading: 'x', lines: [] }] }], ranges: ['1-20'] };

const call = (token = TOKEN) =>
  reviewRoute.GET(new Request(`https://desk.example/review/${token}/api/reports`), {
    params: Promise.resolve({ token }),
  });

function expectReviewHeaders(response: Response) {
  for (const [name, value] of Object.entries(REVIEW_HEADERS)) {
    expect(response.headers.get(name), name).toBe(value);
  }
}

beforeEach(() => {
  verify.mockReset();
  getSessionReports.mockReset();
});

describe('review /api/reports', () => {
  it('refuses an unrecognised, revoked or expired token through the unchanged guard, and reads nothing', async () => {
    for (const [reason, status] of [['INVALID', 403], ['REVOKED', 403], ['EXPIRED', 410]] as const) {
      verify.mockReturnValue({ ok: false, reason });
      getSessionReports.mockReturnValue(PAYLOAD);
      const response = await call();
      expect(response.status, reason).toBe(status);
      expectReviewHeaders(response);
      expect(JSON.stringify(await response.json())).not.toContain('PREMARKET');
    }
    expect(getSessionReports).not.toHaveBeenCalled();
  });

  it('serves the same stored payload as the owner route, with the review headers', async () => {
    verify.mockReturnValue({ ok: true, token: { id: 1 } });
    getSessionReports.mockReturnValue(PAYLOAD);
    const review = await call();
    const owner = await ownerRoute.GET();
    expect(review.status).toBe(200);
    expectReviewHeaders(review);
    expect(await review.text()).toBe(await owner.text());
  });

  it('is 404 { available: false } when no report table exists, as on the owner route', async () => {
    verify.mockReturnValue({ ok: true, token: { id: 1 } });
    getSessionReports.mockReturnValue(null);
    const response = await call();
    expect(response.status).toBe(404);
    expectReviewHeaders(response);
    expect(await response.json()).toEqual({ available: false });
  });

  it('exports GET and no mutating handler', () => {
    const handlers = Object.keys(reviewRoute).filter((name) => /^[A-Z]+$/.test(name));
    expect(handlers).toEqual(['GET']);
  });
});
