/**
 * Price level normalisation and the level-map view model.
 *
 * The desk previously rendered levels as prose — `"$6.22/$6.50/$7.00
 * resistance; $5.00/$4.92 support"` — which forces a trader to read a sentence
 * and do arithmetic to answer "what is above me and how far". This module turns
 * whatever level facts exist into a structured ladder centred on current price,
 * so the UI receives data rather than text it has to parse.
 *
 * All parsing and ordering happens here, not in a component.
 *
 * The governing rule is the one the rest of the codebase already follows: a
 * level type is only asserted when the source supports it. A price with no
 * stated meaning is OTHER, never a guessed HOD or VWAP.
 */

import type { CycleLevels } from './cycleLevels';

/* ------------------------------------------------------------------- types */

/**
 * Trader-meaningful level categories.
 *
 * Deliberately closed: a source that does not identify its level yields OTHER
 * rather than a plausible-sounding invention.
 */
export type PriceLevelType =
  | 'HOD'
  | 'LOD'
  | 'PM_HIGH'
  | 'PM_LOW'
  | 'RTH_HIGH'
  | 'AH_HIGH'
  | 'PRIOR_DAY_HIGH'
  | 'PRIOR_DAY_LOW'
  | 'PRIOR_DAY_CLOSE'
  | 'VWAP'
  | 'WHOLE_DOLLAR'
  | 'HALF_DOLLAR'
  | 'RESISTANCE'
  | 'SUPPORT'
  | 'RECLAIM'
  | 'BREAKOUT_TRIGGER'
  | 'HISTORICAL_RESISTANCE'
  | 'BLUE_SKY'
  | 'OTHER';

export type LevelDirection = 'ABOVE' | 'BELOW' | 'AT_PRICE' | 'UNKNOWN';

/**
 * How current price stands relative to a level's asserted role.
 *
 * Stored alongside the type, never instead of it. A support that price has
 * fallen through is still a SUPPORT — that is what the source said — and
 * relabelling it RESISTANCE would invent a claim nobody made. This overlay
 * records only what current price establishes: it is above the level or below
 * it. Nothing here infers that a level was tested, defended, broken or
 * reclaimed, because a single price reading cannot show any of that.
 */
export type LevelRelationship =
  /** Resistance-role level above price: the ordinary case. */
  | 'RESISTANCE_ABOVE'
  /** Support-role level below price: the ordinary case. */
  | 'SUPPORT_BELOW'
  /** Support-role level that price is now beneath. */
  | 'LOST_SUPPORT'
  /** Resistance-role level that price is now above. */
  | 'PRICE_ABOVE'
  /** Price is sitting on the level. */
  | 'AT_LEVEL'
  /** The type asserts no directional role, e.g. a round number or VWAP. */
  | 'NEUTRAL'
  | 'UNKNOWN';

/** Where a level came from, so provenance survives into the UI. */
export type LevelSource =
  | 'SESSION'
  | 'REFERENCE_CLOSE'
  | 'SHEET_KEY_LEVELS'
  | 'SHEET_DAILY_RESISTANCE'
  | 'SHEET_DAILY_SUPPORT'
  | 'RESEARCH_HISTORICAL'
  | 'SESSION_VWAP'
  | 'DAILY_HISTORY'
  | 'DERIVED_ROUND';

export interface PriceLevel {
  price: number;
  /** Short display label, e.g. "HOD" or "$6.50". */
  label: string;
  type: PriceLevelType;
  direction: LevelDirection;
  source: LevelSource;
  /** Lower sorts first within a direction group. */
  priority: number;
  note: string | null;
  /** Absolute distance from current price; null when price is unknown. */
  distanceAbs: number | null;
  distancePct: number | null;
  clustered: boolean;
  clusterId: string | null;
  /** Where price stands relative to this level's role. Never mutates `type`. */
  relationshipToPrice: LevelRelationship;
  /** Short tag for display, e.g. "LOST SUPPORT". Null when ordinary. */
  stateLabel: string | null;
  /** The source's own date, YYYY-MM-DD, for a level from a dated source (the Sheet RESEARCH row); else null. */
  sourceDate: string | null;
}

