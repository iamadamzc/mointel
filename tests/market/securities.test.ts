import { describe, expect, it } from 'vitest';

import {
  classifySecurity,
  isDiscoveryEligibleClass,
  summarizeClassifications,
} from '@/lib/market/securities';

describe('non-common instruments are excluded from ranked discovery', () => {
  it('classifies preferred series, including PSA.PRM', () => {
    const psa = classifySecurity({
      symbol: 'PSA.PRM',
      name: 'Public Storage Depositary Shares Series M Preferred',
      exchange: 'NYSE',
    });
    expect(psa.classification).toBe('PREFERRED');
    expect(psa.discoveryEligible).toBe(false);

    // Even with no issuer name, the suffix alone is enough.
    const bare = classifySecurity({ symbol: 'BAC.PRK', name: null, exchange: 'NYSE' });
    expect(bare.classification).toBe('PREFERRED');
    expect(bare.confidence).toBe('HIGH');
    expect(bare.discoveryEligible).toBe(false);
  });

  it('classifies warrants, rights and units', () => {
    for (const [symbol, expected] of [
      ['ABCD.WS', 'WARRANT'],
      ['ABCD.WT', 'WARRANT'],
      ['ABCD.RT', 'RIGHT'],
      ['ABCD.U', 'UNIT'],
    ] as const) {
      const result = classifySecurity({ symbol, name: null, exchange: 'NASDAQ' });
      expect(result.classification, symbol).toBe(expected);
      expect(result.discoveryEligible, symbol).toBe(false);
    }

    expect(
      classifySecurity({ symbol: 'XYZW', name: 'Acme Corp Warrants', exchange: 'NASDAQ' })
        .classification,
    ).toBe('WARRANT');
    expect(
      classifySecurity({ symbol: 'XYZU', name: 'Acme Acquisition Corp Units', exchange: 'NASDAQ' })
        .classification,
    ).toBe('UNIT');
  });

  it('classifies ETFs, ETNs and funds', () => {
    const cases: Array<[string, string, string]> = [
      ['SPY', 'SPDR S&P 500 ETF Trust', 'ARCA'],
      ['QQQ', 'Invesco QQQ Trust', 'NASDAQ'],
      ['IWM', 'iShares Russell 2000 ETF', 'ARCA'],
      ['TQQQ', 'ProShares UltraPro QQQ', 'NASDAQ'],
      ['PDI', 'PIMCO Dynamic Income Fund', 'NYSE'],
    ];

    for (const [symbol, name, exchange] of cases) {
      const result = classifySecurity({ symbol, name, exchange });
      expect(['ETF_ETP', 'FUND'], `${symbol} -> ${result.classification}`).toContain(
        result.classification,
      );
      expect(result.discoveryEligible, symbol).toBe(false);
    }
  });

  it('treats a venue that lists only ETPs as evidence', () => {
    const result = classifySecurity({ symbol: 'XXXX', name: 'Some Product', exchange: 'ARCA' });
    expect(result.classification).toBe('ETF_ETP');
    expect(result.confidence).toBe('MEDIUM');
    expect(result.source).toBe('listing-venue');
  });
});

