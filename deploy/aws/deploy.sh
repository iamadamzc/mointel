#!/usr/bin/env bash
#
# Server-side release step. Run as root, on the instance:
#
#   sudo bash /opt/mointel/releases/<sha>/deploy/aws/deploy.sh <sha>
#
# push-release.sh does that for you from the development machine; this exists
# separately so a deploy can be finished or repeated by hand when something has
# gone wrong and you are already logged in.
#
# It expects /opt/mointel/releases/<sha> to already contain the exact commit,
# and /etc/mointel/mointel.env to already exist. It installs dependencies,
# builds, migrates the schema once, switches the `current` symlink and restarts
# the desk — and if the health check does not come back, it puts the previous
# release back and restarts on that instead. The old release is never deleted
# until three newer ones exist.
#
set -euo pipefail

SHA="${1:-}"
if [ -z "$SHA" ]; then
  echo "usage: deploy.sh <git-sha>" >&2
  exit 2
fi

RELEASES=/opt/mointel/releases
RELEASE="$RELEASES/$SHA"
CURRENT=/opt/mointel/current
SERVICE_USER=mointel
KEEP_RELEASES=3

# The market worker is deliberately not in this list. Restarting it drops the
# one SIP connection the account is allowed and the desk goes quiet for as long
# as the reconnect takes, so a code deploy leaves it running unless the operator
# asks otherwise. See RESTART_MARKET below.
RUNTIME_UNITS=(mointel-web mointel-research mointel-assess)
RESTART_MARKET="${RESTART_MARKET:-no}"

log() { echo "[deploy] $*"; }
fail() { echo "[deploy] FAILED: $*" >&2; exit 1; }

[ -d "$RELEASE" ] || fail "no such release: $RELEASE"
[ -f /etc/mointel/mointel.env ] || fail "/etc/mointel/mointel.env is missing — run sync-env.sh first"

PREVIOUS=""
if [ -L "$CURRENT" ]; then
  PREVIOUS="$(readlink -f "$CURRENT")"
  log "current release: $(basename "$PREVIOUS")"
fi

# ------------------------------------------------------------------ build ---

chown -R "$SERVICE_USER:$SERVICE_USER" "$RELEASE"

# npm ci, not npm install: the lockfile is the deployed artefact's dependency
# list, and a deploy that silently resolves something different is not the
# commit it claims to be. Windows node_modules are never copied here — the
# native better-sqlite3 binding has to be the Linux one.
log "installing dependencies"
sudo -u "$SERVICE_USER" env -C "$RELEASE" npm ci --no-audit --no-fund

# devDependencies stay installed on purpose: the three workers run through tsx,
# which is one of them. Pruning here would leave a desk that builds and then
# cannot start a single worker.

log "building"
sudo -u "$SERVICE_USER" env -C "$RELEASE" NODE_ENV=production npm run build

# ---------------------------------------------------------------- install ---

log "installing nginx site"
# The shared location file first: both server blocks include it, and installing
# a server block that references a file which is not there yet fails the test.
install -m 0644 "$RELEASE/deploy/aws/nginx-locations.conf" /etc/nginx/mointel-locations.conf
install -m 0644 "$RELEASE/deploy/aws/nginx.conf" /etc/nginx/sites-available/mointel
ln -sfn /etc/nginx/sites-available/mointel /etc/nginx/sites-enabled/mointel
rm -f /etc/nginx/sites-enabled/default
[ -f /etc/nginx/mointel.htpasswd ] || fail "/etc/nginx/mointel.htpasswd is missing — run sync-env.sh first"

# The direct-HTTPS listener, re-rendered from the release so a change to it
# ships like any other file. Only if setup-tls.sh has run and the certificate
# it obtained is still on disk — otherwise nginx would refuse to start over a
# missing certificate and take the whole desk down with it.
if [ -f /etc/mointel/tls-domain ]; then
  TLS_DOMAIN="$(head -1 /etc/mointel/tls-domain)"
  if [ -n "$TLS_DOMAIN" ] && [ -f "/etc/letsencrypt/live/$TLS_DOMAIN/fullchain.pem" ]; then
    log "installing the direct HTTPS site for $TLS_DOMAIN"
    sed "s|__DOMAIN__|$TLS_DOMAIN|g" "$RELEASE/deploy/aws/nginx-tls.conf"       > /etc/nginx/sites-available/mointel-tls
    ln -sfn /etc/nginx/sites-available/mointel-tls /etc/nginx/sites-enabled/mointel-tls
  else
    log "tls-domain is set to '$TLS_DOMAIN' but no certificate is present; skipping the HTTPS site"
    rm -f /etc/nginx/sites-enabled/mointel-tls
  fi
fi

nginx -t || fail "nginx configuration is invalid"

log "installing the status command"
install -m 0755 "$RELEASE/deploy/aws/status.sh" /usr/local/bin/mointel-status