/** A group of levels close enough to act as one zone. */
export interface LevelZone {
  /** Stable id shared by the member levels. */
  clusterId: string;
  low: number;
  high: number;
  direction: LevelDirection;
  members: PriceLevel[];
  /** Nearest edge of the zone to current price. */
  nearestPrice: number;
  distanceAbs: number | null;
  distancePct: number | null;
  /** Highest-priority type in the zone, used for the zone label. */
  dominantType: PriceLevelType;
  /** Relationship of the zone's dominant level. */
  relationshipToPrice: LevelRelationship;
  stateLabel: string | null;
  /** The members' source date when every member carries the same one; null otherwise (members carry their own). */
  sourceDate: string | null;
  label: string;
}

export interface LevelMap {
  currentPrice: number | null;
  spread: number | null;
  spreadPct: number | null;
  /** Nearest-first. */
  above: LevelZone[];
  below: LevelZone[];
  /** Levels sitting effectively at current price. */
  atPrice: PriceLevel[];
  /** "Inside 6.00 support / 6.50 HOD", when both sides have a nearby level. */
  betweenNote: string | null;
  /** Set when the nearest level in a direction is unusually far away. */
  airPocketAbove: string | null;
  airPocketBelow: string | null;
  /** True when nothing usable could be sourced. */
  empty: boolean;
  /** Level facts that were present but unusable, for honest degradation. */
  unparsed: string[];
}

/* --------------------------------------------------------------- constants */

/**
 * Clustering threshold.
 *
 * Both an absolute floor and a percentage, because cents mean different things
 * at $0.50 and at $50. Two levels merge only when they are close on both
 * measures, so genuinely distinct levels stay distinct.
 */
export const CLUSTER_ABS_CENTS = 0.03;
export const CLUSTER_PCT = 0.6;

/** Distance beyond which the next level counts as open air. */
export const AIR_POCKET_PCT = 8;

/** How close to current price counts as "at" it. */
const AT_PRICE_PCT = 0.15;

/**
 * Display priority. Lower wins.
 *
 * Session extremes and explicit research levels lead because they are the
 * levels a trader is actually watching; derived round numbers come last because
 * they are always available and would otherwise crowd out real information.
 */
const TYPE_PRIORITY: Record<PriceLevelType, number> = {
  HOD: 1,
  LOD: 1,
  BREAKOUT_TRIGGER: 2,
  RESISTANCE: 3,
  SUPPORT: 3,
  RECLAIM: 3,
  PM_HIGH: 4,
  PM_LOW: 4,
  RTH_HIGH: 4,
  AH_HIGH: 4,
  VWAP: 5,
  PRIOR_DAY_HIGH: 6,
  PRIOR_DAY_LOW: 6,
  PRIOR_DAY_CLOSE: 6,
  HISTORICAL_RESISTANCE: 7,
  WHOLE_DOLLAR: 8,
  HALF_DOLLAR: 9,
  BLUE_SKY: 10,
  OTHER: 11,
};

const TYPE_LABEL: Record<PriceLevelType, string> = {
  HOD: 'HOD',
  LOD: 'LOD',
  PM_HIGH: 'PM high',
  PM_LOW: 'PM low',
  RTH_HIGH: 'RTH high',
  AH_HIGH: 'AH high',
  PRIOR_DAY_HIGH: 'PD high',
  PRIOR_DAY_LOW: 'PD low',
  PRIOR_DAY_CLOSE: 'PD close',
  VWAP: 'VWAP',
  WHOLE_DOLLAR: 'whole $',
  HALF_DOLLAR: 'half $',
  RESISTANCE: 'resistance',
  SUPPORT: 'support',
  RECLAIM: 'reclaim',
  BREAKOUT_TRIGGER: 'trigger',
  HISTORICAL_RESISTANCE: 'hist. resistance',
  BLUE_SKY: 'blue sky',
  OTHER: 'level',
};

