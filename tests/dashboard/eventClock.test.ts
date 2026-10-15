import { describe, expect, it } from 'vitest';

import { buildDeskRow } from '@/lib/dashboard/merge';
import { calendarDay, catalystEventTime, eventTimeView } from '@/lib/dashboard/catalystView';
import { resolveWhy } from '@/lib/dashboard/why';
import { eventWhen } from '@/lib/desk/reports/traced';
import type { AutoIntelligence, EvidenceLink } from '@/lib/research/view';

/*
 * The catalyst's event time on the board (Integration 41st, 2026-10-15): the Why hover, the OLD headline day and the
 * dossier row all read Research's eventWhen, the rule the report writer and checker use. A date-only event is its date
 * as written: WETO's September 17 event read "Sep 16, 8:00 PM ET" on the card.
 */

const link = (id: number, publishedAt: string, publishedPrecision: string): EvidenceLink =>
  ({ id, publishedAt, publishedPrecision, title: 't', url: 'https://example.com', sourceKind: 'news' }) as unknown as EvidenceLink;

const SHAPES = {
  bareDate: { ts: '2026-09-17', evidence: [] as EvidenceLink[] },
  midnightUtc: { ts: '2026-09-17T00:00:00.000Z', evidence: [link(1, '2026-09-17T00:00:00.000Z', 'DATE_ONLY')] },
  // WETO exactly (Research, from Ops's read): 2026-09-17T00:00:00Z with no cited source at that instant.
  wetoNoSource: { ts: '2026-09-17T00:00:00Z', evidence: [link(1, '2026-09-16T21:05:00.000Z', 'UNKNOWN')] },
  noonUtc: { ts: '2026-09-17T12:00:00.000Z', evidence: [link(1, '2026-09-17T12:00:00.000Z', 'DATE_ONLY')] },
  exact: { ts: '2026-09-17T13:30:00.000Z', evidence: [link(1, '2026-09-17T13:30:00.000Z', 'EXACT')] },
  inferred: { ts: '2026-09-17T13:30:00.000Z', evidence: [link(1, '2026-09-17T13:30:00.000Z', 'INFERRED')] },
};

describe('the board reads the shared rule', () => {
  it('a date-only event in each stored shape is its date as written, with no clock (passed words)', () => {
    for (const name of ['bareDate', 'midnightUtc', 'wetoNoSource', 'noonUtc'] as const) {
      const s = SHAPES[name];
      const t = catalystEventTime(s.ts, [1], s.evidence);
      expect(t, name).toEqual({ kind: 'DATE_ONLY', date: '2026-09-17', text: 'Sep 17, time not stated' });
    }
  });

  it('control: an EXACT source carrying the instant keeps the ET clock; INFERRED says so', () => {
    expect(catalystEventTime(SHAPES.exact.ts, [1], SHAPES.exact.evidence)).toEqual({ kind: 'EXACT', date: '2026-09-17', text: 'Sep 17, 9:30 AM ET' });
    expect(catalystEventTime(SHAPES.inferred.ts, [1], SHAPES.inferred.evidence).text).toBe('Sep 17, 9:30 AM ET, time inferred');
    // A source that is not cited does not vouch for the clock.
    expect(catalystEventTime(SHAPES.exact.ts, [2], SHAPES.exact.evidence).kind).toBe('DATE_ONLY');
  });

  it('agrees with the report writer and checker on every shape (one rule, not a copy)', () => {
    for (const [name, s] of Object.entries(SHAPES)) {
      const sources = s.evidence.map((l) => ({ publishedAt: l.publishedAt, precision: l.publishedPrecision }));
      expect(catalystEventTime(s.ts, [1], s.evidence).date, name).toBe(eventWhen({ eventTimestamp: s.ts, sources }).date);
    }
  });

  it('the dossier row: date-only words for a midnight-UTC event, never the day before', () => {
    expect(eventTimeView(SHAPES.midnightUtc.ts, [1], SHAPES.midnightUtc.evidence, Date.parse('2026-10-15T14:00:00Z')).text).toBe('Sep 17, time not stated');
  });

  it('calendarDay reads a date as written', () => {
    expect(calendarDay('2026-09-17')).toBe('Sep 17');
    expect(calendarDay('2026-01-01')).toBe('Jan 1');
    expect(calendarDay(null)).toBeNull();
    expect(calendarDay('Sep 17')).toBeNull();
  });
});

function intel(eventTimestamp: string, evidence: EvidenceLink[]): AutoIntelligence {
  return {
    ticker: 'WETO',
    state: 'ACCEPTED',
    generatedAt: '2026-10-15T12:00:00.000Z',
    coverageIncomplete: false,
    evidence,
    analysis: {
      dossier: {
        ticker: 'WETO',
        catalyst: {
          catalystGrade: 'WEAK_NEGATIVE_DILUTIVE',
          catalystStatus: 'SECONDARY_STALE',
          freshness: 'STALE',
          confidence: 'HIGH',
          summary: 'An older notice.',
          whyTradersMayCare: null,
          eventTimestamp,
          evidenceSourceIds: evidence.map((l) => l.id),
          plausiblyExplainsMove: false,
          unknowns: [],
          citations: [],
        },
        structure: { structureClassification: 'CLEAN', supplyLedger: [], structuralWarnings: [] },
        cycle: { cycleClassification: 'UNKNOWN' },
      },
    },
  } as unknown as AutoIntelligence;
}

describe('the Why cell', () => {
  const NOW = Date.parse('2026-10-15T14:00:00Z');
  it('WETO shape: the hover and the OLD headline say Sep 17, not "Sep 16, 8:00 PM ET"', () => {
    const why = resolveWhy(buildDeskRow('WETO', null, intel(SHAPES.midnightUtc.ts, SHAPES.midnightUtc.evidence)), NOW);
    expect(why.eventAt).toBe('Sep 17, time not stated');
    expect(why.headline).toContain('latest: Sep 17');
    expect(why.headline).not.toContain('Sep 16');
  });

  it('control: an EXACT event keeps its clock in the hover', () => {
    const why = resolveWhy(buildDeskRow('WETO', null, intel(SHAPES.exact.ts, SHAPES.exact.evidence)), NOW);
    expect(why.eventAt).toBe('Sep 17, 9:30 AM ET');
  });
});
