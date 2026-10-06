/**
 * THE COMPANY LINE (contract row 4): the company's name and country, from the
 * desk's own dossier, with the contract's three states (PRODUCED, UNKNOWN with
 * its reason, NOT_YET). It replaces the Sheet's "Country of Origin, Company",
 * which is going away; the Sheet row is only a fallback while it still exists.
 *
 * NO SEC CLAIM ON THE COUNTRY. `dossier.country` is a model-written string
 * (EDGAR codes copied from the bundle, and written-out names such as "Cayman
 * Islands"), checked against nothing, and the Sheet's fallback is not SEC at
 * all. So a dossier country carries "as recorded in the desk's research" and a
 * Sheet country carries no hover (Commercial 8a, 102596d0). The SEC sentence
 * returns only when the registry's code reaches the payload and the row reads
 * `edgarCountry` of it. `countryName` never guesses: a value it cannot decode
 * is an absent country, not a wrong one.
 *
 * Words: Marketing's (drawer-rows-words-2026-10-05.md); the country hover is
 * Commercial's (8a).
 */

import { withoutCitations } from '@/lib/research/citations';
import { countryName } from '@/lib/research/sec/stateCountry';

export const COMPANY_WORDS = {
  /** A dossier exists and states no company name. */
  noName: "No company name in the desk's research for this name.",
  /** No dossier at all. */
  notResearched: 'The desk has not researched this name.',
  countryAbsent: "Country: not in the desk's research",
  /** Only on a country from the dossier; a Sheet country has no hover. */
  countryHover: "Country as recorded in the desk's research.",
} as const;

export type CompanyState = 'PRODUCED' | 'UNKNOWN' | 'NOT_YET';

export interface CompanyLine {
  state: CompanyState;
  /** The name with its full stop, or the state's sentence when there is no name. */
  text: string;
  /** The country with its full stop, only with a name and a decodable country. */
  country: string | null;
  /** The detail row for an absent country, only when there is a name. */
  countryNote: string | null;
  /** True only when the shown country came from the dossier, not the Sheet: the hover's condition. */
  countryFromDossier: boolean;
  /** The whole line as one string (the board's hover). Null unless PRODUCED. */
  hint: string | null;
}

function clean(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const text = withoutCitations(value).trim();
  return text.length > 0 ? text : null;
}

/** A part that already ends a sentence takes no second stop (the report window's rule). */
const stop = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

export function companyLine(input: {
  /** The accepted dossier's identity fields, or null when there is no dossier. */
  dossier: { companyName: string | null; country: string | null } | null;
  /** The Sheet's values, a fallback only while the Sheet still feeds the app. */
  sheetName?: string | null;
  sheetCountry?: string | null;
}): CompanyLine {
  const name = clean(input.dossier?.companyName) ?? clean(input.sheetName);
  if (name === null) {
    return input.dossier === null
      ? { state: 'NOT_YET', text: COMPANY_WORDS.notResearched, country: null, countryNote: null, countryFromDossier: false, hint: null }
      : { state: 'UNKNOWN', text: COMPANY_WORDS.noName, country: null, countryNote: null, countryFromDossier: false, hint: null };
  }
  const fromDossier = countryName(input.dossier?.country);
  const country = fromDossier ?? clean(input.sheetCountry);
  const text = stop(name);
  return {
    state: 'PRODUCED',
    text,
    country: country ? stop(country) : null,
    countryNote: country ? null : COMPANY_WORDS.countryAbsent,
    countryFromDossier: fromDossier !== null,
    hint: country ? `${text} ${stop(country)}` : text,
  };
}
