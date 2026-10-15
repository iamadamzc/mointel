import { describe, expect, it } from 'vitest';

import { resolveCatalystFreshness } from '@/lib/research/time';

/**
 * A dossier claiming `FRESH_FOUND` on a catalyst its own arithmetic calls OLD.
 *
 * `catalystStatus` is a MODEL output against an undescribed enum
 * (`schema.ts:70`), and nothing compared it to the event date the desk already
 * holds. The guardrails checked only that a positive status CITES a source and
 * that `NONE_FOUND` is not claimed on incomplete coverage.
 *
 * MEASURED, 2026-08-23 snapshot: of 138 `FRESH_FOUND` analyses, 41 -- 30% --
 * carry an event the desk bands STALE, the oldest by 13 days. The drawer
 * renders status and freshness ADJACENT (`AutomaticIntelligence.tsx:365`), so
 * those rows print "Fresh found - Stale" on the same line.
 *
 * THE PRODUCTION CASE: `AIFF`, 2026-09-25. `FRESH_FOUND` on a 2026-09-17
 * timestamp while that morning's wire release was never collected -- and the
 * stale positive CLOSED the re-ask, because `queue.ts:236` treats any
 * non-`UNKNOWN` status as answered. The desk stopped looking because it
 * believed it already had the catalyst.
 *
 * This asserts the RULE arithmetically rather than through `applyGuardrails`,
 * which needs a full bundle: the band comes from the shipped
 * `resolveCatalystFreshness`, so the fixture cannot drift away from what the
 * desk actually computes, and the source assertions below pin the normalisation
 * to the one place that performs it.
 */

const AIFF_EVENT = '2026-09-17T11:50:00Z';
const AIFF_READ_AT = new Date('2026-09-25T11:48:31Z');

describe('the band the desk derives, on the production case', () => {
  it('calls an eight-day-old catalyst STALE', () => {
    // The instrument. If this stopped being STALE the normalisation below
    // would be reconciling nothing, and this test would say so.
    expect(resolveCatalystFreshness(AIFF_EVENT, AIFF_READ_AT)).toBe('STALE');
  });

  it('still calls today FRESH and yesterday RECENT, so the rule is not blanket', () => {
    // A normalisation that fired on everything would be a different defect
    // wearing the fix's name: it must ADMIT the cases it is not for.
    const now = new Date('2026-09-25T13:00:00Z');
    expect(resolveCatalystFreshness('2026-09-25T12:00:00Z', now)).toBe('FRESH');
    expect(resolveCatalystFreshness('2026-09-24T12:00:00Z', now)).toBe('RECENT');
  });
});

describe('the write side reconciles the two', () => {
  it('demotes FRESH_FOUND to SECONDARY_STALE when the band is STALE', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(
      path.join(process.cwd(), 'lib/research/interpret/guardrails.ts'),
      'utf8',
    );

    // Instrument first: the recomputation this hangs off must still be here,
    // and must still come BEFORE the reconciliation, or the status would be
    // compared against a freshness the model supplied.
    // Since 2026-10-15 the band reads the shared event rule (catalystFreshnessOf, the cited sources vouching for a clock).
    const recompute = source.indexOf('catalyst.freshness = catalystFreshnessOf(');
    expect(recompute).toBeGreaterThan(-1);
    expect(source.slice(recompute, recompute + 220)).toContain('freshFrom');

    const normalise = source.indexOf(
      "if (catalyst.catalystStatus === 'FRESH_FOUND' && catalyst.freshness === 'STALE') {",
    );
    expect(normalise).toBeGreaterThan(-1);
    expect(normalise).toBeGreaterThan(recompute);
    expect(source.slice(normalise, normalise + 260)).toContain(
      "catalyst.catalystStatus = 'SECONDARY_STALE';",
    );
  });

  it('normalises rather than raising a violation', async () => {
    /*
     * The same decision as `f224f3d` and for the same measured reason: the
     * only severities are REJECT and DOWNGRADE, so flagging this turns 41 of
     * 325 analyses PARTIAL -- an eighth of the board -- as a side effect of
     * making two fields agree. And the model was never told what FRESH_FOUND
     * means, so a penalty would punish an unstated requirement.
     */
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(
      path.join(process.cwd(), 'lib/research/interpret/guardrails.ts'),
      'utf8',
    );
    const at = source.indexOf(
      "if (catalyst.catalystStatus === 'FRESH_FOUND' && catalyst.freshness === 'STALE') {",
    );
    const block = source.slice(at, at + 200);
    expect(block).not.toContain('violations.push');
  });
});

