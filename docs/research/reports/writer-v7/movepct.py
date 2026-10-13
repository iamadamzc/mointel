import json, re, collections, sys
MOVE = re.compile(r'\b(?:up|down|rose|fell|gained|lost|jumped|surged|climbed|dropped|added|slid)\s+(?:about\s+|roughly\s+|nearly\s+)?\d[\d,.]*\s*(?:percent|%)|\d[\d,.]*\s*(?:percent|%)\s+(?:from|above|below|under|off|since)\s+(?:the|its)\b', re.I)
PRICE = re.compile(r'\$\d+\.\d{2}\b')
recs = json.load(open('raw/records.json', encoding='utf-8'))
for arm in [('v6', 'luna'), ('v7', 'luna'), ('v6', 'claude-opus-5-5'), ('v7', 'claude-opus-5-5')]:
    mv = pr = n = 0
    ex = []
    for r in recs:
        if (r['prompt'], r['writer']) != arm:
            continue
        d = json.load(open('raw/' + r['tag'] + '.json', encoding='utf-8'))
        for s in d['draft']['sections']:
            for l in s['lines']:
                if not r['names'].get(l.get('ticker') or '', {}).get('hasPath'):
                    continue
                n += 1
                m = MOVE.search(l['text'])
                if m:
                    mv += 1
                    if len(ex) < 2:
                        ex.append(l['text'][max(0, m.start() - 40):m.end() + 30])
                if PRICE.search(l['text']):
                    pr += 1
    print(arm, 'name lines with a card path', n, '| a move percent', mv, '| a cents price', pr)
    for e in ex:
        print('    e.g.', e)
