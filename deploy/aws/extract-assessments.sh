#!/usr/bin/env bash
#
# Pulls desk_assessments + desk_assessment_tickers down from production.
#
#   deploy/aws/extract-assessments.sh <host> <ssh-key> [output.db]
#   deploy/aws/extract-assessments.sh <host> <ssh-key> --check
#
# NO DATA COMES DOWN FROM PRODUCTION. This script is a named exception to that
# rule, authorised by the trader on 2026-09-10 for one refresh, and it is not a
# general-purpose extractor: it reads two small tables, read-only, and touches
# nothing else. If you are here to pull something different, you need his word
# for that thing, not this file's existence as precedent.
#
# WHY IT EXISTS. Coaching's local copy is a snapshot someone took on 2026-09-02
# and never replaced. Every question of the form "was that name on the board
# when he traded it" has been answered against it since, and answered SILENTLY
# WRONG -- the join returns confident zeros rather than errors. Nothing is
# missing on production's side; this closes a staleness gap, not a data hole.
#
# THE COVERAGE TABLE IS THE POINT, NOT THE DATA.
#
# The file this produces carries `extract_meta` and `extract_date_coverage`.
# Coaching asked for a meta ROW, on the correct reasoning that a filename is not
# a guard because it does not travel into a query result. A per-date TABLE goes
# further: it can be JOINed, so a query can be made structurally incapable of
# answering for a date the extract does not cover, rather than merely
# discouraged from asking.
#
# A SCALAR CEILING IS NOT A COMPLETENESS CERTIFICATE, which is why the per-date
# table is not decoration. `complete_through` is the newest whole date -- but
# 2026-08-19 holds 16 assessments and 2026-08-17 holds 2, both genuinely
# incomplete in production and both BELOW that ceiling. A guard that checked
# only the ceiling would wave those through. Join against the coverage table and
# they cannot pass.
#
# AND `max_trading_date` IS THE WORST POSSIBLE GATE, recorded here only as an
# observation. The newest date in any extract is the one most likely to be
# half-written, because the desk is still writing it. Gating on the max is how
# the 09-02 wall would have been rebuilt inside the fix for it.
#
set -euo pipefail

HOST="${1:-}"
KEY="${2:-}"
OUT="${3:-data/assessments-prod.db}"

if [ -z "$HOST" ] || [ -z "$KEY" ]; then
  echo "usage: extract-assessments.sh <host> <ssh-key> [output.db|--check]" >&2
  exit 2
fi

CHECK_ONLY=no
if [ "$OUT" = "--check" ]; then
  CHECK_ONLY=yes
  OUT=""
fi

# A complete trading date holds this many assessments. Observed on every whole
# date from 2026-08-18 onward. Overridable, because a number burned into a
# script outlives the schedule that produced it -- but changing it should be a
# decision, not a reflex when the refusal fires.
EXPECT_PER_DATE="${EXPECT_PER_DATE:-19}"

REMOTE_DB="${REMOTE_DB:-/var/lib/mointel/market.db}"
SSH="ssh -i $KEY -o StrictHostKeyChecking=no -o ConnectTimeout=15 ubuntu@$HOST"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# ------------------------------------------------------------- coverage ---
#
# Read the per-date counts BEFORE deciding anything. This is the whole gate:
# an extract taken mid-session captures a partial newest date that reads
# exactly like a complete one downstream.

echo "[extract] reading coverage from $HOST:$REMOTE_DB (read-only)"
COVERAGE="$($SSH "sudo sqlite3 -readonly '$REMOTE_DB' \
  'SELECT trading_date || \"|\" || COUNT(*) FROM desk_assessments GROUP BY trading_date ORDER BY trading_date;'")"

if [ -z "$COVERAGE" ]; then
  echo "[extract] REFUSING: no assessment dates came back. That is not an empty desk," >&2
  echo "[extract] it is a read that did not work. Nothing written." >&2
  exit 1
fi

