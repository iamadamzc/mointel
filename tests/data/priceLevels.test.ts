import { describe, expect, it } from 'vitest';

import {
  buildLevelMap,
  clusterLevels,
  deriveRoundLevels,
  levelTypeLabel,
  parseKeyLevels,
  parsePrices,
  toCompactRow,
  type PriceLevel,
} from '@/lib/data/priceLevels';
import type { CycleLevels } from '@/lib/data/cycleLevels';

/* ------------------------------------------------------------------ parsing */

describe('level parsing', () => {
  it('reads prices out of a sheet cell', () => {
    expect(parsePrices('$6.22/$6.50/$7.00')).toEqual([6.22, 6.5, 7]);
    expect(parsePrices('6.22, 6.50')).toEqual([6.22, 6.5]);
    expect(parsePrices('')).toEqual([]);
  });

  it('assigns meaning from the keyword, not from position', () => {
    const parsed = parseKeyLevels('$6.22/$6.50/$7.00 resistance; $5.00/$4.92 support');
    expect(parsed.resistance).toEqual([6.22, 6.5, 7]);
    expect(parsed.support).toEqual([5, 4.92]);
    expect(parsed.unknown).toEqual([]);
  });

  it('keeps a price whose meaning the source never stated', () => {
    // Numeric and real, but unlabelled. Guessing would invent meaning.
    const parsed = parseKeyLevels('$4.10 / $4.40');
    expect(parsed.unknown).toEqual([4.1, 4.4]);
    expect(parsed.resistance).toEqual([]);
  });

  it('records prose it could not turn into levels rather than dropping it', () => {
    const map = buildLevelMap({
      currentPrice: 5,
      keyLevels: 'watching the open, no defined levels',
      includeRoundLevels: false,
    });
    expect(map.unparsed).toHaveLength(1);
    expect(map.unparsed[0]).toContain('watching the open');
  });
});

/* --------------------------------------------------------------- derivation */

describe('round-number levels', () => {
  it('derives the nearest half-dollar either side below $10', () => {
    expect(deriveRoundLevels(6.22)).toEqual([
      { price: 6.5, type: 'HALF_DOLLAR' },
      { price: 6, type: 'WHOLE_DOLLAR' },
    ]);
  });

  it('uses whole dollars above $10', () => {
    expect(deriveRoundLevels(14.3)).toEqual([
      { price: 15, type: 'WHOLE_DOLLAR' },
      { price: 14, type: 'WHOLE_DOLLAR' },
    ]);
  });

  it('does not emit a level equal to current price', () => {
    expect(deriveRoundLevels(6.5).some((level) => level.price === 6.5)).toBe(false);
  });

  it('returns nothing for an unusable price', () => {
    expect(deriveRoundLevels(0)).toEqual([]);
  });
});

/* ---------------------------------------------------------------- grouping */

describe('above and below grouping', () => {
  const map = buildLevelMap({
    currentPrice: 6.22,
    sessionHigh: 6.48,
    sessionLow: 5.9,
    keyLevels: '$6.75/$7.00 resistance; $6.00/$5.50 support',
    includeRoundLevels: false,
  });

  it('splits levels either side of current price', () => {
    const abovePrices = map.above.flatMap((z) => z.members.map((m) => m.price));
    const belowPrices = map.below.flatMap((z) => z.members.map((m) => m.price));

    expect(abovePrices).toContain(6.48);
    expect(abovePrices).toContain(7);
    expect(belowPrices).toContain(6);
    expect(belowPrices).toContain(5.5);
    expect(abovePrices.every((p) => p > 6.22)).toBe(true);
    expect(belowPrices.every((p) => p < 6.22)).toBe(true);
  });

  it('orders each side nearest-to-farthest', () => {
    const aboveDistances = map.above.map((z) => z.distanceAbs ?? 0);
    const belowDistances = map.below.map((z) => z.distanceAbs ?? 0);
    expect([...aboveDistances].sort((a, b) => a - b)).toEqual(aboveDistances);
    expect([...belowDistances].sort((a, b) => a - b)).toEqual(belowDistances);
  });

  it('measures distance in dollars and percent', () => {
    const nearestAbove = map.above[0];
    expect(nearestAbove.nearestPrice).toBe(6.48);
    expect(nearestAbove.distanceAbs).toBeCloseTo(0.26, 4);
    expect(nearestAbove.distancePct).toBeCloseTo(4.18, 1);
  });

  it('treats a level sitting on current price as AT_PRICE', () => {
    const at = buildLevelMap({
      currentPrice: 3.9,
      keyLevels: '$3.90/$4.00 resistance',
      includeRoundLevels: false,
    });
    expect(at.atPrice.map((l) => l.price)).toContain(3.9);
    expect(at.above.flatMap((z) => z.members.map((m) => m.price))).not.toContain(3.9);
  });

  it('leaves direction unknown when price is unavailable', () => {
    const map = buildLevelMap({ currentPrice: null, keyLevels: '$5.00 support' });
    expect(map.above).toEqual([]);
    expect(map.below).toEqual([]);
    expect(map.currentPrice).toBeNull();
  });
});

