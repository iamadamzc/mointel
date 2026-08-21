import { describe, expect, it, vi } from 'vitest';

import {
  SymbolAdmission,
  invalidSymbolFrom,
  isolateInvalidSymbols,
  type RejectedSymbolRecord,
} from '@/lib/market/symbolAdmission';

/**
 * Nothing reaches the provider without being a symbol, and a provider saying
 * "that is not a symbol" is heard once.
 *
 * The 19 August loop needed both halves to fail. A spreadsheet label was
 * admitted as a ticker, and when Alpaca answered `400 invalid symbol:
 * OBSERVED PM` the caller logged it, did not remember it, and did not latch —
 * so the flush timer asked again a second later. 21,473 identical failures in
 * twenty-four hours, and no regular-session close captured in any of them.
 */

const UNIVERSE = new Set(['BEEM', 'EVAX', 'ATH.PRD', 'KCAC.WS', 'HUIZ']);

type AdmissionOptions = ConstructorParameters<typeof SymbolAdmission>[0];

function admission(overrides: Partial<AdmissionOptions> = {}) {
  return new SymbolAdmission({ knownSymbols: () => UNIVERSE, ...overrides });
}

describe('admission against the canonical universe', () => {
  it('accepts real symbols and refuses values that are not companies', () => {
    const gate = admission();
    const { accepted, rejected } = gate.validate(
      ['BEEM', 'TICKER', 'EVAX', 'OBSERVED PM'],
      'today-sheet',
    );

    expect(accepted).toEqual(['BEEM', 'EVAX']);
    expect(rejected).toEqual(['TICKER', 'OBSERVED PM']);
  });

  it('keeps provider-supported symbols a letters-only rule would destroy', () => {
    const gate = admission();
    expect(gate.validate(['ATH.PRD', 'KCAC.WS'], 'today-sheet').accepted).toEqual([
      'ATH.PRD',
      'KCAC.WS',
    ]);
  });

  it('normalises case and whitespace before deciding', () => {
    const gate = admission();
    expect(gate.validate(['  beem ', 'Evax'], 'today-sheet').accepted).toEqual(['BEEM', 'EVAX']);
  });

  it('fails open when the universe has not loaded', () => {
    /*
     * SHEET_ONLY mode is a supported state, not a fault. Refusing every symbol
     * because none can be confirmed would take the desk down to fix a
     * spreadsheet bug, which is a worse outcome than the bug.
     */
    const gate = new SymbolAdmission({ knownSymbols: () => new Set() });
    expect(gate.validate(['BEEM', 'ANYTHING'], 'today-sheet').accepted).toEqual([
      'BEEM',
      'ANYTHING',
    ]);
  });
});

describe('remembering a refusal', () => {
  it('reports one entry per distinct value, with a count rather than repeats', () => {
    const gate = admission();
    for (let attempt = 0; attempt < 500; attempt += 1) {
      gate.validate(['OBSERVED PM'], 'today-sheet');
    }

    expect(gate.rejected).toHaveLength(1);
    expect(gate.rejected[0].symbol).toBe('OBSERVED PM');
    expect(gate.rejected[0].count).toBe(500);
  });

  it('logs the first sighting only, so a diagnostic cannot become the flood', () => {
    const seen: RejectedSymbolRecord[] = [];
    const gate = admission({ onFirstRejection: (record) => seen.push(record) });

    for (let attempt = 0; attempt < 100; attempt += 1) gate.validate(['TICKER'], 'today-sheet');

    expect(seen).toHaveLength(1);
    expect(seen[0].source).toBe('today-sheet');
  });

  it('carries first-seen and last-seen so an operator can date the problem', () => {
    let clock = Date.parse('2026-08-19T20:02:01.000Z');
    const gate = admission({ now: () => new Date(clock) });

    gate.validate(['OBSERVED PM'], 'today-sheet');
    clock += 3600_000;
    gate.validate(['OBSERVED PM'], 'rth-close-capture');

    const [record] = gate.rejected;
    expect(record.firstSeenAt).toBe('2026-08-19T20:02:01.000Z');
    expect(record.lastSeenAt).toBe('2026-08-19T21:02:01.000Z');
    // The reason stays the one that condemned it, not the latest caller's.
    expect(record.reason).toBe('not in universe');
  });

  it('refuses a quarantined symbol even if the universe later contains it', () => {
    const known = new Set(['BEEM']);
    const gate = new SymbolAdmission({ knownSymbols: () => known });

    gate.reject('GHOST', 'rth-close-capture', 'provider rejected: invalid symbol');
    known.add('GHOST');

    expect(gate.validate(['GHOST', 'BEEM'], 'rth-close-capture').accepted).toEqual(['BEEM']);
  });
});

describe('reading the offending symbol out of a provider error', () => {
  it('extracts it from the exact body production returned', () => {
    const body = '{"message":"code=400, message=invalid symbol: OBSERVED PM"}';
    expect(invalidSymbolFrom(400, body)).toBe('OBSERVED PM');
  });

  it('ignores statuses that say nothing about the symbol', () => {
    const body = '{"message":"code=400, message=invalid symbol: OBSERVED PM"}';
    // A 401, 429 or 500 is about the account or the service. Treating one as a
    // bad ticker would quarantine a real symbol during an outage.
    for (const status of [401, 403, 429, 500, 503]) {
      expect(invalidSymbolFrom(status, body)).toBeNull();
    }
  });

  it('returns null for a 400 that names nothing', () => {
    expect(invalidSymbolFrom(400, '{"message":"code=400, message=bad request"}')).toBeNull();
  });
});

