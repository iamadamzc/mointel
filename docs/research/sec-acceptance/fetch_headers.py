"""Read-only: fetch each stored SEC accession's EDGAR index header once and cache ACCEPTANCE-DATETIME and FILED AS OF.

Usage: python -I fetch_headers.py <cache.jsonl> <store.db> [<store.db> ...]
Resumable: accessions already in the cache are skipped. About 7 requests a second (SEC's limit is 10).
The header's ACCEPTANCE-DATETIME is Eastern; stored here as written, with the UTC instant computed by the US DST rule.
"""
import json, os, re, sqlite3, sys, time, urllib.error, urllib.request
from datetime import datetime, timedelta, timezone

UA = {'User-Agent': 'mointel research iamadamzc@gmail.com'}
cache_path, stores = sys.argv[1], sys.argv[2:]


def us_eastern_offset(local: datetime) -> int:
    """Hours to add to Eastern local time to get UTC: 4 in EDT, 5 in EST (second Sunday March 2:00 to first Sunday November 2:00)."""
    y = local.year
    march = datetime(y, 3, 8)
    start = march + timedelta(days=(6 - march.weekday()) % 7, hours=2)
    nov = datetime(y, 11, 1)
    end = nov + timedelta(days=(6 - nov.weekday()) % 7, hours=2)
    return 4 if start <= local < end else 5


done = set()
if os.path.exists(cache_path):
    for line in open(cache_path, encoding='utf-8'):
        done.add(json.loads(line)['accession'])

todo = {}
for db in stores:
    c = sqlite3.connect(f'file:{db}?mode=ro', uri=True)
    for acc, url in c.execute(
        "SELECT accession, url FROM research_sources WHERE accession IS NOT NULL AND source_type IN ('SEC_FILING','SEC_EXHIBIT') AND published_precision IN ('EXACT','INFERRED') AND published_at LIKE '%T%'"
    ):
        m = re.search(r'/data/(\d+)/', url or '')
        if m and acc not in done:
            todo.setdefault(acc, m.group(1))
print(f'{len(done)} cached, {len(todo)} to fetch', flush=True)

out = open(cache_path, 'a', encoding='utf-8')
n = 0
for acc, cik in todo.items():
    url = f'https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc.replace("-", "")}/{acc}-index-headers.html'
    rec = {'accession': acc, 'cik': cik, 'acceptanceEt': None, 'acceptanceUtc': None, 'filedAsOf': None, 'error': None}
    for attempt in range(3):
        try:
            time.sleep(0.14)
            t = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read().decode('utf-8', 'replace')
            a = re.search(r'ACCEPTANCE-DATETIME(?:&gt;|>)(\d{14})', t)
            f = re.search(r'FILED AS OF DATE:\s*(\d{8})', t)
            if a:
                et = datetime.strptime(a.group(1), '%Y%m%d%H%M%S')
                rec['acceptanceEt'] = et.strftime('%Y-%m-%d %H:%M:%S')
                rec['acceptanceUtc'] = (et + timedelta(hours=us_eastern_offset(et))).strftime('%Y-%m-%dT%H:%M:%S.000Z')
            if f:
                rec['filedAsOf'] = f'{f.group(1)[:4]}-{f.group(1)[4:6]}-{f.group(1)[6:]}'
            if not a:
                rec['error'] = 'no ACCEPTANCE-DATETIME'
            break
        except urllib.error.HTTPError as e:
            rec['error'] = f'HTTP {e.code}'
            if e.code in (403, 429, 503):
                time.sleep(5 * (attempt + 1))
                continue
            break
        except Exception as e:  # network
            rec['error'] = type(e).__name__
            time.sleep(3)
    out.write(json.dumps(rec) + '\n')
    out.flush()
    n += 1
    if n % 500 == 0:
        print(f'{n} of {len(todo)}', flush=True)
print(f'done {n}', flush=True)