export function levelTypeLabel(type: PriceLevelType): string {
  return TYPE_LABEL[type];
}

/**
 * Types whose source asserted a directional role.
 *
 * Only these get a relationship overlay. A round number, VWAP or a session
 * extreme makes no claim about holding, so declaring one "lost" would be an
 * invention rather than an observation.
 */
const SUPPORT_ROLE = new Set<PriceLevelType>(['SUPPORT', 'RECLAIM']);
const RESISTANCE_ROLE = new Set<PriceLevelType>([
  'RESISTANCE',
  'BREAKOUT_TRIGGER',
  'HISTORICAL_RESISTANCE',
]);

const RELATIONSHIP_LABEL: Partial<Record<LevelRelationship, string>> = {
  LOST_SUPPORT: 'LOST SUPPORT',
  PRICE_ABOVE: 'PRICE ABOVE',
  AT_LEVEL: 'AT LEVEL',
};

export function relationshipLabel(relationship: LevelRelationship): string | null {
  return RELATIONSHIP_LABEL[relationship] ?? null;
}

/**
 * Classifies where price stands relative to a level's asserted role.
 *
 * Purely positional: it compares two numbers. It does not claim the level was
 * tested or broken, because current price alone cannot establish either.
 */
export function relationshipFor(
  type: PriceLevelType,
  direction: LevelDirection,
): LevelRelationship {
  if (direction === 'UNKNOWN') return 'UNKNOWN';
  if (direction === 'AT_PRICE') {
    return SUPPORT_ROLE.has(type) || RESISTANCE_ROLE.has(type) ? 'AT_LEVEL' : 'NEUTRAL';
  }

  if (SUPPORT_ROLE.has(type)) {
    // A support the market is trading beneath. Still a SUPPORT by type.
    return direction === 'ABOVE' ? 'LOST_SUPPORT' : 'SUPPORT_BELOW';
  }
  if (RESISTANCE_ROLE.has(type)) {
    return direction === 'BELOW' ? 'PRICE_ABOVE' : 'RESISTANCE_ABOVE';
  }
  return 'NEUTRAL';
}

/**
 * Selection weight for the compact board row. Lower is preferred.
 *
 * Proximity alone let an automatically derived round number displace a nearby
 * HOD or research level, which is the opposite of useful: a whole dollar is
 * always available, so it would win a slot on almost every row. Weighting by
 * importance means a derived level has to be substantially nearer to earn its
 * place, while a genuinely near round number is still not suppressed outright.
 */
const SELECTION_WEIGHT: Record<PriceLevelType, number> = {
  HOD: 1,
  LOD: 1,
  BREAKOUT_TRIGGER: 1.1,
  RESISTANCE: 1.2,
  SUPPORT: 1.2,
  RECLAIM: 1.2,
  PM_HIGH: 1.3,
  PM_LOW: 1.3,
  RTH_HIGH: 1.3,
  AH_HIGH: 1.3,
  // The session average is one of the two levels a momentum trader checks
  // first, so it competes for a compact slot rather than being weighted out.
  VWAP: 1.25,
  PRIOR_DAY_HIGH: 1.7,
  PRIOR_DAY_LOW: 1.7,
  PRIOR_DAY_CLOSE: 1.7,
  HISTORICAL_RESISTANCE: 2,
  WHOLE_DOLLAR: 3,
  HALF_DOLLAR: 3.2,
  BLUE_SKY: 3.5,
  OTHER: 3.5,
};

/** Combined importance-and-proximity score. Lower sorts first. */
export function selectionScore(zone: LevelZone): number {
  const distance = zone.distancePct ?? Number.POSITIVE_INFINITY;
  return distance * (SELECTION_WEIGHT[zone.dominantType] ?? 3.5);
}

/* ----------------------------------------------------------------- parsing */