/* -------------------------------------------------------------- clustering */

function level(price: number, type: PriceLevel['type'], priority: number): PriceLevel {
  return {
    price,
    label: levelTypeLabel(type),
    type,
    direction: 'ABOVE',
    source: 'SESSION',
    priority,
    note: null,
    distanceAbs: Math.abs(price - 6.22),
    distancePct: (Math.abs(price - 6.22) / 6.22) * 100,
    clustered: false,
    clusterId: null,
    relationshipToPrice: 'UNKNOWN',
    stateLabel: null,
    sourceDate: null,
  };
}

describe('clustering', () => {
  it('groups levels that are effectively the same zone', () => {
    const zones = clusterLevels(
      [level(6.48, 'HOD', 1), level(6.5, 'HALF_DOLLAR', 9), level(6.5, 'RESISTANCE', 3)],
      'ABOVE',
    );

    expect(zones).toHaveLength(1);
    expect(zones[0].low).toBe(6.48);
    expect(zones[0].high).toBe(6.5);
    // The zone takes its name from the most meaningful member.
    expect(zones[0].dominantType).toBe('HOD');
    expect(zones[0].label).toContain('6.48–6.50');
    expect(zones[0].members.every((m) => m.clustered)).toBe(true);
  });

  it('does not merge levels that are meaningfully separated', () => {
    const zones = clusterLevels([level(6.5, 'RESISTANCE', 3), level(7, 'RESISTANCE', 3)], 'ABOVE');
    expect(zones).toHaveLength(2);
    expect(zones.every((z) => z.members.every((m) => !m.clustered))).toBe(true);
  });

  it('keeps sub-dollar levels apart when cents are a large percentage', () => {
    /*
     * Three cents is one zone at $6 and a 6% gap at $0.50. Clustering on cents
     * alone would merge two genuinely distinct levels on a low-priced name.
     */
    const zones = clusterLevels([level(0.5, 'SUPPORT', 3), level(0.53, 'SUPPORT', 3)], 'BELOW');
    expect(zones).toHaveLength(2);
  });

  it('reports the nearest edge of a zone, not its midpoint', () => {
    const above = clusterLevels([level(6.48, 'HOD', 1), level(6.5, 'HALF_DOLLAR', 9)], 'ABOVE');
    expect(above[0].nearestPrice).toBe(6.48);

    const below = clusterLevels([level(5.98, 'SUPPORT', 3), level(6.0, 'WHOLE_DOLLAR', 8)], 'BELOW');
    expect(below[0].nearestPrice).toBe(6.0);
  });
});

/* ------------------------------------------------------ semantic preservation */

describe('historical resistance semantics', () => {
  const cycleLevels = {
    currentCycleHigh: null,
    historicalResistance: {
      raw: '$10.59 (52-week)',
      value: 10.59,
      kind: 'HISTORICAL',
      field: 'runHigh',
      reason: '52-week pattern',
      label: '52-week high',
    },
    unverifiedRunHigh: null,
    givebackFromCurrentCycleHighPct: null,
    sheetReportedFlush: null,
    notes: [],
  } as unknown as CycleLevels;

  it('keeps a 52-week high as its own type, not as session resistance', () => {
    const map = buildLevelMap({
      currentPrice: 5.8,
      sessionHigh: 6.1,
      cycleLevels,
      includeRoundLevels: false,
    });

    const historical = map.above
      .flatMap((z) => z.members)
      .find((m) => m.price === 10.59);
    expect(historical?.type).toBe('HISTORICAL_RESISTANCE');

    // The session high remains a distinct, separately typed level.
    const hod = map.above.flatMap((z) => z.members).find((m) => m.price === 6.1);
    expect(hod?.type).toBe('HOD');
  });

  it('ranks a historical level below live session levels', () => {
    const map = buildLevelMap({
      currentPrice: 5.8,
      sessionHigh: 6.1,
      cycleLevels,
      includeRoundLevels: false,
    });
    // Nearest-first ordering puts the live level first regardless of priority,
    // and the historical level is far above, so it must not lead.
    expect(map.above[0].dominantType).toBe('HOD');
  });

  it('distinguishes a prior-session close from a current-session close', () => {
    const prior = buildLevelMap({
      currentPrice: 6,
      referenceRthClose: 5.5,
      referenceBasis: 'PRIOR_SESSION',
      includeRoundLevels: false,
    });
    expect(prior.below[0].dominantType).toBe('PRIOR_DAY_CLOSE');

    const current = buildLevelMap({
      currentPrice: 6,
      referenceRthClose: 5.5,
      referenceBasis: 'CURRENT_SESSION',
      includeRoundLevels: false,
    });
    // After the close it is the current day's close, a different fact.
    expect(current.below[0].dominantType).toBe('OTHER');
  });
});

