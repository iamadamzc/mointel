import { describe, expect, it } from 'vitest';

import { buildDeskRow } from '@/lib/dashboard/merge';
import { relativeAge, resolveWhy } from '@/lib/dashboard/why';
import { catalystAgeOf, catalystFreshnessOf, citedWhenSources } from '@/lib/research/eventWhen';
import { catalystAge, resolveCatalystFreshness } from '@/lib/research/time';
import type { AutoIntelligence, EvidenceLink } from '@/lib/research/view';

/*
 * A catalyst's AGE and FRESHNESS BAND by the shared event rule (Integration 41st, 2026-10-15): the day from eventWhen,
 * and an elapsed span only when a cited EXACT or INFERRED source carries the instant. Read from the raw stamp alone, a
 * date-only midnight-UTC placeholder (WETO's "2026-09-17T00:00:00Z", a Sept. 17 release) is 20:00 ET the day before:
 * a day staler, in hours. The raw readers stay for instants that are their own evidence.
 */

const WETO = '2026-09-17T00:00:00Z';
const NONE = [] as const;
const exactAt = (at: string) => [{ publishedAt: at, precision: 'EXACT' }];

describe('catalystAgeOf / catalystFreshnessOf', () => {
  it("WETO's shape, read the next morning: RECENT and one day, not the raw reading's STALE and two", () => {
    const now = new Date('2026-09-18T14:00:00Z'); // 10:00 ET Sep 18
    const priorClose = new Date('2026-09-17T20:00:00Z'); // 16:00 ET Sep 17
    expect(catalystAgeOf({ eventTimestamp: WETO, sources: NONE }, now)).toEqual({ precision: 'DATE', days: 1 });
    expect(catalystFreshnessOf({ eventTimestamp: WETO, sources: NONE }, now, priorClose)).toBe('RECENT');
    // The instrument: the raw reading is the slip this fixes.
    expect(catalystAge(WETO, now)).toMatchObject({ precision: 'CLOCK', days: 2 });
    expect(resolveCatalystFreshness(WETO, now, priorClose)).toBe('STALE');
  });

  it('the same day: FRESH by its own date, where the raw reading made it yesterday', () => {
    const now = new Date('2026-09-17T15:00:00Z'); // 11:00 ET Sep 17
    expect(catalystFreshnessOf({ eventTimestamp: WETO, sources: NONE }, now)).toBe('FRESH');
    expect(resolveCatalystFreshness(WETO, now)).toBe('RECENT');
  });

  it('control: a cited EXACT source at the instant keeps the clock, the ET day and the prior-close window', () => {
    const now = new Date('2026-09-17T15:00:00Z');
    const priorClose = new Date('2026-09-16T20:00:00Z'); // 16:00 ET Sep 16
    const catalyst = { eventTimestamp: WETO, sources: exactAt(WETO) };
    expect(catalystAgeOf(catalyst, now)).toEqual(catalystAge(WETO, now));
    expect(catalystAgeOf(catalyst, now)).toMatchObject({ precision: 'CLOCK', days: 1, elapsedMs: 15 * 3_600_000 });
    expect(catalystFreshnessOf(catalyst, now)).toBe('RECENT');
    // 20:00 ET Sep 16 is after the prior close: promoted, exactly as the raw reader does for a real clock.
    expect(catalystFreshnessOf(catalyst, now, priorClose)).toBe('FRESH');
  });

  it('noon UTC with no source at the instant: its date, no hours offered', () => {
    const noon = '2026-09-17T12:00:00Z';
    const now = new Date('2026-09-17T15:00:00Z');
    expect(catalystAgeOf({ eventTimestamp: noon, sources: NONE }, now)).toEqual({ precision: 'DATE', days: 0 });
    expect(catalystAge(noon, now)).toMatchObject({ precision: 'CLOCK' });
  });

  it('no stamp is no age and UNKNOWN, never STALE', () => {
    expect(catalystAgeOf({ eventTimestamp: null, sources: NONE }, new Date())).toBeNull();
    expect(catalystFreshnessOf({ eventTimestamp: null, sources: NONE }, new Date())).toBe('UNKNOWN');
  });

  it('citedWhenSources keeps only the cited ids and carries their precision', () => {
    const rows = [
      { id: 1, publishedAt: WETO, publishedPrecision: 'EXACT' },
      { id: 2, publishedAt: '2026-09-18', publishedPrecision: 'DATE_ONLY' },
    ];
    expect(citedWhenSources([2], rows)).toEqual([{ publishedAt: '2026-09-18', precision: 'DATE_ONLY' }]);
    expect(citedWhenSources(null, rows)).toEqual([]);
    // An uncited EXACT source does not vouch for the clock.
    expect(catalystAgeOf({ eventTimestamp: WETO, sources: citedWhenSources([2], rows) }, new Date('2026-09-18T14:00:00Z'))).toEqual({ precision: 'DATE', days: 1 });
  });
});

const link = (id: number, publishedAt: string, publishedPrecision: string): EvidenceLink =>
  ({ id, publishedAt, publishedPrecision, title: 't', url: 'https://example.com', sourceKind: 'news' }) as unknown as EvidenceLink;

function intel(eventTimestamp: string, evidence: EvidenceLink[]): AutoIntelligence {
  return {
    ticker: 'WETO',
    state: 'ACCEPTED',
    generatedAt: '2026-09-18T12:00:00.000Z',
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
          summary: 'Wetour launched Vantrapower.',
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

describe('the board (why.ts) reads the same age and band', () => {
  const NOW = Date.parse('2026-09-18T14:00:00Z');

  it("WETO's shape: 1d and RECENT on the row, not 2d and STALE", () => {
    const why = resolveWhy(buildDeskRow('WETO', null, intel(WETO, [link(1, '2026-09-16T21:05:00.000Z', 'UNKNOWN')])), NOW);
    expect(why.age).toBe('1d');
    expect(why.freshness).toBe('RECENT');
  });

  it('control: a cited EXACT source at the instant keeps hours on the row', () => {
    const at = '2026-09-18T11:00:00Z';
    const why = resolveWhy(buildDeskRow('WETO', null, intel(at, [link(1, at, 'EXACT')])), NOW);
    expect(why.age).toBe('3h');
    expect(why.freshness).toBe('FRESH');
  });

  it('relativeAge with no sources reads the raw instant, for times that are their own evidence', () => {
    expect(relativeAge('2026-09-18T11:00:00Z', NOW)).toBe('3h');
    expect(relativeAge('2026-09-18T11:00:00Z', NOW, [])).toBe('today');
  });
});
