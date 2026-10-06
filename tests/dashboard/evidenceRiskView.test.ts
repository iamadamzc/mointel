import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  EVIDENCE_RISK_WORDS,
  evidenceRiskForTools,
  evidenceRiskView,
  withoutEvidenceRisk,
} from '@/lib/dashboard/evidenceRiskView';
import type { EvidenceRisk } from '@/lib/research/types';
import type { AutoIntelligence, EvidenceLink } from '@/lib/research/view';

const EM_DASH = String.fromCharCode(0x2014);
const link = (id: number, publishedAt: string | null = '2026-08-17T12:15:00.000Z'): EvidenceLink => ({
  id,
  title: `T${id}`,
  url: `https://example.test/${id}`,
  authority: 'PRIMARY',
  sourceType: 'SEC_FILING',
  secForm: null,
  accession: null,
  publishedAt,
  publishedPrecision: 'EXACT',
});

const SENTENCE = 'The supply ledger shows an open at-the-market program of $40 million.';
const REMOVED = 'The open program may dilute holders, a sentence no reader may see.';
// 21:40 ET on 2026-08-17 (EDT).
const WRITTEN = '2026-08-18T01:40:00.000Z';
const SAME_DAY_NOW = '2026-08-18T02:00:00.000Z';
const NEXT_DAY_NOW = '2026-08-18T14:00:00.000Z';

const produced = (ids = [7]): { evidenceRisk: EvidenceRisk } => ({
  evidenceRisk: { text: SENTENCE, evidenceSourceIds: ids, removed: null },
});
/*
 * Research no longer stores the removed sentence (e0e96953), but a stored row is
 * JSON read back without a type check, so the fixture still carries one: the
 * surfaces must not depend on the writer for this.
 */
const removedByCheck = (): { evidenceRisk: EvidenceRisk } => ({
  evidenceRisk: {
    text: null,
    evidenceSourceIds: [7],
    removed: { rule: 'RISK_FORBIDDEN_WORDING', detail: 'modal or likelihood', text: REMOVED },
  } as unknown as EvidenceRisk,
});

const view = (over: Partial<Parameters<typeof evidenceRiskView>[0]> = {}) =>
  evidenceRiskView({
    dossier: produced(),
    schemaVersion: 3,
    versionGeneratedAt: WRITTEN,
    evidence: [link(7), link(8)],
    nowIso: SAME_DAY_NOW,
    ...over,
  });

describe('the three states, in Marketing v3 words', () => {
  it('PRODUCED: the sentence, dated by its version, with its own cited sources', () => {
    const v = view();
    expect(v).toMatchObject({ state: 'PRODUCED', text: SENTENCE, asOf: 'as of 21:40 ET', hover: null });
    expect(v.sources.map((s) => s.link.id)).toEqual([7]);
  });

  it('dates with the day when the version was written on another ET day', () => {
    expect(view({ nowIso: NEXT_DAY_NOW }).asOf).toBe('as of Aug 17, 21:40 ET');
  });

  it('UNKNOWN: a model null and a removal by a check read the same, with one hover', () => {
    for (const dossier of [{ evidenceRisk: { text: null, evidenceSourceIds: [], removed: null } }, removedByCheck()]) {
      expect(view({ dossier })).toEqual({
        state: 'UNKNOWN',
        text: 'Unknown',
        asOf: null,
        hover: 'The desk is not showing a risk for this name. That is not a finding that there is no risk.',
        sources: [],
      });
    }
  });

  it('NOT_YET: research written before schema 3, a schema-3 version without the field still reads Unknown', () => {
    for (const schemaVersion of [null, 1, 2]) {
      expect(view({ schemaVersion })).toMatchObject({ state: 'NOT_YET', text: 'Not recorded' });
    }
    expect(view({ dossier: null }).state).toBe('NOT_YET');
    expect(view({ dossier: {} }).state).toBe('UNKNOWN');
    expect(view({ schemaVersion: 2 }).hover).toBe("This name's research was written before the desk recorded this field.");
  });

  it('never bare: a sentence with no version time is not shown', () => {
    for (const versionGeneratedAt of [null, 'not a time']) {
      expect(view({ versionGeneratedAt }).state).toBe('UNKNOWN');
    }
  });

  it('shows no sources label when none of the cited ids resolve, so it claims none', () => {
    expect(view({ dossier: produced([99]) }).sources).toEqual([]);
    const source = readFileSync('components/AutomaticIntelligence.tsx', 'utf8');
    expect(source).toContain('if (sources.length === 0) return null;');
  });
});

