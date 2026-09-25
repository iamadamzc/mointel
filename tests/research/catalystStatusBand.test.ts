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
    const recompute = source.indexOf(
      'catalyst.freshness = resolveCatalystFreshness(catalyst.eventTimestamp, now);',
    );
    expect(recompute).toBeGreaterThan(-1);

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
