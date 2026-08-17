/**
 * Security classification for the Discovery universe.
 *
 * Alpaca's `us_equity` asset class contains far more than operating-company
 * common stock: preferred series, warrants, rights, units, ETFs, ETNs and
 * closed-end funds all share it. Those instruments do not belong in a
 * small-cap momentum ranking, but foreign issuers and ADRs absolutely do.
 *
 * Classification is evidence-based and reversible:
 *   - a symbol-suffix rule alone is never allowed to discard a name
 *   - UNKNOWN stays eligible, because absence of evidence is not evidence that
 *     something is a non-common instrument
 *   - every decision records the rule that produced it
 *
 * LIMITATION: Alpaca's asset payload has no authoritative security-type field.
 * These rules read symbol conventions, issuer names and listing venue, which
 * is the best available evidence today. A proper exchange security master
 * (CTA/UTP SIP security type, or a vendor reference feed) would replace this
 * module wholesale; that is the documented upgrade path.
 */

import type {
  ClassificationConfidence,
  SecurityClass,
  SecurityClassification,
} from './types';

/**
 * Bump whenever a classification rule changes. Cached universe rows are
 * re-classified when the stored version differs, so a rule fix takes effect on
 * the next worker start rather than waiting for the daily asset refresh.
 */
export const CLASSIFIER_VERSION = '2026-08-17.2';

export interface ClassifiableAsset {
  symbol: string;
  name?: string | null;
  exchange?: string | null;
}

/** Classes that may compete in the ranked common-equity Discovery board. */
const DISCOVERY_ELIGIBLE_CLASSES: ReadonlySet<SecurityClass> = new Set<SecurityClass>([
  'COMMON_EQUITY',
  'ADR_ADS',
  'UNKNOWN',
]);

export function isDiscoveryEligibleClass(classification: SecurityClass): boolean {
  return DISCOVERY_ELIGIBLE_CLASSES.has(classification);
}

/**
 * Suffix conventions used by Alpaca / the SIP tapes. A suffix is only trusted
 * when it is unambiguous: single-letter share classes (BRK.A, HEI.B) are
 * common stock and must not be mistaken for anything else.
 */
interface SuffixRule {
  pattern: RegExp;
  classification: SecurityClass;
  confidence: ClassificationConfidence;
  reason: string;
}

const SUFFIX_RULES: SuffixRule[] = [
  {
    // PSA.PRM, BAC.PRK — preferred series.
    pattern: /^PR[A-Z]?$/,
    classification: 'PREFERRED',
    confidence: 'HIGH',
    reason: 'symbol suffix denotes a preferred series',
  },
  {
    pattern: /^P[A-Z]$/,
    classification: 'PREFERRED',
    confidence: 'MEDIUM',
    reason: 'symbol suffix matches the preferred-series convention',
  },
  {
    pattern: /^(WS|WT|WTA|WTB|W)$/,
    classification: 'WARRANT',
    confidence: 'HIGH',
    reason: 'symbol suffix denotes warrants',
  },
  {
    pattern: /^(RT|RTW|R)$/,
    classification: 'RIGHT',
    confidence: 'HIGH',
    reason: 'symbol suffix denotes rights',
  },
  {
    pattern: /^U$/,
    classification: 'UNIT',
    confidence: 'HIGH',
    reason: 'symbol suffix denotes units',
  },
  {
    // Share classes: BRK.A, HEI.B, GEF.B. Common stock, not a derivative.
    pattern: /^[A-Z]$/,
    classification: 'COMMON_EQUITY',
    confidence: 'MEDIUM',
    reason: 'single-letter suffix is a share class',
  },
];

interface NameRule {
  pattern: RegExp;
  classification: SecurityClass;
  confidence: ClassificationConfidence;
  reason: string;
}

/**
 * Issuer-name evidence, checked in order. Order matters:
 *
 * ADR wording is tested BEFORE warrant/right/unit because ADS descriptions
 * routinely contain those words in prose — RLX Technology is described as
 * "American Depositary Shares, each representing the right to receive one
 * Class A ordinary share", and treating that as a rights instrument would drop
 * a perfectly tradable foreign issuer out of the universe.
 *
 * Warrant/right/unit patterns are also anchored to the instrument-designation
 * position (end of the name, or immediately before a comma or parenthesis),
 * which is where an exchange actually puts them.
 */
