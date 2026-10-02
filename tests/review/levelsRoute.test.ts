import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The review mirror of /api/levels (his ruling 2026-10-02T03:14:33Z, "Research
 * adds levels to review links"). The guard is the real `guardReviewApi`,
 * unchanged; only the token store and the stored-levels read are stubbed, so
 * these tests exercise the route's own decisions and prove its body equals the
 * owner route's for the same request.
 */

const verify = vi.fn();
vi.mock('@/lib/review/tokens', () => ({ verifyReviewToken: (raw: string) => verify(raw) }));

const readStoredLevels = vi.fn();
vi.mock('@/lib/market/levelsRead', () => ({
  readStoredLevels: (...args: unknown[]) => readStoredLevels(...args),
}));
vi.mock('@/lib/market/store/historyStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/market/store/historyStore')>()),
  resolveHistoryDbPath: () => '/nowhere/history.db',
}));

import * as ownerRoute from '@/app/api/levels/route';
import * as reviewRoute from '@/app/review/[token]/api/levels/route';
import { REVIEW_HEADERS } from '@/lib/review/access';

const TOKEN = 'a'.repeat(32);
const ROW = { symbol: 'VEEA', levels: [{ price: 3.5 }], aboveAllStored: false };

const call = (query: string, token = TOKEN) =>
  reviewRoute.GET(new Request(`https://desk.example/review/${token}/api/levels${query}`), {
    params: Promise.resolve({ token }),
  });
const owner = (query: string) => ownerRoute.GET(new Request(`https://desk.example/api/levels${query}`));

function expectReviewHeaders(response: Response) {
  for (const [name, value] of Object.entries(REVIEW_HEADERS)) {
    expect(response.headers.get(name), name).toBe(value);
  }
}

beforeEach(() => {
  verify.mockReset();
  readStoredLevels.mockReset();
});

describe('review /api/levels', () => {
  it('refuses an unrecognised, revoked or expired token through the unchanged guard, and reads nothing', async () => {
    for (const [reason, status] of [['INVALID', 403], ['REVOKED', 403], ['EXPIRED', 410]] as const) {
      verify.mockReturnValue({ ok: false, reason });
      readStoredLevels.mockReturnValue(ROW);
      const response = await call('?symbol=VEEA');
      expect(response.status, reason).toBe(status);
      expectReviewHeaders(response);
      expect(JSON.stringify(await response.json())).not.toContain('VEEA');
    }
    expect(readStoredLevels).not.toHaveBeenCalled();
  });

  it('serves the same stored row as the owner route, with the review headers and a JSON type', async () => {
    verify.mockReturnValue({ ok: true, token: { id: 1 } });
    readStoredLevels.mockReturnValue(ROW);
    const review = await call('?symbol=veea');
    const own = await owner('?symbol=veea');
    expect(review.status).toBe(200);
    expectReviewHeaders(review);
    expect(review.headers.get('Content-Type')).toContain('application/json');
    expect(await review.text()).toBe(await own.text());
    expect(readStoredLevels.mock.calls[0]![2]).toBe('VEEA');
  });

  it('absent is 200 + null, as on the owner route (the section reads 404 as "not mounted")', async () => {
    verify.mockReturnValue({ ok: true, token: { id: 1 } });
    readStoredLevels.mockReturnValue(null);
    const response = await call('?symbol=VEEA');
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
    readStoredLevels.mockImplementation(() => {
      throw new Error('locked');
    });
    const failed = await call('?symbol=VEEA');
    expect(failed.status).toBe(200);
    expect(await failed.json()).toBeNull();
  });

  it('a bad symbol is 400 with the review headers, and reads nothing', async () => {
    verify.mockReturnValue({ ok: true, token: { id: 1 } });
    const response = await call('?symbol=');
    expect(response.status).toBe(400);
    expectReviewHeaders(response);
    expect(readStoredLevels).not.toHaveBeenCalled();
  });

  it('exports GET and no mutating handler', () => {
    const handlers = Object.keys(reviewRoute).filter((name) => /^[A-Z]+$/.test(name));
    expect(handlers).toEqual(['GET']);
  });
});
