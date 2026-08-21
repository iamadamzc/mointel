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

"${SSH[@]}" "sudo RESTART_MARKET=${RESTART_MARKET:-no} bash /opt/mointel/releases/$SHA/deploy/aws/deploy.sh $SHA"

echo "[release] $SHORT is live on $HOST"