/** Prices in a sheet cell, e.g. "$6.22/$6.50/$7.00" or "6.22, 6.50". */
export function parsePrices(raw: string): number[] {
  if (!raw) return [];
  const matches = raw.match(/\$?\d+(?:\.\d+)?/g) ?? [];
  const prices: number[] = [];

  for (const match of matches) {
    const value = Number(match.replace('$', ''));
    // A bare percentage or a year is not a level; require a plausible price.
    if (!Number.isFinite(value) || value <= 0) continue;
    prices.push(value);
  }
  return prices;
}

/**
 * Splits a key-levels sentence into its resistance and support halves.
 *
 * The sheet writes `"$6.22/$6.50 resistance; $5.00/$4.92 support"`. The words
 * are what make the prices meaningful, so a half with no keyword yields OTHER
 * rather than being guessed from position.
 */
export function parseKeyLevels(raw: string): {
  resistance: number[];
  support: number[];
  unknown: number[];
} {
  const resistance: number[] = [];
  const support: number[] = [];
  const unknown: number[] = [];

  if (!raw.trim()) return { resistance, support, unknown };

  for (const segment of raw.split(/[;\n]/)) {
    const text = segment.trim();
    if (!text) continue;
    const prices = parsePrices(text);
    if (prices.length === 0) continue;

    if (/resist|break|trigger|upside|target/i.test(text)) resistance.push(...prices);
    else if (/support|reclaim|downside|floor/i.test(text)) support.push(...prices);
    else unknown.push(...prices);
  }

  return { resistance, support, unknown };
}

/* -------------------------------------------------------------- derivation */

/**
 * Round-number levels straddling current price.
 *
 * Only the nearest above and below, and only when they are not already the
 * price itself: a full ladder of dollars would drown the levels that carry
 * actual information.
 */
export function deriveRoundLevels(price: number): Array<{ price: number; type: PriceLevelType }> {
  if (!Number.isFinite(price) || price <= 0) return [];

  const out: Array<{ price: number; type: PriceLevelType }> = [];
  const step = price >= 10 ? 1 : 0.5;

  const nextUp = Math.ceil((price + 1e-9) / step) * step;
  const nextDown = Math.floor((price - 1e-9) / step) * step;

  for (const candidate of [nextUp, nextDown]) {
    if (!Number.isFinite(candidate) || candidate <= 0) continue;
    const rounded = Math.round(candidate * 100) / 100;
    if (Math.abs(rounded - price) < 1e-9) continue;
    const isWhole = Math.abs(rounded - Math.round(rounded)) < 1e-9;
    out.push({ price: rounded, type: isWhole ? 'WHOLE_DOLLAR' : 'HALF_DOLLAR' });
  }

  return out;
}

/* ------------------------------------------------------------------ inputs */

export interface LevelMapInput {
  currentPrice: number | null;
  spread?: number | null;
  spreadPct?: number | null;
  sessionHigh?: number | null;
  sessionLow?: number | null;
  /** The close percent change is measured against. */
  referenceRthClose?: number | null;
  referenceBasis?: 'PRIOR_SESSION' | 'CURRENT_SESSION' | null;
  /** Raw sheet cells. */
  keyLevels?: string | null;
  dailyResistance?: string | null;
  dailySupport?: string | null;
  /**
   * The RESEARCH row's own report date, YYYY-MM-DD (`sheetCalendarDate`), carried onto the daily support
   * and resistance levels built from that row (Integration 36th (a)). Null: those levels carry no date.
   */
  sheetResearchDate?: string | null;
  /** Historical resistance from research. Never treated as a session level. */
  cycleLevels?: CycleLevels | null;
  /**
   * The session average, already resolved for the session the desk is in.
   *
   * Carries its own label — PM VWAP, RTH VWAP, AH VWAP — because a level called
   * simply "VWAP" does not say which session's average it is. VWAP asserts no
   * directional role, so it never receives a lost/reclaimed overlay.
   */
  sessionVwap?: { price: number; label: string } | null;
  /** The verified blue-sky ceiling. Unverified levels are never passed here. */
  blueSkyCeiling?: { price: number; date: string | null } | null;
  /** Session highs, each named for the session it belongs to. */
  premarketHigh?: number | null;
  rthHigh?: number | null;
  afterHoursHigh?: number | null;
  /** Include derived round numbers. */
  includeRoundLevels?: boolean;
}