/**
 * The three readers must band with ONE boundary, or the fix above inverts.
 *
 * `8687f04` derived staleness with a two-argument call and its comment claimed
 * the gate and the board could not disagree. They could: `why.ts` passes the
 * prior session's close as a third argument, so a CLOCKED catalyst after that
 * close bands FRESH on the board while the day bands alone call it STALE.
 *
 * WHERE IT BITES is narrower than it first appears. A day-band-1 catalyst
 * diverges RECENT/FRESH, which the re-ask gate ignores because it only fires on
 * STALE. The consequence needs a catalyst TWO OR MORE ET days old that still
 * falls after the prior session's close -- Monday morning holding Friday
 * evening's news, and the day after a holiday. Measured on the 2026-08-23
 * snapshot: 6 of 59 clocked catalysts diverge and ALL SIX are day-band 1, so
 * that snapshot holds no instance of the firing case.
 *
 * THAT ABSENCE IS WORTH LITTLE AND THE WINDOW SAYS WHY: the read-dates are
 * 2026-08-17..21, which holds ONE Monday, and 5 of the 58 clocked catalysts
 * were read on it. The case could have appeared and did not -- an n of five,
 * not a rate. A sound negative is a fact about the instrument and its window
 * before it is a fact about the world.
 *
 * Fixed rather than documented for the reason that does not depend on the rate:
 * rare is not absent, and Monday is not a rare day.
 *
 * The worse half was the WRITE side: `validateDossier` banding STALE while the
 * board renders green would demote `catalystStatus` on a row the reader sees as
 * fresh -- the contradiction that function exists to remove, arriving from the
 * other side.
 */
describe('one boundary, three readers', () => {
  const FRIDAY_EVENING = '2026-09-18T20:30:00Z'; // 16:30 ET Friday, after the close
  const MONDAY_MORNING = new Date('2026-09-21T13:00:00Z'); // 09:00 ET Monday
  const FRIDAY_CLOSE = new Date('2026-09-18T20:00:00Z');

  it('is the case that bites: three ET days old, but after the prior session close', () => {
    // The instrument. If this stopped being a day-band STALE the divergence
    // below would be untestable and this file would pass while proving nothing.
    expect(resolveCatalystFreshness(FRIDAY_EVENING, MONDAY_MORNING)).toBe('STALE');
    expect(resolveCatalystFreshness(FRIDAY_EVENING, MONDAY_MORNING, FRIDAY_CLOSE)).toBe('FRESH');
  });

  it('the re-ask gate supplies the boundary', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.join(process.cwd(), 'lib/research/queue.ts'), 'utf8');
    expect(source).toContain('catalystFreshFromUtc(db, options.tradingDate)');
    // And it is the value actually passed, not merely computed and dropped.
    const at = source.indexOf('catalystFreshnessOf(');
    expect(at).toBeGreaterThan(-1);
    expect(source.slice(at, at + 420)).toContain('freshFrom');
  });

  it('the write side takes the boundary and the pipeline supplies it', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const guardrails = await fs.readFile(
      path.join(process.cwd(), 'lib/research/interpret/guardrails.ts'),
      'utf8',
    );
    const write = guardrails.indexOf('catalyst.freshness = catalystFreshnessOf(');
    expect(write).toBeGreaterThan(-1);
    expect(guardrails.slice(write, write + 220)).toContain('freshFrom');

    const pipeline = await fs.readFile(
      path.join(process.cwd(), 'lib/research/interpret/pipeline.ts'),
      'utf8',
    );
    expect(pipeline).toContain('catalystFreshFromUtc(db, options.tradingDate)');
    // All three validate calls, not just the first: a repair or an escalation
    // banding differently from the accepted dossier is the same defect again.
    expect(pipeline.match(/validateDossier\([\s\S]{0,80}?freshFrom\)/g)).toHaveLength(3);
  });

  it('all three read ONE implementation of the boundary', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    for (const [file, specifier] of [
      ['lib/research/queue.ts', "from './freshFrom'"],
      ['lib/research/interpret/pipeline.ts', "from '../freshFrom'"],
    ] as const) {
      const source = await fs.readFile(path.join(process.cwd(), file), 'utf8');
      expect(source).toContain(specifier);
    }
  });
});
