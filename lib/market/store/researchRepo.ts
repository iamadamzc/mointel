/**
 * Typed access to the research half of the state store.
 *
 * Split from `repo.ts` for size only — this is the same SQLite database and the
 * same rule applies: every research SQL statement in the project lives here.
 *
 * The Next.js process opens the store read-only with `skipSchema`, so it can
 * meet a database created before the research tables existed. Read paths here
 * degrade to empty rather than throwing; see `researchTablesPresent`.
 */

import type { MarketDatabase } from './db';
import type { TimePrecision } from '../../research/time';
import type {
  CikConfidence,
  CompanySourceRegistry,
  IssuerRecord,
  NewResearchSource,
  ResearchAnalysisVersion,
  ResearchDossier,
  ResearchHealth,
  ResearchJob,
  ResearchJobStatus,
  ResearchSource,
  SourceAuthority,
  SourceType,
} from '../../research/types';
import { ANALYSIS_VERSION, EMPTY_COMPANY_SOURCES } from '../../research/types';
import { nextRetryState, type RetryState } from '../../research/retry';
import type { QueueCandidate } from '../../research/queue';

/* -------------------------------------------------------------- table guard */

/**
 * True when the research schema exists. A v2 store opened read-only by the
 * dashboard has the market tables but not these, and a missing table is a
 * normal transitional state, not an error worth crashing a page render over.
 */
export function researchTablesPresent(db: MarketDatabase): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'research_jobs'")
    .get() as { name: string } | undefined;
  return row !== undefined;
}

/* ---------------------------------------------------------------- job rows */

interface JobRow {
  id: number;
  ticker: string;
  trading_date: string;
  status: string;
  priority: number;
  reason: string;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  retry_count: number;
  error: string | null;
  evidence_fingerprint: string | null;
  top12_at: string | null;
  trigger: string | null;
  sources_ready_at: string | null;
  analysis_started_at: string | null;
  accepted_at: string | null;
}

function toJob(row: JobRow): ResearchJob {
  return {
    id: row.id,
    ticker: row.ticker,
    tradingDate: row.trading_date,
    status: row.status as ResearchJobStatus,
    priority: row.priority,
    reason: row.reason,
    queuedAt: row.queued_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    retryCount: row.retry_count,
    error: row.error,
    evidenceFingerprint: row.evidence_fingerprint,
    top12At: row.top12_at,
    trigger: row.trigger ?? null,
    sourcesReadyAt: row.sources_ready_at,
    analysisStartedAt: row.analysis_started_at,
    acceptedAt: row.accepted_at,
  };
}

/**
 * The population the research engine should be covering right now.
 *
 * Reads the ACTIVE session board, not Daily RVOL. During premarket and RTH the
 * two are the same thing; after the bell they are not, and a research engine
 * still reconciling the day's leaders at 17:00 leaves every genuinely new
 * after-hours mover sitting at NOT YET ANALYZED.
 *
 * Focus names come along regardless of rank. A name the trader has pinned is
 * research-relevant whether or not the board currently agrees, and a stock
 * sliding from #3 to #80 is when its structure matters most.
 */
