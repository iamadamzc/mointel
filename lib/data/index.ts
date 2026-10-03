/**
 * Data access entry point.
 *
 * Responsibilities:
 *   - choose a provider (Google Sheets when credentials exist, mock only when
 *     USE_MOCK_DATA asks, otherwise none: an empty payload)
 *   - hold a short server-side cache so browser polling never maps 1:1 to
 *     Google API reads
 *   - de-duplicate concurrent refreshes
 *   - serve the last good payload with a stale flag when upstream fails
 *
 * The UI never imports a provider directly.
 */

import 'server-only';

import { GoogleSheetsProvider, readCredentialsFromEnv } from './providers/googleSheets';
import { MockProvider } from './providers/mock';
import { NoSourceProvider } from './providers/none';
import type { DashboardDataProvider, DashboardState } from './types';

/** How long a normalized payload may be reused before a new upstream read. */
export const CACHE_TTL_MS = 10_000;

type ProviderPayload = Awaited<ReturnType<DashboardDataProvider['load']>>;

interface CacheEntry {
  payload: ProviderPayload;
  storedAt: number;
}

interface DashboardRuntime {
  provider: DashboardDataProvider | null;
  cache: CacheEntry | null;
  inflight: Promise<ProviderPayload> | null;
  lastError: string | null;
}

// Persisted on globalThis so the cache survives Next.js dev hot reloads.
const globalRuntime = globalThis as typeof globalThis & {
  __momentumDesk?: DashboardRuntime;
};

const runtime: DashboardRuntime = (globalRuntime.__momentumDesk ??= {
  provider: null,
  cache: null,
  inflight: null,
  lastError: null,
});

function forcedMockMode(): boolean {
  const flag = process.env.USE_MOCK_DATA?.trim().toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
}

/**
 * Demo rows ONLY when `USE_MOCK_DATA` asks for them. Missing credentials mean
 * no outside source, served as an empty payload (`NoSourceProvider`), never as
 * mock rows: those read as research on the board and became tickers the
 * market worker tracked (Sheet removal plan, step 1).
 */
export function resolveProvider(): DashboardDataProvider {
  if (runtime.provider) return runtime.provider;

  if (forcedMockMode()) {
    runtime.provider = new MockProvider();
    return runtime.provider;
  }

  const credentials = readCredentialsFromEnv();
  runtime.provider = credentials ? new GoogleSheetsProvider(credentials) : new NoSourceProvider();
  return runtime.provider;
}

/** Test/dev helper: drops the memoized provider and cached payload. */
export function resetDashboardRuntime(): void {
  runtime.provider = null;
  runtime.cache = null;
  runtime.inflight = null;
  runtime.lastError = null;
}

function emptyPayload(provider: DashboardDataProvider, message: string): ProviderPayload {
  return {
    tickers: [],
    research: {},
    summary: {
      namesTracked: 0,
      freshFrontside: 0,
      frontsideWarning: 0,
      backside: 0,
      dirtyFloat: 0,
      strongCatalysts: 0,
    },
    meta: {
      provider: provider.kind,
      fetchedAt: new Date().toISOString(),
      sourceUpdatedAt: null,
      error: message,
      sourceTitle: null,
      warnings: [],
    },
  };
}

function staleMessage(reason: string): string {
  return `Upstream read failed, showing last good data: ${reason}`;
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const status = (error as { status?: number; code?: string }).status;
    return status ? `${error.message} (HTTP ${status})` : error.message;
  }
  return String(error);
}

async function refresh(provider: DashboardDataProvider): Promise<ProviderPayload> {
  if (runtime.inflight) return runtime.inflight;

  runtime.inflight = provider
    .load()
    .then((payload) => {
      runtime.cache = { payload, storedAt: Date.now() };
      runtime.lastError = null;
      return payload;
    })
    .finally(() => {
      runtime.inflight = null;
    });

  return runtime.inflight;
}

export interface GetDashboardOptions {
  /** Bypass the TTL and force an upstream read (manual refresh button). */
  force?: boolean;
}

/**
 * Returns the current dashboard payload, reading upstream at most once per
 * TTL window. On upstream failure the last good payload is returned with
 * `stale: true` rather than blanking the desk.
 */
export async function getDashboardState(
  options: GetDashboardOptions = {},
): Promise<DashboardState> {
  const provider = resolveProvider();
  const now = Date.now();
  const cached = runtime.cache;
  const cacheIsFresh = cached !== null && now - cached.storedAt < CACHE_TTL_MS;

  if (cacheIsFresh && !options.force) {
    // A pending lastError means the most recent upstream attempt failed, so
    // this cached payload is last-good data rather than current data.
    const degraded = runtime.lastError !== null;
    return withMeta(cached.payload, {
      stale: degraded,
      cacheAgeMs: now - cached.storedAt,
      error: degraded ? staleMessage(runtime.lastError as string) : null,
    });
  }

  try {
    const payload = await refresh(provider);
    const storedAt = runtime.cache?.storedAt ?? Date.now();
    return withMeta(payload, {
      stale: false,
      cacheAgeMs: Math.max(0, Date.now() - storedAt),
      error: null,
    });
  } catch (error) {
    const message = describeError(error);
    runtime.lastError = message;

    if (runtime.cache) {
      return withMeta(runtime.cache.payload, {
        stale: true,
        cacheAgeMs: Date.now() - runtime.cache.storedAt,
        error: staleMessage(message),
      });
    }

    return withMeta(emptyPayload(provider, message), {
      stale: true,
      cacheAgeMs: 0,
      error: message,
    });
  }
}

/**
 * Trims the RESEARCH map to the records the page can actually display.
 *
 * The provider loads every RESEARCH row the sheet holds — 128 dossiers — and
 * the dashboard payload carried all of them on every poll: 376KB every four
 * seconds to render six rows, which is roughly 340MB an hour of JSON parsed on
 * the main thread of a machine that is also running charts and Level 2.
 *
 * The rows on screen need their own records, and the drawer needs the record
 * for whatever the trader has open, so `extra` carries the selected and focused
 * names. Everything else is fetched when it is opened, not before.
 *
 * Scoping happens after the server-side cache, so this changes what is sent
 * over the wire and nothing about how often Google is read.
 */
export function scopeResearch(
  state: DashboardState,
  extra: readonly string[] = [],
): DashboardState {
  const wanted = new Set<string>();
  for (const ticker of state.tickers) wanted.add(ticker.ticker);
  for (const symbol of extra) {
    const upper = symbol.trim().toUpperCase();
    if (upper) wanted.add(upper);
  }

  const research: DashboardState['research'] = {};
  for (const symbol of wanted) {
    const record = state.research[symbol];
    if (record) research[symbol] = record;
  }

  return { ...state, research };
}

function withMeta(
  payload: ProviderPayload,
  patch: { stale: boolean; cacheAgeMs: number; error: string | null },
): DashboardState {
  return {
    tickers: payload.tickers,
    research: payload.research,
    summary: payload.summary,
    meta: {
      ...payload.meta,
      stale: patch.stale,
      cacheAgeMs: patch.cacheAgeMs,
      error: patch.error ?? payload.meta.error,
    },
  };
}
