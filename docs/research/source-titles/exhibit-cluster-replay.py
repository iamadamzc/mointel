"""Does the timestamp-free exhibit title (bca12631) change catalyst clustering? (Integration 36th's condition.)

Replays lib/research/catalyst/cluster.ts (clusterSources, sameAnnouncement, clusterIdFor; noise list read
from the file) over each ticker's catalyst sources in the order readSources returns them
(authority ASC, published_at DESC; ties by id), twice:
  A: titles as stored;
  B: every SEC_EXHIBIT title replaced by exhibitTitle(metadata.exhibitType, sec_form).
CONTROL: A's cluster id for each member must equal the stored cluster_id (the last persisted run) on
nearly every row; the match rate is printed before any A/B result, and the A/B result is not read if
it is low.
REPORTS: exhibit-involving pairs together in A and apart in B, and the reverse; tickers affected;
B clusters that share one cluster id (clusterIdFor hashes ticker|normalised title|publishedAt, and the
new title normalises to nothing).

Usage: python -I docs/research/source-titles/exhibit-cluster-replay.py <store copy> <cluster.ts>
"""
import collections
import datetime
import hashlib
import json
import re
import sqlite3
import sys

CATALYST_TYPES = {'SEC_EXHIBIT', 'COMPANY_IR', 'COMPANY_NEWSROOM', 'COMPANY_RELEASE', 'NEWSWIRE',
                  'SECONDARY_DISCOVERY', 'NEWS_FEED'}
THRESHOLD = 0.6
TOLERANCE_HOURS = 48
AUTHORITY_RANK = {'SEC': 1, 'EXCHANGE': 2, 'COMPANY_IR': 3, 'NEWSWIRE': 4, 'MARKET_DATA': 5, 'SECONDARY': 6}


def noise_words(cluster_ts):
    text = open(cluster_ts, 'rb').read().decode('utf-8')
    block = text.split('const HEADLINE_NOISE = new Set([', 1)[1].split(']);', 1)[0]
    return set(re.findall(r"'([^']*)'", block))


def normalise(title, noise):
    words = re.sub(r'[^a-z0-9\s]', ' ', title.lower()).split()
    return ' '.join(w for w in words if len(w) > 2 and w not in noise).strip()


def tokens(title, noise):
    return {t for t in normalise(title, noise).split(' ') if t}


def similarity(a, b, noise):
    left, right = tokens(a, noise), tokens(b, noise)
    if not left or not right:
        return 0.0
    shared = len(left & right)
    union = len(left) + len(right) - shared
    return 0.0 if union == 0 else shared / union


def parse_ms(value):
    if not value:
        return None
    try:
        text = value.replace('Z', '+00:00')
        moment = datetime.datetime.fromisoformat(text)
        if moment.tzinfo is None:
            moment = moment.replace(tzinfo=datetime.timezone.utc)
        return moment.timestamp() * 1000
    except ValueError:
        return None


FIX = False  # option F1: exhibits of one filing (same accession) are one announcement; an exhibit whose
             # title normalises to nothing takes its cluster id from the accession


def same(a, b, noise):
    if a['content_hash'] and a['content_hash'] == b['content_hash']:
        return True
    if (FIX and a['source_type'] == 'SEC_EXHIBIT' and b['source_type'] == 'SEC_EXHIBIT'
            and a['accession'] and a['accession'] == b['accession']):
        return True
    if similarity(a['title'] or '', b['title'] or '', noise) < THRESHOLD:
        return False
    left, right = parse_ms(a['published_at']), parse_ms(b['published_at'])
    if left is None or right is None:
        return True
    return abs(left - right) / 3_600_000 <= TOLERANCE_HOURS


def canonical(members):
    def key(s):
        t = parse_ms(s['published_at'])
        return (AUTHORITY_RANK.get(s['authority'], 99), t if t is not None else float('inf'), s['id'])
    return sorted(members, key=key)[0]


def cluster_id(ticker, canon, noise):
    headline = normalise(canon['title'] or '', noise)
    if FIX and headline == '' and canon['source_type'] == 'SEC_EXHIBIT' and canon['accession']:
        basis = f"{ticker}|{canon['accession']}|{canon['published_at'] or ''}"
        return hashlib.sha256(basis.encode('utf-8')).hexdigest()[:16]
    basis = f"{ticker}|{headline}|{canon['published_at'] or ''}"
    return hashlib.sha256(basis.encode('utf-8')).hexdigest()[:16]


def cluster(ticker, sources, noise):
    remaining = list(sources)
    out = []
    while remaining:
        seed = remaining.pop(0)
        members = [seed]
        for i in range(len(remaining) - 1, -1, -1):
            if same(seed, remaining[i], noise):
                members.append(remaining.pop(i))
        canon = canonical(members)
        out.append((cluster_id(ticker, canon, noise), [m['id'] for m in members], canon['id']))
    return out


def exhibit_title(row):
    try:
        exhibit_type = json.loads(row['metadata'] or '{}').get('exhibitType')
    except ValueError:
        exhibit_type = None
    if not isinstance(exhibit_type, str) or not exhibit_type.strip():
        return row['title']
    form = (row['sec_form'] or '').strip()
    return exhibit_type if form == '' else f'{exhibit_type} to {form}'


