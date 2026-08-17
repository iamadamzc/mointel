import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import type WebSocket from 'ws';

import { AlpacaStream, reconnectDelayMs } from '@/lib/market/alpaca/stream';
import type { AlpacaCredentials } from '@/lib/market/credentials';
import type { ConnectionState } from '@/lib/market/types';

const credentials: AlpacaCredentials = {
  keyId: 'AKTESTKEYID0000000',
  secret: 'super-secret-value-that-must-never-be-logged-0000',
  feed: 'sip',
  origin: 'test',
};

class FakeSocket extends EventEmitter {
  readyState = 1; // WebSocket.OPEN
  sent: Array<Record<string, unknown>> = [];
  closed = false;

  send(payload: string): void {
    this.sent.push(JSON.parse(payload) as Record<string, unknown>);
  }

  close(): void {
    this.closed = true;
  }

  /** Simulates a frame arriving from Alpaca. */
  deliver(messages: unknown[]): void {
    this.emit('message', Buffer.from(JSON.stringify(messages)));
  }
}

interface Harness {
  stream: AlpacaStream;
  socket: FakeSocket;
  states: ConnectionState[];
  errors: Array<{ message: string; code: number | null; fatal: boolean }>;
  observations: number;
  sockets: FakeSocket[];
}

function harness(): Harness {
  const sockets: FakeSocket[] = [];
  const states: ConnectionState[] = [];
  const errors: Array<{ message: string; code: number | null; fatal: boolean }> = [];
  const result = { observations: 0 } as { observations: number };

  const stream = new AlpacaStream({
    url: 'wss://example.test/v2/sip',
    credentials,
    feed: 'sip',
    handlers: {
      onObservation: () => {
        result.observations += 1;
      },
      onStateChange: (state) => states.push(state),
      onSubscription: () => {},
      onError: (message, code, fatal) => errors.push({ message, code, fatal }),
      onMessage: () => {},
      onMalformed: () => {},
      log: () => {},
      debug: () => {},
    },
    socketFactory: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket as unknown as WebSocket;
    },
  });

  stream.start();
  const socket = sockets[0]!;
  socket.emit('open');

  return {
    stream,
    socket,
    states,
    errors,
    sockets,
    get observations() {
      return result.observations;
    },
  } as Harness;
}

