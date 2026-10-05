import { describe, expect, it } from 'vitest';

import { effectiveView, isOffHoursEmpty, recapToOpen, selectorOptions } from '@/lib/dashboard/offHours';
import type { AssessmentSummary } from '@/lib/desk/view';

const cp = (id: number): AssessmentSummary => ({ id }) as unknown as AssessmentSummary;

describe('isOffHoursEmpty: the window is exactly "no session and an empty live board"', () => {
  it('is true for CLOSED and NEXT_DAY_PREP with no rows', () => {
    expect(isOffHoursEmpty('CLOSED', 0)).toBe(true);
    expect(isOffHoursEmpty('NEXT_DAY_PREP', 0)).toBe(true);
  });

  it('is false from 20:00 to 22:00 (POST_MARKET has a live after-hours board) and in every trading phase', () => {
    for (const phase of ['POST_MARKET', 'PREMARKET', 'RTH', 'AFTER_HOURS'] as const) {
      expect(isOffHoursEmpty(phase, 0), phase).toBe(false);
    }
  });

  it('is false when the board has rows, or when the phase is unknown (nothing observed, nothing claimed)', () => {
    expect(isOffHoursEmpty('NEXT_DAY_PREP', 3)).toBe(false);
    expect(isOffHoursEmpty(null, 0)).toBe(false);
    expect(isOffHoursEmpty(undefined, 0)).toBe(false);
  });
});

describe('the checkpoint to open', () => {
  it('prefers today\'s newest, else the carried one, else none', () => {
    expect(recapToOpen({ today: [cp(1), cp(2)], carried: cp(9) })?.id).toBe(2);
    expect(recapToOpen({ today: [], carried: cp(9) })?.id).toBe(9);
    expect(recapToOpen({ today: [], carried: null })).toBeNull();
    expect(recapToOpen({ today: [] })).toBeNull();
  });

  it('lists the carried checkpoint in the selector only when today has none', () => {
    expect(selectorOptions({ today: [cp(1)], carried: cp(9) }).map((c) => c.id)).toEqual([1]);
    expect(selectorOptions({ today: [], carried: cp(9) }).map((c) => c.id)).toEqual([9]);
    expect(selectorOptions({ today: [], carried: null })).toEqual([]);
  });
});

describe('effectiveView: B opens on the recap, and never overrides a choice', () => {
  it('AUTO opens the recap off-hours and the live board otherwise', () => {
    expect(effectiveView('AUTO', true, cp(9))).toBe(9);
    expect(effectiveView('AUTO', false, cp(9))).toBeNull();
  });

  it('AUTO with nothing to open stays on the live board rather than showing nothing', () => {
    expect(effectiveView('AUTO', true, null)).toBeNull();
  });

  it('an explicit LIVE or checkpoint choice always wins, in or out of the window', () => {
    expect(effectiveView('LIVE', true, cp(9))).toBeNull();
    expect(effectiveView(4, true, cp(9))).toBe(4);
    expect(effectiveView(4, false, null)).toBe(4);
  });
});
