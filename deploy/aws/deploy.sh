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

# The billing worker runs only once the box has a Stripe key: without one it
# refuses to start (lib/billing/stripeClient.ts), and an enabled unit would
# crash-loop. Read here, before anything stops, so stop and start agree. Only
# whether the line has a value is read; the value is never printed.
BILLING_UNIT=mointel-billing
if grep -q '^STRIPE_SECRET_KEY=.' /etc/mointel/mointel.env 2>/dev/null; then
  BILLING_ON=yes
else
  BILLING_ON=no
fi

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

# The build is the largest thing this instance ever runs, and on 2026-08-27 it
# took the box down: `next build` exhausted a 4 GB Lightsail instance that was
# also running four services against an 877 MB store. ssh died, then the app,
# then nginx; only the market worker survived, at ~5% throughput, through the
# first 40 minutes of premarket. Capture cannot be backfilled, so that cost was
# permanent.
#
# Two defences, in order of preference.
#
# First: if the release already carries a built artefact, do not build at all.
# `push-release.sh` ships one when it has a trustworthy build — see there for
# why "trustworthy" excludes an artefact built on a different platform.
#
# Second, when building here is unavoidable: cap the heap and yield the CPU.
# A capped build FAILS, which is recoverable — the runtime units are still up
# at this point, because the build runs before the stop below. An uncapped
# build takes the instance, which is not.
BUILD_HEAP_MB="${BUILD_HEAP_MB:-1536}"

# A complete Next build carries .next/BUILD_ID. A directory without it is a
# build that was interrupted -- on 2026-09-16 a deploy whose ssh transport
# dropped mid-`npm ci` left 403 files and no BUILD_ID, this check read that as
# "prebuilt", skipped the build, and web could not start; the rollback then
# left web FAILED for four minutes. The presence of a directory is not the
# presence of a build.
if [ -f "$RELEASE/.next/BUILD_ID" ]; then
  log "prebuilt artefact present (BUILD_ID $(cat "$RELEASE/.next/BUILD_ID")); skipping the on-box build"
else
  if [ -d "$RELEASE/.next" ]; then
    log "removing an incomplete .next (no BUILD_ID) left by an interrupted build"
    rm -rf "$RELEASE/.next"
  fi
  log "building (heap capped at ${BUILD_HEAP_MB}MB, niced)"
  sudo -u "$SERVICE_USER" env -C "$RELEASE" \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=$BUILD_HEAP_MB" \
    nice -n 10 npm run build \
    || fail "the build failed or hit its ${BUILD_HEAP_MB}MB heap cap; the previous release is still serving"
