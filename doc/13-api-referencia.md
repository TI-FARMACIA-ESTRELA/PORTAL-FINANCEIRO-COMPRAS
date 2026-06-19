# 13 — Referência rápida da API

Prefixo global: **`/api`**

Autenticação: header `Authorization: Bearer <accessToken>` (exceto rotas `@Public()`).

## Auth

| Método | Rota | Auth |
|--------|------|------|
| POST | `/auth/login` | Público |
| POST | `/auth/refresh` | Público (cookie) |
| GET | `/auth/me` | JWT |
| POST | `/auth/logout` | JWT |

## Health

| Método | Rota | Auth |
|--------|------|------|
| GET | `/health` | Público |

## Users (ADMIN)

| Método | Rota |
|--------|------|
| GET | `/users` |
| GET | `/users/:id` |
| POST | `/users` |
| PATCH | `/users/:id` |
| PATCH | `/users/:id/active` |
| PATCH | `/users/:id/role` |
| PATCH | `/users/:id/reset-password` |

## Audit (ADMIN, DIRETORIA)

| Método | Rota |
|--------|------|
| GET | `/audit-logs` |

## Suppliers

| Método | Rota | Escrita |
|--------|------|---------|
| GET | `/suppliers` | ADMIN, DIRETORIA |
| GET | `/suppliers/:id` | ADMIN, DIRETORIA |
| POST | `/suppliers` | ADMIN |
| PATCH | `/suppliers/:id` | ADMIN |
| PATCH | `/suppliers/:id/active` | ADMIN |

## Action Types

| Método | Rota |
|--------|------|
| GET | `/action-types` |
| GET | `/action-types/active` |
| GET | `/action-types/:id` |
| POST | `/action-types` |
| PATCH | `/action-types/:id` |
| PATCH | `/action-types/:id/active` |

## Receipt Methods

| Método | Rota |
|--------|------|
| GET | `/receipt-methods` |
| GET | `/receipt-methods/active` |
| GET | `/receipt-methods/:id` |
| POST | `/receipt-methods` |
| PATCH | `/receipt-methods/:id` |
| PATCH | `/receipt-methods/:id/active` |

## Receivables (Lançamentos)

| Método | Rota |
|--------|------|
| GET | `/receivables` |
| GET | `/receivables/summary` |
| GET | `/receivables/:id` |
| POST | `/receivables` |
| PATCH | `/receivables/:id` |
| PATCH | `/receivables/:id/cancel` |

## Receipts (Recebimentos)

| Método | Rota |
|--------|------|
| GET | `/receipts` |
| GET | `/receipts/summary` |
| GET | `/receipts/:id` |
| POST | `/receipts` |
| PATCH | `/receipts/:id` |
| PATCH | `/receipts/:id/confirm` |
| PATCH | `/receipts/:id/reverse` |

## Current Accounts

| Método | Rota |
|--------|------|
| GET | `/current-accounts` |
| GET | `/current-accounts/summary` |
| GET | `/current-accounts/options/users` |
| GET | `/current-accounts/options/for-receipt` |
| GET | `/current-accounts/:id` |
| POST | `/current-accounts` |
| PATCH | `/current-accounts/:id` |
| PATCH | `/current-accounts/:id/active` |
| PATCH | `/current-accounts/:id/share` |
| GET | `/current-accounts/:id/movements` |
| POST | `/current-accounts/:id/movements/entry` |
| POST | `/current-accounts/:id/movements/exit` |
| POST | `/current-accounts/:id/movements/adjustment` |
| PATCH | `/current-accounts/:id/movements/:movementId/reverse` |

## Dashboard

| Método | Rota |
|--------|------|
| GET | `/dashboard` |

## Notifications

| Método | Rota |
|--------|------|
| GET | `/notifications` |
| GET | `/notifications/unread-count` |
| POST | `/notifications/refresh` |
| PATCH | `/notifications/:id/read` |
| PATCH | `/notifications/read-all` |

## Reports (Exportações)

| Método | Rota | Perfis |
|--------|------|--------|
| GET | `/reports/receivables.xlsx` | Autenticado |
| GET | `/reports/receivables.csv` | Autenticado |
| GET | `/reports/receipts.xlsx` | Autenticado |
| GET | `/reports/receipts.csv` | Autenticado |
| GET | `/reports/current-accounts.xlsx` | Autenticado |
| GET | `/reports/current-accounts.csv` | Autenticado |
| GET | `/reports/current-accounts/:id/movements.xlsx` | Autenticado |
| GET | `/reports/current-accounts/:id/movements.csv` | Autenticado |
| GET | `/reports/audit.xlsx` | ADMIN, DIRETORIA |
| GET | `/reports/audit.csv` | ADMIN, DIRETORIA |
| GET | `/reports/dashboard.xlsx` | Autenticado |

Todas aceitam query params de filtro equivalentes às telas correspondentes.

## Códigos HTTP comuns

| Código | Situação |
|--------|----------|
| 401 | Sem token ou token inválido |
| 403 | Sem permissão de perfil |
| 404 | Recurso inexistente ou fora do escopo |
| 400 | Validação / regra de negócio |
| 503 | Health com banco indisponível |