export function readBoardCandidates(
  db: MarketDatabase,
  options: { tradingDate: string; autoRank: number; board: 'DAILY_RVOL' | 'AFTER_HOURS' },
): QueueCandidate[] {
  const afterHours = options.board === 'AFTER_HOURS';
  const rankColumn = afterHours ? 'ah_rank' : 'rvol_rank';

  const rows = db
    .prepare(
      `SELECT s.symbol AS ticker, s.${rankColumn} AS rank,
              s.rvol, s.rvol_rank AS rvolRank,
              s.percent_change AS percentChange,
              s.ah_percent_change AS ahPercentChange,
              s.ah_volume AS ahVolume,
              s.cumulative_volume AS cumulativeVolume, s.spread_pct AS spreadPct,
              s.latched, s.ah_latched AS ahLatched,
              s.top12_entered_at AS top12EnteredAt,
              s.ah_entered_topn_at AS ahEnteredTopNAt,
              s.qualified_at AS qualifiedAt,
              s.ah_qualified_at AS ahQualifiedAt,
              u.classification,
              (SELECT COUNT(*) FROM focus_tickers f
                WHERE f.ticker = s.symbol AND f.trading_date = s.trading_date) AS focused
         FROM ticker_session s
         LEFT JOIN universe u ON u.symbol = s.symbol
        WHERE s.trading_date = @tradingDate
          AND ((s.${rankColumn} IS NOT NULL AND s.${rankColumn} <= @autoRank)
               OR EXISTS (SELECT 1 FROM focus_tickers f
                           WHERE f.ticker = s.symbol AND f.trading_date = s.trading_date))
        ORDER BY s.${rankColumn} IS NULL, s.${rankColumn} ASC`,
    )
    .all({ tradingDate: options.tradingDate, autoRank: options.autoRank });

  const numeric = (value: unknown): number | null =>
    value === null || value === undefined ? null : Number(value);
  const text = (value: unknown): string | null =>
    value === null || value === undefined ? null : String(value);

  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    const rank = numeric(r.rank);

    return {
      ticker: String(r.ticker),
      // A focused name outside the board still queues; it simply waits behind
      // the board, which is what a rank just past the threshold does.
      rank: rank ?? options.autoRank + 1,
      focused: Number(r.focused ?? 0) > 0,
      rvol: numeric(r.rvol),
      // On the after-hours board the move and the volume that matter are the
      // evening's, not the day's.
      percentChange: afterHours ? numeric(r.ahPercentChange) : numeric(r.percentChange),
      cumulativeVolume: afterHours ? numeric(r.ahVolume) : numeric(r.cumulativeVolume),
      spreadPct: numeric(r.spreadPct),
      latched: afterHours ? r.ahLatched === 1 : r.latched === 1,
      classification: text(r.classification),
      /*
       * Board entry, measured on the board that queued this name.
       *
       * An after-hours discovery's latency runs from its AH entry: a stock that
       * qualified at 06:40 and first mattered at 17:10 did not take eleven
       * hours to analyse, and recording that it did would make the headline
       * product metric meaningless.
       */
      top12EnteredAt: afterHours ? text(r.ahEnteredTopNAt) : text(r.top12EnteredAt),
      qualifiedAt: afterHours ? text(r.ahQualifiedAt) : text(r.qualifiedAt),
    };
  });
}

export interface EnqueueRequest {
  ticker: string;
  tradingDate: string;
  priority: number;
  reason: string;
  queuedAt: string;
  /** When the ticker first entered the ranked board, if known. */
  top12At?: string | null;
  /**
   * The demand episode that justified this job, as it stood when the job was
   * created. Null for ordinary background refreshes.
   */
  trigger?: string | null;
}

/**
 * Queues a job unless one is already live for this ticker and date.
 *
 * Idempotency is enforced by the partial unique index rather than by a
 * read-then-write, so concurrent discovery and a hammered REANALYZE button
 * cannot race into two jobs. Returns the new id, or null when one already
 * existed — the caller uses null to suppress a duplicate desk event.
 */
