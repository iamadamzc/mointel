import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { SESSIONS_WORDS, afterHoursLine, closeLine } from '@/lib/dashboard/sessionsView';
import type { AfterHoursState, DemandState, RthFinalState } from '@/lib/market/types';

const EM_DASH = String.fromCharCode(0x2014);
const PRIOR = { referenceRthClose: 2.5, referenceRthCloseDate: '2026-08-14', referenceRthCloseSource: 'alpaca-snapshot-prev-daily-bar' };
const TODAY_BAR = { referenceRthClose: 3.1, referenceRthCloseDate: '2026-08-17', referenceRthCloseSource: 'alpaca-daily-bar-rth-close' };
const frozen = (close: number | null): RthFinalState => ({ close, high: null, low: null, volume: null, rvol: null, rvolRank: null, frozenAt: '2026-08-17T20:00:00.000Z' });
const ahState = (over: Partial<AfterHoursState> = {}): AfterHoursState =>
  ({ volume: 1_250_000, percentChange: 12.3, referenceClose: 3.1, high: 3.6, low: 3.0, coverage: 'COMPLETE', ...over }) as AfterHoursState;

function demand(over: Record<string, unknown> = {}): DemandState {
  return {
    ticker: 'ABC',
    tradingDate: '2026-08-17',
    price: 3.48,
    ...PRIOR,
    referenceRthCloseBasis: 'PRIOR_SESSION',
    rthFinal: null,
    afterHours: ahState({ volume: null, percentChange: null, high: null, coverage: 'NONE' }),
    ...over,
  } as unknown as DemandState;
}

describe('the close line', () => {
  it("before today's bell: the LAST session's close with its date, from the daily bar (never Not yet)", () => {
    expect(closeLine(demand())).toEqual({
      state: 'PRODUCED',
      text: '$2.50, Aug 14, 2026',
      hover: 'The regular-session close from the daily bar for Aug 14, 2026.',
    });
  });

  it('Not yet only when no session close has been captured at all', () => {
    expect(closeLine(demand({ referenceRthClose: null })).state).toBe('NOT_YET');
  });

  it("after the bell with today's daily bar: today's close", () => {
    const line = closeLine(demand({ ...TODAY_BAR, referenceRthCloseBasis: 'CURRENT_SESSION', rthFinal: frozen(3.09) }));
    expect(line).toMatchObject({ state: 'PRODUCED', text: '$3.10, Aug 17, 2026' });
    expect(line.hover).toBe(SESSIONS_WORDS.closeFromBar('Aug 17, 2026'));
  });

  it("after the bell before the bar: the provisional trade, NEVER the prior session's close the reference still holds", () => {
    const line = closeLine(demand({ rthFinal: frozen(3.09) }));
    expect(line.text).toBe('$3.09, Aug 17, 2026');
    expect(line.text).not.toContain('2.50');
    expect(line.hover).toBe(
      "The last trade the desk saw around the bell on Aug 17, 2026. The daily bar's close can differ.",
    );
  });

  it('after the bell with no value at all: Unknown, with the day', () => {
    expect(closeLine(demand({ rthFinal: frozen(null) }))).toEqual({
      state: 'UNKNOWN',
      text: 'Unknown',
      hover: 'The desk has no regular-session close recorded for Aug 17, 2026.',
    });
  });

  it('a close not from a daily bar makes no daily-bar claim: the Sheet, or a source not recorded', () => {
    expect(closeLine(demand({ referenceRthCloseSource: 'sheet' })).hover).toBe('The close for Aug 14, 2026 as the Sheet recorded it.');
    expect(closeLine(demand({ referenceRthCloseSource: null })).hover).toBe(
      'A close for Aug 14, 2026. The desk did not record where it came from.',
    );
  });
});

