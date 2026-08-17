/**
 * Which SEC forms matter, and which of them are worth fetching.
 *
 * Two separate questions, deliberately kept apart:
 *
 *   relevance — is this form capable of carrying a catalyst, share count,
 *               registration or financing fact?
 *   priority  — of the relevant ones, which do we spend a request on?
 *
 * The specification is explicit that we must not fetch every document merely
 * because it exists. Relevance filters the submissions index; priority then
 * bounds how many documents are actually retrieved.
 */

/** What a form can tell us. One form may serve several purposes. */
export type FormPurpose =
  | 'CATALYST'
  | 'SHARES_OUTSTANDING'
  | 'REGISTRATION'
  | 'RESALE'
  | 'FINANCING'
  | 'OWNERSHIP';

/**
 * Lifecycle grouping. Selection works family by family rather than over one
 * flat "most recent N" list, because those lists are dominated by whichever
 * form an issuer files most often — usually 8-K or 6-K — which pushes a still
 * operative shelf or resale prospectus off the end purely by date.
 */
export type FormFamily =
  | 'CURRENT_REPORT'
  | 'PERIODIC_REPORT'
  | 'REGISTRATION'
  | 'REGISTRATION_STATUS'
  | 'PROSPECTUS'
  | 'OWNERSHIP';

export interface FormSpec {
  family: FormFamily;
  purposes: FormPurpose[];
  /** Lower fetches first. */
  priority: number;
  /** True for the foreign-private-issuer reporting track. */
  foreignTrack?: boolean;
}

/**
 * How far back a family stays potentially operative, and how many documents
 * from it are worth retrieving.
 *
 * The windows differ because the documents differ in kind. A current report is
 * news and goes stale in weeks. A shelf registration is capacity that persists
 * for years — an S-3 shelf runs three years, so a filing from 2023 can still
 * govern what may be sold today, and excluding it on age would hide live
 * supply. Caps keep network use bounded without letting recency alone decide.
 */
export interface FamilyPolicy {
  lookbackMonths: number;
  maxFetch: number;
  rationale: string;
}

export const FAMILY_POLICIES: Record<FormFamily, FamilyPolicy> = {
  CURRENT_REPORT: {
    lookbackMonths: 9,
    maxFetch: 5,
    rationale: 'catalysts go stale quickly; recent reports only',
  },
  PERIODIC_REPORT: {
    lookbackMonths: 24,
    maxFetch: 2,
    rationale: 'latest annual and interim carry the share count',
  },
  REGISTRATION: {
    lookbackMonths: 48,
    maxFetch: 3,
    rationale: 'a shelf runs three years and stays operative',
  },
  REGISTRATION_STATUS: {
    lookbackMonths: 48,
    maxFetch: 2,
    rationale: 'effectiveness and withdrawal bound the registrations above',
  },
  PROSPECTUS: {
    lookbackMonths: 36,
    maxFetch: 4,
    rationale: 'resale prospectuses remain live supply for years',
  },
  OWNERSHIP: {
    lookbackMonths: 12,
    maxFetch: 1,
    rationale: 'holder context only; not a supply proof',
  },
};

/**
 * Domestic issuers report current events on 8-K; foreign private issuers use
 * 6-K and file 20-F/40-F annually instead of 10-K. Treating 8-K as "the"
 * current report would silently blind us to every catalyst at a foreign issuer,
 * which on the current Discovery board is a large minority of names.
 */
const CURRENT = 'CURRENT_REPORT' as const;
const PERIODIC = 'PERIODIC_REPORT' as const;
const REG = 'REGISTRATION' as const;
const REG_STATUS = 'REGISTRATION_STATUS' as const;
const PROSPECTUS = 'PROSPECTUS' as const;
const OWNERSHIP = 'OWNERSHIP' as const;