export function enqueueResearchJob(db: MarketDatabase, request: EnqueueRequest): number | null {
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO research_jobs
         (ticker, trading_date, status, priority, reason, queued_at, top12_at, trigger)
       VALUES (@ticker, @tradingDate, 'QUEUED', @priority, @reason, @queuedAt, @top12At, @trigger)`,
    )
    .run({
      ...request,
      top12At: request.top12At ?? null,
      trigger: request.trigger ?? null,
    });

  return result.changes > 0 ? Number(result.lastInsertRowid) : null;
}

/**
 * Moves up to `limit` queued jobs into `COLLECTING` and returns them.
 *
 * Selection and update share one transaction so two worker loops cannot claim
 * the same job. Ordering is the soft priority score, then FIFO — priority
 * decides who goes first and never whether a ticker runs at all.
 */
export function claimQueuedJobs(
  db: MarketDatabase,
  tradingDate: string,
  limit: number,
  startedAt: string,
): ResearchJob[] {
  if (limit <= 0) return [];

  const claim = db.transaction((): ResearchJob[] => {
    const rows = db
      .prepare(
        `SELECT * FROM research_jobs
          WHERE trading_date = ? AND status = 'QUEUED'
          ORDER BY priority DESC, queued_at ASC, id ASC
          LIMIT ?`,
      )
      .all(tradingDate, limit) as JobRow[];

    if (rows.length === 0) return [];

    const update = db.prepare(
      "UPDATE research_jobs SET status = 'COLLECTING', started_at = ? WHERE id = ?",
    );
    for (const row of rows) update.run(startedAt, row.id);

    return rows.map((row) => toJob({ ...row, status: 'COLLECTING', started_at: startedAt }));
  });

  return claim();
}

export function updateJobStatus(
  db: MarketDatabase,
  id: number,
  status: ResearchJobStatus,
): void {
  db.prepare('UPDATE research_jobs SET status = ? WHERE id = ?').run(status, id);
}

/**
 * Advances a job to the next stage and stamps when it happened.
 *
 * One statement per transition keeps the timeline honest: a stamp is written
 * when the stage actually starts, never backfilled from a later observation.
 */
export function markJobStage(
  db: MarketDatabase,
  id: number,
  stage: 'SOURCES_READY' | 'ANALYZING',
  at: string,
): void {
  const column = stage === 'SOURCES_READY' ? 'sources_ready_at' : 'analysis_started_at';
  db.prepare(`UPDATE research_jobs SET status = ?, ${column} = ? WHERE id = ?`).run(stage, at, id);
}

export interface JobCompletion {
  status: Extract<ResearchJobStatus, 'COMPLETE' | 'PARTIAL' | 'FAILED'>;
  completedAt: string;
  error?: string | null;
  evidenceFingerprint?: string | null;
  /** When an accepted dossier was stored, for time-to-intelligence. */
  acceptedAt?: string | null;
}

export function completeJob(db: MarketDatabase, id: number, completion: JobCompletion): void {
  db.prepare(
    `UPDATE research_jobs
        SET status = @status,
            completed_at = @completedAt,
            error = @error,
            evidence_fingerprint = COALESCE(@evidenceFingerprint, evidence_fingerprint),
            accepted_at = COALESCE(@acceptedAt, accepted_at)
      WHERE id = @id`,
  ).run({
    id,
    status: completion.status,
    completedAt: completion.completedAt,
    error: completion.error ?? null,
    evidenceFingerprint: completion.evidenceFingerprint ?? null,
    acceptedAt: completion.acceptedAt ?? null,
  });
}

/** Records a retry, returning the job to the queue. */
export function requeueJobForRetry(db: MarketDatabase, id: number, error: string): void {
  db.prepare(
    `UPDATE research_jobs
        SET status = 'QUEUED', retry_count = retry_count + 1, error = ?, started_at = NULL
      WHERE id = ?`,
  ).run(error, id);
}

export function readJob(db: MarketDatabase, id: number): ResearchJob | null {
  if (!researchTablesPresent(db)) return null;
  const row = db.prepare('SELECT * FROM research_jobs WHERE id = ?').get(id) as JobRow | undefined;
  return row ? toJob(row) : null;
}

/** Most recent job for a ticker on a date, whatever its status. */
export function readLatestJobForTicker(
  db: MarketDatabase,
  ticker: string,
  tradingDate: string,
): ResearchJob | null {
  if (!researchTablesPresent(db)) return null;
  const row = db
    .prepare(
      `SELECT * FROM research_jobs
        WHERE ticker = ? AND trading_date = ?
        ORDER BY id DESC LIMIT 1`,
    )
    .get(ticker, tradingDate) as JobRow | undefined;
  return row ? toJob(row) : null;
}

export function readJobsForDate(db: MarketDatabase, tradingDate: string): ResearchJob[] {
  if (!researchTablesPresent(db)) return [];
  const rows = db
    .prepare('SELECT * FROM research_jobs WHERE trading_date = ? ORDER BY id DESC')
    .all(tradingDate) as JobRow[];
  return rows.map(toJob);
}

export function countJobsByStatus(
  db: MarketDatabase,
  tradingDate: string,
): Record<string, number> {
  if (!researchTablesPresent(db)) return {};
  const rows = db
    .prepare(
      'SELECT status, COUNT(*) AS n FROM research_jobs WHERE trading_date = ? GROUP BY status',
    )
    .all(tradingDate) as Array<{ status: string; n: number }>;

  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.status] = row.n;
  return counts;
}

/**
 * Returns jobs stuck in a worker-owned state, so a restart can recover them
 * rather than leaving a ticker showing COLLECTING forever.
 */
export function readOrphanedJobs(db: MarketDatabase, tradingDate: string): ResearchJob[] {
  if (!researchTablesPresent(db)) return [];
  const rows = db
    .prepare(
      `SELECT * FROM research_jobs
        WHERE trading_date = ?
          AND status IN ('COLLECTING', 'SOURCES_READY', 'ANALYZING')
        ORDER BY id ASC`,
    )
    .all(tradingDate) as JobRow[];
  return rows.map(toJob);
}

/* ------------------------------------------------------------ issuer registry */

interface IssuerRow {
  ticker: string;
  company_name: string | null;
  cik: string | null;
  exchange: string | null;
  country: string | null;
  foreign_issuer: number | null;
  cik_confidence: string;
  mapping_source: string | null;
  ir_url: string | null;
  last_verified_at: string | null;
  company_sources: string | null;
}

function toIssuer(row: IssuerRow): IssuerRecord {
  return {
    ticker: row.ticker,
    companyName: row.company_name,
    cik: row.cik,
    exchange: row.exchange,
    country: row.country,
    // Tri-state on purpose: null means "not established", not "domestic".
    foreignIssuer: row.foreign_issuer === null ? null : row.foreign_issuer === 1,
    cikConfidence: row.cik_confidence as CikConfidence,
    mappingSource: row.mapping_source,
    irUrl: row.ir_url,
    lastVerifiedAt: row.last_verified_at,
    companySources: parseCompanySources(row.company_sources),
  };
}

function parseCompanySources(raw: string | null): CompanySourceRegistry | undefined {
  if (!raw) return undefined;
  try {
    return { ...EMPTY_COMPANY_SOURCES, ...(JSON.parse(raw) as CompanySourceRegistry) };
  } catch {
    return undefined;
  }
}

/**
 * Upserts an issuer. COALESCE on the incoming value means a later pass that
 * knows less cannot erase a field an earlier one established — an IR URL found
 * once is not lost because the next CIK refresh did not mention it.
 */
export function upsertIssuer(db: MarketDatabase, issuer: IssuerRecord): void {
  db.prepare(
    `INSERT INTO issuer_registry
       (ticker, company_name, cik, exchange, country, foreign_issuer,
        cik_confidence, mapping_source, ir_url, last_verified_at, company_sources)
     VALUES
       (@ticker, @companyName, @cik, @exchange, @country, @foreignIssuer,
        @cikConfidence, @mappingSource, @irUrl, @lastVerifiedAt, @companySources)
     ON CONFLICT(ticker) DO UPDATE SET
       company_name     = COALESCE(excluded.company_name, company_name),
       cik              = COALESCE(excluded.cik, cik),
       exchange         = COALESCE(excluded.exchange, exchange),
       country          = COALESCE(excluded.country, country),
       foreign_issuer   = COALESCE(excluded.foreign_issuer, foreign_issuer),
       cik_confidence   = excluded.cik_confidence,
       mapping_source   = COALESCE(excluded.mapping_source, mapping_source),
       ir_url           = COALESCE(excluded.ir_url, ir_url),
       last_verified_at = COALESCE(excluded.last_verified_at, last_verified_at),
       company_sources  = COALESCE(excluded.company_sources, company_sources)`,
  ).run({
    ticker: issuer.ticker,
    companyName: issuer.companyName,
    cik: issuer.cik,
    exchange: issuer.exchange,
    country: issuer.country,
    foreignIssuer: issuer.foreignIssuer === null ? null : issuer.foreignIssuer ? 1 : 0,
    cikConfidence: issuer.cikConfidence,
    mappingSource: issuer.mappingSource,
    irUrl: issuer.irUrl,
    lastVerifiedAt: issuer.lastVerifiedAt,
    companySources: issuer.companySources ? JSON.stringify(issuer.companySources) : null,
  });
}

export function readIssuer(db: MarketDatabase, ticker: string): IssuerRecord | null {
  if (!researchTablesPresent(db)) return null;
  const row = db.prepare('SELECT * FROM issuer_registry WHERE ticker = ?').get(ticker) as
    | IssuerRow
    | undefined;
  return row ? toIssuer(row) : null;
}

/* ------------------------------------------------------------------ sources */

interface SourceRow {
  id: number;
  ticker: string;
  source_type: string;
  title: string | null;
  url: string;
  published_at: string | null;
  fetched_at: string;
  accession: string | null;
  sec_form: string | null;
  authority: string;
  content_hash: string;
  document_fingerprint: string;
  excerpt: string | null;
  metadata: string;
  active: number;
  cluster_id: string | null;
  canonical: number;
  published_precision: string;
}

function toSource(row: SourceRow): ResearchSource {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(row.metadata) as Record<string, unknown>;
  } catch {
    metadata = {};
  }

  return {
    id: row.id,
    ticker: row.ticker,
    sourceType: row.source_type as SourceType,
    title: row.title,
    url: row.url,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    accession: row.accession,
    secForm: row.sec_form,
    authority: row.authority as SourceAuthority,
    contentHash: row.content_hash,
    documentFingerprint: row.document_fingerprint,
    excerpt: row.excerpt,
    metadata,
    active: row.active === 1,
    clusterId: row.cluster_id,
    canonical: row.canonical === 1,
    publishedPrecision: (row.published_precision ?? 'UNKNOWN') as TimePrecision,
  };
}

/**
 * Inserts sources, skipping any whose (ticker, document_fingerprint) exists.
 *
 * Dedupe is on document identity, not body text. Re-collecting one filing
 * collapses to a single row and keeps the evidence fingerprint stable, while
 * two legally distinct filings survive as two rows even when their wording is
 * byte-identical — which routine cover-page filings frequently are.
 *
 * Returns the ids of every supplied source, existing or new, so a caller can
 * cite what it just collected without a second query.
 */
export function insertResearchSources(
  db: MarketDatabase,
  sources: NewResearchSource[],
): number[] {
  if (sources.length === 0) return [];

  const insert = db.prepare(
    `INSERT OR IGNORE INTO research_sources
       (ticker, source_type, title, url, published_at, fetched_at, accession,
        sec_form, authority, content_hash, document_fingerprint, excerpt, metadata,
        active, cluster_id, canonical, published_precision)
     VALUES
       (@ticker, @sourceType, @title, @url, @publishedAt, @fetchedAt, @accession,
        @secForm, @authority, @contentHash, @documentFingerprint, @excerpt, @metadata,
        @active, @clusterId, @canonical, @publishedPrecision)`,
  );
  const lookup = db.prepare(
    'SELECT id FROM research_sources WHERE ticker = ? AND document_fingerprint = ?',
  );

  const run = db.transaction((batch: NewResearchSource[]): number[] => {
    const ids: number[] = [];
    for (const source of batch) {
      insert.run({
        ticker: source.ticker,
        sourceType: source.sourceType,
        title: source.title,
        url: source.url,
        publishedAt: source.publishedAt,
        fetchedAt: source.fetchedAt,
        accession: source.accession,
        secForm: source.secForm,
        authority: source.authority,
        contentHash: source.contentHash,
        documentFingerprint: source.documentFingerprint,
        excerpt: source.excerpt,
        metadata: JSON.stringify(source.metadata ?? {}),
        active: source.active ? 1 : 0,
        clusterId: source.clusterId ?? null,
        canonical: source.canonical ? 1 : 0,
        publishedPrecision: source.publishedPrecision ?? 'UNKNOWN',
      });
      const row = lookup.get(source.ticker, source.documentFingerprint) as
        | { id: number }
        | undefined;
      if (row) ids.push(row.id);
    }
    return ids;
  });

  return run(sources);
}

export interface RecycledContent {
  contentHash: string;
  accessions: string[];
  count: number;
}

/**
 * Groups of documents that share a body but were filed separately.
 *
 * Recycled content is a signal in its own right — a company re-issuing an
 * identical release, or a prospectus supplement repeating an earlier one — and
 * it is only visible because dedupe keys on identity rather than on text.
 */
export function readRecycledContent(db: MarketDatabase, ticker: string): RecycledContent[] {
  if (!researchTablesPresent(db)) return [];
  const rows = db
    .prepare(
      `SELECT content_hash,
              COUNT(*) AS n,
              GROUP_CONCAT(COALESCE(accession, '?')) AS accessions
         FROM research_sources
        WHERE ticker = ?
        GROUP BY content_hash
       HAVING COUNT(*) > 1`,
    )
    .all(ticker) as Array<{ content_hash: string; n: number; accessions: string }>;

  return rows.map((row) => ({
    contentHash: row.content_hash,
    accessions: row.accessions.split(','),
    count: row.n,
  }));
}

export function readSources(
  db: MarketDatabase,
  ticker: string,
  options: { activeOnly?: boolean } = {},
): ResearchSource[] {
  if (!researchTablesPresent(db)) return [];
  const sql = options.activeOnly
    ? 'SELECT * FROM research_sources WHERE ticker = ? AND active = 1 ORDER BY authority ASC, published_at DESC'
    : 'SELECT * FROM research_sources WHERE ticker = ? ORDER BY authority ASC, published_at DESC';
  const rows = db.prepare(sql).all(ticker) as SourceRow[];
  return rows.map(toSource);
}

export function readSourcesByIds(db: MarketDatabase, ids: number[]): ResearchSource[] {
  if (ids.length === 0 || !researchTablesPresent(db)) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT * FROM research_sources WHERE id IN (${placeholders})`)
    .all(...ids) as SourceRow[];
  return rows.map(toSource);
}

