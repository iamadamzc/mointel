#!/usr/bin/env bash
#
# Deployment preflight: what checkpoint is near, and are the pins satisfiable.
#
#   preflight.sh                       # report and gate
#   DEPLOY_WINDOW_OVERRIDE="reason"    # proceed anyway, loudly
#
# Scheduled assessments are product outputs. Restarting the scheduler across a
# checkpoint minute used to mean the checkpoint was simply skipped, and while
# the persistent ledger now catches most of those up, catching up is a repair
# and not a plan: a 09:25 open-spike assessment has a ten-minute window and
# cannot be caught up at all.
#
# The protected window is derived from what the scheduler actually costs. A
# deploy stops web/research/assess, runs npm ci, builds, migrates and restarts —
# observed at roughly 60-90 seconds — and the scheduler polls every 20 seconds.
# Five minutes either side of a checkpoint covers a slow deploy plus a poll
# cycle with room to spare, without making ordinary deploys difficult.
set -euo pipefail

PROTECTED_MINUTES=${PROTECTED_MINUTES:-5}
OVERRIDE=${DEPLOY_WINDOW_OVERRIDE:-}

log() { echo "[preflight] $*"; }

# ET minutes-since-midnight for every checkpoint the scheduler implements.
# Mirrors lib/desk/schedule.ts; drift here is caught by scheduleInventory.test.ts.
CHECKPOINTS=(
  "1320 NEXT_DAY_RECAP"
  "370  STRUCTURAL_REFRESH"
  "385  PREMARKET_0625"
  "405  PREMARKET_0645"
  "420  PREMARKET_0700"
  "565  OPEN_SPIKE_ASSESSMENT"
  "960  RTH_CLOSE"
)
# Plus RTH_INTERVAL every 30 minutes from 10:00 to the close.
for ((m = 600; m <= 960; m += 30)); do CHECKPOINTS+=("$m RTH_INTERVAL"); done

now_et_minutes() {
  local hm
  hm=$(TZ=America/New_York date +"%H %M")
  echo $(( 10#${hm% *} * 60 + 10#${hm#* } ))
}

main() {
  local now diff nearest_name nearest_diff prev_name prev_diff next_name next_diff
  now=$(now_et_minutes)
  nearest_diff=99999; nearest_name=""
  prev_diff=99999; prev_name=""
  next_diff=99999; next_name=""

  for entry in "${CHECKPOINTS[@]}"; do
    local minutes name
    minutes=$(echo "$entry" | awk '{print $1}')
    name=$(echo "$entry" | awk '{print $2}')

    diff=$(( now - minutes ))
    # Wrap across midnight so a 22:00 checkpoint is "near" at 00:05.
    (( diff > 720 )) && diff=$(( diff - 1440 ))
    (( diff < -720 )) && diff=$(( diff + 1440 ))

    local abs=${diff#-}
    if (( abs < nearest_diff )); then nearest_diff=$abs; nearest_name="$name"; fi
    if (( diff >= 0 && diff < prev_diff )); then prev_diff=$diff; prev_name="$name"; fi
    if (( diff < 0 && -diff < next_diff )); then next_diff=$(( -diff )); next_name="$name"; fi
  done

  log "ET now $(TZ=America/New_York date +%H:%M)"
  [ -n "$prev_name" ] && log "previous checkpoint  $prev_name (${prev_diff}m ago)"
  [ -n "$next_name" ] && log "next checkpoint      $next_name (in ${next_diff}m)"

  if [ -x "$(dirname "$0")/pins.sh" ] || [ -f "$(dirname "$0")/pins.sh" ]; then
    bash "$(dirname "$0")/pins.sh" check || log "WARNING: pins are not satisfiable"
  fi

  if (( nearest_diff <= PROTECTED_MINUTES )); then
    if [ -n "$OVERRIDE" ]; then
      # Recorded in deployment output and therefore in the operator's shell
      # history and any CI log. An override is a decision, not a flag.
      log "OVERRIDE: deploying inside the ${PROTECTED_MINUTES}m window around ${nearest_name}"
      log "OVERRIDE REASON: $OVERRIDE"
      log "note: persistent catch-up remains active; this does not disable it"
      return 0
    fi
    echo "[preflight] BLOCKED: ${nearest_name} is ${nearest_diff}m away, inside the ${PROTECTED_MINUTES}m protected window." >&2
    echo "[preflight] Wait, or re-run with DEPLOY_WINDOW_OVERRIDE=\"why this cannot wait\"." >&2
    exit 3
  fi

  log "clear of every checkpoint by more than ${PROTECTED_MINUTES}m"
}

main "$@"
