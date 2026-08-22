# Momentum Intelligence Trading Desk — one-click launcher.
#
# DEFAULT: opens the PRODUCTION desk in your browser. That is what the Desktop
# icon does, and it is safe to double-click at any time.
#
# The desk has run on AWS since 2026-08-17. Production owns the Alpaca SIP
# connection, and Alpaca permits exactly ONE concurrent SIP connection per
# account — a second one does not error, it silently kills the live one. So an
# icon that started a local desk was an icon that took production down by
# habit. It no longer does.
#
# Running a local desk is still supported, but it is now a deliberate act:
#
#     powershell -ExecutionPolicy Bypass -File scripts\start-desk.ps1 -Local
#
# Use -Local only when production is stopped, or outside market hours when
# nothing is streaming. See docs/OPERATIONS.md and docs/threads/ops.md.

[CmdletBinding()]
param(
    # Run the full local desk instead of opening production. Takes the SIP
    # connection. Do not use while the server is streaming.
    [switch]$Local,

    # The production desk. Override if the distribution URL changes.
    [string]$Url = 'https://dwwep02jje2ag.cloudfront.net/'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

if (-not $Local) {
    Start-Process $Url
    exit 0
}

# ------------------------------------------------------------------ local ---
#
# Opens ONE window running the desk supervisor, which starts the dashboard, the
# Alpaca SIP worker and the automatic research worker, and stops all three when
# the window is closed. The application is that window: close it and the desk is
# off, open it and the desk is on.
#
# This branch deliberately does almost nothing. Everything that matters —
# single-instance checking, orphan cleanup, restarting a crashed service,
# opening the browser — lives in scripts/desk.mjs, so it behaves identically
# whether it was started from here or from `npm run desk` in a terminal.

Write-Host ''
Write-Host '  LOCAL DESK — this takes the Alpaca SIP connection.' -ForegroundColor Yellow
Write-Host '  If the AWS desk is streaming, this will silently kill it.' -ForegroundColor Yellow
Write-Host ''

# Windows Terminal if it is available, a plain console otherwise. Both keep the
# window open for as long as the desk runs, which is the point: the window IS
# the application's lifetime.
$wt = Get-Command wt.exe -ErrorAction SilentlyContinue

if ($wt) {
    # The title must be a single token. Start-Process's quoting of an argument
    # containing a space does not survive Windows Terminal's own re-parse, which
    # then treats the second word as the command and the window dies silently.
    #
    # -d is not optional. new-tab ignores the working directory it was launched
    # from and uses the profile's startingDirectory, so without this the desk
    # starts in whatever folder the user's terminal profile points at and npm
    # fails on a missing package.json.
    Start-Process -FilePath $wt.Source -WorkingDirectory $Root -ArgumentList @(
        'new-tab', '--title', 'Momentum-Desk', '-d', $Root,
        'cmd', '/c', 'npm run desk'
    )
} else {
    Start-Process -FilePath 'cmd.exe' -WorkingDirectory $Root -ArgumentList @(
        '/c', 'npm run desk'
    )
}
