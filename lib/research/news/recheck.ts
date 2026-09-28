import type { MarketDatabase } from '../../market/store/db';
import {
  enqueueResearchJob,
  readLatestJobForTicker,
  readRetryState,
  readSources,
} from '../../market/store/researchRepo';
import { computeEvidenceFingerprint } from '../fingerprint';
import { isEligible, priorityScore, type QueueCandidate } from '../queue';
import { evaluateRetry } from '../retry';
import { admitNewsItem, newsDocumentFingerprint } from './collect';
import type { NewsAdapter, NewsItem } from './types';

/**
 * THE NEWS RE-CHECK. His ruling, 2026-09-28: "build the re-check next".
 *
 * THE GAP IT CLOSES. The desk asks once. A top-12 name whose job answered
 * NONE_FOUND is never queued again that session (`queue.ts`, the `answered`
 * gate), and neither re-look route is driven by time. So a release landing
 * AFTER that job is never seen. The collector added news to the job; this adds
 * a reason for a job.
 *
 * WHAT IT DOES. One multi-symbol news request for the current top 12 per poll,
 * no model. A name is re-queued when an item ADMITTED BY THE COLLECTOR'S OWN
 * RULE (`admitNewsItem`) is (a) published after that name's latest job started
 * and (b) not already stored. The job then runs normally; the collector stores
 * the item; the evidence fingerprint moves; interpretation runs once.
 *
 * WHY EACH ITEM BUYS AT MOST ONE JOB. After the job it caused has started, the
 * item is older than that job, so (a) fails. If the job stored it, (b) fails as
 * well. Either alone ends it; both together mean a collector cap or a transient
 * failure cannot turn one item into a job per poll.
 *
 * ALL TOP-12 NAMES, not only NONE_FOUND ones: a new public release on a name
 * whose catalyst is already known is new information too, and that was the
 * scope put to him ("send a name back for research when a new release
 * appears"). The bound he was given counted every name.
 */
export const NEWS_RECHECK_TRIGGER = 'NEWS_ITEM';

/** A literal 12, for the reason `queue.ts` gives for `STALE_REASK_MAX_RANK`. */
export const NEWS_RECHECK_MAX_RANK = 12;

/** How far back a poll may look, whatever the oldest job says. */
export const NEWS_RECHECK_MAX_LOOKBACK_MS = 24 * 3600_000;

const LIVE_STATUSES = new Set(['QUEUED', 'COLLECTING', 'SOURCES_READY', 'ANALYZING']);

export interface NewsRecheckResult {
  /** Per adapter: item counts or ERROR; or why no poll was made. */
  detail: string;
  queued: Array<{ ticker: string; jobId: number; headline: string }>;
  requests: number;
}

export async function queueNewsRecheck(
  db: MarketDatabase,
  candidates: readonly QueueCandidate[],
  adapters: readonly NewsAdapter[],
  options: { tradingDate: string; autoRank: number; now: Date },
): Promise<NewsRecheckResult> {
  const maxRank = Math.min(options.autoRank, NEWS_RECHECK_MAX_RANK);

  /*
   * Only names that HAVE had a job this session. A name with none belongs to
   * the ordinary queue, which will give it one; one whose job is live is
   * already being looked at, and its collector will see anything new.
   */
  const since = new Map<string, number>();
  const byTicker = new Map<string, QueueCandidate>();
  for (const candidate of candidates) {
    if (!isEligible(candidate, maxRank)) continue;
    const job = readLatestJobForTicker(db, candidate.ticker, options.tradingDate);
    if (!job || LIVE_STATUSES.has(job.status)) continue;
    const started = Date.parse(job.startedAt ?? job.queuedAt);
    if (!Number.isFinite(started)) continue;
    since.set(candidate.ticker, started);
    byTicker.set(candidate.ticker, candidate);
  }

  if (since.size === 0) {
    return { detail: 'no top-12 name with a finished job', queued: [], requests: 0 };
  }

  const pollable = adapters.filter((adapter) => adapter.fetchForTickers);
  if (pollable.length === 0) {
    return { detail: 'no pollable news adapters configured', queued: [], requests: 0 };
  }

  const tickers = [...since.keys()];
  const start = new Date(
    Math.max(Math.min(...since.values()), options.now.getTime() - NEWS_RECHECK_MAX_LOOKBACK_MS),
  );
  const window = { start, end: options.now };

  const parts: string[] = [];
  let requests = 0;
  const fresh = new Map<string, NewsItem>();

  for (const adapter of pollable) {
    const result = await adapter.fetchForTickers!(tickers, window);
    requests += result.requests;
    if (!result.ok) {
      parts.push(`${adapter.id}: ERROR ${result.error}`);
      continue;
    }
    let admitted = 0;
    let newer = 0;
    for (const item of result.items) {
      for (const ticker of tickers) {
        if (admitNewsItem(item, ticker) !== 'STORE') continue;
        admitted += 1;
        if (Date.parse(item.publishedAt) <= since.get(ticker)!) continue;
        newer += 1;
        const held = fresh.get(ticker);
        if (!held || item.publishedAt > held.publishedAt) fresh.set(ticker, item);
      }
    }
    parts.push(
      `${adapter.id}: read ${result.items.length} items for ${tickers.length} names ` +
        `(${admitted} admitted, ${newer} newer than the name's last job)` +
        `${result.truncated ? ' TRUNCATED' : ''}`,
    );
  }

  const queued: NewsRecheckResult['queued'] = [];
  const queuedAt = options.now.toISOString();

  for (const [ticker, item] of fresh) {
    const stored = new Set(readSources(db, ticker).map((source) => source.documentFingerprint));
    if (stored.has(newsDocumentFingerprint(item))) continue;

    // A name the retry policy has left FAILED stays failed; news does not reopen it.
    const verdict = evaluateRetry({
      state: readRetryState(db, ticker, options.tradingDate),
      currentFingerprint: computeEvidenceFingerprint(readSources(db, ticker)),
      now: options.now,
    });
    if (!verdict.allow) continue;

    const candidate = byTicker.get(ticker)!;
    const jobId = enqueueResearchJob(db, {
      ticker,
      tradingDate: options.tradingDate,
      priority: priorityScore(candidate, options.autoRank),
      reason: `news ${item.provider} ${item.publishedAt}: ${item.headline.slice(0, 120)}`,
      queuedAt,
      top12At: candidate.top12EnteredAt ?? candidate.qualifiedAt ?? queuedAt,
      trigger: NEWS_RECHECK_TRIGGER,
    });
    if (jobId !== null) queued.push({ ticker, jobId, headline: item.headline });
  }

  return { detail: parts.join('; '), queued, requests };
}
