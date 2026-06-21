#!/usr/bin/env pwsh
# ─────────────────────────────────────────────────────────────────────────────
#  VendorBridge Dev Startup — dev.ps1
#  Run with: .\dev.ps1
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  🚀 VendorBridge Dev Startup" -ForegroundColor Cyan
Write-Host "  ─────────────────────────────" -ForegroundColor DarkGray

# Kill any process holding ports 3000 and 5173-5177
foreach ($port in @(3000, 5173, 5174, 5175, 5176, 5177)) {
  $results = netstat -ano 2>$null | Where-Object { $_ -match ":$port\s" -and $_ -match "LISTEN" }
  foreach ($line in $results) {
    $pid_ = ($line -split '\s+')[-1]
    if ($pid_ -match '^\d+$' -and $pid_ -ne '0') {
      Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue
      Write-Host "  ✓ Freed port $port (PID $pid_)" -ForegroundColor Green
    }
  }
}

Start-Sleep -Seconds 1
Write-Host ""
Write-Host "  Starting dev servers..." -ForegroundColor Yellow
Write-Host ""

# Run the dev servers
npm run dev