describe('operating-company equity stays in the universe', () => {
  it('keeps ordinary common stock', () => {
    for (const [symbol, name] of [
      ['FIEE', 'FiEE, Inc.'],
      ['WETO', 'Wetouch Technology Inc.'],
      ['NWTG', 'Newton Golf Company, Inc.'],
      ['HHS', 'Harte Hanks, Inc.'],
    ] as const) {
      const result = classifySecurity({ symbol, name, exchange: 'NASDAQ' });
      expect(result.classification, symbol).toBe('COMMON_EQUITY');
      expect(result.discoveryEligible, symbol).toBe(true);
    }
  });

  it('keeps an ADR whose description merely uses the words "right" or "unit"', () => {
    // Real Alpaca metadata: this phrasing previously classified RLX as a
    // rights instrument and dropped a tradable foreign issuer.
    const rlx = classifySecurity({
      symbol: 'RLX',
      name: 'RLX Technology Inc. American Depositary Shares, each representing the right to receive one (1) Class A ordinary share',
      exchange: 'NYSE',
    });
    expect(rlx.classification).toBe('ADR_ADS');
    expect(rlx.discoveryEligible).toBe(true);

    const withUnits = classifySecurity({
      symbol: 'ABCD',
      name: 'Acme Holdings American Depositary Shares, each representing five units of beneficial interest',
      exchange: 'NASDAQ',
    });
    expect(withUnits.classification).toBe('ADR_ADS');
    expect(withUnits.discoveryEligible).toBe(true);
  });

  it('still catches instrument designations at the end of the name', () => {
    for (const [name, expected] of [
      ['Calisa Acquisition Corp Right', 'RIGHT'],
      ['Sizzle Acquisition Corp. II Rights', 'RIGHT'],
      ['RUM Group Inc. Warrant', 'WARRANT'],
      ['Ernexa Therapeutics Inc. Warrants', 'WARRANT'],
      ['Belpointe PREP, LLC Class A Units', 'UNIT'],
      ['Acme Acquisition Corp. Units, each consisting of one share', 'UNIT'],
      ['Acme Corp Warrants, each exercisable for one share', 'WARRANT'],
    ] as const) {
      const result = classifySecurity({ symbol: 'ABCD', name, exchange: 'NASDAQ' });
      expect(result.classification, name).toBe(expected);
      expect(result.discoveryEligible, name).toBe(false);
    }
  });

  it('keeps foreign issuers and ADRs', () => {
    const adr = classifySecurity({
      symbol: 'ZJYL',
      name: 'Jin Medical International Ltd. American Depositary Shares',
      exchange: 'NASDAQ',
    });
    expect(adr.classification).toBe('ADR_ADS');
    expect(adr.discoveryEligible).toBe(true);

    // A foreign ordinary share with no ADR wording is still common equity.
    const foreign = classifySecurity({
      symbol: 'WAFU',
      name: 'Wah Fu Education Group Limited',
      exchange: 'NASDAQ',
    });
    expect(foreign.classification).toBe('COMMON_EQUITY');
    expect(foreign.discoveryEligible).toBe(true);
  });

  it('keeps dual share classes rather than mistaking them for derivatives', () => {
    for (const symbol of ['BRK.A', 'BRK.B', 'HEI.A', 'GEF.B']) {
      const result = classifySecurity({ symbol, name: null, exchange: 'NYSE' });
      expect(result.classification, symbol).toBe('COMMON_EQUITY');
      expect(result.discoveryEligible, symbol).toBe(true);
    }
  });

  it('does not discard names merely containing fund-like words', () => {
    const result = classifySecurity({
      symbol: 'FGI',
      name: 'Fundamental Global Inc.',
      exchange: 'NASDAQ',
    });
    expect(result.classification).toBe('COMMON_EQUITY');
    expect(result.discoveryEligible).toBe(true);
  });
});

describe('unknown classifications are retained, not discarded', () => {
  it('keeps an asset with no evidence eligible', () => {
    const result = classifySecurity({ symbol: 'ZZZZ', name: null, exchange: 'NASDAQ' });
    expect(result.classification).toBe('UNKNOWN');
    expect(result.discoveryEligible).toBe(true);
    expect(isDiscoveryEligibleClass('UNKNOWN')).toBe(true);
  });

  it('keeps an unrecognised suffix eligible instead of dropping a possible common stock', () => {
    const result = classifySecurity({ symbol: 'ABCD.XY', name: null, exchange: 'NASDAQ' });
    expect(result.classification).toBe('UNKNOWN');
    expect(result.discoveryEligible).toBe(true);
    expect(result.reason).toMatch(/retained/i);
  });

  it('records the rule that produced every decision', () => {
    const result = classifySecurity({ symbol: 'PSA.PRM', name: null, exchange: 'NYSE' });
    expect(result.source).toBe('symbol-suffix');
    expect(result.reason).toContain('.PRM');
    expect(result.confidence).toBe('HIGH');
  });
});

describe('classification summary', () => {
  it('counts each class and the eligible total', () => {
    const summary = summarizeClassifications([
      classifySecurity({ symbol: 'FIEE', name: 'FiEE, Inc.', exchange: 'NASDAQ' }),
      classifySecurity({ symbol: 'PSA.PRM', name: null, exchange: 'NYSE' }),
      classifySecurity({ symbol: 'ABCD.WS', name: null, exchange: 'NASDAQ' }),
      classifySecurity({ symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'ARCA' }),
      classifySecurity({ symbol: 'ZZZZ', name: null, exchange: 'NASDAQ' }),
    ]);

    expect(summary.total).toBe(5);
    expect(summary.byClass.COMMON_EQUITY).toBe(1);
    expect(summary.byClass.PREFERRED).toBe(1);
    expect(summary.byClass.WARRANT).toBe(1);
    expect(summary.byClass.ETF_ETP).toBe(1);
    expect(summary.byClass.UNKNOWN).toBe(1);
    expect(summary.eligible).toBe(2);
    expect(summary.excluded).toBe(3);
  });
});
