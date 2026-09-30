import { describe, expect, it } from 'vitest';

import { EDGAR_STATE_COUNTRY, edgarCountry } from '@/lib/research/sec/stateCountry';

/*
 * Every non-null `issuer_registry.country` code on the 2026-09-29 prod copy
 * (`data/market-prod-2026-09-29.db`, read-only, 2026-09-30): 77 codes over
 * 1,044 issuers; 247 more rows are null.
 */
const OBSERVED =
  'CA NY TX FL F4 MA NJ K3 L3 PA U0 CO WA MD IL NC VA NV OH CT UT GA DE MI AZ X0 TN MN M0 E9 LA IN C3 A1 WI OR OK J3 AL KS F5 DC D5 D0 2M Z4 V8 V7 NH NE N8 MO L2 ID A6 Y9 W1 U3 R5 O9 N4 ME M5 L6 KY K8 J1 IA I0 HI H9 F3 C0 AR A9 A8 A0'.split(' ');

describe('EDGAR state and country codes, decoded to a country', () => {
  it('decodes every code the desk has stored', () => {
    expect(OBSERVED).toHaveLength(77);
    const undecoded = OBSERVED.filter((code) => edgarCountry(code) === null);
    expect(undecoded).toEqual([]);
  });

  it('reads CA as California, never Canada', () => {
    expect(edgarCountry('CA')).toBe('United States');
    expect(EDGAR_STATE_COUNTRY.get('CA')).toBe('CALIFORNIA');
  });

  it('folds every province and the federal code into Canada, and every state into the United States', () => {
    for (const [code, name] of EDGAR_STATE_COUNTRY) {
      if (name.includes('CANADA')) expect(edgarCountry(code)).toBe('Canada');
    }
    expect(edgarCountry('A6')).toBe('Canada'); // SANG, Ontario
    expect(edgarCountry('Z4')).toBe('Canada');
    for (const code of ['NY', 'TX', 'DC', 'WY', 'X1']) expect(edgarCountry(code)).toBe('United States');
  });

  it('gives a reader’s name where EDGAR’s is inverted or official', () => {
    expect(edgarCountry('M5')).toBe('South Korea');
    expect(edgarCountry('K3')).toBe('Hong Kong');
    expect(edgarCountry('E9')).toBe('Cayman Islands');
    expect(edgarCountry('D8')).toBe('British Virgin Islands');
    expect(edgarCountry('1Z')).toBe('Russia');
    expect(edgarCountry('S0')).toBe('Guinea-Bissau');
    expect(edgarCountry('F7')).toBe('Cocos (Keeling) Islands');
    expect(edgarCountry('B9')).toBe('Antigua and Barbuda');
    expect(edgarCountry('Y8')).toBe('Isle of Man');
  });

  it('is unknown, never a guess, for a missing, unlisted or UNKNOWN code', () => {
    for (const code of [null, undefined, '', '  ', 'ZZ', 'XX', 'CANADA']) {
      expect(edgarCountry(code)).toBeNull();
    }
    expect(edgarCountry(' a6 ')).toBe('Canada');
  });

  it('decodes every code EDGAR lists except its own UNKNOWN, and never prints capitals or an em dash', () => {
    expect(EDGAR_STATE_COUNTRY.size).toBeGreaterThan(240);
    for (const code of EDGAR_STATE_COUNTRY.keys()) {
      const country = edgarCountry(code);
      if (code === 'XX') {
        expect(country).toBeNull();
        continue;
      }
      expect(country).not.toBeNull();
      expect(country).not.toMatch(/^[A-Z .,'()-]{4,}$/);
      expect(country).not.toContain('—');
    }
  });
});
