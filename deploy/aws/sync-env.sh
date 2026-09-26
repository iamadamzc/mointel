#!/usr/bin/env bash
#
# Builds the server's runtime environment file from the local one.
#
#   deploy/aws/sync-env.sh <host> <ssh-key>
#
# Run from the development machine. It reads .env.local plus whatever Alpaca
# credential file the project already uses, rewrites the handful of settings
# that must differ on a Linux server, and writes the result to
# /etc/mointel/mointel.env over SSH.
#
# No value is ever printed, echoed, passed as an argument, or written to a
# temporary file: the whole document goes to the server on stdin and is placed
# by `install` from /dev/stdin. Only key names appear in the output, so this can
# be run in front of somebody.
#
set -euo pipefail

HOST="${1:-}"
KEY="${2:-}"
if [ -z "$HOST" ] || [ -z "$KEY" ]; then
  echo "usage: sync-env.sh <host> <ssh-key>" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

[ -f .env.local ] || { echo "no .env.local found in $ROOT" >&2; exit 1; }

# ------------------------------------------------------- assemble, in memory ---

# Everything from .env.local, minus the settings that describe a Windows
# development machine rather than the application.
LOCAL_ENV="$(grep -v '^\s*#' .env.local | grep -v '^\s*$' | grep -vE '^(MARKET_DB_PATH|IDENTITY_DB_PATH|MOINTEL_DASHBOARD_URL|NODE_ENV)=' || true)"

# Alpaca credentials live outside .env.local on the development machine: the
# loader accepts a root-level text file, which is what Alpaca's key dialog
# produces when copied straight out. On the server they become ordinary
# environment variables, which the loader prefers over any file — so no
# credential file needs to exist there at all.
ALPACA=""
for candidate in *.txt *.env; do
  [ -f "$candidate" ] || continue
  key_id="$(grep -oE '\b[AP]K[A-Z0-9]{12,}\b' "$candidate" | head -1 || true)"
  [ -n "$key_id" ] || continue
  secret="$(grep -oE '\b[A-Za-z0-9/+_-]{35,}\b' "$candidate" | grep -v "^${key_id}$" | head -1 || true)"
  [ -n "$secret" ] || continue
  ALPACA="$(printf 'APCA_API_KEY_ID=%s\nAPCA_API_SECRET_KEY=%s\n' "$key_id" "$secret")"
  echo "[env] Alpaca credentials read from $candidate"
  break
done

if [ -z "$ALPACA" ]; then
  if grep -qE '^APCA_API_KEY_ID=' .env.local; then
    echo "[env] Alpaca credentials read from .env.local"
  else
    echo "no Alpaca credentials found in .env.local or a root-level key file" >&2
    exit 1
  fi
fi

DOCUMENT="$(cat <<EOF
# Momentum Intelligence Trading Desk — server runtime environment.
#
# Written by deploy/aws/sync-env.sh. Not in git, and it must never be: this
# file is the only place on the server where credentials exist.
#
# Owned by root, group-readable by the mointel service account, mode 0640.

NODE_ENV=production

# --- server paths ---------------------------------------------------------
# The store lives on the instance's local SSD, outside the release directory,
# so a deploy or a rollback cannot take the desk's history with it.
MARKET_DB_PATH=/var/lib/mointel/market.db
# Schema backups are written next to the store, in /var/lib/mointel/backups.

# The identity store, for the same reason and with a sharper edge.
#
# Unset, it defaults to `process.cwd()/data/identity.db` -- and the services run
# with WorkingDirectory=/opt/mointel/current, so accounts would be written INSIDE
# the release directory that prune.sh removes (prune.sh:102, `rm -rf`). The first
# user's account would survive one deploy and be deleted by the second, silently:
# `openIdentityStore` mkdirs that path without erroring, so nothing would report
# it at any point.
#
# Set here rather than in .env.local, and stripped from the local file above, so
# a development value cannot reach the server and put it back.
IDENTITY_DB_PATH=/var/lib/mointel/identity.db

# The market worker reads TODAY-sheet tickers from the dashboard rather than
# holding Google credentials itself. Loopback, so it never meets Basic Auth.
MOINTEL_DASHBOARD_URL=http://127.0.0.1:3000

# --- market ---------------------------------------------------------------
ALPACA_DATA_FEED=sip
$ALPACA

# HIS RULING 2026-09-26: "make it 1-20". The discovery band is \$1-\$20.
#
# This supersedes the 2026-09-25 25c floor (06f71c1) and the \$0-\$50 recording
# plan. The band is what CAPTURE adopts (engine.ts), not only what the board
# shows: a bar outside it is discarded on arrival and leaves no trace.
#
# Both ends are set explicitly, not left to config.ts defaults, so the ruling
# is visible here. SET HERE AND NOT ONLY ON THE BOX: this script rewrites
# /etc/mointel/mointel.env wholesale, so a value typed only onto the server is
# silently erased by the next sync. It takes effect at a market restart.
DISCOVERY_PRICE_MIN=1
DISCOVERY_PRICE_MAX=20

# --- carried over from .env.local ----------------------------------------
$LOCAL_ENV
EOF
)"

# ------------------------------------------------------------------ install ---

printf '%s\n' "$DOCUMENT" | ssh -i "$KEY" -o StrictHostKeyChecking=no "ubuntu@$HOST" \
  "sudo install -m 0640 -o root -g mointel /dev/stdin /etc/mointel/mointel.env"

echo "[env] written to $HOST:/etc/mointel/mointel.env"
echo "[env] keys installed:"
printf '%s\n' "$DOCUMENT" | grep -oE '^[A-Z_][A-Z0-9_]*=' | tr -d '=' | sort | sed 's/^/  /'
