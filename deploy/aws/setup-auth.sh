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
# Adding a login leaves the others alone. `htpasswd -c` rewrites the file from
# scratch, so it is used only when there is no htpasswd file yet; on every later
# run the user is added, or its password replaced, in place. Two logins is a
# normal state for this desk — one per person, or a new one standing up while
# the old one still works — and a script that quietly deletes the one you were
# not testing is a bad way to find out.
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
  if [ -f /etc/nginx/mointel.htpasswd ]; then
    printf "%s" "$password" | sudo htpasswd -i /etc/nginx/mointel.htpasswd "'"$USERNAME"'" >/dev/null 2>&1
  else
    printf "%s" "$password" | sudo htpasswd -i -c /etc/nginx/mointel.htpasswd "'"$USERNAME"'" >/dev/null 2>&1
  fi
  sudo chown root:www-data /etc/nginx/mointel.htpasswd
  sudo chmod 0640 /etc/nginx/mointel.htpasswd
  printf "%s" "$password"
')"

# What the desk actually accepts after this run. Without the list the credential
# file reads as though its one login is the only one, which is the assumption
# that gets the other one deleted.
LOGINS="$(ssh -i "$KEY" -o StrictHostKeyChecking=no "ubuntu@$HOST" \
  'sudo cut -d: -f1 /etc/nginx/mointel.htpasswd | sort | tr "\n" " "')"

umask 077

# This file is rewritten whole, so a run for a second user would otherwise throw
# away the first user's password — the same deletion as -c, one layer up.
if [ -f "$CREDENTIAL_FILE" ]; then
  cp "$CREDENTIAL_FILE" "$CREDENTIAL_FILE.previous"
fi

cat > "$CREDENTIAL_FILE" <<EOF
Momentum Intelligence Trading Desk — web access
Generated $(date -u +"%Y-%m-%dT%H:%M:%SZ") by deploy/aws/setup-auth.sh

Username: $USERNAME
Password: $PASSWORD

Logins the desk accepts: $LOGINS
Only the password above is recorded here. Any other login listed was set on a
different run; this run neither changed it nor knows it. The previous contents
of this file, if there were any, are in $(basename "$CREDENTIAL_FILE").previous

Authentication is Nginx HTTP Basic Auth on the origin, which means it covers
the dashboard and every API route alike, including the Focus POST actions. The
browser sends it on every request; nothing is embedded in client JavaScript.

To change this login, or add another:
  ssh -i <key> ubuntu@$HOST
  sudo htpasswd /etc/nginx/mointel.htpasswd <username>
...then update this file. Do not pass -c: it rewrites the file from scratch and
every other login goes with it.

To remove a login:
  ssh -i <key> ubuntu@$HOST
  sudo htpasswd -D /etc/nginx/mointel.htpasswd <username>

Nginx re-reads the htpasswd file per request, so none of this needs a reload.

This file is deliberately outside the repository. Do not commit it.
EOF

chmod 600 "$CREDENTIAL_FILE"

echo "[auth] Basic Auth user '$USERNAME' installed on $HOST"
echo "[auth] logins now accepted: $LOGINS"
echo "[auth] login written to $CREDENTIAL_FILE"
