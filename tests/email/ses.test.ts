import { describe, expect, it } from 'vitest';

import { sendEmail, sendEmailBody, type OutgoingEmail } from '@/lib/email/ses';

const EMAIL: OutgoingEmail = {
  from: 'signin@tmitrader.com',
  to: 'someone@example.com',
  replyTo: 'desk@tmitrader.com',
  subject: 'Subject',
  text: 'Body',
};
const ENV = { SES_ACCESS_KEY_ID: 'AKIDTEST', SES_SECRET_ACCESS_KEY: 'test-secret-value-never-logged' };
const NOW = new Date('2026-10-17T03:00:00Z');

function recordingFetch(status: number, json: unknown) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(json), { status });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe('ses sendEmail', () => {
  it('builds the SES v2 SendEmail body with Reply-To', () => {
    const body = JSON.parse(sendEmailBody(EMAIL));
    expect(body.FromEmailAddress).toBe('signin@tmitrader.com');
    expect(body.Destination.ToAddresses).toEqual(['someone@example.com']);
    expect(body.ReplyToAddresses).toEqual(['desk@tmitrader.com']);
    expect(body.Content.Simple.Subject.Data).toBe('Subject');
    expect(body.Content.Simple.Body.Text.Data).toBe('Body');
    expect(body.Content.Simple.Body.Html).toBeUndefined();
  });

  it('posts a signed request to the us-east-1 endpoint and returns the message id', async () => {
    const { impl, calls } = recordingFetch(200, { MessageId: 'abc-123' });
    const result = await sendEmail(EMAIL, { env: ENV, fetchImpl: impl, now: NOW });
    expect(result).toEqual({ ok: true, messageId: 'abc-123' });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://email.us-east-1.amazonaws.com/v2/email/outbound-emails');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIDTEST\/20261017\/us-east-1\/ses\/aws4_request, /);
    expect(headers['x-amz-date']).toBe('20261017T030000Z');
  });

  it('fails closed, with a reason that never contains the secret, when SES refuses', async () => {
    const { impl } = recordingFetch(403, { message: 'denied' });
    const result = await sendEmail(EMAIL, { env: ENV, fetchImpl: impl, now: NOW });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain(ENV.SES_SECRET_ACCESS_KEY);
    expect(JSON.stringify(result)).toContain('403');
  });

  it('fails closed when the network throws', async () => {
    const impl = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const result = await sendEmail(EMAIL, { env: ENV, fetchImpl: impl, now: NOW });
    expect(result.ok).toBe(false);
  });

  it('sends nothing when the credentials are missing, and names the variables, not values', async () => {
    const { impl, calls } = recordingFetch(200, { MessageId: 'x' });
    const result = await sendEmail(EMAIL, { env: {}, fetchImpl: impl, now: NOW });
    expect(calls).toHaveLength(0);
    expect(result).toEqual({ ok: false, reason: 'SES_ACCESS_KEY_ID or SES_SECRET_ACCESS_KEY is not set' });
  });
});
