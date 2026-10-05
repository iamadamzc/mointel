/**
 * Row mappers: spreadsheet-shaped arrays -> normalized application objects.
 *
 * This module is the ONLY place that knows about column positions. Providers
 * (Google Sheets today, something else later) hand it rows in the documented
 * column order; everything downstream works with typed objects.
 */

import {
  catalystGradeBucket,
  cell,
  cycleState,
  extractUrls,
  floatField,
  sheetSharesOutstandingField,
  numericField,
  parseDateValue,
  pickSessionValue,
  proseCell,
  structureBadges,
  structureState,
  withoutStatusEmoji,
} from './normalize';
import { plausibleSymbol } from './sheetTable';
import type {
  MarketSummary,
  MomentumTicker,
  StructuralResearch,
} from './types';

/** TODAY!A:AA column order. */
export const TODAY_COLUMNS = [
  'Priority',
  'Ticker',
  'Country of Origin',
  'Cycle',
  'RTH Close',
  'AH Price',
  'AH %',
  'AH Volume',
  'Float',
  'Catalyst Grade',
  'Catalyst',
  'Catalyst Time',
  'Recent Run High',
  'Flush From High %',
  'Prior Runner',
  'Structure Flags',
  'Key Levels',
  'Warning Shot',
  'Notes',
  'PM Price',
  'PM %',
  'PM Volume',
  'PM Catalyst/Update',
  'PM Catalyst Time',
  'Confirmation',
  'Revised Priority',
  'PM Warning Shot',
] as const;

/** RESEARCH!A:AK column order. */
export const RESEARCH_COLUMNS = [
  'Report Date',
  'Ticker',
  'Country of Origin',
  'Company',
  'RTH Close',
  'AH Price',
  'AH %',
  'AH Volume',
  'Float',
  'Float Source Date',
  'Float Source URL',
  'Shares Outstanding',
  'Catalyst Details',
  'Catalyst Timestamp',
  'Catalyst Grade',
  'Catalyst Source URL',
  'Recent Cycle High',
  'Flush From High %',
  'Cycle Classification',
  'Cycle Reasoning',
  'Recent Major Runs',
  'Historical Runner Notes',
  'Split History',
  'Daily Resistance',
  'Daily Support',
  '8-K / 6-K',
  'Registration / Prospectus',
  'Offerings / ATM / PIPE',
  'Warrants / Convertibles',
  'Other Share Structure',
  'Structure Source URLs',
  'Warning Flags',
  'Overall Priority',
  'Analyst Notes',
  'Float Quality',
  'Overhang / Float',
  'Supply Evidence',
] as const;

/**
 * The columns that identify the TODAY watchlist and nothing else on the tab.
 *
 * Measured against the live sheet on 21 August. The tab's other TICKER table —
 * the 09:25 opening-spike assessment — is headed
 * `Rank, Ticker, Decision, Current PM Price, PM Change %, PM Volume, PM High,
 * Off PM High %, Catalyst Grade, Cycle, …` and carries none of these four. It
 * does share Ticker, Catalyst Grade, Cycle and PM Volume, which is why a
 * "TICKER plus four familiar columns" rule matched both tables.
 */
export const TODAY_TABLE_SIGNATURE = [
  'Ticker',
  'Priority',
  'Country of Origin',
  'Float',
  'Structure Flags',
] as const;

/** The same, for the RESEARCH tab, which is a single table today. */
export const RESEARCH_TABLE_SIGNATURE = [
  'Ticker',
  'Report Date',
  'Company',
  'Float Source URL',
  'Analyst Notes',
] as const;

const T = {
  priority: 0,
  ticker: 1,
  country: 2,
  cycle: 3,
  rthClose: 4,
  ahPrice: 5,
  ahPct: 6,
  ahVolume: 7,
  float: 8,
  catalystGrade: 9,
  catalyst: 10,
  catalystTime: 11,
  recentRunHigh: 12,
  flushFromHigh: 13,
  priorRunner: 14,
  structureFlags: 15,
  keyLevels: 16,
  warningShot: 17,
  notes: 18,
  pmPrice: 19,
  pmPct: 20,
  pmVolume: 21,
  pmCatalyst: 22,
  pmCatalystTime: 23,
  confirmation: 24,
  revisedPriority: 25,
  pmWarningShot: 26,
} as const;

