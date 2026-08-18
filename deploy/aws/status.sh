#!/usr/bin/env bash
#
# The whole desk, in one screen. Run on the server:
#
#   /opt/mointel/current/deploy/aws/status.sh
#
# Installed as /usr/local/bin/mointel-status by deploy/aws/deploy.sh, so it is
# also just `mointel-status`.
#
# It answers the four questions worth asking after a deploy, a reboot, or a
# quiet dashboard: are the services up, is the desk healthy, is the disk filling
# up, and what is running.
#
set -uo pipefail

CURRENT=/opt/mointel/current
DATA=/var/lib/mointel

bold() { printf '\n\033[1m%s\033[0m\n' "$1"; }

bold "release"
if [ -L "$CURRENT" ]; then
  printf '  %s\n' "$(basename "$(readlink -f "$CURRENT")")"
else
  printf '  no current release\n'
fi
printf '  releases on disk: %s\n' "$(ls -1 /opt/mointel/releases 2>/dev/null | tr '\n' ' ')"

bold "services"
systemctl --no-pager --no-legend list-units 'mointel-*' \
  | awk '{printf "  %-24s %-10s %s\n", $1, $3, $4}'

bold "health"
curl -fsS --max-time 10 http://127.0.0.1/api/health 2>/dev/null \
  | python3 -m json.tool 2>/dev/null \
  | sed 's/^/  /' \
  || printf '  the dashboard did not answer\n'

bold "storage"
df -h / | awk 'NR==2 {printf "  disk: %s used of %s (%s), %s free\n", $3, $2, $5, $4}'
printf '  store:   %s\n' "$(du -sh "$DATA/market.db" 2>/dev/null | cut -f1 || echo 'none')"
printf '  wal:     %s\n' "$(du -sh "$DATA/market.db-wal" 2>/dev/null | cut -f1 || echo 'none')"
printf '  backups: %s in %s files\n' \
  "$(du -sh "$DATA/backups" 2>/dev/null | cut -f1 || echo '0')" \
  "$(ls -1 "$DATA/backups" 2>/dev/null | wc -l)"

# 80% of an 80 GB volume is 16 GB free, which is still weeks of headroom at the
# rate minute bars accumulate — but it is the point at which somebody should
# look rather than the point at which it matters.
used=$(df --output=pcent / | tail -1 | tr -dc '0-9')
if [ "${used:-0}" -ge 80 ]; then
  printf '\n  \033[1;33mWARNING\033[0m: disk is %s%% full. Check /var/lib/mointel/backups and journald.\n' "$used"
fi

bold "resources"
free -m | awk 'NR==2 {printf "  memory: %s MB used of %s MB, %s MB available\n", $3, $2, $7}'
printf '  load:   %s\n' "$(cut -d' ' -f1-3 /proc/loadavg)"
printf '\n'
ps -o rss=,comm=,args= -u mointel 2>/dev/null \
  | awk '{rss=$1/1024; cmd=""; for (i=3; i<=NF; i++) cmd=cmd" "$i; printf "  %6.0f MB %s\n", rss, substr(cmd, 1, 70)}' \
  | sort -rn
printf '\n'
