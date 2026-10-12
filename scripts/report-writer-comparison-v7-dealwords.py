"""Per writer arm: struck lines whose ONLY strikes are the advice-word rule on "sell" or "entered" (phase 1).

Run: python -I scripts/report-writer-comparison-v7-dealwords.py <raw-dir>
"""
import collections
import json
import sys

R = json.load(open(f"{sys.argv[1]}/records.json", encoding="utf-8"))
for arm in ["luna", "claude-opus-5-5", "claude-fable-5-1"]:
    rows = [r for r in R if r["phase"] == 1 and r["writer"] == arm and not r["error"]]
    only = 0
    struck = 0
    lines = 0
    detail_hits = 0
    for r in rows:
        d = json.load(open(f"{sys.argv[1]}/{r['tag']}.json", encoding="utf-8"))
        strikes = (d["result"] or {}).get("diagnostics", {}).get("strikes", [])
        lines += r["lines"]
        by_id = collections.defaultdict(list)
        for s in strikes:
            by_id[s["id"]].append(s)
        struck += len(by_id)
        for sid, ss in by_id.items():
            deal = [s for s in ss if s["reason"] == "FORBIDDEN_WORDING" and s["detail"] in ('buy/sell: "sell"', 'enter/entry: "entered"')]
            detail_hits += len(deal)
            if deal and len(deal) == len(ss):
                only += 1
    print(f"{arm}: struck {struck} of {lines}; struck ONLY by sell/entered {only}; without them {struck - only} of {lines} ({100 * (struck - only) / lines:.1f}%); sell/entered strike entries {detail_hits}")
