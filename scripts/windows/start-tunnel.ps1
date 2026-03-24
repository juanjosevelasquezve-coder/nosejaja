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

$cloudflared = Join-Path $env:USERPROFILE 'AppData\Local\Microsoft\WinGet\Links\cloudflared.exe'
$url = if ($env:CLOUDFLARED_URL) { $env:CLOUDFLARED_URL } else { "http://localhost:$port" }
$tunnel = if ($env:CLOUDFLARED_TUNNEL) { $env:CLOUDFLARED_TUNNEL } else { $null }
$token = if ($env:CLOUDFLARED_TOKEN) { $env:CLOUDFLARED_TOKEN } elseif ($env:TUNNEL_TOKEN) { $env:TUNNEL_TOKEN } else { $null }
$startDelaySeconds = 25
if ($env:CLOUDFLARED_START_DELAY_SECONDS) {
  try { $startDelaySeconds = [int]$env:CLOUDFLARED_START_DELAY_SECONDS } catch { }
}

$configCandidates = @()
if ($env:CLOUDFLARED_CONFIG) { $configCandidates += $env:CLOUDFLARED_CONFIG }
$configCandidates += @(
  (Join-Path $projectRoot 'cloudflared\config.yml'),
  (Join-Path $projectRoot 'cloudflared\config.yaml'),
  (Join-Path $env:USERPROFILE '.cloudflared\config.yml'),
  (Join-Path $env:USERPROFILE '.cloudflared\config.yaml')
)
$configPath = $null
foreach ($candidate in $configCandidates) {
  if ($candidate -and (Test-Path $candidate)) { $configPath = $candidate; break }
}

New-Item -ItemType Directory -Force -Path (Join-Path $projectRoot 'logs') | Out-Null
$logPath = Join-Path $projectRoot 'logs\cloudflared.log'

if ($startDelaySeconds -gt 0) { Start-Sleep -Seconds $startDelaySeconds }

if (-not (Test-Path $cloudflared)) {
  throw "No se encontro cloudflared en: $cloudflared"
}

Remove-Item Env:TUNNEL_ORIGIN_CERT -ErrorAction SilentlyContinue

("[{0}] Iniciando cloudflared..." -f (Get-Date -Format o)) | Out-File -FilePath $logPath -Append -Encoding utf8

if (-not $tunnel -and -not $configPath) {
  if (-not $token) {
    throw 'Falta configurar el tunnel. Define $env:CLOUDFLARED_TUNNEL (nombre o UUID), o crea un config.yml, o define $env:CLOUDFLARED_TOKEN (token del tunnel).'
  }
}

$configArg = if ($configPath) { "--config `"$configPath`"" } else { '' }
$tunnelArg = if ($tunnel) { " `"$tunnel`"" } else { '' }
$tokenArg = if ($token) { "--token `"$token`"" } else { '' }

# If you use ingress rules in config.yml, you usually do NOT need --url.
$useUrl = $false
if (-not $configPath) { $useUrl = $true }
if ($env:CLOUDFLARED_FORCE_URL -eq '1') { $useUrl = $true }
$urlArg = if ($useUrl) { "--url `"$url`"" } else { '' }

# Run via cmd.exe so native stderr doesn't stop the script.
$cmd = "`"$cloudflared`" tunnel $configArg --protocol http2 run $tokenArg$tunnelArg $urlArg >> `"$logPath`" 2>&1"
& cmd.exe /c $cmd
exit $LASTEXITCODE
