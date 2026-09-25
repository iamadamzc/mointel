import { describe, expect, it } from 'vitest';

/**
 * Reach and reachability are different failures, and one boolean cannot tell them apart.
 *
 * R&D needs to know whether the desk fails to find an issuer's newsroom because
 * it never generated a candidate worth trying (**reach**) or because the host
 * refused the ones it did (**reachability**). The fixes are different: more
 * guessed paths against a longer timeout, a different user-agent, or a retry
 * policy.
 *
 * NEITHER WAS ANSWERABLE FROM STORAGE. The archived `collector_report` carries
 * no note field, and `irRegistry.ts` takes the same `if (!durable)` branch for
 * both outcomes with `sourceShape: null` and no url persisted. Withholding that
 * url is deliberate and right -- recording a newswire copy would look like
 * success and permanently block the discovery fallback, which is how XOS still
 * reached its Air Force release -- but it also erases the discriminator.
 *
 * THE ASK WAS ONE BOOLEAN AND THIS IS THREE COUNTS, deliberately.
 * `unreachable` already exists in memory, but it is a STICKY OR across the probe
 * loop: one refusing host sets it even when a later candidate answered fine and
 * simply was not a collection point. So it cannot separate:
 *
 *     returned 0                           the resolver named nothing    REACH
 *     returned N, fetched 0                every host refused us    REACHABILITY
 *     returned N, fetched M, none durable  pages answered, none was an index
 *                                          or a feed                      REACH
 *
 * The second and third would be one observation under the boolean -- the defect
 * shape this desk hit three times on 2026-09-25 (`minute_bars` zero rows,
 * `companySourceDetail`, `catalystStatus`). A fourth was avoidable.
 */

const read = async (relative: string) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  return fs.readFile(path.join(process.cwd(), relative), 'utf8');
};

describe('the probe loop counts what it tried', () => {
  it('counts a probe when it fetches, and a fetch only when the page answered', async () => {
    const source = await read('lib/research/catalyst/irRegistry.ts');

    // Instrument first: the loop these counters hang off must still be here.
    expect(source).toContain('for (const candidate of candidates.slice(0, MAX_CANDIDATE_PROBES))');

    const at = source.indexOf('probes.probed += 1;');
    expect(at, 'nothing counts a probe').toBeGreaterThan(-1);

    // The fetch counter must be conditional. An unconditional increment would
    // make `fetched` equal `probed` always, which is the boolean's blindness
    // rebuilt out of integers.
    expect(source).toContain('if (!page.failure) probes.fetched += 1;');
  });

  it('seeds `returned` from the candidate list, not from the probe cap', async () => {
    /*
     * `returned` must count what the RESOLVER named, before `MAX_CANDIDATE_PROBES`
     * truncates it. Seeding it from the slice would report 6 for a resolver that
     * named 40 and 6 for one that named 6, and the first is a healthy resolver
     * against a capped prober while the second is a resolver running dry.
     */
    const source = await read('lib/research/catalyst/irRegistry.ts');
    expect(source).toContain('returned: candidates.length');
  });

  it('distinguishes "did not look" from "looked and found nothing"', async () => {
    /*
     * The three returns that precede any probing -- a reused stored source, a
     * reused stored negative, and no resolver configured -- carry NO_PROBES.
     * A zero census from those paths must not read as a resolver that ran and
     * named nothing, which is a real and different finding.
     */
    const source = await read('lib/research/catalyst/irRegistry.ts');
    expect(source).toContain('const NO_PROBES: ResolutionProbeCensus');
    expect(source.match(/probes: NO_PROBES/g)).toHaveLength(3);
  });

  it('every resolution outcome carries a census', async () => {
    // The type makes this true, so this asserts the type still demands it.
    const source = await read('lib/research/catalyst/irRegistry.ts');
    const at = source.indexOf('export interface ResolveResult');
    const block = source.slice(at, source.indexOf('}', at));
    expect(block).toContain('probes: ResolutionProbeCensus;');
    expect(block).not.toContain('probes?:');
  });
});

describe('it reaches storage, where R&D can read it', () => {
  it('is on the report and on the persisted record', async () => {
    const collector = await read('lib/research/catalyst/collector.ts');
    expect(collector).toContain('resolutionProbes: ResolutionProbeCensus;');
    // Written wherever a resolution result lands -- both the urgent path and
    // the scheduled one, or the census is silently absent on half the jobs.
    expect(collector.match(/report\.resolutionProbes = resolution\.probes;/g)).toHaveLength(2);

    const repo = await read('lib/market/store/researchRepo.ts');
    const at = repo.indexOf('export interface CollectorReportRecord');
    expect(repo.slice(at, repo.indexOf('}', at))).toContain('resolutionProbes');

    const worker = await read('worker/research.ts');
    expect(worker).toContain('resolutionProbes: catalystReport.resolutionProbes,');
  });
});