/** Accession numbers already stored, used to detect genuinely new filings. */
export function readKnownAccessions(db: MarketDatabase, ticker: string): Set<string> {
  if (!researchTablesPresent(db)) return new Set();
  const rows = db
    .prepare(
      'SELECT DISTINCT accession FROM research_sources WHERE ticker = ? AND accession IS NOT NULL',
    )
    .all(ticker) as Array<{ accession: string }>;
  return new Set(rows.map((row) => row.accession));
}

/**
 * Assigns a cluster and marks its canonical member.
 *
 * Copies are never deleted — an SEC exhibit, an IR post and a newswire item are
 * three separate public records of one announcement, and each has independent
 * provenance value. Clustering only records that they are the same event so
 * they are not counted as three.
 */
export function assignSourceCluster(
  db: MarketDatabase,
  clusterId: string,
  memberIds: number[],
  canonicalId: number,
): void {
  if (memberIds.length === 0) return;

  const setCluster = db.prepare(
    'UPDATE research_sources SET cluster_id = ?, canonical = ? WHERE id = ?',
  );
  const run = db.transaction(() => {
    for (const id of memberIds) setCluster.run(clusterId, id === canonicalId ? 1 : 0, id);
  });
  run();
}

/** Canonical source of each cluster for a ticker. */
export function readCanonicalSources(db: MarketDatabase, ticker: string): ResearchSource[] {
  if (!researchTablesPresent(db)) return [];
  const rows = db
    .prepare(
      'SELECT * FROM research_sources WHERE ticker = ? AND canonical = 1 ORDER BY published_at DESC',
    )
    .all(ticker) as SourceRow[];
  return rows.map(toSource);
}

