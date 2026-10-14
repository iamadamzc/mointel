"""Extract the real draft Summaries of three stored raw sets into count-keep-drafts-2026-10-14.json, and compute,
independently of the TypeScript, the totals the count-keep test asserts. Reads via `git show` from A:/mointel.
Run: python -I tests/desk/fixtures/extract-count-keep-drafts.py [--dump]
"""
import json
import re
import subprocess
import sys

REPO = 'A:/mointel'
OUT = 'A:/mointel-countkeep/tests/desk/fixtures/count-keep-drafts-2026-10-14.json'
SETS = [
    ('f71c48c2', 'docs/research/reports/writer-retest/raw'),
    ('7c2d8514', 'docs/research/reports/recap-check/raw-3'),
    ('83d99065', 'docs/research/reports/summary-length/raw'),
]
KINDS = ['PREMARKET', 'INTO_RTH', 'INTO_POWER_HOUR', 'AFTER_HOURS', 'EVENING']
CAP = {'PREMARKET': 4, 'EVENING': 4, 'INTO_RTH': 3, 'INTO_POWER_HOUR': 3, 'AFTER_HOURS': 3}


def git(*args):
    return subprocess.run(['git', '-C', REPO, *args], check=True, capture_output=True).stdout.decode('utf-8')


def extract():
    rows = []
    for sha, folder in SETS:
        names = git('ls-tree', '--name-only', sha, folder + '/').split('\n')
        for path in sorted(n for n in names if n.endswith('.json') and not n.endswith('records.json')):
            base = path.rsplit('/', 1)[1][:-5]
            if sha == 'f71c48c2' and '-v6-' not in base and '-v7-' not in base:
                continue
            data = json.loads(git('show', sha + ':' + path))
            record = data.get('record') or {}
            draft = record.get('draftSummary')
            if draft is None:
                draft = (data.get('draft') or {}).get('overall')
            kind = next(k for k in KINDS if '-' + k + '-' in base)
            if record.get('kind') not in (None, kind):
                raise SystemExit('kind mismatch ' + path)
            rows.append({'source': sha, 'tag': record.get('tag', base), 'kind': kind, 'draft': draft})
    return rows


# --- An independent port of splitSentences (lib/desk/reports/sentences.ts). ---
ABBREVIATIONS = {
    'Inc', 'Corp', 'Co', 'Ltd', 'Plc', 'LLC', 'Jr', 'Sr', 'No', 'Nos', 'vs', 'St', 'Mr', 'Ms', 'Mrs', 'Dr', 'approx', 'est',
    'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec',
}
BOUNDARY = re.compile(r'''[.!?]["')\]\u201d\u2019]*\s+(?=["'(\[\u201c\u2018]?[A-Z0-9$])''')


def abbreviation_before(text, end):
    before = text[:end]
    if re.search(r'(?:^|[\s(])(?:[A-Za-z]\.)+[A-Za-z]$', before):
        return True
    word = re.search(r'([A-Za-z]+)$', before)
    return word is not None and word.group(1) in ABBREVIATIONS


def split_sentences(text):
    out = []
    start = 0
    for match in BOUNDARY.finditer(text):
        stop = match.start()
        if text[stop] == '.' and abbreviation_before(text, stop):
            continue
        end = stop + len(match.group(0).rstrip())
        sentence = text[start:end].strip()
        if sentence:
            out.append(sentence)
        start = match.end()
    last = text[start:].strip()
    if last:
        out.append(last)
    return out


# --- The count sentence, the same shape as COUNT_SENTENCE in sentences.ts. ---
COUNT_SHAPE = re.compile(
    r'^(?:Of the (?:\d+ )?names the desk covers, (\w+) (?:had|has|have) fresh news'
    r'|(\w+) of (?:the )?(?:\d+ )?names the desk covers (?:had|has|have) fresh news'
    r'|Fresh news was found for (\w+) of (?:the )?(?:\d+ )?names the desk covers)[^,;:]*$',
    re.IGNORECASE,
)
COUNT_WORD = re.compile(
    r'^(?:\d+|none|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen'
    r'|seventeen|eighteen|nineteen|twenty|all)$',
    re.IGNORECASE,
)


class Count:
    @staticmethod
    def search(sentence):
        m = COUNT_SHAPE.search(sentence)
        return m is not None and COUNT_WORD.search(m.group(1) or m.group(2) or m.group(3)) is not None


class Loose:
    """Mutant 2: the matcher loosened to "names the desk covers" alone."""

    @staticmethod
    def search(sentence):
        return re.search('names the desk covers', sentence, re.IGNORECASE) is not None


COUNT = Loose if '--loose' in sys.argv else Count


def main():
    rows = extract()
    if '--dump' in sys.argv:
        for row in rows:
            print('==', row['source'], row['tag'], row['kind'])
            for s in split_sentences(row['draft'] or ''):
                print('   ', s)
        return
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
        f.write('\n')
    totals = {}
    for row in rows:
        t = totals.setdefault(row['source'], {'drafts': 0, 'matched': 0, 'cutAndAppended': 0, 'unmatched': 0})
        t['drafts'] += 1
        sentences = split_sentences(row['draft'] or '')
        hits = [i for i, s in enumerate(sentences) if COUNT.search(s)]
        if not hits:
            t['unmatched'] += 1
            near = [i + 1 for i, s in enumerate(sentences) if 'names the desk covers' in s.lower()]
            print('UNMATCHED', row['source'], row['tag'], 'cap', CAP[row['kind']], 'of', len(sentences), 'desk-covers sentence at', near)
            continue
        t['matched'] += 1
        if len(hits) > 1:
            print('MULTI', row['tag'], hits)
        cap = CAP[row['kind']]
        if len(sentences) > cap and not any(i < cap for i in hits):
            t['cutAndAppended'] += 1
            published = ' '.join(sentences[:cap] + [sentences[hits[0]]])
            if len(split_sentences(published)) != cap + 1:
                raise SystemExit('the appended count does not split as its own sentence: ' + row['tag'])
            print('CUT', row['source'], row['tag'], 'sentences', len(sentences), 'count at', hits[0] + 1)
    print(json.dumps(totals, indent=2))
    print('rows', len(rows))


main()
