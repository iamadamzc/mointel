#!/usr/bin/env bash
#
# Gives the instance a directly-reachable HTTPS hostname on its own static IP.
#
#   sudo bash deploy/aws/setup-tls.sh [domain]
#
# Run once, on the server. Defaults to the sslip.io name for whatever public
# address the instance currently has.
#
# Why this exists: the CloudFront distribution is not reachable from every
# client, and a review link that some fetchers cannot complete is not a review
# link. sslip.io resolves <dashed-ip>.sslip.io straight back to that IP, so the
# certificate is an ordinary publicly-trusted one for a real DNS name — no
# self-signed certificate, no second application, no proxy in the middle.
#
# It is additive. The :80 server that CloudFront uses is untouched, and both
# listeners include the same location file, so the auth rules cannot drift
# between them.
#
set -euo pipefail

log()  { echo "[tls] $*"; }
fail() { echo "[tls] FAILED: $*" >&2; exit 1; }

IP="$(curl -fsS --max-time 15 https://checkip.amazonaws.com | tr -d '[:space:]')"
[ -n "$IP" ] || fail "could not determine this instance's public address"

DOMAIN="${1:-$(echo "$IP" | tr '.' '-').sslip.io}"
log "public address : $IP"
log "hostname       : $DOMAIN"

# The name must already point here, or the ACME HTTP-01 challenge cannot
# succeed and certbot will fail in a much less obvious way.
RESOLVED="$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)"
[ "$RESOLVED" = "$IP" ] || fail "$DOMAIN resolves to '${RESOLVED:-nothing}', not $IP"
log "dns            : $DOMAIN -> $RESOLVED"

export DEBIAN_FRONTEND=noninteractive
if ! command -v certbot >/dev/null 2>&1; then
  log "installing certbot"
  apt-get update -y
  apt-get install -y --no-install-recommends certbot
fi

# The webroot the shared location block serves ACME challenges from.
install -d -m 0755 /var/www/certbot

nginx -t || fail "nginx configuration is invalid before we started"
systemctl reload nginx

# --webroot, not --nginx. The nginx plugin rewrites the server blocks and will
# happily add an HTTP->HTTPS redirect, which would break the CloudFront origin:
# the distribution reaches this box over http-only and a 301 is not an origin
# response. This way certbot never touches the configuration at all.
log "requesting a certificate"
certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --non-interactive --agree-tos --register-unsafely-without-email \
  --keep-until-expiring \
  || fail "certbot could not obtain a certificate for $DOMAIN"

CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
[ -f "$CERT" ] || fail "certbot reported success but $CERT does not exist"
log "certificate    : $CERT"

# Recorded so deploy.sh can re-render the TLS site on every release without
# being told the hostname again.
echo "$DOMAIN" > /etc/mointel/tls-domain
chmod 0644 /etc/mointel/tls-domain

RELEASE="$(readlink -f /opt/mointel/current)"
TLS_NAMES="$DOMAIN"
[ -f /etc/mointel/tls-extra-names ] && TLS_NAMES="$DOMAIN $(tr '\n' ' ' < /etc/mointel/tls-extra-names)"
log "server_name    : $TLS_NAMES"
sed -e "s|__DOMAIN__|$DOMAIN|g" -e "s|__SERVER_NAMES__|$TLS_NAMES|g" \
  "$RELEASE/deploy/aws/nginx-tls.conf" > /etc/nginx/sites-available/mointel-tls
ln -sfn /etc/nginx/sites-available/mointel-tls /etc/nginx/sites-enabled/mointel-tls

nginx -t || fail "the TLS server block is invalid"
systemctl reload nginx

# Renewal reloads nginx rather than restarting it, so a certificate rotation
# never drops a request.
install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'HOOK'
#!/usr/bin/env bash
systemctl reload nginx
HOOK
chmod 0755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

log "renewal timer  : $(systemctl is-enabled certbot.timer 2>/dev/null || echo 'not enabled')"
log "done — https://$DOMAIN/ is live"
