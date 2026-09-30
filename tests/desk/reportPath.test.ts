import { describe, expect, it } from 'vitest';

import { reportPath, type PathRow } from '@/lib/desk/reports/path';

const intraday: PathRow = { price: 5.1, sessionHigh: 6.01, referenceClose: 3.59, referenceBasis: 'PRIOR_SESSION' };

describe('the price path, computed from the store', () => {
  it('intraday: prior close, the session high, now, from the checkpoint row', () => {
    for (const kind of ['INTO_RTH', 'INTO_POWER_HOUR', 'AFTER_HOURS'] as const) {
      expect(reportPath(kind, intraday, null)).toEqual({ from: 3.59, high: 6.01, now: 5.1, fromBasis: 'PRIOR_CLOSE' });
    }
  });

  it('premarket: the after-hours arc from today’s close, NEVER the recap row’s all-sessions high', () => {
    // SANG at the 22:00 recap: the row's high is all-sessions; the arc is passed in.
    // Last print 19:58 ET: an after-hours print, so "AH close" is true.
    const recapRow: PathRow = {
      price: 5.1,
      priceAt: '2026-09-28T23:58:00Z',
      sessionHigh: 9.99,
      referenceClose: 3.59,
      referenceBasis: 'CURRENT_SESSION',
    };
    expect(reportPath('PREMARKET', recapRow, { referenceClose: 3.59, high: 6.01 })).toEqual({
      from: 3.59,
      high: 6.01,
      now: 5.1,
      fromBasis: 'TODAY_CLOSE',
    });
    expect(reportPath('PREMARKET', recapRow, null)).toBeNull();
  });

  it('premarket: no path unless the last print IS after-hours, so the "AH close" label is true (Design 6fb68956)', () => {
    const arc = { referenceClose: 3.59, high: 6.01 };
    const base: PathRow = { price: 5.1, sessionHigh: 9.99, referenceClose: 3.59, referenceBasis: 'CURRENT_SESSION' };
    expect(reportPath('PREMARKET', { ...base, priceAt: '2026-09-28T19:30:00Z' }, arc)).toBeNull(); // 15:30 ET, regular session
    expect(reportPath('PREMARKET', { ...base, priceAt: null }, arc)).toBeNull();
    expect(reportPath('PREMARKET', { ...base, priceAt: '2026-09-28T20:00:00Z' }, arc)).not.toBeNull(); // 16:00 ET
    expect(reportPath('PREMARKET', { ...base, priceAt: '2026-09-29T00:00:00Z' }, arc)).not.toBeNull(); // 20:00 ET
  });

  it('refuses an intraday row whose percent is not on the prior-session basis', () => {
    expect(reportPath('INTO_RTH', { ...intraday, referenceBasis: 'CURRENT_SESSION' }, null)).toBeNull();
    expect(reportPath('INTO_RTH', { ...intraday, referenceBasis: null }, null)).toBeNull();
  });

  it('is null, never a guess, when a point is missing or not a price', () => {
    expect(reportPath('INTO_RTH', { ...intraday, price: null }, null)).toBeNull();
    expect(reportPath('INTO_RTH', { ...intraday, sessionHigh: null }, null)).toBeNull();
    expect(reportPath('INTO_RTH', { ...intraday, referenceClose: 0 }, null)).toBeNull();
    expect(reportPath('INTO_RTH', { ...intraday, price: Number.NaN }, null)).toBeNull();
    expect(reportPath('PREMARKET', intraday, { referenceClose: null, high: 6.01 })).toBeNull();
  });

  it('refuses a high below the current price, and allows a start above the high (a name down all day)', () => {
    expect(reportPath('INTO_RTH', { ...intraday, sessionHigh: 5.0 }, null)).toBeNull();
    expect(reportPath('INTO_RTH', { ...intraday, referenceClose: 7.2 }, null)).toEqual({
      from: 7.2,
      high: 6.01,
      now: 5.1,
      fromBasis: 'PRIOR_CLOSE',
    });
  });
});
