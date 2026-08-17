/**
 * `npm run market:diagnose`
 *
 * Reports whether every dependency of the demand engine is reachable, without
 * revealing credentials. Distinguishes "connected and authenticated but the SIP
 * session is closed right now" from an actual failure.
 */

import { loadWorkerEnv } from './env';
loadWorkerEnv();

import { ALPACA_ENDPOINTS, loadMarketConfig } from '../lib/market/config';
import { findAlpacaCredentials, maskKeyId, redact } from '../lib/market/credentials';
import { AlpacaRestClient } from '../lib/market/alpaca/rest';
import { AlpacaStream } from '../lib/market/alpaca/stream';
import { countBaselines, readFeedHealth } from '../lib/market/store/repo';
import { databaseExists, getMeta, openDatabase } from '../lib/market/store/db';
import {
  etClock,
  etDateString,
  etMinutesOfDay,
  resolveTradingSession,
  sessionPhaseForMinutes,
} from '../lib/market/session';
import type { SessionPhase } from '../lib/market/types';

type Status = 'OK' | 'FAIL' | 'WARN' | 'INFO';

const lines: Array<[string, Status, string]> = [];

function report(label: string, status: Status, detail: string): void {
  lines.push([label, status, detail]);
}

async function main(): Promise<void> {
  const config = loadMarketConfig();
  const now = new Date();

  console.log('Momentum Intelligence — market diagnostics');
  console.log(`ET now: ${etDateString(now)} ${etClock(now)}\n`);

  // ---- credentials ---------------------------------------------------------
  const lookup = findAlpacaCredentials();
  if (!lookup.credentials) {
    report('Credentials', 'FAIL', lookup.problem ?? 'not found');
    printReport();
    process.exit(1);
  }

  const credentials = lookup.credentials;
  report(
    'Credentials',
    'OK',
    `present (${maskKeyId(credentials.keyId)} from ${credentials.origin}), feed=${credentials.feed}`,
  );

  // ---- historical REST -----------------------------------------------------
  const rest = new AlpacaRestClient(credentials, {
    batchSize: config.restBatchSize,
    concurrency: 2,
  });

  const access = await rest.verifyDataAccess();
  report(
    `Historical ${credentials.feed.toUpperCase()} access`,
    access.ok ? 'OK' : 'FAIL',
    access.detail,
  );

  // ---- calendar / session --------------------------------------------------
  let sessionPhase = sessionPhaseForMinutes(etMinutesOfDay(now));
  let tradingDate = etDateString(now);
  try {
    const calendar = await rest.getCalendar(
      etDateString(new Date(now.getTime() - 10 * 86_400_000)),
      etDateString(new Date(now.getTime() + 10 * 86_400_000)),
    );
    const dates = new Set(calendar.map((day) => day.date));
    const resolution = resolveTradingSession(
      now,
      (date) => dates.has(date),
      (date) => calendar.map((day) => day.date).filter((value) => value > date).sort()[0] ?? null,
    );
    tradingDate = resolution.tradingDate;
    sessionPhase = resolution.phase;
    report(
      'Market calendar',
      'OK',
      `${calendar.length} sessions; current trading date ${tradingDate} (${sessionPhase})`,
    );
  } catch (error) {
    report('Market calendar', 'WARN', redact(error, credentials));
  }

  // ---- websocket auth ------------------------------------------------------
  const wsResult = await probeStream(credentials, config.debug, sessionPhase);
  report('WebSocket', wsResult.connected ? 'OK' : 'FAIL', wsResult.connectionDetail);
  report(
    `${credentials.feed.toUpperCase()} authentication`,
    wsResult.authenticated ? 'OK' : 'FAIL',
    wsResult.authDetail,
  );
  report(
    'Subscription',
    wsResult.subscribed ? 'OK' : wsResult.authenticated ? 'WARN' : 'FAIL',
    wsResult.subscriptionDetail,
  );

  if (wsResult.authenticated && sessionPhase === 'CLOSED') {
    report(
      'Live SIP prints',
      'INFO',
      'connection and authentication succeeded, but no live SIP prints are expected right now ' +
        '(outside 04:00–20:00 ET on a trading day). This is not a failure.',
    );
  } else if (wsResult.authenticated) {
    report(
      'Live SIP prints',
      wsResult.messages > 0 ? 'OK' : 'WARN',
      `${wsResult.messages} whole-market messages in ${wsResult.seconds}s during ${sessionPhase}` +
        (wsResult.messages === 0
          ? ' — whole-market bars publish once per minute, so re-run with a longer ' +
            'MARKET_DIAGNOSE_SECONDS before concluding the feed is dead'
          : ''),
    );
  }

  // ---- state store ---------------------------------------------------------
  if (!databaseExists(config.dbPath)) {
    report('SQLite state store', 'WARN', `not created yet at ${config.dbPath} (run market:alpaca)`);
  } else {
    try {
      const db = openDatabase(config.dbPath, { readonly: true, skipSchema: true });
      const health = readFeedHealth(db);
      const baselines = countBaselines(db);
      const storedDate = getMeta(db, 'trading_date');
      report(
        'SQLite state store',
        'OK',
        `${config.dbPath} — ${baselines} baselines, trading date ${storedDate ?? 'none'}` +
          (health ? `, last worker mode ${health.mode} (${health.connectionState})` : ''),
      );
      db.close();
    } catch (error) {
      report('SQLite state store', 'FAIL', redact(error, credentials));
    }
  }

  // ---- google research provider -------------------------------------------
  const dashboardUrl = process.env.MOINTEL_DASHBOARD_URL ?? 'http://localhost:3000';
  try {
    const response = await fetch(`${dashboardUrl}/api/dashboard`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) {
      report('Google research provider', 'WARN', `dashboard responded ${response.status}`);
    } else {
      const payload = (await response.json()) as {
        meta?: { provider?: string; stale?: boolean; sourceTitle?: string };
        tickers?: unknown[];
      };
      report(
        'Google research provider',
        payload.meta?.stale ? 'WARN' : 'OK',
        `${payload.meta?.provider ?? 'unknown'} — ${payload.tickers?.length ?? 0} TODAY rows` +
          (payload.meta?.stale ? ' (STALE)' : ''),
      );
    }
  } catch {
    report(
      'Google research provider',
      'WARN',
      `dashboard not reachable at ${dashboardUrl} (start it with npm run dev)`,
    );
  }

  printReport();

  const failed = lines.some(([, status]) => status === 'FAIL');
  process.exit(failed ? 1 : 0);
}

