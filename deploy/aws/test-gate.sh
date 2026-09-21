#!/usr/bin/env bash
#
# Test gate: run the suite AT THE SHA BEING SHIPPED, and refuse on red.
#
#   test-gate.sh <sha>                 # run and gate
#   DEPLOY_TESTS_OVERRIDE="reason"     # proceed anyway, loudly
#   DEPLOY_TESTS_SKIP=1                # do not run at all (see below)
#
# WHY THIS IS NOT IN preflight.sh, WHICH IS WHERE IT WAS ASKED FOR.
#
# `preflight.sh` runs ON THE SERVER, over SSH, from the DEPLOYED release. The
# suite cannot run there: the box has no checkout of the shipping sha and no
# node_modules for it until after the release has landed, which is after the
# point a gate is worth anything. It is also the 3,832 MB instance whose on-box
# build caused the 2026-08-27 capacity incident, and 2,167 tests is not the
# thing to put back on it during premarket. So the gate runs HERE.
#
# AND IT CANNOT SIMPLY RUN `npm test` IN THIS CHECKOUT.
#
# push-release.sh compares the tree against the sha and only WARNS — it ships
# the commit, not the tree, by design. So the tree routinely differs from what
# is shipping. On 2026-09-19 the suite passed in this checkout while the sha
# being enumerated was red, because a peer had the fix uncommitted. A green
# working tree is not evidence about a release.
#
# THE THREE THINGS THIS SCRIPT GOT WRONG BEFORE IT EVER SHIPPED, all found by
# running it against a known-red sha rather than by reasoning about it:
#
#   1. `cmd //c mklink /J` — MSYS rewrites the `/J` switch into a path and cmd
#      answers "Invalid switch". PowerShell's New-Item is used instead.
#   2. The cleanup's `rm -rf` FOLLOWED the junction and emptied this repo's own
#      node_modules, 371 packages, in a tree five sessions share. The link is
#      now removed with `rmdir`, which unlinks a junction without touching its
#      target, and nothing recursive runs until that has been confirmed.
#   3. Nesting the worktree inside the repo to avoid a link altogether looks
#      safer and breaks vite's resolution: `server-only` and friends go
#      unresolvable and NINE suites fail for reasons that have nothing to do
#      with the code. A gate that cries wolf gets overridden out of habit, so
#      false reds are worse than no gate.
set -euo pipefail

SHA="${1:-}"
[ -n "$SHA" ] || { echo "usage: test-gate.sh <sha>" >&2; exit 2; }

OVERRIDE=${DEPLOY_TESTS_OVERRIDE:-}
log() { echo "[tests] $*"; }

# Refuse, unless an override was given — in which case say so loudly and let
# the release through. Mirrors DEPLOY_WINDOW_OVERRIDE in preflight.sh.
refuse_or_override() {
  echo "[tests] BLOCKED: $1" >&2
  echo "[tests] Re-run with DEPLOY_TESTS_OVERRIDE=\"why this cannot wait\" to ship anyway." >&2
  [ -n "$OVERRIDE" ] || exit 3
  log "OVERRIDE: shipping anyway — $OVERRIDE"
  exit 0
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SHORT="$(git -C "$ROOT" rev-parse --short "$SHA")"
WINDOWS=no
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) WINDOWS=yes ;; esac

if [ -n "${DEPLOY_TESTS_SKIP:-}" ]; then
  log "SKIPPED by DEPLOY_TESTS_SKIP — the release is going out unverified"
  exit 0
fi

# An absent runner is an instrument failure, not a pass. A gate that cannot run
# must never look like a gate that ran and was happy.
[ -d "$ROOT/node_modules/vitest" ] ||
  refuse_or_override "node_modules/vitest is missing; cannot verify $SHORT. Run npm ci."

TMP="$(mktemp -d -t mointel-testgate-XXXXXX)"
WT="$TMP/wt"
LINK="$WT/node_modules"

# Unlink FIRST, verify, and only then recurse. The order is the safety.
cleanup() {
  if [ -e "$LINK" ]; then
    if [ "$WINDOWS" = yes ]; then
      cmd //c rmdir "$(cygpath -w "$LINK")" >/dev/null 2>&1 || true
    else
      rm -f "$LINK" || true
    fi
  fi
  if [ -e "$LINK" ]; then
    echo "[tests] WARNING: could not unlink $LINK. Leaving $TMP in place rather" >&2
    echo "[tests] than run rm -rf across a link into the real node_modules." >&2
  else
    git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true
    rm -rf "$TMP" >/dev/null 2>&1 || true
  fi
  # This cleanup destroyed the real node_modules once. Never silently again.
  [ -d "$ROOT/node_modules/vitest" ] ||
    echo "[tests] ALARM: $ROOT/node_modules was damaged by this run. Run npm ci." >&2
}
trap cleanup EXIT

log "checking out $SHORT into a detached worktree"
git -C "$ROOT" worktree add --detach --quiet "$WT" "$SHA"

if [ "$WINDOWS" = yes ]; then
  powershell -NoProfile -NonInteractive -Command \
    "New-Item -ItemType Junction -Path '$(cygpath -w "$LINK")' -Target '$(cygpath -w "$ROOT/node_modules")' | Out-Null" \
    >/dev/null 2>&1 || true
else
  ln -s "$ROOT/node_modules" "$LINK" || true
fi

[ -d "$LINK/vitest" ] ||
  refuse_or_override "could not link node_modules into the worktree; cannot verify $SHORT."

log "running the suite at $SHORT (not at HEAD, not at the working tree)"
if (cd "$WT" && npx vitest run --reporter=dot); then
  log "suite GREEN at $SHORT"
  exit 0
fi

refuse_or_override "the suite is RED at $SHORT. Nothing was shipped."
