/**
 * SUPPLY EVIDENCE, GROUPED AS THE SHEET GROUPED IT (contract row 18): 8-K / 6-K,
 * Registration / Prospectus, Offerings / ATM / PIPE, Warrants / Convertibles,
 * Other share structure, and the structure's source links. Built from the
 * dossier's supply ledger, its known registration status and the filings it
 * cites; nothing is added and nothing is re-judged here, the ledger's own
 * blocks are only sorted into the groups a trader read them in.
 *
 * AN EMPTY GROUP SAYS SO. Every reproduced field shows its state, never a blank
 * (contract rule), so a group with nothing in it is marked empty and the drawer
 * prints Marketing's sentence for it instead of dropping the heading.
 *
 * Words: the group names are the Sheet's own column names, and the empty
 * sentence is a placeholder: both are Marketing's to confirm (requested).
 */

import { humanise } from '@/lib/dashboard/language';
import type { StructureFindings, SupplyBlock, SupplyBlockType } from '@/lib/research/types';
import type { EvidenceLink } from '@/lib/research/view';

export type SupplyGroupKey = 'FILINGS' | 'REGISTRATION' | 'OFFERINGS' | 'WARRANTS' | 'OTHER' | 'SOURCES';

export const SUPPLY_GROUP_LABEL: Record<SupplyGroupKey, string> = {
  FILINGS: '8-K / 6-K',
  REGISTRATION: 'Registration / Prospectus',
  OFFERINGS: 'Offerings / ATM / PIPE',
  WARRANTS: 'Warrants / Convertibles',
  OTHER: 'Other share structure',
  SOURCES: 'Structure sources',
};

/** PLACEHOLDER, owed by Marketing: the line for a group with nothing in it. */
export const SUPPLY_GROUP_EMPTY = "None in the desk's research.";

/** Which group a ledger block type belongs to. Exhaustive: a new type is a compile error. */
const BLOCK_GROUP: Record<SupplyBlockType, Exclude<SupplyGroupKey, 'FILINGS' | 'SOURCES'>> = {
  REGISTERED_RESALE: 'REGISTRATION',
  SHELF_CAPACITY: 'REGISTRATION',
  ATM: 'OFFERINGS',
  PIPE: 'OFFERINGS',
  EQUITY_PURCHASE_AGREEMENT: 'OFFERINGS',
  RECENT_OFFERING: 'OFFERINGS',
  WARRANTS: 'WARRANTS',
  CONVERTIBLES: 'WARRANTS',
  PREFERRED_CONVERSION: 'WARRANTS',
  ACQUISITION_SHARES: 'OTHER',
  OTHER_ISSUED_SHARES: 'OTHER',
};

export interface SupplyLine {
  text: string;
  sourceIds: number[];
}

export interface SupplyGroup {
  key: SupplyGroupKey;
  label: string;
  lines: SupplyLine[];
  /** The cited filings that belong to this group, deduplicated, in the order cited. */
  links: EvidenceLink[];
  empty: boolean;
}

export function blockLine(block: SupplyBlock): SupplyLine {
  const amount =
    block.amountShares !== null
      ? ` · ${block.amountShares.toLocaleString()} shares`
      : block.dollarCapacity !== null
        ? ` · $${block.dollarCapacity.toLocaleString()} capacity`
        : '';
  const registration = block.registrationStatus ? ` · ${humanise(block.registrationStatus)}` : '';
  return {
    text: `${humanise(block.type)} · ${humanise(block.status)}${amount}${registration}`,
    sourceIds: block.evidenceSourceIds,
  };
}

const CURRENT_REPORT = /^(8-K|6-K)/i;
const PROSPECTUS = /^(S-\d|F-\d|424B|POS|SF-)/i;

export function supplyGroups(
  structure: Pick<StructureFindings, 'supplyLedger' | 'knownRegistrationStatus' | 'evidenceSourceIds'>,
  evidence: readonly EvidenceLink[],
): SupplyGroup[] {
  const byId = new Map(evidence.map((link) => [link.id, link]));
  const lines: Record<SupplyGroupKey, SupplyLine[]> = {
    FILINGS: [],
    REGISTRATION: [],
    OFFERINGS: [],
    WARRANTS: [],
    OTHER: [],
    SOURCES: [],
  };
  for (const block of structure.supplyLedger) lines[BLOCK_GROUP[block.type]].push(blockLine(block));
  if (structure.knownRegistrationStatus) {
    lines.REGISTRATION.unshift({
      text: `Known registration status · ${humanise(structure.knownRegistrationStatus)}`,
      sourceIds: [],
    });
  }

  // Every filing the structure conclusion rests on: the structure's own citations and each block's.
  const citedIds = new Set<number>(structure.evidenceSourceIds);
  for (const block of structure.supplyLedger) for (const id of block.evidenceSourceIds) citedIds.add(id);
  const cited = [...citedIds].map((id) => byId.get(id)).filter((link): link is EvidenceLink => link !== undefined);

  const links: Record<SupplyGroupKey, EvidenceLink[]> = {
    FILINGS: cited.filter((link) => CURRENT_REPORT.test(link.secForm ?? '')),
    REGISTRATION: cited.filter((link) => PROSPECTUS.test(link.secForm ?? '')),
    OFFERINGS: [],
    WARRANTS: [],
    OTHER: [],
    SOURCES: structure.evidenceSourceIds.map((id) => byId.get(id)).filter((link): link is EvidenceLink => link !== undefined),
  };

  const keys: SupplyGroupKey[] = ['FILINGS', 'REGISTRATION', 'OFFERINGS', 'WARRANTS', 'OTHER', 'SOURCES'];
  return keys.map((key) => ({
    key,
    label: SUPPLY_GROUP_LABEL[key],
    lines: lines[key],
    links: links[key],
    empty: lines[key].length === 0 && links[key].length === 0,
  }));
}
