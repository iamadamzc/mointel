/**
 * Alpaca v2 stream message parsing.
 *
 * Everything here is pure and total: a malformed, truncated or unexpected
 * message produces a `malformed`/`unknown` result and never throws, because a
 * bad frame must not take the market worker down mid-session.
 */

import type { HaltState, MarketFeed, MarketObservation } from '../types';

export type ParsedMessage =
  | { kind: 'success'; msg: string }
  | { kind: 'error'; code: number | null; msg: string }
  | { kind: 'subscription'; channels: Record<string, string[]> }
  | { kind: 'observation'; observation: MarketObservation }
  | { kind: 'unknown'; type: string; raw: unknown }
  | { kind: 'malformed'; reason: string; raw: unknown };

const SUBSCRIPTION_CHANNELS = [
  'trades',
  'quotes',
  'bars',
  'updatedBars',
  'dailyBars',
  'statuses',
  'lulds',
  'corrections',
  'cancelErrors',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function conditions(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value.filter((entry): entry is string => typeof entry === 'string');
  return list.length ? list : undefined;
}

/** Alpaca timestamps are RFC-3339 with nanoseconds; normalize to ISO ms. */
export function normalizeTimestamp(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

function barFrom(
  message: Record<string, unknown>,
  symbol: string,
  ts: string,
  receivedAt: string,
  source: string,
) {
  const open = num(message.o);
  const high = num(message.h);
  const low = num(message.l);
  const close = num(message.c);
  const volume = num(message.v);

  if (open === null || high === null || low === null || close === null || volume === null) {
    return null;
  }

  return {
    symbol,
    ts,
    open,
    high,
    low,
    close,
    volume,
    tradeCount: num(message.n),
    vwap: num(message.vw),
    source,
    receivedAt,
  };
}

/** Parses one already-decoded stream message object. */
export function parseStreamMessage(
  message: unknown,
  feed: MarketFeed,
  receivedAt: string = new Date().toISOString(),
): ParsedMessage {
  if (!isRecord(message)) {
    return { kind: 'malformed', reason: 'message is not an object', raw: message };
  }

  const type = str(message.T);
  if (!type) return { kind: 'malformed', reason: 'missing T field', raw: message };

  if (type === 'success') {
    return { kind: 'success', msg: str(message.msg) ?? '' };
  }

  if (type === 'error') {
    return { kind: 'error', code: num(message.code), msg: str(message.msg) ?? 'unknown error' };
  }

  if (type === 'subscription') {
    const channels: Record<string, string[]> = {};
    for (const channel of SUBSCRIPTION_CHANNELS) {
      const value = message[channel];
      if (Array.isArray(value)) {
        channels[channel] = value.filter((entry): entry is string => typeof entry === 'string');
      }
    }
    return { kind: 'subscription', channels };
  }

  const symbol = str(message.S);
  const ts = normalizeTimestamp(message.t);

  if (type === 'b' || type === 'u' || type === 'd') {
    if (!symbol || !ts) {
      return { kind: 'malformed', reason: 'bar missing symbol or timestamp', raw: message };
    }
    const source = type === 'b' ? 'live-bar' : type === 'u' ? 'live-updated-bar' : 'live-daily-bar';
    const bar = barFrom(message, symbol, ts, receivedAt, source);
    if (!bar) return { kind: 'malformed', reason: 'bar missing OHLCV fields', raw: message };

    // Daily bars are not part of the minute-bar cumulative model; they are
    // surfaced as observations but the engine ignores them for volume.
    return {
      kind: 'observation',
      observation: {
        symbol,
        kind: type === 'u' ? 'updatedBar' : 'bar',
        ts,
        receivedAt,
        feed,
        price: bar.close,
        bar: type === 'd' ? undefined : bar,
      },
    };
  }

  if (type === 't') {
    const price = num(message.p);
    if (!symbol || !ts || price === null) {
      return { kind: 'malformed', reason: 'trade missing symbol, timestamp or price', raw: message };
    }
    return {
      kind: 'observation',
      observation: {
        symbol,
        kind: 'trade',
        ts,
        receivedAt,
        feed,
        price,
        size: num(message.s),
        conditions: conditions(message.c),
        tape: str(message.z),
      },
    };
  }

  if (type === 'q') {
    if (!symbol || !ts) {
      return { kind: 'malformed', reason: 'quote missing symbol or timestamp', raw: message };
    }
    return {
      kind: 'observation',
      observation: {
        symbol,
        kind: 'quote',
        ts,
        receivedAt,
        feed,
        bid: num(message.bp),
        bidSize: num(message.bs),
        ask: num(message.ap),
        askSize: num(message.as),
        conditions: conditions(message.c),
        tape: str(message.z),
      },
    };
  }

  if (type === 's') {
    if (!symbol || !ts) {
      return { kind: 'malformed', reason: 'status missing symbol or timestamp', raw: message };
    }
    return {
      kind: 'observation',
      observation: {
        symbol,
        kind: 'status',
        ts,
        receivedAt,
        feed,
        statusCode: str(message.sc),
        statusMessage: str(message.sm),
        reasonCode: str(message.rc),
        reasonMessage: str(message.rm),
        tape: str(message.z),
      },
    };
  }

  if (type === 'l') {
    if (!symbol || !ts) {
      return { kind: 'malformed', reason: 'luld missing symbol or timestamp', raw: message };
    }
    return {
      kind: 'observation',
      observation: {
        symbol,
        kind: 'luld',
        ts,
        receivedAt,
        feed,
        luldUpper: num(message.u),
        luldLower: num(message.d),
        tape: str(message.z),
      },
    };
  }

  return { kind: 'unknown', type, raw: message };
}

/**
 * Parses a raw websocket frame. Alpaca sends a JSON array of messages; single
 * objects and junk payloads are both tolerated.
 */
export function parseStreamPayload(
  raw: string | Buffer,
  feed: MarketFeed,
  receivedAt: string = new Date().toISOString(),
): ParsedMessage[] {
  const text = typeof raw === 'string' ? raw : raw.toString('utf8');

  let decoded: unknown;
  try {
    decoded = JSON.parse(text);
  } catch {
    return [{ kind: 'malformed', reason: 'invalid JSON frame', raw: text.slice(0, 200) }];
  }

  const messages = Array.isArray(decoded) ? decoded : [decoded];
  return messages.map((message) => parseStreamMessage(message, feed, receivedAt));
}

/**
 * Normalizes exchange trading-status codes into our halt model.
 *
 * Codes differ between the CTA and UTP tapes, so both sets are mapped
 * explicitly and the status text is used only as a fallback. Anything we cannot
 * map with confidence becomes UNKNOWN — the raw code and message are always
 * preserved so nothing is lost by our normalization.
 */
export function normalizeHaltState(
  statusCode: string | null | undefined,
  statusMessage: string | null | undefined,
): HaltState {
  const code = statusCode?.trim().toUpperCase() ?? '';

  // UTP: H = trading halt, Q = quotation resumption, T = trading resumption.
  // CTA: 2 = trading halt, 3 = resume, 4 = quotation resumption.
  if (code === 'H' || code === '2' || code === 'P') return 'HALTED';
  if (code === 'Q' || code === '4' || code === 'QM') return 'RESUMING';
  if (code === 'T' || code === '3' || code === 'TR') return 'TRADING';

  const text = statusMessage?.toLowerCase() ?? '';
  if (!text) return 'UNKNOWN';

  if (text.includes('halt') || text.includes('pause')) return 'HALTED';
  if (text.includes('trading resumption') || text.includes('resumed')) return 'TRADING';
  if (text.includes('quotation') || text.includes('resumption') || text.includes('resume')) {
    return 'RESUMING';
  }

  return 'UNKNOWN';
}
