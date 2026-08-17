import { describe, expect, it } from 'vitest';

import {
  normalizeHaltState,
  parseStreamMessage,
  parseStreamPayload,
} from '@/lib/market/alpaca/messages';

describe('SIP message parsing (requirement 1)', () => {
  it('parses a minute bar', () => {
    const [message] = parseStreamPayload(
      JSON.stringify([
        { T: 'b', S: 'ABCD', o: 1.1, h: 1.4, l: 1.05, c: 1.35, v: 12_500, t: '2026-08-14T13:31:00Z', n: 42, vw: 1.3 },
      ]),
      'sip',
      '2026-08-14T13:31:05Z',
    );

    expect(message.kind).toBe('observation');
    if (message.kind !== 'observation') return;
    expect(message.observation.symbol).toBe('ABCD');
    expect(message.observation.kind).toBe('bar');
    expect(message.observation.bar?.volume).toBe(12_500);
    expect(message.observation.bar?.ts).toBe('2026-08-14T13:31:00.000Z');
    expect(message.observation.price).toBe(1.35);
  });

  it('parses an updated bar as a distinct kind', () => {
    const [message] = parseStreamPayload(
      JSON.stringify([{ T: 'u', S: 'ABCD', o: 1, h: 1, l: 1, c: 1, v: 5, t: '2026-08-14T13:31:00Z' }]),
      'sip',
    );
    expect(message.kind === 'observation' && message.observation.kind).toBe('updatedBar');
  });

  it('parses trades, quotes, statuses and LULD bands', () => {
    const messages = parseStreamPayload(
      JSON.stringify([
        { T: 't', S: 'ABCD', p: 2.5, s: 300, t: '2026-08-14T13:31:02Z', c: ['@'], z: 'C' },
        { T: 'q', S: 'ABCD', bp: 2.48, bs: 3, ap: 2.52, as: 5, t: '2026-08-14T13:31:03Z' },
        { T: 's', S: 'ABCD', sc: 'H', sm: 'Trading Halt', rc: 'T12', t: '2026-08-14T13:31:04Z' },
        { T: 'l', S: 'ABCD', u: 2.8, d: 2.2, t: '2026-08-14T13:31:05Z' },
      ]),
      'sip',
    );

    expect(messages.map((message) => (message.kind === 'observation' ? message.observation.kind : message.kind))).toEqual(
      ['trade', 'quote', 'status', 'luld'],
    );

    const quote = messages[1];
    expect(quote.kind === 'observation' && quote.observation.bid).toBe(2.48);
    const luld = messages[3];
    expect(luld.kind === 'observation' && luld.observation.luldUpper).toBe(2.8);
    expect(luld.kind === 'observation' && luld.observation.luldLower).toBe(2.2);
  });

  it('parses control messages', () => {
    expect(parseStreamMessage({ T: 'success', msg: 'authenticated' }, 'sip')).toEqual({
      kind: 'success',
      msg: 'authenticated',
    });
    expect(parseStreamMessage({ T: 'error', code: 409, msg: 'insufficient subscription' }, 'sip')).toEqual({
      kind: 'error',
      code: 409,
      msg: 'insufficient subscription',
    });

    const subscription = parseStreamMessage(
      { T: 'subscription', bars: ['*'], trades: ['ABCD'], quotes: [] },
      'sip',
    );
    expect(subscription.kind).toBe('subscription');
    if (subscription.kind !== 'subscription') return;
    expect(subscription.channels.bars).toEqual(['*']);
    expect(subscription.channels.trades).toEqual(['ABCD']);
  });
});

describe('malformed SIP messages do not crash the worker (requirement 2)', () => {
  const junk: unknown[] = [
    'not json at all',
    '{"unclosed": ',
    JSON.stringify([null]),
    JSON.stringify([{ T: 'b', S: 'ABCD' }]),
    JSON.stringify([{ T: 'b', o: 1, h: 1, l: 1, c: 1, v: 1, t: '2026-08-14T13:31:00Z' }]),
    JSON.stringify([{ T: 't', S: 'ABCD', t: 'not-a-date', p: 1 }]),
    JSON.stringify([{ T: 'q', S: 'ABCD', t: '2026-08-14T13:31:00Z', bp: 'oops' }]),
    JSON.stringify([{ T: 'zzz', S: 'ABCD' }]),
    JSON.stringify({ T: 'b', S: 'ABCD', o: 1, h: 1, l: 1, c: 1, v: 1, t: '2026-08-14T13:31:00Z' }),
    JSON.stringify(42),
  ];

  it.each(junk.map((value, index) => [index, value] as const))(
    'survives malformed frame %i',
    (_index, frame) => {
      expect(() => parseStreamPayload(frame as string, 'sip')).not.toThrow();
      const results = parseStreamPayload(frame as string, 'sip');
      expect(Array.isArray(results)).toBe(true);
      for (const result of results) {
        expect(['success', 'error', 'subscription', 'observation', 'unknown', 'malformed']).toContain(
          result.kind,
        );
      }
    },
  );

  it('reports a reason instead of throwing', () => {
    const [result] = parseStreamPayload('{"broken"', 'sip');
    expect(result.kind).toBe('malformed');
    if (result.kind !== 'malformed') return;
    expect(result.reason).toMatch(/invalid JSON/i);
  });

  it('drops a quote whose numeric fields are unusable rather than inventing values', () => {
    const [result] = parseStreamPayload(
      JSON.stringify([{ T: 'q', S: 'ABCD', t: '2026-08-14T13:31:00Z', bp: 'oops', ap: null }]),
      'sip',
    );
    expect(result.kind).toBe('observation');
    if (result.kind !== 'observation') return;
    expect(result.observation.bid).toBeNull();
    expect(result.observation.ask).toBeNull();
  });
});

describe('halt state normalization', () => {
  it('maps UTP and CTA codes', () => {
    expect(normalizeHaltState('H', 'Trading Halt')).toBe('HALTED');
    expect(normalizeHaltState('2', 'Trading Halt')).toBe('HALTED');
    expect(normalizeHaltState('Q', 'Quotation Resumption')).toBe('RESUMING');
    expect(normalizeHaltState('T', 'Trading Resumption')).toBe('TRADING');
    expect(normalizeHaltState('3', 'Resume')).toBe('TRADING');
  });

  it('falls back to message text and never guesses', () => {
    expect(normalizeHaltState(null, 'Volatility Trading Pause')).toBe('HALTED');
    expect(normalizeHaltState(null, 'Quotation resumption')).toBe('RESUMING');
    expect(normalizeHaltState(null, null)).toBe('UNKNOWN');
    expect(normalizeHaltState('ZZ', 'something unfamiliar')).toBe('UNKNOWN');
  });
});
