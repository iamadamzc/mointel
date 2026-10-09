/**
 * Announcement clustering and canonical-source selection.
 *
 * One company announcement routinely exists as four public records: the SEC
 * exhibit, the IR post, the newswire release, and somebody's mirror of it.
 * Those are four sources but one event. Counting them as four announcements
 * would make a quiet morning look busy, so copies are grouped.
 *
 * Nothing is deleted. Each record keeps independent provenance — the exhibit
 * proves it was filed, the newswire proves when it crossed — and the cluster
 * only records that they describe the same thing.
 */

import { createHash } from 'node:crypto';

import { SOURCE_AUTHORITY_RANK, type ResearchSource, type SourceAuthority } from '../types';

/** Words that carry no signal when comparing headlines. */
const HEADLINE_NOISE = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'for',
  'to',
  'in',
  'on',
  'at',
  'its',
  'it',
  'with',
  'from',
  'by',
  'as',
  'is',
  'are',
  'be',
  'has',
  'have',
  'announces',
  'announced',
  'announcement',
  'reports',
  'report',
  'reported',
  'inc',
  'corp',
  'ltd',
  'plc',
  'company',
  'holdings',
  'press',
  'release',
  'nasdaq',
  'nyse',
]);

export function normaliseHeadline(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !HEADLINE_NOISE.has(word))
    .join(' ')
    .trim();
}

export function headlineTokens(title: string): Set<string> {
  return new Set(normaliseHeadline(title).split(' ').filter(Boolean));
}

/** Jaccard overlap of the distinctive headline words, 0..1. */
export function headlineSimilarity(a: string, b: string): number {
  const left = headlineTokens(a);
  const right = headlineTokens(b);
  if (left.size === 0 || right.size === 0) return 0;

  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;

  const union = left.size + right.size - shared;
  return union === 0 ? 0 : shared / union;
}

/** Headline overlap above which two records are treated as one announcement. */
export const CLUSTER_SIMILARITY_THRESHOLD = 0.6;
/** How far apart copies of one announcement may be published, in hours. */
export const CLUSTER_TIME_TOLERANCE_HOURS = 48;

type ClusterableSource = Pick<
  ResearchSource,
  'id' | 'title' | 'url' | 'publishedAt' | 'contentHash' | 'authority' | 'accession' | 'sourceType'
>;

