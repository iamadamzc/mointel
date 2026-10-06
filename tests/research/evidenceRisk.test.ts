import { describe, expect, it } from 'vitest';

import {
  EVIDENCE_RISK_BAD,
  EVIDENCE_RISK_GOOD,
  EVIDENCE_RISK_RULE,
  evidenceRiskState,
  validateEvidenceRisk,
} from '@/lib/research/interpret/evidenceRisk';
import type { ResearchEvidenceBundle } from '@/lib/research/interpret/bundle';
import { SYSTEM_PROMPT_A, SYSTEM_PROMPT_B } from '@/lib/research/interpret/openaiInterpreter';
import { AUTOMATIC_DOSSIER_SCHEMA, AUTOMATIC_DOSSIER_SCHEMA_VERSION, INTERPRETER_PROMPT_VERSION } from '@/lib/research/interpret/schema';
import type { ResearchDossier, SupplyBlock } from '@/lib/research/types';

/*
 * The evidence risk sentence (contract row 20), design
 * `docs/research/warning-shot/design-2026-10-06.md` section 4: each guardrail
 * REMOVES the text and records why; a sentence that keeps to the rule survives
 * beside every removal. No model call.
 */

const EM = String.fromCharCode(0x2014);
const BUNDLE = { sources: [{ id: 1 }, { id: 2 }, { id: 3 }], reportedSharesOutstanding: null } as unknown as ResearchEvidenceBundle;
const withReported = { ...BUNDLE, reportedSharesOutstanding: { shares: 9_000_000, asOf: '2026-06-30' } } as unknown as ResearchEvidenceBundle;
const dossierWith = (sharesOutstandingDate: string | null) =>
  ({ structure: { sharesOutstanding: 12_500_000, sharesOutstandingDate } }) as unknown as ResearchDossier;
const DOSSIER = dossierWith('2026-08-11');
const block = (status: SupplyBlock['status'], ids: number[]) => ({ status, evidenceSourceIds: ids }) as SupplyBlock;

const run = (text: string | null, ids = [1], ledger: SupplyBlock[] = [], d = DOSSIER, b = BUNDLE) =>
  validateEvidenceRisk({ text, evidenceSourceIds: ids }, d, ledger, b);
const rule = (text: string, ids = [1], ledger: SupplyBlock[] = [], d = DOSSIER, b = BUNDLE) => run(text, ids, ledger, d, b)?.removed?.rule ?? null;
const kept = (text: string, ids = [1], ledger: SupplyBlock[] = [], d = DOSSIER, b = BUNDLE) => run(text, ids, ledger, d, b)?.text ?? null;

/** A sentence of exactly `n` words, none of them a guarded word. */
const words = (n: number) => `The filings list ${Array.from({ length: n - 3 }, () => 'shelf').join(' ')}.`;

