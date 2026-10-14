#!/bin/bash
# The nightly float tool's runner (L8, his "a, rebuid" 2026-10-14). Two phases: full SEC speed until 04:00 ET,
# then 2 a second until 06:55 ET so the live desk keeps its share of the SEC agent; a stopped run resumes the
# next night (names with a row for the date are skipped).
#
# The script stops itself at its RSS guard because its memory grows per name (70 MB over 66 names on the PC,
# cause not found), so each phase relaunches a fresh process on that exit, up to MAX_LAUNCHES.
# Exit codes (the script's contract): 0 = every name done, deadline or limit reached; 75 = RSS guard (relaunch);
# 76 = SEC request cap (never relaunched); 1 = error (stop).
#
# Never alongside a deploy: before every launch it asks systemd whether a deploy unit is running, the same check
# deploy/aws/preflight.sh uses, and waits it out (or stops at the phase deadline).
set -uo pipefail

PHASE1_END_ET="${FLOAT_NIGHTLY_PHASE1_END_ET:-04:00}"
PHASE1_RATE="${FLOAT_NIGHTLY_PHASE1_RATE:-5}"
PHASE2_END_ET="${FLOAT_NIGHTLY_PHASE2_END_ET-06:55}"   # set to empty for no second phase
PHASE2_RATE="${FLOAT_NIGHTLY_PHASE2_RATE:-2}"
MAX_LAUNCHES="${FLOAT_NIGHTLY_MAX_LAUNCHES:-40}"

log() { echo "[float-nightly] $*"; }

# The next occurrence of an ET wall-clock time after now, as epoch seconds.
next_et() {
  local now t
  now=$(date +%s)
  t=$(TZ=America/New_York date -d "today $1" +%s)
  [ "$t" -le "$now" ] && t=$(TZ=America/New_York date -d "tomorrow $1" +%s)
  echo "$t"
}

deploy_running() {
  [ "$(systemctl list-units 'mointel-deploy-*' --state=activating,active --no-legend 2>/dev/null | wc -l)" -gt 0 ]
}

launches=0

# Runs one phase; returns 0 to go on to the next phase, 1 to stop the night.
run_phase() {
  local name="$1" rate="$2" deadline="$3" iso rc
  shift 3
  iso=$(date -u -d "@${deadline}" +%Y-%m-%dT%H:%M:%SZ)
  log "${name}: rate ${rate}/s until ${iso}"
  while :; do
    if [ "$(date +%s)" -ge "$deadline" ]; then log "${name}: deadline reached"; return 0; fi
    if deploy_running; then log "${name}: a deploy is running; waiting"; sleep 60; continue; fi
    if [ "$launches" -ge "$MAX_LAUNCHES" ]; then log "${MAX_LAUNCHES} launches used; stopping (resumes next night)"; return 1; fi
    launches=$((launches + 1))
    /usr/bin/node node_modules/tsx/dist/cli.mjs scripts/float-nightly.ts \
      --max-rss-mb=900 --rate="${rate}" --deadline="${iso}" "$@"
    rc=$?
    log "${name}: launch ${launches} exited ${rc}"
    case "$rc" in
      75) continue ;;
      0)
        # Done, or this phase's deadline. Done ends the night; a deadline moves to the next phase.
        [ "$(date +%s)" -ge "$deadline" ] && return 0
        log "every name done"; return 1 ;;
      76) log "SEC request cap reached; stopping"; return 1 ;;
      *) log "error exit ${rc}; stopping"; exit "$rc" ;;
    esac
  done
}

# Never starts in the day: 06:55-20:00 ET covers premarket's busy end, his window and the session.
hhmm=$(TZ=America/New_York date +%H%M)
if [ "$hhmm" -ge 0655 ] && [ "$hhmm" -lt 2000 ]; then
  log "refusing to start at ${hhmm} ET (allowed 20:00-06:55 ET)"; exit 0
fi

p1=$(next_et "$PHASE1_END_ET")
p2=""
[ -n "$PHASE2_END_ET" ] && p2=$(next_et "$PHASE2_END_ET")
# Started after 04:00 ET, the next 04:00 is tomorrow's, past phase 2's end: phase 1 is skipped.
if [ -z "$p2" ] || [ "$p1" -lt "$p2" ]; then
  run_phase "phase 1" "$PHASE1_RATE" "$p1" "$@" || exit 0
fi
if [ -n "$p2" ]; then
  run_phase "phase 2" "$PHASE2_RATE" "$p2" "$@" || exit 0
fi
log "night over"
exit 0
