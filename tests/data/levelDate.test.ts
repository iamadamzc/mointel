/**
 * A Sheet level carries its source's own date (Integration 36th (a), Research's OFAL finding 2026-10-09):
 * OFAL's ladder showed 1.23 / 1.34 daily support and 1.44 from a RESEARCH row dated 2026-08-13, eight weeks
 * old, at 2.3x to 7x the 0.529 price, with no date on the level.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  LEVEL_DATE_SEPARATOR,
  levelDateHoverSuffix,
  levelDateSuffix,
  levelDateText,
  levelTagLead,
  sheetCalendarDate,
} from '@/lib/data/levelDate';
import { buildLevelMap, clusterLevels, toCompactRow, type PriceLevel } from '@/lib/data/priceLevels';

const NOW = Date.parse('2026-10-09T12:00:00Z');

describe("the Sheet's report date", () => {
  it('reads yyyy-mm-dd only (Commercial read 55 (2)), nothing else', () => {
    expect(sheetCalendarDate('2026-08-13')).toBe('2026-08-13');
    expect(sheetCalendarDate(' 2026-08-13 ')).toBe('2026-08-13');
    for (const raw of ['', null, undefined, 'Aug 13', '8/13/2026', '13/8/2026', '2026-08-13T00:00:00.000Z', '2026-8-13', '2026-02-30', '2026-13-01', 'yesterday']) {
      expect(sheetCalendarDate(raw)).toBeNull();
    }
  });
});

describe('the printed date', () => {
  it('is the calendar date, never moved by a time zone', () => {
    // 2026-08-13 read as UTC midnight and printed in ET would be Aug 12.
    expect(levelDateText('2026-08-13', NOW)).toBe('Aug 13');
    expect(levelDateText('2026-01-01', NOW)).toBe('Jan 1');
  });

  it("shows the year only when it is not the reader's ET year", () => {
    expect(levelDateText('2025-12-31', NOW)).toBe('Dec 31, 2025');
    // At 2027-01-01T03:00Z it is still Dec 31, 2026 in New York.
    expect(levelDateText('2026-08-13', Date.parse('2027-01-01T03:00:00Z'))).toBe('Aug 13');
    expect(levelDateText('2026-08-13', Date.parse('2027-01-01T06:00:00Z'))).toBe('Aug 13, 2026');
  });

  it('inline, hover and the tag after it (Marketing 15a8c9f3, Commercial read 55)', () => {
    // A date in the reader's own year, whenever the test runs.
    const year = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric' }).format(new Date());
    const ymd = `${year}-08-13`;
    expect(`1.23 support${levelDateSuffix(ymd)}${levelTagLead(ymd)}LOST SUPPORT`).toBe('1.23 support dated Aug 13 · LOST SUPPORT');
    expect(`1.23 support${levelDateHoverSuffix(ymd)}`).toBe('1.23 support, report date Aug 13');
    // Undated: no date part, and the tag keeps its plain space.
    expect(`1.23 support${levelDateSuffix(null)}${levelTagLead(null)}LOST SUPPORT`).toBe('1.23 support LOST SUPPORT');
    expect(levelDateHoverSuffix('8/13/2026')).toBe('');
  });

  it('no date: nothing', () => {
    expect(levelDateText(null, NOW)).toBeNull();
    expect(levelDateText('2026-8-13', NOW)).toBeNull();
    expect(LEVEL_DATE_SEPARATOR).toBe(' dated ');
  });

  it('reads as Marketing 1487cd93: "{price} {type} dated {Mon d}"', () => {
    expect(`1.23 support${LEVEL_DATE_SEPARATOR}${levelDateText('2026-08-13', NOW)}`).toBe('1.23 support dated Aug 13');
    expect(`1.44 resistance${LEVEL_DATE_SEPARATOR}${levelDateText('2025-08-13', NOW)}`).toBe('1.44 resistance dated Aug 13, 2025');
  });
});

describe('OFAL: the levels carry the RESEARCH row date', () => {
  const map = buildLevelMap({
    currentPrice: 0.529,
    sessionHigh: 0.61,
    dailySupport: '1.23, 1.34',
    dailyResistance: '1.44',
    keyLevels: 'support 0.50',
    sheetResearchDate: '2026-08-13',
    includeRoundLevels: false,
  });
  const levels = [...map.above, ...map.below].flatMap((zone) => zone.members);
  const at = (price: number) => levels.find((level) => level.price === price);

  it('daily support and resistance carry it', () => {
    expect(at(1.23)?.sourceDate).toBe('2026-08-13');
    expect(at(1.34)?.sourceDate).toBe('2026-08-13');
    expect(at(1.44)?.sourceDate).toBe('2026-08-13');
  });

  it('the TODAY key levels and session levels carry none (no date is invented)', () => {
    expect(at(0.5)?.source).toBe('SHEET_KEY_LEVELS');
    expect(at(0.5)?.sourceDate).toBeNull();
    expect(at(0.61)?.sourceDate).toBeNull();
  });

  it('the zone and the compact board cell carry the dominant level date', () => {
    const zone = map.above.find((z) => z.members.some((m) => m.price === 1.23));
    expect(zone?.sourceDate).toBe('2026-08-13');
    const compact = toCompactRow(map, 5);
    expect(compact.nextUp.some((level) => level.sourceDate === '2026-08-13')).toBe(true);
    expect(compact.nextUp.find((level) => level.price === '0.610')?.sourceDate ?? null).toBeNull();
  });

  it('a mixed zone is not dated; its members carry their own (Commercial read 57)', () => {
    const member = (price: number, type: PriceLevel['type'], sourceDate: string | null, priority: number): PriceLevel => ({
      price,
      label: type,
      type,
      direction: 'BELOW',
      source: sourceDate ? 'SHEET_DAILY_SUPPORT' : 'SESSION',
      priority,
      note: null,
      distanceAbs: 0.1,
      distancePct: 5,
      clustered: false,
      clusterId: null,
      relationshipToPrice: 'SUPPORT_BELOW',
      stateLabel: null,
      sourceDate,
    });
    const [mixed] = clusterLevels([member(1.23, 'SUPPORT', '2026-08-13', 1), member(1.235, 'LOD', null, 2)], 'BELOW');
    expect(mixed.members).toHaveLength(2);
    expect(mixed.sourceDate).toBeNull();
    expect(mixed.members.map((m) => m.sourceDate)).toEqual(['2026-08-13', null]);
    const [same] = clusterLevels([member(1.23, 'SUPPORT', '2026-08-13', 1), member(1.235, 'SUPPORT', '2026-08-13', 2)], 'BELOW');
    expect(same.sourceDate).toBe('2026-08-13');
    const [differ] = clusterLevels([member(1.23, 'SUPPORT', '2026-08-13', 1), member(1.235, 'SUPPORT', '2026-09-01', 2)], 'BELOW');
    expect(differ.sourceDate).toBeNull();
  });

  it('control: with no research date, no level carries one', () => {
    const bare = buildLevelMap({ currentPrice: 0.529, dailySupport: '1.23', includeRoundLevels: false });
    expect([...bare.above, ...bare.below].flatMap((z) => z.members).every((level) => level.sourceDate === null)).toBe(true);
  });
});

describe('wired', () => {
  const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

  it('merge passes the RESEARCH row date', () => {
    expect(read('lib/dashboard/merge.ts')).toContain('sheetResearchDate: sheetCalendarDate(researchRecord?.reportDate)');
  });

  it('every level renderer prints it after the type', () => {
    const ladder = read('components/LevelLadder.tsx');
    expect(ladder.match(/levelDateSuffix\(/g)?.length).toBe(3); // compact, zone row, zone members
    expect(ladder).toContain('levelDateHoverSuffix(level.sourceDate)'); // the compact hover title
    expect(ladder.match(/levelTagLead\(/g)?.length).toBe(2); // compact inline and its hover
    expect(read('components/DeskRead.tsx')).toContain('{levelTagLead(level.sourceDate)}{level.stateLabel}');
    expect(read('components/FocusStrip.tsx')).toContain('{levelTagLead(level.sourceDate)}{level.stateLabel}');
    expect(read('components/DeskRead.tsx')).toContain('{level.type}{levelDateSuffix(level.sourceDate)}');
    expect(read('components/FocusStrip.tsx')).toContain('{level.type}{levelDateSuffix(level.sourceDate)}');
    expect(read('lib/dashboard/deskRead.ts')).toContain('sourceDate: zone.sourceDate');
  });
});