const R = {
  reportDate: 0,
  ticker: 1,
  country: 2,
  company: 3,
  rthClose: 4,
  ahPrice: 5,
  ahPct: 6,
  ahVolume: 7,
  float: 8,
  floatSourceDate: 9,
  floatSourceUrl: 10,
  sharesOutstanding: 11,
  catalystDetails: 12,
  catalystTimestamp: 13,
  catalystGrade: 14,
  catalystSourceUrl: 15,
  recentCycleHigh: 16,
  flushFromHigh: 17,
  cycleClassification: 18,
  cycleReasoning: 19,
  recentMajorRuns: 20,
  historicalRunnerNotes: 21,
  splitHistory: 22,
  dailyResistance: 23,
  dailySupport: 24,
  currentReports: 25,
  registrationProspectus: 26,
  offeringsAtmPipe: 27,
  warrantsConvertibles: 28,
  otherShareStructure: 29,
  structureSourceUrls: 30,
  warningFlags: 31,
  overallPriority: 32,
  analystNotes: 33,
  floatQuality: 34,
  overhangFloat: 35,
  supplyEvidence: 36,
} as const;

export function mapTodayRow(
  row: unknown[],
  sourceRow: number,
  tickerColumn: number = T.ticker,
): MomentumTicker | null {
  const ticker = cell(row, tickerColumn).toUpperCase();
  // Structure decides which column; shape decides whether the cell can be a
  // symbol at all. A presentation cell that survived both is still not a pin
  // until the canonical universe recognises it.
  if (!ticker || !plausibleSymbol(ticker)) return null;

  // The Priority and Revised Priority columns are no longer read (2026-10-05):
  // the desk shows its own Setup grade, and the Sheet's verdict reaches no
  // reader, the change signature included (see below).

  const cycleRaw = cell(row, T.cycle);
  const structureFlags = proseCell(row, T.structureFlags);
  const floatRaw = cell(row, T.float);

  const rthClose = numericField(row[T.rthClose]);
  const ahPrice = numericField(row[T.ahPrice]);
  const ahChangePct = numericField(row[T.ahPct]);
  const ahVolume = numericField(row[T.ahVolume]);
  const pmPrice = numericField(row[T.pmPrice]);
  const pmChangePct = numericField(row[T.pmPct]);
  const pmVolume = numericField(row[T.pmVolume]);

  // RTH has no separate % / volume column, so those fall back to an empty field.
  const emptyField = numericField('');

  const pmCatalyst = proseCell(row, T.pmCatalyst);
  const originalCatalyst = proseCell(row, T.catalyst);
  const pmCatalystTime = cell(row, T.pmCatalystTime);
  const originalCatalystTime = cell(row, T.catalystTime);

  const pmWarning = proseCell(row, T.pmWarningShot);
  const originalWarning = proseCell(row, T.warningShot);

  const state = structureState(structureFlags, floatRaw);

  const price = pickSessionValue(pmPrice, ahPrice, rthClose);
  const changePct = pickSessionValue(pmChangePct, ahChangePct, emptyField);
  const volume = pickSessionValue(pmVolume, ahVolume, emptyField);

  const ticker_: MomentumTicker = {
    ticker,
    sourceRow,
    country: cell(row, T.country),

    cycle: {
      raw: cycleRaw,
      // The badge already carries the state in its colour and its word.
      display: withoutStatusEmoji(cycleRaw) || '—',
      state: cycleState(cycleRaw),
    },
    catalyst: {
      gradeRaw: cell(row, T.catalystGrade),
      gradeBucket: catalystGradeBucket(cell(row, T.catalystGrade)),
      latest: pmCatalyst || originalCatalyst,
      original: originalCatalyst,
      latestTime: pmCatalyst ? pmCatalystTime || originalCatalystTime : originalCatalystTime,
      originalTime: originalCatalystTime,
      hasPremarketUpdate: Boolean(pmCatalyst),
    },
    structure: {
      raw: structureFlags,
      floatRaw,
      state,
      badges: structureBadges(state),
    },
    warning: {
      current: pmWarning || originalWarning,
      original: originalWarning,
      source: pmWarning ? 'PM' : originalWarning ? 'RTH' : 'NONE',
    },

    price,
    changePct,
    volume,

    rthClose,
    ahPrice,
    ahChangePct,
    ahVolume,
    pmPrice,
    pmChangePct,
    pmVolume,

    float: floatField(row[T.float]),
    floatCellShares: sheetSharesOutstandingField(row[T.float]),
    recentRunHigh: numericField(row[T.recentRunHigh]),
    flushFromHighPct: numericField(row[T.flushFromHigh]),

    priorRunner: proseCell(row, T.priorRunner),
    keyLevels: proseCell(row, T.keyLevels),
    confirmation: proseCell(row, T.confirmation),
    notes: proseCell(row, T.notes),

    updatedLabel: pmCatalystTime || originalCatalystTime,
    changeSignature: '',
  };

  ticker_.changeSignature = [
    ticker_.price.raw,
    ticker_.changePct.raw,
    ticker_.volume.raw,
    // No priority (2026-10-05). The signature marks a row whose DISPLAYED values
    // changed (lib/hooks/useDashboard.ts), and the Sheet's priority is no longer
    // displayed; it was also raw text, so keeping it would have carried
    // "AVOID" to every reader of the payload inside a fingerprint.
    ticker_.cycle.raw,
    ticker_.warning.current,
    ticker_.catalyst.latest,
    ticker_.confirmation,
  ].join('');

  return ticker_;
}

