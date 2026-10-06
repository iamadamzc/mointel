/**
 * The evidence risk sentence (contract row 20, "Warning Shot" in the Sheet):
 * ONE sentence stating the main risk CONDITION present in the evidence bundle,
 * with the source ids it rests on, or null. Design and word list:
 * `docs/research/warning-shot/design-2026-10-06.md` (Commercial claims reads 7,
 * 7a and 7b passed the text). His ruling, transcript d947056e,
 * 2026-10-06T00:22:29.450Z: "yes, build both".
 *
 * Every guardrail here REMOVES the text (it reads UNKNOWN), never repairs it,
 * and the removal is recorded ON THE FIELD, not as a `Violation`: any violation
 * turns the whole dossier's outcome PARTIAL (`pipeline.ts`, `downgraded`), which
 * the job stores as PARTIAL and the board can show as partial intelligence, and
 * a REJECT buys a repair call and can discard the whole dossier. A removed risk
 * sentence must cost neither.
 *
 * What no rule can check: that the condition named is the MAIN one. That is the
 * model's judgement, and the label (Marketing's) says it is the desk's reading.
 */

import { claimsIn, roundsTo, type DateClaim } from '../../desk/reports/traced';
import type { EvidenceRisk, EvidenceRiskRule, ResearchDossier, SupplyBlock } from '../types';
import type { ResearchEvidenceBundle } from './bundle';

/**
 * The rule, VERBATIM from the design's section 3 as Commercial 7b passed it.
 * The prompt and the schema description both carry it (the `catalystGrades.ts`
 * pattern), so the model reads the same words in both places it looks.
 */
export const EVIDENCE_RISK_RULE = [
  'evidenceRisk.text is ONE sentence that states the main risk CONDITION present in this bundle as of the bundle\'s date: a condition that exists in the evidence, for example an open supply program or capacity in the supply ledger, a cycle that reads as backside, a catalyst the desk reads as stale, secondary or conflicting, a reverse split history, a halt, or a share count the evidence cannot date.',
  'State the condition only. Never state what it could cause, lead to or mean for the price, and use no verb of likelihood or exposure ("may", "could", "likely", "faces", "risks", "at risk of", "exposed to").',
  'Past or present tense only.',
  'Say shares were issued, sold or are being sold ONLY when a supply block you cite is KNOWN_ACTIVE; otherwise say capacity or program, never activity.',
  'Never characterise the company or a person (no "toxic", "predatory", "fraud", "pump").',
  'Never an instruction, a recommendation, a forecast or an outcome.',
  'Cite the source ids the sentence rests on in evidenceRisk.evidenceSourceIds.',
  'If the bundle does not establish a risk condition, set text null; null is never a claim that there is no risk.',
].join(' ');

// Commercial 7e (6655d652): no figure and no stated absence in the example, which the prompt shows for every name
// and no guardrail could catch if copied; the placeholder itself is removed if copied ("template placeholder").
export const EVIDENCE_RISK_GOOD = 'The supply ledger shows an open at-the-market program of {amount}.';
export const EVIDENCE_RISK_BAD = 'The open program may dilute holders.';

/** The prompt's bullet: the rule, then one good and one bad example (design section 3). */
export function evidenceRiskPromptBlock(): string {
  return [
    `- ${EVIDENCE_RISK_RULE}`,
    `  Good: "${EVIDENCE_RISK_GOOD}"`,
    `  Bad: "${EVIDENCE_RISK_BAD}" (what it could cause, with a verb of likelihood)`,
  ].join('\n');
}

/** The first schema version whose dossiers carry `evidenceRisk`; older ones read NOT_YET. */
export const EVIDENCE_RISK_SINCE_SCHEMA = 3;

/** Guardrail 2: more words than this is not one sentence a trader reads at a glance. */
export const EVIDENCE_RISK_MAX_WORDS = 40;

/**
 * Guardrail 3, Commercial 7 item 2's list in full, word-bounded, case-insensitive.
 * The first group is the report checker's prose shapes (`lib/desk/reports/check.ts`
 * `FORBIDDEN`), copied rather than imported because that list also carries
 * report-only shapes (a count of names, "quiet", fit as a forecast) that are not
 * on this list. Known cost, stated in the design: "can" and "may" also remove a
 * few true sentences that restate terms; removal is the safe side.
 */
