#!/usr/bin/env bash
#
# One runner-alert tick, run every minute by mointel-runner-alert.timer on the box.
#
# His ruling 2026-10-06T15:48:13Z (via Integration 32nd): "yes build the 100%
# runner alert. but make it $1-$10 and at 125, 150, 200, 250, 300, 350, 400,
# 500, 600, 700, 800, 900, 1000." Volume floor 500,000 shares today (his yes to
# Integration's recommendation). Separate from the app: no app code, no app
# restart, no resident process; it reads the store with the sqlite3 CLI.
#
# THE RULE. On a weekday, 04:00-20:00 ET, for today's trading date: a name whose
# band price is inside [RUNNER_BAND_MIN, RUNNER_BAND_MAX], with at least
# RUNNER_MIN_VOLUME shares today, up at least one level from its baseline, and
# not marked discovery_eligible = 0 (as readTopMovers excludes it). ONE alert
# per name per level per day; a jump across several levels in one minute sends
# one message naming the highest crossed.
#
# TWO SETTINGS (put to him; the timer stays disabled until he answers):
#   RUNNER_BASELINE  prior   % = price / previous_close - 1 all day, after hours
#                            included (previous_close is the prior session's
#                            close and does not move when the stored % flips to
#                            today's close after the bell)
#                    stored  the stored percent_change as it is (from today's
#                            close once the basis flips to CURRENT_SESSION)
#   RUNNER_BAND_ON   prior   the $1-$10 band applies to the prior close, so a
#                            $1.50 name running to $15 keeps alerting
#                    current the band applies to the current price
#
# STORE LIMIT: the market worker admits a name only when its first bar is inside
# the capture band ($0.25-$50); once admitted it keeps updating past $50. A name
# whose FIRST print of the day is above $50 is never in the store, so a sub-$10
# close that opens above $50 (+400% or more before its first recorded bar) would
# be missed.
#
# READ-ONLY on market.db (WAL mode, so a reader never blocks the writer). One
# query on ticker_session for today's trading_date (idx_ticker_session_rank,
# trading_date=?), measured on the box before the timer is enabled.
#
# The notifier is pluggable as in watchdog.sh; its character whitelist keeps
# letters, digits and ". : , ( ) / _ = % + -", so the message has no dollar sign.
#
# Environment overrides exist so the suite can drive every branch against stubs:
# RUNNER_STATE_DIR, RUNNER_DB, RUNNER_SQLITE, RUNNER_NOTIFIER, RUNNER_CLOCK
# ("ISO-weekday HHMM YYYY-MM-DD" in ET; Git Bash on Windows answers
# TZ=America/New_York in UTC, so the suite never relies on it), and the
# settings and thresholds named below.
set -uo pipefail

STATE_DIR="${RUNNER_STATE_DIR:-/var/lib/mointel-runner-alert}"
DB="${RUNNER_DB:-/var/lib/mointel/market.db}"
SQLITE="${RUNNER_SQLITE:-sqlite3}"
NOTIFIER="${RUNNER_NOTIFIER:-/opt/mointel/current/deploy/aws/notify-telegram.sh}"
BASELINE="${RUNNER_BASELINE:-prior}"
BAND_ON="${RUNNER_BAND_ON:-prior}"
BAND_MIN="${RUNNER_BAND_MIN:-1}"
BAND_MAX="${RUNNER_BAND_MAX:-10}"
MIN_VOLUME="${RUNNER_MIN_VOLUME:-500000}"
LEVELS="${RUNNER_LEVELS:-125 150 200 250 300 350 400 500 600 700 800 900 1000}"
CLOCK="${RUNNER_CLOCK:-$(TZ=America/New_York date '+%u %H%M %F')}"

say() { logger -t mointel-runner-alert -p "daemon.$1" -- "$2" 2>/dev/null || echo "[runner-alert] $2"; }

read -r DOW HHMM TODAY <<<"$CLOCK"
[ "$DOW" -le 5 ] || exit 0
MINUTE_OF_DAY=$((10#$HHMM))
if [ "$MINUTE_OF_DAY" -lt 400 ] || [ "$MINUTE_OF_DAY" -ge 2000 ]; then exit 0; fi

case "$BASELINE" in prior|stored) ;; *) say warning "RUNNER_BASELINE '$BASELINE' is not prior or stored; nothing checked"; exit 0 ;; esac
case "$BAND_ON" in prior|current) ;; *) say warning "RUNNER_BAND_ON '$BAND_ON' is not prior or current; nothing checked"; exit 0 ;; esac

