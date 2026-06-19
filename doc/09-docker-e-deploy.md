# 09 — Docker e deploy

## Docker Compose local

**Arquivo:** `docker-compose.yml`

| Serviço | Imagem / build | Porta host | Healthcheck |
|---------|----------------|------------|-------------|
| `db` | postgres:16-alpine | 5432 | `pg_isready` |
| `backend` | `backend/Dockerfile` | 3000 | GET `/api/health` |
| `frontend` | `frontend/Dockerfile` | 5173 → 80 | — |

**Volumes:**

- `db_data` — dados PostgreSQL  
- `uploads_data` — `/data/uploads` no backend  

```bash
cp .env.example .env
docker compose up --build
docker compose exec backend npx prisma db seed   # primeira vez
docker compose down                              # parar
```

## Dockerfile backend

- **Builder:** install → prisma generate → nest build  
- **Runner:** Node 20 Alpine + wget + prisma CLI  
- **Entrypoint:** `prisma migrate deploy` + `node dist/main.js`  
- **HEALTHCHECK:** wget `/api/health`  
- **EXPOSE:** 3000  

## Dockerfile frontend

- **Builder:** install → `npm run build` com `ARG VITE_API_URL`  
- **Runner:** nginx 1.27 Alpine  
- **EXPOSE:** 80  

## Comunicação frontend → backend

| Ambiente | `VITE_API_URL` | Observação |
|----------|----------------|------------|
| Dev local | `http://localhost:3000` | Browser acessa host |
| Docker Compose | `http://localhost:3000` | **Não** usar hostname `backend` no browser |
| Produção | `https://api.dominio.com` | HTTPS obrigatório para cookies cross-domain |

Backend CORS: `FRONTEND_URL` = URL exata do SPA.

## Coolify — arquitetura recomendada

Três serviços (ou DB gerenciado externo):

1. **PostgreSQL** — volume persistente  
2. **Backend** — build `backend/`, env produção, volume `/data/uploads`  
3. **Frontend** — build `frontend/`, `VITE_API_URL` no build  

Subdomínios sugeridos:

- `app.seu-dominio.com` → frontend  
- `api.seu-dominio.com` → backend  

## Checklist produção

Documento completo: **[DEPLOY-COOLIFY.md](../DEPLOY-COOLIFY.md)**

Resumo:

- [ ] `DATABASE_URL`  
- [ ] `JWT_SECRET` + `REFRESH_TOKEN_SECRET` fortes  
- [ ] `FRONTEND_URL` (HTTPS)  
- [ ] `VITE_API_URL` no build frontend  
- [ ] `COOKIE_DOMAIN=.dominio.com`  
- [ ] `NODE_ENV=production`  
- [ ] Volume `/data/uploads`  
- [ ] Migrations + seed  
- [ ] Trocar senha admin #1  
- [ ] Validar CORS/cookies e exportações  
- [ ] Backup PostgreSQL  

## Tag de versão

```bash
git tag v0.1.0-pre-deploy
git push origin v0.1.0-pre-deploy
```

Marco **pré-deploy** — push depende de permissão no repositório GitHub.

## GitHub

- **Organização:** TI-FARMACIA-ESTRELA  
- **Repositório:** PORTAL-FINANCEIRO-COMPRAS  
- **Branch:** `main`  
- **Commit inicial:** `26f25d955195be9e2f01318ba76e0eff75bd1d30`  

Push requer conta com permissão de escrita na org (erro 403 se usar conta sem acesso).

## Observações

- Não usar `npm audit fix --force`  
- Anexos: diretório preparado; fluxo upload completo evolutivo  
- Migrations forward-only — testar em staging antes de produção  
