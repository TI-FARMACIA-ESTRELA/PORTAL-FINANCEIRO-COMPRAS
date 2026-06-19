# 08 — Testes e validação

## Visão geral

O projeto **não possui suite Jest/E2E automatizada completa** no CI. A validação foi feita via:

- Builds TypeScript (backend + frontend)
- ESLint frontend
- Scripts Node de validação API
- Testes manuais por fase durante implementação

## Scripts de validação API

### Fluxo ponta a ponta — Fase 12

**Arquivo:** `backend/scripts/test-e2e-phase12.mjs`

**Requisito:** API rodando em `http://localhost:3000` com seed aplicado.

```bash
# Com backend rodando
npm run test:e2e
# ou
node backend/scripts/test-e2e-phase12.mjs
```

**Cenários cobertos (18 passos):**

| # | Teste |
|---|-------|
| 1 | GET `/api/health` |
| 2 | Login admin |
| 3 | Criar fornecedor |
| 4 | Listar action types ativos |
| 5 | Listar receipt methods ativos |
| 6 | Criar lançamento |
| 7 | Recebimento parcial |
| 8 | Confirmar → lançamento **PARCIAL** |
| 9 | Recebimento integral |
| 10 | Confirmar → lançamento **QUITADO** |
| 11 | Criar conta corrente |
| 12 | Entrada manual |
| 13 | Saída manual |
| 14 | Recebimento com crédito em CA + confirmação |
| 15 | Estorno integrado |
| 16 | Dashboard com KPIs |
| 17 | Notificações |
| 18 | Exportação XLSX lançamentos |

**Nota:** Se `RECEIPTS_AUTO_CONFIRM=true`, confirmações são puladas automaticamente (receipt já CONFIRMADO).

### Exportações — Fase 11

**Arquivo:** `backend/scripts/test-reports-phase11.mjs`

```bash
node backend/scripts/test-reports-phase11.mjs
```

**Cenários (19 testes):**

- 401 sem token
- Export ADMIN: lançamentos, recebimentos, CA, auditoria, dashboard
- Export DIRETORIA e COMPRADOR (escopo)
- COMPRADOR → auditoria **403**
- COMPRADOR → extrato sem acesso **403/404**
- Filtros respeitados
- Sem `password_hash` nos arquivos

## Validação de build (obrigatória antes de release)

```bash
npm run build:backend
npm run build:frontend
npm run lint:frontend
npm run prisma:migrate:deploy
```

## Testes manuais recomendados (UI)

1. Login com #1 / admin123  
2. Criar lançamento → recebimento parcial → confirmar (ADMIN)  
3. Recebimento integral → QUITADO  
4. Conta corrente → entrada/saída  
5. Recebimento com "Crédito em conta corrente" → confirmação → saldo CA  
6. Estorno de recebimento integrado  
7. Dashboard e notificações  
8. Exportar Excel/CSV com filtros  
9. Login COMPRADOR — confirmar escopo restrito  
10. Login DIRETORIA — auditoria e export consolidado  

## Rate limit e testes

- Login: **5 tentativas/min** (`@Throttle` no AuthController)
- Global: **100 req/min** (`THROTTLE_LIMIT`)
- Health: **isento** (`@SkipThrottle`)

Para scripts intensos, aumente temporariamente `THROTTLE_LIMIT` em `backend/.env`.

## O que não foi implementado

- Testes unitários Jest por módulo  
- Cypress/Playwright E2E browser  
- Pipeline CI automatizado no GitHub Actions  

Podem ser adicionados em versões futuras.

## Resultados registrados (Fase 12)

| Validação | Resultado |
|-----------|-----------|
| E2E script | 18/18 PASS |
| Reports script | 19/19 PASS |
| build:backend | OK |
| build:frontend | OK |
| lint:frontend | OK |
| prisma migrate deploy | OK (8 migrations) |