function makeLevel(
  price: number,
  type: PriceLevelType,
  source: LevelSource,
  note: string | null,
  sourceDate: string | null = null,
): PriceLevel {
  return {
    price: Math.round(price * 10000) / 10000,
    label: TYPE_LABEL[type],
    type,
    direction: 'UNKNOWN',
    source,
    priority: TYPE_PRIORITY[type],
    note,
    sourceDate,
    distanceAbs: null,
    distancePct: null,
    clustered: false,
    clusterId: null,
    relationshipToPrice: 'UNKNOWN',
    stateLabel: null,
  };
}

/* --------------------------------------------------------------- assembly */

function collectLevels(input: LevelMapInput): { levels: PriceLevel[]; unparsed: string[] } {
  const levels: PriceLevel[] = [];
  const unparsed: string[] = [];

  // Session extremes: the most direct facts available.
  if (typeof input.sessionHigh === 'number' && input.sessionHigh > 0) {
    levels.push(makeLevel(input.sessionHigh, 'HOD', 'SESSION', 'session high'));
  }
  if (typeof input.sessionLow === 'number' && input.sessionLow > 0) {
    levels.push(makeLevel(input.sessionLow, 'LOD', 'SESSION', 'session low'));
  }

  // Session highs, each named for the session that made it. A premarket high
  // and an after-hours high are different facts and the ladder says which.
  if (typeof input.premarketHigh === 'number' && input.premarketHigh > 0) {
    levels.push(makeLevel(input.premarketHigh, 'PM_HIGH', 'SESSION', 'premarket high'));
  }
  if (typeof input.rthHigh === 'number' && input.rthHigh > 0) {
    levels.push(makeLevel(input.rthHigh, 'RTH_HIGH', 'SESSION', 'regular-session high'));
  }
  if (typeof input.afterHoursHigh === 'number' && input.afterHoursHigh > 0) {
    levels.push(makeLevel(input.afterHoursHigh, 'AH_HIGH', 'SESSION', 'after-hours high'));
  }

  /*
   * The session average.
   *
   * Its note carries the session name so the ladder cannot show "VWAP" without
   * saying which session's. Nothing here decides whether price is holding it.
   */
  if (input.sessionVwap && input.sessionVwap.price > 0) {
    levels.push(
      makeLevel(input.sessionVwap.price, 'VWAP', 'SESSION_VWAP', input.sessionVwap.label),
    );
  }

  /*
   * The verified blue-sky ceiling.
   *
   * Only ever a level that passed verification — split-adjusted, deep enough,
   * corroborated, and not a bad print. An unverified ceiling is not passed in,
   * so it can never appear on the ladder as though it were a real one.
   */
  if (input.blueSkyCeiling && input.blueSkyCeiling.price > 0) {
    levels.push(
      makeLevel(
        input.blueSkyCeiling.price,
        'BLUE_SKY',
        'DAILY_HISTORY',
        input.blueSkyCeiling.date
          ? `prior ceiling, ${input.blueSkyCeiling.date}`
          : 'prior ceiling',
      ),
    );
  }

  // The reference close is only a prior-day close when it belongs to the prior
  // session; after 16:00 ET it is the current day's, which is a different fact.
  if (typeof input.referenceRthClose === 'number' && input.referenceRthClose > 0) {
    const isPrior = input.referenceBasis !== 'CURRENT_SESSION';
    levels.push(
      makeLevel(
        input.referenceRthClose,
        isPrior ? 'PRIOR_DAY_CLOSE' : 'OTHER',
        'REFERENCE_CLOSE',
        isPrior ? 'prior session close' : 'current session close',
      ),
    );
  }

  // Sheet key levels: the keyword in the sentence assigns the meaning.
  const key = parseKeyLevels(input.keyLevels ?? '');
  for (const price of key.resistance) {
    levels.push(makeLevel(price, 'RESISTANCE', 'SHEET_KEY_LEVELS', 'TODAY key levels'));
  }
  for (const price of key.support) {
    levels.push(makeLevel(price, 'SUPPORT', 'SHEET_KEY_LEVELS', 'TODAY key levels'));
  }
  for (const price of key.unknown) {
    // Present and numeric, but the source did not say what it is.
    levels.push(makeLevel(price, 'OTHER', 'SHEET_KEY_LEVELS', 'TODAY key levels, type unstated'));
  }
  if ((input.keyLevels ?? '').trim() && parsePrices(input.keyLevels ?? '').length === 0) {
    unparsed.push(`key levels: ${(input.keyLevels ?? '').trim().slice(0, 60)}`);
  }

  // The RESEARCH row's levels carry that row's report date (Integration 36th (a)).
  const researchDate = input.sheetResearchDate ?? null;
  for (const price of parsePrices(input.dailyResistance ?? '')) {
    levels.push(makeLevel(price, 'RESISTANCE', 'SHEET_DAILY_RESISTANCE', 'daily resistance', researchDate));
  }
  for (const price of parsePrices(input.dailySupport ?? '')) {
    levels.push(makeLevel(price, 'SUPPORT', 'SHEET_DAILY_SUPPORT', 'daily support', researchDate));
  }

  /*
   * Historical resistance stays its own type.
   *
   * This is the FIEE distinction carried into the level map: a 52-week high is
   * overhead supply, not a level from the current move, and collapsing it into
   * RESISTANCE would erase that.
   */
  const historical = input.cycleLevels?.historicalResistance;
  if (historical?.value != null && historical.value > 0) {
    levels.push(
      makeLevel(
        historical.value,
        'HISTORICAL_RESISTANCE',
        'RESEARCH_HISTORICAL',
        historical.label ?? 'historical resistance',
      ),
    );
  }

  const price = input.currentPrice;
  if (input.includeRoundLevels !== false && typeof price === 'number' && price > 0) {
    for (const round of deriveRoundLevels(price)) {
      levels.push(makeLevel(round.price, round.type, 'DERIVED_ROUND', 'derived round number'));
    }
  }

  return { levels, unparsed };
}

