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

  it('hides the market label in its nominal LIVE state', async () => {
    const source = await read('components/MarketStatus.tsx');
    expect(source).toContain("marketHealth.state === 'LIVE' ? null : marketHealth.label");
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
