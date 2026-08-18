#!/usr/bin/env bash
#
# One-time server preparation for a Momentum Intelligence Trading Desk host.
#
# Runs as root, either as Lightsail user-data at first boot or by hand later.
# It is idempotent: everything it creates is checked for first, so re-running it
# after a change to this file brings an existing host up to date rather than
# breaking it.
#
# It deliberately installs no application code and holds no secrets. Code
# arrives with deploy.sh; secrets arrive with sync-env.sh. Keeping those three
# apart is what lets this script be committed to a public repository.
#
set -euo pipefail

NODE_MAJOR=22          # matches better-sqlite3 11.10's prebuilt ABI — see docs
SERVICE_USER=mointel

log() { echo "[bootstrap] $*"; }

# --------------------------------------------------------------- packages ---

export DEBIAN_FRONTEND=noninteractive

log "updating package index"
apt-get update -y

log "installing base packages"
apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg git rsync \
  nginx apache2-utils \
  sqlite3 \
  build-essential python3 \
  unattended-upgrades

# build-essential and python3 are here because better-sqlite3 falls back to
# compiling from source if no prebuilt binary matches the running Node. Without
# them that fallback fails at `npm ci` with a confusing node-gyp error.

# ------------------------------------------------------------------- node ---

if ! command -v node >/dev/null 2>&1 || \
   [ "$(node --version | cut -d. -f1 | tr -d v)" != "$NODE_MAJOR" ]; then
  log "installing Node ${NODE_MAJOR}.x from NodeSource"
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -y
  apt-get install -y nodejs
fi
log "node $(node --version), npm $(npm --version)"

# ------------------------------------------------------------------- user ---

# A system account with no login shell and no home of its own: it exists to own
# files and run services, and nothing else. The desk must never run as root —
# it executes model output and parses untrusted filings.
if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
  log "creating service user ${SERVICE_USER}"
  useradd --system --create-home --home-dir /var/lib/mointel \
          --shell /usr/sbin/nologin "$SERVICE_USER"
fi

# ------------------------------------------------------------------ layout ---

log "creating file layout"
install -d -m 0755 -o "$SERVICE_USER" -g "$SERVICE_USER" /opt/mointel
install -d -m 0755 -o "$SERVICE_USER" -g "$SERVICE_USER" /opt/mointel/releases
install -d -m 0750 -o "$SERVICE_USER" -g "$SERVICE_USER" /opt/mointel/secrets
install -d -m 0750 -o "$SERVICE_USER" -g "$SERVICE_USER" /var/lib/mointel
install -d -m 0750 -o "$SERVICE_USER" -g "$SERVICE_USER" /var/lib/mointel/backups
install -d -m 0750 -o "$SERVICE_USER" -g "$SERVICE_USER" /var/lib/mointel/staging
install -d -m 0750 -o root -g "$SERVICE_USER" /etc/mointel

# /etc/mointel is root-owned and group-readable by the service account: the
# desk can read its environment file, an ordinary login cannot.

# The deploy user needs to write releases without sudo for every file copy.
usermod -a -G "$SERVICE_USER" ubuntu || true

# ------------------------------------------------------------------ journal ---

# Journald defaults to growing to 10% of the disk. The desk logs a line a
# second at times, so it is capped and time-limited instead: enough history to
# explain a bad session, not enough to fill an 80 GB volume.
log "configuring journald retention"
install -d -m 0755 /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/mointel.conf <<'EOF'
[Journal]
SystemMaxUse=512M
MaxRetentionSec=14day
EOF
systemctl restart systemd-journald || true

# --------------------------------------------------------------------- ssh ---

# Lightsail's Ubuntu image already ships with password authentication off. This
# asserts it rather than assuming it, because the whole firewall story rests on
# key-only SSH.
log "asserting key-only SSH"
install -d -m 0755 /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/60-mointel.conf <<'EOF'
PasswordAuthentication no
PermitRootLogin no
EOF
systemctl reload ssh || systemctl reload sshd || true

# ------------------------------------------------------------------- nginx ---

# The stock default site answers on :80 and would shadow ours.
rm -f /etc/nginx/sites-enabled/default

log "bootstrap complete"
