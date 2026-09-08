#!/usr/bin/env bash
#
# Decides which release directories may be removed.
#
#   prune.sh <active-sha> [--dry-run]
#
# Separate from deploy.sh so the decision can be exercised without deploying
# anything. Count-based retention on its own removed 372f5eb after three
# deployments — the three it took to fix the incident that made it the rollback
# target — so "keep the last N" is now the LAST rule applied, not the only one.
#
# Never removed:
#   - the active release
#   - any pinned release
#   - THE RELEASE ANY RUNNING UNIT IS ACTUALLY EXECUTING
#
# Everything else, beyond KEEP_RELEASES newest, is removable.
#
# The in-use rule exists because RESTART_MARKET=no DELIBERATELY leaves a unit on
# an older release, and nothing else here knew that. On 2026-09-08 a deploy
# pruned c84e0df while mointel-market was still running from it: the unit stayed
# active and STREAMING with a 1s heartbeat, and its cwd read "/ (deleted)".
# Nothing failed loudly, because a process keeps its open files -- but ExecStart
# is `tsx worker/alpaca.ts`, which transpiles from disk on demand, so any module
# not yet loaded would have failed to read.
#
# Two mechanisms: one deliberately produces the state the other deletes.
set -euo pipefail

ACTIVE="${1:-}"
MODE="${2:-}"
[ -n "$ACTIVE" ] || { echo "usage: prune.sh <active-sha> [--dry-run]" >&2; exit 2; }

RELEASES=${RELEASES:-/opt/mointel/releases}
KEEP_RELEASES=${KEEP_RELEASES:-3}
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { echo "[prune] $*"; }

pinned=$(bash "$HERE/pins.sh" shas 2>/dev/null || true)

# Releases running units are executing, read from each unit's OWN cwd rather than
# inferred from `current` -- inferring is exactly what misses a deliberate split.
#
# IN_USE_SHAS overrides the probe so the rule can be exercised without systemd.
# Set-but-empty means "no units", not "skip the rule": a caller that sets it has
# answered the question.
in_use_shas() {
  if [ -n "${IN_USE_SHAS+x}" ]; then
    printf '%s
' ${IN_USE_SHAS:-}
    return 0
  fi
  command -v systemctl >/dev/null 2>&1 || return 0
  for unit in mointel-market mointel-web mointel-research mointel-assess; do
    pid=$(systemctl show "$unit" -p MainPID --value 2>/dev/null || true)
    [ -n "$pid" ] && [ "$pid" != "0" ] || continue
    cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)
    [ -n "$cwd" ] || continue
    case "$cwd" in
      "$RELEASES"/*) rest="${cwd#"$RELEASES"/}"; printf '%s
' "${rest%%/*}" ;;
    esac
  done
}

in_use=$(in_use_shas || true)

why_protected() {
  local sha="$1"
  [ "$sha" = "$ACTIVE" ] && { echo active; return; }
  printf '%s
' "$pinned" | grep -qx "$sha" && { echo pinned; return; }
  echo "IN USE by a running unit"
}

is_protected() {
  local sha="$1"
  [ "$sha" = "$ACTIVE" ] && return 0
  printf '%s\n' "$pinned" | grep -qx "$sha" && return 0
  printf '%s\n' "$in_use" | grep -qx "$sha" && return 0
  return 1
}

# Newest first, so `tail -n +N` leaves the older ones.
mapfile -t candidates < <(ls -1dt "$RELEASES"/*/ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)))

removed=0
for directory in "${candidates[@]:-}"; do
  [ -z "$directory" ] && continue
  sha=$(basename "${directory%/}")

  if is_protected "$sha"; then
    log "keep    $sha ($(why_protected "$sha"))"
    continue
  fi

  if [ "$MODE" = "--dry-run" ]; then
    log "would remove $sha"
  else
    log "remove  $sha"
    rm -rf "$directory"
  fi
  removed=$((removed + 1))
done

log "active $ACTIVE"
log "pinned $(printf '%s' "${pinned:-none}" | tr '\n' ' ')"
log "in use $(printf '%s' "${in_use:-none}" | tr '
' ' ')"
log "retained $(ls -1t "$RELEASES" 2>/dev/null | tr '\n' ' ')"
log "$removed release(s) $([ "$MODE" = "--dry-run" ] && echo "would be removed" || echo removed)"
