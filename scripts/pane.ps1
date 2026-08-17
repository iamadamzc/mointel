# One pane of the Momentum Desk. Launched by start-desk.ps1.
#
# This lives in its own file rather than inline in a Windows Terminal
# `-Command` string for two reasons, both learned the hard way:
#   1. wt splits its command line on every ';' it sees, quoted or not, so an
#      inline "Write-Host ...; npm run dev" gets truncated at the semicolon.
#   2. wt's -d / --startingDirectory is ignored when the user's profile pins a
#      startingDirectory, so the pane cannot be relied on to start in the repo.
# A script file dodges both: wt never parses its contents, and it sets its own
# location relative to itself.

param(
    [Parameter(Mandatory)]
    [ValidateSet('dev', 'worker', 'research')]
    [string]$Task
)

Set-Location (Split-Path -Parent $PSScriptRoot)

switch ($Task) {
    'dev' {
        Write-Host 'DASHBOARD' -ForegroundColor Cyan
        npm run dev
    }
    'worker' {
        Write-Host 'ALPACA SIP WORKER' -ForegroundColor Cyan
        npm run market:alpaca
    }
    'research' {
        # The third pane. Without it the desk runs with its research engine
        # off, and every newly discovered name stays NOT YET ANALYZED.
        Write-Host 'AUTOMATIC RESEARCH WORKER' -ForegroundColor Cyan
        npm run research
    }
}
