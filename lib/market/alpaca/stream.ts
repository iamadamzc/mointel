/**
 * The single long-lived Alpaca market WebSocket.
 *
 * Exactly one of these exists per worker process. Symbol interest changes are
 * applied as subscribe/unsubscribe diffs on the open socket — the connection is
 * never recycled just to change symbols, and the browser never opens a socket
 * of its own.
 */

import WebSocket from 'ws';

import { redact, type AlpacaCredentials } from '../credentials';
import { parseStreamPayload, type ParsedMessage } from './messages';
import type { ConnectionState, MarketFeed, MarketObservation } from '../types';

/** Alpaca error codes that will never succeed on retry. */
const FATAL_ERROR_CODES = new Set([
  402, // auth failed
  403, // already authenticated (indicates a duplicate session in this process)
  408, // v2 not enabled for this account
  409, // insufficient subscription (e.g. no SIP entitlement)
  410, // invalid subscribe action for this feed
]);

/** Errors that mean "the plan does not allow this subscription shape". */
const SUBSCRIPTION_DENIED_CODES = new Set([405, 409, 410]);

export interface StreamHandlers {
  onObservation: (observation: MarketObservation) => void;
  onStateChange: (state: ConnectionState, detail?: string) => void;
  onSubscription: (channels: Record<string, string[]>) => void;
  onError: (message: string, code: number | null, fatal: boolean) => void;
  onMessage: () => void;
  onMalformed: (reason: string) => void;
  log: (message: string) => void;
  debug?: (message: string) => void;
}

export interface StreamOptions {
  url: string;
  credentials: AlpacaCredentials;
  feed: MarketFeed;
  handlers: StreamHandlers;
  /** Base channels subscribed with a wildcard for whole-market discovery. */
  wildcardChannels?: Array<'bars' | 'updatedBars' | 'statuses'>;
  maxBackoffMs?: number;
  /** Injected for tests. */
  socketFactory?: (url: string) => WebSocket;
}

interface Subscription {
  trades: Set<string>;
  quotes: Set<string>;
  lulds: Set<string>;
}

export class AlpacaStream {
  private readonly options: StreamOptions;
  private socket: WebSocket | null = null;
  private state: ConnectionState = 'DISCONNECTED';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private stopped = false;
  private authenticated = false;

  /** Desired high-resolution interest set. */
  private desired: Subscription = { trades: new Set(), quotes: new Set(), lulds: new Set() };
  /** What the server has actually acknowledged. */
  private applied: Subscription = { trades: new Set(), quotes: new Set(), lulds: new Set() };

  private wildcardActive = false;
  private wildcardDenied = false;
  /** Explicit symbol list used when the account cannot use wildcards. */
  private fallbackBarSymbols = new Set<string>();

  reconnectCount = 0;

  constructor(options: StreamOptions) {
    this.options = options;
  }

  get connectionState(): ConnectionState {
    return this.state;
  }

  get wildcardSupported(): boolean {
    return !this.wildcardDenied;
  }

