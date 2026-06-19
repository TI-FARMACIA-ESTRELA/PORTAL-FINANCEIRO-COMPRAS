#!/bin/sh
set -e

echo "[entrypoint] Aplicando migrations (prisma migrate deploy)..."
npx prisma migrate deploy

echo "[entrypoint] Iniciando API..."
exec "$@"
