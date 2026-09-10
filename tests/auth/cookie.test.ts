import { describe, expect, it } from 'vitest';

import {
  OAUTH_FLOW_COOKIE_SECONDS,
  SESSION_COOKIE,
  clearedFlowCookie,
  clearedSessionCookie,
  cookieSecureDefault,
  flowCookie,
  sessionCookie,
  sessionCookieAttributes,
} from '@/lib/auth/cookie';

describe('session cookie attributes', () => {
  /*
   * Strict looks like the careful choice and silently breaks sign-in: the
   * return from the provider is a top-level cross-site navigation, and a Strict
   * cookie is not sent on one, so the callback cannot read the state it set.
   * Pinned here because it is the value a reviewer would "tighten".
   */
  it('is SameSite=Lax and never Strict', () => {
    expect(sessionCookieAttributes(3600).sameSite).toBe('Lax');
    expect(sessionCookie('abc', 3600)).toContain('SameSite=Lax');
    expect(sessionCookie('abc', 3600)).not.toContain('Strict');
  });

  it('is HttpOnly and path-wide', () => {
    const value = sessionCookie('abc', 3600);
    expect(value).toContain('HttpOnly');
    expect(value).toContain('Path=/');
  });

  it('carries the session id under the expected name', () => {
    expect(sessionCookie('abc', 3600).startsWith(`${SESSION_COOKIE}=abc;`)).toBe(true);
  });
});

describe('the Secure flag', () => {
  /*
   * Fails closed: forgetting to configure production yields a cookie that is
   * too strict rather than one that is too loose.
   */
  it('defaults to Secure when nothing is configured', () => {
    expect(cookieSecureDefault({})).toBe(true);
    expect(sessionCookie('abc', 3600, true)).toContain('Secure');
  });

  it('is disabled only by an explicit opt-out', () => {
    expect(cookieSecureDefault({ AUTH_COOKIE_INSECURE: '1' })).toBe(false);
    expect(sessionCookie('abc', 3600, false)).not.toContain('Secure');
  });

  it('is not disabled by a near-miss value', () => {
    expect(cookieSecureDefault({ AUTH_COOKIE_INSECURE: 'true' })).toBe(true);
    expect(cookieSecureDefault({ AUTH_COOKIE_INSECURE: '' })).toBe(true);
    expect(cookieSecureDefault({ AUTH_COOKIE_INSECURE: '0' })).toBe(true);
  });
});

describe('clearing', () => {
  /*
   * A browser matches a clearing cookie on name, path and domain. A clear that
   * forgets Path=/ leaves the original in place and the user stays signed in
   * after signing out -- which looks like a working sign-out.
   */
  it('clears with the same attributes it was set with', () => {
    const cleared = clearedSessionCookie(true);
    expect(cleared).toContain('Path=/');
    expect(cleared).toContain('Max-Age=0');
    expect(cleared).toContain('HttpOnly');
    expect(cleared).toContain('SameSite=Lax');
    expect(cleared).toContain('Secure');
    expect(cleared.startsWith(`${SESSION_COOKIE}=;`)).toBe(true);
  });
});

describe('the OAuth flow cookie', () => {
  it('is Lax so it survives the return from the provider', () => {
    expect(flowCookie('mointel_oauth_state', 'xyz')).toContain('SameSite=Lax');
  });

  it('is short-lived rather than session-length', () => {
    expect(OAUTH_FLOW_COOKIE_SECONDS).toBeLessThanOrEqual(900);
    expect(flowCookie('mointel_oauth_state', 'xyz')).toContain(
      `Max-Age=${OAUTH_FLOW_COOKIE_SECONDS}`,
    );
  });

  it('clears under its own name', () => {
    expect(clearedFlowCookie('mointel_oauth_state').startsWith('mointel_oauth_state=;')).toBe(true);
    expect(clearedFlowCookie('mointel_oauth_state')).toContain('Max-Age=0');
  });
});
