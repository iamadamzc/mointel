#!/usr/bin/env bash
#
# Release gate: lockfile, types, typecheck, lint and the suite — AT THE SHA
# BEING SHIPPED — refusing rather than guessing when a check cannot run.
#
#   test-gate.sh <sha>                 # run and gate
#   DEPLOY_TESTS_OVERRIDE="reason"     # proceed anyway, loudly
#   DEPLOY_TESTS_SKIP=1                # do not run at all
#
# WHY IT IS NOT IN preflight.sh, WHICH IS WHERE IT WAS ASKED FOR.
#
# `preflight.sh` runs ON THE SERVER, over SSH, from the DEPLOYED release. There
# is no checkout of the shipping sha there and no node_modules for it until
# after the release lands, which is after a gate is worth anything. It is also
# the 3,832 MB instance whose on-box build caused the 2026-08-27 capacity
# incident. So the gate runs HERE, on the machine that ships.
#
# AND IT CANNOT BE `npm test` IN THIS CHECKOUT. push-release.sh only WARNS when
# the tree differs from the sha — it ships the commit, not the tree, by design.
# On 2026-09-19 the suite passed in this checkout while the sha being enumerated
# was red, because a peer had the fix uncommitted.
#
# ──────────────────────────────────────────────────────────────────────────
# A WORKTREE PINS SOURCE AND NOTHING ELSE. That one sentence is the whole
# design. Three prerequisites live outside the commit, and on 2026-09-24 all
# three produced failures that read exactly like a real regression at the sha:
#
#   dependencies         Design's worktree: "Cannot find package 'marked'".
#                        Stale node_modules, not a code failure.
#   generated artefacts  `LayoutProps` is declared in .next/types/routes.d.ts,
#                        which `next typegen` writes. A bare worktree has none,
#                        so tsc reports TS2304 at a sha that is clean.
#   the runner itself    no node_modules/vitest at all.
#
# So each gets a REFUSAL rather than a verdict. A gate that cannot run a check
# must never look like a gate that ran it and was unhappy — and equally must
# never look like one that ran it and was happy.
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail

SHA="${1:-}"
[ -n "$SHA" ] || { echo "usage: test-gate.sh <sha>" >&2; exit 2; }

OVERRIDE=${DEPLOY_TESTS_OVERRIDE:-}
log() { echo "[gate] $*"; }

refuse_or_override() {
  echo "[gate] BLOCKED: $1" >&2
  echo "[gate] Re-run with DEPLOY_TESTS_OVERRIDE=\"why this cannot wait\" to ship anyway." >&2
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

# ---- 1. the runner exists at all -----------------------------------------
[ -d "$ROOT/node_modules/vitest" ] ||
  refuse_or_override "node_modules/vitest is missing; cannot verify $SHORT. Run npm ci."

# ---- 2. the installed deps belong to THIS sha ----------------------------
#
# node_modules is linked, not installed per-sha, so it reflects whatever the
# working tree last installed. If the sha's lockfile differs, every result
# below is about a dependency set that is not the release's.
git -C "$ROOT" diff --quiet "$SHA" -- package-lock.json ||
  refuse_or_override "package-lock.json at $SHORT differs from this checkout's; node_modules does not belong to that sha. Run npm ci at $SHORT."

WT="$(mktemp -d -t mointel-gate-XXXXXX)/wt"
LINK="$WT/node_modules"

# Unlink FIRST, verify, and only then recurse. The order is the safety: on
# 2026-09-21 an `rm -rf` followed this junction and emptied the repo's own
# node_modules — 371 packages, in a tree five sessions share.
cleanup() {
  if [ -e "$LINK" ]; then
    if [ "$WINDOWS" = yes ]; then cmd //c rmdir "$(cygpath -w "$LINK")" >/dev/null 2>&1 || true
    else rm -f "$LINK" || true; fi
  fi
  if [ -e "$LINK" ]; then
    echo "[gate] WARNING: could not unlink $LINK; leaving $WT rather than running rm -rf across a link into the real node_modules." >&2
  else
    git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true
    rm -rf "$(dirname "$WT")" >/dev/null 2>&1 || true
  fi
  [ -d "$ROOT/node_modules/vitest" ] ||
    echo "[gate] ALARM: $ROOT/node_modules was damaged by this run. Run npm ci." >&2
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

# ---- 3. generated types, without a full build ----------------------------
#
# `next typegen` writes .next/types in about two seconds. Measured 2.191s on
# 2026-09-24, which is why typecheck is inside this gate rather than outside
# it: the alternative was believed to be an 8-minute build per deploy, and it
# is not.
log "generating route types (no build)"
(cd "$WT" && npx next typegen >/dev/null 2>&1) || true
[ -f "$WT/.next/types/routes.d.ts" ] ||
  refuse_or_override "next typegen produced no .next/types/routes.d.ts; a typecheck from here would report TS2304 for types that exist at $SHORT."

# ---- 4. typecheck --------------------------------------------------------
log "typecheck at $SHORT"
(cd "$WT" && npx tsc --noEmit) ||
  refuse_or_override "typecheck is RED at $SHORT."

# ---- 5. lint -------------------------------------------------------------
#
# Outside the gate until 2026-09-24, which is how 9c3447b reached an
# enumeration with two prefer-const errors behind a green lint REPORT.
log "lint at $SHORT"
(cd "$WT" && npx eslint . --max-warnings=-1) ||
  refuse_or_override "lint is RED at $SHORT."

# ---- 6. the suite --------------------------------------------------------
log "suite at $SHORT (not at HEAD, not at the working tree)"
(cd "$WT" && npx vitest run --reporter=dot) ||
  refuse_or_override "the suite is RED at $SHORT. Nothing was shipped."

log "ALL GREEN at $SHORT — lockfile, types, typecheck, lint, suite"
exit 0
