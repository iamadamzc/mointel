import { describe, expect, it } from 'vitest';

import {
  describeBlueSkyWindow,
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
      splitFactor: null,
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
      splitFactor: null,
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
    expect(state.label).toBe('NOT BLUE SKY · OVERHEAD AT $10.00');
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
    volume: 1_000_000, sessionComplete: true, splitFactor: null,
  });

  it('is false when the ceiling came from an unfinished session', () => {
    const bars = [
      finished('2026-06-09', 1.48, 1.4),
      finished('2026-08-19', 1.32, 0.84),
      { tradingDate: '2026-08-20', open: 1.0, high: 1.57, low: 0.9, close: 1.25,
        volume: 62_000_000, sessionComplete: false, splitFactor: null },
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

/**
 * The basis a ceiling sits on, carried beside it.
 *
 * The trader chose "as deep as you can go" after being shown what it produces:
 * BTCT's all-history ceiling is $14,249.94 on a session that traded four
 * shares, because two consolidations stand between that price and today. The
 * number is arithmetically correct and describes shares that no longer exist in
 * that form.
 *
 * So depth alone is not the deliverable. Depth WITH its basis is.
 */
describe('ceilingSplitFactor and ceilingComparable', () => {
  const bar = (
    tradingDate: string,
    high: number,
    close: number,
    splitFactor: number | null,
  ) => ({
    tradingDate, open: close, high, low: close * 0.9, close,
    volume: 1_000_000, sessionComplete: true, splitFactor,
  });

  it('reports a ceiling on today\u2019s basis as comparable', () => {
    const bars = [bar('2026-06-09', 1.48, 1.4, 1), bar('2026-08-19', 1.32, 0.84, 1)];

    const t = resolveBlueSkyThreshold(bars, { tradingDate: '2026-08-24', adjustment: 'split' });

    expect(t.price).toBe(1.48);
    expect(t.ceilingSplitFactor).toBe(1);
    expect(t.ceilingComparable).toBe(true);
  });

  it('reports BTCT\u2019s deep ceiling as NOT comparable, with the factor', () => {
    // The real shape: the 2020 bar carries a cumulative factor of 600, so the
    // ceiling and the current price are not on the same basis at all.
    const bars = [
      bar('2020-03-31', 14_249.94, 14_034, 600),
      bar('2024-11-13', 26.58, 22, 1),
      bar('2026-08-19', 1.32, 0.84, 1),
    ];

    const t = resolveBlueSkyThreshold(bars, { tradingDate: '2026-08-24', adjustment: 'split' });

    // Since 2026-10-02 the deep ceiling is data only; `price` is the level on today's basis.
    expect(t.deepCeiling).toEqual({ price: 14_249.94, date: '2020-03-31', splitFactor: 600 });
    expect(t.price).toBe(26.58);
    expect(t.consolidated).toBe(true);
    expect(t.ceilingSplitFactor).toBe(600);
    expect(t.ceilingComparable).toBe(false);
  });

  it('is null rather than true when no factor was established', () => {
    /*
     * The distinction the whole design turns on. A bar written by the shallow
     * path has no raw series behind it, so its basis is UNKNOWN -- and reading
     * that as "comparable" would assert the one thing nobody checked.
     */
    const bars = [bar('2026-06-09', 1.48, 1.4, null), bar('2026-08-19', 1.32, 0.84, null)];

    const t = resolveBlueSkyThreshold(bars, { tradingDate: '2026-08-24', adjustment: 'split' });

    expect(t.ceilingSplitFactor).toBeNull();
    expect(t.ceilingComparable).toBeNull();
  });

  it('carries the window it actually looked over, which is what depth means', () => {
    // Design renders depth in text; it can only do that from real numbers, so
    // these have to describe the fetch rather than a configured intent.
    const bars = [bar('2020-03-31', 14_249.94, 14_034, 600), bar('2026-08-19', 1.32, 0.84, 1)];

    const t = resolveBlueSkyThreshold(bars, { tradingDate: '2026-08-24', adjustment: 'split' });

    expect(t.windowFrom).toBe('2020-03-31');
    expect(t.sessionsObserved).toBe(2);
  });
});

/**
 * The number a reader can act on, beside the one the trader asked for.
 *
 * He chose "as deep as you can go" knowing it yields $14,249.94 on BTCT. That
 * is the deep ceiling and it is correct. The comparable ceiling is the highest
 * prior high on today's basis — $26.58 on 2024-11-13 — and on BTCT the verdict
 * is the same either way, since $26.58 is still ten times the price. Both are
 * supplied because which one renders is Design's call and it cannot be a call
 * unless both exist.
 */
describe('comparableCeiling', () => {
  const bar = (
    tradingDate: string,
    high: number,
    splitFactor: number | null,
  ) => ({
    tradingDate, open: high * 0.9, high, low: high * 0.8, close: high * 0.95,
    volume: 1_000_000, sessionComplete: true, splitFactor,
  });

  it("separates BTCT's deep ceiling from the one on today's basis", () => {
    const bars = [
      bar('2020-03-31', 14_249.94, 600),
      bar('2022-06-01', 48.8, 20),
      bar('2024-11-13', 26.58, 1),
      bar('2026-08-19', 1.32, 1),
    ];

    const t = resolveBlueSkyThreshold(bars, { tradingDate: '2026-08-24', adjustment: 'split' });

    expect(t.deepCeiling?.price).toBe(14_249.94);
    expect(t.price).toBe(26.58);
    expect(t.comparableCeiling).toBe(26.58);
    expect(t.comparableCeilingDate).toBe('2024-11-13');
  });

  it('agrees with the deep ceiling when nothing ever split', () => {
    const bars = [bar('2026-06-09', 12.14, 1), bar('2026-08-19', 9, 1)];

    const t = resolveBlueSkyThreshold(bars, { tradingDate: '2026-08-24', adjustment: 'split' });

    expect(t.comparableCeiling).toBe(t.price);
  });

  it('does NOT count a bar whose basis was never established', () => {
    /*
     * The claim being made is comparability, so it cannot rest on an
     * assumption. A shallow-written bar has no raw series behind it and a null
     * factor means "not established" -- treating that as 1 would assert exactly
     * the thing nobody checked.
     */
    const bars = [bar('2026-06-09', 12.14, null), bar('2026-08-19', 9, null)];

    const t = resolveBlueSkyThreshold(bars, { tradingDate: '2026-08-24', adjustment: 'split' });

    expect(t.price).toBe(12.14);
    expect(t.comparableCeiling).toBeNull();
    expect(t.comparableCeilingDate).toBeNull();
  });

  it('is null when every comparable session is the current one', () => {
    // Prior sessions only, same as the deep ceiling: today's own high is the
    // move being assessed rather than a level over it.
    const bars = [bar('2026-08-24', 5, 1)];

    expect(
      resolveBlueSkyThreshold(bars, { tradingDate: '2026-08-24', adjustment: 'split' })
        .comparableCeiling,
    ).toBeNull();
  });
});

/*
 * THE REFUSAL HAS TO NAME ITS OWN CAUSE.
 *
 * The board carried one sentence for every refusal: "the retained history is
 * not split-adjusted". Measured 2026-09-22, that was false wherever it mattered
 * -- 7,173 of 7,173 rows locally and 24,429 of 24,429 in the 2026-08-23
 * production snapshot are labelled `'split'`, and none are raw. The trader read
 * it as a missing feed and asked whether the desk was giving up too early. It
 * was refusing on a vintage it could not reconcile, which is a smaller claim
 * and a fixable one.
 */
describe('why a basis could not be vouched', () => {
  it('says the history IS adjusted but was fetched more than once', () => {
    const threshold = resolveBlueSkyThreshold(window({}), {
      tradingDate: TODAY,
      adjustment: null,
      basisReason: 'UNRECONCILED_VINTAGES',
    });

    expect(threshold.verified).toBe(false);
    expect(threshold.unverifiedReason).toContain('is split-adjusted');
    expect(threshold.unverifiedReason).toContain('more than one date');
    // The sentence that sent him looking for a data gap that was not there.
    expect(threshold.unverifiedReason).not.toContain('not split-adjusted');
  });

  it('says the factors disagree when a stale vintage is actually detected', () => {
    const threshold = resolveBlueSkyThreshold(window({}), {
      tradingDate: TODAY,
      adjustment: null,
      basisReason: 'BASIS_CONFLICT',
    });

    expect(threshold.unverifiedReason).toContain('stale basis');
    expect(threshold.unverifiedReason).not.toContain('not split-adjusted');
  });

  it('says the labels are mixed when they genuinely are', () => {
    const threshold = resolveBlueSkyThreshold(window({}), {
      tradingDate: TODAY,
      adjustment: null,
      basisReason: 'MIXED_LABELS',
    });

    expect(threshold.unverifiedReason).toContain('mixes adjustment bases');
  });

  it('keeps the original sentence for a series that really is unadjusted', () => {
    // `raw` vouches as a basis -- it is simply the wrong one, and the old
    // wording is exactly right for it.
    const threshold = resolveBlueSkyThreshold(window({}), {
      tradingDate: TODAY,
      adjustment: 'raw',
      basisReason: null,
    });

    expect(threshold.unverifiedReason).toContain('not split-adjusted');
  });
});

/**
 * GNPX, 2026-10-02: a deep ceiling behind a KNOWN consolidation is never the
 * level. Pre-split neighbours carry the same factor and corroborate each
 * other, so every guard passed on a $855,795.60 "overhead" that nobody can
 * trade against. The verdict now rests on today's share basis only.
 */
describe('a ceiling behind a consolidation (GNPX shape)', () => {
  const day = (index: number) => new Date(Date.UTC(2018, 2, 29) + index * 86_400_000).toISOString().slice(0, 10);
  const bar = (index: number, high: number, splitFactor: number | null) => ({
    tradingDate: day(index), open: high * 0.9, high, low: high * 0.8, close: high * 0.95,
    volume: 1_000_000, sessionComplete: true, splitFactor,
  });
  /** `pre` pre-split sessions at factor 44,000 (corroborated near 855,795.60), then `post` sessions on today's basis peaking at 9.99. */
  function gnpx(pre: number, post: number, postFactor: number | null = 1) {
    const bars = [];
    for (let i = 0; i < pre; i += 1) bars.push(bar(i, i === 5 ? 855_795.6 : 800_000, 44_000));
    for (let i = 0; i < post; i += 1) bars.push(bar(pre + i, i === 10 ? 9.99 : 9.5, postFactor));
    return bars;
  }
  const TODAY_GNPX = '2026-12-31';

  it('rests the verdict on the high on today’s basis; the deep ceiling is data only, never in any printed text', () => {
    const t = resolveBlueSkyThreshold(gnpx(50, 45), { tradingDate: TODAY_GNPX, adjustment: 'split' });
    expect(t.verified).toBe(true);
    expect(t.price).toBe(9.99);
    expect(t.consolidated).toBe(true);
    expect(t.deepCeiling).toEqual({ price: 855_795.6, date: day(5), splitFactor: 44_000 });

    const state = resolveBlueSky(t, 2.81);
    expect(state.status).toBe('NOT_BLUE_SKY');
    expect(state.label).toBe('NOT BLUE SKY · OVERHEAD AT $9.99');
    expect(t.lastSplit).toEqual({ ratio: 44_000, firstSessionOnBasis: day(50) });
    const window = describeBlueSkyWindow(t)!;
    expect(window).toBe(`Highest prior-session high since the 1-for-44,000 reverse split effective ${day(50)}. Older highs, back to ${day(0)}, are not compared with today's price.`);
    expect(`${state.label} ${window}`).not.toMatch(/855|800,?000/);
  });

  it('is UNVERIFIED with no price at all when no high on today’s basis is established', () => {
    const t = resolveBlueSkyThreshold(gnpx(50, 45, null), { tradingDate: TODAY_GNPX, adjustment: 'split' });
    expect(t.verified).toBe(false);
    expect(t.price).toBeNull();
    expect(t.unverifiedReason).toContain('share consolidation stands between');
    expect(t.deepCeiling?.price).toBe(855_795.6);
    const state = resolveBlueSky(t, 2.81);
    expect(state.label).toBe('BLUE-SKY LEVEL UNVERIFIED');
    expect(`${state.label} ${t.unverifiedReason}`).not.toMatch(/855/);
  });

  it('needs MIN_SESSIONS on today’s basis, not across the whole window', () => {
    const t = resolveBlueSkyThreshold(gnpx(50, 20), { tradingDate: TODAY_GNPX, adjustment: 'split' });
    expect(t.verified).toBe(false);
    expect(t.price).toBe(9.99);
    expect(t.unverifiedReason).toContain("20 prior session(s) on today's share basis");
  });

  it('leaves an UNKNOWN factor (shallow-written bars) exactly as before', () => {
    const bars = gnpx(0, 50, null);
    const t = resolveBlueSkyThreshold(bars, { tradingDate: TODAY_GNPX, adjustment: 'split' });
    expect(t.verified).toBe(true);
    expect(t.price).toBe(9.99);
    expect(t.consolidated).toBe(false);
    expect(describeBlueSkyWindow(t)).toContain('Not necessarily an all-time high.');
  });
});

describe('naming the last split, not the cumulative factor', () => {
  const day = (index: number) => new Date(Date.UTC(2024, 0, 1) + index * 86_400_000).toISOString().slice(0, 10);
  const bar = (index: number, high: number, splitFactor: number | null) => ({
    tradingDate: day(index), open: high * 0.9, high, low: high * 0.8, close: high * 0.95,
    volume: 1_000_000, sessionComplete: true, splitFactor,
  });

  it('two reverse splits (1-for-20 then 1-for-40): names the LAST one, never the cumulative 800', () => {
    const bars = [];
    for (let i = 0; i < 10; i += 1) bars.push(bar(i, 4_000, 800)); // before both splits
    for (let i = 10; i < 20; i += 1) bars.push(bar(i, 200, 40)); // between them
    for (let i = 20; i < 70; i += 1) bars.push(bar(i, i === 30 ? 6 : 5.8, 1));
    const t = resolveBlueSkyThreshold(bars, { tradingDate: '2026-12-31', adjustment: 'split' });
    expect(t.lastSplit).toEqual({ ratio: 40, firstSessionOnBasis: day(20) });
    expect(describeBlueSkyWindow(t)).toContain('since the 1-for-40 reverse split effective');
    expect(describeBlueSkyWindow(t)).not.toContain('800');
  });

  it('a measured factor that is not a whole ratio is not stated as one', () => {
    const bars = [];
    for (let i = 0; i < 10; i += 1) bars.push(bar(i, 4_000, 37.5)); // 1.3% from 37 and from 38: outside the 1% rule
    for (let i = 10; i < 60; i += 1) bars.push(bar(i, i === 30 ? 6 : 5.8, 1));
    const t = resolveBlueSkyThreshold(bars, { tradingDate: '2026-12-31', adjustment: 'split' });
    expect(describeBlueSkyWindow(t)).toContain('sit behind a share consolidation');
  });
});