describe('isolating one bad symbol from a batch', () => {
  const bad = (symbol: string) =>
    Object.assign(new Error('http'), { __symbol: symbol.toUpperCase() });
  const invalidSymbol = (error: unknown) =>
    (error as { __symbol?: string }).__symbol ?? null;

  it('lets the remaining validated symbols through', async () => {
    /*
     * Alpaca answers a batch containing an unknown symbol with a 400 for the
     * WHOLE batch, so one label returned nothing for two hundred real tickers.
     */
    const request = vi.fn(async (symbols: string[]) => {
      if (symbols.includes('OBSERVED PM')) throw bad('OBSERVED PM');
      return new Map(symbols.map((symbol) => [symbol, { close: 1 }]));
    });
    const quarantined: string[] = [];

    const result = await isolateInvalidSymbols({
      symbols: ['BEEM', 'OBSERVED PM', 'EVAX'],
      request,
      invalidSymbol,
      onQuarantine: (symbol) => quarantined.push(symbol),
      empty: () => new Map(),
    });

    expect([...result.keys()]).toEqual(['BEEM', 'EVAX']);
    expect(quarantined).toEqual(['OBSERVED PM']);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('removes several bad members without unbounded retrying', async () => {
    const request = vi.fn(async (symbols: string[]) => {
      for (const junk of ['TICKER', 'OBSERVED PM']) {
        if (symbols.includes(junk)) throw bad(junk);
      }
      return new Map(symbols.map((symbol) => [symbol, { close: 1 }]));
    });

    const result = await isolateInvalidSymbols({
      symbols: ['TICKER', 'BEEM', 'OBSERVED PM'],
      request,
      invalidSymbol,
      onQuarantine: () => undefined,
      empty: () => new Map(),
    });

    expect([...result.keys()]).toEqual(['BEEM']);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('gives up rather than looping when every symbol is refused', async () => {
    const request = vi.fn(async (symbols: string[]) => {
      throw bad(symbols[0]);
    });

    const result = await isolateInvalidSymbols({
      symbols: ['A', 'B', 'C'],
      request,
      invalidSymbol,
      onQuarantine: () => undefined,
      empty: () => new Map(),
      maxAttempts: 4,
    });

    expect(result.size).toBe(0);
    expect(request.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('propagates an error that names no symbol', async () => {
    // An expired key or an outage must not be silently swallowed as if the
    // desk had merely asked for a bad ticker.
    const request = vi.fn(async () => {
      throw new Error('Alpaca HTTP 500: service unavailable');
    });

    await expect(
      isolateInvalidSymbols({
        symbols: ['BEEM'],
        request,
        invalidSymbol: () => null,
        onQuarantine: () => undefined,
        empty: () => new Map(),
      }),
    ).rejects.toThrow('500');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('propagates when the provider names something we never sent', async () => {
    // Retrying cannot converge: the filter removes nothing and the loop would
    // run to its cap for no reason.
    const request = vi.fn(async () => {
      throw bad('SOMETHING-ELSE');
    });

    await expect(
      isolateInvalidSymbols({
        symbols: ['BEEM'],
        request,
        invalidSymbol,
        onQuarantine: () => undefined,
        empty: () => new Map(),
      }),
    ).rejects.toBeTruthy();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('makes no request at all when nothing survived admission', async () => {
    const request = vi.fn(async () => new Map());

    const result = await isolateInvalidSymbols({
      symbols: [],
      request,
      invalidSymbol,
      onQuarantine: () => undefined,
      empty: () => new Map(),
    });

    expect(result.size).toBe(0);
    expect(request).not.toHaveBeenCalled();
  });
});

describe('the loop cannot come back', () => {
  it('stops requesting a refused symbol however many cycles run', async () => {
    /*
     * The regression in one test. Twenty-one thousand cycles is the real number
     * from a single day; a hundred is enough to prove the shape. After the
     * first refusal the value never reaches the request function again.
     */
    const gate = admission();
    const request = vi.fn(async (symbols: string[]) => {
      if (symbols.includes('OBSERVED PM')) throw bad('OBSERVED PM');
      return new Map(symbols.map((symbol) => [symbol, { close: 1 }]));
    });

    const tracked = ['BEEM', 'OBSERVED PM', 'EVAX'];
    let requestsSeeingJunk = 0;

    for (let cycle = 0; cycle < 100; cycle += 1) {
      const { accepted } = gate.validate(tracked, 'rth-close-capture');
      if (accepted.includes('OBSERVED PM')) requestsSeeingJunk += 1;
      await isolateInvalidSymbols({
        symbols: accepted,
        request,
        invalidSymbol,
        onQuarantine: (symbol) => gate.reject(symbol, 'rth-close-capture', 'provider rejected'),
        empty: () => new Map(),
      });
    }

    expect(requestsSeeingJunk).toBe(0);
    expect(request).toHaveBeenCalledTimes(100); // one clean call per cycle
    expect(gate.rejected).toHaveLength(1);
    expect(gate.rejected[0].count).toBe(100);
  });

  const bad = (symbol: string) =>
    Object.assign(new Error('http'), { __symbol: symbol.toUpperCase() });
  const invalidSymbol = (error: unknown) => (error as { __symbol?: string }).__symbol ?? null;
});