export const FORM_SPECS: Record<string, FormSpec> = {
  // Current events
  '8-K': { family: CURRENT, purposes: ['CATALYST', 'FINANCING'], priority: 1 },
  '8-K/A': { family: CURRENT, purposes: ['CATALYST', 'FINANCING'], priority: 2 },
  '6-K': { family: CURRENT, purposes: ['CATALYST', 'FINANCING'], priority: 1, foreignTrack: true },
  '6-K/A': { family: CURRENT, purposes: ['CATALYST', 'FINANCING'], priority: 2, foreignTrack: true },

  // Prospectuses: the sharp end of dilution and resale supply
  '424B5': { family: PROSPECTUS, purposes: ['FINANCING', 'RESALE', 'REGISTRATION'], priority: 1 },
  '424B4': { family: PROSPECTUS, purposes: ['FINANCING', 'RESALE', 'REGISTRATION'], priority: 1 },
  '424B3': { family: PROSPECTUS, purposes: ['FINANCING', 'RESALE', 'REGISTRATION'], priority: 1 },
  '424B1': { family: PROSPECTUS, purposes: ['FINANCING', 'RESALE', 'REGISTRATION'], priority: 2 },
  '424B2': { family: PROSPECTUS, purposes: ['FINANCING', 'RESALE', 'REGISTRATION'], priority: 2 },
  '424B7': { family: PROSPECTUS, purposes: ['RESALE', 'REGISTRATION'], priority: 2 },
  '424B8': { family: PROSPECTUS, purposes: ['RESALE', 'REGISTRATION'], priority: 2 },
  '424A': { family: PROSPECTUS, purposes: ['FINANCING', 'REGISTRATION'], priority: 3 },

  // Registration statements: capacity, not proof of issuance
  'S-1': { family: REG, purposes: ['REGISTRATION', 'RESALE'], priority: 1 },
  'S-1/A': { family: REG, purposes: ['REGISTRATION', 'RESALE'], priority: 2 },
  'S-3': { family: REG, purposes: ['REGISTRATION'], priority: 1 },
  'S-3/A': { family: REG, purposes: ['REGISTRATION'], priority: 2 },
  'S-3ASR': { family: REG, purposes: ['REGISTRATION'], priority: 1 },
  'S-8': { family: REG, purposes: ['REGISTRATION'], priority: 3 },
  'F-1': { family: REG, purposes: ['REGISTRATION', 'RESALE'], priority: 1, foreignTrack: true },
  'F-1/A': { family: REG, purposes: ['REGISTRATION', 'RESALE'], priority: 2, foreignTrack: true },
  'F-3': { family: REG, purposes: ['REGISTRATION'], priority: 1, foreignTrack: true },
  'F-3/A': { family: REG, purposes: ['REGISTRATION'], priority: 2, foreignTrack: true },
  'F-3ASR': { family: REG, purposes: ['REGISTRATION'], priority: 1, foreignTrack: true },
  'POS AM': { family: REG, purposes: ['REGISTRATION', 'RESALE'], priority: 1 },

  // Registration lifecycle: what became effective, what was withdrawn
  EFFECT: { family: REG_STATUS, purposes: ['REGISTRATION'], priority: 1 },
  RW: { family: REG_STATUS, purposes: ['REGISTRATION'], priority: 2 },

  // Periodic reports: share counts and structural context
  '10-Q': { family: PERIODIC, purposes: ['SHARES_OUTSTANDING', 'FINANCING'], priority: 1 },
  '10-K': { family: PERIODIC, purposes: ['SHARES_OUTSTANDING', 'FINANCING'], priority: 1 },
  '20-F': {
    family: PERIODIC,
    purposes: ['SHARES_OUTSTANDING', 'FINANCING'],
    priority: 1,
    foreignTrack: true,
  },
  '40-F': {
    family: PERIODIC,
    purposes: ['SHARES_OUTSTANDING', 'FINANCING'],
    priority: 1,
    foreignTrack: true,
  },

  // Reg A
  '1-A': { family: REG, purposes: ['REGISTRATION', 'FINANCING'], priority: 3 },
  '1-A/A': { family: REG, purposes: ['REGISTRATION', 'FINANCING'], priority: 3 },
  '253G2': { family: PROSPECTUS, purposes: ['FINANCING', 'REGISTRATION'], priority: 3 },

  // Ownership and restricted-stock supply context
  'SC 13D': { family: OWNERSHIP, purposes: ['OWNERSHIP'], priority: 1 },
  'SC 13D/A': { family: OWNERSHIP, purposes: ['OWNERSHIP'], priority: 2 },
  'SC 13G': { family: OWNERSHIP, purposes: ['OWNERSHIP'], priority: 2 },
  'SC 13G/A': { family: OWNERSHIP, purposes: ['OWNERSHIP'], priority: 3 },
  '144': { family: OWNERSHIP, purposes: ['OWNERSHIP', 'RESALE'], priority: 2 },
};

export function formFamily(form: string): FormFamily | null {
  return formSpec(form)?.family ?? null;
}

/** Forms whose presence indicates the foreign-private-issuer track. */
export const FOREIGN_TRACK_FORMS = new Set(
  Object.entries(FORM_SPECS)
    .filter(([, spec]) => spec.foreignTrack)
    .map(([form]) => form),
);

export function normaliseForm(form: string): string {
  return form.trim().toUpperCase();
}

export function formSpec(form: string): FormSpec | null {
  return FORM_SPECS[normaliseForm(form)] ?? null;
}

export function isRelevantForm(form: string): boolean {
  return formSpec(form) !== null;
}

export function formPurposes(form: string): FormPurpose[] {
  return formSpec(form)?.purposes ?? [];
}

/**
 * Whether a set of filed forms indicates a foreign private issuer.
 *
 * Returns null — not false — when the evidence does not establish it either
 * way. A company with neither 8-K nor 20-F in its recent history has told us
 * nothing, and recording that as "domestic" would be an invention.
 */
export function inferForeignIssuer(forms: readonly string[]): boolean | null {
  let foreign = 0;
  let domestic = 0;

  for (const raw of forms) {
    const form = normaliseForm(raw);
    if (FOREIGN_TRACK_FORMS.has(form)) foreign += 1;
    if (form === '8-K' || form === '10-K' || form === '10-Q') domestic += 1;
  }

  if (foreign === 0 && domestic === 0) return null;
  // A domestic filer never files 6-K or 20-F, so any foreign-track filing is
  // decisive even alongside forms both tracks can use.
  return foreign > 0;
}
