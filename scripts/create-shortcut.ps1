# Tao shortcut "DriveSync" tren Desktop, tro toi launcher.vbs, dung icon rieng.
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$lnk = Join-Path $desktop 'DriveSync.lnk'
$vbs = Join-Path $repo 'scripts\launcher.vbs'
$icon = Join-Path $repo 'build\icon.ico'

$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($lnk)
$sc.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$sc.Arguments = '"' + $vbs + '"'
$sc.WorkingDirectory = $repo
if (Test-Path $icon) { $sc.IconLocation = "$icon,0" }
$sc.Description = 'DriveSync - quan ly du an va code voi DVC + Google Drive'
$sc.Save()

Write-Host "Da tao shortcut tren Desktop: $lnk"
