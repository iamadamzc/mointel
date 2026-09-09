/**
 * The 09-04 recovery script's non-negotiables.
 *
 * Three of these are SOURCE ASSERTIONS and say so. The script is a `main()`
 * with a database and a vendor client behind it; no test in this suite drives
 * it, which is the same gap the token-attribution fix ran into. The guard is
 * the text, and it is worth having because each property is invisible when it
 * breaks: a backfill written as `live-bar` looks like data arriving, a derived
 * `trading_date` looks correct until someone groups by it, and a write outside
 * a transaction looks complete until it is interrupted.
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { sessionWindow } from '@/worker/minute-bar-recovery';

const SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../worker/minute-bar-recovery.ts'),
  'utf8',
);

describe('the session window a recovery asks the vendor for', () => {
  it('covers 04:00 to 20:00 ET, which is what the desk captures', () => {
    const { start, end } = sessionWindow('2026-09-04');

    expect(start).toBe('2026-09-04T08:00:00Z');
    expect(end).toBe('2026-09-05T00:00:00.000Z');
  });

  it('rolls into the next calendar day rather than clamping at midnight', () => {
    // The window is 16 hours from 08:00Z, so it necessarily ends on the
    // following date. A naive same-day end would silently drop after-hours.
    const { end } = sessionWindow('2026-09-30');

    expect(end.startsWith('2026-10-01')).toBe(true);
  });
});

describe('what the recovery must never get wrong', () => {
  it('writes source historical and never live-bar', () => {
    expect(SOURCE).toMatch(/source: 'historical'/);
    expect(SOURCE).not.toMatch(/source: 'live-bar'/);
  });

  it('assigns trading_date from the argument rather than deriving it from ts', () => {
    // upsertMinuteBars takes the date explicitly; passing anything derived
    // from a bar timestamp is how the store's first mismatched row gets made.
    expect(SOURCE).toMatch(/upsertMinuteBars\(db, tradingDate, rows\)/);
  });

  it('writes inside a single transaction, so the date is wholly present or wholly absent', () => {
    expect(SOURCE).toMatch(/db\.transaction\(/);
  });

  it('refuses a date that already holds bars instead of upserting over them', () => {
    expect(SOURCE).toMatch(/already holds/);
    expect(SOURCE).toMatch(/refusing/);
  });

  it('never constructs a MarketRuntime, whose store claim can wipe three tables', () => {
    expect(SOURCE).not.toMatch(/new MarketRuntime/);
  });
});

describe('the registered band gates the write rather than judging it', () => {
  it('refuses and writes nothing when the fetch lands outside the band', () => {
    /*
     * A SHORT FETCH IS THE FAILURE THAT LOOKS LIKE SUCCESS. 400,000 rows
     * arriving reads exactly like data arriving, and once written it is the
     * recovery that has to be undone rather than retried. So the check runs
     * BEFORE the transaction, not after it.
     */
    const refusal = SOURCE.indexOf('REFUSING');
    const write = SOURCE.indexOf('db.transaction(');

    expect(refusal).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(-1);
    expect(refusal, 'the band is checked after the write, which makes it a post-mortem').toBeLessThan(
      write,
    );
  });

  it('returns before writing under --count-only', () => {
    const countOnly = SOURCE.indexOf("'[recover] --count-only: nothing written.'");
    const write = SOURCE.indexOf('db.transaction(');

    expect(countOnly).toBeGreaterThan(-1);
    expect(countOnly).toBeLessThan(write);
  });

  it('leaves the band unenforced when none is registered', () => {
    // Optional by design: enforcing a made-up band on an unregistered date
    // would be worse than reporting the count and letting a person look.
    expect(SOURCE).toMatch(/if \(expect && \(rows\.length < expect\.min/);
  });
});
