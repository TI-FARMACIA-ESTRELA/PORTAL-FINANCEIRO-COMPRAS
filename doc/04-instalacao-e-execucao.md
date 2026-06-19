# 04 — Instalação e execução

## Pré-requisitos

- Node.js **20+**
- npm **10+**
- PostgreSQL **16+** (local, Docker ou remoto)
- Opcional: Docker + Docker Compose

## 1. Clonar e instalar

```bash
git clone https://github.com/TI-FARMACIA-ESTRELA/PORTAL-FINANCEIRO-COMPRAS.git
cd PORTAL-FINANCEIRO-COMPRAS

npm install
```

## 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Ajuste principalmente:

- `backend/.env` → `DATABASE_URL` apontando para seu PostgreSQL local
- `frontend/.env` → `VITE_API_URL=http://localhost:3000`

Consulte [12-variaveis-ambiente.md](./12-variaveis-ambiente.md) para detalhes.

## 3. Banco de dados

```bash
# Gerar Prisma Client
npm run prisma:generate

# Aplicar migrations
npm run prisma:migrate:deploy

# Seed (admin #1 + cadastros auxiliares)
npm run prisma:seed
```

**Login após seed:** usuário `#1` / senha `admin123` (trocar em produção).

## 4. Desenvolvimento local (dois terminais)

```bash
# Terminal 1 — API (porta 3000, hot reload)
npm run dev:backend

# Terminal 2 — SPA (porta 5173)
npm run dev:frontend
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api |
| Health | http://localhost:3000/api/health |

## 5. Build de produção (local)

```bash
npm run build:backend
npm run build:frontend
npm run lint:frontend
```

Backend compilado: `backend/dist/`  
Frontend compilado: `frontend/dist/`

## 6. Executar backend compilado

```bash
cd backend
node dist/main.js
# ou
npm run start:prod
```

## 7. Preview do frontend buildado

```bash
cd frontend
npm run preview
# padrão: http://localhost:4173
```

## 8. Docker Compose (stack completa)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173  
- Backend: http://localhost:3000/api/health  
- PostgreSQL: localhost:5432  

O container backend executa **`prisma migrate deploy`** automaticamente no entrypoint.

Após subir, rode o seed **uma vez** dentro do container backend:

```bash
docker compose exec backend npx prisma db seed
```

## 9. PostgreSQL apenas via Docker

Se quiser só o banco e rodar API/frontend no host:

```bash
docker compose up db -d
```

Use `DATABASE_URL=postgresql://portal:portal_dev_password@localhost:5432/portal_financeiro?schema=public` em `backend/.env`.

## 10. PostgreSQL portátil (`.pglocal/`)

Se existir pasta `.pglocal/` no projeto (não versionada), pode ser usada para dev offline. **Não commitar** essa pasta.

## 11. Parar serviços

```bash
# Ctrl+C nos terminais dev

# Docker
docker compose down

# Parar só o banco
docker compose stop db
```

## 12. Problemas comuns

| Problema | Solução |
|----------|---------|
| `EPERM` no `prisma generate` (Windows) | Pare processos Node (`backend` rodando) e rode de novo |
| API não conecta ao banco | Verifique `DATABASE_URL` e se PostgreSQL está up |
| CORS / login falha | Confirme `FRONTEND_URL` = URL exata do browser |
| Cookie refresh não funciona em HTTPS | `COOKIE_DOMAIN`, `NODE_ENV=production`, `SameSite=None` |
| Rate limit em scripts de teste | Aumente `THROTTLE_LIMIT` temporariamente em `backend/.env` |

## 13. Comandos rápidos (raiz)

| Comando | Ação |
|---------|------|
| `npm run dev:backend` | API em modo watch |
| `npm run dev:frontend` | Vite dev server |
| `npm run build` | Build backend + frontend |
| `npm run lint:frontend` | ESLint |
| `npm run prisma:generate` | Prisma Client |
| `npm run prisma:migrate:deploy` | Migrations produção |
| `npm run prisma:seed` | Seed idempotente |
| `npm run test:e2e` | Validação fluxo ponta a ponta |
