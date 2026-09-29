import { describe, expect, it } from 'vitest';

import { bootstrapBand, captureBand, loadMarketConfig } from '@/lib/market/config';

const production = { NODE_ENV: 'test', DISCOVERY_PRICE_MIN: '0.25' } as NodeJS.ProcessEnv;

describe('capture (record) band', () => {
  // The ADMITS case first: his ruling's band, as it will be set on the box.
  it('admits his $0.25-$50 record band around the $0.25-$20 qualify band', () => {
    const config = loadMarketConfig({
      ...production,
      CAPTURE_PRICE_MIN: '0.25',
      CAPTURE_PRICE_MAX: '50',
    });
    expect(captureBand(config)).toEqual({ min: 0.25, max: 50 });
  });

  it('is absent when unset, so the engine records the qualify band as today', () => {
    expect(captureBand(loadMarketConfig(production))).toBeNull();
  });

  it('refuses a band that would qualify names it does not record', () => {
    // Ceiling below the qualify ceiling: a $30 name could not qualify anyway,
    // but a $15-$20 name would qualify with no bars behind it.
    expect(
      captureBand(loadMarketConfig({ ...production, CAPTURE_PRICE_MIN: '0.25', CAPTURE_PRICE_MAX: '15' })),
    ).toBeNull();
    // Floor above the qualify floor.
    expect(
      captureBand(loadMarketConfig({ ...production, CAPTURE_PRICE_MIN: '1', CAPTURE_PRICE_MAX: '50' })),
    ).toBeNull();
  });

  it('refuses half a band rather than guessing the other end', () => {
    expect(captureBand(loadMarketConfig({ ...production, CAPTURE_PRICE_MAX: '50' }))).toBeNull();
  });
});

describe('bootstrap band', () => {
  it('seeds exactly the record band when one is set -- never x2 of it', () => {
    const config = loadMarketConfig({
      ...production,
      CAPTURE_PRICE_MIN: '0.25',
      CAPTURE_PRICE_MAX: '50',
    });
    // x2 of a $50 ceiling would seed $100 names the desk may not record.
    expect(bootstrapBand(config)).toEqual({ min: 0.25, max: 50 });
  });

  it('keeps the old widening when no record band is set (production today)', () => {
    const band = bootstrapBand(loadMarketConfig(production));
    expect(band.min).toBeCloseTo(0.1);
    expect(band.max).toBe(40);
  });
});
