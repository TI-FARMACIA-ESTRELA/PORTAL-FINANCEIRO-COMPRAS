# 02 — Stack e linguagens

## Linguagens

| Linguagem | Uso |
|-----------|-----|
| **TypeScript** | Backend (NestJS) e frontend (React) — tipagem em todo o código de aplicação |
| **SQL** | Migrations Prisma versionadas em PostgreSQL |
| **CSS** | Tailwind CSS + `index.css` global no frontend |
| **Markdown** | Documentação, README, planos |

## Runtime e ferramentas

| Ferramenta | Versão mínima | Função |
|------------|---------------|--------|
| **Node.js** | 20+ | Runtime backend e build frontend |
| **npm** | 10+ | Gerenciador de pacotes (workspaces) |
| **PostgreSQL** | 16+ | Banco relacional |
| **Docker** | recente | Containers de produção e Compose local |
| **Git** | — | Versionamento |

## Backend

| Pacote | Função |
|--------|--------|
| **NestJS 10** | Framework HTTP, módulos, DI, guards |
| **Prisma 5** | ORM, migrations, seed |
| **Passport + JWT** | Autenticação access token |
| **Argon2** | Hash de senhas |
| **class-validator / class-transformer** | Validação de DTOs |
| **Helmet** | Headers de segurança HTTP |
| **cookie-parser** | Cookie httpOnly do refresh token |
| **@nestjs/throttler** | Rate limiting (login mais restrito) |
| **ExcelJS** | Exportações `.xlsx` (Fase 11) |

## Frontend

| Pacote | Função |
|--------|--------|
| **React 18** | UI componentizada |
| **Vite 5** | Dev server e build |
| **TypeScript 5.6** | Tipagem |
| **Tailwind CSS 3** | Estilização utilitária |
| **React Router 6** | Rotas SPA |
| **TanStack Query 5** | Cache e fetching de API |
| **Axios** | Cliente HTTP (`withCredentials` para cookies) |
| **Recharts** | Gráficos da dashboard |
| **Headless UI + Heroicons** | Componentes acessíveis e ícones |
| **react-hot-toast** | Feedback visual |
| **date-fns** | Formatação de datas (pt-BR) |
| **ESLint** | Lint do frontend |

## Infraestrutura

| Componente | Função |
|------------|--------|
| **Docker Compose** | Stack local: db + backend + frontend |
| **nginx (Alpine)** | Serve SPA em produção (container frontend) |
| **Coolify** | Deploy alvo em produção (documentado) |

## Decisões arquiteturais

- **Monorepo npm workspaces** — um `package-lock.json`, scripts na raiz
- **REST** — prefixo global `/api` no NestJS
- **JWT access token em memória** no frontend + **refresh em cookie httpOnly**
- **CORS com credentials** — `FRONTEND_URL` exata no backend
- **Sem SQLite** — apenas PostgreSQL
- **Sem delete físico** em entidades financeiras
- **Auditoria global** via `AuditModule` (`@Global()`)

## O que não foi adotado

- SQLite  
- ORM alternativo ao Prisma  
- Next.js (SPA Vite escolhido)  
- `npm audit fix --force` (proibido pelo projeto)
