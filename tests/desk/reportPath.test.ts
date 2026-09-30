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
    const recapRow: PathRow = { price: 5.1, sessionHigh: 9.99, referenceClose: 3.59, referenceBasis: 'CURRENT_SESSION' };
    expect(reportPath('PREMARKET', recapRow, { referenceClose: 3.59, high: 6.01 })).toEqual({
      from: 3.59,
      high: 6.01,
      now: 5.1,
      fromBasis: 'TODAY_CLOSE',
    });
    expect(reportPath('PREMARKET', recapRow, null)).toBeNull();
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
