<#
.SYNOPSIS
  Creates a temporary read-only review link against the live AWS desk.

.DESCRIPTION
  The capability has to exist in the production store, not in the local Windows
  one — a token minted here would verify against a database the server has never
  seen. So this runs the real command on the server over SSH and brings back the
  URL it printed.

  The token is shown once, in this terminal, because you asked for it. It is not
  stored anywhere recoverable: the server keeps only a SHA-256 of it. Nothing is
  written to a file, and nothing is written to git.

.PARAMETER Hours
  How long the link should work. Defaults to 24.

.PARAMETER Label
  A note for `review:list`, e.g. "chatgpt". Optional.

.EXAMPLE
  .\scripts\aws-create-review.ps1
  .\scripts\aws-create-review.ps1 -Hours 48 -Label chatgpt

.EXAMPLE
  # List and revoke
  .\scripts\aws-create-review.ps1 -Action list
  .\scripts\aws-create-review.ps1 -Action revoke -Id 3
  .\scripts\aws-create-review.ps1 -Action revoke-all
#>
[CmdletBinding()]
param(
  [ValidateSet('create', 'list', 'revoke', 'revoke-all')]
  [string]$Action = 'create',

  [int]$Hours = 24,
  [string]$Label = '',
  [int]$Id = 0,

  [string]$ServerHost = '98.85.49.227',
  [string]$KeyPath = 'A:\AWS_creds\mointel-prod-key.pem',
  [string]$PublicUrl = 'https://dwwep02jje2ag.cloudfront.net'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $KeyPath)) {
  throw "SSH key not found at $KeyPath"
}

# ssh is not always on PowerShell's PATH even where it is installed: Windows
# ships OpenSSH under System32 and Git for Windows carries its own, and
# neither is guaranteed to resolve by name from a PowerShell session.
$ssh = (Get-Command ssh -ErrorAction SilentlyContinue).Source
if (-not $ssh) {
  $ssh = @(
    (Join-Path $env:WINDIR 'System32\OpenSSH\ssh.exe'),
    'C:\Program Files\Git\usr\bin\ssh.exe'
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $ssh) {
  throw 'No ssh client found. Install Windows OpenSSH, or run this from Git Bash.'
}

# Built on the server side so the operator command is exactly the documented one.
$npmArgs = switch ($Action) {
  'create'     { $extra = "-- --hours $Hours"; if ($Label) { $extra += " --label $Label" }; "review:create $extra" }
  'list'       { 'review:list' }
  'revoke'     { if ($Id -le 0) { throw 'Specify -Id when revoking a single session.' }; "review:revoke -- $Id" }
  'revoke-all' { 'review:revoke-all' }
}

# MOINTEL_PUBLIC_URL only affects the URL the command prints; the capability
# itself is host-independent.
$remote = @(
  'sudo -u mointel env -C /opt/mointel/current',
  'MARKET_DB_PATH=/var/lib/mointel/market.db',
  "MOINTEL_PUBLIC_URL=$PublicUrl",
  "npm run --silent $npmArgs"
) -join ' '

Write-Host "[review] $Action on $ServerHost" -ForegroundColor DarkGray

& $ssh -o StrictHostKeyChecking=no -i $KeyPath "ubuntu@$ServerHost" $remote

if ($LASTEXITCODE -ne 0) {
  throw "The remote command failed with exit code $LASTEXITCODE"
}