export function mapResearchRow(
  row: unknown[],
  sourceRow: number,
  tickerColumn: number = R.ticker,
): StructuralResearch | null {
  const ticker = cell(row, tickerColumn).toUpperCase();
  if (!ticker || !plausibleSymbol(ticker)) return null;

  const reportDate = cell(row, R.reportDate);
  const cycleRaw = cell(row, R.cycleClassification);
  const catalystGrade = cell(row, R.catalystGrade);
  const floatQuality = proseCell(row, R.floatQuality);

  return {
    ticker,
    sourceRow,
    reportDate,
    reportDateValue: parseDateValue(reportDate),

    company: proseCell(row, R.company),
    country: cell(row, R.country),

    rthClose: numericField(row[R.rthClose]),
    ahPrice: numericField(row[R.ahPrice]),
    ahChangePct: numericField(row[R.ahPct]),
    ahVolume: numericField(row[R.ahVolume]),

    float: floatField(row[R.float]),
    floatCellShares: sheetSharesOutstandingField(row[R.float]),
    floatSourceDate: cell(row, R.floatSourceDate),
    floatSourceUrls: extractUrls(proseCell(row, R.floatSourceUrl)),
    sharesOutstanding: numericField(row[R.sharesOutstanding]),

    catalystDetails: proseCell(row, R.catalystDetails),
    catalystTimestamp: cell(row, R.catalystTimestamp),
    catalystGradeRaw: catalystGrade,
    catalystGradeBucket: catalystGradeBucket(catalystGrade),
    catalystSourceUrls: extractUrls(proseCell(row, R.catalystSourceUrl)),

    recentCycleHigh: numericField(row[R.recentCycleHigh]),
    flushFromHighPct: numericField(row[R.flushFromHigh]),
    cycleClassificationRaw: cycleRaw,
    cycleState: cycleState(cycleRaw),
    cycleReasoning: proseCell(row, R.cycleReasoning),
    recentMajorRuns: proseCell(row, R.recentMajorRuns),
    historicalRunnerNotes: proseCell(row, R.historicalRunnerNotes),
    splitHistory: proseCell(row, R.splitHistory),

    dailyResistance: proseCell(row, R.dailyResistance),
    dailySupport: proseCell(row, R.dailySupport),

    currentReports: proseCell(row, R.currentReports),
    registrationProspectus: proseCell(row, R.registrationProspectus),
    offeringsAtmPipe: proseCell(row, R.offeringsAtmPipe),
    warrantsConvertibles: proseCell(row, R.warrantsConvertibles),
    otherShareStructure: proseCell(row, R.otherShareStructure),
    structureSourceUrls: extractUrls(proseCell(row, R.structureSourceUrls)),
    warningFlags: proseCell(row, R.warningFlags),

    analystNotes: proseCell(row, R.analystNotes),

    floatQualityRaw: floatQuality,
    floatQualityState: floatQuality ? structureState(floatQuality) : 'UNCLASSIFIED',
    overhangFloat: proseCell(row, R.overhangFloat),
    supplyEvidence: proseCell(row, R.supplyEvidence),
  };
}

