# Checklist de deploy — Coolify

Use este documento ao publicar o **Portal Financeiro Comercial** em produção.

## Arquitetura recomendada

| Serviço | Imagem / build | Porta | Observações |
|---------|----------------|-------|-------------|
| PostgreSQL | `postgres:16-alpine` ou DB gerenciado | 5432 | Volume persistente obrigatório |
| Backend API | `backend/Dockerfile` | 3000 | Health: `GET /api/health` |
| Frontend SPA | `frontend/Dockerfile` | 80 (nginx) | Build com `VITE_API_URL` de produção |

Subdomínios sugeridos:

- Frontend: `https://app.seu-dominio.com`
- API: `https://api.seu-dominio.com`

## Variáveis de ambiente — Backend

| Variável | Obrigatória | Exemplo produção |
|----------|-------------|------------------|
| `NODE_ENV` | Sim | `production` |
| `DATABASE_URL` | Sim | `postgresql://user:pass@host:5432/db?schema=public` |
| `JWT_SECRET` | Sim | Segredo forte (≥ 48 bytes aleatórios) |
| `REFRESH_TOKEN_SECRET` | Sim | Segredo forte distinto do JWT |
| `JWT_EXPIRES_IN` | Não | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | Não | `7d` |
| `FRONTEND_URL` | Sim | `https://app.seu-dominio.com` |
| `COOKIE_DOMAIN` | Sim* | `.seu-dominio.com` |
| `UPLOADS_DIR` | Sim | `/data/uploads` |
| `RECEIPTS_AUTO_CONFIRM` | Não | `false` (recomendado) |
| `THROTTLE_LIMIT` | Não | `100` |
| `BACKEND_PORT` | Não | `3000` |

\* Em localhost/dev use `localhost` sem ponto.

### Cookies e CORS em produção

- `FRONTEND_URL` deve ser a **URL exata** do frontend (com `https://`)  
- `COOKIE_DOMAIN` deve ser o **domínio base** com ponto inicial para subdomínios: `.seu-dominio.com`  
- Backend usa `SameSite=None` + `Secure=true` quando `NODE_ENV=production`  
- Frontend Axios usa `withCredentials: true` para o refresh token httpOnly  
- API e SPA em subdomínios diferentes exigem **HTTPS** em ambos  

## Variáveis de ambiente — Frontend (build-time)

| Variável | Obrigatória | Exemplo |
|----------|-------------|---------|
| `VITE_API_URL` | Sim | `https://api.seu-dominio.com` |

> **Importante:** `VITE_API_URL` é embutida no build. Alterar a URL exige **rebuild** do frontend.

No Coolify, configure como **Build Argument** / env de build do serviço frontend.

## Volumes persistentes

| Caminho | Serviço | Conteúdo |
|---------|---------|----------|
| `/data/uploads` | Backend | Anexos/comprovantes futuros |
| `/var/lib/postgresql/data` | PostgreSQL | Dados do banco |

## Passos de deploy

### Pré-deploy

- [ ] Gerar `JWT_SECRET` e `REFRESH_TOKEN_SECRET` fortes  
- [ ] Definir `DATABASE_URL` do PostgreSQL de produção  
- [ ] Definir `FRONTEND_URL`, `COOKIE_DOMAIN`, `VITE_API_URL`  
- [ ] Confirmar HTTPS ativo nos domínios  
- [ ] Configurar backup automático do PostgreSQL  

### Backend (Coolify)

- [ ] Criar serviço a partir do repositório, contexto `backend/`  
- [ ] Dockerfile: `backend/Dockerfile`  
- [ ] Configurar todas as env vars acima  
- [ ] Montar volume persistente em `/data/uploads`  
- [ ] Health check: HTTP GET `/api/health` (espera 200 + `"database":"up"`)  
- [ ] Deploy — entrypoint roda `prisma migrate deploy` automaticamente  

### Frontend (Coolify)

- [ ] Criar serviço, contexto `frontend/`  
- [ ] Dockerfile: `frontend/Dockerfile`  
- [ ] Build arg `VITE_API_URL=https://api.seu-dominio.com`  
- [ ] Publicar na porta 80 do container  

### Pós-deploy

- [ ] Executar seed **uma vez** (se banco vazio):  
  ```bash
  npx prisma db seed
  ```  
  (via terminal do container backend ou job one-shot)  
- [ ] Testar login admin (#1 / senha inicial do seed)  
- [ ] **Trocar senha do admin #1** imediatamente  
- [ ] Testar refresh de sessão (cookie cross-domain)  
- [ ] Testar exportação Excel/CSV  
- [ ] Validar dashboard e notificações  
- [ ] Documentar credenciais em cofre seguro (não no repositório)  

## Checklist de produção (resumo)

- [ ] `DATABASE_URL` configurado  
- [ ] `JWT_SECRET` forte  
- [ ] `REFRESH_TOKEN_SECRET` forte  
- [ ] `FRONTEND_URL` correto (HTTPS)  
- [ ] `VITE_API_URL` correto no build do frontend  
- [ ] `COOKIE_DOMAIN` correto  
- [ ] `NODE_ENV=production`  
- [ ] HTTPS em frontend e API  
- [ ] Volume persistente `/data/uploads`  
- [ ] Migrations aplicadas (`migrate deploy`)  
- [ ] Seed executado (admin + cadastros auxiliares)  
- [ ] Login admin testado  
- [ ] Senha admin padrão alterada  
- [ ] CORS/cookies validados no navegador  
- [ ] Exportações validadas  
- [ ] Backup PostgreSQL configurado  

## Validação local das imagens Docker

```bash
cp .env.example .env
docker compose up --build
curl http://localhost:3000/api/health
# Login via frontend http://localhost:5173
```

## Dados locais vs produção

- O **seed oficial** não inclui usuários de teste  
- Bancos de desenvolvimento podem conter usuários extras (#9001, #9002, etc.) criados durante testes — **não migrar** esses dados para produção  
- Em produção, comece com banco limpo + seed + troca de senha admin  

## Suporte / rollback

- Migrations Prisma são forward-only — teste `migrate deploy` em staging antes de produção  
- Mantenha backup do PostgreSQL antes de cada deploy com migration nova  
- Para rollback de aplicação: redeploy da imagem anterior (dados do banco permanecem)  
