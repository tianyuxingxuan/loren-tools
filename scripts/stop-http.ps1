$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot '.runtime'
$pidPath = Join-Path $runtimeDir 'http.pid'

if (-not (Test-Path -LiteralPath $pidPath)) {
  Write-Host 'No HTTP PID file found. Nothing to stop.'
  exit 0
}

$pidText = (Get-Content -LiteralPath $pidPath -Raw).Trim()
$processId = 0
if (-not [int]::TryParse($pidText, [ref]$processId)) {
  Remove-Item -LiteralPath $pidPath -Force
  Write-Host 'Invalid PID file removed.'
  exit 0
}

$process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue

if (-not $process) {
  Remove-Item -LiteralPath $pidPath -Force
  Write-Host 'Service is not running.'
  exit 0
}

if ($process.CommandLine -notmatch [regex]::Escape($projectRoot)) {
  Write-Error "PID $processId does not look like this project. Refusing to stop it."
}

Stop-Process -Id $processId -Force
Remove-Item -LiteralPath $pidPath -Force
Write-Host "Stopped loren-tools PID $processId"