mkdir -p "$STATE_DIR"
FIRED="$STATE_DIR/fired-$TODAY"
touch "$FIRED"
find "$STATE_DIR" -maxdepth 1 -name 'fired-*' -mtime +7 -delete 2>/dev/null || true

LOWEST="${LEVELS%% *}"
# A cheap prefilter in SQL (either baseline at or above the lowest level); the
# rule itself is applied below, where the suite can see it.
FACTOR=$(awk -v l="$LOWEST" 'BEGIN { printf "%.6f", 1 + l / 100 }')
SQL="SELECT ts.symbol, ts.price, ts.previous_close, ifnull(ts.percent_change, ''), ifnull(ts.cumulative_volume, 0)
       FROM ticker_session ts
      WHERE ts.trading_date = '$TODAY'
        AND ts.price IS NOT NULL
        AND ts.previous_close > 0
        AND ts.cumulative_volume >= $MIN_VOLUME
        AND (ts.price >= ts.previous_close * $FACTOR OR ts.percent_change >= $LOWEST)
        AND NOT EXISTS (SELECT 1 FROM universe u WHERE u.symbol = ts.symbol AND u.discovery_eligible = 0);"

if ! ROWS=$("$SQLITE" -readonly -cmd '.timeout 3000' -separator '|' "$DB" "$SQL" 2>&1); then
  say warning "could not read the store: $(printf '%s' "$ROWS" | head -c 200)"
  exit 0
fi

notify() {
  say info "$1"
  if [ -f "$NOTIFIER" ]; then
    bash "$NOTIFIER" "$1" >/dev/null 2>&1 || say warning "notifier failed (exit $?); the alert is in the journal only"
  fi
}

while IFS='|' read -r SYM PRICE PREV STORED VOL; do
  [ -n "${SYM:-}" ] || continue
  # Every decision in one awk call: prints "LEVEL PCT" for an alert-worthy row, nothing otherwise.
  DECISION=$(awk -v price="$PRICE" -v prev="$PREV" -v stored="$STORED" -v vol="$VOL" \
    -v baseline="$BASELINE" -v bandon="$BAND_ON" -v bmin="$BAND_MIN" -v bmax="$BAND_MAX" \
    -v minvol="$MIN_VOLUME" -v levels="$LEVELS" 'BEGIN {
      if (price == "" || prev == "" || prev + 0 <= 0) exit
      if (vol + 0 < minvol + 0) exit
      band = (bandon == "current") ? price + 0 : prev + 0
      if (band < bmin + 0 || band > bmax + 0) exit
      if (baseline == "stored") { if (stored == "") exit; pct = stored + 0 } else { pct = (price / prev - 1) * 100 }
      n = split(levels, L, " ")
      hit = 0
      for (i = 1; i <= n; i++) if (pct + 1e-9 >= L[i] + 0) hit = L[i] + 0
      if (hit > 0) printf "%d %.0f\n", hit, pct
    }')
  [ -n "$DECISION" ] || continue
  read -r LEVEL PCT <<<"$DECISION"
  LAST=$(awk -v s="$SYM" '$1 == s && $2 + 0 > m { m = $2 + 0 } END { print m + 0 }' "$FIRED")
  [ "$LEVEL" -gt "$LAST" ] || continue

  PRICE_FMT=$(awk -v p="$PRICE" 'BEGIN { printf "%.2f", p }')
  PREV_FMT=$(awk -v p="$PREV" 'BEGIN { printf "%.2f", p }')
  VOL_FMT=$(awk -v v="$VOL" 'BEGIN { s = sprintf("%d", v); o = ""; while (length(s) > 3) { o = "," substr(s, length(s) - 2) o; s = substr(s, 1, length(s) - 3) } print s o }')
  if [ "$BASELINE" = "prior" ]; then BASIS="from prior close $PREV_FMT"; else BASIS="stored change, prior close $PREV_FMT"; fi
  notify "RUNNER $SYM +${LEVEL}% (now +${PCT}%) at $PRICE_FMT, vol $VOL_FMT, ${HHMM:0:2}:${HHMM:2:2} ET, $BASIS"
  echo "$SYM $LEVEL" >> "$FIRED"
done <<<"$ROWS"

exit 0