/** Removes exact duplicates, keeping the highest-priority description. */
function dedupe(levels: PriceLevel[]): PriceLevel[] {
  const byPrice = new Map<string, PriceLevel>();
  for (const level of levels) {
    const key = level.price.toFixed(4);
    const existing = byPrice.get(key);
    if (!existing || level.priority < existing.priority) byPrice.set(key, level);
  }
  return [...byPrice.values()];
}

function assignDirection(level: PriceLevel, price: number | null): PriceLevel {
  if (price === null || price <= 0) {
    return { ...level, direction: 'UNKNOWN', relationshipToPrice: 'UNKNOWN', stateLabel: null };
  }

  const distanceAbs = Math.round(Math.abs(level.price - price) * 10000) / 10000;
  const distancePct = Math.round((distanceAbs / price) * 10000) / 100;

  let direction: LevelDirection;
  if (distancePct <= AT_PRICE_PCT) direction = 'AT_PRICE';
  else direction = level.price > price ? 'ABOVE' : 'BELOW';

  const relationshipToPrice = relationshipFor(level.type, direction);

  return {
    ...level,
    direction,
    distanceAbs,
    distancePct,
    // The type is untouched; the relationship sits beside it.
    relationshipToPrice,
    stateLabel: relationshipLabel(relationshipToPrice),
  };
}

/**
 * Groups levels that are close enough to behave as one zone.
 *
 * Merging requires closeness on both the absolute and percentage measures, so a
 * pair that is three cents apart at $0.50 — a 6% gap — stays separate.
 */