interface StreamProbe {
  connected: boolean;
  authenticated: boolean;
  subscribed: boolean;
  messages: number;
  seconds: number;
  connectionDetail: string;
  authDetail: string;
  subscriptionDetail: string;
}

/** Opens one short-lived socket to prove auth and subscription, then closes it. */
function probeStream(
  credentials: ReturnType<typeof findAlpacaCredentials>['credentials'],
  debug: boolean,
  sessionPhase: SessionPhase,
): Promise<StreamProbe> {
  // Whole-market bars are published once per minute, so a short sample during
  // an open session reports zero prints purely by missing the publish tick.
  // Sample across a minute boundary when a session is actually running.
  const defaultSeconds = sessionPhase === 'CLOSED' ? 8 : 70;
  const seconds = Number(process.env.MARKET_DIAGNOSE_SECONDS ?? defaultSeconds);

  return new Promise((resolve) => {
    const result: StreamProbe = {
      connected: false,
      authenticated: false,
      subscribed: false,
      messages: 0,
      seconds,
      connectionDetail: 'no connection',
      authDetail: 'not authenticated',
      subscriptionDetail: 'no subscription acknowledgement',
    };

    if (!credentials) {
      resolve(result);
      return;
    }

    const url =
      credentials.feed === 'sip' ? ALPACA_ENDPOINTS.streamSip : ALPACA_ENDPOINTS.streamIex;

    const stream = new AlpacaStream({
      url,
      credentials,
      feed: credentials.feed,
      maxBackoffMs: 2000,
      handlers: {
        onObservation: () => {
          result.messages += 1;
        },
        onStateChange: (state) => {
          if (state === 'CONNECTED') {
            result.connected = true;
            result.connectionDetail = `connected to ${url}`;
          }
          if (state === 'AUTHENTICATED' || state === 'STREAMING') {
            result.connected = true;
            result.authenticated = true;
            result.authDetail = `authenticated against ${credentials.feed.toUpperCase()}`;
          }
        },
        onSubscription: (channels) => {
          const bars = channels.bars ?? [];
          result.subscribed = bars.length > 0;
          result.subscriptionDetail = bars.includes('*')
            ? 'whole-market bars/updatedBars/statuses acknowledged (wildcard)'
            : `acknowledged ${bars.length} bar symbols`;
        },
        onError: (message, code, fatal) => {
          const text = `${code ?? ''} ${message}`.trim();
          if (!result.authenticated) result.authDetail = text;
          else result.subscriptionDetail = text;
          if (code === 409 || code === 408) {
            result.authDetail =
              `${text} — the account is not entitled to the ${credentials.feed.toUpperCase()} feed`;
          }
          if (fatal) finish();
        },
        onMessage: () => {},
        onMalformed: () => {},
        log: (message) => {
          if (debug) console.log(message);
        },
        debug: () => {},
      },
    });

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      stream.stop();
      resolve(result);
    };

    stream.start();
    setTimeout(finish, seconds * 1000);
  });
}

function printReport(): void {
  const width = Math.max(...lines.map(([label]) => label.length)) + 2;
  for (const [label, status, detail] of lines) {
    console.log(`${status.padEnd(5)} ${label.padEnd(width)} ${detail}`);
  }
}

main().catch((error) => {
  console.error('diagnostics failed:', String(error).slice(0, 500));
  process.exit(1);
});
