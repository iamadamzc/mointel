# Creates (or refreshes) the "Momentum Desk" shortcut on the Desktop.
# Run once: powershell -ExecutionPolicy Bypass -File scripts\install-shortcut.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Launcher = Join-Path $PSScriptRoot 'start-desk.ps1'
$Icon = Join-Path $PSScriptRoot 'momentum-desk.ico'

if (-not (Test-Path $Icon)) {
    Write-Host 'Building the icon...' -ForegroundColor Gray
    & node (Join-Path $PSScriptRoot 'make-icon.mjs')
}

$desktop = [Environment]::GetFolderPath('Desktop')
$linkPath = Join-Path $desktop 'Momentum Desk.lnk'

$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut($linkPath)
$link.TargetPath = (Get-Command powershell.exe).Source
$link.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Launcher`""
$link.WorkingDirectory = $Root
$link.IconLocation = "$Icon,0"
$link.Description = 'Start the Momentum Intelligence trading desk (dashboard + Alpaca SIP worker)'
$link.WindowStyle = 7  # launcher itself stays minimized; the desk window is what shows
$link.Save()

Write-Host "Shortcut created: $linkPath" -ForegroundColor Green