describe('validateEvidenceRisk', () => {
  it("the design's good example survives, trimmed, with its ids (control)", () => {
    expect(run(` ${EVIDENCE_RISK_GOOD} `)).toEqual({ text: EVIDENCE_RISK_GOOD, evidenceSourceIds: [1], removed: null });
  });

  it('1: requires a source, and only an id in this bundle', () => {
    expect(rule(EVIDENCE_RISK_GOOD, [])).toBe('RISK_REQUIRES_SOURCE');
    expect(rule(EVIDENCE_RISK_GOOD, [2, 9])).toBe('RISK_REQUIRES_SOURCE');
    expect(kept(EVIDENCE_RISK_GOOD, [2])).toBe(EVIDENCE_RISK_GOOD);
    // The removal keeps the ids and the removed sentence for the audit.
    expect(run(EVIDENCE_RISK_GOOD, [9])).toEqual({
      text: null, evidenceSourceIds: [9], removed: { rule: 'RISK_REQUIRES_SOURCE', detail: 'source id 9 is not in the bundle', text: EVIDENCE_RISK_GOOD },
    });
  });

  it('2: one sentence of at most 40 words; a decimal point is not a stop', () => {
    expect(rule('The ledger shows a shelf. The cycle reads as backside.')).toBe('RISK_NOT_ONE_SENTENCE');
    expect(rule(words(41))).toBe('RISK_NOT_ONE_SENTENCE');
    expect(kept(words(40))).toBe(words(40));
    expect(kept('The supply ledger shows a shelf of $4.5 million.')).toBe('The supply ledger shows a shelf of $4.5 million.');
  });

  it('3: the report checker shapes and "avoid" are removed; the same condition stated plainly survives', () => {
    expect(rule('The shelf will expire in March 2027.')).toBe('RISK_FORBIDDEN_WORDING');
    expect(kept('The shelf expires in March 2027.')).toBe('The shelf expires in March 2027.');
    expect(rule('The ledger marks the block KNOWN_ACTIVE.')).toBe('RISK_FORBIDDEN_WORDING');
    expect(rule(`The shelf is open${EM} with no sales recorded.`)).toBe('RISK_FORBIDDEN_WORDING');
    expect(run('Traders avoid the name after a reverse split.')?.removed).toMatchObject({ rule: 'RISK_FORBIDDEN_WORDING', detail: 'avoid' });
    expect(kept('The name had a reverse split in 2025.')).toBe('The name had a reverse split in 2025.');
  });

  it('3: modals and likelihood are removed; "May" before a number is the month', () => {
    expect(run('The shelf could expire unused.')?.removed?.detail).toBe('modal or likelihood');
    expect(rule('The offering is expected to close.')).toBe('RISK_FORBIDDEN_WORDING');
    expect(rule('The registration may be withdrawn.')).toBe('RISK_FORBIDDEN_WORDING');
    expect(kept('The registration became effective on May 5, 2026.')).toBe('The registration became effective on May 5, 2026.');
    expect(kept('The shelf was filed in May 2026.')).toBe('The shelf was filed in May 2026.');
  });

  it('3: exposure and danger words are removed', () => {
    expect(run('The company faces a delisting notice.')?.removed?.detail).toBe('exposure or danger');
    expect(rule('Holders are exposed to the open program.')).toBe('RISK_FORBIDDEN_WORDING');
    expect(kept('The company received a delisting notice.')).toBe('The company received a delisting notice.');
  });

  it('3: characterisation as wrongdoing is removed', () => {
    expect(run('The convertible note is toxic.')?.removed?.detail).toBe('characterisation');
    expect(kept('The convertible note converts at a discount to market.')).toBe('The convertible note converts at a discount to market.');
  });

  it('4: activity words stay only when a cited id belongs to a KNOWN_ACTIVE block', () => {
    const sold = 'Shares were sold under the at-the-market program.';
    expect(kept(sold, [2], [block('KNOWN_ACTIVE', [2, 3])])).toBe(sold);
    expect(rule(sold, [2], [block('POSSIBLY_ACTIVE', [2])])).toBe('RISK_ACTIVITY_WITHOUT_ACTIVE_BLOCK');
    expect(rule(sold, [1], [block('KNOWN_ACTIVE', [2])])).toBe('RISK_ACTIVITY_WITHOUT_ACTIVE_BLOCK');
    // A negated activity errs safe: removed without an active block.
    expect(rule('The program records no dilution.', [2], [])).toBe('RISK_ACTIVITY_WITHOUT_ACTIVE_BLOCK');
  });

  it('5: "float" beside a number, and a share count without its as-of date, are removed', () => {
    expect(rule('The float is 2.1 million shares.')).toBe('RISK_SHARES_RULE');
    expect(kept('No float figure is stated in the filings.')).toBe('No float figure is stated in the filings.');
    expect(rule('The company reported 12.5 million shares outstanding.')).toBe('RISK_SHARES_RULE');
    const dated = 'The company reported 12.5 million shares outstanding as of August 11, 2026.';
    expect(kept(dated)).toBe(dated);
    expect(kept('The company reported 12.5 million shares outstanding as of August 11.')).toBe('The company reported 12.5 million shares outstanding as of August 11.');
    const monthYear = 'The company reported 12.5 million shares outstanding as of August 2026.';
    expect(kept(monthYear)).toBe(monthYear);
    // A count the dossier cannot date is undated whatever date the sentence gives.
    expect(rule(dated, [1], [], dossierWith(null))).toBe('RISK_SHARES_RULE');
    expect(rule(monthYear, [1], [], dossierWith(null))).toBe('RISK_SHARES_RULE');
    // The parsed count from the bundle carries the same rule.
    expect(rule('The latest filing reports 9 million shares outstanding.', [1], [], DOSSIER, withReported)).toBe('RISK_SHARES_RULE');
  });

  it("the model's own null (or blank) stays null and is not a removal; an absent field stays absent", () => {
    expect(run(null)).toEqual({ text: null, evidenceSourceIds: [1], removed: null });
    expect(run('   ')).toEqual({ text: null, evidenceSourceIds: [1], removed: null });
    expect(validateEvidenceRisk(undefined, DOSSIER, [], BUNDLE)).toBeNull();
  });
});

