import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * /enter renders ONLY for `unaccepted`; every other state is sent where it
 * belongs, so the page reaches nothing. The rendered form posts the version
 * of the text actually shown.
 */

const state = vi.hoisted(() => ({
  admission: { state: 'anonymous' } as
    | { state: 'anonymous' }
    | { state: 'refused' | 'unaccepted' | 'admitted'; userId: number },
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'sid' }) }),
}));
const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT ${to}`);
});
const forbidden = vi.fn(() => {
  throw new Error('FORBIDDEN');
});
vi.mock('next/navigation', () => ({ redirect: (to: string) => redirect(to), forbidden: () => forbidden() }));
vi.mock('@/lib/auth/requestGate', () => ({ admissionForSession: () => state.admission }));

import EnterPage from '@/app/enter/page';
import { ENTRY_GATE, ENTRY_GATE_VERSION } from '@/lib/legal/entryGate';

beforeEach(() => {
  redirect.mockClear();
  forbidden.mockClear();
});

describe('/enter', () => {
  it('anonymous -> /signin', async () => {
    state.admission = { state: 'anonymous' };
    await expect(EnterPage()).rejects.toThrow('REDIRECT /signin');
  });

  it('refused -> forbidden (403)', async () => {
    state.admission = { state: 'refused', userId: 1 };
    await expect(EnterPage()).rejects.toThrow('FORBIDDEN');
  });

  it('already accepted -> /desk', async () => {
    state.admission = { state: 'admitted', userId: 1 };
    await expect(EnterPage()).rejects.toThrow('REDIRECT /desk');
  });

  it('unaccepted: the text from its one source, ACCEPT with the current version, DECLINE to sign-out', async () => {
    state.admission = { state: 'unaccepted', userId: 1 };
    const html = renderToStaticMarkup(await EnterPage());
    for (const paragraph of ENTRY_GATE.paragraphs) expect(html).toContain(paragraph);
    expect(html).toContain('action="/auth/accept"');
    expect(html).toContain(`name="version" value="${ENTRY_GATE_VERSION}"`);
    expect(html).toContain('action="/auth/signout"');
    expect(html).toContain('href="/terms"');
    expect(redirect).not.toHaveBeenCalled();
  });
});