/** Marks superseded sources inactive without deleting them. History is kept. */
export function deactivateSources(db: MarketDatabase, ids: number[]): void {
  if (ids.length === 0) return;
  const statement = db.prepare('UPDATE research_sources SET active = 0 WHERE id = ?');
  const run = db.transaction((batch: number[]) => {
    for (const id of batch) statement.run(id);
  });
  run(ids);
}

/* ------------------------------------------------------ analyses / dossiers */

interface VersionRow {
  id: number;
  ticker: string;
  generated_at: string;
  evidence_fingerprint: string;
  model: string | null;
  analysis_version: number;
  dossier: string;
  source_ids: string;
  supersedes_id: number | null;
  metadata: string | null;
}

function toVersion(row: VersionRow): ResearchAnalysisVersion {
  return {
    id: row.id,
    ticker: row.ticker,
    generatedAt: row.generated_at,
    evidenceFingerprint: row.evidence_fingerprint,
    model: row.model,
    analysisVersion: row.analysis_version,
    dossier: JSON.parse(row.dossier) as ResearchDossier,
    sourceIds: JSON.parse(row.source_ids) as number[],
    supersedesId: row.supersedes_id,
    metadata: parseJson(row.metadata),
  };
}

function parseJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export interface NewAnalysisVersion {
  ticker: string;
  generatedAt: string;
  evidenceFingerprint: string;
  model: string | null;
  dossier: ResearchDossier;
  sourceIds: number[];
  /** How the analysis was produced: versions, repairs, escalation, usage. */
  metadata?: Record<string, unknown>;
}