const NAME_RULES: NameRule[] = [
  {
    pattern: /\b(preferred|pfd)\b|\bdepositary shares?\b.*\bpreferred\b/i,
    classification: 'PREFERRED',
    confidence: 'HIGH',
    reason: 'issuer name identifies a preferred security',
  },
  {
    pattern: /\b(etfs?|etns?|exchange[- ]traded|index fund)\b/i,
    classification: 'ETF_ETP',
    confidence: 'HIGH',
    reason: 'issuer name identifies an exchange-traded product',
  },
  {
    pattern:
      /\b(ishares|spdr|vanguard|proshares|direxion|invesco|wisdomtree|granite ?shares|global x|first trust|vaneck|van eck|amplify|defiance|yieldmax|kraneshares|simplify|roundhill|tidal|xtrackers|janus henderson|pacer|schwab strategic|dimensional|goldman sachs etf|jpmorgan etf)\b/i,
    classification: 'ETF_ETP',
    confidence: 'HIGH',
    reason: 'issuer name matches a known ETP sponsor',
  },
  {
    pattern: /\b(closed[- ]end fund|municipal (income|bond)|income fund|opportunities fund|term trust)\b/i,
    classification: 'FUND',
    confidence: 'HIGH',
    reason: 'issuer name identifies a fund',
  },
  {
    pattern: /\b(american depositary|depositary (share|receipt)|\badr\b|\bads\b)/i,
    classification: 'ADR_ADS',
    confidence: 'HIGH',
    reason: 'issuer name identifies an ADR/ADS',
  },
  {
    pattern: /\bwarrants?\b(?=\s*$|[,(])/i,
    classification: 'WARRANT',
    confidence: 'HIGH',
    reason: 'issuer name ends with a warrant designation',
  },
  {
    pattern: /\brights?\b(?=\s*$|[,(])|\bsubscription rights?\b/i,
    classification: 'RIGHT',
    confidence: 'MEDIUM',
    reason: 'issuer name ends with a rights designation',
  },
  {
    pattern: /\bunits?\b(?=\s*$|[,(])/i,
    classification: 'UNIT',
    confidence: 'MEDIUM',
    reason: 'issuer name ends with a unit designation',
  },
  {
    pattern: /\bfund\b/i,
    classification: 'FUND',
    confidence: 'MEDIUM',
    reason: 'issuer name contains "Fund"',
  },
  {
    pattern: /\bindex\b/i,
    classification: 'OTHER',
    confidence: 'MEDIUM',
    reason: 'issuer name identifies an index instrument',
  },
];

/** Venues that list essentially only exchange-traded products. */
const ETP_ONLY_EXCHANGES = new Set(['ARCA', 'BATS', 'NYSEARCA']);

function suffixOf(symbol: string): string | null {
  const dot = symbol.indexOf('.');
  if (dot < 0) return null;
  return symbol.slice(dot + 1).toUpperCase();
}

/**
 * Classifies one asset. Never throws; an unrecognisable asset becomes UNKNOWN
 * and stays eligible.
 */
export function classifySecurity(asset: ClassifiableAsset): SecurityClassification {
  const symbol = asset.symbol.toUpperCase();
  const name = (asset.name ?? '').trim();
  const exchange = (asset.exchange ?? '').trim().toUpperCase();

  const build = (
    classification: SecurityClass,
    confidence: ClassificationConfidence,
    source: string,
    reason: string,
  ): SecurityClassification => ({
    symbol,
    classification,
    confidence,
    source,
    reason,
    discoveryEligible: isDiscoveryEligibleClass(classification),
  });

  // 1. Issuer name is the strongest evidence when it is explicit.
  for (const rule of NAME_RULES) {
    if (name && rule.pattern.test(name)) {
      // "Trust" and "Fund" appear in plenty of operating-company names, so a
      // medium-confidence name hit is only trusted when the symbol or venue
      // does not contradict it.
      return build(rule.classification, rule.confidence, 'issuer-name', rule.reason);
    }
  }

  // 2. Symbol suffix conventions.
  const suffix = suffixOf(symbol);
  if (suffix !== null) {
    for (const rule of SUFFIX_RULES) {
      if (rule.pattern.test(suffix)) {
        return build(
          rule.classification,
          rule.confidence,
          'symbol-suffix',
          `${rule.reason} (.${suffix})`,
        );
      }
    }
    return build(
      'UNKNOWN',
      'LOW',
      'symbol-suffix',
      `unrecognised symbol suffix .${suffix}; retained pending better reference data`,
    );
  }

  // 3. Listing venue, as weak corroborating evidence only.
  if (ETP_ONLY_EXCHANGES.has(exchange)) {
    return build(
      'ETF_ETP',
      'MEDIUM',
      'listing-venue',
      `${exchange} lists exchange-traded products almost exclusively`,
    );
  }

  if (!name) {
    return build('UNKNOWN', 'LOW', 'no-evidence', 'no issuer name available to classify');
  }

  return build(
    'COMMON_EQUITY',
    'MEDIUM',
    'default',
    'no evidence of a non-common instrument; treated as operating-company equity',
  );
}

export interface ClassificationSummary {
  total: number;
  byClass: Record<SecurityClass, number>;
  eligible: number;
  excluded: number;
}

export function summarizeClassifications(
  classifications: Iterable<SecurityClassification>,
): ClassificationSummary {
  const byClass: Record<SecurityClass, number> = {
    COMMON_EQUITY: 0,
    ADR_ADS: 0,
    PREFERRED: 0,
    WARRANT: 0,
    RIGHT: 0,
    UNIT: 0,
    ETF_ETP: 0,
    FUND: 0,
    OTHER: 0,
    UNKNOWN: 0,
  };

  let total = 0;
  let eligible = 0;

  for (const entry of classifications) {
    total += 1;
    byClass[entry.classification] += 1;
    if (entry.discoveryEligible) eligible += 1;
  }

  return { total, byClass, eligible, excluded: total - eligible };
}
