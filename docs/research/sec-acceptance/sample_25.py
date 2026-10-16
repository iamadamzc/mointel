"""Read-only: compare stored SEC filing instants (and EDGAR's submissions JSON) with the filing's own index header.

The header's ACCEPTANCE-DATETIME is Eastern (WETO 6-K: header 17:00:01 ET, JSON 21:00:01Z). Every date here is in
EDT (before Nov 1), so ET = UTC - 4h.
"""
import html, json, random, re, sqlite3, sys, time, urllib.request
from datetime import datetime, timedelta, timezone

sys.stdout.reconfigure(encoding='utf-8')
UA = {'User-Agent': 'mointel research iamadamzc@gmail.com'}


def get(url):
    time.sleep(0.15)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read().decode('utf-8', 'replace')


def header_utc(cik, accession):
    acc = accession.replace('-', '')
    t = get(f'https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc}/{accession}-index-headers.html')
    m = re.search(r'ACCEPTANCE-DATETIME&gt;(\d{14})|ACCEPTANCE-DATETIME>(\d{14})', t)
    if not m:
        return None
    et = datetime.strptime(m.group(1) or m.group(2), '%Y%m%d%H%M%S')
    return (et + timedelta(hours=4)).replace(tzinfo=timezone.utc)


def iso(s):
    return datetime.fromisoformat(s.replace('Z', '+00:00'))



rows = []
for db in sys.argv[1:-1]:
    c = sqlite3.connect(f'file:{db}?mode=ro', uri=True)
    rows += [(db, *r) for r in c.execute(
        "SELECT id, url, accession, published_at, fetched_at FROM research_sources "
        "WHERE source_type = 'SEC_FILING' AND published_precision = 'EXACT' AND accession IS NOT NULL AND published_at >= '2026-09-01'"
    )]
random.seed(20261016)
sample = random.sample(rows, min(25, len(rows)))
subs = {}
lines = ['| source id | accession | form | stored (UTC) | EDGAR JSON today (UTC) | EDGAR header (UTC, from ET) | stored - header | JSON - header | fetched |', '|---|---|---|---|---|---|---|---|---|']
off = 0
for db, sid, url, acc, pub, fetched in sample:
    cik = re.search(r'/data/(\d+)/', url).group(1)
    if cik not in subs:
        subs[cik] = json.loads(get(f'https://data.sec.gov/submissions/CIK{int(cik):010d}.json'))['filings']['recent']
    r = subs[cik]
    i = r['accessionNumber'].index(acc) if acc in r['accessionNumber'] else None
    js = r['acceptanceDateTime'][i] if i is not None else None
    form = r['form'][i] if i is not None else '?'
    h = header_utc(cik, acc)
    s = iso(pub)
    d1 = (s - h) if h else None
    d2 = (iso(js) - h) if (h and js) else None
    off += bool(d1)
    fmt = lambda d: '0' if d == timedelta(0) else (('+' if d > timedelta(0) else '-') + str(abs(d)))
    lines.append(f'| {sid} | {acc} | {form} | {s.strftime("%Y-%m-%d %H:%M:%S")} | {iso(js).strftime("%Y-%m-%d %H:%M:%S") if js else "not in recent"} | {h.strftime("%Y-%m-%d %H:%M:%S") if h else "?"} | {fmt(d1) if d1 is not None else "?"} | {fmt(d2) if d2 is not None else "?"} | {fetched[:16]} |')
NL = chr(10)
open(sys.argv[-1], 'w', encoding='utf-8').write(NL.join(lines) + NL + NL + f'stored differs from header: {off} of {len(sample)}' + NL)
print('wrote', sys.argv[-1], 'off', off)
