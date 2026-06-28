$ErrorActionPreference = 'Stop'

$domain = 'www.lorentools.com'
$ip = '127.0.0.1'
$hostsPath = Join-Path $env:windir 'System32\drivers\etc\hosts'

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  Write-Error 'Please run PowerShell as Administrator before executing this script.'
}

$entry = "$ip $domain # loren-tools"
$content = Get-Content -LiteralPath $hostsPath -Raw
$pattern = "(?m)^\s*127\.0\.0\.1\s+$([regex]::Escape($domain))(\s|$)"

if ($content -notmatch $pattern) {
  Add-Content -LiteralPath $hostsPath -Value "`r`n$entry"
}

ipconfig /flushdns | Out-Null
Write-Host "Mapped http://$domain to $ip"
