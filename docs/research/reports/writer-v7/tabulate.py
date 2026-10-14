"""Tabulates the writer v7 test's raw output, per arm (prompt x writer). Written BEFORE the run.

Run: python -I docs/research/reports/writer-v7/tabulate.py <out-dir>
Reads records.json and each run's <tag>.json (the draft the writer returned, before the checker).
"""
import collections
import json
import os
import re
import sys

OUT = sys.argv[1]
records = json.load(open(os.path.join(OUT, 'records.json'), encoding='utf-8'))

RULED = {
    'NOT_RESEARCHED': 'not researched at this checkpoint',
    'NONE_FOUND': 'no catalyst found in our sources',
    'UNKNOWN': 'our research reached no conclusion',
}
FIGURE = re.compile(r'\d[\d,.]*\s*(?:percent|%)|\$\s?\d')
CLOCK = re.compile(r'\b\d{1,2}:\d{2}\b')
NUMBER_REASONS = {'NUMBER_NOT_IN_ROW', 'NUMBER_WITHOUT_ROW'}


def draft_of(tag):
    data = json.load(open(os.path.join(OUT, f'{tag}.json'), encoding='utf-8'))
    draft = data.get('draft') or {}
    lines = [l for s in draft.get('sections', []) for l in s.get('lines', [])]
    return draft.get('overall'), lines


def words(text, tickers):
    t = text.lower()
    for ticker in tickers:
        t = re.sub(r'(?<![a-z0-9.])' + re.escape(ticker.lower()) + r'(?![a-z0-9])', ' ', t)
    return re.findall(r"[a-z']+", t)


def top_gram_share(lines, tickers, n=4):
    """The share of a report's lines that contain its most common n-word sequence (each line counted once)."""
    if len(lines) < 2:
        return None, None
    per_line = [set(zip(*[words(l['text'], tickers)[i:] for i in range(n)])) for l in lines]
    counts = collections.Counter(g for grams in per_line for g in grams)
    if not counts:
        return 0.0, None
    gram, c = counts.most_common(1)[0]
    return c / len(lines), ' '.join(gram)


arms = collections.OrderedDict()
for r in records:
    arms.setdefault((r['prompt'], r['writer']), []).append(r)

for (prompt, writer), rs in arms.items():
    published = [r for r in rs if r['status'] == 'PUBLISHED']
    lines = sum(r['lines'] for r in published)
    struck = sum(len(r['struck']) for r in published)
    reasons = collections.Counter(s['reason'] for r in published for s in r['strikes'])
    by = collections.Counter(s['by'] for r in published for s in r['strikes'])
    numbers = sum(1 for r in published for s in r['strikes'] if s['reason'] in NUMBER_REASONS)
    shares, grams = [], collections.Counter()
    ruled_hit, ruled_all = collections.Counter(), collections.Counter()
    figures = clocks = in_sources = line_words = n_lines = summary_words = n_summaries = 0
    for r in published:
        overall, dl = draft_of(r['tag'])
        tickers = list(r['names'].keys())
        share, gram = top_gram_share(dl, tickers)
        if share is not None:
            shares.append(share)
        if gram:
            grams[gram] += 1
        for l in dl:
            name = r['names'].get(l.get('ticker') or '', {})
            status = name.get('status')
            text = l['text']
            if status in RULED:
                ruled_all[status] += 1
                ruled_hit[status] += int(RULED[status] in text.lower())
            if name.get('hasPath') and FIGURE.search(text):
                figures += 1
            clocks += len(CLOCK.findall(text))
            in_sources += int('in our sources' in text.lower())
            line_words += len(text.split())
            n_lines += 1
        if overall:
            clocks += len(CLOCK.findall(overall))
            summary_words += len(overall.split())
            n_summaries += 1
    cost = sum(r['costUsd'] for r in rs)
    print(f'== prompt {prompt}, writer {writer}: runs {len(rs)}, published {len(published)}, errors {sum(1 for r in rs if r["error"])}')
    print(f'  lines struck {struck} of {lines} ({100 * struck / lines if lines else 0:.1f}%); Summary struck {sum(r["narrativeStruck"] for r in published)} of {len(published)}; by {dict(by)}')
    print(f'  reasons {dict(reasons.most_common())}')
    print(f'  number errors {numbers}')
    print(f'  repetition: mean share of a report\'s lines carrying its most common 4-word sequence {sum(shares) / len(shares) if shares else 0:.2f} over {len(shares)} reports; most frequent top sequences {grams.most_common(3)}')
    print(f'  lines saying "in our sources" {in_sources} of {n_lines}')
    print(f'  ruled state phrase exact: ' + ', '.join(f'{k} {ruled_hit[k]} of {ruled_all[k]}' for k in RULED))
    print(f'  name lines with a card path that state a figure {figures}; clock times {clocks}')
    print(f'  mean words: line {line_words / n_lines if n_lines else 0:.1f}, Summary {summary_words / n_summaries if n_summaries else 0:.1f}')
    print(f'  cost ${cost:.4f} (${cost / len(rs) if rs else 0:.4f} a report); mean prompt chars system+user {sum(r["systemChars"] + r["userChars"] for r in rs) / len(rs):.0f}')
