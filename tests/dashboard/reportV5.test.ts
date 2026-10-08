import { describe, expect, it } from 'vitest';

import type { ReportCheckpointRef, ReportPath } from '@/lib/desk/reports/contract';
import { companyText, pathText, reportLead } from '@/lib/dashboard/sessionReports';

/*
 * The v5 report surface, written from Design's answers to research
 * design.md §8 (design.md row 3a), not from the implementation:
 *
 * (2) a v5 report is marked by `watchCount` being a number; it then leads with
 *     the watch sentence and never reads `headline`. v4 keeps its headline,
 *     null when struck.
 * (3) every path point carries a label, and no label is relative to the moment
 *     of reading ("today", "now").
 * The company line is Marketing's "{name}. {country}. {business}." with an
 * absent part dropped with its stop.
 */

const checkpoint = (completedAt: string, id = 1): ReportCheckpointRef => ({
  id,
  type: 'OPEN_SPIKE' as ReportCheckpointRef['type'],
  completedAt,
});

describe('what leads a report', () => {
  it('a v5 report leads with the watch sentence, whatever its headline field holds', () => {
    const expected = "We're watching 7 names into the premarket.";
    expect(reportLead({ kind: 'PREMARKET', watchCount: 7, headline: null })).toBe(expected);
    expect(reportLead({ kind: 'PREMARKET', watchCount: 7, headline: 'A stored headline.' })).toBe(expected);
  });

  it('a quiet v5 session leads with the zero line, never "watching 0 names"', () => {
    expect(reportLead({ kind: 'INTO_RTH', watchCount: 0, headline: null })).toBe('Nothing on watch into the open.');
  });

  it('a v4 report leads with its headline, and a struck one leads with nothing', () => {
    expect(reportLead({ kind: 'PREMARKET', headline: 'Two names led after hours.' })).toBe(
      'Two names led after hours.',
    );
    expect(reportLead({ kind: 'PREMARKET', headline: null })).toBeNull();
  });
});

describe('the company line', () => {
  it('prints name, country and business, each a sentence', () => {
    expect(companyText({ name: 'Sangoma Technologies', country: 'Canada', business: 'Cloud communications software' })).toBe(
      'Sangoma Technologies. Canada. Cloud communications software.',
    );
  });

  it('does not double a stop a part already has', () => {
    expect(companyText({ name: 'Sangoma Technologies Corp.', country: 'Canada', business: null })).toBe(
      'Sangoma Technologies Corp. Canada.',
    );
  });

  it('drops an absent or blank part with its stop, and says nothing when nothing is known', () => {
    expect(companyText({ name: 'Acme Inc', country: null, business: 'Makes widgets' })).toBe('Acme Inc. Makes widgets.');
    expect(companyText({ name: '  ', country: 'Canada', business: null })).toBe('Canada.');
    expect(companyText({ name: null, country: null, business: null })).toBeNull();
    expect(companyText(null)).toBeNull();
    expect(companyText(undefined)).toBeNull();
  });
});

describe('the price path', () => {
  const intraday: ReportPath = { from: 3.59, high: 6.01, now: 5.1, fromBasis: 'PRIOR_CLOSE' };
  const premarket: ReportPath = { from: 3.59, high: 6.01, now: 5.1, fromBasis: 'TODAY_CLOSE' };

  it('labels an intraday path prior close, high, and the checkpoint clock', () => {
    // 13:27Z is 09:27 EDT.
    expect(pathText(intraday, { checkpoints: [checkpoint('2026-09-28T13:27:10Z')] })).toBe(
      '$3.59 prior close → $6.01 high → $5.10 at 9:27 am ET',
    );
  });

  it('takes the NEWEST checkpoint when a report read more than one, in any order', () => {
    const checkpoints = [checkpoint('2026-09-28T18:32:00Z', 2), checkpoint('2026-09-28T13:27:00Z', 1)];
    expect(pathText(intraday, { checkpoints })).toBe('$3.59 prior close → $6.01 high → $5.10 at 2:32 pm ET');
  });

  it('never prints a bare last point, even with no readable checkpoint time', () => {
    expect(pathText(intraday, { checkpoints: [] })).toBe('$3.59 prior close → $6.01 high → $5.10 at the checkpoint');
    expect(pathText(intraday, { checkpoints: [checkpoint('not a time')] })).toBe(
      '$3.59 prior close → $6.01 high → $5.10 at the checkpoint',
    );
  });

  it('labels the premarket arc as after-hours, from the prior close', () => {
    expect(pathText(premarket, { checkpoints: [checkpoint('2026-09-29T02:00:00Z')] })).toBe(
      '$3.59 prior close → $6.01 AH high → $5.10 AH close',
    );
  });

  it('no label is relative to when it is read', () => {
    for (const path of [intraday, premarket]) {
      const text = pathText(path, { checkpoints: [checkpoint('2026-09-28T13:27:00Z')] }) ?? '';
      expect(text).not.toMatch(/\b(now|today|today's|tonight|this morning)\b/i);
    }
  });

  it('prints sub-dollar prices at the board precision', () => {
    expect(pathText({ from: 0.3125, high: 0.4, now: 0.35, fromBasis: 'TODAY_CLOSE' }, { checkpoints: [] })).toBe(
      '$0.3125 prior close → $0.4000 AH high → $0.3500 AH close',
    );
  });

  it('draws no line at all when there is no path, a point is not a price, or the basis is unknown', () => {
    expect(pathText(null, { checkpoints: [] })).toBeNull();
    expect(pathText(undefined, { checkpoints: [] })).toBeNull();
    expect(pathText({ ...intraday, high: 0 }, { checkpoints: [] })).toBeNull();
    expect(pathText({ ...intraday, now: Number.NaN }, { checkpoints: [] })).toBeNull();
    expect(pathText({ ...intraday, fromBasis: 'SOMETHING_NEW' as ReportPath['fromBasis'] }, { checkpoints: [] })).toBeNull();
  });
});