/* ------------------------------------------------------- price-centred view */

describe('current price context', () => {
  it('notes when price sits between two nearby levels', () => {
    const map = buildLevelMap({
      currentPrice: 6.22,
      sessionHigh: 6.5,
      keyLevels: '$6.00 support',
      includeRoundLevels: false,
    });
    expect(map.betweenNote).toContain('6.00');
    expect(map.betweenNote).toContain('6.50');
  });

  it('omits the between note when one side is empty', () => {
    const map = buildLevelMap({
      currentPrice: 6.22,
      sessionHigh: 6.5,
      includeRoundLevels: false,
    });
    expect(map.betweenNote).toBeNull();
  });

  it('carries the spread through for the price row', () => {
    const map = buildLevelMap({ currentPrice: 6.22, spread: 0.02, spreadPct: 0.32 });
    expect(map.spread).toBe(0.02);
    expect(map.spreadPct).toBe(0.32);
  });
});

/* ------------------------------------------------------------- air pockets */

describe('air pocket notes', () => {
  it('reports open space below as spacing, not as risk', () => {
    const map = buildLevelMap({
      currentPrice: 6.22,
      sessionHigh: 6.3,
      keyLevels: '$5.00 support',
      includeRoundLevels: false,
    });
    expect(map.airPocketBelow).toContain('Air pocket below to 5.00');
    // Deliberately not a prediction.
    expect(map.airPocketBelow).not.toMatch(/flush|risk|likely|will/i);
  });

  it('reports the absence of mapped levels on a side', () => {
    const map = buildLevelMap({
      currentPrice: 6.22,
      keyLevels: '$5.00 support',
      includeRoundLevels: false,
    });
    expect(map.airPocketAbove).toContain('No mapped resistance');
  });

  it('stays quiet when the next level is close', () => {
    const map = buildLevelMap({
      currentPrice: 6.22,
      sessionHigh: 6.3,
      sessionLow: 6.1,
      includeRoundLevels: false,
    });
    expect(map.airPocketAbove).toBeNull();
    expect(map.airPocketBelow).toBeNull();
  });
});

/* ------------------------------------------------------------------ fallback */

describe('empty state', () => {
  it('reports empty rather than pretending to have levels', () => {
    const map = buildLevelMap({ currentPrice: null, includeRoundLevels: false });
    expect(map.empty).toBe(true);
    expect(toCompactRow(map).empty).toBe(true);
  });

  it('still produces a structured map from session data alone', () => {
    const map = buildLevelMap({
      currentPrice: 6.22,
      sessionHigh: 6.5,
      sessionLow: 6,
      includeRoundLevels: false,
    });
    expect(map.empty).toBe(false);
    expect(map.above[0].dominantType).toBe('HOD');
    expect(map.below[0].dominantType).toBe('LOD');
  });
});

/* -------------------------------------------------------- compact row model */