describe('connection lifecycle', () => {
  it('authenticates then subscribes to whole-market bars, updatedBars and statuses', () => {
    const { stream, socket, states } = harness();

    socket.deliver([{ T: 'success', msg: 'connected' }]);
    expect(socket.sent[0]).toEqual({ action: 'auth', key: credentials.keyId, secret: credentials.secret });

    socket.deliver([{ T: 'success', msg: 'authenticated' }]);
    const subscribe = socket.sent.find((message) => message.action === 'subscribe');
    expect(subscribe).toMatchObject({ bars: ['*'], updatedBars: ['*'], statuses: ['*'] });

    // Whole-market trades/quotes are deliberately NOT subscribed.
    expect(subscribe).not.toHaveProperty('trades');
    expect(subscribe).not.toHaveProperty('quotes');

    expect(states).toContain('CONNECTED');
    expect(states).toContain('AUTHENTICATED');
    expect(stream.connectionState).toBe('AUTHENTICATED');
  });

  it('applies high-resolution symbol changes as diffs without reconnecting', () => {
    const { stream, socket, sockets } = harness();
    socket.deliver([{ T: 'success', msg: 'connected' }]);
    socket.deliver([{ T: 'success', msg: 'authenticated' }]);

    stream.setHighResSymbols(['AAA', 'BBB']);
    socket.deliver([{ T: 'subscription', bars: ['*'], trades: ['AAA', 'BBB'], quotes: ['AAA', 'BBB'], lulds: ['AAA', 'BBB'] }]);

    socket.sent.length = 0;
    stream.setHighResSymbols(['BBB', 'CCC']);

    const subscribe = socket.sent.find((message) => message.action === 'subscribe');
    const unsubscribe = socket.sent.find((message) => message.action === 'unsubscribe');

    expect(subscribe).toMatchObject({ trades: ['CCC'], quotes: ['CCC'], lulds: ['CCC'] });
    expect(unsubscribe).toMatchObject({ trades: ['AAA'], quotes: ['AAA'], lulds: ['AAA'] });
    // Still exactly one socket.
    expect(sockets).toHaveLength(1);
    expect(socket.closed).toBe(false);
  });

  it('falls back to explicit symbols when the account cannot use wildcards', () => {
    const { stream, socket, errors } = harness();
    socket.deliver([{ T: 'success', msg: 'connected' }]);
    socket.deliver([{ T: 'success', msg: 'authenticated' }]);

    stream.setFallbackBarSymbols(['AAA', 'BBB']);
    socket.sent.length = 0;

    socket.deliver([{ T: 'error', code: 410, msg: 'invalid subscribe action for this feed' }]);

    expect(stream.wildcardSupported).toBe(false);
    const subscribe = socket.sent.find((message) => message.action === 'subscribe');
    expect(subscribe).toMatchObject({ bars: ['AAA', 'BBB'] });
    expect(errors.some((error) => !error.fatal && error.message.includes('wildcard'))).toBe(true);
  });

  it('treats an entitlement error as fatal instead of reconnecting forever', () => {
    const { stream, socket, errors, sockets } = harness();
    socket.deliver([{ T: 'success', msg: 'connected' }]);
    socket.deliver([{ T: 'error', code: 409, msg: 'insufficient subscription' }]);

    expect(errors.at(-1)).toMatchObject({ code: 409, fatal: true });
    expect(stream.connectionState).toBe('ERROR');

    // A close after a fatal error must not schedule a reconnect.
    socket.emit('close', 1006, Buffer.from('gone'));
    expect(sockets).toHaveLength(1);
  });

  it('schedules a jittered, capped reconnect after an unexpected close (requirement 28)', () => {
    vi.useFakeTimers();
    try {
      const { stream, socket, states, sockets } = harness();
      socket.deliver([{ T: 'success', msg: 'connected' }]);
      socket.deliver([{ T: 'success', msg: 'authenticated' }]);

      socket.emit('close', 1006, Buffer.from('network dropped'));
      expect(states).toContain('DISCONNECTED');
      expect(stream.reconnectCount).toBe(1);
      expect(sockets).toHaveLength(1);

      vi.advanceTimersByTime(1000);
      expect(sockets).toHaveLength(2);

      sockets[1]!.emit('open');
      sockets[1]!.deliver([{ T: 'success', msg: 'connected' }]);
      expect(sockets[1]!.sent[0]).toMatchObject({ action: 'auth' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('never collapses the backoff to a spin loop', () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { min, max } = reconnectDelayMs(attempt);
      expect(min).toBeGreaterThanOrEqual(500);
      expect(max).toBeLessThanOrEqual(30_000);
      expect(min).toBeLessThanOrEqual(max);
    }
    expect(reconnectDelayMs(20).max).toBe(30_000);
  });

  it('forwards parsed observations and swallows malformed frames', () => {
    const live = harness();
    live.socket.deliver([{ T: 'success', msg: 'connected' }]);
    live.socket.deliver([{ T: 'success', msg: 'authenticated' }]);

    expect(() => live.socket.emit('message', Buffer.from('not json'))).not.toThrow();
    live.socket.deliver([
      { T: 'b', S: 'AAA', o: 1, h: 1, l: 1, c: 1, v: 5, t: '2026-08-14T13:31:00Z' },
      { T: 't', S: 'AAA', p: 1, s: 1, t: '2026-08-14T13:31:01Z' },
    ]);

    expect(live.observations).toBe(2);
  });
});
