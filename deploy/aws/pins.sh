#!/usr/bin/env bash
#
# Pinned releases: the ones retention is not allowed to touch.
#
#   pins.sh list
#   pins.sh pin   <sha> <label> <reason>
#   pins.sh unpin <label>
#   pins.sh check                      # every pinned release still exists
#
# Count-based retention pruned 372f5eb after three deployments, which is exactly
# how many deployments it took to fix the incident that made it the designated
# rollback target. "Keep the last three" is a guess about which releases matter;
# a pin is a statement.
#
# A pin is a small file per label under $PINS, holding the sha, the schema
# version the release expects, when and why it was pinned, and the database
# backup that goes with it — because rolling code back across a schema change
# without the matching backup is not a rollback, it is an outage with extra
# steps.
set -euo pipefail

RELEASES=${RELEASES:-/opt/mointel/releases}
PINS=${PINS:-/opt/mointel/pins}
BACKUPS=${BACKUPS:-/var/lib/mointel/backups}

log() { echo "[pins] $*"; }
fail() { echo "[pins] FAILED: $*" >&2; exit 1; }

# Label must be a filename, not a path fragment.
valid_label() { [[ "$1" =~ ^[a-z0-9][a-z0-9._-]{0,63}$ ]]; }

pin_field() { grep -m1 "^$2=" "$1" 2>/dev/null | cut -d= -f2- || true; }

cmd_list() {
  mkdir -p "$PINS" 2>/dev/null || true
  local found=0
  for file in "$PINS"/*.pin; do
    [ -e "$file" ] || continue
    found=1
    local label sha schema backup reason created present
    label=$(basename "$file" .pin)
    sha=$(pin_field "$file" sha)
    schema=$(pin_field "$file" schema_version)
    backup=$(pin_field "$file" backup)
    reason=$(pin_field "$file" reason)
    created=$(pin_field "$file" created_at)
    present="missing"
    [ -d "$RELEASES/$sha" ] && present="present"
    echo "$label sha=$sha schema=v$schema release=$present backup=${backup:-none} created=$created reason=$reason"
  done
  [ "$found" = 0 ] && echo "(no pins)"
  return 0
}

# Every sha that must survive pruning, one per line.
cmd_shas() {
  mkdir -p "$PINS" 2>/dev/null || true
  for file in "$PINS"/*.pin; do
    [ -e "$file" ] || continue
    pin_field "$file" sha
  done
}

cmd_pin() {
  local sha="${1:-}" label="${2:-}" reason="${3:-}"
  [ -n "$sha" ] && [ -n "$label" ] || fail "usage: pins.sh pin <sha> <label> <reason>"
  valid_label "$label" || fail "label must match ^[a-z0-9][a-z0-9._-]{0,63}$"
  [ -d "$RELEASES/$sha" ] || fail "release $sha is not materialised under $RELEASES"

  local schema backup
  # The schema the pinned code expects, read from the code itself rather than
  # from whatever the live store happens to be at now.
  schema=$(grep -oE 'SCHEMA_VERSION = [0-9]+' "$RELEASES/$sha/lib/market/store/db.ts" 2>/dev/null |
    grep -oE '[0-9]+' || true)
  [ -n "$schema" ] || fail "could not read SCHEMA_VERSION from $sha"

  # The newest backup taken at or below that schema version: the one an older
  # build can actually open.
  backup=$(ls -1t "$BACKUPS"/market-v"$schema"-*.db 2>/dev/null | head -1 || true)

  mkdir -p "$PINS"
  cat > "$PINS/$label.pin" <<EOF
sha=$sha
label=$label
schema_version=$schema
backup=$backup
reason=$reason
created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
  log "pinned $label -> $sha (schema v$schema, backup ${backup:-none})"
  [ -n "$backup" ] || log "WARNING: no market-v$schema backup found; rollback across a schema change would need one"
}

cmd_unpin() {
  local label="${1:-}"
  [ -n "$label" ] || fail "usage: pins.sh unpin <label>"
  valid_label "$label" || fail "bad label"
  [ -f "$PINS/$label.pin" ] || fail "no pin named $label"
  local sha
  sha=$(pin_field "$PINS/$label.pin" sha)
  rm -f "$PINS/$label.pin"
  log "unpinned $label (was $sha)"
}

cmd_check() {
  mkdir -p "$PINS" 2>/dev/null || true
  local bad=0
  for file in "$PINS"/*.pin; do
    [ -e "$file" ] || continue
    local label sha backup
    label=$(basename "$file" .pin)
    sha=$(pin_field "$file" sha)
    backup=$(pin_field "$file" backup)
    if [ ! -d "$RELEASES/$sha" ]; then
      echo "[pins] MISSING release for pin $label: $sha" >&2
      bad=1
    fi
    if [ -n "$backup" ] && [ ! -f "$backup" ]; then
      echo "[pins] MISSING backup for pin $label: $backup" >&2
      bad=1
    fi
  done
  [ "$bad" = 0 ] || fail "one or more pins are not satisfiable"
  log "all pins satisfiable"
}

case "${1:-list}" in
  list)  cmd_list ;;
  shas)  cmd_shas ;;
  pin)   shift; cmd_pin "$@" ;;
  unpin) shift; cmd_unpin "$@" ;;
  check) cmd_check ;;
  *)     fail "unknown command: $1" ;;
esac