describe('compact board row', () => {
  const map = buildLevelMap({
    currentPrice: 6.22,
    spreadPct: 0.32,
    sessionHigh: 6.48,
    keyLevels: '$6.75/$7.00 resistance; $6.00/$5.88 support',
    includeRoundLevels: false,
  });

  it('gives the nearest levels each side with signed distances', () => {
    const row = toCompactRow(map);
    expect(row.nextUp[0].price).toBe('6.48');
    expect(row.nextUp[0].type).toBe('HOD');
    expect(row.nextUp[0].distance).toBe('+0.26');

    expect(row.nextDown[0].price).toBe('6.00');
    expect(row.nextDown[0].distance).toBe('-0.22');
  });

  it('carries no current-price row', () => {
    /*
     * The board has its own Price and Spread columns. A NOW row inside the
     * level cell restated both and took a third of the cell to do it, so the
     * model deliberately has no field for it.
     */
    const row = toCompactRow(map);
    expect(row).not.toHaveProperty('now');
    expect(row).not.toHaveProperty('spreadPct');
    expect(Object.keys(row).sort()).toEqual(['atPriceNote', 'empty', 'nextDown', 'nextUp']);
  });

  it('notes price sitting ON a level, which the Price column cannot say', () => {
    const onLevel = buildLevelMap({
      currentPrice: 6.22,
      keyLevels: '$6.22 resistance',
      includeRoundLevels: false,
    });
    expect(toCompactRow(onLevel).atPriceNote).toBe('at resistance');

    // And says nothing when price is simply between levels.
    expect(toCompactRow(map).atPriceNote).toBeNull();
  });

  it('caps how many levels reach the board', () => {
    // The board answers "what is next"; the drawer holds the full map.
    const row = toCompactRow(map, 2);
    expect(row.nextUp.length).toBeLessThanOrEqual(2);
    expect(row.nextDown.length).toBeLessThanOrEqual(2);
  });

  it('shows a zone as a range', () => {
    const zoned = buildLevelMap({
      currentPrice: 6.22,
      sessionHigh: 6.48,
      keyLevels: '$6.50 resistance',
      includeRoundLevels: false,
    });
    const row = toCompactRow(zoned);
    expect(row.nextUp[0].isZone).toBe(true);
    expect(row.nextUp[0].price).toBe('6.48–6.50');
  });
});

/* ------------------------------------------------- relationship overlay */

describe('relationship to current price', () => {
  it('marks a support that price has fallen beneath as LOST SUPPORT', () => {
    // The live case: UCL's stated supports all sit above a fallen price.
    const map = buildLevelMap({
      currentPrice: 0.709,
      keyLevels: '$0.90/$0.85/$0.73 support',
      includeRoundLevels: false,
    });

    const above = map.above.flatMap((z) => z.members);
    expect(above.length).toBeGreaterThan(0);

    for (const level of above) {
      // The type is what the source said and must not be rewritten.
      expect(level.type).toBe('SUPPORT');
      expect(level.relationshipToPrice).toBe('LOST_SUPPORT');
      expect(level.stateLabel).toBe('LOST SUPPORT');
    }
  });

  it('marks a resistance that price has risen through as PRICE ABOVE', () => {
    const map = buildLevelMap({
      currentPrice: 7.4,
      keyLevels: '$6.22/$6.50 resistance',
      includeRoundLevels: false,
    });

    const below = map.below.flatMap((z) => z.members);
    expect(below.length).toBeGreaterThan(0);

    for (const level of below) {
      expect(level.type).toBe('RESISTANCE');
      expect(level.relationshipToPrice).toBe('PRICE_ABOVE');
      expect(level.stateLabel).toBe('PRICE ABOVE');
    }
  });

  it('leaves the ordinary orientations unlabelled', () => {
    const map = buildLevelMap({
      currentPrice: 6.22,
      keyLevels: '$6.75 resistance; $5.50 support',
      includeRoundLevels: false,
    });

    const resistance = map.above.flatMap((z) => z.members)[0];
    const support = map.below.flatMap((z) => z.members)[0];

    expect(resistance.relationshipToPrice).toBe('RESISTANCE_ABOVE');
    expect(resistance.stateLabel).toBeNull();
    expect(support.relationshipToPrice).toBe('SUPPORT_BELOW');
    expect(support.stateLabel).toBeNull();
  });

  it('gives no directional verdict to a level that asserts no role', () => {
    // A round number, a session extreme and a close make no claim about
    // holding, so calling one "lost" would be an invention.
    const map = buildLevelMap({
      currentPrice: 6.22,
      sessionHigh: 6.5,
      sessionLow: 6,
      referenceRthClose: 5.8,
      referenceBasis: 'PRIOR_SESSION',
    });

    for (const level of [...map.above, ...map.below].flatMap((z) => z.members)) {
      if (level.type === 'SUPPORT' || level.type === 'RESISTANCE') continue;
      expect(level.relationshipToPrice).toBe('NEUTRAL');
      expect(level.stateLabel).toBeNull();
    }
  });

  it('reports a role level sitting on price as AT LEVEL', () => {
    const map = buildLevelMap({
      currentPrice: 3.9,
      keyLevels: '$3.90 resistance',
      includeRoundLevels: false,
    });
    expect(map.atPrice[0].relationshipToPrice).toBe('AT_LEVEL');
    expect(map.atPrice[0].stateLabel).toBe('AT LEVEL');
  });

  it('never claims a level was broken, tested or reclaimed', () => {
    const map = buildLevelMap({
      currentPrice: 0.709,
      keyLevels: '$0.90 support',
      includeRoundLevels: false,
    });
    const serialised = JSON.stringify(map);
    // Current price establishes position, not history.
    expect(serialised).not.toMatch(/broken|cleared|reclaimed|tested|defended|failed/i);
  });

  it('surfaces the state through the compact board row', () => {
    const map = buildLevelMap({
      currentPrice: 0.709,
      keyLevels: '$0.73 support',
      includeRoundLevels: false,
    });
    expect(toCompactRow(map).nextUp[0].stateLabel).toBe('LOST SUPPORT');
  });
});

