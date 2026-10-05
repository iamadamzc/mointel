"""Build a /api/reports payload from Research's v6 sample reports, for a Design render.

Usage (from A:\\mointel or any checkout of this repo):

    python docs/Design/tools/v6_render_payload.py <sha> <folder> <out.json>

    e.g. 66d51856 docs/research/reports-v6/voice-run-v6c-cards <scratchpad>/payload.json

Reads v6-<KIND>-report.json for the four kinds at <sha> (each is a report exactly as
/api/reports serves it) and wraps them in a SessionReportsPayload with one slot per
kind for their trading date. With today's real clock every slot is past, so the
window opens on PREMARKET and lists the other three under "Earlier today".

Serve it through a TEMPORARY fixture route in YOUR worktree only (back up
app/api/reports/route.ts, swap in a GET that returns JSON.parse of the file,
restore after and check `git diff --quiet -- app/api/reports/route.ts`). Never commit
the fixture. Seventh Design seat, 2026-10-03.
"""

import json
import subprocess
import sys

KINDS = {
    # kind: (scheduledFor, relevantUntil) as UTC times on the trading date (PREMARKET's on the next day)
    'INTO_RTH': ('T13:27:00Z', 'T17:00:00Z', 0),
    'INTO_POWER_HOUR': ('T18:32:00Z', 'T20:00:00Z', 0),
    'AFTER_HOURS': ('T20:05:00Z', 'T23:59:00Z', 0),
    'PREMARKET': ('T02:05:00Z', 'T13:30:00Z', 1),
}


def show(sha: str, path: str) -> str:
    return subprocess.run(['git', 'show', f'{sha}:{path}'], capture_output=True, text=True, encoding='utf-8', check=True).stdout


def main() -> None:
    sha, folder, out = sys.argv[1], sys.argv[2].rstrip('/'), sys.argv[3]
    reports, slots = [], []
    for kind, (start, until, next_day) in KINDS.items():
        report = json.loads(show(sha, f'{folder}/v6-{kind}-report.json'))
        reports.append(report)
        day = report['targetTradingDate'] if next_day and report.get('targetTradingDate') else report['tradingDate']
        slots.append({
            'kind': kind,
            'rangeId': report['rangeId'],
            'tradingDate': report['tradingDate'],
            'targetTradingDate': report.get('targetTradingDate'),
            'scheduledFor': day + start,
            'relevantUntil': day + until,
        })
        names = [line for section in report['sections'] for line in section['lines'] if line['ticker']]
        print(kind, 'watch', report.get('watchCount'), 'cards', len(names),
              'empty', sum(1 for line in names if not line['text'].strip()),
              [(section['heading'], len(section['lines'])) for section in report['sections']])
    payload = {
        'ranges': [{'id': reports[0]['rangeId'], 'label': 'sample', 'min': reports[0]['range']['min'], 'max': reports[0]['range']['max']}],
        'defaultRangeId': reports[0]['rangeId'],
        'slots': slots,
        'reports': reports,
        'missedCauses': {},
    }
    with open(out, 'w', encoding='utf-8') as handle:
        json.dump(payload, handle)


if __name__ == '__main__':
    main()
