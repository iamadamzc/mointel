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
#
# Everything else, beyond KEEP_RELEASES newest, is removable.
set -euo pipefail

ACTIVE="${1:-}"
MODE="${2:-}"
[ -n "$ACTIVE" ] || { echo "usage: prune.sh <active-sha> [--dry-run]" >&2; exit 2; }

RELEASES=${RELEASES:-/opt/mointel/releases}
KEEP_RELEASES=${KEEP_RELEASES:-3}
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { echo "[prune] $*"; }

pinned=$(bash "$HERE/pins.sh" shas 2>/dev/null || true)

is_protected() {
  local sha="$1"
  [ "$sha" = "$ACTIVE" ] && return 0
  printf '%s\n' "$pinned" | grep -qx "$sha" && return 0
  return 1
}

# Newest first, so `tail -n +N` leaves the older ones.
mapfile -t candidates < <(ls -1dt "$RELEASES"/*/ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)))

removed=0
for directory in "${candidates[@]:-}"; do
  [ -z "$directory" ] && continue
  sha=$(basename "${directory%/}")

  if is_protected "$sha"; then
    log "keep    $sha ($([ "$sha" = "$ACTIVE" ] && echo active || echo pinned))"
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
log "retained $(ls -1t "$RELEASES" 2>/dev/null | tr '\n' ' ')"
log "$removed release(s) $([ "$MODE" = "--dry-run" ] && echo "would be removed" || echo removed)"
