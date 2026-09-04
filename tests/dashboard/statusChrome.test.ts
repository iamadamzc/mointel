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
   * ASSERTED OVER THE PATTERN, NOT OVER THE THREE I HAPPEN TO KNOW.
   *
   * The first fix said "both twins" and there were five OFFLINE_ constants in
   * the file; the third stayed red on the live desk. Naming the constants I
   * remember reproduces exactly the enumeration failure that caused it, so this
   * counts them and fails when a new one appears unreviewed.
   *
   * The instrument is proved first: if the pattern matched nothing, an
   * expectation about what it found would pass vacuously.
   */
  it('has exactly the five placeholder constants that have been reviewed', async () => {
    const source = await read('components/DashboardShell.tsx');
    const found = [...source.matchAll(/^const (OFFLINE_[A-Z_]+)/gm)].map((m) => m[1]);

    // The extractor can see. Without this the assertion below is vacuous.
    expect(found.length).toBeGreaterThan(0);

    expect(found.sort()).toEqual([
      'OFFLINE_ASSESSMENTS',
      'OFFLINE_DISCOVERY',
      'OFFLINE_HEALTH',
      'OFFLINE_HEALTH_VIEW',
      'OFFLINE_RESEARCH',
    ]);
  });


  /*
   * And it must not SHOUT it either. Red is the alarm; nothing has been observed
   * to be wrong, so the placeholder is dim.
   */

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
  it('hides the sheet freshness label in its healthy state', async () => {
    const source = await read('components/DataFreshness.tsx');
    expect(source).toContain("{degraded ? 'Research: Google Sheet — Stale' : null}");
    expect(source).not.toMatch(/Research: Google Sheet — \{degraded/);
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
      expect(source).toMatch(new RegExp(`title=\{${expr.replace('.', '\.')} \+`));
    }
  });
});
