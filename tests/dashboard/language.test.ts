/**
 * Nothing reaches a trader in SCREAMING_SNAKE.
 *
 * The first pass at this humanised the Sheet-vs-Auto table's *reason* column
 * and missed its two value columns, and missed the evidence list's source type.
 * That only showed up against production data: the comparison table does not
 * render until a ticker has both a human review and an accepted dossier, and no
 * local fixture had both. So the rule is asserted here over the real vocabulary
 * rather than trusted to a reading of the components.
 */

import { describe, expect, it } from 'vitest';

import { humanise, looksLikeEnum, snapshotLabel } from '@/lib/dashboard/language';
import { CATALYST_GRADE_LABEL, CYCLE_LABEL, STRUCTURE_LABEL } from '@/lib/research/view';
import type {
  CatalystFreshness,
  CatalystGrade,
  CatalystStatus,
  CycleClassification,
  SourceType,
  StructureClassification,
  SupplyBlockStatus,
  SupplyBlockType,
} from '@/lib/research/types';

/*
 * Every value that reaches a drawer surface. Typed against the source unions,
 * so adding a member to one of them and forgetting it here fails to compile
 * rather than shipping a raw constant.
 */
const CYCLES: CycleClassification[] = [
  'GREEN_FRESH_FRONTSIDE',
  'YELLOW_FRONTSIDE_WARNING',
  'RED_BACKSIDE',
  'UNKNOWN',
];

const STRUCTURES: StructureClassification[] = ['CLEAN', 'CAUTION', 'DIRTY_FLOAT', 'UNKNOWN'];

const GRADES: CatalystGrade[] = [
  'STRONG',
  'LEGITIMATE_POSITIVE',
  'MODERATE_MIXED_SECONDARY',
  'WEAK_NEGATIVE_DILUTIVE',
  'NONE',
  'UNKNOWN',
];

const FRESHNESS: CatalystFreshness[] = ['FRESH', 'RECENT', 'STALE', 'UNKNOWN'];

const CATALYST_STATUS: CatalystStatus[] = [
  'FRESH_FOUND',
  'SECONDARY_STALE',
  'NONE_FOUND',
  'CONFLICTING',
  'UNKNOWN',
];

const SUPPLY_TYPES: SupplyBlockType[] = [
  'REGISTERED_RESALE',
  'ATM',
  'PIPE',
  'WARRANTS',
  'CONVERTIBLES',
  'EQUITY_PURCHASE_AGREEMENT',
  'ACQUISITION_SHARES',
  'RECENT_OFFERING',
  'SHELF_CAPACITY',
  'PREFERRED_CONVERSION',
  'OTHER_ISSUED_SHARES',
];

const SUPPLY_STATUS: SupplyBlockStatus[] = [
  'KNOWN_ACTIVE',
  'POSSIBLY_ACTIVE',
  'NOT_YET_ACTIVE',
  'UNKNOWN',
];

/** Reason codes and provenance values the comparison table prints. */
const COMPARISON = [
  'AUTO_SOURCE_GAP',
  'INTERPRETATION_DIFFERENCE',
  'SHEET_ONLY',
  'AUTO_ONLY',
  'AGREE',
  'DISAGREE',
  'SHEET_AUTO',
  'CONFLICT',
];

/** Evidence source types. */
const SOURCE_TYPES: SourceType[] = [
  'SEC_FILING',
  'SEC_EXHIBIT',
  'SEC_SUBMISSIONS',
  'SEC_COMPANY_FACTS',
  'COMPANY_IR',
  'COMPANY_NEWSROOM',
  'COMPANY_RELEASE',
  'NEWSWIRE',
  'SECONDARY_DISCOVERY',
  'WEB_SEARCH',
  'MARKET_HISTORY',
];

const EVERYTHING = [
  ...CYCLES,
  ...STRUCTURES,
  ...GRADES,
  ...FRESHNESS,
  ...CATALYST_STATUS,
  ...SUPPLY_TYPES,
  ...SUPPLY_STATUS,
  ...COMPARISON,
  ...SOURCE_TYPES,
];

describe('looksLikeEnum', () => {
  it('recognises an engine constant', () => {
    expect(looksLikeEnum('YELLOW_FRONTSIDE_WARNING')).toBe(true);
    expect(looksLikeEnum('a value of AUTO_SOURCE_GAP inside a sentence')).toBe(true);
  });

  it('leaves ordinary text alone', () => {
    expect(looksLikeEnum('yellow, frontside warning')).toBe(false);
    expect(looksLikeEnum('DIRTY FLOAT')).toBe(false);
    expect(looksLikeEnum('SEC submissions')).toBe(false);
  });
});

