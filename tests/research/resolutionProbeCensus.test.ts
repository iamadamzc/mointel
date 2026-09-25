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
 *     candidatesReturned 0        the resolver named nothing            REACH
 *     ...Probed > 0, Fetched 0    every host refused us           REACHABILITY
 *     ...Fetched > 0, none durable  pages answered, none was an index or
 *                                   a feed                               REACH
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

    const at = source.indexOf('probes.candidatesProbed += 1;');
    expect(at, 'nothing counts a probe').toBeGreaterThan(-1);

    // The fetch counter must be conditional. An unconditional increment would
    // make `fetched` equal `probed` always, which is the boolean's blindness
    // rebuilt out of integers.
    expect(source).toContain('if (!page.failure) probes.candidatesFetched += 1;');
  });


  it('names its unit, because the obvious guess is wrong', async () => {
    /*
     * `fetchCompanyPage` is called from THREE places in irRegistry: the
     * candidate loop, `probeFeed`, and `probeIndex`. Only the first is counted.
     * So a field called `probed` read as a REQUEST count undercounts -- and
     * rate limits are the first question anyone brings to a counter like this.
     *
     * Renamed before any row was written. After that the desk carries two keys
     * across vintages forever and every reader must know both, which is the
     * defect this census was built to avoid, one layer up.
     */
    const source = await read('lib/research/catalyst/irRegistry.ts');
    expect(source).toContain('candidatesReturned');
    expect(source).toContain('candidatesProbed');
    expect(source).toContain('candidatesFetched');

    // The unnamed forms must be gone from the census, not merely joined by the
    // named ones -- two spellings of one field is the thing being prevented.
    const at = source.indexOf('export interface ResolutionProbeCensus');
    const block = source.slice(at, source.indexOf('}', at));
    expect(block).not.toMatch(/^\s*returned:/m);
    expect(block).not.toMatch(/^\s*probed:/m);
    expect(block).not.toMatch(/^\s*fetched:/m);

    // And the fetch sites this census does NOT count are named where a reader
    // of the field will be standing.
    expect(source).toContain('probeFeed');
    expect(source).toContain('probeIndex');
  });

  it('documents probed as ATTEMPTED and fetched as ANSWERED, not the reverse', async () => {
    /*
     * THE FIX THAT ALMOST SHIPPED CONTRADICTING ITSELF. `e197a80` renamed the
     * fields to name their unit and carried the old docblock through unchanged:
     * `candidatesProbed` was documented as "actually fetched", which is what
     * `candidatesFetched` counts. Side by side the two lines read as a coherent
     * pair meaning the wrong thing -- probed as the successes and fetched as a
     * subset of them.
     *
     * That INVERTS the reachability arm. `candidatesFetched === 0` with
     * `candidatesProbed > 0` is "every host refused us"; a reader holding those
     * backwards concludes the opposite about a name. The prose block above the
     * fields is correct and does not save it, because a reader takes the unit
     * from the line attached to the field.
     */
    const source = await read('lib/research/catalyst/irRegistry.ts');
    const at = source.indexOf('candidatesProbed: number;');
    expect(at).toBeGreaterThan(-1);
    const doc = source.slice(Math.max(0, at - 420), at);
    expect(doc).toContain('ATTEMPTED');
    /*
     * The DEFINITION line must not come back. The docblock deliberately quotes
     * the old phrasing as history -- *it said "actually fetched" until
     * 2026-09-25* -- and a blunt `not.toContain` cannot tell a citation from a
     * definition. It failed on exactly that when this test was written, which
     * is the instrument distinguishing the two rather than obstructing it.
     */
    expect(doc).not.toContain('Candidates actually fetched');

    const fetchedAt = source.indexOf('candidatesFetched: number;');
    const fetchedDoc = source.slice(Math.max(0, fetchedAt - 520), fetchedAt);
    expect(fetchedDoc).toContain('answered with a body');
    expect(fetchedDoc).toContain('REACHABILITY');
  });

  it('seeds `candidatesReturned` from the candidate list, not from the probe cap', async () => {
    /*
     * `returned` must count what the RESOLVER named, before `MAX_CANDIDATE_PROBES`
     * truncates it. Seeding it from the slice would report 6 for a resolver that
     * named 40 and 6 for one that named 6, and the first is a healthy resolver
     * against a capped prober while the second is a resolver running dry.
     */
    const source = await read('lib/research/catalyst/irRegistry.ts');
    expect(source).toContain('candidatesReturned: candidates.length');
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
