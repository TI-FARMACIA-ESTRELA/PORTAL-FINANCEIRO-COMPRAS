# Portal Financeiro Comercial — Farmácia Estrela

Sistema web corporativo interno para controle de **contas a receber comerciais**, **recebimentos/baixas**, **conta corrente comercial** por indústria/fornecedor, com auditoria append-only, dashboard analítica, notificações e exportações Excel/CSV.

> **Status:** Fases 1–12 concluídas — pronto para deploy via Coolify (aguardando aprovação operacional).

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Recharts, Axios |
| Backend | Node.js 20+, NestJS, TypeScript, Prisma ORM, Argon2, JWT + refresh httpOnly |
| Banco | PostgreSQL 16 (valores monetários em `Decimal`/`Numeric`) |
| Infra | Docker, Docker Compose, Coolify |

## Estrutura (monorepo npm workspaces)

```
portal-financeiro-comercial/
├── backend/          # API NestJS + Prisma
├── frontend/         # SPA React + Vite
├── docker-compose.yml
├── .env.example
├── DEPLOY-COOLIFY.md # Checklist detalhado de produção
└── README.md
```

## Requisitos

- **Node.js 20+** e **npm 10+**
- **PostgreSQL 16+** (local, Docker ou gerenciado no Coolify)
- **Docker + Docker Compose** (opcional, recomendado para validar imagens de produção)

## Configuração de ambiente

Copie os exemplos e ajuste (nunca versione `.env` reais):

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Variáveis críticas:

| Variável | Onde | Descrição |
|----------|------|-----------|
| `DATABASE_URL` | backend | Conexão PostgreSQL (Prisma) |
| `JWT_SECRET` / `REFRESH_TOKEN_SECRET` | backend | Segredos fortes em produção |
| `FRONTEND_URL` | backend | URL exata do SPA (CORS + cookies) |
| `COOKIE_DOMAIN` | backend | Domínio base em produção (ex.: `.dominio.com`) |
| `VITE_API_URL` | frontend (build) | URL pública da API **sem** `/api` |
| `UPLOADS_DIR` | backend | `/data/uploads` (volume persistente) |
| `RECEIPTS_AUTO_CONFIRM` | backend | `false` = confirmação ADMIN (recomendado) |
| `THROTTLE_LIMIT` | backend | Rate limit global (padrão 100 req/min) |

## Rodando localmente (sem Docker)

### 1. PostgreSQL

Use Docker Compose só do banco, PostgreSQL portátil ou instância local. Exemplo com compose:

```bash
docker compose up db -d
```

Configure `backend/.env` com `DATABASE_URL` apontando para `localhost:5432`.

### 2. Dependências e banco

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy   # aplica migrations
npm run prisma:seed             # admin + cadastros auxiliares
```

### 3. Servidores de desenvolvimento

```bash
# Terminal 1 — API (porta 3000)
npm run dev:backend

# Terminal 2 — SPA (porta 5173)
npm run dev:frontend
```

- Frontend: http://localhost:5173  
- API health: http://localhost:3000/api/health  
- Login inicial (seed): **usuário #1** / senha **`admin123`** — **trocar após primeiro acesso em produção**

## Rodando com Docker Compose (stack completa)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173 (nginx)  
- Backend: http://localhost:3000/api/health  
- PostgreSQL: `localhost:5432` (volume `db_data`)  
- Uploads: volume `uploads_data` → `/data/uploads`  

O container do backend executa **`prisma migrate deploy`** automaticamente na inicialização.

## Comandos úteis

```bash
# Build produção
npm run build:backend
npm run build:frontend
npm run lint:frontend

# Prisma
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed

# Validação API
npm run test:e2e --workspace backend          # fluxo ponta a ponta
node backend/scripts/test-reports-phase11.mjs   # exportações (Fase 11)
```

## Seed oficial

O seed (`backend/prisma/seed.ts`) é **idempotente** e cria **somente**:

1. Administrador **#1** (`admin123` — trocar em produção)  
2. Formas de recebimento padrão  
3. Descrições de ação padrão  

**Não** cria usuários de teste. Usuários criados manualmente ou por scripts locais (ex.: #9001, #9002 da validação da Fase 11) são **dados locais** e não fazem parte do seed oficial.

## Segurança (resumo)

- `password_hash` nunca é retornado nas APIs de usuário  
- Refresh token em cookie **httpOnly**; access token apenas em memória no frontend  
- Produção: cookie `Secure` + `SameSite=None`; CORS com `credentials: true`  
- Auditoria, exportações e notificações sanitizam senha/hash/token  
- Registros financeiros **não** são excluídos fisicamente (cancelamento/estorno lógico)  
- Escopo por perfil: COMPRADOR vê apenas seus dados; DIRETORIA em modo consulta onde definido  

## Deploy no Coolify

Instruções detalhadas e checklist completo: **[DEPLOY-COOLIFY.md](./DEPLOY-COOLIFY.md)**

Resumo:

1. **PostgreSQL** — serviço gerenciado ou container com volume persistente  
2. **Backend** — build `backend/Dockerfile`; env de produção; volume `/data/uploads`  
3. **Frontend** — build `frontend/Dockerfile` com `VITE_API_URL=https://api.seu-dominio.com`  
4. Rodar **migrations** (automático no entrypoint) e **seed** uma vez  
5. Validar login, CORS/cookies HTTPS, exportações e backup do PostgreSQL  

## Módulos implementados

| Módulo | Rotas principais |
|--------|------------------|
| Autenticação | `/api/auth/*` |
| Usuários / Admin | `/api/users`, `/admin` |
| Auditoria | `/api/audit` |
| Cadastros | fornecedores, ações, formas de recebimento |
| Lançamentos | `/api/receivables` |
| Recebimentos | `/api/receipts` |
| Conta corrente | `/api/current-accounts` |
| Dashboard | `/api/dashboard` |
| Notificações | `/api/notifications` |
| Relatórios | `/api/reports/*` |

## Observações conhecidas (não bloqueantes)

- Bundle frontend ainda pode gerar aviso de tamanho em alguns chunks mesmo após code-splitting (Recharts)  
- Vulnerabilidades transitivas em dependências **dev** (ESLint/Vite) — não usar `npm audit fix --force`  
- Rate limit global pode afetar scripts de teste intensos — aumente `THROTTLE_LIMIT` temporariamente  
- Anexos/comprovantes: diretório `/data/uploads` preparado; fluxo completo de upload pode evoluir em versões futuras  

## Licença

Uso interno — Farmácia Estrela.
