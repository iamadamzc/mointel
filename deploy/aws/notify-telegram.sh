#!/usr/bin/env bash
#
# The watchdog's notifier: posts one alert to his existing Telegram bot.
#
#   notify-telegram.sh "ALERT mointel-market is inactive"
#
# Reads TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from the box env file. They are
# his to put there (he copies them into .env.local and sync-env.sh ships them);
# nothing here holds, prints or logs either value.
#
# THE TOKEN NEVER APPEARS IN A PROCESS LIST. curl is given its URL and form
# fields on STDIN through `--config -`, written by the shell's printf builtin,
# so `ps` shows `curl -s ... --config -` and nothing else. The token is not in
# an argument, not in a file this script writes, and not in any output: curl
# runs silent, the body goes to /dev/null, and only the HTTP status is kept.
#
# EXIT CODES, all of which the watchdog logs and none of which fails its tick:
#   0 sent (Telegram answered 200)   4 not configured   1 send failed
# A send that fails says only the HTTP status (000 = no answer), never a URL.
#
# The text is first folded onto one line (a newline would start a new config line
# and could inject an option), then reduced to a safe alphabet before it is placed
# in curl's config quoting; the watchdog's own alerts (unit names, numbers) survive intact.
#
# Overrides, for the suite: WATCHDOG_ENV_FILE, TELEGRAM_API_BASE.
set -uo pipefail

ENV_FILE="${WATCHDOG_ENV_FILE:-/etc/mointel/mointel.env}"
API_BASE="${TELEGRAM_API_BASE:-https://api.telegram.org}"

read_key() {
  [ -r "$ENV_FILE" ] || return 0
  sed -n "s/^$1=//p" "$ENV_FILE" | head -n 1 | tr -d "\"' "
}

TOKEN="$(read_key TELEGRAM_BOT_TOKEN)"
CHAT="$(read_key TELEGRAM_CHAT_ID)"
if [ -z "$TOKEN" ] || [ -z "$CHAT" ]; then
  echo "telegram notifier not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set on the box); alert is in the journal only" >&2
  exit 4
fi

TEXT="$(printf '%s' "${1:-}" | tr -s '[:space:]' ' ' | sed 's/[^A-Za-z0-9 .:,()/_=%+-]//g' | cut -c1-900)"
[ -n "$TEXT" ] || TEXT="alert (no text)"

STATUS="$(
  printf '%s\n' \
    "url = \"$API_BASE/bot$TOKEN/sendMessage\"" \
    "data-urlencode = \"chat_id=$CHAT\"" \
    "data-urlencode = \"text=mointel: $TEXT\"" \
    "data-urlencode = \"disable_web_page_preview=true\"" \
  | curl -s -m 15 --config - -o /dev/null -w '%{http_code}' 2>/dev/null
)"

if [ "$STATUS" = "200" ]; then
  exit 0
fi
echo "telegram send failed (http ${STATUS:-000})" >&2
exit 1