describe('evidenceRiskState', () => {
  it('NOT_YET before schema 3; PRODUCED with text; UNKNOWN when null or removed, naming the rule and never the removed text', () => {
    const produced = { evidenceRisk: { text: EVIDENCE_RISK_GOOD, evidenceSourceIds: [1], removed: null } };
    expect(evidenceRiskState(produced, 2)).toEqual({ state: 'NOT_YET' });
    expect(evidenceRiskState(produced, null)).toEqual({ state: 'NOT_YET' });
    expect(evidenceRiskState(produced, 3)).toEqual({ state: 'PRODUCED', text: EVIDENCE_RISK_GOOD, evidenceSourceIds: [1] });
    const removed = { evidenceRisk: { text: null, evidenceSourceIds: [1], removed: { rule: 'RISK_SHARES_RULE' as const, detail: 'x', text: 'The float is 2 million.' } } };
    expect(evidenceRiskState(removed, 3)).toEqual({ state: 'UNKNOWN', removedBy: 'RISK_SHARES_RULE' });
    expect(evidenceRiskState({}, 3)).toEqual({ state: 'UNKNOWN', removedBy: null });
  });
});

describe('the schema and the prompt (schema 3, prompt 4)', () => {
  it('asks for evidenceRisk under its neutral key, the text nullable and described with the rule, in both prompt variants', () => {
    expect(AUTOMATIC_DOSSIER_SCHEMA_VERSION).toBe(3);
    expect(INTERPRETER_PROMPT_VERSION).toBe(4);
    const schema = AUTOMATIC_DOSSIER_SCHEMA as {
      required: string[];
      properties: Record<string, { required: string[]; properties: Record<string, { type: unknown; description?: string }> }>;
    };
    expect(schema.required).toContain('evidenceRisk');
    expect(schema.properties.evidenceRisk!.required).toEqual(['text', 'evidenceSourceIds']);
    expect(schema.properties.evidenceRisk!.properties.text!.type).toEqual(['string', 'null']);
    expect(schema.properties.evidenceRisk!.properties.text!.description).toBe(EVIDENCE_RISK_RULE);
    for (const prompt of [SYSTEM_PROMPT_A, SYSTEM_PROMPT_B]) {
      expect(prompt).toContain(EVIDENCE_RISK_RULE);
      expect(prompt).toContain(`Good: "${EVIDENCE_RISK_GOOD}"`);
      expect(prompt).toContain(`Bad: "${EVIDENCE_RISK_BAD}"`);
    }
    expect(EVIDENCE_RISK_RULE).not.toContain(EM);
    // The bad example is itself removed by the guardrails it illustrates.
    expect(rule(EVIDENCE_RISK_BAD)).toBe('RISK_FORBIDDEN_WORDING');
  });
});
