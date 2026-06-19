# 07 — Banco de dados

## SGBD

- **PostgreSQL 16+**
- Provider Prisma: `postgresql`
- Conexão via `DATABASE_URL`

## ORM

- **Prisma 5** — schema, migrations, client, seed
- Valores monetários: tipo **`Decimal`** no schema (`@db.Decimal(15, 2)`)

## Migrations (versionadas)

| Migration | Fase | Conteúdo |
|-----------|------|----------|
| `20260618000000_fase2_users_auth` | 2 | Users, Role enum |
| `20260619013525_fase3_audit_logs` | 3 | AuditLog append-only |
| `20260619015327_fase4_cadastros_auxiliares` | 4 | Suppliers, ActionTypes, ReceiptMethods |
| `20260619022042_fase5_receivables` | 5 | Receivables (lançamentos) |
| `20260619024532_fase6_receivable_receipts` | 6 | ReceivableReceipts |
| `20260619035147_fase7_current_accounts` | 7 | CurrentAccounts, shares, movements |
| `20260619043000_fase8_receipt_current_account_integration` | 8 | Vínculos receipt ↔ movement |
| `20260619050000_fase10_notifications` | 10 | Notifications |

## Modelos (`schema.prisma`)

| Model | Descrição |
|-------|-----------|
| `User` | Usuários (número único, role, password_hash) |
| `AuditLog` | Auditoria |
| `Supplier` | Fornecedores |
| `ActionType` | Descrições de ação comercial |
| `ReceiptMethod` | Formas de recebimento |
| `Receivable` | Lançamentos / contas a receber |
| `ReceivableReceipt` | Recebimentos / baixas |
| `CurrentAccount` | Conta corrente comercial |
| `CurrentAccountUser` | Compartilhamento de conta |
| `CurrentAccountMovement` | Movimentos (entrada, saída, ajuste, estorno) |
| `Notification` | Notificações in-app |

## Enums principais

| Enum | Valores |
|------|---------|
| `Role` | ADMIN, COMPRADOR, DIRETORIA |
| `FinancialStatus` | ABERTO, PARCIAL, QUITADO, CANCELADO |
| `ConfirmationStatus` | PENDENTE_CONFIRMACAO, CONFIRMADO, ESTORNADO, CANCELADO |
| `ReceiptType` | INTEGRAL, PARCIAL |
| `DestinationType` | BAIXA_SIMPLES, CREDITO_CONTA_CORRENTE |
| `MovementType` | ENTRADA, SAIDA, AJUSTE_POSITIVO, AJUSTE_NEGATIVO, ESTORNO |
| `SupplierType` | INDUSTRIA, LABORATORIO, DISTRIBUIDOR, FORNECEDOR, OUTRO |

## Seed (`prisma/seed.ts`)

**Idempotente** (upsert). Cria **apenas**:

1. Admin **#1** — senha hash de `admin123`, role ADMIN  
2. **9 formas de recebimento** (incl. "Crédito em conta corrente" com flag de crédito)  
3. **11 descrições de ação** padrão  

**Não cria** usuários de teste. Usuários extras no banco local (ex.: #9001) são dados de validação manual.

## Comandos Prisma

```bash
# Na raiz
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed

# No backend (desenvolvimento)
cd backend
npm run prisma:migrate      # prisma migrate dev — cria nova migration
npm run prisma:studio       # interface visual
```

## Fluxo em produção

1. Container sobe → `docker-entrypoint.sh` → `prisma migrate deploy`  
2. Job manual único → `npx prisma db seed`  
3. Trocar senha admin #1  

## Regras de persistência

- **Sem DELETE físico** em receivables, receipts, movements (estorno/cancelamento lógico)
- Auditoria **append-only**
- Índices em campos de filtro frequente (status, datas, FKs)

## Backup

Em produção: configurar backup automático do PostgreSQL (Coolify ou provedor gerenciado). Ver [09-docker-e-deploy.md](./09-docker-e-deploy.md).
