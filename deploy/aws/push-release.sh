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

# ------------------------------------------------------- no password back ---
#
# Basic Auth came off the whole site with A5 (47f6aa24, 2026-10-07), installed
# as an nginx-only reload. deploy.sh installs the SHIPPING release's
# nginx-locations.conf, so a release that still carries the server-level
# `auth_basic "..."` line puts the password back over every page on its deploy
# and locks every tester out, silently. Read from the sha being shipped, before
# anything touches the box; a file that cannot be read refuses too.
# The per-location `auth_basic off;` lines are no-ops and do not count.
# BASIC_AUTH_SHIP="<his word, and why>" ships one anyway, and says so.
if ! LOCATIONS="$(git show "$SHA:deploy/aws/nginx-locations.conf" 2>/dev/null)"; then
  echo "[release] could not read deploy/aws/nginx-locations.conf at $SHORT; nothing was shipped" >&2
  exit 11
fi
if printf '%s\n' "$LOCATIONS" | grep -qE '^[[:space:]]*auth_basic[[:space:]]+"'; then
  if [ -n "${BASIC_AUTH_SHIP:-}" ]; then
    echo "[release] OVERRIDE: $SHORT sets server-level auth_basic; shipping it on: $BASIC_AUTH_SHIP" >&2
  else
    echo "[release] $SHORT sets a server-level auth_basic in nginx-locations.conf: its deploy would put the password back over the whole site" >&2
    echo "[release] ship a release that descends from 47f6aa24, or set BASIC_AUTH_SHIP=\"<his word>\"; nothing was shipped" >&2
    exit 11
  fi
fi

# ------------------------------------------------------------ test gate ---
#
# The suite, lint and typecheck AT THIS SHA, in a detached worktree -- not at
# HEAD and not at the working tree, which peers move constantly. Before this
# it was a separate command the operator had to remember. It runs BEFORE
# preflight because it takes minutes, and preflight's estimate of where the
# stop lands is only good at the moment it runs.
# DEPLOY_TESTS_OVERRIDE / DEPLOY_TESTS_SKIP are test-gate.sh's own, and loud.
# TEST_GATE_SH exists so the suite can drive this wiring against a stub.
bash "${TEST_GATE_SH:-$ROOT/deploy/aws/test-gate.sh}" "$SHA" \
  || { echo "[release] the test gate refused $SHORT; nothing was shipped" >&2; exit 3; }

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

# --------------------------------------------------------- required env ---
#
# A release can DECLARE the box settings it cannot run correctly without, one
# name per line in deploy/aws/required-env.txt AT THE SHIPPING SHA. It is read
# from the sha being shipped, not from the deployed release, so the release that
# introduces a key is the first one checked. (preflight.sh cannot do this: it
# runs from the DEPLOYED release, which predates the key.)
#
# Presence and non-emptiness only; a value is never read back, printed or
# logged. A key set to nothing or to a bare pair of quotes counts as absent.
# A box that cannot be read refuses too: "could not check" is not "present".
# Why this exists: DESK_OWNER_EMAIL fails CLOSED, so a release shipped without
# it takes Retry research away from the owner too.
REQUIRED_ENV="$(git show "$SHA:deploy/aws/required-env.txt" 2>/dev/null | grep -o -E '^[A-Z][A-Z0-9_]*' || true)"
MISSING_ENV=""
for key in $REQUIRED_ENV; do
  case "$key" in
    *[!A-Z0-9_]*|"") echo "[release] required-env.txt names an invalid key; nothing was shipped" >&2; exit 10 ;;
  esac
  state="$("${SSH_PRE[@]}" "sudo sed -n 's/^$key=//p' /etc/mointel/mointel.env | tr -d \"' \" | grep -q . && echo present || echo absent" 2>/dev/null || true)"
  case "$state" in
    present) ;;
    absent) MISSING_ENV="$MISSING_ENV $key" ;;
    *) MISSING_ENV="$MISSING_ENV $key(unreadable)" ;;
  esac