log "installing systemd units"
install -m 0644 "$RELEASE"/deploy/aws/systemd/*.service /etc/systemd/system/
install -m 0644 "$RELEASE"/deploy/aws/systemd/mointel.target /etc/systemd/system/
systemctl daemon-reload

# ----------------------------------------------------------------- switch ---

log "stopping runtime services"
for unit in "${RUNTIME_UNITS[@]}"; do systemctl stop "$unit" || true; done
if [ "$RESTART_MARKET" = "yes" ]; then
  log "stopping the market worker (RESTART_MARKET=yes)"
  systemctl stop mointel-market || true
fi

ln -sfn "$RELEASE" "$CURRENT"
log "current -> $SHA"

# The migration owner runs against the new code, on its own, before any writer
# is started.
#
# Invoked directly rather than through `systemctl start mointel-migrate`.
#
# That unit is a Type=oneshot with RemainAfterExit, so re-running it means
# stopping it first — and the four runtime services declare Requires= on it.
# systemd propagates a stop across Requires=, so stopping the migrate unit stops
# every service that requires it, INCLUDING the market worker this script goes
# out of its way not to touch. That cost a live SIP connection once; it does not
# get to do it twice.
#
# The unit still exists and still owns the boot path, where Requires= is exactly
# the guarantee wanted: nothing starts until the migration has exited 0. Here
# the same entry point runs as the same user against the same store, and a
# non-zero exit stops the deploy before any writer has seen it.
#
# Only the store path is passed. The migration needs nothing else, so no
# credential is put on a command line to do it.
log "migrating schema"
MOINTEL_DB_PATH="$(sed -n 's/^MARKET_DB_PATH=//p' /etc/mointel/mointel.env | head -1)"
[ -n "$MOINTEL_DB_PATH" ] || fail "MARKET_DB_PATH is not set in /etc/mointel/mointel.env"

if ! sudo -u "$SERVICE_USER" env -C "$RELEASE" \
       NODE_ENV=production \
       MARKET_DB_PATH="$MOINTEL_DB_PATH" \
       /usr/bin/node node_modules/tsx/dist/cli.mjs worker/migrate.ts; then
  fail "schema migration failed — nothing was started against it"
fi

log "starting services"

# `enable`, deliberately not `enable --now`.
#
# mointel.target Wants= all four services, including the market worker, so
# starting the target starts a second Alpaca SIP connection — which does not
# fail loudly, it silently displaces whichever one was already connected. That
# is correct on boot, when this machine is meant to own the connection, and
# wrong during a deploy, when it may not be. Enabling without starting gets the
# boot behaviour without the deploy-time surprise.
systemctl enable mointel.target >/dev/null 2>&1 || true

for unit in "${RUNTIME_UNITS[@]}"; do
  systemctl enable "$unit" >/dev/null 2>&1 || true
  systemctl start "$unit"
done
if [ "$RESTART_MARKET" = "yes" ]; then
  systemctl enable mointel-market >/dev/null 2>&1 || true
  systemctl start mointel-market
fi

systemctl reload nginx || systemctl restart nginx

# ------------------------------------------------------------------ verify ---

log "waiting for the dashboard"
healthy=no
for _ in $(seq 1 60); do
  if curl -fsS --max-time 5 http://127.0.0.1/api/health >/dev/null 2>&1; then
    healthy=yes
    break
  fi
  sleep 2
done

if [ "$healthy" != "yes" ]; then
  echo "[deploy] health check failed" >&2
  journalctl -u mointel-web -n 40 --no-pager >&2 || true

  if [ -n "$PREVIOUS" ] && [ -d "$PREVIOUS" ] && [ "$PREVIOUS" != "$RELEASE" ]; then
    echo "[deploy] rolling back to $(basename "$PREVIOUS")" >&2
    ln -sfn "$PREVIOUS" "$CURRENT"
    systemctl daemon-reload
    for unit in "${RUNTIME_UNITS[@]}"; do systemctl restart "$unit" || true; done
    echo "[deploy] rolled back. The schema was already migrated: if this" >&2
    echo "[deploy] release changed it, restore a backup from" >&2
    echo "[deploy] /var/lib/mointel/backups before trusting the old code." >&2
  fi
  exit 1
fi

curl -fsS --max-time 5 http://127.0.0.1/api/health || true
echo

# ---------------------------------------------------------------- retention ---

# Keep the previous working releases so a rollback is a symlink switch rather
# than a rebuild.
mapfile -t old < <(ls -1dt "$RELEASES"/*/ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)))
for directory in "${old[@]:-}"; do
  [ -z "$directory" ] && continue
  [ "$(readlink -f "$directory")" = "$(readlink -f "$CURRENT")" ] && continue
  log "removing old release $(basename "$directory")"
  rm -rf "$directory"
done

log "deployed $SHA"
