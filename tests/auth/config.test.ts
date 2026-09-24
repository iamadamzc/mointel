import { describe, expect, it } from 'vitest';

import { OAUTH_FLOW_COOKIE, loadAuthConfig } from '@/lib/auth/config';

const complete: Record<string, string | undefined> = {
  GOOGLE_CLIENT_ID: '  client-123  ',
  GOOGLE_CLIENT_SECRET: 'secret-abc',
  OAUTH_REDIRECT_URI: 'https://tmitrader.com/auth/callback/google',
};

describe('loadAuthConfig', () => {
  it('returns the three values, trimmed', () => {
    const config = loadAuthConfig(complete);
    expect(config.clientId).toBe('client-123');
    expect(config.clientSecret).toBe('secret-abc');
    expect(config.redirectUri).toBe('https://tmitrader.com/auth/callback/google');
  });

  /*
   * Fails closed AND names what is missing. The message is a server-log line, so
   * it is allowed to be specific; the property under test is that a
   * half-configured deployment cannot silently produce a broken sign-in URL.
   */
  it.each(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OAUTH_REDIRECT_URI'])(
    'throws and names %s when it is absent',
    (missing) => {
      const env = { ...complete };
      delete env[missing];
      expect(() => loadAuthConfig(env)).toThrow(missing);
    },
  );

  it('treats a whitespace-only value as missing', () => {
    expect(() => loadAuthConfig({ ...complete, GOOGLE_CLIENT_SECRET: '   ' })).toThrow(
      'GOOGLE_CLIENT_SECRET',
    );
  });

  /*
   * Pinned deliberately: this string is the contract with the privacy policy,
   * which documents the flow cookie by name. Changing it here without changing
   * the policy is the defect, so the pin is the reminder they move together.
   */
  it('names the flow cookie mointel_oauth', () => {
    expect(OAUTH_FLOW_COOKIE).toBe('mointel_oauth');
  });
});