def main(store, cluster_ts):
    noise = noise_words(cluster_ts)
    db = sqlite3.connect(f'file:{store}?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    rows = db.execute(
        'SELECT id, ticker, source_type, title, published_at, content_hash, authority, sec_form, accession, metadata, cluster_id, canonical '
        'FROM research_sources ORDER BY ticker, authority ASC, published_at DESC, id ASC'
    ).fetchall()
    by_ticker = collections.defaultdict(list)
    for r in rows:
        if r['source_type'] in CATALYST_TYPES:
            by_ticker[r['ticker']].append(dict(r))

    match = total = ex_match = ex_total = 0
    together_a_apart_b = together_b_apart_a = 0
    tickers_changed = set()
    shared_id_clusters = shared_id_tickers = 0
    split_kinds = collections.Counter()
    canon_match, canon_total = [0], [0]
    # Tickers whose stored (cluster_id, canonical) would change on re-clustering the STORED rows, i.e. whose
    # catalyst fingerprint (fingerprint.ts: url, contentHash, publishedAt, clusterId, canonical) would move
    # on the next job with no new source.
    fingerprint_tickers = set()
    examples = []
    for ticker, sources in by_ticker.items():
        a = cluster(ticker, sources, noise)
        stored = {s['id']: s['cluster_id'] for s in sources}
        kind = {s['id']: s['source_type'] for s in sources}
        stored_canon = {s['id']: s['canonical'] == 1 for s in sources}
        fingerprint_moves = False
        for cid, ids, canon_id in a:
            for i in ids:
                total += 1
                match += stored[i] == cid
                canon_total[0] += 1
                canon_match[0] += stored_canon[i] == (i == canon_id)
                if stored[i] != cid or stored_canon[i] != (i == canon_id):
                    fingerprint_moves = True
                if kind[i] == 'SEC_EXHIBIT':
                    ex_total += 1
                    ex_match += stored[i] == cid
        if fingerprint_moves:
            fingerprint_tickers.add(ticker)
        b_sources = [dict(s, title=exhibit_title(s)) if s['source_type'] == 'SEC_EXHIBIT' else s for s in sources]
        b = cluster(ticker, b_sources, noise)
        b_group = {}
        for n, (cid, ids, _) in enumerate(b):
            for i in ids:
                b_group[i] = n
        a_group = {}
        for n, (cid, ids, _) in enumerate(a):
            for i in ids:
                a_group[i] = n
        ids = [s['id'] for s in sources]
        changed_here = False
        for x in range(len(ids)):
            for y in range(x + 1, len(ids)):
                p, q = ids[x], ids[y]
                if kind[p] != 'SEC_EXHIBIT' and kind[q] != 'SEC_EXHIBIT':
                    continue
                in_a = a_group[p] == a_group[q]
                in_b = b_group[p] == b_group[q]
                if in_a and not in_b:
                    together_a_apart_b += 1
                    changed_here = True
                    both = kind[p] == 'SEC_EXHIBIT' and kind[q] == 'SEC_EXHIBIT'
                    split_kinds['exhibit-exhibit' if both else 'exhibit-other'] += 1
                    if len(examples) < 6:
                        examples.append((ticker, p, q))
                elif in_b and not in_a:
                    together_b_apart_a += 1
                    changed_here = True
        if changed_here:
            tickers_changed.add(ticker)
        id_counts = collections.Counter(cid for cid, _, _ in b)
        dup = sum(1 for c in id_counts.values() if c > 1)
        if dup:
            shared_id_clusters += dup
            shared_id_tickers += 1

    print(f'CONTROL stored cluster_id reproduced: {match} of {total} catalyst rows; exhibits {ex_match} of {ex_total}')
    print(f'CONTROL stored canonical flag reproduced: {canon_match[0]} of {canon_total[0]}')
    print(f'tickers whose fingerprint inputs move on re-clustering the stored rows: {len(fingerprint_tickers)} {sorted(fingerprint_tickers)[:12]}')
    print(f'tickers with catalyst sources: {len(by_ticker)}')
    print(f'exhibit pairs together OLD, apart NEW: {together_a_apart_b} {dict(split_kinds)}')
    print(f'exhibit pairs apart OLD, together NEW: {together_b_apart_a}')
    print(f'tickers with any changed exhibit pair: {len(tickers_changed)}')
    print(f'NEW: cluster ids shared by more than one cluster: {shared_id_clusters} ids on {shared_id_tickers} tickers')
    for ticker, p, q in examples:
        tp = db.execute('SELECT source_type, title FROM research_sources WHERE id = ?', (p,)).fetchone()
        tq = db.execute('SELECT source_type, title FROM research_sources WHERE id = ?', (q,)).fetchone()
        print('  example', ticker, p, tuple(tp), '|', q, tuple(tq))


if __name__ == '__main__':
    # Third argument "fix": A and B both run under option F1. The control then tests that F1 leaves every
    # STORED row's cluster id unchanged (no fingerprint change from the fix alone), and B shows F1 with
    # the new titles.
    FIX = len(sys.argv) > 3 and sys.argv[3] == 'fix'
    print('MODE', 'F1 fix' if FIX else 'as built (bca12631)')
    main(sys.argv[1], sys.argv[2])
