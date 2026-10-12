/**
 * The catalyst's TAGS, saved at research time so the session reports can COUNT them (the theme line, option C: his
 * yes, Integration chat 5544e519, uuid 1dfaf519, 2026-10-11T20:04:41.211Z; his list review and "yes to both",
 * uuid 52773fb8, 2026-10-12T17:19:00.133Z; sizing cd4b2b0e). No model call in the report.
 *
 * Four tags, from the same cited source the catalyst already rests on:
 * - catalystThemes: the TOPICS the event is substantively about (several allowed; empty = none of the topics);
 * - catalystPassingThemes: topics the source only mentions in passing (never counted);
 * - catalystEvent: WHAT HAPPENED, one type;
 * - catalystDealStatus: where a deal stands (proposed, signed, completed, updated), or null when it is not a deal.
 *
 * Commercial read 72, conditions 1 and 2 (binding): the tag is the subject of the EVENT the cited source reports, not a
 * word in it; NO_CATALYST is set by CODE from the final catalystStatus NONE_FOUND (guardrails.ts), never picked by the
 * model; the model tags only when the status is FRESH_FOUND or SECONDARY_STALE; CONFLICTING, UNKNOWN and unresearched
 * store no tags.
 *
 * ONE constant per list. A change from him is a one-line edit here, with the schema bump it implies.
 */

/** The topics, with what each covers (his words for the seven he added, 2026-10-12; Commercial reads the rest). */
export const CATALYST_THEMES = [
  { id: 'AI', covers: 'artificial intelligence: AI models, AI software and services, deals the source names as AI' },
  { id: 'SEMICONDUCTORS_COMPUTING', covers: 'chips, data centers, cloud infrastructure, networking' },
  { id: 'ROBOTICS_AUTOMATION', covers: 'industrial robots, autonomous systems, warehouse automation' },
  { id: 'SPACE_SATELLITES', covers: 'launches, satellite networks, space contracts' },
  { id: 'CRITICAL_MINERALS_METALS', covers: 'rare earths, lithium, uranium mining, resource discoveries' },
  { id: 'EV_BATTERIES', covers: 'electric vehicles, charging, battery technology' },
  { id: 'FINTECH_PAYMENTS', covers: 'payments, lending, trading platforms, financial infrastructure' },
  { id: 'CONSUMER_RETAIL', covers: 'consumer products, retail, entertainment, gaming' },
  { id: 'CRYPTO', covers: 'cryptocurrency, blockchain, digital asset treasuries, digital asset mining' },
  { id: 'QUANTUM', covers: 'quantum computing, quantum sensing, quantum communication' },
  { id: 'DEFENSE', covers: 'military and national security customers, defense contracts, weapons systems' },
  { id: 'DRONES', covers: 'uncrewed aerial and other uncrewed vehicles, commercial or military' },
  { id: 'ENERGY', covers: 'oil, gas, power generation, renewables, grid and storage, not nuclear' },
  { id: 'NUCLEAR', covers: 'nuclear power, reactors including small modular reactors, nuclear fuel services' },
  { id: 'BIOTECH_MEDICAL', covers: 'drugs, biologics, clinical trials, medical devices, diagnostics, healthcare services' },
] as const;

export type CatalystTheme = (typeof CATALYST_THEMES)[number]['id'];
export const CATALYST_THEME_IDS: readonly CatalystTheme[] = CATALYST_THEMES.map((theme) => theme.id);

/** What happened: his ten (2026-10-12), with examples from his note. */
export const CATALYST_EVENTS = [
  { id: 'COMMERCIAL_AGREEMENT', covers: 'a customer contract, purchase order, licensing or distribution agreement with a company' },
  { id: 'PARTNERSHIP', covers: 'joint development or strategic collaboration, with no purchase committed' },
  { id: 'M_AND_A_STRATEGIC', covers: 'an acquisition, merger, asset sale or takeover offer' },
  { id: 'FINANCIAL_RESULTS_OUTLOOK', covers: 'earnings, a revenue update, a guidance change' },
  { id: 'REGULATORY_CLINICAL', covers: 'an approval, trial results, a regulatory designation' },
  { id: 'PRODUCT_TECH_MILESTONE', covers: 'a launch, a demonstrated breakthrough, a patent' },
  { id: 'FINANCING_CAPITAL', covers: 'an offering, an investment, a debt restructuring, a buyback' },
  { id: 'GOVERNMENT_POLICY', covers: 'a grant, a procurement award from a government body, a policy change' },
  { id: 'CORPORATE_LISTING', covers: 'a leadership change, activist involvement, listing compliance' },
  { id: 'OTHER_MATERIAL', covers: 'a litigation outcome, an operational milestone, any material event outside these' },
] as const;

export type CatalystEventType = (typeof CATALYST_EVENTS)[number]['id'];
/** Set only by code, from the final catalystStatus NONE_FOUND (Commercial 72, condition 2). Never in the model's enum. */
export const NO_CATALYST = 'NO_CATALYST';
export type CatalystEvent = CatalystEventType | typeof NO_CATALYST;

