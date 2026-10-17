import { describe, expect, it } from 'vitest';

import { amzDate, signRequest } from '@/lib/email/sigv4';

/*
 * AWS's published Signature Version 4 example ("get-vanilla" in the AWS SigV4
 * test suite): GET / on example.amazonaws.com, region us-east-1, service
 * "service", at 2015-08-30T12:36:00Z, with AWS's documentation key pair. The
 * expected Authorization value is AWS's, not one computed by this code.
 */
const EXAMPLE_CREDENTIALS = {
  accessKeyId: 'AKIDEXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
};
const EXAMPLE_NOW = new Date('2015-08-30T12:36:00Z');

describe('sigv4', () => {
  it('formats the x-amz-date stamp', () => {
    expect(amzDate(EXAMPLE_NOW)).toBe('20150830T123600Z');
  });

  it("matches AWS's published get-vanilla signature", () => {
    const authorization = signRequest(
      {
        method: 'GET',
        path: '/',
        headers: { Host: 'example.amazonaws.com', 'X-Amz-Date': amzDate(EXAMPLE_NOW) },
        body: '',
      },
      EXAMPLE_CREDENTIALS,
      { region: 'us-east-1', service: 'service', now: EXAMPLE_NOW },
    );
    expect(authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, ' +
        'SignedHeaders=host;x-amz-date, ' +
        'Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31',
    );
  });

  it('changes the signature when the body changes (the body is signed)', () => {
    const base = {
      method: 'POST',
      path: '/v2/email/outbound-emails',
      headers: { host: 'email.us-east-1.amazonaws.com', 'x-amz-date': amzDate(EXAMPLE_NOW) },
    };
    const options = { region: 'us-east-1', service: 'ses', now: EXAMPLE_NOW };
    const a = signRequest({ ...base, body: '{"a":1}' }, EXAMPLE_CREDENTIALS, options);
    const b = signRequest({ ...base, body: '{"a":2}' }, EXAMPLE_CREDENTIALS, options);
    expect(a).not.toBe(b);
  });

  it('refuses a request with no host header', () => {
    expect(() =>
      signRequest(
        { method: 'GET', path: '/', headers: { 'x-amz-date': amzDate(EXAMPLE_NOW) }, body: '' },
        EXAMPLE_CREDENTIALS,
        { region: 'us-east-1', service: 'service', now: EXAMPLE_NOW },
      ),
    ).toThrow(/host/);
  });
});
