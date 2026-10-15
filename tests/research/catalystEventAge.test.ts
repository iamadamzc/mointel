import { describe, expect, it } from 'vitest';

import { buildDeskRow } from '@/lib/dashboard/merge';
import { relativeAge, resolveWhy } from '@/lib/dashboard/why';
import { catalystAgeOf, catalystFreshnessOf, citedWhenSources } from '@/lib/research/eventWhen';
import { catalystAge, resolveCatalystFreshness } from '@/lib/research/time';
import type { AutoIntelligence, EvidenceLink } from '@/lib/research/view';

/*
 * A catalyst's AGE and FRESHNESS BAND (Integration 41st's ruling (b), 2026-10-15): a MIDNIGHT-UTC stamp that no cited
 * EXACT or INFERRED source carries is a date only, its stored date with no hours; every other stamp reads as before.
 * Read raw, the placeholder (WETO's "2026-09-17T00:00:00Z", a Sept. 17 release) is 20:00 ET the day before: a day
 * staler, in hours. The stricter eventWhen clock rule was refused by the replay: it demoted real after-close news
 * whose model-written stamp is off from its source (AIXI, WFCF; docs/research/freshness/replay.txt).
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

  it('every other stamp reads as before, noon UTC included (ruling (b): only the midnight placeholder changes)', () => {
    const noon = '2026-09-17T12:00:00Z';
    const now = new Date('2026-09-17T15:00:00Z');
    expect(catalystAgeOf({ eventTimestamp: noon, sources: NONE }, now)).toEqual(catalystAge(noon, now));
    expect(catalystAgeOf({ eventTimestamp: noon, sources: NONE }, now)).toMatchObject({ precision: 'CLOCK' });
  });

  it("AIXI's shape (report 9, 10-02) is not demoted: an evening stamp off from its source stays FRESH after the prior close", () => {
    // The model wrote 20:31 ET with a Z; its 6-K exhibits are INFERRED at 00:31:13Z. The strict rule made this RECENT.
    const aixi = { eventTimestamp: '2026-10-01T20:31:13.000Z', sources: [{ publishedAt: '2026-10-02T00:31:13.000Z', precision: 'INFERRED' }] };
    const now = new Date('2026-10-02T18:31:16Z');
    expect(catalystFreshnessOf(aixi, now, new Date('2026-10-01T20:00:00Z'))).toBe('FRESH');
    expect(catalystFreshnessOf(aixi, now, new Date('2026-10-01T20:00:00Z'))).toBe(resolveCatalystFreshness(aixi.eventTimestamp, now, new Date('2026-10-01T20:00:00Z')));
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

  it('a midnight placeholder is today on the row; with a cited EXACT source at the instant it keeps its hours', () => {
    const midnight = '2026-09-18T00:00:00Z'; // 20:00 ET Sep 17 if the clock is real
    expect(resolveWhy(buildDeskRow('WETO', null, intel(midnight, [link(1, '2026-09-16T21:05:00.000Z', 'UNKNOWN')])), NOW).age).toBe('today');
    expect(resolveWhy(buildDeskRow('WETO', null, intel(midnight, [link(1, midnight, 'EXACT')])), NOW).age).toBe('14h');
  });

  it('relativeAge: the placeholder rule applies only with sources given; an ordinary instant reads the same either way', () => {
    expect(relativeAge('2026-09-18T00:00:00Z', NOW)).toBe('14h');
    expect(relativeAge('2026-09-18T00:00:00Z', NOW, [])).toBe('today');
    expect(relativeAge('2026-09-18T11:00:00Z', NOW, [])).toBe('3h');
  });
});
