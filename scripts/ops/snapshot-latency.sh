#!/usr/bin/env bash
# Board snapshot latency: GET /api/market straight to Next.js on the box
# (127.0.0.1:3000, behind nginx, so no Basic Auth), 1 cold + N warm, median and max.
# READ-ONLY. Integration's pre-registered measurement for the Now field (2026-09-29):
# nowBuckets may add no more than 20 ms to the warm max.
# Run: ssh mointel-ssm 'bash -s -- [warm]' < scripts/ops/snapshot-latency.sh
set -euo pipefail
WARM="${1:-20}"
URL=http://127.0.0.1:3000/api/market
t() { curl -s -o /dev/null -w '%{http_code} %{time_total}\n' "$URL"; }
read -r code cold <<<"$(t)"
echo "cold: HTTP $code ${cold}s"
[ "$code" = 200 ] || { echo "not 200 -- not a measurement"; exit 1; }
for _ in $(seq "$WARM"); do t; done | awk -v n="$WARM" '
  $1 != 200 { bad++ } { ms[NR] = $2 * 1000 }
  END {
    asort(ms)
    printf "warm n=%d  median %.1f ms  max %.1f ms  non-200 %d\n", n, (ms[int((n+1)/2)] + ms[int(n/2)+1]) / 2, ms[n], bad
  }'
