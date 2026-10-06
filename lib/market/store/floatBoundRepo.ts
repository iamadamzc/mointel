/**
 * `research_float_bounds`: one row per symbol and the ET date the float job computed it for
 * (lib/research/floatJob.ts). A second run on the same date replaces the first.
 */
import type { MarketDatabase } from './db';
import { withBusyRetry } from './busy';
import type { FloatBoundRow, StoredHolding } from '../../research/floatJob';
import type { FiledCount } from '../../research/filedCount';
import type { FloatCell, FloatCellReason, IssuanceRule, SplitProof } from '../../research/insiderBound';

interface Stored {
  symbol: string;
  as_of_date: string;
  cik: string | null;
  count_kind: FiledCount['kind'];
  count_shares: number | null;
  count_as_of: string | null;
  count_filed: string | null;
  count_accession: string | null;
  count_form: string | null;
  holdings_json: string;
  split_since_count: SplitProof;
  announced_splits_json: string | null;
  analysis_version_id: number | null;
  issuance_rule: IssuanceRule;
  max_age_days: number;
  state: FloatCell['state'];
  reason: FloatCellReason | null;
  bound: number | null;
  computed_at: string;
}

export function writeFloatBound(db: MarketDatabase, row: FloatBoundRow): void {
  const count = row.count;
  const cell = row.cell;
  const statement = db.prepare(
    `INSERT INTO research_float_bounds (
       symbol, as_of_date, cik, count_kind, count_shares, count_as_of, count_filed, count_accession, count_form,
       holdings_json, split_since_count, announced_splits_json, analysis_version_id, issuance_rule, max_age_days, state, reason, bound, computed_at)
     VALUES (@symbol, @as_of_date, @cik, @count_kind, @count_shares, @count_as_of, @count_filed, @count_accession, @count_form,
       @holdings_json, @split_since_count, @announced_splits_json, @analysis_version_id, @issuance_rule, @max_age_days, @state, @reason, @bound, @computed_at)
     ON CONFLICT (symbol, as_of_date) DO UPDATE SET
       cik = excluded.cik, count_kind = excluded.count_kind, count_shares = excluded.count_shares,
       count_as_of = excluded.count_as_of, count_filed = excluded.count_filed, count_accession = excluded.count_accession,
       count_form = excluded.count_form, holdings_json = excluded.holdings_json, split_since_count = excluded.split_since_count, announced_splits_json = excluded.announced_splits_json,
       analysis_version_id = excluded.analysis_version_id, issuance_rule = excluded.issuance_rule,
       max_age_days = excluded.max_age_days, state = excluded.state, reason = excluded.reason, bound = excluded.bound,
       computed_at = excluded.computed_at`,
  );
  const stored: Stored = {
    symbol: row.symbol,
    as_of_date: row.asOfDate,
    cik: row.cik,
    count_kind: count.kind,
    count_shares: count.kind === 'COUNT' ? count.shares : null,
    count_as_of: count.kind === 'COUNT' ? count.asOf : null,
    count_filed: count.kind === 'COUNT' ? count.filed : null,
    count_accession: count.kind === 'COUNT' ? count.accession : null,
    count_form: count.kind === 'COUNT' ? count.form : null,
    holdings_json: JSON.stringify(row.holdings),
    split_since_count: row.splitSinceCount,
    announced_splits_json: row.announcedSplits === null ? null : JSON.stringify(row.announcedSplits),
    analysis_version_id: row.analysisVersionId,
    issuance_rule: row.issuanceRule,
    max_age_days: row.maxAgeDays,
    state: cell.state,
    reason: cell.state === 'PRODUCED' ? null : cell.reason,
    bound: cell.state === 'PRODUCED' ? cell.bound : null,
    computed_at: row.computedAt,
  };
  withBusyRetry('writeFloatBound', () => statement.run(stored));
}

function fromStored(s: Stored): FloatBoundRow {
  const count: FiledCount =
    s.count_kind === 'COUNT'
      ? { kind: 'COUNT', shares: s.count_shares!, asOf: s.count_as_of!, filed: s.count_filed!, accession: s.count_accession!, form: s.count_form! }
      : { kind: s.count_kind };
  const holdings = JSON.parse(s.holdings_json) as StoredHolding[];
  let cell: FloatCell;
  if (s.state === 'PRODUCED') {
    const used = holdings.filter((h) => h.split === 'NONE');
    cell = {
      state: 'PRODUCED',
      bound: s.bound!,
      subtracted: used.reduce((sum, h) => sum + h.shares, 0),
      holdings: used,
      refused: holdings
        .filter((h) => h.split !== 'NONE')
        .map((h) => ({ ownerCik: h.ownerCik, why: h.split === 'FOUND' ? 'SPLIT_BETWEEN_HOLDING_AND_COUNT' : 'SPLIT_UNPROVEN' })),
    };
  } else {
    cell = { state: s.state, reason: s.reason! };
  }
  return {
    symbol: s.symbol,
    asOfDate: s.as_of_date,
    cik: s.cik,
    count,
    holdings,
    splitSinceCount: s.split_since_count,
    announcedSplits: s.announced_splits_json === null ? null : (JSON.parse(s.announced_splits_json) as string[]),
    analysisVersionId: s.analysis_version_id,
    issuanceRule: s.issuance_rule,
    maxAgeDays: s.max_age_days,
    cell,
    computedAt: s.computed_at,
  };
}

/** The row computed FOR `asOfDate`, or null (the job has not run for it). */
export function readFloatBound(db: MarketDatabase, symbol: string, asOfDate: string): FloatBoundRow | null {
  const s = db.prepare('SELECT * FROM research_float_bounds WHERE symbol = ? AND as_of_date = ?').get(symbol, asOfDate) as Stored | undefined;
  return s ? fromStored(s) : null;
}

/** The newest row on or before `date`, or null. For the reader once the row-date question is settled. */
export function readLatestFloatBound(db: MarketDatabase, symbol: string, date: string): FloatBoundRow | null {
  const s = db
    .prepare('SELECT * FROM research_float_bounds WHERE symbol = ? AND as_of_date <= ? ORDER BY as_of_date DESC LIMIT 1')
    .get(symbol, date) as Stored | undefined;
  return s ? fromStored(s) : null;
}