/* -------------------------------------------------------- drawer ladder */

describe('drawer level ladder', () => {
  /*
   * The compact board cell lost its NOW row; the drawer ladder did not change.
   * It still receives the full map, centred on current price, with everything
   * the compact row drops for space.
   */
  const map = buildLevelMap({
    currentPrice: 6.22,
    spread: 0.02,
    spreadPct: 0.32,
    sessionHigh: 6.48,
    sessionLow: 5.7,
    keyLevels: '$6.75/$7.00 resistance; $6.00/$5.88 support',
    includeRoundLevels: true,
  });

  it('still centres on current price', () => {
    expect(map.currentPrice).toBe(6.22);
    expect(map.spreadPct).toBe(0.32);
  });

  it('still returns every zone, not just the two the board shows', () => {
    expect(map.above.length).toBeGreaterThan(2);
    expect(map.below.length).toBeGreaterThan(2);

    const compact = toCompactRow(map, 2);
    expect(compact.nextUp.length).toBe(2);
    expect(map.above.length).toBeGreaterThan(compact.nextUp.length);
  });

  it('still orders each side nearest-first for the price axis', () => {
    const above = map.above.map((zone) => zone.distanceAbs ?? 0);
    const below = map.below.map((zone) => zone.distanceAbs ?? 0);
    expect([...above].sort((a, b) => a - b)).toEqual(above);
    expect([...below].sort((a, b) => a - b)).toEqual(below);
  });

  it('still reports the between note and the level types', () => {
    expect(map.betweenNote).toContain('Inside');
    expect(map.above.some((zone) => zone.dominantType === 'HOD')).toBe(true);
    expect(map.below.some((zone) => zone.dominantType === 'SUPPORT')).toBe(true);
  });
});

/* ----------------------------------------------- board selection weighting */

describe('board selection weighting', () => {
  it('does not let a derived round number displace a nearby HOD', () => {
    /*
     * Regression on the live output: proximity alone put "6.00 whole $" ahead of
     * research resistance, and a whole dollar is always within a few percent, so
     * it would have taken a slot on almost every row.
     */
    const map = buildLevelMap({
      currentPrice: 5.95,
      // HOD marginally farther than the derived whole dollar.
      sessionHigh: 6.02,
      includeRoundLevels: true,
    });

    const row = toCompactRow(map, 1);
    expect(row.nextUp).toHaveLength(1);
    expect(row.nextUp[0].type).toBe('HOD');
  });

  it('keeps research resistance ahead of a marginally nearer half-dollar', () => {
    const map = buildLevelMap({
      currentPrice: 6.4,
      keyLevels: '$6.55 resistance',
      includeRoundLevels: true,
    });
    expect(toCompactRow(map, 1).nextUp[0].type).toBe('resistance');
  });

  it('still admits a round number that is dramatically nearer', () => {
    // Weighting is a preference, not a ban: a whole dollar two cents away is
    // genuinely the next thing price meets.
    const map = buildLevelMap({
      currentPrice: 5.98,
      sessionHigh: 9.5,
      includeRoundLevels: true,
    });
    const row = toCompactRow(map, 2);
    expect(row.nextUp.map((l) => l.type)).toContain('whole $');
  });

  it('displays the selected levels nearest-first regardless of weighting', () => {
    const map = buildLevelMap({
      currentPrice: 6.0,
      sessionHigh: 7.5,
      keyLevels: '$6.30 resistance',
      includeRoundLevels: true,
    });
    const row = toCompactRow(map, 3);
    const distances = row.nextUp.map((l) => Math.abs(Number(l.distance)));
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
  });
});
