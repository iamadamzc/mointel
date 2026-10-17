/**
 * AWS Signature Version 4, for the one call the desk makes to Amazon SES.
 *
 * WRITTEN BY HAND RATHER THAN TAKEN FROM THE AWS SDK, deliberately: the SDK for
 * SES v2 brings dozens of packages into production for a single POST, and every
 * one of them is a lock entry to prove and a supply-chain surface to carry.
 * Signing is fully specified ("Create a signed AWS API request", AWS General
 * Reference) and deterministic, so it is tested against AWS's own published
 * example (tests/email/sigv4.test.ts) rather than trusted.
 *
 * SCOPE: one request at a time, headers given by the caller, a body hashed as
 * sent. Query strings are not used by SES v2 SendEmail and are not supported
 * beyond an empty one; a caller that needs them must extend the canonical query
 * builder and its test, not pass them through unsigned.
 */

import crypto from 'node:crypto';

export interface SigV4Credentials {
  accessKeyId: string;
  secretAccessKey: string;
}

export interface SigV4Request {
  method: string;
  /** Absolute path, already URI-encoded as it will be sent, e.g. "/v2/email/outbound-emails". */
  path: string;
  /** Header names in any case; values are trimmed. Must include "host". */
  headers: Record<string, string>;
  body: string;
}

export interface SigV4Options {
  region: string;
  service: string;
  /** Signing time. The caller sets x-amz-date from the same instant via `amzDate`. */
  now: Date;
}

const sha256Hex = (value: string): string => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const hmac = (key: crypto.BinaryLike, value: string): Buffer =>
  crypto.createHmac('sha256', key).update(value, 'utf8').digest();

/** "20150830T123600Z": the ISO instant with separators and milliseconds removed. */
export function amzDate(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Returns the Authorization header value. The caller must send exactly the
 * headers it passed here (same names, same values) and the same body, or the
 * signature will not match.
 */
export function signRequest(request: SigV4Request, credentials: SigV4Credentials, options: SigV4Options): string {
  const stamp = amzDate(options.now);
  const day = stamp.slice(0, 8);

  const headers = Object.entries(request.headers)
    .map(([name, value]) => [name.toLowerCase(), value.trim().replace(/\s+/g, ' ')] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  if (!headers.some(([name]) => name === 'host')) throw new Error('sigv4: a host header is required');

  const canonicalHeaders = headers.map(([name, value]) => `${name}:${value}\n`).join('');
  const signedHeaders = headers.map(([name]) => name).join(';');

  const canonicalRequest = [
    request.method.toUpperCase(),
    request.path,
    '', // no query string
    canonicalHeaders,
    signedHeaders,
    sha256Hex(request.body),
  ].join('\n');

  const scope = `${day}/${options.region}/${options.service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', stamp, scope, sha256Hex(canonicalRequest)].join('\n');

  const kDate = hmac(`AWS4${credentials.secretAccessKey}`, day);
  const kRegion = hmac(kDate, options.region);
  const kService = hmac(kRegion, options.service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  return `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}
