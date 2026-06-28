$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$serverEntry = Join-Path $projectRoot 'dist-server\index.js'
$runtimeDir = Join-Path $projectRoot '.runtime'
$pidPath = Join-Path $runtimeDir 'http.pid'
$outLog = Join-Path $runtimeDir 'http.out.log'
$errLog = Join-Path $runtimeDir 'http.err.log'
$port = 80

if (-not (Test-Path -LiteralPath $serverEntry)) {
  Write-Error 'Server build not found. Run npm run build first.'
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

$listeners = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
$existing = $listeners | Where-Object { $_.Port -eq $port } | Select-Object -First 1
if ($existing) {
  Write-Error "Port $port is already in use. Stop the existing service first."
}

$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = 'node.exe'
$startInfo.Arguments = "`"$serverEntry`""
$startInfo.WorkingDirectory = $projectRoot
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
$startInfo.Environment['PORT'] = [string]$port
$startInfo.Environment['HOST'] = '0.0.0.0'

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $startInfo
$null = $process.Start()

Set-Content -LiteralPath $pidPath -Value $process.Id

Start-Sleep -Milliseconds 800

if ($process.HasExited) {
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  Set-Content -LiteralPath $outLog -Value $stdout
  Set-Content -LiteralPath $errLog -Value $stderr
  Write-Error "Service failed to start. See $errLog"
}

Write-Host "Started loren-tools on http://www.lorentools.com with PID $($process.Id)"