/**
 * Chooses one RESEARCH record per ticker.
 *
 * Current rule: most recent Report Date wins; undated records lose to dated
 * ones and ties fall back to the later sheet row. Isolated here so the rule can
 * change (e.g. "latest record that has structure evidence") without touching
 * providers or UI.
 */
export function selectLatestResearch(records: StructuralResearch[]): Record<string, StructuralResearch> {
  const byTicker: Record<string, StructuralResearch> = {};

  for (const record of records) {
    const existing = byTicker[record.ticker];
    if (!existing) {
      byTicker[record.ticker] = record;
      continue;
    }

    const incomingDate = record.reportDateValue;
    const existingDate = existing.reportDateValue;

    if (incomingDate !== null && existingDate === null) {
      byTicker[record.ticker] = record;
    } else if (incomingDate !== null && existingDate !== null && incomingDate > existingDate) {
      byTicker[record.ticker] = record;
    } else if (incomingDate === existingDate && record.sourceRow > existing.sourceRow) {
      byTicker[record.ticker] = record;
    }
  }

  return byTicker;
}

/** Summary counts derived strictly from explicit classifications. */
export function buildSummary(tickers: MomentumTicker[]): MarketSummary {
  return {
    namesTracked: tickers.length,
    freshFrontside: tickers.filter((t) => t.cycle.state === 'FRESH_FRONTSIDE').length,
    frontsideWarning: tickers.filter((t) => t.cycle.state === 'FRONTSIDE_WARNING').length,
    backside: tickers.filter((t) => t.cycle.state === 'BACKSIDE').length,
    dirtyFloat: tickers.filter((t) => t.structure.state === 'DIRTY_FLOAT').length,
    strongCatalysts: tickers.filter((t) => t.catalyst.gradeBucket === 'A').length,
  };
}

/** Normalizes raw TODAY / RESEARCH rows (headers already removed). */
/**
 * Where each tab's table was found.
 *
 * Supplied by the provider, which locates the table rather than assuming it
 * starts at row 1. Defaults keep the historical behaviour for callers that
 * already hold plain data rows, which is every test and the mock provider.
 */
export interface SheetTablePlacement {
  todayTickerColumn?: number;
  researchTickerColumn?: number;
  todayFirstSheetRow?: number;
  researchFirstSheetRow?: number;
}

export function normalizeSheetRows(
  todayRows: unknown[][],
  researchRows: unknown[][],
  placement: SheetTablePlacement = {},
) {
  const warnings: string[] = [];
  const todayFirstRow = placement.todayFirstSheetRow ?? 2;
  const researchFirstRow = placement.researchFirstSheetRow ?? 2;

  const tickers: MomentumTicker[] = [];
  todayRows.forEach((row, index) => {
    const mapped = mapTodayRow(row, index + todayFirstRow, placement.todayTickerColumn);
    if (mapped) tickers.push(mapped);
    else if (row.some((value) => String(value ?? '').trim())) {
      warnings.push(`TODAY row ${index + todayFirstRow} skipped: no ticker.`);
    }
  });

  const researchRecords: StructuralResearch[] = [];
  researchRows.forEach((row, index) => {
    const mapped = mapResearchRow(row, index + researchFirstRow, placement.researchTickerColumn);
    if (mapped) researchRecords.push(mapped);
    else if (row.some((value) => String(value ?? '').trim())) {
      warnings.push(`RESEARCH row ${index + researchFirstRow} skipped: no ticker.`);
    }
  });

  const missingResearch = tickers
    .filter((t) => !researchRecords.some((r) => r.ticker === t.ticker))
    .map((t) => t.ticker);
  if (missingResearch.length) {
    warnings.push(`No RESEARCH record for: ${missingResearch.join(', ')}.`);
  }

  return {
    tickers,
    research: selectLatestResearch(researchRecords),
    summary: buildSummary(tickers),
    warnings,
  };
}
