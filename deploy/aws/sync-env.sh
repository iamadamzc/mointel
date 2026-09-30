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
LOCAL_ENV="$(grep -v '^\s*#' .env.local | grep -v '^\s*$' | grep -vE '^(MARKET_DB_PATH|IDENTITY_DB_PATH|TRADES_DB_PATH|OAUTH_REDIRECT_URI|MOINTEL_DASHBOARD_URL|NODE_ENV)=' || true)"

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
# Unset, it defaults to \`process.cwd()/data/identity.db\` -- and the services run
# with WorkingDirectory=/opt/mointel/current, so accounts would be written INSIDE
# the release directory that prune.sh removes (prune.sh:102, \`rm -rf\`). The first
# user's account would survive one deploy and be deleted by the second, silently:
# \`openIdentityStore\` mkdirs that path without erroring, so nothing would report
# it at any point.
#
# Set here rather than in .env.local, and stripped from the local file above, so
# a development value cannot reach the server and put it back.
IDENTITY_DB_PATH=/var/lib/mointel/identity.db

# The ten-second trade store, a separate file so its rows never lengthen
# market.db's pre-stop quick_check. Unset it would still land beside market.db,
# but a path this load-bearing is stated, not inferred; and openTradesStore
# refuses any path inside a release directory.
TRADES_DB_PATH=/var/lib/mointel/trades.db

# Google sign-in's redirect is a fact about THIS deployment, so it is set here
# and stripped from .env.local (a localhost value must never reach the server).
# It must match an authorised redirect URI on the Google OAuth client exactly.
# GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are his to create; they are carried
# from .env.local like every other secret. A secret placed ONLY on the box is
# erased by the next run of this script, which rewrites the env wholesale.
OAUTH_REDIRECT_URI=https://tmitrader.com/auth/callback/google

# The market worker reads TODAY-sheet tickers from the dashboard rather than
# holding Google credentials itself. Loopback, so it never meets Basic Auth.
MOINTEL_DASHBOARD_URL=http://127.0.0.1:3000

# --- market ---------------------------------------------------------------
ALPACA_DATA_FEED=sip
$ALPACA

# HIS RULING 2026-09-25: lower the capture floor to 25c.
#
# \`minute_bars\` is not a tape. The SIP stream is subscribed whole-market by
# wildcard, but \`runtime.ts\` persists only TRACKED symbols, and \`engine.ts\`
# adopts a symbol only inside this band -- so a bar outside it is discarded on
# arrival and leaves no trace anywhere. At the \$1 default, 517 symbols he can
# and does trade had NEVER produced a single row, and a sub-\$1 runner was
# captured only from the minute it crossed \$1, losing the steepest leg.
#
# MEASURED COST, 2026-09-25: +120 symbols, +1.5% rows, ~90MB at 20-day
# retention. NO VENDOR COST -- the bars already arrive on the existing
# wildcard subscription and are thrown away, and all 920 sub-\$1 names already
# carry rvol baselines. Research volume is bounded by BOARD SLOTS, not by
# capture, so model spend is flat: the same 12 slots, different names in them.
#
# SET HERE AND NOT ONLY ON THE BOX. \`sync-env.sh\` rewrites
# /etc/mointel/mointel.env wholesale, so a value typed onto the server survives
# deploys and is silently erased by the next sync -- and capture would narrow
# back with nothing reporting it.
DISCOVERY_PRICE_MIN=0.25

# HIS RULING 2026-09-26: RECORD \$0.25-\$50, qualify the board inside it
# (DISCOVERY_PRICE_MIN/MAX stay the board's band). captureBand() admits this only
# because it CONTAINS the discovery band; a refused band is logged as an ERROR
# on every engine build. The bootstrap seeds exactly this band at every restart
# and 22:00 roll (bootstrapBand). Activated with the market-worker restart of
# 2026-09-29 20:15 ET, his time; same reason as above for living HERE: a value
# typed only onto the box is erased by the next sync.
CAPTURE_PRICE_MIN=0.25
CAPTURE_PRICE_MAX=50

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