describe('the removed sentence never leaves (Commercial 7e)', () => {
  it('no part of a removed sentence is in the drawer view or the tool output', () => {
    const intel = {
      analysis: { dossier: removedByCheck() },
      schemaVersion: 3,
      generatedAt: WRITTEN,
      evidence: [link(7)],
    } as unknown as AutoIntelligence;
    const out = JSON.stringify([view({ dossier: removedByCheck() }), evidenceRiskForTools(intel, SAME_DAY_NOW)]);
    expect(out).not.toContain('dilute');
    expect(out).not.toContain('RISK_FORBIDDEN_WORDING');
    expect(out).not.toContain('modal or likelihood');
  });

  it('the dossier the tools publish has no evidenceRisk at all', () => {
    const stripped = withoutEvidenceRisk({ ticker: 'ABC', ...removedByCheck() });
    expect(stripped).toEqual({ ticker: 'ABC' });
    expect(JSON.stringify(stripped)).not.toContain('dilute');
  });

  it('get_ticker publishes the reading, not the stored field', () => {
    const tools = readFileSync('lib/mcp/tools.ts', 'utf8');
    expect(tools).toContain('riskInTheEvidence: evidenceRiskForTools(row.intelligence, new Date().toISOString())');
    expect(tools).toContain('dossier: withoutEvidenceRisk(intelligence.analysis.dossier)');
  });

  it('the tool output carries the sentence with its date, sources and the label hover', () => {
    const intel = {
      analysis: { dossier: produced() },
      schemaVersion: 3,
      generatedAt: WRITTEN,
      evidence: [link(7)],
    } as unknown as AutoIntelligence;
    expect(evidenceRiskForTools(intel, SAME_DAY_NOW)).toEqual({
      label: 'Risk in the evidence',
      about: EVIDENCE_RISK_WORDS.labelHover,
      state: 'PRODUCED',
      text: SENTENCE,
      asOf: 'as of 21:40 ET',
      note: null,
      sources: [{ date: 'Aug 17', title: 'T7', url: 'https://example.test/7' }],
    });
  });
});

describe('words', () => {
  it("are Marketing v3's, verbatim, and the Sheet's name prints nowhere", () => {
    expect(EVIDENCE_RISK_WORDS.label).toBe('Risk in the evidence');
    expect(EVIDENCE_RISK_WORDS.labelHover).toBe(
      "One sentence from the desk's research: its reading of a risk the evidence shows for this name. It is the desk's reading and not a recommendation.",
    );
    expect(EVIDENCE_RISK_WORDS.sourcesLabel).toBe('Sources the desk read');
    const all = Object.values(EVIDENCE_RISK_WORDS).join(' ');
    expect(all).not.toMatch(/warning shot/i);
    expect(all).not.toContain(EM_DASH);
    expect(all).not.toMatch(/\bcited\b/i);
  });

  it('the drawer section carries the label hover and the as-of beside the sentence', () => {
    const source = readFileSync('components/AutomaticIntelligence.tsx', 'utf8');
    expect(source).toContain('<Section title={EVIDENCE_RISK_WORDS.label} titleHover={EVIDENCE_RISK_WORDS.labelHover}>');
    expect(source).toContain('{risk.text} <span className="text-ink-3">({risk.asOf})</span>');
    expect(source).toContain('versionGeneratedAt: intel.generatedAt,');
  });
});
