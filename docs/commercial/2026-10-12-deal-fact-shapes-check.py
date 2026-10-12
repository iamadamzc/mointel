import json, glob, re, sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
MONTH = r"(?:January|February|March|April|May|June|July|August|September|October|November|December)"
NOUNS = r"(?:agreement|contract|facility|arrangement|lease|licen[cs]e|merger|purchase|sale|offering|plan|term sheet|letter of intent|indication of interest|memorandum|settlement|loan|placement|subscription|partnership|joint venture)"
PRON = r"(?!(?:It|This|That|He|She|They|Price|The stock|The name|The move)\b)"

# ENTER shapes first; each is replaced by a neutral cue word so the sell/buy shape can still see "agreement".
ENTER_SHAPES = [
    re.compile(r"\b(?:entered|enters|entering)\s+(?:into\s+)?(?:a|an|the|its|their)\s+(?:[\w\-,$.%]+\s+){0,6}?" + NOUNS + r"\b", re.I),
    re.compile(r"\b(?:entered|enters|entering)\s+(?:into\s+)?(?:[\w\-]+\s+){0,3}?(?:agreements|contracts|arrangements|leases|licen[cs]es)\b", re.I),
    re.compile(r"\bentry into (?:a|an|the)\s+(?:[\w\-]+\s+){0,6}?agreement\b", re.I),
    re.compile(r"\b(?:agreement|contract|lease|arrangement),?\s+entered\s+(?:on\s+)?" + MONTH + r"\s+\d{1,2}\b", re.I),
]
OTHER_SHAPES = [
    re.compile(r"\b(?:agree[ds]?|agreements?|contracts?|deals?|offers?|options?|right|obligation|obligated|plans?|intends?|proposes?|seeks?|offered|allow(?:s|ed|ing)|enabl(?:es|ed|ing)|permit(?:s|ted|ting)|direct)\b[^.;]{0,60}?\bto (?:sell|buy)\b(?! into\b)(?! the (?:news|rip|pop|spike|dip)\b)", re.I),
    re.compile(r"\bselling (?:stockholders?|shareholders?|securityholders?|security holders?)\b", re.I),
    re.compile(r"(?:[Tt]he company|[Mm]anagement|" + PRON + r"[A-Z][\w&.'-]*(?: [A-Z][\w&.'-]*){0,3}) confirmed (?:that|it (?:had|has))\b"),
]
BAN = [
    re.compile(r"\b(?:buy|buys|buying|sell|sells)\b|(?<!proof of )(?<!confirmed )(?<!not )\bselling\b", re.I),
    re.compile(r"\b(?:enter|enters|entered|entering|entry)\b", re.I),
    re.compile(r"\bconfirmed\b", re.I),
]


def verdict(t):
    for s in ENTER_SHAPES:
        t = s.sub(' agreement ', t)
    for s in OTHER_SHAPES:
        t = s.sub(' ', t)
    return [i for i, b in enumerate(BAN) if b.search(t)]


if __name__ == '__main__':
    seen = {}
    for f in sorted(glob.glob(sys.argv[1] + '/p*.json')):
        j = json.load(open(f, encoding='utf-8'))
        if not isinstance(j, dict):
            continue
        dr = j['draft']
        lines = {}
        for si, sec in enumerate(dr.get('sections', [])):
            for li, l in enumerate(sec.get('lines', [])):
                lines['S%dL%d' % (si + 1, li + 1)] = l.get('text', '')
        lines['O'] = dr.get('overall', '')
        for s in j['record'].get('strikes', []):
            if s.get('reason') == 'FORBIDDEN_WORDING':
                t = lines.get(s['id'], '')
                if any(b.search(t) for b in BAN):
                    seen[t] = 1
    print('struck lines with a ban hit:', len(seen))
    still = [t for t in seen if verdict(t)]
    print('still struck after shapes:', len(still))
    for t in still:
        print(' STILL:', re.findall(r'.{0,50}\b(?:buy|buys|buying|sell|sells|selling|enter|entered|enters|entering|entry|confirmed)\b.{0,50}', t, re.I)[:2])
    neg = [
        "Traders could sell into strength here.",
        "The stock is worth buying on the dip.",
        "Entry at 4.20 looked clean.",
        "It entered the top 12 at 09:25.",
        "Wait to enter a position.",
        "It confirmed the breakout on volume.",
        "The catalyst is confirmed.",
        "The move was confirmed by volume.",
        "NFT Ltd agreed to sell into strength.",
        "NFT Ltd agreed to sell shares, so sell into strength.",
        "Buying pressure and selling pressure rose.",
        "It confirmed it had broken out.",
        "Consider buying here.",
        "The company entered the premarket list.",
        "The name entered at the open and traders should buy the dip.",
        "NFT Ltd entered an agreement to sell shares; traders should sell into the rip.",
    ]
    bad = [t for t in neg if not verdict(t)]
    print('negatives that wrongly PASS:', len(bad), 'of', len(neg))
    for t in bad:
        print('  PASSES (bad):', t)
