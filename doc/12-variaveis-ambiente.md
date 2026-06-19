# 12 — Variáveis de ambiente

Referência consolidada. Copie dos arquivos `.env.example` — **nunca** commite `.env` reais.

## Raiz (`.env.example`) — Docker Compose

| Variável | Padrão dev | Descrição |
|----------|------------|-----------|
| `POSTGRES_USER` | portal | Usuário PostgreSQL |
| `POSTGRES_PASSWORD` | portal_dev_password | Senha PostgreSQL |
| `POSTGRES_DB` | portal_financeiro | Nome do banco |
| `POSTGRES_PORT` | 5432 | Porta exposta |
| `BACKEND_PORT` | 3000 | Porta API no host |
| `DATABASE_URL` | postgresql://...@db:5432/... | Conexão Prisma no Compose |
| `NODE_ENV` | development | production em deploy |
| `FRONTEND_URL` | http://localhost:5173 | CORS + cookies |
| `COOKIE_DOMAIN` | localhost | `.dominio.com` em prod |
| `JWT_SECRET` | placeholder | **Trocar em produção** |
| `JWT_EXPIRES_IN` | 15m | Expiração access token |
| `REFRESH_TOKEN_SECRET` | placeholder | **Trocar em produção** |
| `REFRESH_TOKEN_EXPIRES_IN` | 7d | Expiração refresh |
| `UPLOADS_DIR` | /data/uploads | Anexos persistentes |
| `RECEIPTS_AUTO_CONFIRM` | false | true = confirma na criação |
| `THROTTLE_LIMIT` | 100 | Rate limit global/min |
| `FRONTEND_PORT` | 5173 | Porta SPA no host |
| `VITE_API_URL` | http://localhost:3000 | Build frontend (Compose) |

## Backend (`backend/.env.example`)

| Variável | Descrição |
|----------|-----------|
| `NODE_ENV` | development / production |
| `BACKEND_PORT` | Porta HTTP (3000) |
| `DATABASE_URL` | Host `localhost` fora do Docker; `db` dentro do Compose |
| `FRONTEND_URL` | URL exata do frontend |
| `COOKIE_DOMAIN` | Domínio cookie refresh |
| `JWT_SECRET` | Segredo access token |
| `JWT_EXPIRES_IN` | Ex.: 15m |
| `REFRESH_TOKEN_SECRET` | Segredo refresh token |
| `REFRESH_TOKEN_EXPIRES_IN` | Ex.: 7d |
| `UPLOADS_DIR` | /data/uploads |
| `THROTTLE_LIMIT` | Rate limit (opcional) |
| `RECEIPTS_AUTO_CONFIRM` | false recomendado produção |

### Exemplo local (sem Docker)

```env
DATABASE_URL=postgresql://portal:portal_dev_password@localhost:5432/portal_financeiro?schema=public
FRONTEND_URL=http://localhost:5173
COOKIE_DOMAIN=localhost
JWT_SECRET=dev-access-secret-change-me
REFRESH_TOKEN_SECRET=dev-refresh-secret-change-me
RECEIPTS_AUTO_CONFIRM=false
```

## Frontend (`frontend/.env.example`)

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL base API **sem** `/api` |

```env
VITE_API_URL=http://localhost:3000
```

### Produção Coolify

```env
# Build-time only
VITE_API_URL=https://api.seu-dominio.com
```

```env
# Backend runtime
FRONTEND_URL=https://app.seu-dominio.com
COOKIE_DOMAIN=.seu-dominio.com
NODE_ENV=production
```

## Geração de segredos

```bash
# Linux/macOS/Git Bash
openssl rand -base64 48
```

Use valores distintos para `JWT_SECRET` e `REFRESH_TOKEN_SECRET`.

## Arquivos de ambiente

| Arquivo | Commitar? |
|---------|-----------|
| `.env.example` | Sim |
| `backend/.env.example` | Sim |
| `frontend/.env.example` | Sim |
| `.env` | **Não** |
| `backend/.env` | **Não** |
| `frontend/.env` | **Não** |
