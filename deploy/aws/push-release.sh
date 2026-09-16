#!/usr/bin/env bash
#
# Ships an exact commit to the server and deploys it.
#
#   deploy/aws/push-release.sh <host> <ssh-key> [git-ref]
#
# Run from the development machine. Defaults to HEAD.
#
# The release is produced with `git archive`, so what lands on the server is the
# committed tree at that sha and nothing else — no untracked scratch files, no
# .env.local, no local node_modules, and no possibility of deploying a working
# copy that was never committed. The server never needs a git credential.
#
set -euo pipefail

HOST="${1:-}"
KEY="${2:-}"
REF="${3:-HEAD}"

if [ -z "$HOST" ] || [ -z "$KEY" ]; then
  echo "usage: push-release.sh <host> <ssh-key> [git-ref]" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

SHA="$(git rev-parse "$REF")"
SHORT="$(git rev-parse --short "$REF")"

# A deployment has to name a commit, not a mood. If the tree has changes that
# are not in the sha, they are not going to the server and saying so now is
# kinder than discovering it during an incident.
if ! git diff --quiet "$SHA" -- ':!*.md' ':!*.png'; then
  echo "[release] WARNING: tracked files differ from $SHORT — deploying the commit, not the working tree" >&2
fi

# ------------------------------------------------------------- preflight ---
#
# What is about to run, and is the rollback baseline still there. Runs on the
# SERVER either way, because the checkpoint clock that matters is the
# scheduler's, not this laptop's.
#
# It runs from the DEPLOYED release when that release has a preflight, and
# otherwise from the commit being shipped, streamed over the connection.
#
# That fallback is not a convenience. preflight.sh and this script arrived in
# the same commit, so the first release carrying the gate could never install
# it: the gate refused every deployment because the file it wanted lived only
# in the release it was blocking. A safety check that cannot be installed is
# not a safety check, and "no preflight on the server" must mean "run the new
# one", never "skip it".
SSH_PRE=(ssh -i "$KEY" -o StrictHostKeyChecking=no "ubuntu@$HOST")
PREFLIGHT_ENV="sudo DEPLOY_WINDOW_OVERRIDE='${DEPLOY_WINDOW_OVERRIDE:-}' PROTECTED_MINUTES='${PROTECTED_MINUTES:-5}'"

preflight_refused() {
  echo "[release] preflight refused the deployment; nothing was shipped" >&2
  exit 3
}

if "${SSH_PRE[@]}" "test -f /opt/mointel/current/deploy/aws/preflight.sh"; then
  "${SSH_PRE[@]}" "$PREFLIGHT_ENV bash /opt/mointel/current/deploy/aws/preflight.sh" || preflight_refused
else
  echo "[release] the deployed release carries no preflight; running the one from $SHORT" >&2
  # The gate from the commit being shipped, evaluated against the server's
  # clock. `bash -s` reads it from the connection, so nothing is written to
  # the instance before the gate has passed.
  git show "$SHA:deploy/aws/preflight.sh" | "${SSH_PRE[@]}" "$PREFLIGHT_ENV bash -s" || preflight_refused
fi

echo "[release] deploying $SHORT to $HOST"

SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=no "ubuntu@$HOST")

"${SSH[@]}" "sudo install -d -m 0755 -o mointel -g mointel /opt/mointel/releases/$SHA"

# Straight from git into place: no tarball on either disk, nothing to clean up
# if the connection drops half way.
git archive --format=tar "$SHA" \
  | "${SSH[@]}" "sudo tar -x -C /opt/mointel/releases/$SHA && sudo chown -R mointel:mointel /opt/mointel/releases/$SHA"

# Provenance the server can answer for on its own, when nobody remembers what
# is running.
"${SSH[@]}" "printf '%s\n' '$SHA' | sudo tee /opt/mointel/releases/$SHA/RELEASE_SHA >/dev/null"


