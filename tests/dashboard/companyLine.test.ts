import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { COMPANY_WORDS, companyLine } from '@/lib/dashboard/companyLine';

describe('the company line, three states', () => {
  it('PRODUCED: the name and a decoded country, each with one full stop', () => {
    const line = companyLine({ dossier: { companyName: 'Sangoma Technologies Corp.', country: 'A6' } });
    expect(line.state).toBe('PRODUCED');
    expect(line.text).toBe('Sangoma Technologies Corp.');
    expect(line.country).toBe('Canada.');
    expect(line.hint).toBe('Sangoma Technologies Corp. Canada.');
    expect(line.countryNote).toBeNull();
  });

  it('reads a model-written country name as well as an EDGAR code, and never guesses an undecodable one', () => {
    expect(companyLine({ dossier: { companyName: 'Acme Inc', country: 'Israel' } }).country).toBe('Israel.');
    const odd = companyLine({ dossier: { companyName: 'Acme Inc', country: 'Narnia' } });
    expect(odd.country).toBeNull();
    expect(odd.countryNote).toBe("Country: not in the desk's research");
    expect(odd.text).toBe('Acme Inc.');
  });

  it('UNKNOWN: a dossier with no company name says so, in the approved words', () => {
    const line = companyLine({ dossier: { companyName: null, country: 'US' } });
    expect(line).toMatchObject({ state: 'UNKNOWN', text: "No company name in the desk's research for this name.", hint: null });
  });

  it('NOT_YET: no dossier and no Sheet name says the desk has not researched it', () => {
    expect(companyLine({ dossier: null })).toMatchObject({
      state: 'NOT_YET',
      text: 'The desk has not researched this name.',
    });
  });

  it('falls back to the Sheet only while it exists, and the desk wins when both have a name', () => {
    expect(companyLine({ dossier: null, sheetName: 'Sheet Co', sheetCountry: 'USA' }).text).toBe('Sheet Co.');
    expect(companyLine({ dossier: { companyName: 'Desk Co', country: null }, sheetName: 'Sheet Co' }).text).toBe('Desk Co.');
    // The company's name without a country gets the detail row, not a silent drop.
    expect(companyLine({ dossier: { companyName: 'Desk Co', country: null } }).countryNote).toBe(COMPANY_WORDS.countryAbsent);
  });

  it('removes a stray citation token and reads blank strings as absent', () => {
    expect(companyLine({ dossier: { companyName: 'Acme Inc [Source 115982]', country: null } }).text).toBe('Acme Inc.');
    expect(companyLine({ dossier: { companyName: '   ', country: null } }).state).toBe('UNKNOWN');
  });

  it('says the country is the business address, from SEC filings', () => {
    expect(COMPANY_WORDS.countryHover).toBe("Country is where the company's business address is, from its SEC filings.");
  });
});

describe('the drawer and the board use it', () => {
  it('the drawer header no longer says "Company name not in RESEARCH"', () => {
    const drawer = readFileSync('components/TickerDrawer.tsx', 'utf8');
    expect(drawer).not.toContain('Company name not in RESEARCH');
    expect(drawer).toContain('companyLine(');
  });

  it('the board gives the ticker the company line as a hover, only when the desk has a name', () => {
    const board = readFileSync('components/DiscoveryBoard.tsx', 'utf8');
    expect(board).toContain('companyHint={');
    expect(board).toContain('}).hint');
    const cells = readFileSync('components/DecisionCells.tsx', 'utf8');
    expect(cells).toContain('title={companyHint ?? undefined}');
  });
});