export function clusterLevels(levels: PriceLevel[], direction: LevelDirection): LevelZone[] {
  const sorted = [...levels].sort((a, b) => a.price - b.price);
  const groups: PriceLevel[][] = [];

  for (const level of sorted) {
    const current = groups[groups.length - 1];
    if (!current) {
      groups.push([level]);
      continue;
    }

    const last = current[current.length - 1];
    const gapAbs = level.price - last.price;
    const gapPct = last.price > 0 ? (gapAbs / last.price) * 100 : Number.POSITIVE_INFINITY;

    if (gapAbs <= CLUSTER_ABS_CENTS && gapPct <= CLUSTER_PCT) current.push(level);
    else groups.push([level]);
  }

  return groups.map((members) => {
    const ordered = [...members].sort((a, b) => a.priority - b.priority);
    const dominant = ordered[0];
    const low = Math.min(...members.map((m) => m.price));
    const high = Math.max(...members.map((m) => m.price));

    // Nearest edge: what a trader actually reaches first.
    const nearestPrice = direction === 'BELOW' ? high : low;
    const nearest = members.reduce((best, m) =>
      (m.distanceAbs ?? Infinity) < (best.distanceAbs ?? Infinity) ? m : best,
    );

    const clusterId = `${direction}:${low.toFixed(4)}-${high.toFixed(4)}`;
    const isZone = members.length > 1;

    return {
      clusterId,
      low,
      high,
      direction,
      members: members.map((m) => ({ ...m, clustered: isZone, clusterId })),
      nearestPrice,
      distanceAbs: nearest.distanceAbs,
      distancePct: nearest.distancePct,
      dominantType: dominant.type,
      relationshipToPrice: dominant.relationshipToPrice,
      stateLabel: dominant.stateLabel,
      // A zone is dated only when EVERY member carries that same date (Commercial read 57): a dated Sheet
      // support zoned with a level from today's bars must not read the fresh one as weeks old.
      sourceDate: members.every((m) => m.sourceDate !== null && m.sourceDate === members[0].sourceDate)
        ? members[0].sourceDate
        : null,
      label: isZone
        ? `${low.toFixed(2)}–${high.toFixed(2)} ${TYPE_LABEL[dominant.type]} zone`
        : `${dominant.price.toFixed(2)} ${TYPE_LABEL[dominant.type]}`,
    };
  });
}

function formatPrice(value: number): string {
  return value < 1 ? value.toFixed(3) : value.toFixed(2);
}

/**
 * Builds the level map.
 *
 * Everything the UI needs, already grouped, ordered and measured. The component
 * renders; it does not decide.
 */
export function buildLevelMap(input: LevelMapInput): LevelMap {
  const price = typeof input.currentPrice === 'number' && input.currentPrice > 0
    ? input.currentPrice
    : null;

  const { levels, unparsed } = collectLevels(input);
  const positioned = dedupe(levels).map((level) => assignDirection(level, price));

  const above = clusterLevels(
    positioned.filter((level) => level.direction === 'ABOVE'),
    'ABOVE',
  ).sort((a, b) => (a.distanceAbs ?? Infinity) - (b.distanceAbs ?? Infinity));

  const below = clusterLevels(
    positioned.filter((level) => level.direction === 'BELOW'),
    'BELOW',
  ).sort((a, b) => (a.distanceAbs ?? Infinity) - (b.distanceAbs ?? Infinity));

  const atPrice = positioned
    .filter((level) => level.direction === 'AT_PRICE')
    .sort((a, b) => a.priority - b.priority);

  // "Inside X / Y" only when both sides actually have something nearby.
  const betweenNote =
    price !== null && above.length > 0 && below.length > 0
      ? `Inside ${formatPrice(below[0].nearestPrice)} ${TYPE_LABEL[below[0].dominantType]} / ${formatPrice(above[0].nearestPrice)} ${TYPE_LABEL[above[0].dominantType]}`
      : null;

  /*
   * Air pocket: spacing stated as spacing.
   *
   * Deliberately not called flush risk or breakout potential — this says only
   * how far the next level is, which is a fact, not a prediction.
   */
  let airPocketAbove: string | null = null;
  let airPocketBelow: string | null = null;

  if (price !== null) {
    if (above.length === 0) {
      airPocketAbove = 'No mapped resistance above current price';
    } else if ((above[0].distancePct ?? 0) >= AIR_POCKET_PCT) {
      airPocketAbove = `No nearby resistance until ${formatPrice(above[0].nearestPrice)} (${above[0].distancePct?.toFixed(1)}% away)`;
    }

    if (below.length === 0) {
      airPocketBelow = 'No mapped support below current price';
    } else if ((below[0].distancePct ?? 0) >= AIR_POCKET_PCT) {
      airPocketBelow = `Air pocket below to ${formatPrice(below[0].nearestPrice)} (${below[0].distancePct?.toFixed(1)}% away)`;
    }
  }

  return {
    currentPrice: price,
    spread: input.spread ?? null,
    spreadPct: input.spreadPct ?? null,
    above,
    below,
    atPrice,
    betweenNote,
    airPocketAbove,
    airPocketBelow,
    empty: above.length === 0 && below.length === 0 && atPrice.length === 0,
    unparsed,
  };
}

