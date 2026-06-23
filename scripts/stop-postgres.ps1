$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$PgCtl = Join-Path $ProjectRoot ".pglocal\pgsql\bin\pg_ctl.exe"
$DataDir = Join-Path $ProjectRoot ".pglocal\data"

if (-not (Test-Path $PgCtl)) { exit 0 }

$status = & $PgCtl status -D $DataDir 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "[pg] PostgreSQL já estava parado."
  exit 0
}

& $PgCtl stop -D $DataDir -m fast
Write-Host "[pg] PostgreSQL parado."
