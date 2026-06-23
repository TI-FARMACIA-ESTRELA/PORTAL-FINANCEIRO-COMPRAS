# Sobe o sistema completo: PostgreSQL (produção) + backend + frontend.
$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ProjectRoot

Write-Host "=== Portal Financeiro Estrela — start dev ==="

& (Join-Path $PSScriptRoot "start-postgres.ps1")

Write-Host "[db] Aguardando PostgreSQL..."
for ($i = 0; $i -lt 30; $i++) {
  if (Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue) { break }
  Start-Sleep -Seconds 1
}

npm run prisma:migrate:deploy
if ($LASTEXITCODE -ne 0) { throw "Falha ao aplicar migrations." }

Push-Location backend
npx ts-node scripts/validate-production-db.ts
if ($LASTEXITCODE -ne 0) { throw "Banco incorreto — abortando." }
Pop-Location

$backendCmd = "npm run dev:backend"
$frontendCmd = "npm run dev:frontend"

Write-Host "[app] Iniciando backend e frontend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot'; $backendCmd" | Out-Null
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot'; $frontendCmd" | Out-Null

Write-Host ""
Write-Host "Sistema iniciado."
Write-Host "  Local:   http://localhost:5173"
$lanIp = (
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object -First 1 -ExpandProperty IPAddress
)
if ($lanIp) {
  Write-Host "  Rede:    http://${lanIp}:5173"
}
Write-Host "  API:     http://localhost:3000/api/health"
Write-Host ""
Write-Host "Use npm run stop para encerrar backend/frontend e PostgreSQL."
