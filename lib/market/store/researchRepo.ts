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
import type {
  CikConfidence,
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
import { ANALYSIS_VERSION } from '../../research/types';

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
  };
}

export interface EnqueueRequest {
  ticker: string;
  tradingDate: string;
  priority: number;
  reason: string;
  queuedAt: string;
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
         (ticker, trading_date, status, priority, reason, queued_at)
       VALUES (@ticker, @tradingDate, 'QUEUED', @priority, @reason, @queuedAt)`,
    )
    .run(request);

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

export interface JobCompletion {
  status: Extract<ResearchJobStatus, 'COMPLETE' | 'PARTIAL' | 'FAILED'>;
  completedAt: string;
  error?: string | null;
  evidenceFingerprint?: string | null;
}

export function completeJob(db: MarketDatabase, id: number, completion: JobCompletion): void {
  db.prepare(
    `UPDATE research_jobs
        SET status = @status,
            completed_at = @completedAt,
            error = @error,
            evidence_fingerprint = COALESCE(@evidenceFingerprint, evidence_fingerprint)
      WHERE id = @id`,
  ).run({
    id,
    status: completion.status,
    completedAt: completion.completedAt,
    error: completion.error ?? null,
    evidenceFingerprint: completion.evidenceFingerprint ?? null,
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
  };
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
        cik_confidence, mapping_source, ir_url, last_verified_at)
     VALUES
       (@ticker, @companyName, @cik, @exchange, @country, @foreignIssuer,
        @cikConfidence, @mappingSource, @irUrl, @lastVerifiedAt)
     ON CONFLICT(ticker) DO UPDATE SET
       company_name     = COALESCE(excluded.company_name, company_name),
       cik              = COALESCE(excluded.cik, cik),
       exchange         = COALESCE(excluded.exchange, exchange),
       country          = COALESCE(excluded.country, country),
       foreign_issuer   = COALESCE(excluded.foreign_issuer, foreign_issuer),
       cik_confidence   = excluded.cik_confidence,
       mapping_source   = COALESCE(excluded.mapping_source, mapping_source),
       ir_url           = COALESCE(excluded.ir_url, ir_url),
       last_verified_at = COALESCE(excluded.last_verified_at, last_verified_at)`,
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
  excerpt: string | null;
  metadata: string;
  active: number;
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
    excerpt: row.excerpt,
    metadata,
    active: row.active === 1,
  };
}

/**
 * Inserts sources, skipping any whose (ticker, content_hash) already exists.
 *
 * Returns the ids of every supplied source, existing or new, so a caller can
 * cite what it just collected without a second query. Identical documents are
 * never duplicated, which is what keeps the evidence fingerprint stable across
 * repeated collection of an unchanged filing set.
 */
export function insertResearchSources(
  db: MarketDatabase,
  sources: NewResearchSource[],
): number[] {
  if (sources.length === 0) return [];

  const insert = db.prepare(
    `INSERT OR IGNORE INTO research_sources
       (ticker, source_type, title, url, published_at, fetched_at, accession,
        sec_form, authority, content_hash, excerpt, metadata, active)
     VALUES
       (@ticker, @sourceType, @title, @url, @publishedAt, @fetchedAt, @accession,
        @secForm, @authority, @contentHash, @excerpt, @metadata, @active)`,
  );
  const lookup = db.prepare(
    'SELECT id FROM research_sources WHERE ticker = ? AND content_hash = ?',
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
        excerpt: source.excerpt,
        metadata: JSON.stringify(source.metadata ?? {}),
        active: source.active ? 1 : 0,
      });
      const row = lookup.get(source.ticker, source.contentHash) as { id: number } | undefined;
      if (row) ids.push(row.id);
    }
    return ids;
  });

  return run(sources);
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
  };
}

export interface NewAnalysisVersion {
  ticker: string;
  generatedAt: string;
  evidenceFingerprint: string;
  model: string | null;
  dossier: ResearchDossier;
  sourceIds: number[];
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
            dossier, source_ids, supersedes_id)
         VALUES
           (@ticker, @generatedAt, @evidenceFingerprint, @model, @analysisVersion,
            @dossier, @sourceIds, @supersedesId)`,
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
