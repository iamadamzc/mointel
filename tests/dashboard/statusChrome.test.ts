import { describe, expect, it } from 'vitest';

/*
 * The header shows words only when a light is NOT in its normal state.
 *
 * "Market: Alpaca SIP" and "Research: idle" were on screen every second of
 * every session — constants dressed as status lines, holding permanent space in
 * the one row that is always visible. This desk's own rule is that an
 * observable which cannot vary is not a measurement, and the trader asked for
 * the space back.
 *
 * Asserted against source rather than a render, because the failure is
 * structural: a component printing a label unconditionally. A test on the label
 * STRINGS would pass even after someone reinstated the unconditional print.
 */
describe('status chrome shows only what varies', () => {
  const read = (f: string) =>
    import('node:fs').then((fs) => fs.promises.readFile(f, 'utf8'));

  /*
   * A PLACEHOLDER MUST NOT NAME A FAILURE IT HAS NOT OBSERVED.
   *
   * `OFFLINE_HEALTH_VIEW` rendered `Market: worker offline` — the exact string
   * `health.ts:181` uses when the worker really is dead — in red, at every page
   * load before the first payload arrived. The desk announced that capture was
   * down when the truth was that the page had not loaded.
   *
   * This is the dangerous direction of the not-measured family. A refusal shown
   * as an absence loses information; a LATENCY shown as a failure raises a false
   * alarm about the one subsystem he cannot trade without.
   *
   * Asserted against source because the failure is a constant in a file, and
   * because these views are not exported.
   */
  it('never names a failure before the first payload arrives', async () => {
    const source = await read('components/DashboardShell.tsx');

    expect(source).not.toContain("label: 'Market: worker offline'");
    expect(source).not.toContain("label: 'Research: engine offline'");
    expect(source).not.toContain("label: 'Assessments: scheduler offline'");
    expect(source).toContain("label: 'Market: not loaded'");
    expect(source).toContain("label: 'Research: not loaded'");
    expect(source).toContain("label: 'Assessments: not loaded'");
  });

  /*
   * And it must not SHOUT it either. Red is the alarm, and nothing has been
   * observed to be wrong.
   *
   * Sliced AFTER each label rather than over the whole file: the doc comments
   * here quote the old tone to explain why it was wrong, and a test that
   * cannot tell code from prose about code fails on its own rationale. Which
   * it did, once.
   */
  it('does not colour an unloaded header as a fault', async () => {
    const source = await read('components/DashboardShell.tsx');

    for (const label of [
      "label: 'Market: not loaded'",
      "label: 'Research: not loaded'",
      "label: 'Assessments: not loaded'",
    ]) {
      const at = source.indexOf(label);
      // The label exists. Otherwise the tone assertions are vacuous.
      expect(at, label + ' missing').toBeGreaterThan(-1);
      const body = source.slice(at, at + 220);
      expect(body, label + ' is coloured as a fault').not.toContain("tone: 'neg'");
      expect(body, label + ' has no tone').toContain("tone: 'dim'");
    }
  });

  /*
   * AN EMPTINESS ASSERTION, NOT A ROLL-CALL.
   *
   * The previous version listed the five known `OFFLINE_` constants and
   * asserted the set matched. That proved they had been ENUMERATED, not that
   * any of them was HONEST — two were asserting faults from no observation
   * while it stayed green, twice.
   *
   * **A test asserting there are NO placeholder constants cannot silently pass
   * a new lie; one asserting there are exactly the known five always can.** So
   * the nullable fix does not merely repair the constants, it removes the
   * category the test had to police.
   *
   * `OFFLINE_HEALTH` and its view survive deliberately: they are a MarketFeedHealth
   * and a MarketHealthView, both of which now say "not loaded" rather than
   * naming a fault, and neither fabricates a count or a market state.
   */
  it('fabricates no discovery state before the first payload', async () => {
    const source = await read('components/DashboardShell.tsx');

    // The extractor can see. Otherwise the assertion below is vacuous.
    expect(source).toContain('const OFFLINE_HEALTH');

    expect(source).not.toContain('const OFFLINE_DISCOVERY');
    expect(source).toContain('market.snapshot?.discovery ?? null');
  });

  /*
   * The absence must reach the READERS, not be defaulted at the boundary. A
   * component that fills in a phase or a count of its own would rebuild the
   * same lie one layer down.
   */
  it('passes the absence through to every consumer', async () => {
    for (const file of [
      'components/DashboardHeader.tsx',
      'components/MarketStatus.tsx',
      'components/DiscoveryBoard.tsx',
    ]) {
      const source = await read(file);
      expect(source, `${file} does not accept an absent discovery`).toContain(
        'discovery: DiscoveryState | null',
      );
    }
  });

  /*
   * Zero is a MEASUREMENT. "0 eligible · 0 tracked" was a measurement stated
   * from no measurement, and it is the most confident-looking null there is.
   */
  it('states a count or nothing, never a zero it did not measure', async () => {
    const source = await read('components/DiscoveryBoard.tsx');
    expect(source).toContain("'counts not loaded'");
    // The count may only appear inside the guarded branch.
    const at = source.indexOf('eligibleCount');
    expect(at).toBeGreaterThan(-1);
    expect(source.slice(Math.max(0, at - 120), at)).toContain('discovery');
  });

  /*
   * Not-loaded outranks every other branch. `marketOffline` is itself derived
   * from a placeholder in that state, which is how "Market feed is not running"
   * reached a demonstrably healthy desk.
   */
  it('claims nothing about the feed before anything has loaded', async () => {
    const source = await read('components/DiscoveryBoard.tsx');
    // The string LITERALS, not the comments that quote them — my first version
    // measured its own rationale and failed on it.
    // The CONDITION, not just the order. A first version asserted only that the
    // strings appeared in order, and passed when the branch was made
    // unreachable -- the literal was still there, just never reached.
    expect(source).toContain('{discovery === null');

    // The string LITERALS, not the comments that quote them -- my first version
    // measured its own rationale and failed on it.
    const notLoaded = source.indexOf("'Waiting for the first market payload.'");
    const feedDown = source.indexOf("'Market feed is not running.");
    expect(notLoaded).toBeGreaterThan(-1);
    expect(feedDown).toBeGreaterThan(-1);
    expect(notLoaded).toBeLessThan(feedDown);
  });

  /*
   * NORMAL IS RELATIVE TO THE CLOCK, and the first version of this test pinned
   * the bug that fact caused.
   *
   * It asserted `state === 'LIVE' ? null` — one literal — which made every
   * other state abnormal by definition. At 02:04 ET the header therefore read
   * "MARKET: ALPACA SIP — CLOSED", the desk announcing in permanent space that
   * the market is shut in the middle of the night, beside a session phase
   * already saying "Closed".
   *
   * The live check that passed only exercised the true positive: it confirmed
   * an abnormal state renders words, never that "abnormal" was defined
   * correctly. Both halves are asserted below.
   */
  it('derives nominal from the session rather than from one literal', async () => {
    const source = await read('components/MarketStatus.tsx');
    expect(source).toContain('isMarketDataExpected(discovery.sessionPhase)');
    expect(source).toContain('marketHealth.state === nominalState');
    // The literal that made closed-at-2am abnormal must not come back.
    expect(source).not.toContain("marketHealth.state === 'LIVE' ? null");
  });

  /*
   * The mapping itself, over every phase — the half a single-state check
   * cannot reach. Imported from the engine rather than restated, so the
   * component and this test cannot disagree with the rest of the desk.
   */
  it('expects a live feed only while prints are due', async () => {
    const { isMarketDataExpected } = await import('@/lib/market/session');
    const nominal = (phase: Parameters<typeof isMarketDataExpected>[0]) =>
      isMarketDataExpected(phase) ? 'LIVE' : 'IDLE';

    // In session: LIVE is silent, and CLOSED is a real failure that speaks.
    expect(nominal('PREMARKET')).toBe('LIVE');
    expect(nominal('RTH')).toBe('LIVE');
    expect(nominal('AFTER_HOURS')).toBe('LIVE');

    // Out of session: IDLE is silent. This is the 2am case that regressed.
    expect(nominal('CLOSED')).toBe('IDLE');
    expect(nominal('POST_MARKET')).toBe('IDLE');
    expect(nominal('NEXT_DAY_PREP')).toBe('IDLE');
  });

  /*
   * The audit changed two components and never enumerated the header's
   * children, so a THIRD indicator survived it and was the one still on the
   * trader's screen. Its healthy text is a pure constant: the provider does not
   * change and "current" is the state it holds all day.
   */
  it('shows no Sheet freshness label at all (Sheet switch-off 3e)', async () => {
    const source = await read('components/DataFreshness.tsx');
    expect(source).toContain("if (meta.provider !== 'mock') return null;");
    expect(source).not.toContain("'Research: Google Sheet");
    expect(source).not.toContain('>Sheet sync<');
    expect(source).not.toContain('Google Sheet research is current');
  });

  it('hides the research label in its nominal IDLE state', async () => {
    const source = await read('components/ResearchEngineStatus.tsx');
    expect(source).toContain("health.state === 'IDLE' ? null : health.label");
  });

  /*
   * Hidden, not discarded. The feed name and the engine state stay reachable on
   * hover — a constant is not worth permanent space, which is different from
   * not being worth having.
   */
  it('keeps the hidden label available on hover', async () => {
    for (const [file, expr] of [
      ['components/MarketStatus.tsx', 'marketHealth.label'],
      ['components/ResearchEngineStatus.tsx', 'health.label'],
    ] as const) {
      const source = await read(file);
      // MarketStatus may carry the feed banner's words instead while the board is not updating;
      // the normal-state label stays on hover.
      expect(source).toMatch(new RegExp(`title=\{(banner \\? banner\\.text : )?${expr.replace('.', '\\.')} +`));
    }
  });
});