/* ------------------------------------------------------- compact row model */

export interface CompactLevel {
  price: string;
  type: string;
  /** "LOST SUPPORT" / "PRICE ABOVE", when the relationship is not ordinary. */
  stateLabel: string | null;
  /** The source's own date, YYYY-MM-DD, or null; rendered with `levelDateText`. */
  sourceDate: string | null;
  /** Signed distance, e.g. "+0.28". */
  distance: string;
  distancePct: string;
  isZone: boolean;
}

/**
 * The board cell's model.
 *
 * Deliberately has no current-price field. The board already has a Price column
 * and a Spread column, so a NOW row inside the level cell restated what was two
 * columns to its left and pushed the levels — the only thing the cell exists to
 * show — into less space. Its absence is structural rather than a styling
 * choice, so it cannot quietly come back.
 */
export interface CompactLevelRow {
  nextUp: CompactLevel[];
  nextDown: CompactLevel[];
  /**
   * Set only when price is sitting ON a level, which the Price column cannot
   * express. This is the one current-price fact that adds information here.
   */
  atPriceNote: string | null;
  empty: boolean;
}

function toCompact(zone: LevelZone, sign: '+' | '-'): CompactLevel {
  return {
    price: zone.members.length > 1
      ? `${formatPrice(zone.low)}–${formatPrice(zone.high)}`
      : formatPrice(zone.nearestPrice),
    type: TYPE_LABEL[zone.dominantType],
    stateLabel: zone.stateLabel,
    sourceDate: zone.sourceDate,
    distance: zone.distanceAbs === null ? '—' : `${sign}${zone.distanceAbs.toFixed(2)}`,
    distancePct: zone.distancePct === null ? '—' : `${zone.distancePct.toFixed(1)}%`,
    isZone: zone.members.length > 1,
  };
}

/**
 * Chooses which zones reach the board.
 *
 * Selection blends importance with proximity, then displays the winners
 * nearest-first. Selecting on distance alone let a derived round number take a
 * slot from a nearby HOD or research level — and since a whole dollar is always
 * within a few percent, it would have done so on almost every row.
 */
export function selectForBoard(zones: readonly LevelZone[], perSide: number): LevelZone[] {
  return [...zones]
    .sort((a, b) => selectionScore(a) - selectionScore(b))
    .slice(0, perSide)
    .sort((a, b) => (a.distanceAbs ?? Infinity) - (b.distanceAbs ?? Infinity));
}

/**
 * The compact three-line model for a board row.
 *
 * Capped at two zones per side: the board answers "what is next", and the
 * drawer holds the full map.
 */
export function toCompactRow(map: LevelMap, perSide = 2): CompactLevelRow {
  return {
    nextUp: selectForBoard(map.above, perSide).map((zone) => toCompact(zone, '+')),
    nextDown: selectForBoard(map.below, perSide).map((zone) => toCompact(zone, '-')),
    atPriceNote:
      map.atPrice.length > 0
        ? `at ${map.atPrice.map((level) => TYPE_LABEL[level.type]).join(' · ')}`
        : null,
    empty: map.empty,
  };
}

export { formatPrice as formatLevelPrice };
