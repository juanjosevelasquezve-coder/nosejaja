$ErrorActionPreference = 'SilentlyContinue'

Start-Sleep -Seconds 12

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

function Get-TunnelUrlFromLog {
  param(
    [string]$LogPath
  )
  if (-not (Test-Path $LogPath)) { return $null }
  $content = Get-Content -Path $LogPath -ErrorAction SilentlyContinue
  if (-not $content) { return $null }
  $matches = $content | Select-String -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches
  if (-not $matches) { return $null }
  $urls = @()
  foreach ($m in $matches) {
    foreach ($hit in $m.Matches) {
      $urls += $hit.Value
    }
  }
  if (-not $urls.Count) { return $null }
  return $urls[-1]
}

$logPath = Join-Path $projectRoot 'logs\cloudflared.log'

Start-Process 'explorer.exe' "http://localhost:$port"

$publicUrl = $null
if ($env:CLOUDFLARED_PUBLIC_URL) {
  $publicUrl = $env:CLOUDFLARED_PUBLIC_URL
} elseif ($env:CLOUDFLARED_HOSTNAME) {
  if ($env:CLOUDFLARED_HOSTNAME -match '^https?://') {
    $publicUrl = $env:CLOUDFLARED_HOSTNAME
  } else {
    $publicUrl = "https://$($env:CLOUDFLARED_HOSTNAME)"
  }
} else {
  for ($i = 0; $i -lt 30; $i++) {
    $publicUrl = Get-TunnelUrlFromLog -LogPath $logPath
    if ($publicUrl) { break }
    Start-Sleep -Seconds 2
  }
}

if ($publicUrl) {
  try {
    Set-Clipboard -Value $publicUrl
  } catch {
    # ignore
  }
  try {
    Start-Process 'chrome.exe' $publicUrl
  } catch {
    Start-Process 'explorer.exe' $publicUrl
  }
}
