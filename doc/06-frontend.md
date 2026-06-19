# 06 — Frontend (React + Vite)

## Entry e providers

```
main.tsx
  └── QueryClientProvider (@tanstack/react-query)
        └── AuthProvider (JWT em memória + refresh cookie)
              └── RouterProvider (router.tsx)
```

## Cliente HTTP (`services/api/client.ts`)

- Base URL: `VITE_API_URL` + `/api`
- `withCredentials: true` — envia cookie de refresh
- Access token em **memória** (não localStorage)
- Interceptor 401 → tenta `/auth/refresh` uma vez

## Rotas (`router.tsx`)

| Rota | Página | Perfis |
|------|--------|--------|
| `/login` | LoginPage | Público |
| `/dashboard` | DashboardPage | Autenticado |
| `/lancamentos` | ReceivablesPage | Autenticado |
| `/recebimentos` | ReceiptsPage | Autenticado |
| `/conta-corrente` | CurrentAccountsPage | Autenticado |
| `/conta-corrente/:id` | CurrentAccountDetailPage | Autenticado |
| `/perfil` | ProfilePage | Autenticado |
| `/cadastros/fornecedores` | SuppliersPage | ADMIN, DIRETORIA |
| `/cadastros/descricoes-acoes` | ActionTypesPage | ADMIN, DIRETORIA |
| `/cadastros/formas-recebimento` | ReceiptMethodsPage | ADMIN, DIRETORIA |
| `/admin/auditoria` | AuditPage | ADMIN, DIRETORIA |
| `/admin/usuarios` | UsersPage | ADMIN |

## Layout

- **MainLayout** — Sidebar + Header + área de conteúdo
- **Sidebar** — navegação filtrada por `Role` (`navigation.ts`)
- **Header** — breadcrumb, usuário, **NotificationsBell**
- Identidade visual: Tailwind + tokens `primary-*` (Fase 1)

## Componentes reutilizáveis (`components/`)

| Componente | Uso |
|------------|-----|
| `DataTable` | Tabelas paginadas |
| `FilterBar` | Busca + filtros + `ExportButtons` |
| `ExportButtons` | Excel/CSV com loading/toast |
| `KpiCard` | Cards de métricas |
| `StatusBadge` | Status financeiro, vencimento, etc. |
| `Modal`, `ReasonModal`, `ConfirmDialog` | Diálogos |
| `DateInput`, `MoneyInput`, `Select` | Formulários |
| `Pagination`, `LoadingSpinner`, `EmptyState` | UX |

## Features e APIs

Cada feature possui `*Page.tsx`, modais e `*Api.ts`:

| Feature | API module |
|---------|------------|
| `auth` | `authApi.ts` |
| `receivables` | `receivablesApi.ts` |
| `receipts` | `receiptsApi.ts` |
| `current-accounts` | `currentAccountsApi.ts` |
| `dashboard` | `dashboardApi.ts` |
| `notifications` | `notificationsApi.ts` |
| `reports` | `reportsApi.ts` |
| `settings/*` | `suppliersApi`, `actionTypesApi`, `receiptMethodsApi` |
| `admin/*` | `usersApi.ts`, `auditApi.ts` |

## Exportações (Fase 11)

Helpers em `utils/export.ts`:

- `downloadBlob` — download no browser
- `buildQueryStringFromFilters` — repassa filtros da tela
- `formatExportFilename` — `modulo_YYYY-MM-DD.xlsx`

Botões **Exportar Excel / CSV** nas telas:

- Lançamentos, Recebimentos, Conta corrente, Extrato, Auditoria, Dashboard

## Formatação (`utils/format.ts`)

- Moeda BRL
- Datas `dd/MM/yyyy`
- Competência `MM/yyyy`
- `date-fns` locale pt-BR

## Build Vite

**Code splitting** (`vite.config.ts`):

- `vendor` — React, Router
- `query` — TanStack Query, Axios
- `charts` — Recharts
- `ui` — Headless UI, Heroicons, toast

## Scripts frontend

```bash
cd frontend

npm run dev       # http://localhost:5173
npm run build     # tsc + vite build → dist/
npm run preview   # serve dist/
npm run lint      # ESLint zero warnings
```

## Variáveis

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL base da API **sem** `/api` |

Embutida no build — alterar exige rebuild.

## Docker frontend

- Build stage: Node 20 + `npm run build`
- Runtime: **nginx** Alpine servindo `dist/`
- `nginx.conf` — SPA fallback (`try_files ... /index.html`)
- Porta container: **80** (mapeada para 5173 no Compose)

## Produção Coolify

Definir `VITE_API_URL=https://api.seu-dominio.com` como **build argument** no serviço frontend.