/**
 * Appends an analysis and points the ticker's current dossier at it.
 *
 * The previous current version becomes this one's `supersedes_id`, so the chain
 * reconstructs what changed. Nothing is ever overwritten — the eventual goal is
 * `ticker → structure → live behavior → outcome`, which needs the history.
 */
export function saveAnalysisVersion(
  db: MarketDatabase,
  analysis: NewAnalysisVersion,
): ResearchAnalysisVersion {
  const save = db.transaction((): ResearchAnalysisVersion => {
    const current = db
      .prepare('SELECT current_version_id FROM research_dossiers WHERE ticker = ?')
      .get(analysis.ticker) as { current_version_id: number } | undefined;

    const result = db
      .prepare(
        `INSERT INTO research_analysis_versions
           (ticker, generated_at, evidence_fingerprint, model, analysis_version,
            dossier, source_ids, supersedes_id, metadata)
         VALUES
           (@ticker, @generatedAt, @evidenceFingerprint, @model, @analysisVersion,
            @dossier, @sourceIds, @supersedesId, @metadata)`,
      )
      .run({
        ticker: analysis.ticker,
        generatedAt: analysis.generatedAt,
        evidenceFingerprint: analysis.evidenceFingerprint,
        model: analysis.model,
        analysisVersion: ANALYSIS_VERSION,
        dossier: JSON.stringify(analysis.dossier),
        sourceIds: JSON.stringify(analysis.sourceIds),
        supersedesId: current?.current_version_id ?? null,
        metadata: JSON.stringify(analysis.metadata ?? {}),
      });

    const id = Number(result.lastInsertRowid);

    db.prepare(
      `INSERT INTO research_dossiers (ticker, current_version_id, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(ticker) DO UPDATE SET
         current_version_id = excluded.current_version_id,
         updated_at = excluded.updated_at`,
    ).run(analysis.ticker, id, analysis.generatedAt);

    const row = db
      .prepare('SELECT * FROM research_analysis_versions WHERE id = ?')
      .get(id) as VersionRow;
    return toVersion(row);
  });

  return save();
}

