import { describe, expect, it } from 'vitest';

import { MORNING_CHECK_WORDS, morningCheckView, partValue } from '@/lib/dashboard/morningCheckView';
import type { Confirmation } from '@/lib/desk/morningRead';
import type { MorningReadPayload } from '@/lib/market/types';

const EM_DASH = String.fromCharCode(0x2014);
// 22:00 ET on Oct 5 and 07:00 ET on Oct 6 (EDT, UTC-4); "now" is Oct 6 07:30 ET.
const EVENING = '2026-10-06T02:00:00.000Z';
const MORNING = '2026-10-06T11:00:00.000Z';
const NOW = '2026-10-06T11:30:00.000Z';

const conf = (over: Partial<Confirmation> = {}): Confirmation => ({
  state: 'CONFIRMED',
  reason: null,
  changes: [],
  eveningAt: EVENING,
  morningAt: MORNING,
  ...over,
});
const pm = { state: 'SAME_VERSION', reason: null, catalyst: null, catalystChanged: null, generatedAt: null } as const;
const frame = (
  byTicker: Record<string, Confirmation>,
  over: Partial<{ morningAt: string | null; eveningAt: string | null; morningTickers: string[]; eveningTickers: string[] }> = {},
): MorningReadPayload => ({
  morningAt: MORNING,
  eveningAt: EVENING,
  morningTickers: ['ABC', 'NEW', ...Object.keys(byTicker)],
  eveningTickers: ['ABC', 'EVE', ...Object.keys(byTicker)],
  byTicker: Object.fromEntries(Object.entries(byTicker).map(([t, c]) => [t, { confirmation: c, pmCatalyst: { ...pm } }])),
  ...over,
});

describe('which absence is which: Integration 30th, six rows (Commercial 15)', () => {
  it('row 1: no morning checkpoint yet: "No morning check yet" with the no-checkpoint detail', () => {
    const v = morningCheckView(frame({}, { morningAt: null, morningTickers: [] }), 'ABC', NOW);
    expect(v.state).toBe('NOT_YET');
    expect(v.face).toBe('No morning check yet');
    expect(v.detail).toBe('No morning checkpoint has completed for this date.');
    expect(v.compared).toBeNull();
  });

  it('not wired (field absent): the face alone, no claim about checkpoints', () => {
    for (const payload of [undefined, null]) {
      const v = morningCheckView(payload, 'ABC', NOW);
      expect(v.state).toBe('NOT_YET');
      expect(v.detail).toBeNull();
    }
  });

  it('row 2: a morning checkpoint with NO evening recap reads Unknown for every morning name, with no detail and no reason', () => {
    const payload = frame({}, { eveningAt: null, morningTickers: ['ABC', 'NEW'], eveningTickers: [] });
    for (const ticker of ['ABC', 'NEW']) {
      const v = morningCheckView(payload, ticker, NOW);
      expect(v.state).toBe('UNKNOWN');
      expect(v.face).toBe('Unknown');
      expect(v.detail).toBeNull();
      expect(JSON.stringify(v)).not.toMatch(/recap did not|missing|not among|GRADE_NOT_STORED|NOT_GRADED|VERSION_UNREADABLE/);
    }
    // ...and a name on neither list is hidden (row 6), never told about the morning.
    expect(morningCheckView(payload, 'ZZZ', NOW).state).toBe('HIDDEN');
  });

  it('row 3: on the morning checkpoint and in byTicker: its own state', () => {
    expect(morningCheckView(frame({ ABC: conf() }), 'ABC', NOW).state).toBe('UNCHANGED');
  });

  it('row 4: on the morning checkpoint, not in byTicker (not on the evening recap): hidden', () => {
    expect(morningCheckView(frame({ ABC: conf() }), 'NEW', NOW).state).toBe('HIDDEN');
  });

  it('row 5: on the evening recap only: the face, the not-read detail, and the evening time alone; no Compared line', () => {
    const v = morningCheckView(frame({ ABC: conf() }), 'EVE', NOW);
    expect(v.state).toBe('NOT_YET');
    expect(v.face).toBe('No morning check yet');
    expect(v.detail).toBe('This name was not among the names the 07:00 ET checkpoint read.');
    expect(v.compared).toBe('Evening recap: Oct 5, 22:00 ET.');
    expect(JSON.stringify(v)).not.toContain('Compared:');
    expect(JSON.stringify(v)).not.toContain('No morning checkpoint has completed');
  });

  it('row 6: on neither list: hidden', () => {
    expect(morningCheckView(frame({ ABC: conf() }), 'ZZZ', NOW).state).toBe('HIDDEN');
  });

  it('an unreadable read is a fault and reads Unknown, never "No morning check yet"', () => {
    const v = morningCheckView({ unreadable: true }, 'ABC', NOW);
    expect(v.state).toBe('UNKNOWN');
    expect(v.face).toBe('Unknown');
  });
});

