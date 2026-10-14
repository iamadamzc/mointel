import { describe, expect, it } from 'vitest';

import { DemandEngine } from '@/lib/market/engine';

/*
 * Moved from tests/data/sheetFailClosed.test.ts when the Sheet parsers were
 * deleted (A5): the rest of that file tested the Sheet table reader, this block
 * tests the engine and still applies to any source of pins.
 */
describe('pin provenance', () => {
  const engine = () =>
    new DemandEngine({
      tradingDate: '2026-08-20',
      rthCloseMinutes: 960,
    } as never);

  it('replaces pins without disturbing symbols tracked for other reasons', () => {
    /*
     * A refresh owns the pinned set and nothing else. A name the market put on
     * the board, or one the trader is holding for another reason, is not the
     * pin source's to remove.
     */
    const demand = engine();
    demand.track('MARKETMOVER'); // arrived from the feed, not a pin
    demand.setPinnedSymbols(['BEEM', 'EVAX']);

    demand.setPinnedSymbols(['HUIZ']); // the pin source changed

    expect(demand.isTracked('HUIZ')).toBe(true);
    expect(demand.isTracked('MARKETMOVER')).toBe(true);
    // Previously pinned names stay tracked; they simply stop being pinned, so
    // their evidence and session state are not thrown away mid-session.
    expect(demand.isTracked('BEEM')).toBe(true);
  });
});
