/**
 * Alpaca credential loading. WORKER-ONLY.
 *
 * Never import this from anything under app/ or components/. The Next.js
 * process has no reason to hold market credentials: it only reads the local
 * SQLite state store that the worker writes.
 *
 * Credentials are accepted from, in order:
 *   1. process.env (including .env.local, loaded by the worker at startup)
 *   2. any root-level .txt / .env* file that parses as an Alpaca key pair
 *
 * Values are never logged, echoed, or written back to disk.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface AlpacaCredentials {
  keyId: string;
  secret: string;
  feed: 'sip' | 'iex';
  /** Where the credentials came from, for diagnostics. Never includes values. */
  origin: string;
}

/** Alpaca key ids are uppercase alphanumeric and start with AK (live) or PK (paper). */
const KEY_ID_PATTERN = /^[AP]K[A-Z0-9]{12,}$/;
/** Secrets are long mixed-case tokens. */
const SECRET_PATTERN = /^[A-Za-z0-9/+_-]{30,}$/;

function looksLikeKeyId(value: string): boolean {
  return KEY_ID_PATTERN.test(value);
}

function looksLikeSecret(value: string): boolean {
  return SECRET_PATTERN.test(value) && !looksLikeKeyId(value);
}

function normalizeFeed(value: string | undefined): 'sip' | 'iex' {
  return value?.trim().toLowerCase() === 'iex' ? 'iex' : 'sip';
}

/**
 * Parses a credentials text file. Supports both `KEY=VALUE` lines and a bare
 * two-token layout (key id on one line, secret on the next), which is what
 * Alpaca's own key dialog produces when copied straight out.
 */
export function parseCredentialText(text: string): { keyId?: string; secret?: string; feed?: string } {
  const result: { keyId?: string; secret?: string; feed?: string } = {};
  const bare: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const assignment = line.match(/^([A-Za-z0-9_]+)\s*[=:]\s*(.+)$/);
    if (assignment) {
      const key = assignment[1].toUpperCase();
      const value = assignment[2].trim().replace(/^["']|["']$/g, '');
      if (key === 'APCA_API_KEY_ID' || key === 'ALPACA_API_KEY_ID' || key === 'ALPACA_KEY_ID') {
        result.keyId = value;
      } else if (
        key === 'APCA_API_SECRET_KEY' ||
        key === 'ALPACA_API_SECRET_KEY' ||
        key === 'ALPACA_SECRET_KEY'
      ) {
        result.secret = value;
      } else if (key === 'ALPACA_DATA_FEED' || key === 'APCA_DATA_FEED') {
        result.feed = value;
      } else if (looksLikeKeyId(value) || looksLikeSecret(value)) {
        // A labelled line whose label we do not recognise but whose value looks
        // like a credential (e.g. "https://api.alpaca.markets" headers).
        bare.push(value);
      }
      continue;
    }

    if (looksLikeKeyId(line) || looksLikeSecret(line)) bare.push(line);
  }

  if (!result.keyId) result.keyId = bare.find(looksLikeKeyId);
  if (!result.secret) {
    result.secret = bare.find((value) => value !== result.keyId && looksLikeSecret(value));
  }

  return result;
}

function candidateFiles(rootDir: string): string[] {
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(rootDir);
  } catch {
    return [];
  }

  return entries
    .filter((name) => /\.(txt|env)$/i.test(name) || /^\.env(\.|$)/i.test(name))
    .filter((name) => !/\.md$/i.test(name))
    .map((name) => path.join(rootDir, name))
    .filter((file) => {
      try {
        return fs.statSync(file).isFile() && fs.statSync(file).size < 64 * 1024;
      } catch {
        return false;
      }
    });
}

export interface CredentialLookup {
  credentials: AlpacaCredentials | null;
  /** Human-readable explanation when credentials could not be assembled. */
  problem: string | null;
  /** Files inspected, for diagnostics. Contents are never reported. */
  inspected: string[];
}

export function findAlpacaCredentials(
  rootDir: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): CredentialLookup {
  const inspected: string[] = [];

  const envKeyId = env.APCA_API_KEY_ID?.trim() || env.ALPACA_API_KEY_ID?.trim();
  const envSecret = env.APCA_API_SECRET_KEY?.trim() || env.ALPACA_API_SECRET_KEY?.trim();
  if (envKeyId && envSecret) {
    return {
      credentials: {
        keyId: envKeyId,
        secret: envSecret,
        feed: normalizeFeed(env.ALPACA_DATA_FEED),
        origin: 'environment',
      },
      problem: null,
      inspected,
    };
  }

  for (const file of candidateFiles(rootDir)) {
    inspected.push(path.basename(file));
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const parsed = parseCredentialText(text);
    if (parsed.keyId && parsed.secret) {
      return {
        credentials: {
          keyId: parsed.keyId,
          secret: parsed.secret,
          feed: normalizeFeed(parsed.feed ?? env.ALPACA_DATA_FEED),
          origin: path.basename(file),
        },
        problem: null,
        inspected,
      };
    }
  }

  return {
    credentials: null,
    problem:
      'No Alpaca credentials found. Set APCA_API_KEY_ID and APCA_API_SECRET_KEY in .env.local, ' +
      'or drop a text file containing them in the project root.',
    inspected,
  };
}

/**
 * Strips anything credential-shaped out of a string before it is logged or
 * persisted. Applied to every Alpaca error message we surface.
 */
export function redact(value: unknown, credentials?: AlpacaCredentials | null): string {
  let text = typeof value === 'string' ? value : String((value as Error)?.message ?? value);

  if (credentials) {
    if (credentials.keyId) text = text.split(credentials.keyId).join('[REDACTED_KEY_ID]');
    if (credentials.secret) text = text.split(credentials.secret).join('[REDACTED_SECRET]');
  }

  return text
    .replace(/\b[AP]K[A-Z0-9]{12,}\b/g, '[REDACTED_KEY_ID]')
    .replace(/\b[A-Za-z0-9/+_-]{40,}\b/g, '[REDACTED]');
}

/** Masked identifier safe for diagnostics output, e.g. "AKTU…3Q9". */
export function maskKeyId(keyId: string): string {
  if (keyId.length <= 8) return '****';
  return `${keyId.slice(0, 4)}…${keyId.slice(-3)}`;
}