describe('the states, in Marketing v3 words', () => {
  it('CONFIRMED names what was compared and never says "confirmed"', () => {
    const v = morningCheckView(frame({ ABC: conf() }), 'ABC', NOW);
    expect(v.state).toBe('UNCHANGED');
    expect(v.face).toBe('Catalyst and setup grade unchanged since Oct 5, 22:00 ET');
    expect(v.detail).toBe(
      "The desk re-read this name's research after the evening checkpoint. Catalyst grade, catalyst status, event date and setup grade are the same as at Oct 5, 22:00 ET.",
    );
    expect(v.compared).toBe('Compared: Oct 5, 22:00 ET and 07:00 ET.');
    expect(JSON.stringify(v)).not.toMatch(/confirm|still stands/i);
  });

  it('NOT_RECHECKED', () => {
    const v = morningCheckView(frame({ ABC: conf({ state: 'NOT_RECHECKED' }) }), 'ABC', NOW);
    expect(v.face).toBe('Not re-read since Oct 5, 22:00 ET');
    expect(v.detail).toBe(MORNING_CHECK_WORDS.notRereadDetail);
  });

  it('UNKNOWN prints the one word and never its reason', () => {
    for (const reason of ['GRADE_NOT_STORED', 'NOT_GRADED', 'VERSION_UNREADABLE'] as const) {
      const v = morningCheckView(frame({ ABC: conf({ state: 'UNKNOWN', reason }) }), 'ABC', NOW);
      expect(v.face).toBe('Unknown');
      expect(v.detail).toBeNull();
      expect(JSON.stringify(v)).not.toContain(reason);
    }
  });

  it('REVISED lists each changed part from and to, in display words, the grade through the one mapping', () => {
    const v = morningCheckView(
      frame({
        ABC: conf({
          state: 'REVISED',
          changes: [
            { part: 'CATALYST_GRADE', from: 'LEGITIMATE_POSITIVE', to: 'NONE' },
            { part: 'CATALYST_STATUS', from: 'FRESH_FOUND', to: 'CONFLICTING' },
            { part: 'EVENT_DATE', from: '2026-10-02', to: null },
            { part: 'PRIORITY_GRADE', from: 'B', to: 'AVOID' },
          ],
        }),
      }),
      'ABC',
      NOW,
    );
    expect(v.face).toBe('Revised since Oct 5, 22:00 ET');
    expect(v.changes).toEqual([
      "Catalyst grade: legitimate positive to no company event in the desk's evidence",
      'Catalyst status: fresh catalyst found to conflicting evidence',
      'Catalyst event date: Oct 2, 2026 to not stated',
      'Setup grade: B to D',
    ]);
    expect(JSON.stringify(v)).not.toMatch(/AVOID|_/);
  });

  it('NO_EVENING_CALL inside the map is hidden too', () => {
    expect(morningCheckView(frame({ ABC: conf({ state: 'NO_EVENING_CALL' }) }), 'ABC', NOW).state).toBe('HIDDEN');
  });

  it('values: NONE_FOUND has its passed words; an unworded value is the board phrase, never SCREAMING_SNAKE', () => {
    expect(partValue('CATALYST_STATUS', 'NONE_FOUND')).toBe('no catalyst found in our sources');
    expect(partValue('CATALYST_GRADE', 'STRONG')).toBe('strong');
    expect(partValue('CATALYST_GRADE', 'UNKNOWN')).toBe('unknown');
    expect(partValue('PRIORITY_GRADE', null)).toBe('not stated');
  });

  it('no em dash in any string this module can print', () => {
    const states: Confirmation['state'][] = ['CONFIRMED', 'NOT_RECHECKED', 'REVISED', 'UNKNOWN', 'NOT_YET'];
    for (const state of states) {
      expect(JSON.stringify(morningCheckView(frame({ ABC: conf({ state }) }), 'ABC', NOW))).not.toContain(EM_DASH);
    }
    expect(JSON.stringify(MORNING_CHECK_WORDS)).not.toContain(EM_DASH);
  });
});
