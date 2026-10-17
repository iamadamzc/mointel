/**
 * Sends one email through Amazon SES (API v2, SendEmail), signed with SigV4.
 *
 * ONE KIND OF FAILURE, ONE ANSWER. Every way this can fail -- missing
 * credentials, a network error, a timeout, an HTTP error from SES -- returns
 * `{ ok: false }` with a reason meant for the server log only. The sign-in page
 * shows the same "we couldn't send the email" line for all of them, and for any
 * address, so no response can reveal which addresses have accounts.
 *
 * CREDENTIALS COME FROM THE ENVIRONMENT BY NAME and are never logged, echoed or
 * placed in an error message. The reason strings name the variable, not its
 * value.
 */

import { amzDate, signRequest } from '@/lib/email/sigv4';

export const SES_REGION = 'us-east-1';
const SES_HOST = `email.${SES_REGION}.amazonaws.com`;
const SES_PATH = '/v2/email/outbound-emails';
const SEND_TIMEOUT_MS = 10_000;

export interface OutgoingEmail {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html?: string;
}

export type SendResult = { ok: true; messageId: string } | { ok: false; reason: string };

export interface SesDeps {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  now?: Date;
}

/** The exact JSON SES v2 SendEmail takes. Exported for the test. */
export function sendEmailBody(email: OutgoingEmail): string {
  const body: Record<string, { Data: string; Charset: string }> = {
    Text: { Data: email.text, Charset: 'UTF-8' },
  };
  if (email.html !== undefined) body.Html = { Data: email.html, Charset: 'UTF-8' };
  return JSON.stringify({
    FromEmailAddress: email.from,
    Destination: { ToAddresses: [email.to] },
    ReplyToAddresses: [email.replyTo],
    Content: {
      Simple: {
        Subject: { Data: email.subject, Charset: 'UTF-8' },
        Body: body,
      },
    },
  });
}

export async function sendEmail(email: OutgoingEmail, deps: SesDeps = {}): Promise<SendResult> {
  const env = deps.env ?? process.env;
  const accessKeyId = env.SES_ACCESS_KEY_ID;
  const secretAccessKey = env.SES_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    return { ok: false, reason: 'SES_ACCESS_KEY_ID or SES_SECRET_ACCESS_KEY is not set' };
  }

  const now = deps.now ?? new Date();
  const body = sendEmailBody(email);
  const headers: Record<string, string> = {
    host: SES_HOST,
    'content-type': 'application/json',
    'x-amz-date': amzDate(now),
  };
  const authorization = signRequest(
    { method: 'POST', path: SES_PATH, headers, body },
    { accessKeyId, secretAccessKey },
    { region: SES_REGION, service: 'ses', now },
  );

  const fetchImpl = deps.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(`https://${SES_HOST}${SES_PATH}`, {
      method: 'POST',
      headers: { ...headers, authorization },
      body,
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (error) {
    return { ok: false, reason: `ses request failed: ${error instanceof Error ? error.name : 'error'}` };
  }

  if (!response.ok) {
    // The response body can carry the request id and a message; keep only the status for the log.
    return { ok: false, reason: `ses answered ${response.status}` };
  }
  let messageId = '';
  try {
    const parsed = (await response.json()) as { MessageId?: unknown };
    if (typeof parsed.MessageId === 'string') messageId = parsed.MessageId;
  } catch {
    // A 200 with an unreadable body still means SES accepted it.
  }
  return { ok: true, messageId };
}