fi

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
    # Extra names are OPTIONAL and ADDITIVE. The file may not exist, and when
    # it does the primary name still comes first -- so a desk that has only ever
    # had one name renders exactly as it did before this existed.
    TLS_NAMES="$TLS_DOMAIN"
    if [ -f /etc/mointel/tls-extra-names ]; then
      TLS_NAMES="$TLS_DOMAIN $(tr '\n' ' ' < /etc/mointel/tls-extra-names)"
    fi
    log "serving TLS for: $TLS_NAMES"
    sed -e "s|__DOMAIN__|$TLS_DOMAIN|g" -e "s|__SERVER_NAMES__|$TLS_NAMES|g"       "$RELEASE/deploy/aws/nginx-tls.conf" > /etc/nginx/sites-available/mointel-tls
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
install -m 0644 "$RELEASE"/deploy/aws/systemd/*.timer /etc/systemd/system/ || log "WARNING: no watchdog timer unit was installed"
systemctl daemon-reload

# ----------------------------------------------------------------- switch ---

# THE INTEGRITY CHECK RUNS BEFORE ANYTHING IS STOPPED. It is a read; WAL
# readers do not block the running writers; and on 2026-09-17 it spent 3m27s
# inside the stop window on a 1.8 GB store, which was 3m27s of public 502 on
# the night before the site went to Google. The store only grows (retention
# 20), so the window would have grown with it. A bad store fails the deploy
# here, with everything still serving.
MOINTEL_DB_PATH="$(sed -n 's/^MARKET_DB_PATH=//p' /etc/mointel/mointel.env | head -1)"
[ -n "$MOINTEL_DB_PATH" ] || fail "MARKET_DB_PATH is not set in /etc/mointel/mointel.env"
log "integrity check (services still up)"
if ! sudo -u "$SERVICE_USER" env -C "$RELEASE" \
       NODE_ENV=production \
       MARKET_DB_PATH="$MOINTEL_DB_PATH" \
       /usr/bin/node node_modules/tsx/dist/cli.mjs worker/migrate.ts --check-only; then
  fail "the store failed its integrity check; nothing was stopped"
fi

log "stopping runtime services"
DOWN_AT=$(date +%s)
for unit in "${RUNTIME_UNITS[@]}"; do systemctl stop "$unit" || true; done
# Stopped like the runtime units so it restarts on the new release. SIGTERM lets
# the pass in flight finish (worker/billing.ts); a PENDING row waits for the
# next pass, it is never lost.
systemctl stop "$BILLING_UNIT" 2>/dev/null || true
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
log "migrating schema (quick_check already recorded above)"
if ! sudo -u "$SERVICE_USER" env -C "$RELEASE" \
       NODE_ENV=production \
       MARKET_DB_PATH="$MOINTEL_DB_PATH" \
       /usr/bin/node node_modules/tsx/dist/cli.mjs worker/migrate.ts --no-check; then
  fail "schema migration failed; nothing was started against it"
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
if [ "$BILLING_ON" = "yes" ]; then
  systemctl enable "$BILLING_UNIT" >/dev/null 2>&1 || true
  systemctl reset-failed "$BILLING_UNIT" 2>/dev/null || true
  systemctl start "$BILLING_UNIT" || log "WARNING: $BILLING_UNIT did not start; charges wait until it does"
else
  systemctl disable "$BILLING_UNIT" >/dev/null 2>&1 || true
  log "billing worker not started: no STRIPE_SECRET_KEY in the env file"
fi

# The watchdog is not part of the runtime and must never fail a deploy: enable
# its timer if it is not already, and move on either way.
systemctl enable --now mointel-watchdog.timer >/dev/null 2>&1 || log "WARNING: the watchdog timer could not be enabled"

systemctl reload nginx || systemctl restart nginx

# ------------------------------------------------------------------ verify ---

# The number the public site pays for every deploy, in the journal beside the
# sha rather than reconstructed from unit timestamps afterwards.
log "services were down for $(( $(date +%s) - DOWN_AT ))s"
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
    # reset-failed FIRST. A unit that crash-looped against the bad release has
    # hit its start rate limit (StartLimitBurst=5 in 5min), and systemd then
    # refuses `restart` with "Start request repeated too quickly" -- which is
    # exactly what happened on 2026-09-16 02:10 ET: the old build was fine,
    # the restart was refused, and this script printed "rolled back" over a
    # dashboard that stayed down for four minutes. Clearing the counter is
    # what makes the rollback a rollback.
    for unit in "${RUNTIME_UNITS[@]}"; do
      systemctl reset-failed "$unit" 2>/dev/null || true
      systemctl restart "$unit" || echo "[deploy] ROLLBACK: $unit did not restart" >&2
    done
    if [ "$BILLING_ON" = "yes" ]; then
      systemctl reset-failed "$BILLING_UNIT" 2>/dev/null || true
      systemctl restart "$BILLING_UNIT" || echo "[deploy] ROLLBACK: $BILLING_UNIT did not restart" >&2
    fi
    # THIS CHECK IS THE LOAD-BEARING LINE, NOT THE reset-failed ABOVE. The
    # reset makes the restart possible; the check makes the report honest. On
    # 2026-09-16 the old build was intact, the restart was refused, and this
    # script said "rolled back" -- an ACTION, not an OUTCOME -- over a 502.
    # Remove this check and that failure returns, silently. Say what is true.
    if curl -fsS --max-time 10 http://127.0.0.1/api/health >/dev/null 2>&1; then
      echo "[deploy] rolled back to $(basename "$PREVIOUS"); dashboard answering." >&2
    else
      echo "[deploy] ROLLBACK FAILED: the dashboard is NOT answering on $(basename "$PREVIOUS")." >&2
      echo "[deploy] THIS IS AN OUTAGE. Check: systemctl status ${RUNTIME_UNITS[*]}" >&2
      journalctl -u mointel-web -n 20 --no-pager >&2 || true
    fi
    echo "[deploy] The schema was already migrated: if this" >&2
    echo "[deploy] release changed it, restore a backup from" >&2
    echo "[deploy] /var/lib/mointel/backups before trusting the old code." >&2
  fi
  exit 1
fi

curl -fsS --max-time 5 http://127.0.0.1/api/health || true
echo

# ---------------------------------------------------------------- retention ---

# Retention. The decision lives in prune.sh so it can be exercised without
# deploying; the active release, every pinned release, and the release any
# RUNNING UNIT is executing are never candidates. That last rule exists
# because RESTART_MARKET=no deliberately leaves a unit on an older release.
KEEP_RELEASES="$KEEP_RELEASES" RELEASES="$RELEASES"   bash "$RELEASE/deploy/aws/prune.sh" "$(basename "$(readlink -f "$CURRENT")")" || true

bash "$RELEASE/deploy/aws/pins.sh" check || log "WARNING: a pinned release or its backup is missing"
log "pins:"
bash "$RELEASE/deploy/aws/pins.sh" list | sed 's/^/[deploy]   /'

log "deployed $SHA"
