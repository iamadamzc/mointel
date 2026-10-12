"""Tabulates the v7 reports test from raw/records.json. Written before the raw is read.

Run: python -I scripts/report-writer-comparison-v7-tabulate.py <raw-dir>
"""
import collections
import json
import sys

raw = sys.argv[1]
records = json.load(open(f"{raw}/records.json", encoding="utf-8"))


def arm_rows(rows, label):
    out = []
    run = [r for r in rows if not r["error"]]
    pub = [r for r in run if r["status"] == "PUBLISHED"]
    lines = sum(r["lines"] for r in run)
    struck = sum(len(r["struck"]) for r in run)
    by = collections.Counter(s["by"] for r in run for s in r["strikes"])
    reasons = collections.Counter(s["reason"] for r in run for s in r["strikes"])
    summ = sum(1 for r in run if r["narrativeStruck"])
    cost = sum(r["costUsd"] for r in rows)
    w_in = [u["inputTokens"] for r in rows for u in r["usage"] if u["role"] == "writer" and u["inputTokens"] is not None]
    w_out = [u["outputTokens"] for r in rows for u in r["usage"] if u["role"] == "writer" and u["outputTokens"] is not None]
    c_in = [u["inputTokens"] for r in rows for u in r["usage"] if u["role"] == "checker" and u["inputTokens"] is not None]
    c_out = [u["outputTokens"] for r in rows for u in r["usage"] if u["role"] == "checker" and u["outputTokens"] is not None]
    mean = lambda xs: round(sum(xs) / len(xs)) if xs else None
    share = f"{100 * struck / lines:.1f}%" if lines else "n/a"
    out.append(
        f"{label}: inputs {len(rows)}, errors {len(rows) - len(run)}, published {len(pub)}, MISSED {len(run) - len(pub)}; "
        f"lines struck {struck} of {lines} ({share}); by rule {by.get('rule', 0)}, by model {by.get('model', 0)}; "
        f"Summary struck {summ} of {len(run)}; cost ${cost:.4f} (${cost / len(rows):.4f} a report)"
        if rows
        else f"{label}: no rows"
    )
    out.append(f"    reasons: {dict(sorted(reasons.items(), key=lambda kv: -kv[1]))}")
    out.append(f"    mean tokens writer in/out {mean(w_in)}/{mean(w_out)}, checker in/out {mean(c_in)}/{mean(c_out)}")
    for r in rows:
        if r["error"]:
            out.append(f"    ERROR {r['tag']}: {r['error']}")
    return out


report = ["PHASE 1: writer arms, checker terra (same 12 inputs where run)"]
for w in ["luna", "claude-opus-5-5", "claude-fable-5-1"]:
    report += arm_rows([r for r in records if r["phase"] == 1 and r["writer"] == w], f"  writer {w}")

report += ["", "PHASE 2: checker arms on luna's replayed draft; terra = phase 1's luna row on the SAME inputs"]
p2_inputs = sorted({(r["day"], r["kind"]) for r in records if r["phase"] == 2 and not r["error"]})
terra_same = [r for r in records if r["phase"] == 1 and r["writer"] == "luna" and (r["day"], r["kind"]) in p2_inputs]
report += arm_rows(terra_same, f"  checker terra (phase 1, {len(p2_inputs)} inputs matched)")
for c in ["claude-opus-5-5", "claude-fable-5-1"]:
    report += arm_rows([r for r in records if r["phase"] == 2 and r["checker"] == c], f"  checker {c}")

report += ["", "PHASE 2 per input: model-struck line ids (terra | opus | fable)"]
for day, kind in p2_inputs:
    def model_ids(r):
        return sorted({s["id"] for s in r["strikes"] if s["by"] == "model"}) if r else None
    t = next((r for r in terra_same if r["day"] == day and r["kind"] == kind), None)
    o = next((r for r in records if r["phase"] == 2 and r["checker"] == "claude-opus-5-5" and r["day"] == day and r["kind"] == kind), None)
    f = next((r for r in records if r["phase"] == 2 and r["checker"] == "claude-fable-5-1" and r["day"] == day and r["kind"] == kind), None)
    report.append(f"  {day} {kind}: {model_ids(t)} | {model_ids(o)} | {model_ids(f)}")

report += ["", f"TOTAL cost ${sum(r['costUsd'] for r in records):.4f} over {len(records)} runs"]
print("\n".join(report))
