#!/usr/bin/env bash
#
# One watchdog tick, run every minute by mointel-watchdog.timer on the box.
#
# Three rules, and nothing else:
#   DOWN    a runtime unit is not active.
#   LOOP    a runtime unit restarted WATCHDOG_LOOP_RESTARTS or more times
#           inside WATCHDOG_LOOP_WINDOW seconds (Restart=always hides a crash
#           loop: the unit is "active" every time anyone looks).
#   STALE   the market feed says it is live but has gone quiet:
#           messageAgeSeconds or heartbeatAgeSeconds past its limit. Outside a
#           live session those fields are null and this rule is silent.
# plus HEALTH when /api/health itself cannot be read: "could not check" is an
# alert, never a pass.
#
# An alert is sent once per condition, repeated every WATCHDOG_COOLDOWN_SECONDS
# while it holds, and followed by one RECOVERED when it clears.
#
# SUPPRESSED, deliberately, so a planned stop is not a page:
#   - while any mointel-deploy-* unit is active or activating (a deploy stops
#     and restarts the services on purpose);
#   - until the epoch seconds written in $STATE_DIR/maintenance (an operator who
#     stops a unit by hand writes a time a few minutes ahead).
#
# THE NOTIFIER IS PLUGGABLE. Every alert goes to the journal (tag
# mointel-watchdog, grep it). If $NOTIFIER exists it is also
# run (through bash) with the alert text as its one argument; its failure is logged, never
# fatal. Nothing here holds a credential or a phone number: the notifier
# (notify-telegram.sh) reads its own from the box env.
#
# LIMIT: this runs ON the box. It cannot report that the box itself is down.
#
# Environment overrides exist so the suite can drive every branch against
# stubs: WATCHDOG_STATE_DIR, WATCHDOG_HEALTH_URL, WATCHDOG_UNITS, WATCHDOG_OPTIONAL_UNITS, WATCHDOG_NOW,
# WATCHDOG_NOTIFIER and the thresholds named below.
set -uo pipefail

STATE_DIR="${WATCHDOG_STATE_DIR:-/var/lib/mointel-watchdog}"
HEALTH_URL="${WATCHDOG_HEALTH_URL:-http://127.0.0.1:3000/api/health}"
UNITS="${WATCHDOG_UNITS:-mointel-web mointel-research mointel-assess mointel-market}"
# Units watched only while ENABLED. deploy.sh enables mointel-billing only once
# STRIPE_SECRET_KEY is on the box; before that it is installed, disabled and
# inactive by design, and watching it would alert on every tick. Once enabled,
# a stopped or crash-looping billing worker means charges are not being made,
# so it is watched exactly like the others.
OPTIONAL_UNITS="${WATCHDOG_OPTIONAL_UNITS:-mointel-billing}"
for unit in $OPTIONAL_UNITS; do
  if [ "$(systemctl is-enabled "$unit" 2>/dev/null || true)" = "enabled" ]; then UNITS="$UNITS $unit"; fi
done
NOTIFIER="${WATCHDOG_NOTIFIER:-/opt/mointel/current/deploy/aws/notify-telegram.sh}"
COOLDOWN="${WATCHDOG_COOLDOWN_SECONDS:-1800}"
LOOP_RESTARTS="${WATCHDOG_LOOP_RESTARTS:-3}"
LOOP_WINDOW="${WATCHDOG_LOOP_WINDOW:-600}"
STALE_MESSAGE="${WATCHDOG_STALE_MESSAGE_SECONDS:-120}"
STALE_HEARTBEAT="${WATCHDOG_STALE_HEARTBEAT_SECONDS:-60}"
NOW="${WATCHDOG_NOW:-$(date +%s)}"

mkdir -p "$STATE_DIR"

say() { logger -t mointel-watchdog -p "daemon.$1" -- "$2" 2>/dev/null || echo "[watchdog] $2"; }

notify() {
  say "$1" "$2"
  # Run through bash, not exec: a file checked in without its executable bit
  # (Windows commits lose it) would otherwise be skipped without a word.
  if [ -f "$NOTIFIER" ]; then
    bash "$NOTIFIER" "$2" >/dev/null 2>&1 || say warning "notifier failed (exit $?); the alert is in the journal only"
  fi
}

# ------------------------------------------------------------ suppression ---
suppressed=""
if systemctl list-units 'mointel-deploy-*' --state=active,activating --no-legend 2>/dev/null | grep -q .; then
  suppressed="a deploy is running"
fi
if [ -z "$suppressed" ] && [ -f "$STATE_DIR/maintenance" ]; then
  until_epoch="$(tr -dc '0-9' < "$STATE_DIR/maintenance")"
  if [ -n "$until_epoch" ] && [ "$NOW" -lt "$until_epoch" ]; then suppressed="maintenance window"; fi
