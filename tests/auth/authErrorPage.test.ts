import { describe, expect, it } from 'vitest';

import { authErrorPage } from '@/lib/auth/authErrorPage';

describe('authErrorPage', () => {
  it.each([
    [400, 'didn’t work'],
    [503, 'Google didn’t respond'],
    [500, 'our side'],
  ])('%i renders a page with the right heading and a way back', (status, fragment) => {
    const html = authErrorPage(status);
    expect(html).toContain('<!doctype html>');
    expect(html).toContain(fragment);
    expect(html).toContain('href="/signin"');
  });

  it('falls back for an unmapped status', () => {
    expect(authErrorPage(418)).toContain('could not be completed');
  });

  /*
   * The whole point of an inline, self-contained error page: it makes NO
   * external request, held to on the very page that renders when things break.
   * A stylesheet or font pulled from a CDN would hand a visitor's IP to a third
   * party on the page that argues we do not do that.
   */
  it('makes no external request', () => {
    const html = authErrorPage(500);
    expect(html).not.toMatch(/https?:\/\//);
  });
});
