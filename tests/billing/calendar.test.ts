import { describe, expect, it, vi } from 'vitest';

import { tradingDayChecker } from '@/lib/billing/calendar';

describe('the trading calendar', () => {
  it('answers from the market calendar, one fetch per month', async () => {
    const fetchMonth = vi.fn(async () => [{ date: '2026-11-25' }, { date: '2026-11-27' }]);
    const isTradingDay = tradingDayChecker(fetchMonth);
    expect(await isTradingDay('2026-11-25')).toBe(true);
    // Thanksgiving, a weekday the market is shut.
    expect(await isTradingDay('2026-11-26')).toBe(false);
    expect(fetchMonth).toHaveBeenCalledTimes(1);
    expect(fetchMonth).toHaveBeenCalledWith('2026-11-01', '2026-11-30');
  });

  it('throws rather than answering when the calendar cannot be read', async () => {
    const isTradingDay = tradingDayChecker(async () => {
      throw new Error('alpaca down');
    });
    await expect(isTradingDay('2026-11-25')).rejects.toThrow('alpaca down');
  });
});