  get appliedCounts(): { trades: number; quotes: number; lulds: number } {
    return {
      trades: this.applied.trades.size,
      quotes: this.applied.quotes.size,
      lulds: this.applied.lulds.size,
    };
  }

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.close(1000, 'shutdown');
      } catch {
        /* socket already gone */
      }
      this.socket = null;
    }
    this.setState('DISCONNECTED', 'clean shutdown');
  }

  /** Replaces the high-resolution interest set, sending only the diff. */
  setHighResSymbols(symbols: Iterable<string>): void {
    const next = new Set(symbols);
    this.desired = { trades: new Set(next), quotes: new Set(next), lulds: new Set(next) };
    if (this.authenticated) this.applySubscriptionDiff();
  }

  /**
   * Forces explicit-symbol bar subscriptions instead of wildcards. Used by the
   * test stream, which only publishes FAKEPACA.
   */
  useExplicitSymbolMode(): void {
    this.wildcardDenied = true;
    this.wildcardActive = false;
  }

  /** Symbols used for bar subscription when wildcards are unavailable. */
  setFallbackBarSymbols(symbols: Iterable<string>): void {
    this.fallbackBarSymbols = new Set(symbols);
    if (this.authenticated && this.wildcardDenied) this.subscribeBaseChannels();
  }

  private setState(state: ConnectionState, detail?: string): void {
    if (this.state === state) return;
    this.state = state;
    this.options.handlers.onStateChange(state, detail);
  }

  private connect(): void {
    if (this.stopped) return;

    this.setState('CONNECTING');
    this.authenticated = false;

    let socket: WebSocket;
    try {
      socket = this.options.socketFactory
        ? this.options.socketFactory(this.options.url)
        : new WebSocket(this.options.url);
    } catch (error) {
      this.handleFailure(redact(error, this.options.credentials));
      return;
    }

    this.socket = socket;

    socket.on('open', () => {
      this.setState('CONNECTED');
      this.options.handlers.log('[alpaca] connected');
    });

    socket.on('message', (data: WebSocket.RawData) => {
      this.options.handlers.onMessage();
      const messages = parseStreamPayload(
        data as unknown as Buffer,
        this.options.feed,
        new Date().toISOString(),
      );
      for (const message of messages) this.handleParsed(message);
    });

    socket.on('close', (code: number, reason: Buffer) => {
      if (this.stopped) return;
      const detail = `socket closed (${code}) ${reason?.toString?.() ?? ''}`.trim();
      this.handleFailure(detail);
    });

    socket.on('error', (error: Error) => {
      const detail = redact(error, this.options.credentials);
      this.options.handlers.onError(detail, null, false);
      // 'close' always follows 'error'; reconnect is scheduled there.
    });
  }

  private handleParsed(message: ParsedMessage): void {
    const { handlers } = this.options;

    switch (message.kind) {
      case 'success': {
        if (message.msg === 'connected') {
          this.authenticate();
        } else if (message.msg === 'authenticated') {
          this.authenticated = true;
          this.reconnectAttempt = 0;
          this.setState('AUTHENTICATED');
          handlers.log(`[alpaca] authenticated ${this.options.feed.toUpperCase()}`);
          this.subscribeBaseChannels();
          this.applySubscriptionDiff(true);
        }
        return;
      }

      case 'error': {
        const fatal = message.code !== null && FATAL_ERROR_CODES.has(message.code);

        if (message.code !== null && SUBSCRIPTION_DENIED_CODES.has(message.code) && this.wildcardActive) {
          // The account cannot use whole-market wildcards; degrade to an
          // explicit symbol list instead of failing the whole worker.
          this.wildcardDenied = true;
          this.wildcardActive = false;
          handlers.onError(
            `whole-market wildcard subscription rejected (${message.code}: ${message.msg}); falling back to explicit symbols`,
            message.code,
            false,
          );
          this.subscribeBaseChannels();
          return;
        }

        handlers.onError(message.msg, message.code, fatal);
        if (fatal) {
          this.stopped = true;
          this.setState('ERROR', `${message.code}: ${message.msg}`);
          try {
            this.socket?.close(1000, 'fatal error');
          } catch {
            /* ignore */
          }
        }
        return;
      }

      case 'subscription': {
        this.applied = {
          trades: new Set(message.channels.trades ?? []),
          quotes: new Set(message.channels.quotes ?? []),
          lulds: new Set(message.channels.lulds ?? []),
        };
        const bars = message.channels.bars ?? [];
        this.wildcardActive = bars.includes('*');
        if (bars.length > 0 || this.applied.trades.size > 0) this.setState('STREAMING');
        handlers.onSubscription(message.channels);
        return;
      }

      case 'observation':
        if (this.state === 'AUTHENTICATED') this.setState('STREAMING');
        handlers.onObservation(message.observation);
        return;

      case 'malformed':
        handlers.onMalformed(message.reason);
        return;

      case 'unknown':
        handlers.debug?.(`[alpaca] unhandled message type ${message.type}`);
        return;
    }
  }

  private send(payload: Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    try {
      this.socket.send(JSON.stringify(payload));
    } catch (error) {
      this.options.handlers.onError(redact(error, this.options.credentials), null, false);
    }
  }

  private authenticate(): void {
    this.send({
      action: 'auth',
      key: this.options.credentials.keyId,
      secret: this.options.credentials.secret,
    });
  }

  /**
   * Whole-market discovery channels. Quotes and trades are deliberately NOT
   * wildcarded: minute bars are the discovery input, and whole-market tick data
   * would be bandwidth we have no use for.
   */
  private subscribeBaseChannels(): void {
    const channels = this.options.wildcardChannels ?? ['bars', 'updatedBars', 'statuses'];
    if (channels.length === 0) return;

    const payload: Record<string, unknown> = { action: 'subscribe' };

    if (!this.wildcardDenied) {
      for (const channel of channels) payload[channel] = ['*'];
      this.wildcardActive = true;
      this.send(payload);
      this.options.handlers.log('[alpaca] whole-market bars subscribed');
      return;
    }

    const symbols = [...this.fallbackBarSymbols];
    if (symbols.length === 0) return;
    for (const channel of channels) payload[channel] = symbols;
    this.send(payload);
    this.options.handlers.log(
      `[alpaca] degraded universe: subscribed bars for ${symbols.length} explicit symbols`,
    );
  }

  /** Sends only the added/removed symbols for trades, quotes and LULD bands. */
  private applySubscriptionDiff(force = false): void {
    const add: Record<string, string[]> = {};
    const remove: Record<string, string[]> = {};

    for (const channel of ['trades', 'quotes', 'lulds'] as const) {
      const desired = this.desired[channel];
      const applied = force ? new Set<string>() : this.applied[channel];

      const added = [...desired].filter((symbol) => !applied.has(symbol));
      const removed = [...applied].filter((symbol) => !desired.has(symbol));

      if (added.length) add[channel] = added;
      if (removed.length) remove[channel] = removed;
    }

    if (Object.keys(add).length) this.send({ action: 'subscribe', ...add });
    if (Object.keys(remove).length) this.send({ action: 'unsubscribe', ...remove });
  }

  private handleFailure(detail: string): void {
    this.socket = null;
    this.authenticated = false;
    this.applied = { trades: new Set(), quotes: new Set(), lulds: new Set() };

    if (this.stopped) {
      this.setState('DISCONNECTED', detail);
      return;
    }

    this.setState('DISCONNECTED', detail);
    this.scheduleReconnect();
  }

  /** Exponential backoff with jitter, capped; never a tight reconnect loop. */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const max = this.options.maxBackoffMs ?? 30_000;
    const base = Math.min(max, 1000 * 2 ** this.reconnectAttempt);
    const delay = base / 2 + Math.random() * (base / 2);

    this.reconnectAttempt = Math.min(this.reconnectAttempt + 1, 6);
    this.reconnectCount += 1;

    this.options.handlers.log(
      `[alpaca] reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectCount})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

/** Exposed for tests: the backoff schedule never collapses to a spin loop. */
export function reconnectDelayMs(attempt: number, maxBackoffMs = 30_000): { min: number; max: number } {
  const base = Math.min(maxBackoffMs, 1000 * 2 ** attempt);
  return { min: base / 2, max: base };
}