# ------------------------------------------------------- prebuilt artefact ---
#
# Building on the production box took it down on 2026-08-27, so the release can
# carry a `.next` built somewhere else and `deploy.sh` will skip its own build.
#
# `.next` is gitignored, so it cannot ride in the archive above — it is shipped
# separately, after the tree is in place.
#
# ARTIFACT_NEXT names the directory to ship. It MUST have been built from this
# exact sha: a stale artefact would deploy code the sha does not contain, and
# nothing downstream would notice, because a `.next` directory carries no
# record of what produced it. The gate already builds at the shipping sha in a
# pinned worktree, so that build is the one to point at.
#
# The platform guard is not caution, it is an untested path. Next.js build
# output is not guaranteed portable across platforms, production has always
# built on Linux, and Windows-to-Linux has never been verified here. Shipping
# it unverified would trade a known capacity problem for an unknown correctness
# one. Set ARTIFACT_PLATFORM_OK=yes only once that equivalence is established.
if [ -n "${ARTIFACT_NEXT:-}" ]; then
  [ -d "$ARTIFACT_NEXT" ] || { echo "[release] ARTIFACT_NEXT is not a directory: $ARTIFACT_NEXT" >&2; exit 4; }

  if [ "$(uname -s)" != "Linux" ] && [ "${ARTIFACT_PLATFORM_OK:-no}" != "yes" ]; then
    echo "[release] REFUSING to ship a $(uname -s)-built artefact to a Linux server — unverified path." >&2
    echo "[release] Build on Linux, or set ARTIFACT_PLATFORM_OK=yes once equivalence is established." >&2
    exit 5
  fi

  echo "[release] shipping prebuilt artefact from $ARTIFACT_NEXT"
  tar -C "$(dirname "$ARTIFACT_NEXT")" -cf - "$(basename "$ARTIFACT_NEXT")" \
    | "${SSH[@]}" "sudo tar -x -C /opt/mointel/releases/$SHA && sudo chown -R mointel:mointel /opt/mointel/releases/$SHA/.next"
else
  echo "[release] no prebuilt artefact; the server will build with a capped heap" >&2
fi

# ------------------------------------------------------------ deploy ---
#
# deploy.sh runs DETACHED from this connection, as a transient systemd unit on
# the box, and this script only follows it. Before 2026-09-16 it ran in the
# foreground of the ssh session, so a dropped transport killed it wherever it
# happened to be: that night a reset mid-`npm ci` left a half-built release,
# and the rerun's mis-read of that leftover cost a four-minute dashboard outage.
# A deploy's process must not share the fate of the laptop's wifi.
#
# The unit name carries the short sha and a stamp so two deploys never collide
# and the journal is findable afterwards: `journalctl -u <unit>`.
UNIT="mointel-deploy-$SHORT-$(date -u +%H%M%S)"
echo "[release] launching deploy.sh as $UNIT (detached; follows the journal)"
"${SSH[@]}" "sudo systemd-run --unit=$UNIT --collect --setenv=RESTART_MARKET=${RESTART_MARKET:-no}   -p StandardOutput=journal -p StandardError=journal   bash /opt/mointel/releases/$SHA/deploy/aws/deploy.sh $SHA"   || { echo "[release] could not launch the deploy unit" >&2; exit 6; }

# Poll rather than `journalctl -f`: a follow stream dies with the connection,
# and reconnecting to poll is what makes a dropped transport recoverable.
# Each poll is its own short ssh; a failed poll is retried, not fatal.
# DEPLOY_FOLLOW_SECONDS bounds the wait; DEPLOY_POLL_SECONDS is the interval.
# Both exist so the suite can drive this path in milliseconds against a stub.
DEADLINE=$(( $(date +%s) + ${DEPLOY_FOLLOW_SECONDS:-900} ))
STATE=activating
while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  sleep "${DEPLOY_POLL_SECONDS:-6}"
  STATE="$("${SSH[@]}" "systemctl show $UNIT -p ActiveState --value" 2>/dev/null || echo unreachable)"
  case "$STATE" in
    inactive|failed) break ;;
  esac
done

"${SSH[@]}" "sudo journalctl -u $UNIT --no-pager -o cat" 2>/dev/null | grep -v -E '^\s*(added|npm warn|>|$)'

RESULT="$("${SSH[@]}" "systemctl show $UNIT -p Result -p ExecMainStatus --value" 2>/dev/null | tr '\n' ' ')"
case "$RESULT" in
  "success 0 "*) ;;
  *)
    echo "[release] deploy unit $UNIT ended with: ${RESULT:-unknown (state $STATE)}" >&2
    echo "[release] deploy.sh rolls back on its own failures; read the journal above before acting." >&2
    exit 7
    ;;
esac

echo "[release] $SHORT is live on $HOST"
