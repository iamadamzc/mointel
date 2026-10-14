import type { DashboardDataProvider } from '../types';

/**
 * The provider when no outside research source is configured.
 *
 * Until 2026-10-03 a missing Sheet key fell through to `MockProvider`, so a
 * server without the Google credentials served made-up demo rows as if they
 * were research, and the market worker, which reads its tickers from the
 * dashboard payload, tracked those fake names. Step 1 of the Sheet removal
 * plan: an absent source is an explicit EMPTY payload with no error, because
 * absence is the intended state, not a failure. Since the Sheet code removal (A5,
 * 2026-10-14) this is the only provider: there are no demo rows anywhere.
 */
export class NoSourceProvider implements DashboardDataProvider {
  readonly kind = 'none' as const;

  async load() {
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
        provider: this.kind,
        fetchedAt: new Date().toISOString(),
        sourceUpdatedAt: null,
        error: null,
        sourceTitle: null,
        warnings: [],
      },
    };
  }
}