export function readCurrentAnalysis(
  db: MarketDatabase,
  ticker: string,
): ResearchAnalysisVersion | null {
  if (!researchTablesPresent(db)) return null;
  const row = db
    .prepare(
      `SELECT v.* FROM research_analysis_versions v
         JOIN research_dossiers d ON d.current_version_id = v.id
        WHERE d.ticker = ?`,
    )
    .get(ticker) as VersionRow | undefined;
  return row ? toVersion(row) : null;
}

export function readAnalysisHistory(
  db: MarketDatabase,
  ticker: string,
  limit = 20,
): ResearchAnalysisVersion[] {
  if (!researchTablesPresent(db)) return [];
  const rows = db
    .prepare(
      'SELECT * FROM research_analysis_versions WHERE ticker = ? ORDER BY id DESC LIMIT ?',
    )
    .all(ticker, limit) as VersionRow[];
  return rows.map(toVersion);
}

/** Current dossiers for many tickers at once, for the dashboard merge. */
export function readCurrentAnalyses(
  db: MarketDatabase,
  tickers: string[],
): Map<string, ResearchAnalysisVersion> {
  const found = new Map<string, ResearchAnalysisVersion>();
  if (tickers.length === 0 || !researchTablesPresent(db)) return found;

  const placeholders = tickers.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT v.* FROM research_analysis_versions v
         JOIN research_dossiers d ON d.current_version_id = v.id
        WHERE d.ticker IN (${placeholders})`,
    )
    .all(...tickers) as VersionRow[];

  for (const row of rows) found.set(row.ticker, toVersion(row));
  return found;
}

/* ------------------------------------------------------------------- health */

export function writeResearchHealth(db: MarketDatabase, health: ResearchHealth): void {
  db.prepare(
    `INSERT INTO research_health (id, payload) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
  ).run(JSON.stringify(health));
}

