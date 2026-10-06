import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { CATALYST_SOURCES_LABEL, catalystSources, eventTimeView } from '@/lib/dashboard/catalystView';
import type { EvidenceLink } from '@/lib/research/view';

const NOW = Date.parse('2026-08-17T16:00:00.000Z');
const link = (id: number, publishedAt: string | null, publishedPrecision: string): EvidenceLink => ({
  id,
  title: `T${id}`,
  url: `https://example.test/${id}`,
  authority: 'PRIMARY',
  sourceType: 'PRESS_RELEASE',
  secForm: null,
  accession: null,
  publishedAt,
  publishedPrecision,
});

// 08:15 ET on 2026-08-17 (EDT).
const EVENT = '2026-08-17T12:15:00.000Z';

describe('the event time never prints a clock the evidence does not support', () => {
  it('prints the clock and the age when a cited source with that exact instant is EXACT', () => {
    const v = eventTimeView(EVENT, [1], [link(1, EVENT, 'EXACT')], NOW);
    expect(v.kind).toBe('EXACT');
    expect(v.text).toContain('8:15 AM ET');
    expect(v.text).toContain(' ago');
  });

  it('prints the date only for a DATE_ONLY source, even though the stored value carries a clock', () => {
    // A date-only page is stored at noon UTC: 12:00Z would read as "08:00 ET", a false clock.
    const noon = '2026-08-17T12:00:00.000Z';
    const v = eventTimeView(noon, [1], [link(1, noon, 'DATE_ONLY')], NOW);
    expect(v.kind).toBe('DATE_ONLY');
    expect(v.text).toBe('Aug 17, time not stated');
    expect(v.text).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('prints an inferred clock marked as inferred', () => {
    const v = eventTimeView(EVENT, [1], [link(1, EVENT, 'INFERRED')], NOW);
    expect(v.kind).toBe('INFERRED');
    expect(v.text).toBe('Aug 17, 8:15 AM ET, time inferred');
    expect(v.hover).toBe(
      'The source does not state a time. This time was taken from something next to the event, such as the time the filing was accepted.',
    );
  });

  it('prints the date only when no cited source carries that instant, or its precision is unknown', () => {
    const none = eventTimeView(EVENT, [1], [link(1, '2026-08-16T20:00:00.000Z', 'EXACT')], NOW);
    expect(none.kind).toBe('DATE_ONLY');
    expect(eventTimeView(EVENT, [1], [link(1, EVENT, 'UNKNOWN')], NOW).kind).toBe('DATE_ONLY');
    // A source that is not CITED does not vouch for the clock.
    expect(eventTimeView(EVENT, [2], [link(1, EVENT, 'EXACT')], NOW).kind).toBe('DATE_ONLY');
  });

  it('says unknown when there is no event time, or it cannot be read', () => {
    expect(eventTimeView(null, [1], [], NOW)).toEqual({ kind: 'NONE', text: 'No event time', hover: null });
    expect(eventTimeView('not a time', [1], [], NOW).kind).toBe('NONE');
  });
});

describe('the catalyst sources', () => {
  const evidence = [link(1, EVENT, 'EXACT'), link(2, '2026-08-16T12:00:00.000Z', 'DATE_ONLY'), link(3, null, 'UNKNOWN')];

  it('lists only the cited sources, in the order cited, once each', () => {
    const out = catalystSources([2, 1, 2, 99], evidence);
    expect(out.map((s) => s.link.id)).toEqual([2, 1]);
  });

  it('carries the ET day and whether it is date only, and survives a missing date', () => {
    const [a, b] = catalystSources([2, 3], evidence);
    expect(a.day).toBe('Aug 16');
    expect(a.dateOnly).toBe(true);
    expect(b.day).toBeNull();
  });

  it('is empty when nothing is cited', () => {
    expect(catalystSources([], evidence)).toEqual([]);
    expect(catalystSources(null, evidence)).toEqual([]);
  });
});

describe('the drawer uses it', () => {
  const source = readFileSync('components/AutomaticIntelligence.tsx', 'utf8');

  it('prints the event time through eventTimeView, never straight from the timestamp', () => {
    expect(source).toContain('eventTimeView(at, citedIds, evidence, Date.now())');
    expect(source).not.toMatch(/timeWithAge\(catalyst\.eventTimestamp\)/);
  });

  it('lists the catalyst own sources under the event time', () => {
    expect(source).toContain('catalystSources(catalyst.evidenceSourceIds, intel.evidence)');
    expect(source).toContain('rel="noopener noreferrer"');
  });
});

describe('the words', () => {
  it('labels the list "Sources the desk read" and prints each line as the date, then the title', () => {
    expect(CATALYST_SOURCES_LABEL).toBe('Sources the desk read');
    const source = readFileSync('components/AutomaticIntelligence.tsx', 'utf8');
    expect(source).toContain("{day ? `${day}, ` : ''}");
    expect(source).toContain('{link.title ?? link.secForm ?? humanise(link.sourceType)}');
  });
});
