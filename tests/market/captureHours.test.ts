import { describe, expect, it } from 'vitest';

import { insideCaptureHours } from '@/worker/trigger-lead-time';

/**
 * The guard that keeps a whole-session read off the box while it is capturing.
 *
 * Integration's condition for letting the instrument run on production at all.
 * ITS REFUSING BRANCH IS THE ONE THAT MATTERS, and a guard whose refusal has
 * never executed is a guard nobody has seen work — so these run the refusal
 * first and the permission second.
 */
describe('it refuses while the desk is capturing', () => {
  it('refuses through the whole session, premarket to after-hours close', () => {
    for (const [label, iso] of [
      ['04:00 ET, session open', '2026-09-08T08:00:00Z'],
      ['07:30 ET, his window', '2026-09-08T11:30:00Z'],
      ['15:59 ET, regular hours', '2026-09-08T19:59:00Z'],
      ['19:59 ET, last minute', '2026-09-08T23:59:00Z'],
    ] as const) {
      expect(insideCaptureHours(new Date(iso)).inside, label).toBe(true);
    }
  });
});

describe('and allows the hours Integration named', () => {
  it('allows the overnight gap on a trading day', () => {
    // 20:00 ET is the first allowed minute, and 03:59 the last.
    expect(insideCaptureHours(new Date('2026-09-09T00:00:00Z')).inside).toBe(false);
    expect(insideCaptureHours(new Date('2026-09-08T07:59:00Z')).inside).toBe(false);
  });

  it('allows a weekend at any hour, including mid-session clock time', () => {
    // Sunday 2026-09-06 at 11:30 ET — the same clock minute that is refused on
    // a Tuesday. The day is part of the condition, not decoration.
    expect(insideCaptureHours(new Date('2026-09-06T15:30:00Z')).inside).toBe(false);
    expect(insideCaptureHours(new Date('2026-09-05T15:30:00Z')).inside).toBe(false);
  });

  it('reports the ET label it judged on, so a refusal says why', () => {
    expect(insideCaptureHours(new Date('2026-09-08T11:30:00Z')).label).toBe('Tue 07:30 ET');
  });
});
