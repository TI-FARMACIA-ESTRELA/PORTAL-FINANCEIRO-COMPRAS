# 10 — Segurança e permissões

## Autenticação

| Mecanismo | Detalhe |
|-----------|---------|
| Senha | Hash **Argon2** — nunca texto puro |
| Access token | JWT curto (`JWT_EXPIRES_IN`, padrão 15m) |
| Refresh token | JWT em cookie **httpOnly** |
| Frontend | Token access só em memória |

## Cookies (produção)

```typescript
// auth/cookie.util.ts
httpOnly: true
secure: true          // NODE_ENV=production
sameSite: 'none'      // cross-domain Coolify
domain: COOKIE_DOMAIN // ex.: .farmaciaestrela.com.br
```

## Perfis (`Role`)

| Perfil | Escopo |
|--------|--------|
| **ADMIN** | Tudo: usuários, confirmação/estorno recebimentos, ajustes CA, export auditoria |
| **COMPRADOR** | Próprios lançamentos/recebimentos; contas próprias + compartilhadas; **sem** auditoria |
| **DIRETORIA** | Consulta consolidada; export auditoria; **sem** escrita financeira onde definido |

## Guards

- `@Public()` — health, login, refresh  
- `@Roles(Role.ADMIN, ...)` — endpoints administrativos  
- Escopo COMPRADOR aplicado nos **services** (não só no frontend)

## Dados sensíveis — nunca expor

| Campo | Proteção |
|-------|----------|
| `password_hash` | Excluído de `userSelect` nas APIs |
| Tokens JWT | Não logados; não em exportações |
| Refresh token | Apenas cookie httpOnly |

## Auditoria

- Sanitização de `oldValues` / `newValues`  
- Chaves bloqueadas: `password`, `passwordHash`, `token`, `refreshToken`, etc.  
- Módulo `@Global()` — registra ações críticas  

## Exportações (Fase 11)

- `sanitizeJsonForExport` remove campos sensíveis  
- Limite 50.000 linhas  
- COMPRADOR não exporta auditoria (403)  
- Escopo forçado no service mesmo se `buyerId` na query  

## Notificações

- `sanitizeMetadata` — sem senha/hash/token  

## HTTP

- **Helmet** — headers de segurança  
- **Throttler** — anti brute-force (login 5/min)  
- **ValidationPipe** — rejeita campos extras nos DTOs  

## Integridade financeira

- **Sem DELETE físico** em receivables, receipts, movements  
- Cancelamento/estorno lógico com motivo  
- Valores **Decimal** — sem float  
- Confirmação de recebimento afeta saldo (quando não auto-confirm)  

## Arquivos que NÃO devem ir ao Git

- `.env`, `backend/.env`, `frontend/.env`  
- `.pglocal/`  
- `node_modules/`, `dist/`  
- Uploads reais, dumps de banco, logs  

`.env.example` **deve** ser commitado (placeholders apenas).

## Produção — ações obrigatórias

1. Trocar `JWT_SECRET` e `REFRESH_TOKEN_SECRET`  
2. Trocar senha admin #1 (`admin123` do seed)  
3. HTTPS em frontend e API  
4. Configurar backup PostgreSQL  
5. Revisar `RECEIPTS_AUTO_CONFIRM=false`  

## Validações realizadas

- `password_hash` ausente em respostas API e exportações  
- COMPRADOR não acessa dados alheios (404/403)  
- Rotas protegidas retornam 401 sem token  
- Health retorna 503 se banco down  