done
if [ -n "$MISSING_ENV" ]; then
  echo "[release] $SHORT declares box settings that are not set:$MISSING_ENV" >&2
  echo "[release] set them on the box (sync-env.sh), then re-run; nothing was shipped" >&2
  exit 10
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
# The default is 30 minutes. It was 15, which is the length of a deploy: every ship
# ended rc 8 "NOT confirmed" and the cutover was read from /proc by hand. A deploy
# spends up to ~13 min in quick_check alone (803.8 s measured 2026-09-30) plus the
# build and restart; the deadline has to sit well beyond that, and a deploy that
# still has not finished at 30 minutes is a deploy to look at, which rc 8 says.
# Both exist so the suite can drive this path in milliseconds against a stub.
DEADLINE=$(( $(date +%s) + ${DEPLOY_FOLLOW_SECONDS:-1800} ))
STATE=activating
while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  sleep "${DEPLOY_POLL_SECONDS:-6}"
  STATE="$("${SSH[@]}" "systemctl show $UNIT -p ActiveState --value" 2>/dev/null || echo unreachable)"
  case "$STATE" in
    inactive|failed) break ;;
  esac
done

"${SSH[@]}" "sudo journalctl -u $UNIT --no-pager -o cat" 2>/dev/null | grep -v -E '^\s*(added|npm warn|>|$)'

# The deadline is not an outcome. A unit still running when it passes has not
# cut over yet, and nothing below may speak for it.
case "$STATE" in
  inactive|failed) ;;
  *)
    echo "[release] deploy unit $UNIT is still '$STATE' at the follow deadline -- NOT confirmed." >&2
    echo "[release] it keeps running on the box; confirm the cutover from /proc before calling it live." >&2
    exit 8
    ;;
esac

RESULT="$("${SSH[@]}" "systemctl show $UNIT -p Result -p ExecMainStatus --value" 2>/dev/null | tr '\n' ' ')"
case "$RESULT" in
  "success 0 "*) ;;
  *)
    echo "[release] deploy unit $UNIT ended with: ${RESULT:-unknown (state $STATE)}" >&2
    echo "[release] deploy.sh rolls back on its own failures; read the journal above before acting." >&2
    exit 7
    ;;
esac

# A unit's exit status is a fact about a PROCESS. "Live" is a fact about what
# the services are running, so read that instead: each unit's working directory
# from /proc, which is the release it actually loaded. A deploy killed by
# `systemctl stop` exits success/0 too, and before this check it printed
# "is live" over a production that never moved.
UNITS="mointel-web mointel-research mointel-assess"
[ "${RESTART_MARKET:-no}" = "yes" ] && UNITS="$UNITS mointel-market"
# The billing worker counts once deploy.sh has enabled it (only with
# STRIPE_SECRET_KEY on the box). Before that it is disabled by design and has no
# process to read.
BILLING_ENABLED="$("${SSH[@]}" "systemctl is-enabled mointel-billing 2>/dev/null" 2>/dev/null | tr -d '\r' || true)"
[ "$BILLING_ENABLED" = "enabled" ] && UNITS="$UNITS mointel-billing"
LIVE="$("${SSH[@]}" "for u in $UNITS; do p=\$(systemctl show -p MainPID --value \$u); echo \"\$u \$(sudo readlink -f /proc/\$p/cwd)\"; done" 2>/dev/null || true)"
WANT="/opt/mointel/releases/$SHA"
CONFIRMED=0
STALE=""
for u in $UNITS; do
  got="$(printf '%s\n' "$LIVE" | awk -v u="$u" '$1 == u { print $2 }')"
  if [ "$got" = "$WANT" ]; then CONFIRMED=$((CONFIRMED + 1)); else STALE="$STALE $u=${got:-unreadable}"; fi
done
if [ -n "$STALE" ]; then
  echo "[release] the unit succeeded but production did NOT cut over to $SHORT:$STALE" >&2
  echo "[release] deploy.sh rolls back on its own failures; read the journal above before acting." >&2
  exit 9
fi

echo "[release] $SHORT is live on $HOST ($CONFIRMED services confirmed from /proc)"