describe('humanise', () => {
  it('leaves no engine constant standing, across the whole vocabulary', () => {
    const leaked = EVERYTHING.filter((value) => looksLikeEnum(humanise(value)));
    expect(leaked).toEqual([]);
  });

  it('never returns an underscore', () => {
    const withUnderscores = EVERYTHING.filter((value) => humanise(value).includes('_'));
    expect(withUnderscores).toEqual([]);
  });

  it('gives the values that need more than de-underscoring a real phrase', () => {
    expect(humanise('AUTO_SOURCE_GAP')).toBe('the desk research had not seen the newer source');
    expect(humanise('YELLOW_FRONTSIDE_WARNING')).toBe('yellow, frontside warning');
    expect(humanise('SEC_SUBMISSIONS')).toBe('SEC submissions');
  });

  it('de-underscores anything it has no phrase for, rather than shouting it', () => {
    expect(humanise('SOME_FUTURE_STATE')).toBe('some future state');
  });

  it('says unknown rather than nothing', () => {
    expect(humanise(null)).toBe('unknown');
    expect(humanise('')).toBe('unknown');
  });

  it('describes supply as capacity, never as selling', () => {
    for (const value of [...SUPPLY_TYPES, ...SUPPLY_STATUS]) {
      expect(humanise(value)).not.toMatch(/\bselling\b|\bis selling\b/i);
    }
  });
});

/*
 * No surface claims a human reviewed anything.
 *
 * Five trader-facing strings said a human review reached a conclusion, plus a
 * `Sheet (human)` column heading. No human has ever reviewed any of it: the
 * Sheet is written by four scheduled ChatGPT tasks. That is a worse failure
 * than the engine enums Phase 1 removed — LATCH was jargon, this asserted a
 * fact about who did the work.
 *
 * `automatic` went with them, for a different reason: with no human in the
 * comparison it had stopped distinguishing the two things it existed to
 * separate. Both sides are automatic. `desk research` and `outside research`
 * name what each actually is, and both fall out of use rather than needing
 * renaming when the Sheet retires.
 */
describe('no surface claims a human reviewed anything', () => {
  it('has no human-review wording and no bare "automatic" left', async () => {
    const { promises: fs } = await import('node:fs');
    const files = [
      'lib/dashboard/language.ts',
      'lib/dashboard/intelligence.ts',
      'lib/dashboard/deskRead.ts',
      'lib/dashboard/risk.ts',
      'components/DeskRead.tsx',
      'components/AutomaticIntelligence.tsx',
    ];

    for (const file of files) {
      const raw = await fs.readFile(file, 'utf8');
      // Comment lines are stripped: this guards what the trader READS. An
      // internal comment calling the dossier "automatic" is not false, only
      // non-distinguishing, and rewriting every one would be churn.
      const source = raw
        .split(/\r?\n/)
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join(' ');

      expect(source, `${file} claims a human review`).not.toMatch(
        /human[- ]review|human-reviewed|Sheet \(human\)/i,
      );
      expect(source, `${file} still says "automatic" of a research source`).not.toMatch(
        /automatic (layer|analysis|pass|research|dossier|intelligence)/i,
      );
    }
  });
});

describe('the checkpoint snapshot columns, found leaking on the live board', () => {
  /*
   * `RED_BACKSIDE`, `MODERATE_MIXED_SECONDARY`, `DIRTY_FLOAT` and `TRADING`
   * were rendering verbatim one column over from the enums already replaced
   * with a sentence — the same §10 criterion, the same table, and visible only
   * by looking at the screen.
   */
  it('renders the SAME words the rest of the desk uses, not a second vocabulary', () => {
    // Asserted against the canonical maps rather than against typed-out
    // strings, so a rename moves both together instead of splitting them.
    expect(snapshotLabel('cycle', 'RED_BACKSIDE')).toBe(CYCLE_LABEL.RED_BACKSIDE);
    expect(snapshotLabel('catalyst', 'MODERATE_MIXED_SECONDARY')).toBe(
      CATALYST_GRADE_LABEL.MODERATE_MIXED_SECONDARY,
    );
    expect(snapshotLabel('structure', 'DIRTY_FLOAT')).toBe(STRUCTURE_LABEL.DIRTY_FLOAT);
  });

  it('is silent for a trading halt state, as the halt badge is', () => {
    // A column reading "trading" on every row is a constant dressed as
    // content, and two conventions for one field is how vocabularies split.
    expect(snapshotLabel('halt', 'TRADING')).toBe('—');
    expect(snapshotLabel('halt', 'HALTED')).toBe('Halted');
    expect(snapshotLabel('halt', 'RESUMING')).toBe('Resuming');
  });

  it('never returns an enum, including for a vocabulary no map knows', () => {
    /*
     * The columns are `string | null` in the store, so a row written under an
     * older vocabulary can hold a value no current map covers. It must still
     * not reach a trader as SCREAMING_SNAKE — humanise is the floor.
     */
    for (const value of ['SOME_RETIRED_VALUE', 'RED_BACKSIDE', 'DIRTY_FLOAT', 'TRADING']) {
      for (const field of ['cycle', 'catalyst', 'structure', 'halt'] as const) {
        expect(looksLikeEnum(snapshotLabel(field, value))).toBe(false);
      }
    }
  });

  it('says — for an absent value rather than inventing one', () => {
    expect(snapshotLabel('cycle', null)).toBe('—');
    expect(snapshotLabel('structure', undefined)).toBe('—');
  });
});
