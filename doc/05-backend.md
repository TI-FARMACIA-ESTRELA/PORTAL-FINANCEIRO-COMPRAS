# 05 — Backend (NestJS)

## Bootstrap (`main.ts`)

- Prefixo global: **`/api`**
- **Helmet** — headers de segurança
- **cookie-parser** — refresh token httpOnly
- **CORS** — `origin: FRONTEND_URL`, `credentials: true`
- **ValidationPipe** — whitelist, forbidNonWhitelisted, transform
- Porta: `BACKEND_PORT` (padrão **3000**)

## Guards globais (`app.module.ts`)

| Guard | Função |
|-------|--------|
| `ThrottlerGuard` | Rate limit (100 req/min; login: 5/min) |
| `JwtAuthGuard` | JWT obrigatório (exceto `@Public()`) |
| `RolesGuard` | `@Roles(...)` por endpoint |

## Autenticação (`/api/auth`)

| Método | Rota | Público | Descrição |
|--------|------|---------|-----------|
| POST | `/auth/login` | Sim | Login número + senha; seta cookie refresh |
| POST | `/auth/refresh` | Sim | Novo access token via cookie |
| GET | `/auth/me` | Não | Dados do usuário logado |
| POST | `/auth/logout` | Não | Limpa cookie refresh |

**Cookies (produção):** `httpOnly`, `Secure`, `SameSite=None`, `domain=COOKIE_DOMAIN`.

## Health (`/api/health`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status + `database: up/down`; **503** se DB down |

## Usuários (`/api/users`) — ADMIN

CRUD, reset senha, alterar perfil, ativar/inativar.

## Auditoria (`/api/audit-logs`) — ADMIN, DIRETORIA

Consulta paginada; registros append-only; sanitização de campos sensíveis.

## Cadastros

| Controller | Rotas principais |
|------------|------------------|
| `suppliers` | CRUD fornecedores |
| `action-types` | CRUD + `GET /active` |
| `receipt-methods` | CRUD + `GET /active` |

## Lançamentos (`/api/receivables`)

- Listagem com filtros (competência, vencimento, comprador, etc.)
- KPIs summary
- CRUD + cancelamento lógico
- Escopo COMPRADOR forçado no service

## Recebimentos (`/api/receipts`)

- Registro parcial/integral
- Confirmação (ADMIN) — afeta saldo do lançamento
- Estorno (ADMIN) — integrado com conta corrente quando aplicável
- `RECEIPTS_AUTO_CONFIRM=true` confirma na criação (dev)

## Conta corrente (`/api/current-accounts`)

- CRUD contas, compartilhamento, ativar/inativar
- Movimentos: entrada, saída, ajuste (ADMIN), estorno
- Extrato paginado com saldo acumulado
- Acesso: dono, compartilhado ou ADMIN

## Dashboard (`/api/dashboard`)

KPIs, gráficos e listas rápidas — escopo por perfil/filtros.

## Notificações (`/api/notifications`)

Listagem, contagem não lidas, marcar lida, refresh por escopo.

## Relatórios (`/api/reports`) — Fase 11

| Exportação | Formatos |
|------------|----------|
| Lançamentos | `.xlsx`, `.csv` |
| Recebimentos | `.xlsx`, `.csv` |
| Contas correntes | `.xlsx`, `.csv` |
| Extrato por conta | `.xlsx`, `.csv` |
| Auditoria | `.xlsx`, `.csv` (ADMIN/DIRETORIA) |
| Dashboard | `.xlsx` (multi-abas) |

Limite: **50.000 linhas** por exportação.

## Estrutura de um módulo típico

```
dominio/
├── dominio.module.ts      # imports/exports
├── dominio.controller.ts  # rotas HTTP
├── dominio.service.ts     # regras + Prisma
├── dto/                   # class-validator DTOs
└── *.helpers.ts           # cálculos puros (opcional)
```

## Scripts backend

```bash
cd backend

npm run start:dev          # nest start --watch
npm run build              # nest build → dist/
npm run start:prod         # node dist/main.js
npm run prisma:generate
npm run prisma:migrate     # dev (cria migration)
npm run prisma:migrate:deploy
npm run prisma:seed
npm run prisma:studio      # UI do banco
npm run test:e2e           # scripts/test-e2e-phase12.mjs
```

## Docker backend

- **Dockerfile:** multi-stage build Node 20 Alpine
- **Entrypoint:** `prisma migrate deploy` + `node dist/main.js`
- **Healthcheck:** `GET /api/health`
- **Volume:** `/data/uploads`

## Dependências principais

Ver [02-stack-e-linguagens.md](./02-stack-e-linguagens.md).
