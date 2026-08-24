import { describe, expect, it } from 'vitest';

import {
  MIN_SESSIONS,
  resolveBlueSky,
  resolveBlueSkyThreshold,
  UNAVAILABLE_THRESHOLD,
} from '@/lib/market/blueSky';
import type { DailyBar } from '@/lib/research/history';

const TODAY = '2026-08-21';

/** A window of ordinary sessions topping out at `peak`, oldest first. */
function window(options: {
  sessions?: number;
  peak?: number;
  peakClose?: number;
  peakAt?: number;
  /** How close the rest of the window gets to the peak, as a fraction. */
  neighbourhood?: number;
}): DailyBar[] {
  const sessions = options.sessions ?? MIN_SESSIONS + 10;
  const peak = options.peak ?? 10;
  const peakAt = options.peakAt ?? Math.floor(sessions / 2);
  const neighbourhood = options.neighbourhood ?? 0.95;

  const bars: DailyBar[] = [];
  for (let i = 0; i < sessions; i += 1) {
    const day = String(i + 1).padStart(2, '0');
    const date = `2026-0${i < 31 ? '6' : '7'}-${String((i % 28) + 1).padStart(2, '0')}`;
    const isPeak = i === peakAt;
    const high = isPeak ? peak : peak * neighbourhood;
    const close = isPeak ? (options.peakClose ?? peak * 0.97) : high * 0.98;
    bars.push({
      tradingDate: `${date}-${day}`.slice(0, 10),
      open: close,
      high,
      low: close * 0.9,
      close,
      volume: 1_000_000,
      sessionComplete: true,
    });
  }
  // Dates must be unique and ordered; rebuild them as a clean ascending run.
  return bars.map((bar, index) => ({
    ...bar,
    tradingDate: new Date(Date.UTC(2026, 3, 1) + index * 86_400_000).toISOString().slice(0, 10),
  }));
}

describe('resolveBlueSkyThreshold', () => {
  it('is unavailable with no retained history', () => {
    const threshold = resolveBlueSkyThreshold([], { tradingDate: TODAY, adjustment: 'split' });
    expect(threshold).toEqual(UNAVAILABLE_THRESHOLD);
  });

  it("verifies the highest prior-session high when the window supports it", () => {
    const threshold = resolveBlueSkyThreshold(window({ peak: 12 }), {
      tradingDate: TODAY,
      adjustment: 'split',
    });
    expect(threshold.verified).toBe(true);
    expect(threshold.price).toBeCloseTo(12, 6);
    expect(threshold.unverifiedReason).toBeNull();
    expect(threshold.sessionsObserved).toBeGreaterThanOrEqual(MIN_SESSIONS);
  });

  it('refuses a window that is not split-adjusted', () => {
    const threshold = resolveBlueSkyThreshold(window({}), {
      tradingDate: TODAY,
      adjustment: 'raw',
    });
    expect(threshold.verified).toBe(false);
    expect(threshold.unverifiedReason).toContain('not split-adjusted');
  });

  it('refuses a window too shallow to establish a ceiling', () => {
    const threshold = resolveBlueSkyThreshold(window({ sessions: 12 }), {
      tradingDate: TODAY,
      adjustment: 'split',
    });
    expect(threshold.verified).toBe(false);
    expect(threshold.unverifiedReason).toContain('at least');
  });

  it('refuses a high that towers over its own close — a bad print', () => {
    const threshold = resolveBlueSkyThreshold(
      window({ peak: 40, peakClose: 8, neighbourhood: 0.2 }),
      { tradingDate: TODAY, adjustment: 'split' },
    );
    expect(threshold.verified).toBe(false);
    expect(threshold.unverifiedReason).toContain('bad print');
  });

  it('refuses an isolated legacy spike no other session came near', () => {
    // A believable session on its own terms (high close to its close), but
    // nothing else in the window reached anywhere near it.
    const bars = window({ peak: 10, neighbourhood: 0.3 });
    const threshold = resolveBlueSkyThreshold(bars, {
      tradingDate: TODAY,
      adjustment: 'split',
    });
    expect(threshold.verified).toBe(false);
    expect(threshold.unverifiedReason).toContain('isolated spike');
  });

  it('excludes the current session, because today is not overhead supply', () => {
    const bars = window({ peak: 10 });
    bars.push({
      tradingDate: TODAY,
      open: 20,
      high: 25,
      low: 19,
      close: 24,
      volume: 9_000_000,
      sessionComplete: true,
    });

    const threshold = resolveBlueSkyThreshold(bars, {
      tradingDate: TODAY,
      adjustment: 'split',
    });
    expect(threshold.price).toBeCloseTo(10, 6);
    expect(threshold.date).not.toBe(TODAY);
  });
});