export const EVIDENCE_RISK_FORBIDDEN: Array<[RegExp, string]> = [
  // The report checker's shapes.
  [/\b(?:buy|buys|buying|sell|sells)\b|(?<!\b(?:proof of|confirmed|not) )\bselling\b/i, 'buy/sell'],
  [/\b(?:enter|enters|entered|entering|entry)\b/i, 'enter/entry'],
  [/\bexit\b(?!-and-avoid)/i, 'exit'],
  [/\b(?:get in|take it|keep an eye|one to watch|worth watching|watch (?:for|it|this|out))\b/i, 'directive'],
  [/\badd(?:ing)? to (?:a |the |your )?position\b/i, 'directive'],
  [/\b(?:shortable|short it|short the|fade (?:it|this|the))\b/i, 'short/fade as a trade'],
  [/\b(?:will|pop|pops|clearly|confirmed|guaranteed)\b/i, 'prediction or certainty'],
  [/\b(?:every name|all the movers|all movers|nothing else)\b/i, 'completeness'],
  [/\breal (?:catalyst|catalysts|move)\b/i, '"real" catalyst'],
  [/\bno catalyst\b(?! found in our sources)(?! in our sources)(?![^.;]*\bon file\b)/i, 'bare "no catalyst"'],
  [/\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b/, 'engine constant'],
  [/\u2014|&mdash;|&#8212;|&#x2014;/i, 'em dash'],
  [/\s-\s/, 'spaced hyphen as a dash'],
  [/\bavoid\b/i, 'avoid'],
  // The good example's "{amount}" copied as written (Commercial 7e removed the figure from the example).
  [/[{}]/, 'template placeholder'],
  // Modals and likelihood. "May" before a number is the month ("May 5", "May 2026"), never the modal.
  [/\bmay\b(?!\s+\d)/i, 'modal or likelihood'],
  [/\b(?:might|could|should|would|can|likely|unlikely|probably|expected|poised|set to|about to|going to|bound to|soon|imminent|upcoming)\b/i, 'modal or likelihood'],
  // Exposure and danger.
  [/\b(?:risks|faces|threatens|at risk of|exposed to|vulnerable to|danger|dangerous|beware)\b/i, 'exposure or danger'],
  // Characterisation as wrongdoing.
  [/\b(?:fraud|scam|pump|dump|manipulation|toxic|predatory)\b/i, 'characterisation'],
];

/**
 * Guardrail 4 (Commercial 7 item 3, widened by 7a item 1): an issuance, selling
 * or dilution ACTIVITY or EFFECT word. Each is an act that happened or is
 * happening; nothing is diluted until shares are issued. Negated forms ("no
 * shares sold") match too, which errs safe.
 */
export const EVIDENCE_RISK_ACTIVITY =
  /\b(?:issued|issuing|issuance|sold|selling|sells|dilute|dilutes|diluted|diluting|dilutive|dilution|raised|converted|exercised)\b/i;

const FLOAT_WORD = /\bfloat\b/i;

/** One sentence: at most one sentence-ending stop (a stop followed by space or the end; "4.5" is not one). */
function sentenceStops(text: string): number {
  return (text.match(/[.!?](?=\s|$)/g) ?? []).length;
}

/** Whether a claimed date names `asOf` (YYYY-MM-DD) at the claim's own precision. */
function namesDate(claim: DateClaim, asOf: string): boolean {
  if (claim.value === asOf) return true;
  if (claim.value.startsWith('--')) return asOf.slice(4) === claim.value.slice(1);
  return claim.value.length === 7 && asOf.startsWith(claim.value);
}

/** Guardrail 5: the dossier's share counts, each with the date it must be stated beside. */
function shareCounts(dossier: ResearchDossier, bundle: ResearchEvidenceBundle): Array<{ count: number; asOf: string | null }> {
  const out: Array<{ count: number; asOf: string | null }> = [];
  const modelCount = dossier.structure.sharesOutstanding;
  if (typeof modelCount === 'number' && modelCount > 0) {
    out.push({ count: modelCount, asOf: dossier.structure.sharesOutstandingDate?.slice(0, 10) ?? null });
  }
  const reported = bundle.reportedSharesOutstanding;
  if (reported && reported.shares > 0) out.push({ count: reported.shares, asOf: reported.asOf?.slice(0, 10) ?? null });
  return out;
}

function removed(risk: EvidenceRisk, rule: EvidenceRiskRule, detail: string): EvidenceRisk {
  return { text: null, evidenceSourceIds: risk.evidenceSourceIds, removed: { rule, detail, text: risk.text } };
}

/**
 * Applies guardrails 1 to 5 to the model's sentence, in order; the first that
 * fires removes it. `ledger` is the CORRECTED supply ledger (after
 * `validateSupplyBlock`), so "KNOWN_ACTIVE" means what the stored dossier says.
 * Guardrail 6 (no em dash on any reader) is `withoutEmDash` at read time; an em
 * dash in the text is also a guardrail 3 shape, so it never survives to a reader.
 */
export function validateEvidenceRisk(
  risk: EvidenceRisk | null | undefined,
  dossier: ResearchDossier,
  ledger: readonly SupplyBlock[],
  bundle: ResearchEvidenceBundle,
): EvidenceRisk | null {
  if (!risk) return null;
  const clean: EvidenceRisk = { text: risk.text?.trim() || null, evidenceSourceIds: [...risk.evidenceSourceIds], removed: null };
  const text = clean.text;
  if (text === null) return clean;

  // 1. Requires a source in this bundle.
  const citable = new Set(bundle.sources.map((source) => source.id));
  if (clean.evidenceSourceIds.length === 0) return removed(clean, 'RISK_REQUIRES_SOURCE', 'no evidence source id');
  const foreign = clean.evidenceSourceIds.find((id) => !citable.has(id));
  if (foreign !== undefined) return removed(clean, 'RISK_REQUIRES_SOURCE', `source id ${foreign} is not in the bundle`);

  // 2. One sentence.
  const words = text.split(/\s+/).filter(Boolean).length;
  if (sentenceStops(text) > 1 || words > EVIDENCE_RISK_MAX_WORDS) {
    return removed(clean, 'RISK_NOT_ONE_SENTENCE', `${sentenceStops(text)} stops, ${words} words`);
  }

  // 3. Forbidden wording.
  for (const [shape, label] of EVIDENCE_RISK_FORBIDDEN) {
    if (shape.test(text)) return removed(clean, 'RISK_FORBIDDEN_WORDING', label);
  }

  // 4. Activity follows the ledger: a cited id must belong to a KNOWN_ACTIVE block.
  if (EVIDENCE_RISK_ACTIVITY.test(text)) {
    const cited = new Set(clean.evidenceSourceIds);
    const active = ledger.some((block) => block.status === 'KNOWN_ACTIVE' && block.evidenceSourceIds.some((id) => cited.has(id)));
    if (!active) return removed(clean, 'RISK_ACTIVITY_WITHOUT_ACTIVE_BLOCK', String(text.match(EVIDENCE_RISK_ACTIVITY)![0]));
  }

  // 5. Float and shares: "float" beside a number; a share count without its as-of date.
  const claims = claimsIn(text);
  if (FLOAT_WORD.test(text) && claims.numbers.length > 0) return removed(clean, 'RISK_SHARES_RULE', 'float beside a number');
  for (const { count, asOf } of shareCounts(dossier, bundle)) {
    if (!claims.numbers.some((claim) => roundsTo(count, claim))) continue;
    if (asOf === null || !claims.dates.some((date) => namesDate(date, asOf))) {
      return removed(clean, 'RISK_SHARES_RULE', `share count ${count} without its as-of date`);
    }
  }
  return clean;
}

export type EvidenceRiskState =
  | { state: 'PRODUCED'; text: string; evidenceSourceIds: number[] }
  | { state: 'UNKNOWN'; removedBy: EvidenceRiskRule | null }
  | { state: 'NOT_YET' };

/**
 * The reader's three states (design section 2). NOT_YET: the dossier predates
 * schema 3 (a reused dossier keeps its old schema until its evidence changes).
 * UNKNOWN: the model returned null, or a guardrail removed the text; never a
 * claim that there is no risk. The removed text is never returned.
 */
export function evidenceRiskState(
  dossier: Pick<ResearchDossier, 'evidenceRisk'>,
  schemaVersion: number | null,
): EvidenceRiskState {
  if (schemaVersion === null || schemaVersion < EVIDENCE_RISK_SINCE_SCHEMA) return { state: 'NOT_YET' };
  const risk = dossier.evidenceRisk;
  if (risk?.text) return { state: 'PRODUCED', text: risk.text, evidenceSourceIds: [...risk.evidenceSourceIds] };
  return { state: 'UNKNOWN', removedBy: risk?.removed?.rule ?? null };
}
