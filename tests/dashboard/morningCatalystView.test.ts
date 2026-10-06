import { describe, expect, it } from 'vitest';

import { MORNING_CATALYST_WORDS, morningCatalystView } from '@/lib/dashboard/morningCatalystView';
import type { Confirmation, PmCatalyst } from '@/lib/desk/morningRead';
import type { MorningReadPayload } from '@/lib/market/types';

const EM_DASH = String.fromCharCode(0x2014);
const EVENING = '2026-10-06T02:00:00.000Z'; // Oct 5, 22:00 ET
const MORNING = '2026-10-06T11:00:00.000Z'; // Oct 6, 07:00 ET
const NOW = '2026-10-06T11:30:00.000Z';
const WRITTEN = '2026-10-06T10:41:00.000Z'; // Oct 6, 06:41 ET

const confirmation: Confirmation = { state: 'NOT_RECHECKED', reason: null, changes: [], eveningAt: EVENING, morningAt: MORNING };
const newer = (over: Partial<PmCatalyst> = {}): PmCatalyst => ({
  state: 'NEWER',
  reason: null,
  catalyst: {
    summary: `The company announced a contract ${EM_DASH} its largest [Source 115982].`,
    status: 'FRESH_FOUND',
    grade: 'NONE',
    eventDate: '2026-10-05',
    eventClock: null,
  },
  catalystChanged: true,
  generatedAt: WRITTEN,
  ...over,
});
const payload = (pm: PmCatalyst, over: Partial<{ morningAt: string | null; eveningAt: string | null }> = {}): MorningReadPayload => ({
  morningAt: MORNING,
  eveningAt: EVENING,
  morningTickers: ['ABC'],
  eveningTickers: ['ABC'],
  byTicker: { ABC: { confirmation, pmCatalyst: pm } },
  ...over,
});

describe('Catalyst in the morning research (row 21), Marketing 7109a3b1', () => {
  it('NEWER and changed: the cleaned summary, the grade and status in the board words, the date alone, the Written line', () => {
    const v = morningCatalystView(payload(newer()), 'ABC', NOW);
    expect(v).not.toBeNull();
    expect(v?.summary).toBe('The company announced a contract, its largest.');
    expect(v?.facts).toEqual([
      "Catalyst grade: no company event in the desk's evidence",
      'Catalyst status: fresh catalyst found',
    ]);
    expect(v?.eventDate).toBe('Oct 5, 2026');
    expect(v?.written).toBe('Research written Oct 6, 2026, 06:41 ET.');
    expect(v?.unchanged).toBeNull();
    expect(v?.labelHover).toBe(
      'The catalyst in the research the 07:00 ET checkpoint used, shown only when that research was written after the research the Oct 5, 22:00 ET recap used.',
    );
    expect(JSON.stringify(v)).not.toMatch(/cited|sourced|time not stated/i);
  });

  it('no event date prints "No event date", never a statement about a time', () => {
    const pm = newer();
    const v = morningCatalystView(payload({ ...pm, catalyst: { ...pm.catalyst!, eventDate: null } }), 'ABC', NOW);
    expect(v?.eventDate).toBe(MORNING_CATALYST_WORDS.noEventDate);
  });

  it('NEWER and unchanged: the summary is NOT printed; the line names the three compared parts', () => {
    const v = morningCatalystView(payload(newer({ catalystChanged: false })), 'ABC', NOW);
    expect(v?.summary).toBeNull();
    expect(v?.facts).toEqual([]);
    expect(v?.unchanged).toBe(
      'Catalyst grade, status and event date are the same as at the Oct 5, 22:00 ET recap. The research was written again after that recap.',
    );
    expect(v?.written).toBe('Research written Oct 6, 2026, 06:41 ET.');
  });

  it('every state other than NEWER hides the row', () => {
    const hidden: PmCatalyst['state'][] = ['SAME_VERSION', 'NO_MORNING_RESEARCH', 'UNKNOWN', 'NOT_YET', 'NO_EVENING_CALL'];
    for (const state of hidden) {
      const pm: PmCatalyst = { state, reason: null, catalyst: null, catalystChanged: null, generatedAt: null };
      expect(morningCatalystView(payload(pm), 'ABC', NOW)).toBeNull();
    }
  });

  it('the state decides, not the presence of a catalyst: a non-NEWER entry carrying one is still hidden', () => {
    expect(morningCatalystView(payload(newer({ state: 'SAME_VERSION' })), 'ABC', NOW)).toBeNull();
  });

  it('hidden without a frame to date it: not wired, unreadable, no morning, no recap, a name not in the map', () => {
    expect(morningCatalystView(undefined, 'ABC', NOW)).toBeNull();
    expect(morningCatalystView({ unreadable: true }, 'ABC', NOW)).toBeNull();
    expect(morningCatalystView(payload(newer(), { morningAt: null }), 'ABC', NOW)).toBeNull();
    expect(morningCatalystView(payload(newer(), { eveningAt: null }), 'ABC', NOW)).toBeNull();
    expect(morningCatalystView(payload(newer()), 'ZZZ', NOW)).toBeNull();
  });

  it('no em dash in anything it prints', () => {
    for (const changed of [true, false]) {
      expect(JSON.stringify(morningCatalystView(payload(newer({ catalystChanged: changed })), 'ABC', NOW))).not.toContain(EM_DASH);
    }
  });
});
