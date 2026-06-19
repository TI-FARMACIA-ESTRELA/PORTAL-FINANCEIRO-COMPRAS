# 03 — Estrutura de pastas e arquivos

## Raiz do monorepo

```
Portal-financeiro-compras/
├── backend/                 # API NestJS + Prisma
├── frontend/                # SPA React + Vite
├── doc/                     # Documentação técnica (esta pasta)
├── .cursor/                 # Planos Cursor (opcional no repo)
├── .env.example             # Variáveis Docker Compose / referência
├── .gitignore
├── docker-compose.yml
├── DEPLOY-COOLIFY.md
├── README.md
├── package.json             # Scripts raiz (workspaces)
└── package-lock.json
```

## Backend (`backend/`)

```
backend/
├── docker-entrypoint.sh     # migrate deploy + start node
├── Dockerfile
├── .dockerignore
├── .env.example             # Variáveis backend (commitado)
├── .env                     # Local — NÃO commitar
├── nest-cli.json
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── prisma/
│   ├── schema.prisma        # Modelos e enums
│   ├── seed.ts              # Admin #1 + cadastros auxiliares
│   └── migrations/          # 8 migrations versionadas
├── scripts/
│   ├── test-e2e-phase12.mjs       # Fluxo ponta a ponta
│   └── test-reports-phase11.mjs   # Testes de exportação
└── src/
    ├── main.ts              # Bootstrap NestJS (CORS, helmet, prefix /api)
    ├── app.module.ts        # Módulos + guards globais
    ├── auth/                # Login, refresh, logout, JWT
    ├── users/               # CRUD usuários (ADMIN)
    ├── audit/               # Audit logs (global)
    ├── suppliers/           # Fornecedores
    ├── action-types/        # Descrições de ação
    ├── receipt-methods/     # Formas de recebimento
    ├── receivables/         # Lançamentos
    ├── receipts/            # Recebimentos + integração CA
    ├── current-accounts/    # Conta corrente + movimentos
    ├── dashboard/           # KPIs e gráficos
    ├── notifications/       # Notificações in-app
    ├── reports/             # Exportações Excel/CSV
    ├── health/              # GET /api/health
    ├── prisma/              # PrismaModule + PrismaService
    └── common/              # Guards, decorators, DTOs, validators
```

### Módulos NestJS por pasta

Cada domínio segue o padrão: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`.

| Pasta | Responsabilidade |
|-------|------------------|
| `auth` | Autenticação JWT + cookie refresh |
| `users` | Gestão de usuários |
| `audit` | Registro append-only |
| `suppliers` | CRUD fornecedores |
| `action-types` | CRUD descrições de ação |
| `receipt-methods` | CRUD formas de recebimento |
| `receivables` | Lançamentos e KPIs |
| `receipts` | Recebimentos, confirmação, estorno |
| `current-accounts` | Contas, compartilhamento, movimentos |
| `dashboard` | Agregações analíticas |
| `notifications` | Alertas por escopo |
| `reports` | Exportações (ExcelJS + CSV) |
| `common` | Infra compartilhada |

## Frontend (`frontend/`)

```
frontend/
├── Dockerfile               # Build Vite + nginx
├── nginx.conf               # SPA fallback
├── .dockerignore
├── .env.example
├── .env                     # Local — NÃO commitar
├── index.html
├── vite.config.ts           # Alias @, code-splitting
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx             # Entry React
    ├── App.tsx
    ├── router.tsx           # Rotas e guards de perfil
    ├── index.css            # Tailwind + tokens visuais
    ├── components/          # UI reutilizável (DataTable, FilterBar, etc.)
    ├── features/            # Páginas por domínio
    │   ├── auth/
    │   ├── dashboard/
    │   ├── receivables/
    │   ├── receipts/
    │   ├── current-accounts/
    │   ├── notifications/
    │   ├── reports/
    │   ├── settings/        # Cadastros + perfil
    │   └── admin/           # Usuários + auditoria
    ├── layouts/             # MainLayout, Sidebar, Header, navigation
    ├── hooks/               # useCurrentUser
    ├── services/api/        # Axios client + interceptors
    ├── utils/               # format, export, cn
    ├── types/               # Tipos compartilhados
    └── lib/                 # queryClient
```

### Features frontend

| Pasta | Páginas / componentes |
|-------|----------------------|
| `auth` | Login, ProtectedRoute, RequireRole, AuthProvider |
| `receivables` | ReceivablesPage, modais CRUD |
| `receipts` | ReceiptsPage, confirmação/estorno |
| `current-accounts` | Lista, detalhe/extrato, movimentos |
| `dashboard` | KPIs, gráficos Recharts, listas |
| `notifications` | NotificationsBell |
| `reports` | reportsApi + helpers de download |
| `settings` | Fornecedores, ações, formas, perfil |
| `admin` | Usuários, auditoria |

## Arquivos ignorados pelo Git (`.gitignore`)

- `node_modules/`, `dist/`, `build/`
- `.env`, `backend/.env`, `frontend/.env` (exceto `*.example`)
- `.pglocal/` (PostgreSQL portátil local)
- `uploads/`, `data/uploads/`
- `*.log`, `coverage/`

## Volumes Docker

| Volume | Montagem | Conteúdo |
|--------|----------|----------|
| `db_data` | PostgreSQL | Dados do banco |
| `uploads_data` | `/data/uploads` | Anexos futuros |