MAX_DATE="$(printf '%s\n' "$COVERAGE" | tail -1 | cut -d'|' -f1)"
MAX_COUNT="$(printf '%s\n' "$COVERAGE" | tail -1 | cut -d'|' -f2)"
COMPLETE_THROUGH="$(printf '%s\n' "$COVERAGE" \
  | awk -F'|' -v e="$EXPECT_PER_DATE" '$2==e {d=$1} END {print d}')"
INCOMPLETE="$(printf '%s\n' "$COVERAGE" \
  | awk -F'|' -v e="$EXPECT_PER_DATE" '$2!=e {printf "%s(%s) ", $1, $2}')"

echo "[extract] dates=$(printf '%s\n' "$COVERAGE" | wc -l | tr -d ' ')  max=$MAX_DATE (n=$MAX_COUNT)  complete_through=$COMPLETE_THROUGH"
[ -n "$INCOMPLETE" ] && echo "[extract] incomplete dates: $INCOMPLETE"

if [ -z "$COMPLETE_THROUGH" ]; then
  echo "[extract] REFUSING: not one date holds $EXPECT_PER_DATE assessments." >&2
  echo "[extract] Either the expectation is wrong or the store is. Establish which." >&2
  exit 1
fi

# The newest date being partial is the NORMAL state during a session, and it is
# the exact condition this exists to catch. Refuse rather than ship a today that
# looks whole.
if [ "$MAX_COUNT" != "$EXPECT_PER_DATE" ]; then
  echo "[extract] REFUSING: $MAX_DATE holds $MAX_COUNT of $EXPECT_PER_DATE — the desk is still writing it." >&2
  echo "[extract] A partial newest date is indistinguishable from a complete one downstream," >&2
  echo "[extract] which is the failure this extract was asked to close." >&2
  echo "[extract] The last assessment of a date is scheduled ~02:00Z the FOLLOWING day (22:00 ET)." >&2
  echo "[extract] Re-run after that, or set ALLOW_PARTIAL_TAIL=yes to ship with $MAX_DATE excluded." >&2
  if [ "${ALLOW_PARTIAL_TAIL:-no}" != "yes" ]; then
    exit 1
  fi
  echo "[extract] ALLOW_PARTIAL_TAIL=yes — $MAX_DATE will be EXCLUDED from the extract."
  EXCLUDE_TAIL="$MAX_DATE"
else
  EXCLUDE_TAIL=""
fi

if [ "$CHECK_ONLY" = "yes" ]; then
  echo "[extract] --check: nothing written."
  exit 0
fi

# ------------------------------------------------------------ extraction ---
#
# Streamed over the ssh channel with `.dump`, not scp, and no temp file is
# created on the box. Production is read-only throughout: the only writes this
# script performs are on this machine.

mkdir -p "$(dirname "$OUT")"
TMPDIR_X="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_X"' EXIT
DUMP="$TMPDIR_X/dump.sql"
COVER="$TMPDIR_X/coverage.tsv"

printf '%s
' "$COVERAGE" > "$COVER"
EXTRACT_AS_OF="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "[extract] streaming both tables (.dump over ssh, nothing written on the box)"
$SSH "sudo sqlite3 -readonly '$REMOTE_DB' '.dump desk_assessments' '.dump desk_assessment_tickers'" > "$DUMP"

DUMP_BYTES="$(wc -c < "$DUMP" | tr -d ' ')"
echo "[extract] received ${DUMP_BYTES} bytes"
if [ "$DUMP_BYTES" -lt 1000 ]; then
  echo "[extract] REFUSING: that is too small to be both tables. Nothing written." >&2
  exit 1
fi

node deploy/aws/build-extract.js   "$DUMP" "$OUT" "$COVER"   "$EXTRACT_AS_OF" "$EXPECT_PER_DATE" "$COMPLETE_THROUGH" "$MAX_DATE"   "$HOST" "$EXCLUDE_TAIL"

echo "[extract] done. Gate joins on complete_through, or JOIN extract_date_coverage."
