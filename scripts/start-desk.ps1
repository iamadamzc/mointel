# Momentum Intelligence Trading Desk — one-click launcher.
#
# Opens ONE window running the desk supervisor, which starts the dashboard, the
# Alpaca SIP worker and the automatic research worker, and stops all three when
# the window is closed. The application is that window: close it and the desk is
# off, open it and the desk is on.
#
# This script deliberately does almost nothing. Everything that matters —
# single-instance checking, orphan cleanup, restarting a crashed service,
# opening the browser — lives in scripts/desk.mjs, so it behaves identically
# whether it was started from this icon or from `npm run desk` in a terminal.

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

# Windows Terminal if it is available, a plain console otherwise. Both keep the
# window open for as long as the desk runs, which is the point: the window IS
# the application's lifetime.
$wt = Get-Command wt.exe -ErrorAction SilentlyContinue

if ($wt) {
    # The title must be a single token. Start-Process's quoting of an argument
    # containing a space does not survive Windows Terminal's own re-parse, which
    # then treats the second word as the command and the window dies silently.
    Start-Process -FilePath $wt.Source -WorkingDirectory $Root -ArgumentList @(
        'new-tab', '--title', 'Momentum-Desk',
        'cmd', '/c', 'npm run desk'
    )
} else {
    Start-Process -FilePath 'cmd.exe' -WorkingDirectory $Root -ArgumentList @(
        '/c', 'npm run desk'
    )
}