describe('the after-hours line (today only)', () => {
  const after = (ah: Partial<AfterHoursState>, extra: Record<string, unknown> = {}) =>
    afterHoursLine(
      demand({ ...TODAY_BAR, referenceRthCloseBasis: 'CURRENT_SESSION', rthFinal: frozen(3.1), afterHours: ahState(ah), ...extra }),
    );

  it("before the bell: Not yet, worded as TODAY's after hours", () => {
    expect(afterHoursLine(demand())).toMatchObject({
      state: 'NOT_YET',
      text: "Today's after hours begins after the regular-session close",
      parts: null,
    });
  });

  it('complete coverage: price, percent from the close, volume, each with its hover', () => {
    const line = after({});
    expect(line.text).toBe('$3.48, +12.3% from the close, 1.25M shares');
    expect(line.parts?.percent.hover).toBe('Measured from the close shown above, for Aug 17, 2026.');
    expect(line.parts?.volume.hover).toBe('Counts only trades after the bell.');
  });

  it("before today's daily bar: the percent reads No final close, true beside the provisional close shown above", () => {
    const line = after({ percentChange: null }, { ...PRIOR, referenceRthCloseBasis: 'PRIOR_SESSION' });
    expect(line.parts?.percent).toEqual({
      state: 'UNKNOWN',
      text: 'No final close',
      hover: "The change is measured from the daily bar's close for Aug 17, 2026, which the desk does not have.",
    });
  });

  it('with no close shown at all, the percent reads No close', () => {
    const line = after({ percentChange: null }, { ...PRIOR, referenceRthCloseBasis: 'PRIOR_SESSION', rthFinal: frozen(null) });
    expect(line.parts?.percent).toEqual({ state: 'UNKNOWN', text: 'No close', hover: 'The desk has no close to measure the change from.' });
    expect(line.parts?.price.state).toBe('PRODUCED');
  });

  it('partial coverage: volume Unknown, price and percent still print', () => {
    const line = after({ coverage: 'PARTIAL', volume: null });
    expect(line.parts?.volume).toMatchObject({ state: 'UNKNOWN', hover: SESSIONS_WORDS.volumePartial('Aug 17, 2026') });
    expect(line.parts?.price.state).toBe('PRODUCED');
    expect(line.parts?.percent.state).toBe('PRODUCED');
  });

  it('coverage NONE after the bell (unreachable live): every figure Unknown, and no claim about why', () => {
    expect(after({ coverage: 'NONE', volume: null })).toEqual({ state: 'UNKNOWN', text: 'Unknown', hover: null, parts: null });
  });

  it('a simulator close never prints', () => {
    expect(closeLine(demand({ referenceRthCloseSource: 'simulator' }))).toEqual({ state: 'UNKNOWN', text: 'Unknown', hover: null });
  });

  it('no after-hours trade seen: the regular session price is never printed as an after-hours price', () => {
    const complete = after({ high: null, volume: 0 });
    expect(complete).toMatchObject({
      state: 'PRODUCED',
      text: 'No after-hours trade recorded',
      hover: "The desk's after-hours figures for Aug 17, 2026 include no trade.",
      parts: null,
    });
    expect(complete.text).not.toContain('3.48');
    const partial = after({ high: null, coverage: 'PARTIAL', volume: null });
    expect(partial.parts?.price.state).toBe('UNKNOWN');
    expect(partial.parts?.percent.state).toBe('UNKNOWN');
    // Price and percent say they cannot tell; only the volume speaks of leaving trades out.
    const cannotTell = 'The desk did not see every trade after the bell on Aug 17, 2026, so it cannot show an after-hours price or change.';
    expect(partial.parts?.price.hover).toBe(cannotTell);
    expect(partial.parts?.percent.hover).toBe(cannotTell);
    expect(partial.parts?.volume.hover).toBe(SESSIONS_WORDS.volumePartial('Aug 17, 2026'));
    expect(partial.text).not.toContain('3.48');
  });
});

describe('words and placement', () => {
  it('no em dash, no "frozen at the bell", no forward tense in any string', () => {
    const all = Object.values(SESSIONS_WORDS)
      .map((w) => (typeof w === 'function' ? w('Aug 17, 2026') : w))
      .join(' ');
    expect(all).not.toContain(EM_DASH);
    expect(all).not.toMatch(/frozen at/i);
    // No clock: the real close can be early (Commercial 9).
    expect(all).not.toMatch(/\d{1,2}:\d{2}/);
    expect(all).not.toMatch(/\b(will|yet to|pending|soon)\b/i);
  });

  it('the drawer renders the group in the market section, with no premarket line', () => {
    const drawer = readFileSync('components/TickerDrawer.tsx', 'utf8');
    expect(drawer).toContain('<SessionsGroup demand={demand} />');
    // The percent hover says "shown above": the group must stay one column, close first.
    expect(drawer).toContain('<div className="mt-1 grid grid-cols-1 gap-y-3">');
    // The old footnote's close sentence and raw engine strings are gone; Sessions carries the close (Integration 29th).
    expect(drawer).not.toContain('16:00 ET regular-session close');
    expect(drawer).not.toContain("demand.referenceRthCloseSource ?? 'unknown'");
    expect(drawer).not.toContain('demand.volumeSource ??');
    expect(drawer).not.toContain('demand.baselineAdjustment ??');
    // No premarket line until Ops's field exists (Integration 29th).
    expect(Object.keys(SESSIONS_WORDS).some((key) => /premarket/i.test(key))).toBe(false);
  });
});
