# Inicia o PostgreSQL portátil SEMPRE com o banco de produção local.
# Nunca usa .pglocal\data.test-backup nem outras pastas do disco.
$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$PgLocal = Join-Path $ProjectRoot ".pglocal"
$PgCtl = Join-Path $PgLocal "pgsql\bin\pg_ctl.exe"
$DataDir = Join-Path $PgLocal "data"
$LogFile = Join-Path $PgLocal "postgres.log"
$Marker = Join-Path $PgLocal "production-data.marker"

if (-not (Test-Path $PgCtl)) {
  throw "PostgreSQL portátil não encontrado em: $PgLocal"
}

if (-not (Test-Path $DataDir)) {
  throw "Pasta de dados não encontrada: $DataDir"
}

$resolvedData = (Resolve-Path $DataDir).Path
if ($resolvedData -match "test-backup") {
  throw "Configuração inválida: a pasta de dados aponta para backup de teste."
}

$status = & $PgCtl status -D $DataDir 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "[pg] PostgreSQL já está em execução ($DataDir)"
  exit 0
}

Write-Host "[pg] Iniciando PostgreSQL (banco de produção)..."
& $PgCtl start -D $DataDir -l $LogFile -o "-p 5432"
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao iniciar PostgreSQL. Veja: $LogFile"
}

if (-not (Test-Path $Marker)) {
  @"
profile=production
dataDir=$resolvedData
note=Nao usar data.test-backup
"@ | Set-Content -Path $Marker -Encoding UTF8
}

Write-Host "[pg] PostgreSQL pronto em localhost:5432"
