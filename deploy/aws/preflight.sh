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
# WHAT IS PROTECTED IS THE STOP, NOT THE START. deploy.sh builds and runs the
# store's quick_check with the services still UP, then stops, switches and
# restarts them in 2-3 seconds. quick_check alone has run 80-605s, so the stop
# lands roughly DEPLOY_STOP_MIN..DEPLOY_STOP_MAX minutes after this script
# passes. A check of the start alone passed at 10:22 and put the stop inside
# the 10:25 window. So a checkpoint blocks when the stop's possible landing
# span comes within PROTECTED_MINUTES of it.
#
# AND HIS TRADING WINDOW, which is a different concern from a checkpoint: a
# skipped checkpoint is a repair, his board going dark mid-trade is not, and a
# build on this 4 GB box during it competes with the live worker. No deploy
# may be RUNNING at any moment of 07:00-10:00 ET on a weekday, so a start is
# refused from DEPLOY_STOP_MAX minutes before 07:00 until 10:00.
# DEPLOY_WINDOW_OVERRIDE does not cover this; it has its own, deliberately.
#
# AND THE LIVE-STORE CHECK, a third concern. deploy.sh's pre-stop quick_check
# reads the whole live store with the services up. On 2026-09-30 it took 803.8 s
# on 4.3 GB + 0.7 GB WAL at 10:38 ET, the web tier did not answer /api/health
# within 20 s, and the market worker's flushes ran 6-10 s (49-54 a minute
# instead of 60). The store only grows. So until that check stops reading the
# live store, no deploy may be RUNNING at any moment of 04:00-20:00 ET on a
# weekday, while the market worker is writing a session. A deploy can run
# LIVE_CHECK_RUN_MAX minutes before its stop (15 measured that day). Holidays
# are not known here and stay refused, the cautious direction. Neither other
# override covers it; it has its own.
set -euo pipefail

PROTECTED_MINUTES=${PROTECTED_MINUTES:-5}
OVERRIDE=${DEPLOY_WINDOW_OVERRIDE:-}
TRADING_OVERRIDE=${TRADING_WINDOW_OVERRIDE:-}
LIVE_CHECK_OVERRIDE=${LIVE_STORE_CHECK_OVERRIDE:-}
STOP_MIN=${DEPLOY_STOP_MIN:-2}
# 20, not 12 (A8, 2026-10-13): the stop lands after the build AND the pre-stop quick_check, which measured 981.9 s and
# 1009.9 s on the old box (2026-10-10) and 304.8 s / 434.3 s on mointel-prod-large (2026-10-10/11); the old 12 let a
# start pass that stopped at +17 and +19 min. 20 covers the measured worst with a small margin.
STOP_MAX=${DEPLOY_STOP_MAX:-20}
TRADING_START=420   # 07:00 ET
TRADING_END=600     # 10:00 ET
LIVE_CHECK_START=240   # 04:00 ET, premarket opens
LIVE_CHECK_END=1200    # 20:00 ET, after-hours closes
LIVE_CHECK_RUN_MAX=${DEPLOY_LIVE_CHECK_RUN_MAX:-20}

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
  "1205 AFTER_HOURS_CLOSE"
)
# Plus RTH_INTERVAL every 30 minutes from 10:00 to the close.
for ((m = 600; m <= 960; m += 30)); do CHECKPOINTS+=("$m RTH_INTERVAL"); done

