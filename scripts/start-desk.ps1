# Momentum Intelligence Trading Desk — one-click launcher.
#
# Opens the dashboard, the Alpaca SIP worker and the automatic research worker
# as three panes of a single Windows Terminal window, then opens the dashboard
# in the browser once it answers. Safe to run twice: anything already running is
# left alone.
#
# All three panes matter. The desk previously launched only the first two, so
# the research engine had to be started by hand and normal use left it off.
#
# Alpaca permits ONE concurrent SIP connection per account, so starting a
# second worker would kill the live one. The guard below is not cosmetic.

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Url = 'http://localhost:3000'
$Port = 3000

function Test-DevServer {
    $client = New-Object Net.Sockets.TcpClient
    try {
        $client.Connect('127.0.0.1', $Port)
        return $true
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Test-Process([string]$Pattern) {
    $procs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
    foreach ($p in $procs) {
        if ($p.CommandLine -and $p.CommandLine -match $Pattern) { return $true }
    }
    return $false
}

$devUp = Test-DevServer
$workerUp = Test-Process 'worker[\\/]alpaca\.ts'
$researchUp = Test-Process 'worker[\\/]research\.ts'

if ($devUp -and $workerUp -and $researchUp) {
    Write-Host 'Desk already running — opening the dashboard.' -ForegroundColor Green
    Start-Process $Url
    Start-Sleep -Seconds 1
    exit 0
}

# Each pane keeps its shell open (-NoExit) so logs stay readable and Ctrl+C
# stops just that half of the desk. Both panes run scripts/pane.ps1, which sets
# its own working directory — see the comment there for why the commands are not
# inlined into Windows Terminal arguments.
$Pane = Join-Path $PSScriptRoot 'pane.ps1'

# Titles must be a single token. Start-Process's quoting of an argument
# containing a space does not survive Windows Terminal's own re-parse, which
# then treats the second word as the command to run and the pane dies silently.
$wtArgs = @()
if (-not $devUp) {
    $wtArgs += @('new-tab', '--title', 'Momentum-Desk',
        'powershell', '-NoProfile', '-NoExit', '-File', $Pane, 'dev')
} else {
    Write-Host 'Dashboard already on port 3000 — leaving it alone.' -ForegroundColor Yellow
}

if (-not $workerUp) {
    $worker = @('powershell', '-NoProfile', '-NoExit', '-File', $Pane, 'worker')
    if ($wtArgs.Count -gt 0) {
        # ';' must be its own argv token for Windows Terminal to see it.
        $wtArgs += @(';', 'split-pane', '-V') + $worker
    } else {
        $wtArgs += @('new-tab', '--title', 'Momentum-Desk') + $worker
    }
} else {
    Write-Host 'Alpaca worker already streaming — leaving it alone.' -ForegroundColor Yellow
}

if (-not $researchUp) {
    $research = @('powershell', '-NoProfile', '-NoExit', '-File', $Pane, 'research')
    if ($wtArgs.Count -gt 0) {
        # Split horizontally so the research log sits under the market feed.
        $wtArgs += @(';', 'split-pane', '-H') + $research
    } else {
        $wtArgs += @('new-tab', '--title', 'Momentum-Desk') + $research
    }
} else {
    Write-Host 'Research worker already running — leaving it alone.' -ForegroundColor Yellow
}

$wt = Get-Command wt.exe -ErrorAction SilentlyContinue
if ($wt) {
    Start-Process -FilePath $wt.Source -ArgumentList $wtArgs
} else {
    # No Windows Terminal: fall back to plain console windows.
    if (-not $devUp) {
        Start-Process powershell -WorkingDirectory $Root -ArgumentList @(
            '-NoProfile', '-NoExit', '-File', $Pane, 'dev')
    }
    if (-not $workerUp) {
        Start-Process powershell -WorkingDirectory $Root -ArgumentList @(
            '-NoProfile', '-NoExit', '-File', $Pane, 'worker')
    }
    if (-not $researchUp) {
        Start-Process powershell -WorkingDirectory $Root -ArgumentList @(
            '-NoProfile', '-NoExit', '-File', $Pane, 'research')
    }
}

# Wait for the dashboard to answer before opening the browser, so the icon
# never lands the user on a connection-refused page.
Write-Host 'Waiting for the dashboard...' -ForegroundColor Gray
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) {
            Start-Process $Url
            Write-Host 'Desk is up.' -ForegroundColor Green
            Start-Sleep -Seconds 1
            exit 0
        }
    } catch {
        Start-Sleep -Milliseconds 700
    }
}

Write-Host 'Dashboard did not answer within 90s — check the terminal panes.' -ForegroundColor Red
Start-Sleep -Seconds 5
