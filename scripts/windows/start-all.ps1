$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

$serverScript = Join-Path $projectRoot 'scripts\windows\start-server.ps1'
$tunnelScript = Join-Path $projectRoot 'scripts\windows\start-tunnel.ps1'
$openScript = Join-Path $projectRoot 'scripts\windows\open-local.ps1'

Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $serverScript) | Out-Null
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $tunnelScript) | Out-Null
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $openScript) | Out-Null

