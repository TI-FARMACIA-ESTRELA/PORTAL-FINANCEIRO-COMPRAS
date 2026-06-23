$ErrorActionPreference = "SilentlyContinue"

Write-Host "[app] Encerrando backend (3000) e frontend (5173)..."
Get-NetTCPConnection -LocalPort 3000,5173 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

& (Join-Path $PSScriptRoot "stop-postgres.ps1")

Write-Host "[app] Serviços encerrados."