export interface SourceCluster {
  clusterId: string;
  memberIds: number[];
  canonicalId: number;
  canonicalAuthority: SourceAuthority;
  /** How strongly the members were judged to be the same announcement. */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

function hoursApart(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const left = Date.parse(a);
  const right = Date.parse(b);
  if (Number.isNaN(left) || Number.isNaN(right)) return null;
  return Math.abs(left - right) / 3600_000;
}

/**
 * Whether two records describe the same announcement.
 *
 * Identical content is decisive on its own. Otherwise both the headline and the
 * timing must agree: two releases with similar wording months apart are a
 * company repeating itself, not one event, and merging them would erase a real
 * distinction.
 */
export function sameAnnouncement(
  a: ClusterableSource,
  b: ClusterableSource,
): { same: boolean; confidence: SourceCluster['confidence']; reason: string } {
  if (a.contentHash && a.contentHash === b.contentHash) {
    return { same: true, confidence: 'HIGH', reason: 'identical normalised content' };
  }
  // Exhibits of one filing are one announcement, keyed by its accession: the exhibit title
  // ("EX-99.1 to 8-K", `exhibitTitle`) carries no headline words, so the headline test cannot see it.
  if (a.sourceType === 'SEC_EXHIBIT' && b.sourceType === 'SEC_EXHIBIT' && a.accession && a.accession === b.accession) {
    return { same: true, confidence: 'HIGH', reason: 'exhibits of one filing' };
  }

  const similarity = headlineSimilarity(a.title ?? '', b.title ?? '');
  if (similarity < CLUSTER_SIMILARITY_THRESHOLD) {
    return { same: false, confidence: 'LOW', reason: `headline overlap ${similarity.toFixed(2)}` };
  }

  const apart = hoursApart(a.publishedAt, b.publishedAt);
  if (apart === null) {
    // Without both timestamps we cannot rule out a repeat, so this stays a
    // weaker match rather than a confident one.
    return {
      same: true,
      confidence: 'LOW',
      reason: `headline overlap ${similarity.toFixed(2)}, timing unknown`,
    };
  }
  if (apart > CLUSTER_TIME_TOLERANCE_HOURS) {
    return {
      same: false,
      confidence: 'LOW',
      reason: `similar headline but ${Math.round(apart)}h apart`,
    };
  }

  return {
    same: true,
    confidence: similarity >= 0.85 ? 'HIGH' : 'MEDIUM',
    reason: `headline overlap ${similarity.toFixed(2)} within ${Math.round(apart)}h`,
  };
}

/**
 * Picks the canonical record of a cluster strictly by source authority.
 *
 * A secondary mirror can never outrank an available original, no matter how
 * much richer its page is. Ties break toward the earlier publication, which is
 * the copy closest to the issuer releasing it.
 */
export function selectCanonical(members: ClusterableSource[]): ClusterableSource {
  return [...members].sort((a, b) => {
    const rankA = SOURCE_AUTHORITY_RANK[a.authority] ?? 99;
    const rankB = SOURCE_AUTHORITY_RANK[b.authority] ?? 99;
    if (rankA !== rankB) return rankA - rankB;

    const timeA = a.publishedAt ? Date.parse(a.publishedAt) : Number.POSITIVE_INFINITY;
    const timeB = b.publishedAt ? Date.parse(b.publishedAt) : Number.POSITIVE_INFINITY;
    if (timeA !== timeB) return timeA - timeB;

    return a.id - b.id;
  })[0];
}

function clusterIdFor(ticker: string, canonical: ClusterableSource): string {
  const headline = normaliseHeadline(canonical.title ?? '');
  /*
   * An exhibit whose title has no headline words (every title `exhibitTitle` writes) takes its id
   * from its filing's accession, so two filings' exhibits published at one instant never share an id.
   * Stored rows keep their ids under this rule (replay on the 10-07 copy,
   * docs/research/source-titles/exhibit-cluster-replay.py: 10,450 of 10,450 catalyst rows' stored ids
   * reproduced), which matters because the catalyst fingerprint hashes the id.
   */
  const key =
    headline === '' && canonical.sourceType === 'SEC_EXHIBIT' && canonical.accession ? canonical.accession : headline;
  const basis = `${ticker}|${key}|${canonical.publishedAt ?? ''}`;
  return createHash('sha256').update(basis).digest('hex').slice(0, 16);
}

/**
 * Groups sources into announcement clusters.
 *
 * Single-member clusters are produced too: every announcement has a canonical
 * source, whether or not it was syndicated, so downstream code never has to
 * special-case the lone-source shape.
 */
export function clusterSources(
  ticker: string,
  sources: readonly ClusterableSource[],
): SourceCluster[] {
  const remaining = [...sources];
  const clusters: SourceCluster[] = [];

  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    const members = [seed];
    let confidence: SourceCluster['confidence'] = 'HIGH';
    const reasons: string[] = [];

    for (let i = remaining.length - 1; i >= 0; i -= 1) {
      const verdict = sameAnnouncement(seed, remaining[i]);
      if (!verdict.same) continue;
      members.push(remaining[i]);
      reasons.push(verdict.reason);
      if (verdict.confidence === 'LOW') confidence = 'LOW';
      else if (verdict.confidence === 'MEDIUM' && confidence === 'HIGH') confidence = 'MEDIUM';
      remaining.splice(i, 1);
    }

    const canonical = selectCanonical(members);
    clusters.push({
      clusterId: clusterIdFor(ticker, canonical),
      memberIds: members.map((member) => member.id),
      canonicalId: canonical.id,
      canonicalAuthority: canonical.authority,
      confidence: members.length === 1 ? 'HIGH' : confidence,
      reason: members.length === 1 ? 'single source' : reasons.join('; '),
    });
  }

  return clusters;
}