# PREFLIGHT_NOW_MINUTES overrides the clock, for tests only.
#
# Without it this function is the wall clock, so any test of the protected
# window is a test of when it happened to run. That is how the suite that
# gates deploys acquired a flake: with PROTECTED_MINUTES=0 the comparison
# below blocked whenever a run landed exactly on a checkpoint minute, which
# RTH_INTERVAL provides every thirty minutes.
now_et_minutes() {
  if [ -n "${PREFLIGHT_NOW_MINUTES:-}" ]; then
    echo "$(( 10#$PREFLIGHT_NOW_MINUTES ))"
    return
  fi
  local hm
  hm=$(TZ=America/New_York date +"%H %M")
  echo $(( 10#${hm% *} * 60 + 10#${hm#* } ))
}

# ISO day of week in ET, 1=Monday .. 7=Sunday. PREFLIGHT_NOW_DOW for tests.
now_et_dow() {
  if [ -n "${PREFLIGHT_NOW_DOW:-}" ]; then
    echo "$PREFLIGHT_NOW_DOW"
    return
  fi
  TZ=America/New_York date +%u
}

# A deploy unit already running on this box (A8): a second push would race the first for the release switch and the
# service stop. PREFLIGHT_DEPLOYS_ACTIVE overrides the count, for tests only.
deploys_active() {
  if [ -n "${PREFLIGHT_DEPLOYS_ACTIVE:-}" ]; then
    echo "$PREFLIGHT_DEPLOYS_ACTIVE"
    return
  fi
  if command -v systemctl >/dev/null 2>&1; then
    systemctl list-units 'mointel-deploy-*' --state=activating,active --no-legend --plain 2>/dev/null | grep -c . || true
  else
    echo 0
  fi
}

# Is today a market session, from the box's stored Alpaca calendar (A8)? Prints 1 (trading day), 0 (the calendar
# covers today and lists no session: a holiday) or "unknown" (no store, no sqlite3, no calendar, or one that does not
# cover today). Unknown is treated as a trading day: the cautious direction, as before this check existed.
# PREFLIGHT_TRADING_DAY overrides it, for tests only.
trading_day() {
  if [ -n "${PREFLIGHT_TRADING_DAY:-}" ]; then
    echo "$PREFLIGHT_TRADING_DAY"
    return
  fi
  local db=${MARKET_DB_PATH:-/var/lib/mointel/market.db} today out
  [ -f "$db" ] && command -v sqlite3 >/dev/null 2>&1 || { echo unknown; return; }
  today=$(TZ=America/New_York date +%F)
  out=$(sudo -n -u mointel sqlite3 -readonly "$db" "SELECT
      (SELECT COUNT(*) FROM meta m, json_each(m.value) j WHERE m.key = 'calendar' AND json_extract(j.value, '$.date') = '$today'),
      (SELECT COUNT(*) FROM meta m, json_each(m.value) j WHERE m.key = 'calendar' AND json_extract(j.value, '$.date') >= '$today'),
      (SELECT COUNT(*) FROM meta m, json_each(m.value) j WHERE m.key = 'calendar' AND json_extract(j.value, '$.date') <= '$today');" 2>/dev/null) || { echo unknown; return; }
  local listed after before
  IFS='|' read -r listed after before <<<"$out"
  if [ "${listed:-0}" -gt 0 ] 2>/dev/null; then echo 1
  elif [ "${after:-0}" -gt 0 ] 2>/dev/null && [ "${before:-0}" -gt 0 ] 2>/dev/null; then echo 0
  else echo unknown; fi
}

main() {
  local now dow diff nearest_name nearest_diff prev_name prev_diff next_name next_diff
  local stop_hit_name="" stop_hit_ahead=0
  now=$(now_et_minutes)
  dow=$(now_et_dow)
  local trading session_day=1 active
  trading=$(trading_day)
  # A session day: a weekday that the stored calendar does not show as a holiday. Weekends never were; holidays now
  # are not either, when the calendar covers today. Unknown stays a session day.
  if (( dow > 5 )) || [ "$trading" = "0" ]; then session_day=0; fi

  active=$(deploys_active)
  if [ "${active:-0}" -gt 0 ] 2>/dev/null; then
    echo "[preflight] BLOCKED: ${active} mointel-deploy unit(s) already running on this box; a second deploy would race it for the release switch and the service stop. Wait for it to finish." >&2
    exit 3
  fi
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

    # ahead = minutes from now until the checkpoint. The stop lands somewhere
    # in [now+STOP_MIN, now+STOP_MAX]; it collides when that span comes within
    # PROTECTED_MINUTES of the checkpoint.
    local ahead=$(( -diff ))
    # No checkpoint fires on a Saturday or Sunday: the schedule resolves against
    # the market calendar, and the week's last one is Friday's 22:00 recap
    # (read from desk_assessments, 2026-09-29). Holidays are NOT known here, so
    # they stay protected -- the cautious direction.
    if (( session_day )) && [ -z "$stop_hit_name" ] && (( ahead >= STOP_MIN - PROTECTED_MINUTES )) \
        && (( ahead <= STOP_MAX + PROTECTED_MINUTES )); then
      stop_hit_name="$name"; stop_hit_ahead=$ahead
    fi
  done

  log "ET now $(TZ=America/New_York date +%H:%M); calendar: $( [ "$trading" = "1" ] && echo "trading day" || { [ "$trading" = "0" ] && echo "NO SESSION today (holiday)" || echo "unknown (treated as a trading day)"; } )$( (( dow > 5 )) && echo "; weekend")"
  [ -n "$prev_name" ] && log "previous checkpoint  $prev_name (${prev_diff}m ago)"
  [ -n "$next_name" ] && log "next checkpoint      $next_name (in ${next_diff}m)"

  if [ -x "$(dirname "$0")/pins.sh" ] || [ -f "$(dirname "$0")/pins.sh" ]; then
    bash "$(dirname "$0")/pins.sh" check || log "WARNING: pins are not satisfiable"
  fi

  # His trading window first: it is his, and a checkpoint override is not.
  if (( session_day )) && (( now < TRADING_END )) && (( now + STOP_MAX >= TRADING_START )); then
    if [ -n "$TRADING_OVERRIDE" ]; then
      log "TRADING WINDOW OVERRIDE: a deploy will be running inside 07:00-10:00 ET"
      log "TRADING WINDOW OVERRIDE REASON: $TRADING_OVERRIDE"
    else
      echo "[preflight] BLOCKED: his trading window. No deploy may be running 07:00-10:00 ET on a weekday, and one started now can run until +${STOP_MAX}m." >&2
      echo "[preflight] Wait until 10:00 ET clears its own checkpoints, or re-run with TRADING_WINDOW_OVERRIDE=\"his word, and why\"." >&2
      exit 3
    fi
  fi

  # The live-store check: a start refused if the deploy could still be running
  # at any moment of 04:00-20:00 ET on a weekday.
  if (( session_day )) && (( now < LIVE_CHECK_END )) && (( now + LIVE_CHECK_RUN_MAX >= LIVE_CHECK_START )); then
    if [ -n "$LIVE_CHECK_OVERRIDE" ]; then
      log "LIVE-STORE CHECK OVERRIDE: quick_check will read the live store inside 04:00-20:00 ET"
      log "LIVE-STORE CHECK OVERRIDE REASON: $LIVE_CHECK_OVERRIDE"
    else
      echo "[preflight] BLOCKED: the live-store check. deploy.sh's pre-stop quick_check reads the whole live store (803.8 s on 2026-09-30) and stalls the web tier and the market worker's writes; no deploy may be running 04:00-20:00 ET on a weekday, and one started now can run until +${LIVE_CHECK_RUN_MAX}m." >&2
      echo "[preflight] Start after 20:00 ET, or re-run with LIVE_STORE_CHECK_OVERRIDE=\"his word, and why\"." >&2
      exit 3
    fi
  fi

  # PROTECTED_MINUTES=0 means NO protected window, so it must not block.
  # `0 <= 0` blocked on the exact minute of every checkpoint, which is a
  # deploy refused for a window the operator had switched off.
  if (( PROTECTED_MINUTES > 0 )) && [ -n "$stop_hit_name" ]; then
    if [ -n "$OVERRIDE" ]; then
      # Recorded in deployment output and therefore in the operator's shell
      # history and any CI log. An override is a decision, not a flag.
      log "OVERRIDE: the stop may land inside the ${PROTECTED_MINUTES}m window around ${stop_hit_name}"
      log "OVERRIDE REASON: $OVERRIDE"
      log "note: persistent catch-up remains active; this does not disable it"
      return 0
    fi
    local when="${stop_hit_ahead}m away"
    (( stop_hit_ahead < 0 )) && when="$(( -stop_hit_ahead ))m ago"
    echo "[preflight] BLOCKED: ${stop_hit_name} is ${when}, and the services stop ${STOP_MIN}-${STOP_MAX}m after a start -- inside its ${PROTECTED_MINUTES}m protected window." >&2
    echo "[preflight] Wait, or re-run with DEPLOY_WINDOW_OVERRIDE=\"why this cannot wait\"." >&2
    exit 3
  fi

  log "clear of every checkpoint: the stop lands ${STOP_MIN}-${STOP_MAX}m from now, more than ${PROTECTED_MINUTES}m from any"
}

main "$@"
