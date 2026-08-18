#!/usr/bin/env bash
#
# Puts a password in front of the desk.
#
#   deploy/aws/setup-auth.sh <host> <ssh-key> [username] [credential-file]
#
# Run from the development machine. Generates a strong random password, installs
# it as an Nginx Basic Auth user on the server, and writes the login to a file
# OUTSIDE the repository — by default A:/AWS_creds/mointel_web_access.txt.
#
# The password is never printed. It is generated on the server, so it does not
# pass through a local shell history or a command line; only the credential file
# and the server's htpasswd hash ever hold it.
#
# On localhost the desk was private because nothing else could reach it. On a
# public IP that is no longer true, and an unauthenticated trading dashboard on
# the open internet is not a prototype, it is a liability.
#
set -euo pipefail

HOST="${1:-}"
KEY="${2:-}"
USERNAME="${3:-adam}"
CREDENTIAL_FILE="${4:-/a/AWS_creds/mointel_web_access.txt}"

if [ -z "$HOST" ] || [ -z "$KEY" ]; then
  echo "usage: setup-auth.sh <host> <ssh-key> [username] [credential-file]" >&2
  exit 2
fi

case "$CREDENTIAL_FILE" in
  */mointel/*) echo "refusing to write credentials inside the repository" >&2; exit 1 ;;
esac

mkdir -p "$(dirname "$CREDENTIAL_FILE")"

# Generated and hashed on the server; the plaintext comes back over the same
# encrypted channel exactly once, straight into the credential file.
PASSWORD="$(ssh -i "$KEY" -o StrictHostKeyChecking=no "ubuntu@$HOST" '
  set -euo pipefail
  password="$(openssl rand -base64 24 | tr -d "\n/+=" | cut -c1-28)"
  printf "%s" "$password" | sudo htpasswd -i -c /etc/nginx/mointel.htpasswd "'"$USERNAME"'" >/dev/null 2>&1
  sudo chown root:www-data /etc/nginx/mointel.htpasswd
  sudo chmod 0640 /etc/nginx/mointel.htpasswd
  printf "%s" "$password"
')"

umask 077
cat > "$CREDENTIAL_FILE" <<EOF
Momentum Intelligence Trading Desk — web access
Generated $(date -u +"%Y-%m-%dT%H:%M:%SZ") by deploy/aws/setup-auth.sh

Username: $USERNAME
Password: $PASSWORD

Authentication is Nginx HTTP Basic Auth on the origin, which means it covers
the dashboard and every API route alike, including the Focus POST actions. The
browser sends it on every request; nothing is embedded in client JavaScript.

To change it:
  ssh -i <key> ubuntu@$HOST
  sudo htpasswd /etc/nginx/mointel.htpasswd $USERNAME
  sudo systemctl reload nginx
...then update this file.

This file is deliberately outside the repository. Do not commit it.
EOF

chmod 600 "$CREDENTIAL_FILE"

echo "[auth] Basic Auth user '$USERNAME' installed on $HOST"
echo "[auth] login written to $CREDENTIAL_FILE"