fi

# Restart counters are tracked even while suppressed, so a deploy's restarts are
# not read as a loop afterwards.
CONDITIONS=()

for unit in $UNITS; do
  active="$(systemctl is-active "$unit" 2>/dev/null || true)"
  [ -n "$active" ] || active="unknown"
  if [ "$active" != "active" ]; then
    CONDITIONS+=("down.$unit|$unit is $active")
  fi

  nr="$(systemctl show -p NRestarts --value "$unit" 2>/dev/null | tr -dc '0-9')"
  [ -n "$nr" ] || nr=0
  last_file="$STATE_DIR/nr.$unit"
  hist_file="$STATE_DIR/restarts.$unit"
  last="$nr"
  [ -f "$last_file" ] && last="$(tr -dc '0-9' < "$last_file")"
  [ -n "$last" ] || last="$nr"
  echo "$nr" > "$last_file"
  # A counter that went DOWN was reset by a manual restart: no new restarts.
  if [ "$nr" -gt "$last" ] && [ -z "$suppressed" ]; then
    i=0
    while [ "$i" -lt $(( nr - last )) ]; do echo "$NOW" >> "$hist_file"; i=$(( i + 1 )); done
  fi
  if [ -f "$hist_file" ]; then
    cutoff=$(( NOW - LOOP_WINDOW ))
    awk -v c="$cutoff" '$1 >= c' "$hist_file" > "$hist_file.tmp" && mv "$hist_file.tmp" "$hist_file"
    recent="$(wc -l < "$hist_file" | tr -d ' ')"
    if [ "$recent" -ge "$LOOP_RESTARTS" ]; then
      CONDITIONS+=("loop.$unit|$unit restarted $recent times in the last $(( LOOP_WINDOW / 60 )) min")
    fi
  fi
done

# --------------------------------------------------------------- health ---
body="$(curl -s -m 5 "$HEALTH_URL" 2>/dev/null || true)"
parsed=""
if [ -n "$body" ]; then
  parsed="$(printf '%s' "$body" | node -e "
    let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
      try{const j=JSON.parse(s);const m=j.market||{};
        console.log([j.ok===true?'ok':'notok',m.live===true?'live':'idle',m.messageAgeSeconds==null?'-':m.messageAgeSeconds,m.heartbeatAgeSeconds==null?'-':m.heartbeatAgeSeconds].join(' '));
      }catch(e){console.log('unparsed')}
    })" 2>/dev/null || true)"
fi
set -- $parsed
if [ -z "$parsed" ] || [ "${1:-}" = "unparsed" ]; then
  CONDITIONS+=("health|/api/health could not be read")
else
  [ "$1" = "ok" ] || CONDITIONS+=("health|/api/health answered but is not ok")
  if [ "${2:-}" = "live" ]; then
    msg="${3:--}"; hb="${4:--}"
    if [ "$msg" != "-" ] && [ "$msg" -gt "$STALE_MESSAGE" ] 2>/dev/null; then
      CONDITIONS+=("stale.message|market feed live but no message for ${msg}s (limit ${STALE_MESSAGE}s)")
    fi
    if [ "$hb" != "-" ] && [ "$hb" -gt "$STALE_HEARTBEAT" ] 2>/dev/null; then
      CONDITIONS+=("stale.heartbeat|market worker heartbeat ${hb}s old (limit ${STALE_HEARTBEAT}s)")
    fi
  fi
fi

# ------------------------------------------------------------ dispatching ---
if [ -n "$suppressed" ]; then
  say info "suppressed ($suppressed); ${#CONDITIONS[@]} condition(s) not reported"
  exit 0
fi

active_keys=" "
for entry in "${CONDITIONS[@]}"; do
  key="${entry%%|*}"; text="${entry#*|}"
  active_keys="$active_keys$key "
  stamp="$STATE_DIR/alert.$key"
  sent=0
  [ -f "$stamp" ] && sent="$(tr -dc '0-9' < "$stamp")"
  [ -n "$sent" ] || sent=0
  if [ "$sent" -eq 0 ] || [ $(( NOW - sent )) -ge "$COOLDOWN" ]; then
    notify crit "ALERT $text"
    echo "$NOW" > "$stamp"
  fi
done

for stamp in "$STATE_DIR"/alert.*; do
  [ -e "$stamp" ] || continue
  key="${stamp##*/alert.}"
  case "$active_keys" in
    *" $key "*) ;;
    *) notify info "RECOVERED $key"; rm -f "$stamp" ;;
  esac
done

exit 0
