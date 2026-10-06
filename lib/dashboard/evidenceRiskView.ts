/**
 * RISK IN THE EVIDENCE (contract row 20, the Sheet's "Warning Shot"): the
 * desk's one sentence naming a risk condition the evidence shows, read from
 * the dossier through Research's `evidenceRiskState`, never from the stored
 * field directly. That reader returns the rule that removed a sentence, never
 * the removed text (Commercial 7e), and this module prints nothing from the
 * rule either: a removal and a model null read the same, "Unknown".
 *
 * Three conditions travel with the sentence on every surface:
 * - DATED, never bare: "as of {time} ET", where the time is the generatedAt of
 *   the research version the sentence comes from (the bundle's date, which the
 *   sentence is true of), NEVER a checkpoint time: a checkpoint can cite a
 *   version written days earlier (Commercial 7g, 7edad531, correcting 7a item
 *   2). With no generatedAt the sentence is not shown (it reads Unknown).
 * - SOURCES BESIDE IT, or no "cited" claim (Commercial 7 item 5): the sources
 *   the sentence cites, resolved against the version's evidence, under the
 *   catalyst block's label. When none resolve, the label goes and nothing here
 *   says or implies the sentence is sourced.
 * - The Sheet's name "Warning Shot" prints nowhere (Commercial 7 item 4).
 *
 * Words: Marketing v3 (`docs/marketing/warning-shot-confirmation-words-2026-10-06.md`
 * at 6fed4658), passed by Commercial (2c350906).
 */

import { CATALYST_SOURCES_LABEL, catalystSources, type CatalystSource } from '@/lib/dashboard/catalystView';
import { checkpointTimeET } from '@/lib/dashboard/setupGrade';
import { evidenceRiskState } from '@/lib/research/interpret/evidenceRisk';
import type { ResearchDossier } from '@/lib/research/types';
import type { AutoIntelligence, EvidenceLink } from '@/lib/research/view';

export const EVIDENCE_RISK_WORDS = {
  label: 'Risk in the evidence',
  labelHover:
    "One sentence from the desk's research: its reading of a risk the evidence shows for this name. It is the desk's reading and not a recommendation.",
  sourcesLabel: CATALYST_SOURCES_LABEL,
  unknown: 'Unknown',
  unknownHover: 'The desk is not showing a risk for this name. That is not a finding that there is no risk.',
  notYet: 'Not recorded',
  notYetHover: "This name's research was written before the desk recorded this field.",
} as const;

export type EvidenceRiskViewState = 'PRODUCED' | 'UNKNOWN' | 'NOT_YET';

export interface EvidenceRiskView {
  state: EvidenceRiskViewState;
  /** The sentence for PRODUCED, or the state's face. */
  text: string;
  /** "as of 21:40 ET" (a date with it on another day). Only for PRODUCED. */
  asOf: string | null;
  /** The face's hover for UNKNOWN and NOT_YET; null for PRODUCED. */
  hover: string | null;
  /** The cited sources, resolved; empty means no sources label is shown. */
  sources: CatalystSource[];
}

export function evidenceRiskView(input: {
  dossier: Pick<ResearchDossier, 'evidenceRisk'> | null;
  schemaVersion: number | null;
  /** The generatedAt of the version the sentence comes from. Null: the sentence is not shown. */
  versionGeneratedAt: string | null;
  evidence: readonly EvidenceLink[];
  nowIso: string;
}): EvidenceRiskView {
  const notYet: EvidenceRiskView = {
    state: 'NOT_YET',
    text: EVIDENCE_RISK_WORDS.notYet,
    asOf: null,
    hover: EVIDENCE_RISK_WORDS.notYetHover,
    sources: [],
  };
  const unknown: EvidenceRiskView = {
    state: 'UNKNOWN',
    text: EVIDENCE_RISK_WORDS.unknown,
    asOf: null,
    hover: EVIDENCE_RISK_WORDS.unknownHover,
    sources: [],
  };
  if (input.dossier === null) return notYet;

  const read = evidenceRiskState(input.dossier, input.schemaVersion);
  if (read.state === 'NOT_YET') return notYet;
  if (read.state === 'UNKNOWN') return unknown;

  // Never bare: a sentence with no instant to date it to is not shown.
  const at = input.versionGeneratedAt;
  if (at === null || !Number.isFinite(Date.parse(at))) return unknown;

  return {
    state: 'PRODUCED',
    text: read.text,
    // The grade's ET form (a bare clock on the reader's day, the date with it otherwise), not its instant.
    asOf: `as of ${checkpointTimeET(at, input.nowIso)} ET`,
    hover: null,
    sources: catalystSources(read.evidenceSourceIds, input.evidence),
  };
}

/**
 * The same reading for the MCP tools, which publish JSON rather than a drawer:
 * the state, the sentence with its as-of beside it, and its sources resolved,
 * so a tool reader gets exactly what the drawer shows and nothing the dossier
 * stores beyond it. `withoutEvidenceRisk` removes the raw field from the
 * dossier the tools also publish, so this is the only copy that leaves.
 */
export function evidenceRiskForTools(intel: AutoIntelligence | null, nowIso: string) {
  const view = evidenceRiskView({
    dossier: intel?.analysis?.dossier ?? null,
    schemaVersion: intel?.schemaVersion ?? null,
    versionGeneratedAt: intel?.generatedAt ?? null,
    evidence: intel?.evidence ?? [],
    nowIso,
  });
  return {
    label: EVIDENCE_RISK_WORDS.label,
    // A tool reader has no hover: the label's approved hover travels with it.
    about: EVIDENCE_RISK_WORDS.labelHover,
    state: view.state,
    text: view.text,
    asOf: view.asOf,
    note: view.hover,
    sources: view.sources.map(({ link, day }) => ({ date: day, title: link.title ?? link.secForm, url: link.url })),
  };
}

/** The dossier without its stored `evidenceRisk`: every published copy goes through `evidenceRiskForTools`. */
export function withoutEvidenceRisk<T extends { evidenceRisk?: unknown }>(dossier: T): Omit<T, 'evidenceRisk'> {
  const { evidenceRisk: _omitted, ...rest } = dossier;
  void _omitted;
  return rest;
}