export const CATALYST_DEAL_STATUSES = ['PROPOSED', 'SIGNED', 'COMPLETED', 'UPDATED'] as const;
export type CatalystDealStatus = (typeof CATALYST_DEAL_STATUSES)[number];

/**
 * The model's words for "none", strings because every enum in this schema is strings (a null inside a strict enum
 * has no precedent here). The guardrail turns each into null; neither is ever stored.
 */
export const MODEL_NO_EVENT = 'NOT_LOCATED';
export const MODEL_NOT_A_DEAL = 'NOT_A_DEAL';

export const MODEL_EVENT_ENUM: readonly string[] = [...CATALYST_EVENTS.map((event) => event.id), MODEL_NO_EVENT];
export const MODEL_DEAL_ENUM: readonly string[] = [...CATALYST_DEAL_STATUSES, MODEL_NOT_A_DEAL];

/** The schema descriptions: what the model is told in the schema, matching the prompt block. */
export const CATALYST_THEMES_DESCRIPTION =
  'The topics the event in the cited catalyst source is substantively about; several when the link is substantive; ' +
  'empty when it is about none of them, or when catalystStatus is not FRESH_FOUND or SECONDARY_STALE.';
export const CATALYST_PASSING_THEMES_DESCRIPTION =
  'Topics the cited source only mentions in passing. Never a topic already in catalystThemes. Empty when none.';
export const CATALYST_EVENT_DESCRIPTION =
  `What happened, one type. ${MODEL_NO_EVENT} when catalystStatus is not FRESH_FOUND or SECONDARY_STALE.`;
export const CATALYST_DEAL_STATUS_DESCRIPTION =
  `Where the deal in the event stands. ${MODEL_NOT_A_DEAL} when the event is not a deal, or when catalystStatus is ` +
  'not FRESH_FOUND or SECONDARY_STALE.';

/** The prompt's rule, in both variants. */
export function catalystThemePromptBlock(): string {
  const topics = CATALYST_THEMES.map((theme) => `    ${theme.id}: ${theme.covers}`).join('\n');
  const events = CATALYST_EVENTS.map((event) => `    ${event.id}: ${event.covers}`).join('\n');
  return [
    '- The catalyst tags describe the EVENT the cited catalyst source reports: what the company announced, signed,',
    '  acquired or launched, not a word that appears in the source, and never the company\'s industry alone. Tag',
    `  only when catalystStatus is FRESH_FOUND or SECONDARY_STALE; otherwise empty lists, ${MODEL_NO_EVENT} and`,
    `  ${MODEL_NOT_A_DEAL}.`,
    '  catalystThemes: every topic the event is substantively about, from this list (empty when none applies):',
    topics,
    '  catalystPassingThemes: topics the source mentions only in passing; never one already in catalystThemes.',
    '  catalystEvent: what happened, one type. When two fit, pick the one the event is first about. A contract or',
    '  award from a government body is GOVERNMENT_POLICY; one from a company is COMMERCIAL_AGREEMENT; working',
    '  together with no purchase committed is PARTNERSHIP.',
    events,
    '  catalystDealStatus, for an event that is a deal: PROPOSED (a letter of intent, a non-binding proposal, an',
    '  offer not yet accepted), SIGNED (a definitive agreement not yet closed), COMPLETED (closed, consummated or',
    '  delivered), UPDATED (an amendment, extension or restatement of a deal announced earlier, or earlier news',
    `  headlined again); ${MODEL_NOT_A_DEAL} when the event is not a deal.`,
  ].join('\n');
}

export interface CatalystTags {
  themes: CatalystTheme[] | null;
  passingThemes: CatalystTheme[] | null;
  event: CatalystEvent | null;
  dealStatus: CatalystDealStatus | null;
}

/**
 * The stored tags of a dossier, as a counter must read them:
 * - 'NOT_TAGGED': a version written before schema 4 (no tag fields). Never filled in later.
 * - nulls: written, not established (the catalyst status was CONFLICTING or UNKNOWN). A counter reads these as
 *   "not tagged", never as "no topic".
 * - themes []: tagged, about none of the topics (a NONE_FOUND name carries [] with event NO_CATALYST).
 */
export function catalystTagsOf(dossier: {
  catalyst: {
    catalystThemes?: CatalystTheme[] | null;
    catalystPassingThemes?: CatalystTheme[] | null;
    catalystEvent?: CatalystEvent | null;
    catalystDealStatus?: CatalystDealStatus | null;
  };
}): CatalystTags | 'NOT_TAGGED' {
  const c = dossier.catalyst;
  if (c.catalystThemes === undefined) return 'NOT_TAGGED';
  return {
    themes: c.catalystThemes,
    passingThemes: c.catalystPassingThemes ?? null,
    event: c.catalystEvent ?? null,
    dealStatus: c.catalystDealStatus ?? null,
  };
}
