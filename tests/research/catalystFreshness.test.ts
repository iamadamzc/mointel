import { describe, expect, it } from 'vitest';

import { DEFAULT_CATALYST_WINDOWS, resolveCatalystFreshness } from '@/lib/research/time';

/*
 * FRESHNESS IS ARITHMETIC, AND IT WAS BEING TAKEN ON THE MODEL'S WORD.
 *
 * `schema.ts` declares the enum with no description and the interpreter prompt
 * never defines its boundaries, so the model was asked for a temporal judgement
 * with no threshold given. `why.ts` computed the age three lines above taking
 * the colour from that answer, and a catalyst stamped `28d` rendered green.
 *
 * Measured on the 2026-08-23 production snapshot: 33 of 227 analyses with an
 * event timestamp claimed FRESH past the window, 19 more claimed it with no
 * timestamp at all.
 */
const NOW = new Date('2026-09-23T14:00:00.000Z');
const W = DEFAULT_CATALYST_WINDOWS;
const agoHours = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

describe('resolveCatalystFreshness', () => {
  it('refuses FRESH on the 28-day catalyst he screenshotted, whatever the model said', () => {
    expect(resolveCatalystFreshness(agoHours(28 * 24), NOW, W, 'FRESH')).toBe('RECENT');
  });

  it('keeps FRESH inside the published window', () => {
    // 36h covers the prior session's after-hours through this morning's premarket.
    expect(resolveCatalystFreshness(agoHours(35), NOW, W, 'FRESH')).toBe('FRESH');
    expect(resolveCatalystFreshness(agoHours(36), NOW, W, 'STALE')).toBe('FRESH');
  });

  it('turns fresh OFF one hour past the window, not one day', () => {
    expect(resolveCatalystFreshness(agoHours(37), NOW, W, 'FRESH')).toBe('RECENT');
  });

  it('leaves the RECENT/STALE call to the model past the window', () => {
    /*
     * His ruling, 2026-09-23: "leave to the model". The desk has never
     * published a RECENT boundary, and collapsing past-window to STALE would
     * newly fire NO_FRESH_CATALYST on 39 rows nobody asked to hide.
     */
    expect(resolveCatalystFreshness(agoHours(100), NOW, W, 'RECENT')).toBe('RECENT');
    expect(resolveCatalystFreshness(agoHours(100), NOW, W, 'STALE')).toBe('STALE');
  });

  it('falls to RECENT rather than STALE when the age only disproves FRESH', () => {
    // The age proves it is not fresh. It proves nothing about being stale, and
    // asserting the stronger verdict is the same overreach in the other
    // direction. UNKNOWN would discard an age the desk actually holds.
    expect(resolveCatalystFreshness(agoHours(100), NOW, W, 'UNKNOWN')).toBe('RECENT');
    expect(resolveCatalystFreshness(agoHours(100), NOW, W, null)).toBe('RECENT');
  });

  it('is UNKNOWN with no timestamp, however confident the model was', () => {
    // The 19 rows that claimed FRESH with nothing at all behind it.
    expect(resolveCatalystFreshness(null, NOW, W, 'FRESH')).toBe('UNKNOWN');
    expect(resolveCatalystFreshness('', NOW, W, 'FRESH')).toBe('UNKNOWN');
    expect(resolveCatalystFreshness('not a date', NOW, W, 'FRESH')).toBe('UNKNOWN');
  });

  it('is UNKNOWN for an event dated in the FUTURE, which the window test alone reads as fresh', () => {
    /*
     * `withinActiveWindow` tests `now - published <= window`, satisfied by any
     * future date. It was written for published sources where that cannot
     * arise; a model-supplied event date can.
     */
    expect(resolveCatalystFreshness(agoHours(-48), NOW, W, 'FRESH')).toBe('UNKNOWN');
  });
});