describe('resolveBlueSky', () => {
  const verified = () =>
    resolveBlueSkyThreshold(window({ peak: 10 }), { tradingDate: TODAY, adjustment: 'split' });

  it('reports blue sky only once price has crossed a verified ceiling', () => {
    const state = resolveBlueSky(verified(), 10.4);
    expect(state.status).toBe('IN_BLUE_SKY');
    // Never "VERIFIED": the threshold's `verified` flag means the CEILING is a
    // real traded level, not that the sky above is clear — and with a
    // 90-session retention cap no correct run could establish the second.
    expect(state.label).toBe('ABOVE PRIOR CEILING $10.00');
    expect(state.label).not.toContain('VERIFIED');
    expect(state.distancePct).toBeCloseTo(4, 6);
  });

  it('names the level that is still above when price is in play beneath it', () => {
    const state = resolveBlueSky(verified(), 9.2);
    expect(state.status).toBe('BLUE_SKY_ABOVE');
    expect(state.label).toBe('BLUE SKY ABOVE $10.00');
  });

  it('calls out overhead supply when the ceiling is far above', () => {
    const state = resolveBlueSky(verified(), 4);
    expect(state.status).toBe('NOT_BLUE_SKY');
    expect(state.label).toBe('NOT BLUE SKY — OVERHEAD AT $10.00');
  });

  it('never claims blue sky from an unverified level', () => {
    const shallow = resolveBlueSkyThreshold(window({ sessions: 10, peak: 10 }), {
      tradingDate: TODAY,
      adjustment: 'split',
    });
    const state = resolveBlueSky(shallow, 999);
    expect(state.status).toBe('UNVERIFIED');
    expect(state.label).toBe('BLUE-SKY LEVEL UNVERIFIED');
  });

  it('says the data is missing rather than inventing open sky', () => {
    const state = resolveBlueSky(UNAVAILABLE_THRESHOLD, 999);
    expect(state.status).toBe('UNAVAILABLE');
    expect(state.label).toBe('BLUE-SKY DATA UNAVAILABLE');
  });

  it('states the level without placing it when there is no price', () => {
    const state = resolveBlueSky(verified(), null);
    expect(state.status).toBe('BLUE_SKY_ABOVE');
    expect(state.distancePct).toBeNull();
  });
});

/**
 * A ceiling set by a session still in progress.
 *
 * The high is a real traded price, so the ceiling stands. But the session may
 * print higher, which makes the level a FLOOR under the true ceiling rather
 * than the ceiling itself — and the difference is carried as data so a surface
 * can say so without this module inventing trader-facing words for it.
 */
describe('ceilingSessionComplete', () => {
  const finished = (tradingDate: string, high: number, close: number) => ({
    tradingDate, open: close, high, low: close * 0.9, close,
    volume: 1_000_000, sessionComplete: true,
  });

  it('is false when the ceiling came from an unfinished session', () => {
    const bars = [
      finished('2026-06-09', 1.48, 1.4),
      finished('2026-08-19', 1.32, 0.84),
      { tradingDate: '2026-08-20', open: 1.0, high: 1.57, low: 0.9, close: 1.25,
        volume: 62_000_000, sessionComplete: false },
    ];

    const t = resolveBlueSkyThreshold(bars, { tradingDate: '2026-08-24', adjustment: 'split' });

    expect(t.price).toBe(1.57);
    expect(t.ceilingSessionComplete).toBe(false);
  });

  it('is true when it did not', () => {
    const bars = [finished('2026-06-09', 1.48, 1.4), finished('2026-08-19', 1.32, 0.84)];

    const t = resolveBlueSkyThreshold(bars, { tradingDate: '2026-08-24', adjustment: 'split' });

    expect(t.price).toBe(1.48);
    expect(t.ceilingSessionComplete).toBe(true);
  });

  it('is null when there is no ceiling at all', () => {
    const t = resolveBlueSkyThreshold([], { tradingDate: '2026-08-24', adjustment: 'split' });

    expect(t.price).toBeNull();
    expect(t.ceilingSessionComplete).toBeNull();
  });
});
