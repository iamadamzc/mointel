import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * /desk at the point it must answer: the gate decides BEFORE any desk data is
 * read, anonymous goes to /signin, refused is forbidden() (the 403 and the
 * NotAdmitted screen via app/forbidden.tsx), admitted gets the board.
 */

const state = vi.hoisted(() => ({
  admission: { state: 'anonymous' } as
    | { state: 'anonymous' }
    | { state: 'refused' | 'unaccepted' | 'admitted'; userId: number },
  cookie: undefined as string | undefined,
  seen: [] as Array<string | undefined>,
  owner: false,
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'mointel_session' && state.cookie ? { value: state.cookie } : undefined) }),
}));
const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT ${to}`);
});
const forbidden = vi.fn(() => {
  throw new Error('FORBIDDEN');
});
vi.mock('next/navigation', () => ({ redirect: (to: string) => redirect(to), forbidden: () => forbidden() }));
vi.mock('@/lib/auth/requestGate', () => ({
  admissionForSession: (id: string | undefined) => {
    state.seen.push(id);
    return state.admission;
  },
  isOwnerAdmission: () => state.owner,
}));
const getDashboardState = vi.fn(async () => ({ board: 'data' }));
vi.mock('@/lib/data', () => ({ getDashboardState: () => getDashboardState() }));
vi.mock('@/components/DashboardShell', () => ({ DashboardShell: () => null }));

import DashboardPage from '@/app/desk/page';

beforeEach(() => {
  redirect.mockClear();
  forbidden.mockClear();
  getDashboardState.mockClear();
  state.seen.length = 0;
  state.cookie = undefined;
  state.owner = false;
});

type Rendered = { props: { mode: { canRetryResearch: boolean; readOnly: boolean; apiBase: string } } };

describe('/desk', () => {
  it('anonymous: redirects to /signin and reads no desk data', async () => {
    state.admission = { state: 'anonymous' };
    await expect(DashboardPage()).rejects.toThrow('REDIRECT /signin');
    expect(getDashboardState).not.toHaveBeenCalled();
    expect(forbidden).not.toHaveBeenCalled();
  });

  it('refused: forbidden(), never the board, and reads no desk data', async () => {
    state.cookie = 'sid';
    state.admission = { state: 'refused', userId: 7 };
    await expect(DashboardPage()).rejects.toThrow('FORBIDDEN');
    expect(redirect).not.toHaveBeenCalled();
    expect(getDashboardState).not.toHaveBeenCalled();
  });

  it('admitted: the board, with the session cookie the gate was given', async () => {
    state.cookie = 'sid';
    state.admission = { state: 'admitted', userId: 7 };
    await expect(DashboardPage()).resolves.toBeTruthy();
    expect(state.seen).toEqual(['sid']);
    expect(getDashboardState).toHaveBeenCalledTimes(1);
    expect(redirect).not.toHaveBeenCalled();
    expect(forbidden).not.toHaveBeenCalled();
  });

  it('unaccepted: redirects to /enter (the entry gate) and reads no desk data', async () => {
    state.cookie = 'sid';
    state.admission = { state: 'unaccepted', userId: 7 };
    await expect(DashboardPage()).rejects.toThrow('REDIRECT /enter');
    expect(getDashboardState).not.toHaveBeenCalled();
    expect(forbidden).not.toHaveBeenCalled();
  });

  it('tells the page the owner may retry research (his ruling 2026-10-05)', async () => {
    state.cookie = 'sid';
    state.admission = { state: 'admitted', userId: 7 };
    state.owner = true;
    const page = (await DashboardPage()) as unknown as Rendered;
    expect(page.props.mode).toMatchObject({ apiBase: '/api', readOnly: false, canRetryResearch: true });
  });

  it('tells the page every other admitted user may not', async () => {
    state.cookie = 'sid';
    state.admission = { state: 'admitted', userId: 8 };
    state.owner = false;
    const page = (await DashboardPage()) as unknown as Rendered;
    expect(page.props.mode.canRetryResearch).toBe(false);
  });
});
