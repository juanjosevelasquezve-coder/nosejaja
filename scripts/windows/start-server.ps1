$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

function Import-DotEnvIfPresent {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return }
  foreach ($rawLine in (Get-Content -Path $Path -ErrorAction SilentlyContinue)) {
    $line = [string]$rawLine
    if (-not $line) { continue }
    $line = $line.Trim()
    if (-not $line -or $line.StartsWith('#')) { continue }
    $idx = $line.IndexOf('=')
    if ($idx -le 0) { continue }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1)
    if (-not $key) { continue }
    if (Test-Path "Env:$key") { continue }
    if ($val.Length -ge 2) {
      if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
        $val = $val.Substring(1, $val.Length - 2)
      }
    }
    Set-Item -Path "Env:$key" -Value $val | Out-Null
  }
}

Import-DotEnvIfPresent -Path (Join-Path $projectRoot '.env')

$port = 3000
if ($env:PORT) {
  try { $port = [int]$env:PORT } catch { }
}

try {
  $existing = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($existing) { exit 0 }
} catch {
  # If Get-NetTCPConnection isn't available, continue and try to start anyway.
}

New-Item -ItemType Directory -Force -Path (Join-Path $projectRoot 'logs') | Out-Null
$logPath = Join-Path $projectRoot 'logs\server.log'

Set-Location -Path $projectRoot

$npm = if ($env:NPM_CMD) { $env:NPM_CMD } else { 'C:\Program Files\nodejs\npm.cmd' }
if (-not (Test-Path $npm)) {
  $cmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($cmd) { $npm = $cmd.Path }
}
$cmd = "`"$npm`" start >> `"$logPath`" 2>&1"
& cmd.exe /c $cmd
exit $LASTEXITCODE