export function readResearchHealth(db: MarketDatabase): ResearchHealth | null {
  if (!researchTablesPresent(db)) return null;
  const row = db.prepare('SELECT payload FROM research_health WHERE id = 1').get() as
    | { payload: string }
    | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as ResearchHealth;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- retry state */

interface RetryRow {
  ticker: string;
  trading_date: string;
  evidence_fingerprint: string;
  attempts: number;
  first_failed_at: string;
  last_failed_at: string;
  next_attempt_at: string | null;
  last_error: string | null;
}

function toRetryState(row: RetryRow): RetryState {
  return {
    ticker: row.ticker,
    tradingDate: row.trading_date,
    evidenceFingerprint: row.evidence_fingerprint,
    attempts: row.attempts,
    firstFailedAt: row.first_failed_at,
    lastFailedAt: row.last_failed_at,
    nextAttemptAt: row.next_attempt_at,
    lastError: row.last_error,
  };
}

/**
 * The retry table arrived after the research tables did.
 *
 * A store written by an older worker has research_jobs but not this, and the
 * web process reads it through a skipSchema connection that will not create it.
 * Checked explicitly so that gap degrades to "no block recorded" instead of
 * throwing on every reconciliation cycle.
 */
function retryTablePresent(db: MarketDatabase): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'research_retry_state'")
    .get() as { name: string } | undefined;
  return row !== undefined;
}

export function readRetryState(
  db: MarketDatabase,
  ticker: string,
  tradingDate: string,
): RetryState | null {
  if (!retryTablePresent(db)) return null;
  const row = db
    .prepare('SELECT * FROM research_retry_state WHERE ticker = ? AND trading_date = ?')
    .get(ticker, tradingDate) as RetryRow | undefined;
  return row ? toRetryState(row) : null;
}

/** All blocks for a date, so the desk can report what it has given up on. */
export function readRetryStates(db: MarketDatabase, tradingDate: string): RetryState[] {
  if (!retryTablePresent(db)) return [];
  const rows = db
    .prepare('SELECT * FROM research_retry_state WHERE trading_date = ?')
    .all(tradingDate) as RetryRow[];
  return rows.map(toRetryState);
}

export function writeRetryState(db: MarketDatabase, state: RetryState): void {
  db.prepare(
    `INSERT INTO research_retry_state
       (ticker, trading_date, evidence_fingerprint, attempts,
        first_failed_at, last_failed_at, next_attempt_at, last_error)
     VALUES (@ticker, @tradingDate, @evidenceFingerprint, @attempts,
             @firstFailedAt, @lastFailedAt, @nextAttemptAt, @lastError)
     ON CONFLICT(ticker, trading_date) DO UPDATE SET
       evidence_fingerprint = excluded.evidence_fingerprint,
       attempts             = excluded.attempts,
       first_failed_at      = excluded.first_failed_at,
       last_failed_at       = excluded.last_failed_at,
       next_attempt_at      = excluded.next_attempt_at,
       last_error           = excluded.last_error`,
  ).run(state);
}

/**
 * Records a failure and returns the resulting state.
 *
 * Read and write share a transaction so two workers failing the same ticker at
 * once cannot both read `attempts = 1` and each write back `2`, quietly
 * doubling the budget.
 */
export function recordResearchFailure(
  db: MarketDatabase,
  options: {
    ticker: string;
    tradingDate: string;
    evidenceFingerprint: string;
    error: string | null;
    now: Date;
    backoffBaseMs?: number;
  },
): RetryState {
  const record = db.transaction(() => {
    const previous = readRetryState(db, options.ticker, options.tradingDate);
    const next = nextRetryState({ previous, ...options });
    writeRetryState(db, next);
    return next;
  });

  return record();
}

/**
 * Clears the block for a ticker.
 *
 * Called when an analysis is accepted — the name plainly works now — and by the
 * manual retry control, which is a person overriding the automatic ceiling on
 * purpose.
 */
export function clearRetryState(db: MarketDatabase, ticker: string, tradingDate: string): void {
  if (!retryTablePresent(db)) return;
  db.prepare('DELETE FROM research_retry_state WHERE ticker = ? AND trading_date = ?').run(
    ticker,
    tradingDate,
  );
}
